import {
  Controller,
  Post,
  Body,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
  ) {}

  // ✅ Non-stream endpoint
  @Post()
  async handleChat(@Body('message') message: string) {
    const reply = await this.chatService.handleMessage(message);
    return { reply };
  }

  // ✅ Streaming endpoint (FIXED)
  @Post('stream')
  async streamChat(
    @Body('message') message: string,
    @Res({ passthrough: false }) res: any
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const finalAnswer = await this.chatService.handleMessage(message);
      const escapedAnswer = finalAnswer.split('\n').join('\\n');
      res.write(`data: ${escapedAnswer}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();

    } catch (error) {
      res.write(`data: Lỗi server.\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
}