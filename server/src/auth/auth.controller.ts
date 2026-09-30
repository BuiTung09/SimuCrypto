import { Controller, Post, Get, Body, Query, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body.email, body.username, body.password);
  }

  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  @Post('google-login')
  async googleLogin(@Body() body: any) {
    return this.authService.googleLogin(body);
  }

  @Post('upgrade-pro')
  async upgradePro(@Body() body: { email: string; months?: number; amount?: number; method?: string; memo?: string }) {
    if (!body.email) throw new UnauthorizedException('Email is required');
    return this.authService.upgradePro(body.email, body.months || 1, body.amount, body.method, body.memo);
  }

  @Post('pause-pro')
  async pausePro(@Body() body: { email: string }) {
    if (!body.email) throw new UnauthorizedException('Email is required');
    try {
      return await this.authService.pausePro(body.email);
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'Không thể tạm dừng gói VIP.');
    }
  }

  @Post('resume-pro')
  async resumePro(@Body() body: { email: string }) {
    if (!body.email) throw new UnauthorizedException('Email is required');
    try {
      return await this.authService.resumePro(body.email);
    } catch (err: any) {
      throw new UnauthorizedException(err.message || 'Không thể tiếp tục gói VIP.');
    }
  }


  @Post('admin/analytics')
  async getAdminAnalytics(@Body() body: { email: string }) {
    if (!body.email) throw new UnauthorizedException('Email is required');
    const isAdmin = await this.authService.validateAdmin(body.email);
    if (!isAdmin) {
      throw new UnauthorizedException('Chỉ tài khoản quản trị viên mới có quyền truy cập.');
    }
    return this.authService.getAdminAnalytics();
  }

  @Post('create-payment-intent')
  async createPaymentIntent(@Body() body: { email: string; months: number; amount: number; memo: string }) {
    if (!body.email || !body.memo) throw new UnauthorizedException('Email and memo are required');
    this.authService.createPaymentIntent(body.email, body.months || 1, body.amount, body.memo);
    return { success: true };
  }

  @Get('check-payment-status')
  async checkPaymentStatus(@Query('memo') memo: string) {
    if (!memo) return { success: false, status: 'invalid_memo' };
    const status = await this.authService.getPaymentStatus(memo);
    return { success: status === 'success', status };
  }

  @Post('sepay-webhook')
  async sepayWebhook(@Body() body: any) {
    // SePay Webhook Payload: { id, gateway, transactionDate, accountNumber, subAccount, amountIn, amountOut, accumulated, code, transactionContent, referenceNumber, body, feeAmount }
    const success = await this.authService.handleSepayWebhook(body);
    return { success };
  }
}
