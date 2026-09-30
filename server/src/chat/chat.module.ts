import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { IntentModule } from '../intent/intent.module';
import { BinanceModule } from '../binance/binance.module';
import { CacheService } from '../common/cache.service';

import { ChatOrchestratorService } from './strategies/chat-orchestrator.service';
import { PriceStrategy } from './strategies/price.strategy';
import { KnowledgeStrategy } from './strategies/knowledge.strategy';
import { OutOfScopeStrategy } from './strategies/outofscope.strategy';
import { AiModule } from '../ai/ai.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';

@Module({
  imports: [IntentModule, BinanceModule, AiModule,KnowledgeModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    ChatOrchestratorService,
    PriceStrategy,
    KnowledgeStrategy,
    OutOfScopeStrategy,
    CacheService,
  ],
})
export class ChatModule {}