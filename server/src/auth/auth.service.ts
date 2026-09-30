import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private pendingPayments = new Map<string, { email: string, months: number, amount: number, status: string }>();

  constructor(private prisma: PrismaService) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async register(email: string, username: string, password: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or Username already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName: username,
        portfolioAccount: {
          create: {
            initialVirtualBalance: 10000,
            virtualBalance: 10000,
          },
        },
      },
      include: {
        portfolioAccount: {
          include: { 
            holdings: true,
            trades: { orderBy: { executedAt: 'desc' } },
            balanceLedger: { orderBy: { createdAt: 'asc' } }
          }
        },
      },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }

  async validateUser(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        portfolioAccount: {
          include: { 
            holdings: true,
            trades: { orderBy: { executedAt: 'desc' } },
            balanceLedger: { orderBy: { createdAt: 'asc' } }
          }
        },
      },
    });

    if (user && user.role === 1 && user.proExpiryDate && user.proExpiryDate < new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { role: 0, proExpiryDate: null },
      });
      user.role = 0;
      user.proExpiryDate = null;
    }

    if (user && user.passwordHash && (await bcrypt.compare(pass, user.passwordHash))) {
      // Cập nhật thời điểm đăng nhập
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      // Ghi nhật ký đăng nhập
      await this.prisma.userActivity.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          details: 'Đăng nhập hệ thống bằng tài khoản.',
        },
      });
      const { passwordHash: _, ...result } = user;
      return { ...result, lastLoginAt: new Date() };
    }
    return null;
  }

  async googleLogin(data: { token: string }) {
    const { token } = data;
    
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const { sub: googleId, email, name: displayName, picture: avatarUrl } = payload;
      
      if (!email) {
         throw new UnauthorizedException('Google account must have an email');
      }

      let user = await this.prisma.user.findUnique({
        where: { email },
        include: { 
          portfolioAccount: {
            include: { 
              holdings: true,
              trades: { orderBy: { executedAt: 'desc' } },
              balanceLedger: { orderBy: { createdAt: 'asc' } }
            }
          }
        },
      });

      if (!user) {
        // Create new user for first-time Google login
        const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(7);
        user = await this.prisma.user.create({
          data: {
            email,
            username,
            displayName: displayName || username,
            avatarUrl,
            googleId,
            portfolioAccount: {
              create: {
                initialVirtualBalance: 10000,
                virtualBalance: 10000,
              },
            },
          },
          include: {
            portfolioAccount: {
              include: { 
                holdings: true,
                trades: { orderBy: { executedAt: 'desc' } },
                balanceLedger: { orderBy: { createdAt: 'asc' } }
              }
            },
          },
        });
      } else if (!user.googleId) {
        // Link existing user with Google ID
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId, avatarUrl } as any,
          include: { 
            portfolioAccount: {
              include: { 
                holdings: true,
                trades: { orderBy: { executedAt: 'desc' } },
                balanceLedger: { orderBy: { createdAt: 'asc' } }
              }
            }
          },
        });
      }

      if (user.role === 1 && user.proExpiryDate && user.proExpiryDate < new Date()) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { role: 0, proExpiryDate: null },
        });
        user.role = 0;
        user.proExpiryDate = null;
      }

      // Cập nhật thời điểm đăng nhập cho Google Login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Ghi nhật ký đăng nhập bằng Google
      await this.prisma.userActivity.create({
        data: {
          userId: user.id,
          action: 'GOOGLE_LOGIN',
          details: 'Đăng nhập hệ thống bằng tài khoản Google.',
        },
      });

      const result = { ...user, lastLoginAt: new Date() } as any;
      delete result.passwordHash;
      return result;
    } catch (error) {
      console.error('Google Auth Error Details:', error);
      throw new UnauthorizedException('Google authentication failed: ' + (error.message || 'Unknown error'));
    }
  }

  async upgradePro(email: string, months: number, amount?: number, method?: string, memo?: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (!existingUser) throw new UnauthorizedException('User not found');

    let newExpiry = new Date();
    if (existingUser.role === 1 && existingUser.proExpiryDate && existingUser.proExpiryDate > new Date()) {
      newExpiry = new Date(existingUser.proExpiryDate);
    }
    newExpiry.setMonth(newExpiry.getMonth() + months);

    // Reset pause state when buying a new VIP plan
    const user = await this.prisma.user.update({
      where: { email },
      data: {
        role: 1,
        proExpiryDate: newExpiry,
        proPauseUsed: false,
        proPausedAt: null,
        proPausedDaysRemaining: null,
      },
      include: {
        portfolioAccount: {
          include: { 
            holdings: true,
            trades: { orderBy: { executedAt: 'desc' } },
            balanceLedger: { orderBy: { createdAt: 'asc' } }
          }
        },
      },
    });

    if (amount) {
      await this.prisma.paymentHistory.create({
        data: {
          userId: user.id,
          amount,
          months,
          method: method || 'VietQR',
          memo,
          status: 'SUCCESS',
        }
      });
    }

    await this.prisma.userActivity.create({
      data: {
        userId: user.id,
        action: 'UPGRADE_PRO',
        details: `Nâng cấp tài khoản PRO ${months} tháng. Hết hạn: ${newExpiry.toLocaleDateString('vi-VN')}.`,
      },
    });

    const result = { ...user } as any;
    delete result.passwordHash;
    return result;
  }

  async pausePro(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User not found');

    // Must be active PRO
    if (user.role < 1 || !user.proExpiryDate) {
      throw new Error('Tài khoản không có gói VIP đang hoạt động.');
    }

    // Check if expiry is in the future
    const now = new Date();
    if (user.proExpiryDate <= now) {
      throw new Error('Gói VIP đã hết hạn.');
    }

    // Check pause quota
    if (user.proPauseUsed) {
      throw new Error('Bạn đã sử dụng quyền tạm dừng cho gói VIP này.');
    }

    // Check not already paused
    if (user.proPausedAt) {
      throw new Error('Gói VIP đang trong trạng thái tạm dừng.');
    }

    // Calculate remaining days
    const msRemaining = user.proExpiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    const updated = await this.prisma.user.update({
      where: { email },
      data: {
        role: 0,
        proExpiryDate: null,
        proPausedAt: now,
        proPauseUsed: true,
        proPausedDaysRemaining: daysRemaining,
      },
      include: {
        portfolioAccount: {
          include: {
            holdings: true,
            trades: { orderBy: { executedAt: 'desc' } },
            balanceLedger: { orderBy: { createdAt: 'asc' } }
          }
        },
      },
    });

    await this.prisma.userActivity.create({
      data: {
        userId: user.id,
        action: 'PAUSE_PRO',
        details: `Tạm dừng gói VIP. Còn lại ${daysRemaining} ngày được đóng băng.`,
      },
    });

    const result = { ...updated } as any;
    delete result.passwordHash;
    return result;
  }

  async resumePro(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User not found');

    // Must be in paused state
    if (!user.proPausedAt || user.proPausedDaysRemaining == null) {
      throw new Error('Gói VIP không ở trạng thái tạm dừng.');
    }

    // Restore: new expiry = now + frozen days
    const now = new Date();
    const newExpiry = new Date(now.getTime() + user.proPausedDaysRemaining * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.user.update({
      where: { email },
      data: {
        role: 1,
        proExpiryDate: newExpiry,
        proPausedAt: null,
        proPausedDaysRemaining: null,
        // proPauseUsed stays true — cannot pause again
      },
      include: {
        portfolioAccount: {
          include: {
            holdings: true,
            trades: { orderBy: { executedAt: 'desc' } },
            balanceLedger: { orderBy: { createdAt: 'asc' } }
          }
        },
      },
    });

    await this.prisma.userActivity.create({
      data: {
        userId: user.id,
        action: 'RESUME_PRO',
        details: `Tiếp tục gói VIP. Hết hạn mới: ${newExpiry.toLocaleDateString('vi-VN')}.`,
      },
    });

    const result = { ...updated } as any;
    delete result.passwordHash;
    return result;
  }

  createPaymentIntent(email: string, months: number, amount: number, memo: string) {
    this.pendingPayments.set(memo, { email, months, amount, status: 'pending' });
    // Tự động xóa sau 30 phút để tránh tràn RAM
    setTimeout(() => {
      this.pendingPayments.delete(memo);
    }, 30 * 60 * 1000);
  }

  async getPaymentStatus(memo: string) {
    const intent = this.pendingPayments.get(memo);
    if (!intent) return 'not_found';
    if (intent.status === 'success') return 'success';

    // Fallback: poll SePay API since webhook is not used
    try {
      const axios = require('axios');
      const response = await axios.get('https://my.sepay.vn/userapi/transactions/list', {
        headers: {
          'Authorization': `Bearer ${process.env.SEPAY_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      const transactions = response.data.transactions || [];
      const found = transactions.find((t: any) => {
        const content = t.transaction_content || '';
        const amountIn = Number(t.amount_in || 0);
        return content.includes(memo) && amountIn >= intent.amount;
      });

      if (found) {
        await this.upgradePro(intent.email, intent.months, intent.amount, 'SePay', memo);
        intent.status = 'success';
        this.pendingPayments.set(memo, intent);
        return 'success';
      }
    } catch (err: any) {
      console.error('SePay API polling error:', err?.message || err);
    }
    
    return 'pending';
  }

  async handleSepayWebhook(payload: any) {
    const { amountIn, transactionContent } = payload;
    
    if (!transactionContent) return false;

    // Quét tìm intent khớp với nội dung chuyển khoản
    for (const [memo, intent] of this.pendingPayments.entries()) {
      if (transactionContent.includes(memo) && intent.status === 'pending') {
        // Có thể cấu hình: nếu amountIn >= intent.amount thì mới duyệt
        // Hoặc để lỏng hơn tuỳ logic doanh nghiệp.
        await this.upgradePro(intent.email, intent.months, intent.amount, 'SePay', memo);
        
        intent.status = 'success';
        this.pendingPayments.set(memo, intent);
        return true;
      }
    }
    return false;
  }

  async validateAdmin(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    return user && user.role === 999 ? user : null;
  }

  async getAdminAnalytics() {
    const totalUsers = await this.prisma.user.count();
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [active24h, active7d, active30d] = await Promise.all([
      this.prisma.user.count({ where: { lastLoginAt: { gte: oneDayAgo } } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: sevenDaysAgo } } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo } } }),
    ]);

    const proUsers = await this.prisma.user.count({ where: { role: { gte: 1, not: 999 } } });
    const freeUsers = await this.prisma.user.count({ where: { role: 0 } });
    const adminUsers = await this.prisma.user.count({ where: { role: 999 } });

    const totalRevenueResult = await this.prisma.paymentHistory.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true }
    });
    const totalRevenue = totalRevenueResult._sum.amount ? Number(totalRevenueResult._sum.amount) : 0;

    // Lấy xu hướng đăng ký mới trong 7 ngày gần nhất
    const registrationsTrend: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const startOfDay = new Date();
      startOfDay.setDate(startOfDay.getDate() - i);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setDate(endOfDay.getDate() - i);
      endOfDay.setHours(23, 59, 59, 999);

      const count = await this.prisma.user.count({
        where: {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      registrationsTrend.push({
        date: `${startOfDay.getDate()}/${startOfDay.getMonth() + 1}`,
        count,
      });
    }

    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        lastLoginAt: true,
        role: true,
        portfolioAccount: {
          select: {
            virtualBalance: true,
            _count: {
              select: {
                trades: true,
              },
            },
          },
        },
        _count: {
          select: {
            communityPosts: true,
            communityComments: true,
          },
        },
      },
    });

    const formattedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.displayName || u.username,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      role: u.role,
      virtualBalance: u.portfolioAccount ? Number(u.portfolioAccount.virtualBalance) : 10000,
      tradesCount: u.portfolioAccount?._count?.trades || 0,
      postsCount: u._count?.communityPosts || 0,
      commentsCount: u._count?.communityComments || 0,
    }));

    const latestActivities = await this.prisma.userActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: {
          select: {
            displayName: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    const formattedActivities = latestActivities.map((act) => ({
      id: act.id,
      action: act.action,
      details: act.details,
      createdAt: act.createdAt,
      user: {
        displayName: act.user.displayName || act.user.username,
        username: act.user.username,
        email: act.user.email,
        avatarUrl: act.user.avatarUrl,
      },
    }));

    const rawPayments = await this.prisma.paymentHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { displayName: true, username: true, email: true, avatarUrl: true } }
      }
    });

    const formattedPayments = rawPayments.map(p => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      months: p.months,
      method: p.method,
      memo: p.memo,
      status: p.status,
      createdAt: p.createdAt,
      user: {
        displayName: p.user.displayName || p.user.username,
        username: p.user.username,
        email: p.user.email,
        avatarUrl: p.user.avatarUrl
      }
    }));

    return {
      summary: {
        totalUsers,
        active24h,
        active7d,
        active30d,
        proUsers,
        freeUsers,
        adminUsers,
        totalRevenue,
      },
      registrationsTrend,
      users: formattedUsers,
      activities: formattedActivities,
      payments: formattedPayments,
    };
  }
}
