import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  async getAccount(userId: string) {
    const account = await this.prisma.portfolioAccount.findUnique({
      where: { userId },
      include: {
        holdings: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Portfolio account not found');
    }

    return account;
  }

  async getHoldings(userId: string) {
    const account = await this.getAccount(userId);
    return account.holdings;
  }
}
