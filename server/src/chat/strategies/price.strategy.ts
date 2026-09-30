import { Injectable } from '@nestjs/common';
import { BinanceService } from '../../binance/binance.service';
import { ChatStrategy } from './chat.strategy';
import { GeminiService } from '../../ai/gemini.service';
import { CacheService } from '../../common/cache.service';
import { TimeIntent } from '../utils/time-intent';

@Injectable()
export class PriceStrategy implements ChatStrategy {

  constructor(
    private binanceService: BinanceService,
    private geminiService: GeminiService,
    private cacheService: CacheService,
  ) {}

  async execute(symbol: string, timeIntent?: TimeIntent): Promise<string> {

    if (!symbol) {
      return 'Bạn vui lòng cung cấp tên coin (ví dụ: BTC, ETH)';
    }

    if (!timeIntent) {
      return this.handleToday(symbol);
    }

    switch (timeIntent.type) {

      case 'today':
        return this.handleToday(symbol);

      case 'yesterday':
        return this.handleYesterday(symbol);

      case 'specific_date':
        if (timeIntent.date) {
          return this.handleSpecificDate(symbol, timeIntent.date);
        }
        break;
    }

    return this.handleToday(symbol);
  }

  // ---------- FORMATTERS ----------

  private formatNumber(num: number): string {
    return num.toLocaleString('en-US');
  }

  private formatVolume(num: number): string {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    return num.toFixed(2);
  }

  private formatBTCVolume(num: number): string {
    return num.toLocaleString('en-US');
  }

  // ---------- TODAY ----------

  private async handleToday(symbol: string) {

    const ticker = await this.binanceService.getTicker(symbol);
    const klines = await this.binanceService.getKlines(symbol, '1d', 1);

    const candle = klines[0];

    const open = Number(candle[1]);
    const high = Number(candle[2]);
    const low = Number(candle[3]);
    const close = Number(candle[4]);
    const volume = Number(candle[5]);
    const quoteVolume = Number(candle[7]);
    const trades = Number(candle[8]);

    const changePercent = ((close - open) / open * 100).toFixed(2);
    const spread = (high - low).toFixed(2);

    const price = this.formatNumber(Number(ticker.lastPrice));

    return `
${symbol.toUpperCase()} hôm nay

Giá hiện tại: ${price} USDT
Biến động 24h: ${ticker.priceChangePercent}%

Open: ${this.formatNumber(open)} USDT
High: ${this.formatNumber(high)} USDT
Low: ${this.formatNumber(low)} USDT
Close: ${this.formatNumber(close)} USDT

Spread: ${this.formatNumber(Number(spread))} USDT
Change (open→close): ${changePercent}%

Volume: ${this.formatBTCVolume(volume)} BTC
Khối lượng USDT: ${this.formatVolume(quoteVolume)}
Trades: ${this.formatNumber(trades)}
    `.trim();
  }

  // ---------- YESTERDAY ----------

  private async handleYesterday(symbol: string) {

    const klines = await this.binanceService.getKlines(symbol, '1d', 2);

    if (!klines || klines.length < 2) {
      return 'Không đủ dữ liệu lịch sử';
    }

    const candle = klines[0];

    const open = Number(candle[1]);
    const high = Number(candle[2]);
    const low = Number(candle[3]);
    const close = Number(candle[4]);
    const volume = Number(candle[5]);
    const quoteVolume = Number(candle[7]);
    const trades = Number(candle[8]);

    const changePercent = ((close - open) / open * 100).toFixed(2);
    const spread = (high - low).toFixed(2);

    return `
${symbol.toUpperCase()} hôm qua

Open: ${this.formatNumber(open)} USDT
High: ${this.formatNumber(high)} USDT
Low: ${this.formatNumber(low)} USDT
Close: ${this.formatNumber(close)} USDT

Spread: ${this.formatNumber(Number(spread))} USDT
Change (open→close): ${changePercent}%

Volume: ${this.formatBTCVolume(volume)} BTC
Khối lượng USDT: ${this.formatVolume(quoteVolume)}
Trades: ${this.formatNumber(trades)}
    `.trim();
  }

  // ---------- SPECIFIC DATE ----------

  private async handleSpecificDate(symbol: string, date: Date) {

    const start = new Date(date);
    start.setHours(0,0,0,0);

    const end = new Date(date);
    end.setHours(23,59,59,999);

    const klines = await this.binanceService.getKlinesByTime(
      symbol + 'USDT',
      '1d',
      start.getTime(),
      end.getTime()
    );

    if (!klines || klines.length === 0) {
      return 'Không có dữ liệu cho ngày này';
    }

    const candle = klines[0];

    const open = Number(candle[1]);
    const high = Number(candle[2]);
    const low = Number(candle[3]);
    const close = Number(candle[4]);
    const volume = Number(candle[5]);
    const quoteVolume = Number(candle[7]);
    const trades = Number(candle[8]);

    const changePercent = ((close - open) / open * 100).toFixed(2);
    const spread = (high - low).toFixed(2);

    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    return `
${symbol.toUpperCase()} ngày ${day}/${month}/${year}

Open: ${this.formatNumber(open)} USDT
High: ${this.formatNumber(high)} USDT
Low: ${this.formatNumber(low)} USDT
Close: ${this.formatNumber(close)} USDT

Spread: ${this.formatNumber(Number(spread))} USDT
Change (open→close): ${changePercent}%

Volume: ${this.formatBTCVolume(volume)} BTC
Khối lượng USDT: ${this.formatVolume(quoteVolume)}
Trades: ${this.formatNumber(trades)}
    `.trim();
  }

}