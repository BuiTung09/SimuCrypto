import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat/chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async handleChat(@Body('message') message: string) {
    const reply = await this.chatService.handleMessage(message);
    return { reply };
  }
}