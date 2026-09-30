import { Injectable } from '@nestjs/common';
import { ChatStrategy } from './chat.strategy';
import { RagService } from '../../knowledge/rag.service';
import { GeminiService } from '../../ai/gemini.service';
@Injectable()
export class KnowledgeStrategy implements ChatStrategy {

  constructor(
  private readonly ragService: RagService,
  private readonly geminiService: GeminiService,
) {}

  async execute(message: string): Promise<string> {
    const result = await this.ragService.ask(message);
    return result.answer;
  }
}