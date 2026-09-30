import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GeminiService {

    async rewritePrice(data: {
    symbol: string;
    price: string;
    change24h: string;
    volume: string;
    }): Promise<string> {

    const price = Number(data.price).toLocaleString();
    const change = Number(data.change24h).toFixed(2);
    const volume = (Number(data.volume) / 1_000_000_000).toFixed(2);

    return `${data.symbol}
    Giá hiện tại: ${price} USDT
    Biến động 24h: ${change}%
    Khối lượng 24h: ${volume}B USDT`;
    }
}