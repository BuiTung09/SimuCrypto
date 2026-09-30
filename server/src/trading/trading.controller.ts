import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { TradingService } from './trading.service';
import { BehavioralAnalysisService } from './behavioral-analysis.service';

@Controller('trading')
export class TradingController {
  constructor(
    private tradingService: TradingService,
    private analysisService: BehavioralAnalysisService
  ) {}

  @Post('order')
  async placeOrder(@Body() body: any) {
    return this.tradingService.executeTrade(
      body.userId,
      body.pairSymbol,
      body.side,
      body.quantity,
      body.price,
      body.marketContext,
    );
  }

  @Get('analyze')
  async analyzeBehavior(@Query('userId') userId: string) {
    return this.analysisService.analyzeUserBehavior(userId);
  }

  @Get('leaderboard')
  async getLeaderboard() {
    return this.tradingService.getLeaderboard();
  }
}
