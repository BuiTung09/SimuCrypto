import { Module } from '@nestjs/common';
import { TradingService } from './trading.service';
import { TradingController } from './trading.controller';
import { BehavioralAnalysisService } from './behavioral-analysis.service';
import { BinanceModule } from '../binance/binance.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [BinanceModule, AiModule],
  providers: [TradingService, BehavioralAnalysisService],
  controllers: [TradingController],
  exports: [TradingService, BehavioralAnalysisService],
})
export class TradingModule {}
