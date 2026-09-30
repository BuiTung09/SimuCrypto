export interface TradeRecord {
  id: number;
  time: string;
  type: 'Mua' | 'Bán';
  coinId: string;
  symbol: string;
  amount: number;
  price: number;
  total: number;
  marketContext?: any;
}
