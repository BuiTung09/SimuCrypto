import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Market } from './components/Market';
import { PracticeTrading } from './components/PracticeTrading';
import { COINS } from './lib/binanceMarket';
import { Learn } from './components/Learn';
import { Community } from './components/Community';
import { Portfolio } from './components/Portfolio';
import { News } from './components/News';
import { Chatbot } from './components/Chatbot';
import { FeedbackWidget } from './components/FeedbackWidget';
import { Logo } from './components/Logo';
import Auth from "./components/AuthPage";
import { LandingPage } from './components/LandingPage';
import { ProfilePage } from './components/ProfilePage';
import { authApi } from './lib/api';
import { AnalyticsCenter } from './components/AnalyticsCenter';
import { AdminView } from './components/AdminView';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { PageTransition } from './components/PageTransition';
import type { TradeRecord } from './lib/types';
import { trackNavClick } from './lib/analytics';
import khungvip from './assets/khungvip.webp';
import khungvip2 from './assets/khung-vip-2.png';

type Page = 'dashboard' | 'market' | 'trading' | 'news' | 'community' | 'learn' | 'analytics' | 'profile' | 'admin';

// ✅ onNavigate hỗ trợ truyền coinId (optional)
type NavigateFn = (page: Page, coinId?: string) => void;

function AppInner() {
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = sessionStorage.getItem('cs-page');
    return (saved as Page) || 'dashboard';
  });
  const [virtualBalance, setVirtualBalance] = useState(() => {
    const saved = sessionStorage.getItem('cs-balance');
    return saved ? Number(saved) : 10000;
  });
  const [holdings, setHoldings] = useState<Record<string, number>>(() => {
    try {
      const saved = sessionStorage.getItem('cs-holdings');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>(() => {
    try {
      const saved = sessionStorage.getItem('cs-trade-history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('cs-authed') === 'true');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('cs-user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [showLanding, setShowLanding] = useState(() => sessionStorage.getItem('cs-authed') !== 'true');
  const [isPro, setIsPro] = useState(() => sessionStorage.getItem('cs-is-pro') === 'true');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Persist state to sessionStorage
  useEffect(() => { sessionStorage.setItem('cs-page', currentPage); }, [currentPage]);
  useEffect(() => { sessionStorage.setItem('cs-balance', String(virtualBalance)); }, [virtualBalance]);
  useEffect(() => { sessionStorage.setItem('cs-holdings', JSON.stringify(holdings)); }, [holdings]);
  useEffect(() => { sessionStorage.setItem('cs-trade-history', JSON.stringify(tradeHistory)); }, [tradeHistory]);
  useEffect(() => { sessionStorage.setItem('cs-is-pro', String(isPro)); }, [isPro]);
  useEffect(() => {
    sessionStorage.setItem('cs-authed', String(authed));
    if (!authed) {
      sessionStorage.removeItem('cs-page');
      sessionStorage.removeItem('cs-user');
      sessionStorage.removeItem('cs-is-pro');
      setCurrentUser(null);
      setIsPro(false);
    }
  }, [authed]);

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('cs-user', JSON.stringify(currentUser));
      if (currentUser.portfolioAccount) {
        setVirtualBalance(Number(currentUser.portfolioAccount.virtualBalance));

        // Ensure isPro reflects backend state if already pro
        if (currentUser.role >= 1) {
          if (currentUser.proExpiryDate && new Date(currentUser.proExpiryDate) < new Date()) {
            setIsPro(false);
            setCurrentUser((prev: any) => prev ? { ...prev, role: 0, proExpiryDate: null } : null);
          } else {
            setIsPro(true);
          }
        } else {
          setIsPro(false);
        }

        if (currentUser.portfolioAccount.holdings) {
          const mappedHoldings = currentUser.portfolioAccount.holdings.reduce((acc: any, h: any) => {
            // Map pairSymbol (BTCUSDT) back to coinId (bitcoin)
            const coinMeta = COINS.find(c => c.pair === h.pairSymbol);
            const coinId = coinMeta ? coinMeta.id : h.pairSymbol.toLowerCase();
            acc[coinId] = Number(h.amount);
            return acc;
          }, {});
          setHoldings(mappedHoldings);
        }

        if (currentUser.portfolioAccount.trades) {
          const mappedTrades = currentUser.portfolioAccount.trades.map((t: any) => ({
            id: t.id,
            time: new Date(t.executedAt || t.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
            type: t.side === 'buy' ? 'Mua' : 'Bán',
            coinId: COINS.find(c => c.pair === t.pairSymbol)?.id || t.pairSymbol.toLowerCase(),
            symbol: t.pairSymbol.replace('USDT', ''),
            amount: Number(t.quantity),
            price: Number(t.price),
            total: Number(t.totalValue),
            marketContext: t.marketContext,
          }));
          setTradeHistory(mappedTrades);
        }
      }
    }
  }, [currentUser]);

  // ✅ coin được chọn từ Market để auto-select trong PracticeTrading
  const [tradeCoinId, setTradeCoinId] = useState<string | undefined>(undefined);
  const [vnpayResult, setVnpayResult] = useState<'success' | 'failed' | null>(null);

  // VNPay Return Listener
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const vnpResponseCode = urlParams.get('vnp_ResponseCode');

    if (vnpResponseCode) {
      // Determine success/failure based on response code
      if (vnpResponseCode === '00') {
        setVnpayResult('success');
        setIsPro(true);
        if (currentUser?.email) {
          const months = parseInt(localStorage.getItem('cs-vnpay-months') || '1');
          const amount = parseInt(localStorage.getItem('cs-vnpay-amount') || '199000');
          const memo = localStorage.getItem('cs-vnpay-memo') || '';
          authApi.upgradePro({ 
            email: currentUser.email, 
            months,
            amount,
            method: 'VNPay',
            memo
          }).catch(err => console.error("Failed to upgrade pro", err));
          setCurrentUser((prev: any) => prev ? { ...prev, role: 1 } : null);
        }
      } else {
        setVnpayResult('failed');
      }

      // Navigate to profile page to show popup
      setCurrentPage('profile');

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // ✅ thay vì truyền trực tiếp setCurrentPage, dùng hàm này để nhận coinId
  const onNavigate: NavigateFn = (page, coinId) => {
    setCurrentPage(page);
    if (page === 'trading') setTradeCoinId(coinId);
  };

  const addTradeRecord = (type: 'Mua' | 'Bán', coinId: string, amount: number, price: number) => {
    const coinMeta = COINS.find(c => c.id === coinId);
    const record: TradeRecord = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
      type,
      coinId,
      symbol: coinMeta?.symbol ?? coinId.toUpperCase(),
      amount,
      price,
      total: amount * price,
    };
    setTradeHistory((prev) => [record, ...prev].slice(0, 100));
  };

  const handleBuy = (coinId: string, amount: number, price: number) => {
    const totalCost = amount * price;
    if (totalCost <= virtualBalance) {
      setVirtualBalance((prev) => prev - totalCost);
      setHoldings((prev) => ({
        ...prev,
        [coinId]: (prev[coinId] || 0) + amount,
      }));
      addTradeRecord('Mua', coinId, amount, price);
    }
  };

  const handleSell = (coinId: string, amount: number, price: number) => {
    // Check if user has enough holdings, allowing for small precision diff
    const currentHolding = holdings[coinId] || 0;
    if (currentHolding >= amount * 0.99999999) {
      const totalValue = amount * price;
      setVirtualBalance((prev) => prev + totalValue);
      setHoldings((prev) => ({
        ...prev,
        [coinId]: Math.max(0, currentHolding - amount),
      }));
      addTradeRecord('Bán', coinId, amount, price);
    }
  };

  const handleUpdateAccount = (updatedAccount: any) => {
    setCurrentUser((prev: any) => ({
      ...prev,
      portfolioAccount: updatedAccount
    }));
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <PageTransition key="dashboard"><Dashboard onNavigate={onNavigate} virtualBalance={virtualBalance} holdings={holdings} /></PageTransition>;
      case 'market':
        return <PageTransition key="market"><Market onNavigate={onNavigate} /></PageTransition>;
      case 'trading':
        return (
          <PageTransition key="trading">
            <PracticeTrading
              userId={currentUser?.id}
              virtualBalance={virtualBalance}
              holdings={holdings}
              tradeHistory={tradeHistory}
              onBuy={handleBuy}
              onSell={handleSell}
              onUpdateUser={handleUpdateAccount}
              onNavigate={onNavigate}
              initialCoinId={tradeCoinId}
              isPro={isPro}
            />
          </PageTransition>
        );
      case 'news':
        return <PageTransition key="news"><News /></PageTransition>;
      case 'community':
        return <PageTransition key="community"><Community user={currentUser} /></PageTransition>;
      case 'learn':
        return <PageTransition key="learn"><Learn /></PageTransition>;
      case 'analytics':
        return (
          <PageTransition key="analytics">
            <AnalyticsCenter
              virtualBalance={virtualBalance}
              holdings={holdings}
              tradeHistory={tradeHistory}
              onNavigate={onNavigate}
              isPro={isPro}
            />
          </PageTransition>
        );
      case 'profile':
        return (
          <PageTransition key="profile">
            <ProfilePage
              virtualBalance={virtualBalance}
              holdings={holdings}
              onLogout={() => { setAuthed(false); setShowLanding(true); setCurrentPage('dashboard'); }}
              onNavigate={onNavigate}
              vnpayResult={vnpayResult}
              onClearVnpayResult={() => setVnpayResult(null)}
              user={currentUser}
              isPro={isPro}
              tradeHistory={tradeHistory}
              onUpgradeSuccess={() => {
                setIsPro(true);
                setVnpayResult('success');
                setCurrentUser((prev: any) => prev ? { ...prev, role: 1 } : null);
              }}
            />
          </PageTransition>
        );
      case 'admin':
        return (
          <PageTransition key="admin">
            <AdminView user={currentUser} />
          </PageTransition>
        );
      default:
        return <PageTransition key="dashboard-default"><Dashboard onNavigate={onNavigate} virtualBalance={virtualBalance} holdings={holdings} /></PageTransition>;
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {showLanding && !authed ? (
          <PageTransition key="landing">
            <LandingPage onGetStarted={() => setShowLanding(false)} />
          </PageTransition>
        ) : !authed ? (
          <PageTransition key="auth">
            <Auth onAuthed={(user) => {
              setCurrentUser(user);
              setAuthed(true);
            }} />
          </PageTransition>
        ) : (
          <PageTransition key="main-app">
            <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)' }}>
              {/* Header / Navigation */}
              <header style={{
                borderBottom: '1px solid var(--border)',
                background: 'var(--background)',
                position: 'sticky',
                top: 0,
                zIndex: 50,
              }}>
                <div className="mx-auto max-w-7xl px-6">
                  <div className="flex h-16 items-center justify-between">
                    {/* Left: Logo + Desktop Nav */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => onNavigate('dashboard')}
                        className="flex items-center transition-opacity hover:opacity-80"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        <Logo size="xl" />
                      </button>

                      {/* Desktop Navigation */}
                      <nav className="hidden md:flex items-center gap-6 ml-4 h-full">
                        {[
                          { id: 'dashboard', label: 'Dashboard' },
                          { id: 'market', label: 'Thị trường' },
                          { id: 'trading', label: 'Giao dịch ảo' },
                          { id: 'news', label: 'Tin tức' },
                          { id: 'community', label: 'Cộng đồng' },
                          { id: 'learn', label: 'Học tập' },
                          ...(currentUser?.role === 999 ? [{ id: 'admin', label: 'Quản trị' }] : [])
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              onNavigate(item.id as Page);
                              if (item.id === 'trading') {
                                trackNavClick('trading', 'Giao dịch ảo');
                              }
                            }}
                            style={{
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              position: 'relative', padding: '4px',
                              color: currentPage === item.id ? 'var(--foreground)' : 'var(--muted-foreground)',
                              transition: 'color 0.15s',
                              fontWeight: 500,
                            }}
                          >
                            {item.label}
                            {currentPage === item.id && (
                              <div style={{
                                position: 'absolute', bottom: -20, left: 0, right: 0,
                                height: 2, background: '#559DD2', borderRadius: 1,
                              }} />
                            )}
                          </button>
                        ))}
                      </nav>
                    </div>

                    {/* Right side: balance, theme, login/avatar + mobile toggle */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="hidden sm:flex h-9 items-center gap-2 rounded-lg px-3 text-sm"
                        style={{ border: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--muted-foreground)' }}>Số dư:</span>
                        <span className="font-medium">
                          ${virtualBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Theme Toggle */}
                      <button
                        onClick={toggleTheme}
                        style={{
                          width: 36, height: 36, borderRadius: '50%',
                          border: '1px solid var(--border)',
                          background: 'var(--secondary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: 'var(--foreground)',
                        }}
                      >
                        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                      </button>

                      {/* User Avatar */}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => onNavigate('profile')}
                          style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: currentUser?.avatarUrl ? 'var(--card)' : '#559DD2',
                            color: '#000', fontWeight: 600,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', border: currentPage === 'profile' ? '2px solid var(--foreground)' : '1px solid var(--border)',
                            overflow: 'hidden', position: 'relative', zIndex: 10,
                          }}
                        >
                          {currentUser?.avatarUrl ? (
                            <img src={currentUser.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            currentUser?.displayName?.charAt(0).toUpperCase() || 'U'
                          )}
                        </button>
                              {currentUser?.role >= 1 && (
                                <img
                                  src={currentUser?.role === 10 ? khungvip2 : khungvip}
                                  alt="VIP Frame"
                                  style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: `translate(-50%, -50%) scale(${currentUser?.role === 10 ? '2.3' : '1.35'})`,
                                    width: '100%',
                                    height: '100%',
                                    pointerEvents: 'none',
                                    zIndex: 11,
                                  }}
                                />
                              )}
                      </div>

                      {/* Mobile Menu Toggle */}
                      <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="flex md:hidden items-center justify-center w-14 h-14 rounded-2xl hover:bg-[var(--secondary)] transition-colors ml-2"
                        style={{ color: 'var(--foreground)', border: '1px solid var(--border)' }}
                      >
                        {showMobileMenu ? <X size={32} /> : <Menu size={32} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Dropdown Menu Overlay */}
                <AnimatePresence>
                  {showMobileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="md:hidden absolute top-[65px] left-0 right-0 z-50 p-4 border-b border-[var(--border)] shadow-2xl"
                      style={{
                        backgroundColor: 'var(--background)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)'
                      }}
                    >
                      <div className="flex flex-col gap-1">
                        {[
                          { id: 'dashboard', label: 'Dashboard' },
                          { id: 'market', label: 'Thị trường' },
                          { id: 'trading', label: 'Giao dịch ảo' },
                          { id: 'news', label: 'Tin tức' },
                          { id: 'community', label: 'Cộng đồng' },
                          { id: 'learn', label: 'Học tập' },
                          { id: 'profile', label: 'Trang cá nhân' },
                          ...(currentUser?.role === 999 ? [{ id: 'admin', label: 'Quản trị' }] : [])
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              onNavigate(item.id as Page);
                              setShowMobileMenu(false);
                              if (item.id === 'trading') {
                                trackNavClick('trading', 'Giao dịch ảo');
                              }
                            }}
                            className={`w-full text-left p-3 rounded-xl transition-all ${currentPage === item.id ? 'bg-[#559DD2] text-black font-bold' : 'hover:bg-[var(--secondary)] text-[var(--foreground)]'
                              }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </header>

              {/* Main Content */}
              <main className="relative overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  {renderPage()}
                </AnimatePresence>
              </main>

              {/* Footer */}
              <footer style={{
                background: 'var(--background)',
                padding: '48px 0',
              }}>
                <div className="mx-auto max-w-7xl px-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Logo and Description */}
                    <div className="md:col-span-2">
                      <Logo size="lg" className="mb-4" />
                      <p style={{ fontSize: 14, color: 'var(--muted-foreground)', maxWidth: 400 }}>
                        Nền tảng học tập và giao dịch mô phỏng tiền điện tử dành cho người mới bắt đầu. Thực hành an toàn với
                        tiền ảo, học hỏi từ cộng đồng.
                        <br/><br/>
                        <span style={{ 
                          fontSize: 12, 
                          fontStyle: 'italic', 
                          color: '#eab308', // warning/highlight color
                          background: 'rgba(234, 179, 8, 0.1)',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          display: 'inline-block',
                          border: '1px solid rgba(234, 179, 8, 0.2)'
                        }}>
                          <strong>*Tuyên bố miễn trừ trách nhiệm:</strong> Mọi thông tin và số dư trên nền tảng chỉ mang tính chất mô phỏng để học tập, không có giá trị thực tế và không phải lời khuyên đầu tư.
                        </span>
                      </p>
                    </div>

                    {/* Quick Links */}
                    <div>
                      <h4 style={{ fontWeight: 500, marginBottom: 16 }}>Liên kết nhanh</h4>
                      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                          { label: 'Dashboard', page: 'dashboard' as Page },
                          { label: 'Thị trường', page: 'market' as Page },
                          { label: 'Giao dịch ảo', page: 'trading' as Page },
                          { label: 'Cộng đồng', page: 'community' as Page },
                          { label: 'Học tập', page: 'learn' as Page },
                        ].map((link) => (
                          <li key={link.page}>
                            <button
                              onClick={() => onNavigate(link.page)}
                              style={{
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                color: 'var(--muted-foreground)', fontSize: 14,
                                transition: 'color 0.15s', padding: 0,
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--foreground)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}
                            >
                              {link.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Info */}
                    <div>
                      <h4 style={{ fontWeight: 500, marginBottom: 16 }}>Thông tin</h4>
                      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: 'var(--muted-foreground)' }}>
                        <li>Về chúng tôi</li>
                        <li>Điều khoản sử dụng</li>
                        <li>Chính sách bảo mật</li>
                        <li>Liên hệ</li>
                      </ul>
                    </div>
                  </div>

                  {/* Bottom Bar */}
                  <div style={{
                    marginTop: 32, paddingTop: 32,
                    borderTop: '1px solid var(--border)',
                    textAlign: 'center', fontSize: 14,
                    color: 'var(--muted-foreground)',
                  }}>
                    <p>SimuCryto là nền tảng mô phỏng đầu tư và cung cấp thông tin về coin, không phải tư vấn tài chính.</p>
                    <p style={{ marginTop: 8 }}>© 2026 SimuCryto. All rights reserved.</p>
                  </div>
                </div>
              </footer>
            </div>
          </PageTransition>
        )}
      </AnimatePresence>
      {authed && !showLanding && (
        <>
          <FeedbackWidget />
          <Chatbot />
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
