import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { IntentModule } from './intent/intent.module';
import { BinanceModule } from './binance/binance.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { AiModule } from './ai/ai.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { TradingModule } from './trading/trading.module';
import { CommunityModule } from './community/community.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    PortfolioModule,
    TradingModule,
    KnowledgeModule,
    IntentModule,
    BinanceModule,
    AiModule,
    ChatModule,
    CommunityModule,
  ],
})
export class AppModule {}