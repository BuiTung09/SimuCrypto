import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, ArrowDownRight, Wallet, Brain, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Info, X, Trophy, Lock, History } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { COINS, type CoinMeta } from '../lib/binanceMarket';
import { BinanceLikeChart } from './BinanceLikeChart';
import { useTheme } from './ThemeContext';
import { AIAnalysisModal } from './AIAnalysisModal';
import { ScrollReveal } from './ScrollReveal';
import { LeaderboardView } from './LeaderboardView';
import type { TradeRecord } from '../lib/types';

import { tradingApi } from '../lib/api';
import { trackTradeClick, trackTradeSuccess, trackPageDuration } from '../lib/analytics';

interface PracticeTradingProps {
  userId?: string;
  virtualBalance: number;
  holdings: Record<string, number>;
  tradeHistory?: TradeRecord[];
  onBuy: (coinId: string, amount: number, price: number) => void;
  onSell: (coinId: string, amount: number, price: number) => void;
  onUpdateUser?: (updatedAccount: any) => void;
  onNavigate?: (page: any, coinId?: string) => void;
  initialCoinId?: string;
  isPro?: boolean;
}

type Tf = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

type TickerSnap = {
  price: number;
  change24h: number;
};

const CoinTickerItem = ({ coin, coinPrice, coinChange24h, isUp }: any) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="flex items-center gap-3 border-r border-[var(--border)] px-6 whitespace-nowrap">
      {coin.logo && !imgError ? (
        <img
          src={coin.logo}
          alt={coin.symbol}
          className="h-5 w-5 rounded-full"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-black/5 text-[9px] font-bold text-black">
          {coin.symbol.charAt(0)}
        </div>
      )}
      <span className="font-bold text-[var(--foreground)]">{coin.symbol}</span>
      <span className="text-[var(--muted-foreground)]">
        {coinPrice > 0 ? `$${coinPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '—'}
      </span>
      <span className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-green-600' : 'text-red-600'}`}>
        {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        {Math.abs(coinChange24h).toFixed(2)}%
      </span>
    </div>
  );
};
export function PracticeTrading({
  userId,
  virtualBalance,
  holdings,
  tradeHistory = [],
  onBuy,
  onSell,
  onUpdateUser,
  onNavigate,
  initialCoinId,
  isPro,
}: PracticeTradingProps) {
  const { theme } = useTheme();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const startTime = Date.now();

    const sendDurationLog = () => {
      const endTime = Date.now();
      const durationSeconds = Math.round((endTime - startTime) / 1000);
      if (durationSeconds >= 1) {
        trackPageDuration('trading', durationSeconds);
      }
    };

    window.addEventListener('beforeunload', sendDurationLog);

    return () => {
      window.removeEventListener('beforeunload', sendDurationLog);
      sendDurationLog();
    };
  }, []);

  const isMobile = windowWidth < 1024;
  const isMediumScreen = windowWidth >= 1024 && windowWidth < 1440;
  const isLargeScreen = windowWidth >= 1440;

  // Narrow down the side columns if the screen is compact to give the chart more space
  const leftWidth = windowWidth < 1280 
    ? '175px' 
    : windowWidth < 1440 
      ? '210px' 
      : '230px';

  const tradePanelWidth = windowWidth < 1280 
    ? '280px' 
    : windowWidth < 1440 
      ? '320px' 
      : '340px';

  const [selectedCoin, setSelectedCoin] = useState<CoinMeta>(() => {
    if (initialCoinId) {
      const found = COINS.find((c) => c.id === initialCoinId);
      if (found) return found;
    }
    return COINS[0];
  });

  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [interval, setIntervalTf] = useState<Tf>('1m');

  const [tickers, setTickers] = useState<Record<string, TickerSnap>>(() => {
    try {
      const saved = localStorage.getItem('practice_trading_tickers');
      if (saved) return JSON.parse(saved);
    } catch { }
    return {};
  });

  // Save to local storage intermittently to not spam
  useEffect(() => {
    const timer = setInterval(() => {
      setTickers((prev) => {
        if (Object.keys(prev).length > 0) {
          localStorage.setItem('practice_trading_tickers', JSON.stringify(prev));
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Fallback REST fetch if localStorage is empty to prevent blank screen
  useEffect(() => {
    const run = async () => {
      try {
        const saved = localStorage.getItem('practice_trading_tickers');
        if (saved) return; // already have cache, skip rest api

        const { fetchBinance24h } = await import('../lib/binanceMarket');
        const data = await fetchBinance24h(COINS.map(c => c.pair));

        setTickers((prev) => {
          const next = { ...prev };
          for (const coin of COINS) {
            const key = coin.pair.toLowerCase();
            const d = data[coin.pair];
            if (d && !next[key]?.price) { // only if WS hasn't populated it yet
              next[key] = { price: d.lastPrice, change24h: d.changePct };
            }
          }
          return next;
        });
      } catch { }
    };
    run();
  }, []);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const notifTimerRef = useRef<number | null>(null);

  // ======= STATIC CLASSES =======
  const coinBtnBase =
    'flex min-w-[140px] flex-col rounded-xl border p-3 transition-all text-left flex-shrink-0';
  const coinBtnActive =
    'border-[#559DD2] bg-[#559DD2]/10';
  const coinBtnInactive =
    'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--secondary)]';

  const tfBtnBase =
    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors';
  const tfBtnActive =
    'bg-[#559DD2] text-black';
  const tfBtnInactive =
    'border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)]';

  const sideBtnBase =
    'flex-1 rounded-lg py-2.5 font-medium transition-colors';
  const buyBtnActive =
    'bg-[#559DD2] text-black';
  const buyBtnInactive =
    'border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)]';
  const sellBtnActive =
    'bg-[#559DD2] text-black';
  const sellBtnInactive =
    'border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--secondary)]';

  const quickBtn =
    'rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)]';

  const submitBuy =
    'w-full rounded-lg bg-[#559DD2] py-3 font-medium text-black transition-opacity hover:opacity-90';
  const submitSell =
    'w-full rounded-lg bg-[#559DD2] py-3 font-medium text-black transition-opacity hover:opacity-90';

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    if (notifTimerRef.current) window.clearTimeout(notifTimerRef.current);
    notifTimerRef.current = window.setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    if (!initialCoinId) return;
    const found = COINS.find((c) => c.id === initialCoinId);
    if (found) setSelectedCoin(found);
  }, [initialCoinId]);

  // One WS for ALL coins
  useEffect(() => {
    let alive = true;
    let manualClose = false;

    const streams = COINS
      .map((c) => `${c.pair.toLowerCase()}@ticker`)
      .join('/');

    const url = `wss://stream.binance.com/stream?streams=${streams}`;

    const stopWsIfAny = () => {
      if (wsRef.current) {
        try {
          const w = wsRef.current;
          if (w.readyState === 0) {
            w.onopen = () => w.close(1000, "cleanup");
          } else {
            w.onopen = null;
            w.onclose = null;
            w.onerror = null;
            w.onmessage = null;
            w.close(1000, "cleanup");
          }
        } catch { }
        wsRef.current = null;
      }
    };

    let attempt = 0;

    const connect = () => {
      if (!alive) return;
      stopWsIfAny();

      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!alive) return;
          attempt = 0;
        };

        ws.onmessage = (event) => {
          if (!alive) return;
          try {
            const msg = JSON.parse(event.data);
            const data = msg?.data;
            const symbol = String(data?.s || '').toLowerCase();
            const price = Number(data?.c);
            const pct = Number(data?.P);

            if (!symbol) return;

            setTickers((prev: Record<string, TickerSnap>) => {
              const prevSnap = prev[symbol] ?? { price: 0, change24h: 0 };
              return {
                ...prev,
                [symbol]: {
                  price: Number.isFinite(price) && price > 0 ? price : prevSnap.price,
                  change24h: Number.isFinite(pct) ? pct : prevSnap.change24h,
                },
              };
            });
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          if (!alive || manualClose) return;
          attempt += 1;
          const delay = Math.min(10000, 400 * Math.pow(2, Math.min(6, attempt)));
          setTimeout(() => {
            if (alive && !manualClose) connect();
          }, delay);
        };

        ws.onerror = () => {
          // Reconnect logic is handled by onclose
        };

      } catch {
        attempt += 1;
        const delay = Math.min(10000, 400 * Math.pow(2, Math.min(6, attempt)));
        setTimeout(() => {
          if (alive && !manualClose) connect();
        }, delay);
      }
    };

    connect();

    return () => {
      alive = false;
      manualClose = true;
      stopWsIfAny();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (notifTimerRef.current) window.clearTimeout(notifTimerRef.current);
    };
  }, []);

  // Selected ticker derived
  const selectedKey = selectedCoin.pair.toLowerCase();
  const selectedTicker = tickers[selectedKey] ?? { price: 0, change24h: 0 };
  const livePrice = selectedTicker.price;
  const liveChange24h = selectedTicker.change24h;

  const totalCost = useMemo(() => {
    const amt = parseFloat(tradeAmount);
    if (!Number.isFinite(amt) || amt <= 0) return 0;
    if (!Number.isFinite(livePrice) || livePrice <= 0) return 0;
    return amt * livePrice;
  }, [tradeAmount, livePrice]);

  // Capture current indicators for market context
  const getMarketContext = () => {
    return {
      rsi: (window as any).lastRSI || 50,
      macd: (window as any).lastMACD || { macd: 0, signal: 0, hist: 0 },
      ma7: (window as any).lastMA7 || livePrice,
      ma25: (window as any).lastMA25 || livePrice,
      trend: liveChange24h >= 0 ? 'bullish' : 'bearish',
      price: livePrice,
      interval: interval,
      executedAt: new Date().toISOString()
    };
  };

  const handleTrade = async () => {
    let amount = parseFloat(tradeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showNotification('Vui lòng nhập số lượng hợp lệ', 'error');
      return;
    }

    const price = livePrice || 0;
    if (price <= 0) {
      showNotification('Chưa nhận được giá từ Binance', 'error');
      return;
    }

    // Ghi nhận click nút mua bán (Ý định giao dịch)
    trackTradeClick(tradeType, selectedCoin.symbol, amount);

    if (tradeType === 'buy') {
      let total = amount * price;
      // Auto-adjust amount if it slightly exceeds balance due to real-time price fluctuation
      if (total > virtualBalance) {
        amount = virtualBalance / price;
        total = virtualBalance;
      }
      
      if (amount <= 0 || total > virtualBalance) {
        showNotification('Số dư không đủ', 'error');
        return;
      }

      // Call backend if userId is available
      if (userId) {
        try {
          const result = await tradingApi.placeOrder({
            userId,
            pairSymbol: selectedCoin.pair,
            side: 'buy',
            quantity: amount,
            price: price,
            marketContext: getMarketContext()
          });
          if (onUpdateUser && result.updatedAccount) {
            onUpdateUser(result.updatedAccount);
          }
        } catch (err: any) {
          showNotification(`Giao dịch thất bại: ${err.message}`, 'error');
          return;
        }
      }

      onBuy(selectedCoin.id, amount, price);
      trackTradeSuccess('buy', selectedCoin.symbol, amount, price, total);
      showNotification(`Đã mua thành công ${amount} ${selectedCoin.symbol}`, 'success');
    } else {
      // Call backend if userId is available
      if (userId) {
        try {
          const result = await tradingApi.placeOrder({
            userId,
            pairSymbol: selectedCoin.pair,
            side: 'sell',
            quantity: amount,
            price: price,
            marketContext: getMarketContext()
          });
          if (onUpdateUser && result.updatedAccount) {
            onUpdateUser(result.updatedAccount);
          }
        } catch (err: any) {
          showNotification(`Giao dịch thất bại: ${err.message}`, 'error');
          return;
        }
      }

      const totalValue = amount * price;
      onSell(selectedCoin.id, amount, price);
      trackTradeSuccess('sell', selectedCoin.symbol, amount, price, totalValue);
      showNotification(`Đã bán thành công ${amount} ${selectedCoin.symbol}`, 'success');
    }

    setTradeAmount('');
  };

  const changeClass = liveChange24h >= 0 ? 'text-green-600' : 'text-red-600';

  // ====== Top 8 coins (fixed: BTC, ETH, BNB, SOL, ADA, XRP, DOT, AVAX) ======
  const topCoins = COINS.slice(0, 8);

  // ====== Remaining coins (index 8+) ======
  const remainingCoins = COINS.slice(8);


  return (
    <div className="w-full bg-[var(--background)] min-h-[calc(100vh-64px)] pb-12">
      {createPortal(
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: 20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: -20, x: 20 }}
              className="flex min-w-[320px] items-center gap-4 rounded-xl border border-[var(--border)] p-4 shadow-2xl backdrop-blur-xl"
              style={{
                position: 'fixed',
                top: '100px',
                right: '24px',
                zIndex: 99999,
                borderLeft: `6px solid ${notification.type === 'success' ? '#559DD2' : notification.type === 'error' ? '#ef4444' : '#3b82f6'
                  }`,
                background: theme === 'dark' ? '#1c212b' : '#ffffff',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                color: 'var(--foreground)'
              }}
            >
              <div className="flex-shrink-0">
                {notification.type === 'success' && <CheckCircle2 className="h-6 w-6 text-[#559DD2]" />}
                {notification.type === 'error' && <AlertCircle className="h-6 w-6 text-red-500" />}
                {notification.type === 'info' && <Info className="h-6 w-6 text-blue-500" />}
              </div>
              <div className="flex-grow">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {notification.type === 'success' ? 'Thành công' : notification.type === 'error' ? 'Lỗi' : 'Thông báo'}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">{notification.message}</p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="flex-shrink-0 rounded-full p-1 text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {showLeaderboard && (
        <LeaderboardView onBack={() => setShowLeaderboard(false)} />
      )}

      <div className={showLeaderboard ? 'hidden' : ''}>
        {/* FULL WIDTH Scrolling Ticker Line at the Absolute Top */}
        <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 60s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>


        {/* Header & Main Content - centered and max-width */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">

          {/* Header */}
          <ScrollReveal delay={0.1}>
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h1 className="mb-1 text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Giao dịch ảo</h1>
                  <p className="text-sm sm:text-base text-[var(--muted-foreground)]">Realtime price từ Binance • Tiền ảo để luyện tập</p>
                </div>

                {isMobile && (
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={() => {
                        if (!isPro) {
                          if (window.confirm("Tính năng Phân tích AI thị trường yêu cầu tài khoản PRO. Bạn có muốn nâng cấp ngay?")) {
                            onNavigate?.('profile');
                          }
                          return;
                        }
                        setShowAIAnalysis(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '10px 20px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'linear-gradient(135deg, #559DD2, #6BCB77)',
                        color: '#000',
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: 'pointer',
                        width: '100%',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      className="shadow-sm group"
                    >
                      <Brain size={18} />
                      Phân tích AI
                    </button>
                    <button
                      onClick={() => onNavigate?.('analytics')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '10px 20px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--secondary)',
                        color: 'var(--foreground)',
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: 'pointer',
                        width: '100%'
                      }}
                      className="shadow-sm"
                    >
                      <TrendingUp size={18} color="#559DD2" />
                      Thống kê
                    </button>
                    <button
                      onClick={() => setShowLeaderboard(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '10px 20px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--card)',
                        color: 'var(--foreground)',
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: 'pointer',
                        width: '100%'
                      }}
                      className="shadow-sm"
                    >
                      <Trophy size={18} color="#559DD2" />
                      Bảng xếp hạng
                    </button>
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>

        <div className="w-full border-b border-[var(--border)] bg-[var(--card)] py-2 overflow-hidden">
          <div className="flex animate-ticker items-center text-sm" style={{ width: 'max-content' }}>
            {/* Render all coins twice for seamless loop */}
            {[...COINS, ...COINS].map((coin, i) => {
              const key = coin.pair.toLowerCase();
              const t = tickers[key] ?? { price: 0, change24h: 0 };
              const coinPrice = t.price;
              const coinChange24h = t.change24h;
              const isUp = coinChange24h >= 0;

              return (
                <CoinTickerItem
                  key={`${coin.id}-${i}`}
                  coin={coin}
                  coinPrice={coinPrice}
                  coinChange24h={coinChange24h}
                  isUp={isUp}
                />
              );
            })}
          </div>
        </div>

        {/* Top 8 Hot Coins and AI Button */}
        <ScrollReveal delay={0.15}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-6 mb-6">
            <div className="flex items-center gap-6">
              <div
                className={`flex overflow-x-auto pb-2 flex-grow hide-scrollbar relative ${isMobile ? 'gap-3' : 'justify-between gap-4'}`}
                style={{
                  maskImage: isMobile ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none',
                  WebkitMaskImage: isMobile ? 'linear-gradient(to right, black 85%, transparent 100%)' : 'none',
                }}
              >
                {topCoins.map((coin) => {
                  const isSelected = selectedCoin.id === coin.id;
                  const key = coin.pair.toLowerCase();
                  const t = tickers[key] ?? { price: 0, change24h: 0 };
                  const coinPrice = t.price;
                  const coinChange24h = t.change24h;
                  const coinChangeClass = coinChange24h >= 0 ? 'text-green-600' : 'text-red-600';

                  return (
                    <button
                      key={coin.id}
                      onClick={() => setSelectedCoin(coin)}
                      className={
                        isSelected
                          ? `${coinBtnBase} ${coinBtnActive} ${isMobile ? '' : 'flex-1'}`
                          : `${coinBtnBase} ${coinBtnInactive} ${isMobile ? '' : 'flex-1'}`
                      }
                    >
                      <div className="mb-1 flex items-center gap-2">
                        {coin.logo ? (
                          <img
                            src={coin.logo}
                            alt={coin.symbol}
                            className="h-8 w-8 rounded-full bg-[#559DD2]/20 p-0.5"
                            loading="lazy"
                            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#559DD2]/20 text-xs font-bold text-black">
                            {coin.symbol.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-[var(--foreground)]">{coin.symbol}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">{coin.pair}</div>
                        </div>
                      </div>

                      <div className="text-sm font-bold text-[var(--foreground)]">
                        {coinPrice > 0
                          ? `$${coinPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </div>

                      <div className={`flex items-center gap-0.5 text-xs ${coinChangeClass}`}>
                        {coinChange24h >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        <span>
                          {coinChange24h >= 0 ? '+' : ''}
                          {Number.isFinite(coinChange24h) ? coinChange24h.toFixed(2) : '0.00'}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {!isMobile && (
                <div className="ml-8 flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => {
                      if (!isPro) {
                        if (window.confirm("Tính năng Phân tích AI thị trường yêu cầu tài khoản PRO. Bạn có muốn nâng cấp ngay?")) {
                          onNavigate?.('profile');
                        }
                        return;
                      }
                      setShowAIAnalysis(true);
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '12px 16px',
                      height: 94,
                      width: 110,
                      borderRadius: 16,
                      border: 'none',
                      background: 'linear-gradient(135deg, #559DD2, #6BCB77)',
                      color: '#000',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      position: 'relative',
                      overflow: 'hidden',
                      textAlign: 'center',
                      lineHeight: 1.3
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    className="shadow-sm group hover:scale-[1.02] active:scale-95"
                  >
                    <div className="flex items-center justify-center h-5">
                      <Brain size={20} />
                    </div>
                    <span className="block px-1">Phân tích AI</span>
                  </button>
                  <button
                    onClick={() => onNavigate?.('analytics')}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '12px 16px',
                      height: 94,
                      width: 110,
                      borderRadius: 16,
                      border: '1px solid var(--border)',
                      background: 'var(--secondary)',
                      color: 'var(--foreground)',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'center',
                      lineHeight: 1.3
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--border)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--secondary)';
                    }}
                    className="shadow-sm hover:scale-[1.02] active:scale-95"
                  >
                    <div className="flex items-center justify-center h-5">
                      <TrendingUp size={20} color="#559DD2" />
                    </div>
                    <span className="block px-1">Thống kê</span>
                  </button>
                  <button
                    onClick={() => setShowLeaderboard(true)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '12px 16px',
                      height: 94,
                      width: 110,
                      borderRadius: 16,
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      color: 'var(--foreground)',
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      textAlign: 'center',
                      lineHeight: 1.3
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--secondary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--card)';
                    }}
                    className="shadow-sm hover:scale-[1.02] active:scale-95"
                  >
                    <div className="flex items-center justify-center h-5">
                      <Trophy size={20} color="#559DD2" />
                    </div>
                    <span className="block px-1">Bảng xếp hạng</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>

        <div style={{ width: '100%', padding: isMobile ? '0 12px' : '0 16px', boxSizing: 'border-box' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile 
              ? '1fr' 
              : isMediumScreen 
                ? `${leftWidth} 2fr ${tradePanelWidth}` 
                : `${leftWidth} 1.75fr ${tradePanelWidth} 240px`,
            gap: '16px',
            width: '100%',
            alignItems: 'start'
          }}>
            {/* ===== COLUMN 1: All Coins Sidebar (Leftmost on PC, bottom on mobile) ===== */}
            <div style={{ 
              minWidth: 0, 
              order: isMobile ? 4 : 1,
              gridColumn: isMobile ? 'auto' : isMediumScreen ? '1' : 'auto',
              gridRow: isMobile ? 'auto' : isMediumScreen ? '1' : 'auto'
            }}>
              <div
                style={{ 
                  height: isMobile ? '500px' : isMediumScreen ? '450px' : 'calc(100vh - 120px)', 
                  maxHeight: isMediumScreen ? '450px' : '850px', 
                  position: isMobile ? 'relative' : 'sticky', 
                  top: '80px' 
                }}
                className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
              >
                <div className="shrink-0 border-b border-[var(--border)] px-4 py-3">
                  <h3 className="text-sm font-bold text-[var(--foreground)]">Tất cả Coin ({remainingCoins.length})</h3>
                  <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">Chọn coin để giao dịch</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {remainingCoins.map((coin) => {
                    const key = coin.pair.toLowerCase();
                    const t = tickers[key] ?? { price: 0, change24h: 0 };
                    const isSelected = selectedCoin.id === coin.id;

                    return (
                      <button
                        key={coin.id}
                        onClick={() => {
                          setSelectedCoin(coin);
                          if (isMobile) window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors ${isSelected ? 'bg-[#559DD2]/10' : 'hover:bg-[var(--secondary)]'} border-b border-[var(--border)]`}
                      >
                        <div className="flex items-center gap-3">
                          {coin.logo ? (
                            <img src={coin.logo} alt={coin.symbol} className="h-6 w-6 rounded-full" loading="lazy"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#559DD2]/20 text-[10px] font-bold text-[var(--foreground)]">
                              {coin.symbol.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-[var(--foreground)]">{coin.symbol}</div>
                            <div className="text-[11px] text-[var(--muted-foreground)]">{coin.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-[var(--foreground)]">
                            {t.price > 0 ? `$${t.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                          </div>
                          <div className={`text-[11px] ${t.change24h >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {t.change24h >= 0 ? '+' : ''}{Number.isFinite(t.change24h) ? t.change24h.toFixed(2) : '0.00'}%
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ===== COLUMN 2: Main Chart (Center on PC, top on mobile) ===== */}
            <div style={{ 
              minWidth: 0, 
              order: isMobile ? 1 : 2,
              gridColumn: isMobile ? 'auto' : isMediumScreen ? '2' : 'auto',
              gridRow: isMobile ? 'auto' : isMediumScreen ? '1 / 3' : 'auto'
            }} className="space-y-4">
              {/* Chart */}
              <div
                className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6 shadow-sm"
              >
                <div className="shrink-0 mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="mb-1 font-bold text-[var(--foreground)]">{selectedCoin.name}</h2>
                    <div className="flex items-baseline gap-3">
                      <div className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
                        {livePrice > 0
                          ? `$${livePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          : '—'}
                      </div>
                      <div className={`flex items-center gap-1 ${changeClass}`}>
                        {liveChange24h >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        <span className="font-medium">
                          {liveChange24h >= 0 ? '+' : ''}
                          {Number.isFinite(liveChange24h) ? liveChange24h.toFixed(2) : '0.00'}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-[var(--muted-foreground)]">
                      Pair: <span className="font-medium text-[var(--foreground)]/70">{selectedCoin.pair}</span>
                    </div>
                  </div>

                  {/* Timeframe */}
                  <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {(['1m', '5m', '15m', '1h', '4h', '1d'] as const).map((it) => (
                      <button
                        key={it}
                        onClick={() => setIntervalTf(it)}
                        className={
                          interval === it
                            ? `${tfBtnBase} ${tfBtnActive}`
                            : `${tfBtnBase} ${tfBtnInactive}`
                        }
                      >
                        {it}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 min-h-[350px]">
                  <BinanceLikeChart
                    symbolPair={selectedCoin.pair}
                    interval={interval}
                    theme={theme}
                    onPrice={(p: number) => {
                      if (!Number.isFinite(p) || p <= 0) return;
                      const key = selectedCoin.pair.toLowerCase();
                      setTickers((prev: Record<string, TickerSnap>) => ({
                        ...prev,
                        [key]: { price: p, change24h: prev[key]?.change24h ?? 0 },
                      }));
                    }}
                    heightPx={isMobile ? 380 : windowWidth < 1280 ? 480 : 550}
                  />
                </div>
              </div>
            </div>

            {/* ===== COLUMN 3: Trade Panel (Right on PC, second on mobile) ===== */}
            <div style={{ 
              minWidth: 0, 
              order: isMobile ? 2 : 3,
              gridColumn: isMobile ? 'auto' : isMediumScreen ? '3' : 'auto',
              gridRow: isMobile ? 'auto' : isMediumScreen ? '1 / 3' : 'auto'
            }} className="space-y-4">
              {/* Trade Panel */}
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6 shadow-sm">
                <h3 className="mb-4 font-bold text-[var(--foreground)]">Đặt lệnh</h3>

                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-4">
                    <div className="mb-1 flex items-center gap-2 text-sm text-[var(--muted-foreground)] whitespace-nowrap">
                      <Wallet className="h-4 w-4" />
                      Số dư tiền ảo
                    </div>
                    <div className="font-bold text-[var(--foreground)] text-lg truncate">
                      ${virtualBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-4">
                    <div className="mb-1 flex items-center gap-2 text-sm text-[var(--muted-foreground)] whitespace-nowrap">
                      <Wallet className="h-4 w-4" />
                      Số dư {selectedCoin.symbol}
                    </div>
                    <div className="font-bold text-[var(--foreground)] text-lg truncate">
                      {holdings[selectedCoin.id] ? holdings[selectedCoin.id].toLocaleString('en-US', { maximumFractionDigits: 6 }) : '0'}
                    </div>
                  </div>
                </div>

                <div className="mb-6 flex gap-2">
                  <button
                    onClick={() => setTradeType('buy')}
                    className={tradeType === 'buy' ? `${sideBtnBase} ${buyBtnActive}` : `${sideBtnBase} ${buyBtnInactive}`}
                  >
                    Mua
                  </button>
                  <button
                    onClick={() => setTradeType('sell')}
                    className={tradeType === 'sell' ? `${sideBtnBase} ${sellBtnActive}` : `${sideBtnBase} ${sellBtnInactive}`}
                  >
                    Bán
                  </button>
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                    Số lượng ({selectedCoin.symbol})
                  </label>
                  <input
                    type="number"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.000001"
                    min="0"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/60 focus:border-[#559DD2] focus:outline-none focus:ring-2 focus:ring-[#559DD2]/20"
                  />
                </div>

                <div className="mb-6 rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-4">
                  <div className="mb-1 text-sm text-[var(--muted-foreground)]">
                    {tradeType === 'buy' ? 'Tổng chi phí' : 'Tổng giá trị'}
                  </div>
                  <div className="font-bold text-[var(--foreground)] text-lg">
                    ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="mb-2 text-sm text-[var(--muted-foreground)]">Chọn nhanh</div>
                  <div className="grid grid-cols-4 gap-2">
                    {['25%', '50%', '75%', '100%'].map((percent) => (
                      <button
                        key={percent}
                        onClick={() => {
                          const p = parseInt(percent, 10) / 100;
                          const price = livePrice || 0;
                          if (price <= 0) return;

                          if (tradeType === 'sell') {
                            const held = holdings[selectedCoin.id] || 0;
                            setTradeAmount((held * p).toFixed(6));
                          } else {
                            // Leave a small buffer (0.1%) to accommodate real-time price increases
                            const maxAmount = (virtualBalance / price) * 0.999;
                            setTradeAmount((maxAmount * p).toFixed(6));
                          }
                        }}
                        className={quickBtn}
                      >
                        {percent}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleTrade}
                  className={tradeType === 'buy' ? submitBuy : submitSell}
                >
                  {tradeType === 'buy' ? 'Mua' : 'Bán'} {selectedCoin.symbol}
                </button>

                <div className="mt-6 space-y-2 text-sm text-[var(--muted-foreground)]">
                  <div className="flex justify-between">
                    <span>Giá hiện tại</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {livePrice > 0
                        ? `$${livePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thay đổi 24h</span>
                    <span className={changeClass}>
                      {liveChange24h >= 0 ? '+' : ''}
                      {Number.isFinite(liveChange24h) ? liveChange24h.toFixed(2) : '0.00'}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== COLUMN 4: Trade History (Far Right on PC, third on mobile) ===== */}
            <div style={{ 
              minWidth: 0, 
              order: isMobile ? 3 : 4,
              gridColumn: isMobile ? 'auto' : isMediumScreen ? '1' : 'auto',
              gridRow: isMobile ? 'auto' : isMediumScreen ? '2' : 'auto'
            }}>
              <div
                style={{ 
                  height: isMobile ? '400px' : isMediumScreen ? 'calc(100vh - 580px)' : 'calc(100vh - 120px)', 
                  maxHeight: isMediumScreen ? '400px' : '850px', 
                  minHeight: isMediumScreen ? '300px' : 'auto',
                  position: isMobile ? 'relative' : 'sticky', 
                  top: '550px' 
                }}
                className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
              >
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-[#559DD2]" />
                    <h3 className="text-sm font-bold text-[var(--foreground)]">Lịch sử giao dịch</h3>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {tradeHistory.length === 0 ? (
                    <div className="p-4 text-center text-sm text-[var(--muted-foreground)]">
                      Chưa có giao dịch nào
                    </div>
                  ) : (
                    tradeHistory.map((item) => {
                      const isBuy = item.type === 'Mua';
                      const coin = COINS.find(c => c.id === item.coinId) || { logo: '', symbol: item.symbol };
                      return (
                        <div key={item.id} className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 transition-colors hover:bg-[var(--secondary)]">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: isBuy ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: isBuy ? '#ef4444' : '#22c55e' }}>
                              {isBuy ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                            </div>
                            <div>
                              <div className="text-sm font-bold" style={{ color: isBuy ? '#ef4444' : '#22c55e' }}>
                                {isBuy ? 'Mua' : 'Bán'} {item.symbol}
                              </div>
                              <div className="text-[11px] text-[var(--muted-foreground)]">
                                {item.time}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold" style={{ color: isBuy ? '#ef4444' : '#22c55e' }}>
                              {isBuy ? '+' : '-'}{item.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                            </div>
                            <div className="text-xs font-medium" style={{ color: isBuy ? '#ef4444' : '#22c55e' }}>
                              {isBuy ? '-' : '+'}${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* AI Analysis Modal */}
        <AIAnalysisModal
          isOpen={showAIAnalysis}
          onClose={() => setShowAIAnalysis(false)}
          coinName={selectedCoin.name}
          coinSymbol={selectedCoin.symbol}
          pair={selectedCoin.pair}
          price={livePrice}
          change24h={liveChange24h}
        />
      </div>
    </div>
  );
}