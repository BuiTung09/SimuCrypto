import { BinanceService } from '../../binance/binance.service';
import { normalizeVietnamese } from './normalize';

let BINANCE_SYMBOLS: string[] = [];

// Danh sách các từ tiếng Việt/Anh thông dụng bị trùng với mã coin trên sàn.
// Tuyệt đối không được nhận diện các từ này là mã coin khi tách từ câu nói.
const COIN_SYMBOL_BLACKLIST = new Set([
  'LA', 'QUA', 'DA', 'BA', 'NHA', 'CON', 'CHO', 'ANH', 'EM', 'COI', 'TIN', 'DI', 'GO', 'UP',
  'CUNG', 'DAO', 'KHI', 'NHAN', 'TIEP', 'DONG', 'DAN', 'MOI', 'DOC', 'CHI', 'BAO', 'CO',
  'DIEM', 'CAO', 'NHAT', 'DE', 'CHO', 'VAO', 'THOI', 'NHIEU', 'CAN', 'TRA', 'CUU', 'LAY',
  'BAN', 'MUA', 'LENH', 'SPOT', 'FUTURES', 'DCA', 'HODL', 'RSI', 'MACD', 'MA', 'EMA',
  'SUPPORT', 'RESISTANCE', 'KEY', 'HOT', 'WIFI', 'MEME', 'BAR', 'BOND', 'DATA', 'GAME',
  'FOR', 'PEOPLE', 'MAN', 'SUN', 'DOG', 'CAT', 'BULL', 'BEAR', 'TVL', 'AS'
]);

// Bản đồ ánh xạ các từ thông dụng sang mã coin chuẩn (Aliases)
const COIN_NAME_ALIASES: { [key: string]: string } = {
  'BITCOIN': 'BTC',
  'ETHEREUM': 'ETH',
  'SOLANA': 'SOL',
  'TETHER': 'USDT',
  'BINANCE': 'BNB',
  'CARDANO': 'ADA',
  'RIPPLE': 'XRP',
  'POLYGON': 'MATIC',
  'AVALANCHE': 'AVAX',
  'DOGECOIN': 'DOGE',
};

// load toàn bộ coin từ Binance khi server start
export async function loadBinanceSymbols(
  binanceService: BinanceService
) {
  BINANCE_SYMBOLS = await binanceService.getAvailableCoins();
}

// extract coin từ câu hỏi
export function extractSymbol(message: string): string | null {
  // 1. Chuẩn hóa tiếng Việt trước để tránh rụng dấu chữ "cách" -> "C CH"
  const normalized = normalizeVietnamese(message).toUpperCase();

  const words = normalized
    .replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/);

  // Bước 1 — Ưu tiên hàng đầu: Ánh xạ tên đầy đủ sang mã coin (ví dụ: "bitcoin" -> "BTC")
  for (const word of words) {
    if (COIN_NAME_ALIASES[word]) {
      return COIN_NAME_ALIASES[word];
    }
  }

  // Bước 2 — Tìm mã coin chính thức nhưng loại trừ danh sách đen stop-words
  for (const word of words) {
    if (word.length >= 2 && !COIN_SYMBOL_BLACKLIST.has(word) && BINANCE_SYMBOLS.includes(word)) {
      return word;
    }
  }

  return null;
}