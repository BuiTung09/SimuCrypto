import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, PieChart,
  Activity, Calendar, List, BarChart3, ArrowLeft,
  Sparkles, ChevronDown, ChevronUp, Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { TradeRecord } from '../lib/types';
import { useTheme } from './ThemeContext';
import { COINS, fetchBinance24h } from '../lib/binanceMarket';
import { PerformanceAnalysisModal } from './PerformanceAnalysisModal';

/* ── build a lookup: coin id → CoinMeta ── */
const COIN_BY_ID = new Map(COINS.map(c => [c.id, c]));

/* ── fallback prices (only used if we have no live data) ── */
const FALLBACK_PRICES: Record<string, number> = {
  bitcoin: 96000, ethereum: 2650, binancecoin: 610, solana: 185, ripple: 2.4,
  cardano: 0.9, dogecoin: 0.35, avalanche: 45, polkadot: 8, chainlink: 18,
  polygon: 0.6, uniswap: 12, litecoin: 110, bitcoin_cash: 450, near: 5.5,
  cosmos: 9, stellar: 0.4, algorand: 0.25, filecoin: 6,
};

/** Get a fallback price for a coin ID */
function getFallbackPrice(coinId: string): number {
  return FALLBACK_PRICES[coinId] || 0;
}

/** Get display symbol for a coin ID */
function getSymbol(coinId: string): string {
  const meta = COIN_BY_ID.get(coinId);
  return meta ? meta.symbol : coinId.toUpperCase();
}

interface AnalyticsCenterProps {
  virtualBalance: number;
  holdings: Record<string, number>;
  tradeHistory: TradeRecord[];
  onNavigate?: (page: any, coinId?: string) => void;
  isPro?: boolean;
}

/* ── helpers ── */
const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(v);
const fmtCurrency = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

const INITIAL_BALANCE = 10_000;

/* ── accent colors ── */
const ACCENT = '#559DD2';
const ACCENT_20 = 'rgba(158, 236, 55, 0.2)';

export function AnalyticsCenter({ virtualBalance, holdings, tradeHistory, onNavigate, isPro }: AnalyticsCenterProps) {
  const { theme } = useTheme();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedTradeId, setExpandedTradeId] = useState<number | null>(null);

  const currentUser = JSON.parse(sessionStorage.getItem('cs-user') || '{}');
  const ledger = currentUser.portfolioAccount?.balanceLedger || [];
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const pairs = COINS.map(c => c.pair);
        const priceData = await fetchBinance24h(pairs);
        const priceMap: Record<string, number> = {};
        COINS.forEach(c => {
          if (priceData[c.pair]) {
            priceMap[c.id] = priceData[c.pair].lastPrice;
          }
        });
        setLivePrices(priceMap);
      } catch (error) {
        console.error("Failed to fetch live prices for analytics:", error);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  /* ── total balance ── */
  const portfolioValue = Object.entries(holdings).reduce((sum, [coinId, amt]) => {
    if (amt <= 0) return sum;
    const price = livePrices[coinId] || getFallbackPrice(coinId);
    return sum + amt * price;
  }, 0);
  const totalBalance = virtualBalance + portfolioValue;
  const pnl = totalBalance - INITIAL_BALANCE;
  const pnlPercent = (pnl / INITIAL_BALANCE) * 100;
  const isProfitable = pnl >= 0;

  /* ── 7-day growth chart ── */
  const drawChart = useCallback(() => {
    const canvas = chartRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    // Use actual ledger data if available, fallback to simulated
    let dataPoints: number[] = [];
    let labels: string[] = [];

    if (ledger && ledger.length > 0) {
      const sortedLedger = [...ledger].sort((a: any, b: any) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      dataPoints = sortedLedger.map((l: any) => Number(l.balanceAfter) - INITIAL_BALANCE);
      labels = sortedLedger.map((l: any) => {
        const d = new Date(l.createdAt);
        return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${d.getMinutes()}`;
      });

      if (dataPoints.length > 20) {
        dataPoints = dataPoints.slice(-20);
        labels = labels.slice(-20);
      }
    } else {
      const diff = totalBalance - INITIAL_BALANCE;
      dataPoints = [0, diff * 0.2, diff * 0.5, diff * 0.3, diff * 0.8, diff * 0.7, diff];
      labels = ['Lệnh 1', 'Lệnh 2', 'Lệnh 3', 'Lệnh 4', 'Lệnh 5', 'Lệnh 6', 'Hiện tại'];
    }

    const rawMin = Math.min(...dataPoints);
    const rawMax = Math.max(...dataPoints);
    // Ensure 0 is visible or at least accounted for in the range
    const minVal = Math.min(0, rawMin) - Math.abs(rawMax - rawMin) * 0.1 || -100;
    const maxVal = Math.max(0, rawMax) + Math.abs(rawMax - rawMin) * 0.1 || 100;
    const range = maxVal - minVal || 1;
    const padBottom = 30;
    const padTop = 25;
    const padSide = 40; // Horizontal padding for labels
    const chartH = h - padBottom - padTop;
    const chartW = w - (padSide * 2);
    const chartYOffset = padTop;
    const chartXOffset = padSide;

    const stepX = dataPoints.length > 1 ? chartW / (dataPoints.length - 1) : 0;

    /* Draw Zero Baseline */
    const zeroY = chartYOffset + chartH - ((0 - minVal) / range) * chartH;
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.moveTo(chartXOffset, zeroY);
    ctx.lineTo(chartXOffset + chartW, zeroY);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    /* gradient fill */
    const gradient = ctx.createLinearGradient(0, 0, 0, chartH + chartYOffset);
    gradient.addColorStop(0, 'rgba(158, 236, 55, 0.18)');
    gradient.addColorStop(1, 'rgba(158, 236, 55, 0)');

    ctx.beginPath();
    ctx.moveTo(chartXOffset, chartYOffset + chartH);
    dataPoints.forEach((val, i) => {
      const x = chartXOffset + i * stepX;
      const y = chartYOffset + chartH - ((val - minVal) / range) * chartH;
      ctx.lineTo(x, y);
    });
    ctx.lineTo(chartXOffset + chartW, chartYOffset + chartH);
    ctx.fillStyle = gradient;
    ctx.fill();

    /* line */
    ctx.beginPath();
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    dataPoints.forEach((val, i) => {
      const x = chartXOffset + i * stepX;
      const y = chartYOffset + chartH - ((val - minVal) / range) * chartH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    /* dots & labels */
    const textColor = theme === 'dark' ? '#9CA3AF' : '#6B7280';
    dataPoints.forEach((val, i) => {
      const x = chartXOffset + i * stepX;
      const y = chartYOffset + chartH - ((val - minVal) / range) * chartH;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = val >= 0 ? ACCENT : '#EF4444';
      ctx.fill();
      ctx.strokeStyle = theme === 'dark' ? '#1f2937' : '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Profit Label
      ctx.fillStyle = val >= 0 ? ACCENT : '#EF4444';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      const label = (val >= 0 ? '+' : '') + Math.round(val).toLocaleString();
      ctx.fillText(label, x, y - 12); // Nudge up slightly

      if (i % Math.ceil(dataPoints.length / 5) === 0 || i === dataPoints.length - 1) {
        ctx.fillStyle = textColor;
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], x, h - 8);
      }
    });
  }, [totalBalance, ledger, theme]);

  useEffect(() => {
    drawChart();
    window.addEventListener('resize', drawChart);
    return () => window.removeEventListener('resize', drawChart);
  }, [drawChart]);

  /* ── asset allocation ── */
  const assetList = [
    { coin: 'USD (Tiền mặt)', value: virtualBalance, amount: virtualBalance },
    ...Object.entries(holdings)
      .filter(([, amt]) => amt > 0.0001)
      .map(([coinId, amt]) => ({
        coin: getSymbol(coinId),
        value: amt * getFallbackPrice(coinId),
        amount: amt,
      })),
  ].filter(a => a.value > 0);

  /* ── color helpers (for allocation dots) ── */
  const dotColors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => onNavigate?.('trading')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
          style={{ 
            background: 'var(--secondary)', 
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            fontSize: 14,
            fontWeight: 500
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--secondary)'}
        >
          <ArrowLeft size={16} />
          Quay lại Giao dịch ảo
        </button>
      </div>

      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: ACCENT_20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BarChart3 size={22} color={ACCENT} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
            Trung tâm Phân tích
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Theo dõi hiệu suất và lịch sử giao dịch
          </p>
        </div>
      </div>

      {/* ── 3 Stat Cards ── */}
      <div className="mb-8" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
        gap: 16,
      }}>
        {/* Card 1: Total Balance */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px 24px',
          transition: 'box-shadow 0.2s',
        }}
          className="shadow-sm hover:shadow-md"
        >
          <div className="flex items-center gap-3 mb-3">
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(59, 130, 246, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Wallet size={18} color="#3B82F6" />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--muted-foreground)' }}>
              Tổng tài sản (Quy đổi)
            </span>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
            {fmtCurrency(totalBalance)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Tiền mặt: {fmtCurrency(virtualBalance)}
          </div>
        </div>

        {/* Card 2: PnL */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px 24px',
          transition: 'box-shadow 0.2s',
        }}
          className="shadow-sm hover:shadow-md"
        >
          <div className="flex items-center gap-3 mb-3">
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: isProfitable ? 'rgba(158, 236, 55, 0.15)' : 'rgba(239, 68, 68, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isProfitable
                ? <TrendingUp size={18} color={ACCENT} />
                : <TrendingDown size={18} color="#EF4444" />}
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--muted-foreground)' }}>
              Lợi nhuận tạm tính (PnL)
            </span>
          </div>
          <div className="text-3xl font-bold" style={{ color: isProfitable ? ACCENT : '#EF4444' }}>
            {pnl > 0 ? '+' : ''}{fmtCurrency(pnl)}
          </div>
          <div className="text-xs mt-1 font-bold" style={{ color: isProfitable ? ACCENT : '#EF4444' }}>
            {pnl > 0 ? '+' : ''}{pnlPercent.toFixed(2)}% (All Time)
          </div>
        </div>

        {/* Card 3: Trading Activity */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px 24px',
          transition: 'box-shadow 0.2s',
        }}
          className="shadow-sm hover:shadow-md"
        >
          <div className="flex items-center gap-3 mb-3">
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(139, 92, 246, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Activity size={18} color="#8B5CF6" />
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--muted-foreground)' }}>
              Hoạt động Giao dịch
            </span>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8,
          }}>
            <div>
              <span className="text-2xl font-bold" style={{ color: 'var(--foreground)', display: 'block' }}>
                {tradeHistory.length}
              </span>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Tổng lệnh</span>
            </div>
            <div>
              <span className="text-2xl font-bold" style={{ color: 'var(--foreground)', display: 'block' }}>
                {tradeHistory.length > 0 ? tradeHistory[0].symbol : '—'}
              </span>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Giao dịch gần nhất</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart + Asset Allocation ── */}
      <div className="mb-8" style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
        gap: 16,
        minHeight: 320,
      }}>
        {/* 7-Day Growth Chart */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px 24px',
          display: 'flex', flexDirection: 'column',
        }}
          className="shadow-sm"
        >
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <Calendar size={14} style={{ color: 'var(--muted-foreground)' }} />
            Kiểm soát Lợi nhuận (Theo phiên giao dịch)
          </h3>
          <div style={{ flex: 1, position: 'relative', minHeight: 200 }}>
            <canvas
              ref={chartRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>
        </div>

        {/* Asset Allocation */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px 24px',
          display: 'flex', flexDirection: 'column',
          maxHeight: isMobile ? 360 : 'none',
        }}
          className="shadow-sm"
        >
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <PieChart size={14} style={{ color: 'var(--muted-foreground)' }} />
            Phân bổ tài sản
          </h3>
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
            {assetList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted-foreground)', fontSize: 14, fontStyle: 'italic' }}>
                Chưa có tài sản
              </div>
            ) : (
              assetList.map((asset, idx) => {
                const percent = totalBalance > 0 ? (asset.value / totalBalance) * 100 : 0;
                return (
                  <div
                    key={asset.coin}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', borderRadius: 10,
                      background: 'var(--secondary)',
                      transition: 'background 0.15s',
                      cursor: 'default',
                      fontSize: 13,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: dotColors[idx % dotColors.length],
                      }} />
                      <span className="font-bold" style={{ color: 'var(--foreground)' }}>{asset.coin}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--foreground)', fontFamily: 'monospace' }}>
                        {fmtCurrency(asset.value)}
                      </div>
                      <div style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>
                        {percent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Full Trade History Table ── */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
      }}
        className="shadow-sm"
      >
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--secondary)',
        }}>
          <div className="flex items-center gap-2">
            <List size={16} style={{ color: 'var(--foreground)' }} />
            <span className="font-bold" style={{ color: 'var(--foreground)' }}>
              Lịch sử Giao dịch Toàn bộ
            </span>
          </div>
          
          <button 
            onClick={() => {
              if (!isPro) {
                if (window.confirm("Tính năng Phân tích AI chuyên sâu yêu cầu tài khoản PRO. Bạn có muốn nâng cấp ngay?")) {
                  onNavigate?.('profile');
                }
                return;
              }
              setShowPerformanceModal(true);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #559DD2, #2962FF)',
              color: '#000',
              border: 'none',
              fontWeight: 800,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(158, 236, 55, 0.2)'
            }}
            className="hover:scale-105 transition-transform"
          >
            <Sparkles size={16} />
            PHÂN TÍCH AI CHUYÊN SÂU
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 14, textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--secondary)' }}>
                <th style={{ padding: '16px 24px', width: 40 }}></th>
                <th style={{ padding: '16px 24px', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Thời gian</th>
                <th style={{ padding: '16px 24px', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Cặp</th>
                <th style={{ padding: '16px 24px', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>Loại</th>
                <th style={{ padding: '16px 24px', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', color: 'var(--muted-foreground)', textAlign: 'right' }}>Giá Khớp</th>
                <th style={{ padding: '16px 24px', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', color: 'var(--muted-foreground)', textAlign: 'right' }}>Số lượng</th>
                <th style={{ padding: '16px 24px', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', color: 'var(--muted-foreground)', textAlign: 'right' }}>Tổng (USD)</th>
              </tr>
            </thead>
            <tbody>
              {tradeHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                    Chưa có dữ liệu giao dịch. Hãy bắt đầu mua/bán ở trang Giao dịch ảo!
                  </td>
                </tr>
              ) : (
                tradeHistory.map((trade) => (
                  <React.Fragment key={trade.id}>
                    <tr
                      style={{ borderBottom: '1px solid var(--border)', transition: 'all 0.2s', cursor: 'pointer' }}
                      onClick={() => setExpandedTradeId(expandedTradeId === trade.id ? null : trade.id)}
                      onMouseEnter={(e) => { if (expandedTradeId !== trade.id) e.currentTarget.style.background = 'var(--secondary)'; }}
                      onMouseLeave={(e) => { if (expandedTradeId !== trade.id) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        {expandedTradeId === trade.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </td>
                      <td style={{ padding: '16px 24px', color: 'var(--muted-foreground)' }}>{trade.time}</td>
                      <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--foreground)' }}>{trade.symbol}/USDT</td>
                      <td style={{
                        padding: '16px 24px', fontWeight: 700,
                        color: trade.type === 'Mua' ? ACCENT : '#EF4444',
                      }}>
                        {trade.type}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--foreground)', fontFamily: 'monospace' }}>
                        {fmt(trade.price)}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--foreground)', fontFamily: 'monospace' }}>
                        {trade.amount.toFixed(6)}
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'right', color: 'var(--foreground)', fontFamily: 'monospace' }}>
                        {fmt(trade.total)}
                      </td>
                    </tr>
                    {expandedTradeId === trade.id && (
                      <tr style={{ background: 'var(--secondary)' }}>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            style={{ padding: '16px 24px 24px 88px', overflow: 'hidden' }}
                          >
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
                              {trade.marketContext ? (
                                <>
                                  <div style={{ background: 'var(--card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>CHỈ SỐ RSI</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: (trade.marketContext.rsi || 0) > 70 ? '#EF4444' : (trade.marketContext.rsi || 0) < 30 ? ACCENT : 'var(--foreground)' }}>
                                      {trade.marketContext.rsi?.toFixed(2) || 'N/A'}
                                    </div>
                                  </div>
                                  <div style={{ background: 'var(--card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>XU HƯỚNG</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, color: trade.marketContext.trend === 'bullish' ? ACCENT : '#EF4444' }}>
                                      {trade.marketContext.trend === 'bullish' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                      {trade.marketContext.trend === 'bullish' ? 'Tăng (Bullish)' : 'Giảm (Bearish)'}
                                    </div>
                                  </div>
                                  <div style={{ background: 'var(--card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>MACD HIST</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: (trade.marketContext.macd?.hist || 0) >= 0 ? ACCENT : '#EF4444' }}>
                                      {trade.marketContext.macd?.hist?.toFixed(4) || '0.0000'}
                                    </div>
                                  </div>
                                  <div style={{ background: 'var(--card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>MA (7/25)</div>
                                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                                       {fmt(trade.marketContext.ma7 || 0)} / {fmt(trade.marketContext.ma25 || 0)}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div style={{
                                  gridColumn: '1 / -1', textAlign: 'center', padding: '24px',
                                  background: 'var(--card)', borderRadius: 12, border: '1px dotted var(--border)',
                                  color: 'var(--muted-foreground)', fontSize: 14
                                }}>
                                  Dữ liệu thị trường cho phiên này hiện chưa khả dụng.
                                </div>
                              )}
                            </div>
                            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted-foreground)' }}>
                              <Activity size={14} color={ACCENT} />
                              Dữ liệu thị trường được ghi lại tại thời điểm khớp lệnh và được AI sử dụng để phân tích chiến thuật.
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PerformanceAnalysisModal
        isOpen={showPerformanceModal}
        onClose={() => setShowPerformanceModal(false)}
        tradeHistory={tradeHistory}
        ledger={ledger}
        holdings={holdings}
        totalBalance={totalBalance}
      />
    </div>
  );
}
