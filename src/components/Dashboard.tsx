import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Wallet, BarChart3, DollarSign, TrendingUp, MessageSquare, LineChart, PieChart } from "lucide-react";
import { COINS, fetchBinance24h, formatCompact, type MarketRow, getCoinLogo } from "../lib/binanceMarket";
import { ScrollReveal } from "./ScrollReveal";

interface DashboardProps {
  onNavigate: (page: "dashboard" | "market" | "trading" | "news" | "community" | "profile", coinId?: string) => void;
  virtualBalance: number;
  holdings: Record<string, number>;
}

// Simple sparkline SVG
function Sparkline({ trend, color }: { trend: number; color: string }) {
  const pts = trend >= 0
    ? "5,28 15,22 25,25 35,18 45,20 55,12 65,14 75,8"
    : "5,8 15,14 25,12 35,20 45,18 55,25 65,22 75,28";
  return (
    <svg width="80" height="32" viewBox="0 0 80 36" fill="none">
      <polyline points={pts} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Dashboard({ onNavigate, virtualBalance, holdings }: DashboardProps) {
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        const pairs = COINS.map((c) => c.pair);
        const data = await fetchBinance24h(pairs);

        const next: MarketRow[] = COINS.map((c) => ({
          id: c.id,
          name: c.name,
          symbol: c.symbol,
          pair: c.pair,
          logo: c.logo ?? (typeof getCoinLogo === "function" ? getCoinLogo(c.symbol) : undefined),
          price: data[c.pair]?.lastPrice ?? 0,
          change24h: data[c.pair]?.changePct ?? 0,
          volume24h: data[c.pair]?.quoteVolume ?? 0,
        }));

        if (alive) {
          setRows(next);
        }
      } catch { }
      finally { if (alive) setLoading(false); }
    };

    load();
    const t = window.setInterval(load, 10_000);
    return () => { alive = false; window.clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const investedValue = useMemo(() => {
    let total = 0;
    for (const [coinId, amount] of Object.entries(holdings)) {
      const row = rows.find((r) => r.id === coinId);
      if (row) total += row.price * amount;
    }
    return total;
  }, [rows, holdings]);

  const totalAssets = virtualBalance + investedValue;
  const todayChange = rows.length > 0
    ? rows.reduce((sum, r) => sum + r.change24h, 0) / rows.length
    : 0;

  const hotCoins = rows.slice(0, 5);

  // Card style helper
  const card = (extra?: React.CSSProperties): React.CSSProperties => ({
    borderRadius: 14,
    border: '1px solid var(--border)',
    background: 'var(--card)',
    padding: 20,
    transition: 'all 0.2s',
    ...extra,
  });

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: '#559DD2', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--muted-foreground)' }}>Đang tải dữ liệu...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">

      {/* ========== HEADER ========== */}
      <ScrollReveal delay={0.1}>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 4 }}>Portfolio Overview</h1>
            <p style={{ color: 'var(--muted-foreground)', fontSize: 14 }}>
              Xin chào! Đây là tổng quan tài sản của bạn hôm nay.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onNavigate('market')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--card)',
                color: 'var(--foreground)', fontWeight: 500, fontSize: 13, cursor: 'pointer',
              }}
            >
              <BarChart3 size={15} /> Thị trường
            </button>
            <button
              onClick={() => onNavigate('trading')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 18px', borderRadius: 10,
                border: 'none', background: '#559DD2',
                color: '#000', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}
            >
              <TrendingUp size={15} /> Giao dịch ngay
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* ========== 3 BALANCE CARDS ========== */}
      <ScrollReveal delay={0.2}>
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Available */}
          <div style={card()}>
            <div className="flex items-center gap-3 mb-3">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(158,236,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={18} color="#559DD2" />
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>Số dư khả dụng</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              ${virtualBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              {['BTC', 'ETH', 'SOL'].map(s => (
                <span key={s} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: 'var(--secondary)', color: 'var(--muted-foreground)' }}>{s}</span>
              ))}
            </div>
          </div>

          {/* Invested */}
          <div style={card()}>
            <div className="flex items-center gap-3 mb-3">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DollarSign size={18} color="#6366F1" />
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1 }}>Đã đầu tư</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              ${investedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted-foreground)' }}>
              {Object.keys(holdings).length} coins đang nắm giữ
            </div>
          </div>

          {/* Total Assets — highlighted */}
          <div style={{
            ...card(),
            background: 'linear-gradient(135deg, #559DD2, #6BCB77)',
            border: 'none',
            color: '#000',
          }}>
            <div className="flex items-center gap-3 mb-3">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PieChart size={18} color="#000" />
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(0,0,0,0.6)' }}>Tổng tài sản</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              ${totalAssets.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: 'rgba(0,0,0,0.15)', color: '#000'
              }}>
                LIVE
              </span>
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>
                {todayChange >= 0 ? '+' : ''}{todayChange.toFixed(2)}% Hôm nay
              </span>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* ========== 3 FEATURE CARDS ========== */}
      <ScrollReveal delay={0.3}>
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              icon: <LineChart size={22} color="#559DD2" />,
              title: 'Dữ liệu thị trường',
              desc: 'Khám phá giá realtime và biến động thị trường toàn cầu.',
              link: 'Phân tích →',
              page: 'market' as const,
            },
            {
              icon: <DollarSign size={22} color="#559DD2" />,
              title: 'Giao dịch mô phỏng',
              desc: 'Thực hành chiến lược giao dịch với tiền ảo, không rủi ro.',
              link: 'Bắt đầu →',
              page: 'trading' as const,
            },
            {
              icon: <MessageSquare size={22} color="#559DD2" />,
              title: 'Cộng đồng',
              desc: 'Thảo luận và chia sẻ kinh nghiệm với cộng đồng trader.',
              link: 'Tham gia →',
              page: 'community' as const,
            },
          ].map((item, i) => (
            <div
              key={i}
              style={card({ cursor: 'pointer' })}
              onClick={() => onNavigate(item.page)}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(158,236,55,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                {item.icon}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{item.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5, marginBottom: 14 }}>{item.desc}</p>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#559DD2' }}>{item.link}</span>
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* ========== COIN TICKER (chữ chạy) ========== */}
      {rows.length > 0 && (
        <ScrollReveal delay={0.4}>
          <div style={{
            marginBottom: 24,
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--card)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {/* Gradient fade edges */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 40, background: 'linear-gradient(to right, var(--card), transparent)', zIndex: 2 }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, background: 'linear-gradient(to left, var(--card), transparent)', zIndex: 2 }} />

            <div style={{ overflow: 'hidden', padding: '12px 0' }}>
              <div style={{
                display: 'flex',
                gap: 0,
                animation: 'ticker-scroll 60s linear infinite',
                width: 'max-content',
              }}>
                {/* Duplicate for seamless loop */}
                {[...rows, ...rows].map((coin, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 20px',
                      whiteSpace: 'nowrap',
                      borderRight: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                    onClick={() => onNavigate('trading', coin.id)}
                  >
                    {coin.logo && (
                      <img src={coin.logo} alt={coin.symbol} style={{ width: 20, height: 20, borderRadius: '50%' }} />
                    )}
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{coin.symbol}</span>
                    <span style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                      ${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 600,
                      color: coin.change24h >= 0 ? '#0ECB81' : '#F6465D',
                    }}>
                      {coin.change24h >= 0 ? '▲' : '▼'} {Math.abs(coin.change24h).toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <style>{`
            @keyframes ticker-scroll {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
          </div>
        </ScrollReveal>
      )}

      {/* ========== HOT MARKETS TABLE ========== */}
      <ScrollReveal delay={0.5}>
        <div style={{ ...card(), marginBottom: 24 }}>
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 20 }}>🔥</span>
              <h2 style={{ fontSize: 17, fontWeight: 600 }}>Hot Markets</h2>
            </div>
            <button
              onClick={() => onNavigate('market')}
              style={{ fontSize: 13, fontWeight: 500, color: '#559DD2', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Xem tất cả
            </button>
          </div>

          {/* Table Header */}
          <div className="desktop-header hot-market-row" style={{ padding: '0 8px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted-foreground)' }}>
            <span>Tài sản</span>
            <span>Giá</span>
            <span>24h</span>
            <span>Vốn hóa</span>
            <span>Biểu đồ</span>
            <span></span>
          </div>

          {/* Table Header Mobile */}
          <div className="mobile-header hot-market-row" style={{ padding: '0 8px 12px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--muted-foreground)' }}>
            <span>Tài sản</span>
            <span>Giá</span>
            <span style={{ textAlign: 'right' }}>24h</span>
            <span></span>
          </div>

          {/* Custom CSS for Hot Markets Rows */}
          <style>{`
            .hot-market-row { grid-template-columns: 1.5fr 1fr 1fr 80px; }
            .desktop-header { display: none; }
            .mobile-header { display: grid; }
            .desktop-cell { display: none; }

            @media (min-width: 768px) {
              .hot-market-row { grid-template-columns: 2fr 1.2fr 1fr 1fr 100px 80px !important; }
              .desktop-header { display: grid !important; }
              .mobile-header { display: none !important; }
              .desktop-cell { display: block !important; }
            }
          `}</style>

          {/* Table Rows */}
          {hotCoins.map((coin) => (
            <div
              key={coin.id}
              className="grid items-center hot-market-row"
              style={{
                padding: '12px 8px',
                borderTop: '1px solid var(--border)',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => onNavigate('trading', coin.id)}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {/* Asset */}
              <div className="flex items-center gap-3">
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
                  background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: 'var(--foreground)',
                }}>
                  {coin.logo
                    ? <img src={coin.logo} alt={coin.symbol} style={{ width: 36, height: 36 }} />
                    : coin.symbol.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{coin.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{coin.symbol}</div>
                </div>
              </div>

              {/* Price */}
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                ${coin.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {/* 24h Change */}
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '3px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: coin.change24h >= 0 ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)',
                color: coin.change24h >= 0 ? '#0ECB81' : '#F6465D',
                width: 'fit-content',
              }}>
                {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(2)}%
              </div>

              {/* Market Cap - hidden on mobile */}
              <div className="desktop-cell" style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                ${formatCompact(coin.volume24h)}
              </div>

              {/* Sparkline - hidden on mobile */}
              <div className="desktop-cell">
                <Sparkline trend={coin.change24h} color={coin.change24h >= 0 ? '#0ECB81' : '#F6465D'} />
              </div>

              {/* Trade button */}
              <button
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: '1px solid var(--border)', background: 'var(--secondary)',
                  color: 'var(--foreground)', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onClick={(e) => { e.stopPropagation(); onNavigate('trading', coin.id); }}
              >
                TRADE
              </button>
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* ========== MASTER YOUR SKILLS ========== */}
      <ScrollReveal delay={0.6}>
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Nâng cao kỹ năng</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              {
                num: '1',
                title: 'Kiến thức nền tảng',
                desc: 'Tìm hiểu blockchain, các vòng thị trường và phân tích cơ bản.',
                page: 'news' as const,
              },
              {
                num: '2',
                title: 'Giao dịch mô phỏng',
                desc: 'Đặt lệnh với giá realtime sử dụng tiền ảo, không rủi ro.',
                page: 'trading' as const,
              },
              {
                num: '3',
                title: 'Phân tích danh mục',
                desc: 'Theo dõi hiệu suất, tỉ lệ thắng/thua và tối ưu chiến lược.',
                page: 'profile' as const,
              },
            ].map((item) => (
              <div
                key={item.num}
                style={{
                  ...card({ cursor: 'pointer' }),
                  background: 'rgba(158,236,55,0.04)',
                  border: '1px solid rgba(158,236,55,0.15)',
                }}
                onClick={() => onNavigate(item.page)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(158,236,55,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(158,236,55,0.04)'; }}
              >
                <div className="flex items-center gap-4">
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: '#559DD2', color: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800, flexShrink: 0,
                  }}>
                    {item.num}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{item.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* ========== FOOTER ========== */}
      <ScrollReveal delay={0.7}>
        <footer style={{ borderTop: '1px solid var(--border)', paddingTop: 40, paddingBottom: 24 }}>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4" style={{ marginBottom: 32 }}>
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#559DD2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#000' }}>C</span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 16 }}>SimuCryto</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                Nền tảng học tập và giao dịch mô phỏng tiền điện tử dành cho người mới bắt đầu.
              </p>
            </div>

            {/* Platform */}
            <div>
              <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, color: 'var(--muted-foreground)' }}>Nền tảng</h4>
              {['Dashboard', 'Thị trường', 'Giao dịch ảo'].map(link => (
                <p key={link} style={{ fontSize: 13, marginBottom: 8, color: 'var(--muted-foreground)', cursor: 'pointer' }}>{link}</p>
              ))}
            </div>

            {/* Legal */}
            <div>
              <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, color: 'var(--muted-foreground)' }}>Thông tin</h4>
              {['Điều khoản sử dụng', 'Chính sách bảo mật', 'Miễn trừ rủi ro'].map(link => (
                <p key={link} style={{ fontSize: 13, marginBottom: 8, color: 'var(--muted-foreground)' }}>{link}</p>
              ))}
            </div>

            {/* Newsletter */}
            <div>
              <h4 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, color: 'var(--muted-foreground)' }}>Nhận tin mới</h4>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10 }}>Nhận phân tích thị trường mới nhất.</p>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="email"
                  placeholder="Email của bạn"
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8,
                    border: '1px solid var(--border)', background: 'var(--secondary)',
                    color: 'var(--foreground)', fontSize: 12, outline: 'none',
                  }}
                />
                <button style={{
                  width: 34, height: 34, borderRadius: 8, border: 'none',
                  background: '#559DD2', color: '#000', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted-foreground)', paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            © 2024 SIMUCRYPTO FINTECH SOLUTIONS • BUILT FOR THE FUTURE
          </div>
        </footer>
      </ScrollReveal>
    </div>
  );
}
