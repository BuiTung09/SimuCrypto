import { Injectable } from '@nestjs/common';
import { ChatStrategy } from './chat.strategy';

@Injectable()
export class OutOfScopeStrategy implements ChatStrategy {

  async execute(message: string): Promise<string> {
    return 'Xin lỗi, tôi chỉ hỗ trợ kiến thức crypto và giá coin.';
  }
}