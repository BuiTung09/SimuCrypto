import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { MarketAnalysisService } from './market-analysis.service';
import { MarketAnalysisController } from './market-analysis.controller';
import { AiProviderService } from './ai-provider.service';

@Module({
  controllers: [MarketAnalysisController],
  providers: [GeminiService, MarketAnalysisService, AiProviderService],
  exports: [GeminiService, MarketAnalysisService, AiProviderService],
})
export class AiModule {}