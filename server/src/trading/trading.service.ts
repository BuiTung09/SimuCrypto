import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BinanceService } from '../binance/binance.service';

type TradeSide = 'buy' | 'sell';

@Injectable()
export class TradingService {
  constructor(
    private prisma: PrismaService,
    private binanceService: BinanceService,
  ) {}

  async executeTrade(userId: string, pairSymbol: string, side: TradeSide, quantity: number, price: number, marketContext?: any) {
    const account = await this.prisma.portfolioAccount.findUnique({
      where: { userId },
    });

    if (!account) {
      throw new BadRequestException('User does not have a portfolio account');
    }

    const totalValue = quantity * price;

    return this.prisma.$transaction(async (tx) => {
      if (side === 'buy') {
        if (account.virtualBalance.toNumber() < totalValue) {
          throw new BadRequestException('Insufficient balance');
        }

        // 1. Update balance
        await tx.portfolioAccount.update({
          where: { id: account.id },
          data: { virtualBalance: { decrement: totalValue } },
        });

        // 2. Update holdings
        const existingHolding = await tx.portfolioHolding.findUnique({
          where: { accountId_pairSymbol: { accountId: account.id, pairSymbol } }
        });

        const currentAmount = existingHolding ? existingHolding.amount.toNumber() : 0;
        const currentAvg = existingHolding ? existingHolding.avgBuyPrice.toNumber() : 0;
        const newTotalAmount = currentAmount + quantity;
        const newAvgPrice = ((currentAmount * currentAvg) + (quantity * price)) / newTotalAmount;

        await tx.portfolioHolding.upsert({
          where: {
            accountId_pairSymbol: {
              accountId: account.id,
              pairSymbol,
            },
          },
          update: {
            amount: { increment: quantity },
            avgBuyPrice: newAvgPrice,
          },
          create: {
            accountId: account.id,
            pairSymbol,
            amount: quantity,
            avgBuyPrice: price,
          },
        });
      } else {
        const holding = await tx.portfolioHolding.findUnique({
          where: {
            accountId_pairSymbol: {
              accountId: account.id,
              pairSymbol,
            },
          },
        });

        if (!holding || holding.amount.toNumber() < quantity) {
          throw new BadRequestException('Insufficient holdings');
        }

        // 1. Update balance
        await tx.portfolioAccount.update({
          where: { id: account.id },
          data: { virtualBalance: { increment: totalValue } },
        });

        // 2. Update holdings
        await tx.portfolioHolding.update({
          where: { id: holding.id },
          data: { amount: { decrement: quantity } },
        });
      }

      // 3. Record trade
      const trade = await tx.trade.create({
        data: {
          accountId: account.id,
          pairSymbol,
          side,
          quantity,
          price,
          totalValue,
          marketContext,
        },
      });

      // 4. Ledger entry
      await tx.balanceLedger.create({
        data: {
          accountId: account.id,
          tradeId: trade.id,
          entryType: side === 'buy' ? 'trade_buy' : 'trade_sell',
          amountDelta: side === 'buy' ? -totalValue : totalValue,
          balanceBefore: account.virtualBalance,
          balanceAfter: side === 'buy' ? account.virtualBalance.toNumber() - totalValue : account.virtualBalance.toNumber() + totalValue,
          description: `${side.toUpperCase()} ${pairSymbol}`,
        },
      });

      // 5. Get updated account info to return to frontend
      const updatedAccount = await tx.portfolioAccount.findUnique({
        where: { id: account.id },
        include: { 
          holdings: true,
          trades: { orderBy: { executedAt: 'desc' } },
          balanceLedger: { orderBy: { createdAt: 'asc' } }
        }
      });

      // 6. Ghi nhận nhật ký hoạt động giao dịch
      await tx.userActivity.create({
        data: {
          userId,
          action: side === 'buy' ? 'TRADE_BUY' : 'TRADE_SELL',
          details: `${side === 'buy' ? 'Mua' : 'Bán'} thành công ${quantity} ${pairSymbol.replace('USDT', '')} tại mức giá $${price.toLocaleString()}`,
        },
      });

      return { trade, updatedAccount };
    });
  }

  async getLeaderboard() {
    // 1. Fetch all accounts with holdings and user info
    const accounts = await this.prisma.portfolioAccount.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            role: true,
          },
        },
        holdings: true,
      },
    });

    // 2. Fetch current prices
    const pricesData = await this.binanceService.getAllTickers();
    const priceMap = new Map<string, number>();
    pricesData.forEach((p: any) => {
      priceMap.set(p.symbol, parseFloat(p.price));
    });

    // 3. Calculate total value for each account
    const leaderboard = accounts.map((acc) => {
      let holdingsValue = 0;
      acc.holdings.forEach((h) => {
        const price = priceMap.get(h.pairSymbol) || 0;
        holdingsValue += h.amount.toNumber() * price;
      });

      const totalValue = acc.virtualBalance.toNumber() + holdingsValue;
      const profit = totalValue - acc.initialVirtualBalance.toNumber();

      return {
        userId: acc.userId,
        displayName: acc.user.displayName || acc.user.username,
        avatarUrl: acc.user.avatarUrl,
        role: acc.user.role,
        email: acc.user.email,
        totalValue,
        profit,
        // For display initials if no avatar
        initials: (acc.user.displayName || acc.user.username).charAt(0).toUpperCase(),
      };
    });

    // 4. Sort and return top 100
    return leaderboard
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 100);
  }
}
