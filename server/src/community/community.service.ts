import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunityService {
  constructor(private prisma: PrismaService) {}

  async getPosts(category?: string, filter?: string) {
    const whereClause: any = {};

    // Lọc theo Danh mục
    if (category && category !== 'Feed Tổng hợp') {
      whereClause.category = category;
    }

    // Lọc theo Loại (Thảo luận / Phân tích)
    if (filter && filter !== 'Tất cả') {
      whereClause.category = { contains: filter };
    }

    const posts = await this.prisma.communityPost.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            role: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: {
              select: {
                displayName: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    // Đổi kiểu dữ liệu BigInt thành Number để NestJS tuần tự hóa sang JSON mượt mà
    return posts.map((post) => ({
      id: Number(post.id),
      userId: post.userId,
      title: post.title,
      content: post.content,
      category: post.category,
      imageUrl: post.imageUrl,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      pinned: post.pinned,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.user.displayName || post.user.username,
      avatar: post.user.avatarUrl || '',
      isVerified: post.user.role >= 1, // Pro / Admin được xác thực
      role: post.user.role,
      likes: post.likes.map((l) => l.userId),
      comments: post.comments.map((c) => ({
        id: Number(c.id),
        postId: Number(c.postId),
        content: c.content,
        createdAt: c.createdAt,
        author: c.user.displayName || c.user.username,
        avatar: c.user.avatarUrl || '',
      })),
    }));
  }

  async createPost(userId: string, data: { title: string; content: string; category: string; imageUrl?: string }) {
    const post = await this.prisma.communityPost.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
        category: data.category || 'Thảo luận',
        imageUrl: data.imageUrl || null,
      },
      include: {
        user: {
          select: {
            displayName: true,
            username: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    // Ghi nhận nhật ký hoạt động
    await this.prisma.userActivity.create({
      data: {
        userId,
        action: 'COMMUNITY_POST',
        details: `Đã đăng bài thảo luận: "${data.title}"`,
      },
    });

    return {
      ...post,
      id: Number(post.id),
      author: post.user.displayName || post.user.username,
      avatar: post.user.avatarUrl || '',
      isVerified: post.user.role >= 1,
      likes: [],
      comments: [],
    };
  }

  async toggleLikePost(postId: number, userId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: BigInt(postId) },
    });

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const existingLike = await this.prisma.communityPostLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId: BigInt(postId),
        },
      },
    });

    let isLiked = false;

    if (existingLike) {
      // Unlike
      await this.prisma.communityPostLike.delete({
        where: {
          userId_postId: {
            userId,
            postId: BigInt(postId),
          },
        },
      });
      await this.prisma.communityPost.update({
        where: { id: BigInt(postId) },
        data: { likesCount: { decrement: 1 } },
      });
    } else {
      // Like
      await this.prisma.communityPostLike.create({
        data: {
          userId,
          postId: BigInt(postId),
        },
      });
      await this.prisma.communityPost.update({
        where: { id: BigInt(postId) },
        data: { likesCount: { increment: 1 } },
      });
      isLiked = true;

      // Ghi nhận nhật ký hoạt động
      await this.prisma.userActivity.create({
        data: {
          userId,
          action: 'COMMUNITY_LIKE',
          details: `Đã thích bài viết: "${post.title}"`,
        },
      });
    }

    const updatedPost = await this.prisma.communityPost.findUnique({
      where: { id: BigInt(postId) },
      select: { likesCount: true },
    });

    return {
      likesCount: updatedPost?.likesCount || 0,
      isLiked,
    };
  }

  async addComment(postId: number, userId: string, content: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: BigInt(postId) },
    });

    if (!post) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const comment = await this.prisma.communityComment.create({
      data: {
        postId: BigInt(postId),
        userId,
        content,
      },
      include: {
        user: {
          select: {
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    await this.prisma.communityPost.update({
      where: { id: BigInt(postId) },
      data: { commentsCount: { increment: 1 } },
    });

    // Ghi nhận nhật ký hoạt động
    await this.prisma.userActivity.create({
      data: {
        userId,
        action: 'COMMUNITY_COMMENT',
        details: `Đã bình luận trên bài viết: "${post.title}"`,
      },
    });

    return {
      id: Number(comment.id),
      postId: Number(comment.postId),
      content: comment.content,
      createdAt: comment.createdAt,
      author: comment.user.displayName || comment.user.username,
      avatar: comment.user.avatarUrl || '',
    };
  }

  async getSidebarData() {
    // 1. Gợi ý theo dõi: Lấy tối đa 5 người dùng có vai trò VIP Pro hoặc Admin từ DB
    const topUsers = await this.prisma.user.findMany({
      where: {
        role: { gte: 1 },
      },
      take: 5,
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        role: true,
      },
    });

    const suggestedUsers = topUsers.map(u => ({
      name: u.displayName || u.username,
      initials: (u.displayName || u.username).substring(0, 2).toUpperCase(),
      role: u.role,
      description: u.role === 999 ? 'Hệ Thống Admin' : 'Thành viên VIP Pro',
    }));

    // 2. Hot Trend: Lấy số lượng nhắc đến coin trong các bài đăng thực tế
    const posts = await this.prisma.communityPost.findMany({
      select: { title: true, content: true }
    });

    const coinMentions = [
      { name: 'Bitcoin', symbol: 'BTC', mentions: 0, change: '+5.2%' },
      { name: 'Ethereum', symbol: 'ETH', mentions: 0, change: '+3.1%' },
      { name: 'Solana', symbol: 'SOL', mentions: 0, change: '+8.7%' },
      { name: 'Near Protocol', symbol: 'NEAR', mentions: 0, change: '+12.4%' },
    ];

    posts.forEach(p => {
      const text = (p.title + ' ' + p.content).toUpperCase();
      coinMentions.forEach(coin => {
        if (text.includes(coin.symbol) || text.includes(coin.name.toUpperCase())) {
          coin.mentions += 1;
        }
      });
    });

    // Sắp xếp các đồng coin được nhắc nhiều nhất
    const trendingCoins = coinMentions
      .filter(c => c.mentions > 0)
      .sort((a, b) => b.mentions - a.mentions);

    // Fallback nếu chưa nhắc nhiều
    if (trendingCoins.length === 0) {
      return {
        suggestedUsers,
        trendingCoins: [
          { name: 'Bitcoin', symbol: 'BTC', mentions: 12, change: '+5.2%' },
          { name: 'Ethereum', symbol: 'ETH', mentions: 8, change: '+3.1%' },
          { name: 'Solana', symbol: 'SOL', mentions: 5, change: '+8.7%' },
        ]
      };
    }

    return {
      suggestedUsers,
      trendingCoins,
    };
  }
}
