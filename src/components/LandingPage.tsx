import { Logo } from './Logo';
import { useTheme } from './ThemeContext';
import { TrendingUp, BarChart3, Users, Newspaper, Shield, Zap, BookOpen, Sun, Moon } from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';

interface LandingPageProps {
    onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
    const { theme, toggleTheme } = useTheme();

    return (
        <div style={{ background: 'var(--background)', color: 'var(--foreground)', minHeight: '100vh' }}>
            {/* Navbar */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 40,
                background: 'var(--background)',
                borderBottom: '1px solid var(--border)',
                backdropFilter: 'blur(12px)',
            }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
                    <Logo size="lg" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            onClick={toggleTheme}
                            style={{
                                width: 40, height: 40, borderRadius: '50%',
                                border: '1px solid var(--border)',
                                background: 'var(--secondary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'var(--foreground)',
                                transition: 'all 0.2s',
                            }}
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button
                            onClick={onGetStarted}
                            style={{
                                padding: '8px 20px', borderRadius: 8,
                                border: 'none', background: '#559DD2', color: '#000',
                                fontWeight: 600, cursor: 'pointer', fontSize: 14,
                                transition: 'opacity 0.2s',
                            }}
                        >
                            Đăng nhập
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <ScrollReveal delay={0.1}>
                <section style={{
                    maxWidth: 1280, margin: '0 auto', padding: '80px 24px 60px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: 64,
                        alignItems: 'center',
                        width: '100%',
                    }}>
                        {/* Left Content */}
                        <div style={{ textAlign: 'left' }}>
                            <div style={{
                                display: 'inline-block', padding: '6px 16px',
                                borderRadius: 999, fontSize: 13, fontWeight: 700,
                                background: 'rgba(158,236,55,0.15)', color: theme === 'dark' ? '#559DD2' : '#3f8c14',
                                marginBottom: 24, letterSpacing: 0.5,
                            }}>
                                🚀 Nền tảng học đầu tư crypto #1 Việt Nam
                            </div>
                            <h1 style={{
                                fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                                fontWeight: 800,
                                lineHeight: 1.1,
                                marginBottom: 20,
                                background: 'linear-gradient(135deg, var(--foreground) 0%, #559DD2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>
                                Học đầu tư Crypto<br />an toàn & miễn phí
                            </h1>
                            <p style={{
                                fontSize: 18, maxWidth: 600, marginBottom: 40,
                                opacity: 0.7, lineHeight: 1.7,
                            }}>
                                Thực hành giao dịch với tiền ảo, theo dõi thị trường realtime từ Binance,
                                và học hỏi từ cộng đồng — hoàn toàn miễn phí, không rủi ro. Dành cho người mới bắt đầu.
                            </p>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <button
                                    onClick={onGetStarted}
                                    style={{
                                        padding: '14px 36px', borderRadius: 12,
                                        border: 'none', background: '#559DD2', color: '#000',
                                        fontWeight: 700, fontSize: 16, cursor: 'pointer',
                                        boxShadow: '0 4px 24px rgba(158,236,55,0.3)',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(158,236,55,0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 24px rgba(158,236,55,0.3)';
                                    }}
                                >
                                    Bắt đầu ngay — Miễn phí
                                </button>
                                <button
                                    onClick={() => {
                                        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    style={{
                                        padding: '14px 36px', borderRadius: 12,
                                        border: '1px solid var(--border)',
                                        background: 'transparent', color: 'var(--foreground)',
                                        fontWeight: 600, fontSize: 16, cursor: 'pointer',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--secondary)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                    Tìm hiểu thêm ↓
                                </button>
                            </div>
                        </div>

                        {/* Right Content - Large Animated Logo */}
                        <div style={{
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            position: 'relative',
                            padding: '40px',
                        }}>
                            {/* Glowing background blob behind the logo */}
                            <div style={{
                                position: 'absolute',
                                width: '250px',
                                height: '250px',
                                background: 'radial-gradient(circle, rgba(158,236,55,0.4) 0%, rgba(0,0,0,0) 70%)',
                                filter: 'blur(40px)',
                                zIndex: 0,
                                animation: 'pulse-glow 4s ease-in-out infinite alternate',
                            }} />

                            <div style={{
                                position: 'relative', zIndex: 1,
                                transform: 'scale(1.5)',
                                animation: 'float-up-down 6s ease-in-out infinite',
                                filter: theme === 'dark' ? 'drop-shadow(0 20px 40px rgba(158,236,55,0.2))' : 'drop-shadow(0 20px 40px rgba(0,0,0,0.1))',
                            }}>
                                <Logo size="xl" />
                            </div>
                            <style>{`
                                @keyframes float-up-down {
                                    0% { transform: translateY(0px) scale(2.5); }
                                    50% { transform: translateY(-20px) scale(2.5); }
                                    100% { transform: translateY(0px) scale(2.5); }
                                }
                                @keyframes pulse-glow {
                                    0% { transform: scale(0.8); opacity: 0.5; }
                                    100% { transform: scale(1.5); opacity: 1; }
                                }
                            `}</style>
                        </div>
                    </div>

                    {/* Example Market Preview / Partners Banner */}
                    <div style={{
                        width: '100%',
                        marginTop: 100,
                        padding: '32px 0',
                        borderTop: '1px solid var(--border)',
                        borderBottom: '1px solid var(--border)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: '80px',
                            whiteSpace: 'nowrap',
                            animation: 'ticker-scroll-slow 40s linear infinite',
                            width: 'max-content',
                            opacity: 0.8
                        }}>
                            {/* Duplicated for smooth scrolling */}
                            {[...Array(2)].map((_, i) => (
                                <div key={i} style={{ display: 'flex', gap: '80px', alignItems: 'center' }}>
                                    {['Bitcoin (BTC) $43,200', 'Ethereum (ETH) $3,100', 'Solana (SOL) $142', 'BNB (BNB) $390', 'Cardano (ADA) $0.65', 'Ripple (XRP) $0.62', 'Polkadot (DOT) $8.40'].map(coin => (
                                        <div key={coin} style={{ fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#559DD2' }} />
                                            {coin}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                        <style>{`
                            @keyframes ticker-scroll-slow {
                                0% { transform: translateX(0); }
                                100% { transform: translateX(-50%); }
                            }
                        `}</style>
                    </div>

                    {/* Stats */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: 24, marginTop: 40, width: '100%',
                        paddingTop: 32,
                    }}>
                        {[
                            { value: '50+', label: 'Coin hỗ trợ' },
                            { value: '$10,000', label: 'Tiền ảo miễn phí' },
                            { value: 'Realtime', label: 'Giá từ Binance' },
                            { value: '24/7', label: 'Thị trường mở' },
                        ].map((s) => (
                            <div key={s.label} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#559DD2' }}>{s.value}</div>
                                <div style={{ fontSize: 14, opacity: 0.6, marginTop: 4 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </section>
            </ScrollReveal>

            {/* Features */}
            <ScrollReveal delay={0.2}>
                <section id="features" style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 24px 80px' }}>
                    <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>
                        Tính năng nổi bật
                    </h2>
                    <p style={{ textAlign: 'center', opacity: 0.6, marginBottom: 48, fontSize: 16 }}>
                        Mọi thứ bạn cần để bắt đầu hành trình đầu tư crypto
                    </p>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 24,
                    }}>
                        {[
                            { icon: <TrendingUp size={24} />, title: 'Thị trường Realtime', desc: 'Theo dõi giá, khối lượng giao dịch và biến động 24h từ Binance API, cập nhật mỗi 10 giây.', color: '#559DD2' },
                            { icon: <BarChart3 size={24} />, title: 'Giao dịch mô phỏng', desc: 'Thực hành mua/bán coin với $10,000 tiền ảo. Biểu đồ nến chuyên nghiệp với đầy đủ chỉ báo.', color: '#60a5fa' },
                            { icon: <BookOpen size={24} />, title: 'Học tập có hướng dẫn', desc: 'Khóa học từ cơ bản đến nâng cao, quiz kiểm tra kiến thức và chứng chỉ hoàn thành.', color: '#f472b6' },
                            { icon: <Users size={24} />, title: 'Cộng đồng sôi nổi', desc: 'Thảo luận chiến lược, chia sẻ phân tích kỹ thuật, và học hỏi từ những nhà đầu tư khác.', color: '#c084fc' },
                            { icon: <Newspaper size={24} />, title: 'Tin tức & Phân tích', desc: 'Cập nhật tin tức crypto mới nhất, phân tích chuyên sâu và nhận định thị trường.', color: '#fb923c' },
                            { icon: <Shield size={24} />, title: 'An toàn & Miễn phí', desc: 'Không sử dụng tiền thật. Hoàn toàn miễn phí, không quảng cáo, không rủi ro tài chính.', color: '#34d399' },
                        ].map((f) => (
                            <div key={f.title} style={{
                                padding: 28,
                                borderRadius: 16,
                                border: '1px solid var(--border)',
                                background: 'var(--card)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                cursor: 'default',
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{
                                    width: 48, height: 48, borderRadius: 12,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: `${f.color}20`, color: f.color,
                                    marginBottom: 16,
                                }}>
                                    {f.icon}
                                </div>
                                <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{f.title}</h3>
                                <p style={{ opacity: 0.6, lineHeight: 1.6, fontSize: 14 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </ScrollReveal>

            {/* How It Works */}
            <ScrollReveal delay={0.3}>
                <section style={{
                    background: 'var(--secondary)',
                    padding: '80px 24px',
                }}>
                    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                        <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>
                            Bắt đầu trong 3 bước
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32 }}>
                            {[
                                { step: '01', title: 'Tạo tài khoản', desc: 'Đăng ký miễn phí và nhận ngay $10,000 tiền ảo để bắt đầu thực hành.', icon: <Zap size={28} /> },
                                { step: '02', title: 'Khám phá thị trường', desc: 'Xem giá realtime, phân tích biểu đồ và tìm coin tiềm năng.', icon: <TrendingUp size={28} /> },
                                { step: '03', title: 'Thực hành giao dịch', desc: 'Mua bán coin với tiền ảo, theo dõi portfolio và cải thiện kỹ năng.', icon: <BarChart3 size={28} /> },
                            ].map((s) => (
                                <div key={s.step} style={{ textAlign: 'center' }}>
                                    <div style={{
                                        width: 72, height: 72, borderRadius: '50%',
                                        background: '#559DD2', color: '#000',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 auto 20px', fontSize: 20, fontWeight: 800,
                                    }}>
                                        {s.icon}
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#559DD2', letterSpacing: 1, marginBottom: 8 }}>
                                        BƯỚC {s.step}
                                    </div>
                                    <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>{s.title}</h3>
                                    <p style={{ opacity: 0.6, lineHeight: 1.6 }}>{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </ScrollReveal>

            {/* Deep Dive - Professional Trading */}
            <ScrollReveal delay={0.2}>
                <section style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 24px' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: 64,
                        alignItems: 'center',
                    }}>
                        <div style={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: 24,
                            padding: 24,
                            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                        }}>
                            {/* Mockup Chart Graphic */}
                            <div style={{
                                width: '100%', height: 320, borderRadius: 12,
                                background: 'linear-gradient(to bottom right, var(--secondary) 0%, var(--background) 100%)',
                                position: 'relative', overflow: 'hidden',
                                border: '1px solid var(--border)', display: 'flex', flexDirection: 'column'
                            }}>
                                <div style={{ height: 40, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 16 }}>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308' }} />
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>BTC/USD</div>
                                </div>
                                <div style={{ flex: 1, position: 'relative', padding: 16 }}>
                                    {/* Fake Candlesticks */}
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: '100%' }}>
                                        {[40, 60, 30, 80, 50, 90, 70, 100].map((h, i) => (
                                            <div key={i} style={{ flex: 1, height: `${h}%`, background: i % 2 === 0 ? '#22c55e' : '#ef4444', width: 12, borderRadius: 2 }} className="mx-auto" />
                                        ))}
                                    </div>
                                    <div style={{ position: 'absolute', top: 30, left: 16, right: 16, height: 2, background: 'rgba(96, 165, 250, 0.5)', transform: 'rotate(-5deg)' }} />
                                </div>
                            </div>
                        </div>
                        <div>
                            <div style={{ color: '#559DD2', fontWeight: 700, letterSpacing: 1, fontSize: 13, marginBottom: 12 }}>PRO TRADING</div>
                            <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 24, lineHeight: 1.2 }}>
                                Giao diện biểu đồ<br />chuẩn chuyên gia
                            </h2>
                            <p style={{ opacity: 0.7, fontSize: 18, lineHeight: 1.7, marginBottom: 32 }}>
                                Nền tảng cung cấp bộ công cụ biểu đồ mạnh mẽ từ TradingView. Vẽ đường xu hướng, áp dụng Fibonacci, và sử dụng hàng chục chỉ báo kỹ thuật (RSI, MACD, Bollinger Bands...) mà không cần công cụ bên thứ ba.
                            </p>
                            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {['Hỗ trợ đa khung thời gian (1m đến 1M)', 'Hơn 50+ chỉ báo kỹ thuật tích hợp', 'Giao diện tùy chỉnh sáng/tối', 'Kết xuất lệnh nhanh chóng'].map(item => (
                                    <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 500 }}>
                                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#559DD2', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✓</div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>
            </ScrollReveal>

            {/* Testimonials */}
            <ScrollReveal delay={0.3}>
                <section style={{ background: 'var(--secondary)', padding: '100px 24px' }}>
                    <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                        <div style={{ textAlign: 'center', marginBottom: 64 }}>
                            <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>Được cộng đồng tin tưởng</h2>
                            <p style={{ fontSize: 18, opacity: 0.7, maxWidth: 600, margin: '0 auto' }}>
                                Hàng ngàn người dùng đã bắt đầu hành trình đầu tư crypto an toàn cùng SimuCrypto.
                            </p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
                            {[
                                { name: 'Tuấn Trần', role: 'Sinh viên', review: 'Nhờ có nền tảng này, mình đã hiểu cách đọc nến và vào lệnh cơ bản mà không phải trả học phí bằng tiền thật. Cực kỳ khuyên dùng cho new bie!', rating: 5 },
                                { name: 'Mai Hương', role: 'Nhân viên văn phòng', review: 'Giao diện mượt mà và trực quan. Việc có sẵn 10.000$ ảo giúp mình tự tin thử nghiệm các phương pháp giao dịch rủi ro cao.', rating: 5 },
                                { name: 'Đức Phát', role: 'Trader tập sự', review: 'Biểu đồ chạy rất chuẩn với giá thực trên Binance. Phần cộng đồng chat hỗ trợ và phím kèo khá sôi nổi.', rating: 5 },
                            ].map(t => (
                                <div key={t.name} style={{
                                    background: 'var(--card)', padding: 32, borderRadius: 20,
                                    border: '1px solid var(--border)',
                                    display: 'flex', flexDirection: 'column',
                                }}>
                                    <div style={{ display: 'flex', gap: 4, color: '#eab308', marginBottom: 20 }}>
                                        {[...Array(t.rating)].map((_, i) => <span key={i}>★</span>)}
                                    </div>
                                    <p style={{ opacity: 0.8, fontSize: 16, lineHeight: 1.6, flex: 1, marginBottom: 24, fontStyle: 'italic' }}>
                                        "{t.review}"
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(45deg, #559DD2, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold' }}>
                                            {t.name[0]}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 700 }}>{t.name}</div>
                                            <div style={{ fontSize: 13, opacity: 0.6 }}>{t.role}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </ScrollReveal>

            {/* FAQ Section */}
            <ScrollReveal delay={0.4}>
                <section style={{ maxWidth: 800, margin: '0 auto', padding: '100px 24px' }}>
                    <h2 style={{ fontSize: 36, fontWeight: 800, textAlign: 'center', marginBottom: 48 }}>Câu hỏi thường gặp</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[
                            { q: 'SimuCryto có hoàn toàn miễn phí không?', a: 'Có, toàn bộ tính năng của SimuCryto hiện tại là miễn phí 100%. Chúng tôi tạo ra nền tảng này nhằm mục đích giáo dục cộng đồng.' },
                            { q: 'Tiền ảo trong tài khoản có rút được không?', a: 'Không thể. Số dư $10,000 bạn nhận được là tiền giả lập (Paper Money) dùng riêng lẻ trên hệ thống để thực hành, không có giá trị quy đổi thành tiền mặt hay crypto thật.' },
                            { q: 'Dữ liệu biểu đồ lấy từ đâu?', a: 'Giá cả và khối lượng giao dịch được lấy trực tiếp thông qua kết nối API Realtime của Binance, đảm bảo khớp sát nhất với thị trường thực.' },
                            { q: 'Tôi có thể dùng nền tảng này trên điện thoại không?', a: 'Hoàn toàn được. Giao diện của SimuCryto được thiết kế Responsive tối ưu cho cả màn hình Desktop, Tablet, và Mobile.' },
                        ].map((faq, index) => (
                            <div key={index} style={{
                                background: 'var(--card)', border: '1px solid var(--border)',
                                borderRadius: 16, padding: '24px 32px'
                            }}>
                                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{faq.q}</h3>
                                <p style={{ opacity: 0.7, lineHeight: 1.6 }}>{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </ScrollReveal>

            {/* CTA */}
            <ScrollReveal delay={0.4}>
                <section style={{
                    maxWidth: 1280, margin: '0 auto', padding: '80px 24px',
                    textAlign: 'center',
                }}>
                    <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 16 }}>
                        Sẵn sàng bắt đầu?
                    </h2>
                    <p style={{ opacity: 0.6, marginBottom: 32, fontSize: 16, maxWidth: 500, margin: '0 auto 32px' }}>
                        Tham gia ngay hôm nay và nhận $10,000 tiền ảo miễn phí để thực hành giao dịch.
                    </p>
                    <button
                        onClick={onGetStarted}
                        style={{
                            padding: '16px 48px', borderRadius: 12,
                            border: 'none', background: '#559DD2', color: '#000',
                            fontWeight: 700, fontSize: 18, cursor: 'pointer',
                            boxShadow: '0 4px 24px rgba(158,236,55,0.3)',
                            transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        Tạo tài khoản miễn phí
                    </button>
                </section>
            </ScrollReveal>

            {/* Footer */}
            <ScrollReveal delay={0.5}>
                <footer style={{
                    borderTop: '1px solid var(--border)',
                    padding: '48px 24px',
                    background: 'var(--card)',
                }}>
                    <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>
                        <div>
                            <Logo size="lg" className="mb-4" />
                            <p style={{ fontSize: 14, opacity: 0.6, marginTop: 12, lineHeight: 1.6 }}>
                                Nền tảng học tập và giao dịch mô phỏng tiền điện tử dành cho người mới bắt đầu.
                            </p>
                        </div>
                        <div>
                            <h4 style={{ fontWeight: 600, marginBottom: 16 }}>Sản phẩm</h4>
                            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, opacity: 0.6 }}>
                                <li>Thị trường</li>
                                <li>Giao dịch ảo</li>
                                <li>Học tập</li>
                                <li>Cộng đồng</li>
                            </ul>
                        </div>
                        <div>
                            <h4 style={{ fontWeight: 600, marginBottom: 16 }}>Thông tin</h4>
                            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, opacity: 0.6 }}>
                                <li>Về chúng tôi</li>
                                <li>Điều khoản sử dụng</li>
                                <li>Chính sách bảo mật</li>
                                <li>Liên hệ</li>
                            </ul>
                        </div>
                    </div>
                    <div style={{ maxWidth: 1280, margin: '32px auto 0', paddingTop: 24, borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: 14, opacity: 0.5 }}>
                        © 2026 SimuCryto. All rights reserved. Đây là nền tảng mô phỏng, không phải tư vấn tài chính.
                    </div>
                </footer>
            </ScrollReveal>
        </div>
    );
}
