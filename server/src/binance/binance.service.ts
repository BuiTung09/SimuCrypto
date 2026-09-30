import { Injectable, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class BinanceService {

  private readonly http: AxiosInstance;
  private readonly BASE_URL = 'https://api.binance.com';

  constructor() {
    this.http = axios.create({
      baseURL: this.BASE_URL,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // 🔹 Chuẩn hóa symbol
  private normalizeSymbol(symbol: string): string {
    if (!symbol) {
      throw new BadRequestException('Symbol không hợp lệ');
    }

    const upper = symbol.toUpperCase();

    return upper.endsWith('USDT') ? upper : upper + 'USDT';
  }

  // 🔹 Lấy ticker 24h
  async getTicker(symbol: string) {

    const upperSymbol = this.normalizeSymbol(symbol);

    try {
      const response = await this.http.get('/api/v3/ticker/24hr', {
        params: { symbol: upperSymbol },
      });

      return response.data;

    } catch (error: any) {
      throw new BadRequestException(
        `Symbol ${symbol.toUpperCase()} không tồn tại trên Binance`
      );
    }
  }

  // 🔹 Lấy klines theo limit (vd: hôm qua)
  async getKlines(
    symbol: string,
    interval: string = '1d',
    limit: number = 2,
  ) {

    const upperSymbol = this.normalizeSymbol(symbol);

    try {
      const response = await this.http.get('/api/v3/klines', {
        params: {
          symbol: upperSymbol,
          interval,
          limit,
        },
      });

      return response.data;

    } catch (error: any) {
      throw new BadRequestException(
        `Không lấy được dữ liệu lịch sử cho ${symbol.toUpperCase()}`
      );
    }
  }

  // 🔹 Lấy klines theo thời gian cụ thể
  async getKlinesByTime(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
  ) {

    const upperSymbol = this.normalizeSymbol(symbol);

    try {
      const response = await this.http.get('/api/v3/klines', {
        params: {
          symbol: upperSymbol,
          interval,
          startTime,
          endTime,
          limit: 1,
        },
      });

      return response.data;

    } catch (error: any) {
      throw new BadRequestException(
        `Không lấy được dữ liệu ngày cụ thể cho ${symbol.toUpperCase()}`
      );
    }
  }
  async getAllTickers() {
    try {
      const response = await this.http.get('/api/v3/ticker/price');
      return response.data;
    } catch (error: any) {
      throw new BadRequestException('Không lấy được dữ liệu giá từ Binance');
    }
  }

  async getAvailableCoins(): Promise<string[]> {

    const res = await axios.get('https://api.binance.com/api/v3/exchangeInfo');

    const symbols = res.data.symbols;

    const coins: string[] = symbols
      .filter((s: any) => s.quoteAsset === 'USDT')
      .map((s: any) => s.baseAsset);

    const uniqueCoins = Array.from(new Set<string>(coins));

    return uniqueCoins;

  }
}