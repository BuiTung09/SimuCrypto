import { Injectable } from '@nestjs/common';
import { ChatOrchestratorService } from './strategies/chat-orchestrator.service';

@Injectable()
export class ChatService {

  constructor(private orchestrator: ChatOrchestratorService) {}

  async handleMessage(message: string): Promise<string> {
    return this.orchestrator.handle(message);
  }
}