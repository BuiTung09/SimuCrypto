import { Module } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

@Module({
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
