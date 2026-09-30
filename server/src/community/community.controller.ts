import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { CommunityService } from './community.service';

@Controller('community')
export class CommunityController {
  constructor(private communityService: CommunityService) {}

  @Get()
  async getPosts(
    @Query('category') category?: string,
    @Query('filter') filter?: string,
  ) {
    return this.communityService.getPosts(category, filter);
  }

  @Get('sidebar')
  async getSidebarData() {
    return this.communityService.getSidebarData();
  }

  @Post()
  async createPost(
    @Body() body: { userId: string; title: string; content: string; category?: string; imageUrl?: string },
  ) {
    if (!body.userId || !body.title || !body.content) {
      throw new BadRequestException('userId, title, và content là bắt buộc');
    }
    return this.communityService.createPost(body.userId, {
      title: body.title,
      content: body.content,
      category: body.category || 'Thảo luận',
      imageUrl: body.imageUrl,
    });
  }

  @Post('like')
  async toggleLikePost(
    @Body() body: { postId: number; userId: string },
  ) {
    if (!body.postId || !body.userId) {
      throw new BadRequestException('postId và userId là bắt buộc');
    }
    return this.communityService.toggleLikePost(body.postId, body.userId);
  }

  @Post('comment')
  async addComment(
    @Body() body: { postId: number; userId: string; content: string },
  ) {
    if (!body.postId || !body.userId || !body.content) {
      throw new BadRequestException('postId, userId, và content là bắt buộc');
    }
    return this.communityService.addComment(body.postId, body.userId, body.content);
  }
}
