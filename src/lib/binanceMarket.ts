// src/lib/binanceMarket.ts

export type CoinMeta = {
  id: string;
  name: string;
  symbol: string; // BTC
  pair: string;   // BTCUSDT
  logo?: string;  // ✅ icon/logo URL (SVG/PNG)
};

// ✅ Logo coin – dùng CoinGecko CDN (ổn định, không chặn hotlink)
const CG = "https://assets.coingecko.com/coins/images";
const COIN_LOGOS: Record<string, string> = {
  BTC: `${CG}/1/small/bitcoin.png`,
  ETH: `${CG}/279/small/ethereum.png`,
  BNB: `${CG}/825/small/bnb-icon2_2x.png`,
  SOL: `${CG}/4128/small/solana.png`,
  ADA: `${CG}/975/small/cardano.png`,
  XRP: `${CG}/44/small/xrp-symbol-white-128.png`,
  DOT: `${CG}/12171/small/polkadot.png`,
  AVAX: `${CG}/12559/small/Avalanche_Circle_RedWhite_Trans.png`,
  DOGE: `${CG}/5/small/dogecoin.png`,
  MATIC: `${CG}/4713/small/polygon.png`,
  LINK: `${CG}/877/small/chainlink-new-logo.png`,
  UNI: `${CG}/12504/small/uni.jpg`,
  SHIB: `${CG}/11939/small/shiba.png`,
  LTC: `${CG}/2/small/litecoin.png`,
  ATOM: `${CG}/1481/small/cosmos_hub.png`,
  FIL: `${CG}/12817/small/filecoin.png`,
  APT: `${CG}/26455/small/aptos_round.png`,
  ARB: `${CG}/16547/small/photo_2023-03-29_21.47.00.jpeg`,
  OP: `${CG}/25244/small/Optimism.png`,
  NEAR: `${CG}/10365/small/near.jpg`,
  ALGO: `${CG}/4380/small/download.png`,
  FTM: `${CG}/4001/small/Fantom_round.png`,
  ICP: `${CG}/14495/small/Internet_Computer_logo.png`,
  VET: `${CG}/3077/small/VeChain-Logo-768x725.png`,
  SAND: `${CG}/12129/small/sandbox_logo.jpg`,
  MANA: `${CG}/645/small/decentraland.png`,
  AAVE: `${CG}/12645/small/AAVE.png`,
  GRT: `${CG}/13397/small/Graph_Token.png`,
  EOS: `${CG}/738/small/eos-eos-logo.png`,
  AXS: `${CG}/13029/small/axie_infinity_logo.png`,
  THETA: `${CG}/2538/small/theta-token-logo.png`,
  XLM: `${CG}/100/small/Stellar_symbol_black_RGB.png`,
  TRX: `${CG}/1094/small/tron-logo.png`,
  HBAR: `${CG}/3688/small/hbar.png`,
  XTZ: `${CG}/976/small/Tezos-logo.png`,
  ENJ: `${CG}/1102/small/enjin-coin-logo.png`,
  CHZ: `${CG}/8834/small/Chiliz.png`,
  CRV: `${CG}/12124/small/Curve.png`,
  DYDX: `${CG}/17500/small/dydx.png`,
  IMX: `${CG}/17233/small/immutableX-symbol-BLK-RGB.png`,
  GALA: `${CG}/12493/small/GALA-COINGECKO.png`,
  LDO: `${CG}/13573/small/Lido_DAO.png`,
  RUNE: `${CG}/6595/small/Rune200x200.png`,
  INJ: `${CG}/12882/small/Secondary_Symbol.png`,
  SUI: `${CG}/26375/small/sui_asset.jpeg`,
  SEI: `${CG}/28205/small/Sei_Logo_-_Transparent.png`,
  TIA: `${CG}/31967/small/tia.jpg`,
  WLD: `${CG}/31069/small/worldcoin.jpeg`,
  PEPE: `${CG}/29850/small/pepe-token.jpeg`,
  BONK: `${CG}/28600/small/bonk.jpg`,
  FET: `${CG}/5681/small/Fetch.jpg`,
  RENDER: `${CG}/11636/small/rndr.png`,
};

// ✅ fallback: nếu không có logo thì dùng "first letter badge"
export function getCoinLogo(symbol: string): string | undefined {
  return COIN_LOGOS[symbol.toUpperCase()];
}

export const COINS: CoinMeta[] = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC", pair: "BTCUSDT", logo: COIN_LOGOS.BTC },
  { id: "ethereum", name: "Ethereum", symbol: "ETH", pair: "ETHUSDT", logo: COIN_LOGOS.ETH },
  { id: "binancecoin", name: "BNB", symbol: "BNB", pair: "BNBUSDT", logo: COIN_LOGOS.BNB },
  { id: "solana", name: "Solana", symbol: "SOL", pair: "SOLUSDT", logo: COIN_LOGOS.SOL },
  { id: "cardano", name: "Cardano", symbol: "ADA", pair: "ADAUSDT", logo: COIN_LOGOS.ADA },
  { id: "ripple", name: "XRP", symbol: "XRP", pair: "XRPUSDT", logo: COIN_LOGOS.XRP },
  { id: "polkadot", name: "Polkadot", symbol: "DOT", pair: "DOTUSDT", logo: COIN_LOGOS.DOT },
  { id: "avalanche", name: "Avalanche", symbol: "AVAX", pair: "AVAXUSDT", logo: COIN_LOGOS.AVAX },
  { id: "dogecoin", name: "Dogecoin", symbol: "DOGE", pair: "DOGEUSDT", logo: COIN_LOGOS.DOGE },
  { id: "polygon", name: "Polygon", symbol: "MATIC", pair: "MATICUSDT", logo: COIN_LOGOS.MATIC },
  { id: "chainlink", name: "Chainlink", symbol: "LINK", pair: "LINKUSDT", logo: COIN_LOGOS.LINK },
  { id: "uniswap", name: "Uniswap", symbol: "UNI", pair: "UNIUSDT", logo: COIN_LOGOS.UNI },
  { id: "shiba-inu", name: "Shiba Inu", symbol: "SHIB", pair: "SHIBUSDT", logo: COIN_LOGOS.SHIB },
  { id: "litecoin", name: "Litecoin", symbol: "LTC", pair: "LTCUSDT", logo: COIN_LOGOS.LTC },
  { id: "cosmos", name: "Cosmos", symbol: "ATOM", pair: "ATOMUSDT", logo: COIN_LOGOS.ATOM },
  { id: "filecoin", name: "Filecoin", symbol: "FIL", pair: "FILUSDT", logo: COIN_LOGOS.FIL },
  { id: "aptos", name: "Aptos", symbol: "APT", pair: "APTUSDT", logo: COIN_LOGOS.APT },
  { id: "arbitrum", name: "Arbitrum", symbol: "ARB", pair: "ARBUSDT", logo: COIN_LOGOS.ARB },
  { id: "optimism", name: "Optimism", symbol: "OP", pair: "OPUSDT", logo: COIN_LOGOS.OP },
  { id: "near", name: "NEAR Protocol", symbol: "NEAR", pair: "NEARUSDT", logo: COIN_LOGOS.NEAR },
  { id: "algorand", name: "Algorand", symbol: "ALGO", pair: "ALGOUSDT", logo: COIN_LOGOS.ALGO },
  { id: "fantom", name: "Fantom", symbol: "FTM", pair: "FTMUSDT", logo: COIN_LOGOS.FTM },
  { id: "icp", name: "Internet Computer", symbol: "ICP", pair: "ICPUSDT", logo: COIN_LOGOS.ICP },
  { id: "vechain", name: "VeChain", symbol: "VET", pair: "VETUSDT", logo: COIN_LOGOS.VET },
  { id: "the-sandbox", name: "The Sandbox", symbol: "SAND", pair: "SANDUSDT", logo: COIN_LOGOS.SAND },
  { id: "decentraland", name: "Decentraland", symbol: "MANA", pair: "MANAUSDT", logo: COIN_LOGOS.MANA },
  { id: "aave", name: "Aave", symbol: "AAVE", pair: "AAVEUSDT", logo: COIN_LOGOS.AAVE },
  { id: "the-graph", name: "The Graph", symbol: "GRT", pair: "GRTUSDT", logo: COIN_LOGOS.GRT },
  { id: "eos", name: "EOS", symbol: "EOS", pair: "EOSUSDT", logo: COIN_LOGOS.EOS },
  { id: "axie-infinity", name: "Axie Infinity", symbol: "AXS", pair: "AXSUSDT", logo: COIN_LOGOS.AXS },
  { id: "theta", name: "Theta Network", symbol: "THETA", pair: "THETAUSDT", logo: COIN_LOGOS.THETA },
  { id: "stellar", name: "Stellar", symbol: "XLM", pair: "XLMUSDT", logo: COIN_LOGOS.XLM },
  { id: "tron", name: "TRON", symbol: "TRX", pair: "TRXUSDT", logo: COIN_LOGOS.TRX },
  { id: "hedera", name: "Hedera", symbol: "HBAR", pair: "HBARUSDT", logo: COIN_LOGOS.HBAR },
  { id: "tezos", name: "Tezos", symbol: "XTZ", pair: "XTZUSDT", logo: COIN_LOGOS.XTZ },
  { id: "enjincoin", name: "Enjin Coin", symbol: "ENJ", pair: "ENJUSDT", logo: COIN_LOGOS.ENJ },
  { id: "chiliz", name: "Chiliz", symbol: "CHZ", pair: "CHZUSDT", logo: COIN_LOGOS.CHZ },
  { id: "curve-dao", name: "Curve DAO", symbol: "CRV", pair: "CRVUSDT", logo: COIN_LOGOS.CRV },
  { id: "dydx", name: "dYdX", symbol: "DYDX", pair: "DYDXUSDT", logo: COIN_LOGOS.DYDX },
  { id: "immutable-x", name: "Immutable", symbol: "IMX", pair: "IMXUSDT", logo: COIN_LOGOS.IMX },
  { id: "gala", name: "Gala", symbol: "GALA", pair: "GALAUSDT", logo: COIN_LOGOS.GALA },
  { id: "lido-dao", name: "Lido DAO", symbol: "LDO", pair: "LDOUSDT", logo: COIN_LOGOS.LDO },
  { id: "thorchain", name: "THORChain", symbol: "RUNE", pair: "RUNEUSDT", logo: COIN_LOGOS.RUNE },
  { id: "injective", name: "Injective", symbol: "INJ", pair: "INJUSDT", logo: COIN_LOGOS.INJ },
  { id: "sui", name: "Sui", symbol: "SUI", pair: "SUIUSDT", logo: COIN_LOGOS.SUI },
  { id: "sei", name: "Sei", symbol: "SEI", pair: "SEIUSDT", logo: COIN_LOGOS.SEI },
  { id: "celestia", name: "Celestia", symbol: "TIA", pair: "TIAUSDT", logo: COIN_LOGOS.TIA },
  { id: "worldcoin", name: "Worldcoin", symbol: "WLD", pair: "WLDUSDT", logo: COIN_LOGOS.WLD },
  { id: "pepe", name: "Pepe", symbol: "PEPE", pair: "PEPEUSDT", logo: COIN_LOGOS.PEPE },
  { id: "bonk", name: "Bonk", symbol: "BONK", pair: "BONKUSDT", logo: COIN_LOGOS.BONK },
  { id: "fetch-ai", name: "Fetch.ai", symbol: "FET", pair: "FETUSDT", logo: COIN_LOGOS.FET },
  { id: "render", name: "Render", symbol: "RENDER", pair: "RENDERUSDT", logo: COIN_LOGOS.RENDER },
];

export type MarketRow = {
  id: string;
  name: string;
  symbol: string;
  pair: string;
  logo?: string;     // ✅ thêm để UI render
  price: number;     // lastPrice
  change24h: number; // priceChangePercent
  volume24h: number; // quoteVolume (USDT)
  marketCap?: number; // Market Cap from CoinGecko
};

export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2).replace(/\.00$/, "") + "T";
  if (abs >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toFixed(0);
}

export function formatUsd(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export async function fetchBinance24h(
  pairs: string[]
): Promise<
  Record<
    string,
    {
      lastPrice: number;
      changePct: number;
      quoteVolume: number;
    }
  >
> {
  const url =
    "https://api.binance.com/api/v3/ticker/24hr?symbols=" +
    encodeURIComponent(JSON.stringify(pairs));

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance REST failed (${res.status})`);

  const arr = (await res.json()) as Array<{
    symbol: string;
    lastPrice: string;
    priceChangePercent: string;
    quoteVolume: string;
  }>;

  const map: Record<string, { lastPrice: number; changePct: number; quoteVolume: number }> = {};
  for (const r of arr) {
    map[r.symbol] = {
      lastPrice: Number(r.lastPrice),
      changePct: Number(r.priceChangePercent),
      quoteVolume: Number(r.quoteVolume),
    };
  }
  return map;
}
