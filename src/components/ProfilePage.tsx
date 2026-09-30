import { useMemo, useState, useEffect } from 'react';
import { COINS } from '../lib/binanceMarket';
import { createPortal } from 'react-dom';
import { useTheme } from './ThemeContext';
import { Sun, Moon, LogOut, TrendingUp, Clock, Bell, Shield, ChevronRight, Star, Check, X, ArrowLeft, Zap, Crown, Sparkles, CheckCircle2, XCircle, AlertTriangle, Copy, Pause, Play } from 'lucide-react';
import { generateVnPayUrl } from '../lib/vnpay';
import { authApi } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import khungvip from '../assets/khungvip.webp';
import khungvip2 from '../assets/khung-vip-2.png';

interface ProfilePageProps {
    virtualBalance: number;
    holdings: Record<string, number>;
    onLogout: () => void;
    onNavigate: (page: 'dashboard' | 'market' | 'trading' | 'news' | 'community' | 'profile') => void;
    vnpayResult?: 'success' | 'failed' | null;
    onClearVnpayResult?: () => void;
    user: any;
    isPro?: boolean;
    onUpgradeSuccess?: (months: number) => void;
    tradeHistory?: any[];
}

/* ── Payment result popup ── */
/* ── Holdings Modal ── */
function HoldingsModal({ holdings, onClose, onNavigate, theme }: {
    holdings: Record<string, number>;
    onClose: () => void;
    onNavigate: (page: any, coinId: string) => void;
    theme: string;
}) {
    const heldCoins = useMemo(() => {
        return Object.entries(holdings)
            .filter(([_, amount]) => Number(amount) > 0)
            .map(([coinId, amount]) => {
                const meta = COINS.find(c => c.id === coinId) || {
                    id: coinId,
                    name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
                    symbol: coinId.toUpperCase().substring(0, 4),
                    logo: undefined
                };
                return { ...meta, amount };
            });
    }, [holdings]);

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                padding: '20px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{
                    background: theme === 'dark' ? '#1c212b' : '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: 24,
                    padding: '32px',
                    maxWidth: 480,
                    width: '100%',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    color: 'var(--foreground)',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800 }}>Danh sách Coin đã mua</h3>
                    <button onClick={onClose} style={{
                        background: 'var(--secondary)',
                        border: 'none', borderRadius: '50%', width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--foreground)', opacity: 0.6,
                    }}><X size={16} /></button>
                </div>

                <div style={{
                    overflowY: 'auto',
                    paddingRight: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                }} className="custom-scrollbar">
                    {heldCoins.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
                            Bạn chưa sở hữu đồng coin nào.
                        </div>
                    ) : (
                        heldCoins.map((coin) => (
                            <div
                                key={coin.id}
                                onClick={() => {
                                    onNavigate('trading', coin.id);
                                    onClose();
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px',
                                    borderRadius: 16,
                                    background: 'var(--secondary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    border: '1px solid transparent'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.borderColor = '#559DD244';
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = 'transparent';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '50%',
                                        background: 'var(--card)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden'
                                    }}>
                                        {coin.logo ? (
                                            <img src={coin.logo} alt={coin.symbol} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ fontWeight: 700, fontSize: 14 }}>{coin.symbol[0]}</div>
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 15 }}>{coin.name}</div>
                                        <div style={{ fontSize: 12, opacity: 0.5 }}>{coin.symbol}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 800, fontSize: 16, color: '#559DD2' }}>
                                        {Number(coin.amount).toLocaleString(undefined, { maximumFractionDigits: 8 })}
                                    </div>
                                    <div style={{ fontSize: 11, opacity: 0.5 }}>Khối lượng</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 24,
                        width: '100%', padding: '14px 0', borderRadius: 14,
                        background: 'var(--secondary)', color: 'var(--foreground)',
                        fontWeight: 600, fontSize: 14, border: '1px solid var(--border)',
                        cursor: 'pointer'
                    }}
                >
                    Đóng
                </button>
            </motion.div>
        </div>
    );
}

function PaymentPopup({ type, onClose, onNavigate, theme }: {
    type: 'success' | 'failed';
    onClose: () => void;
    onNavigate: (page: 'dashboard' | 'market' | 'trading' | 'news' | 'community' | 'profile') => void;
    theme: string;
}) {
    const isSuccess = type === 'success';

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <style>{`
                @keyframes ppFadeIn { from { opacity:0 } to { opacity:1 } }
                @keyframes ppSlideUp { from { opacity:0; transform:translateY(30px) scale(.95) } to { opacity:1; transform:translateY(0) scale(1) } }
                @keyframes ppPulse { 0%,100% { transform:scale(1) } 50% { transform:scale(1.08) } }
            `}</style>
            <div style={{
                background: theme === 'dark' ? '#1c212b' : '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: 24, padding: '40px 32px', textAlign: 'center',
                maxWidth: 400, width: '90%', position: 'relative',
                animation: 'ppSlideUp .4s cubic-bezier(.16,1,.3,1)',
                boxShadow: isSuccess
                    ? '0 20px 60px rgba(158,236,55,0.2), 0 20px 60px rgba(0,0,0,0.4)'
                    : '0 20px 60px rgba(239,68,68,0.2), 0 20px 60px rgba(0,0,0,0.4)',
                color: 'var(--foreground)'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: 16, right: 16, background: 'var(--secondary)',
                    border: 'none', borderRadius: '50%', width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: 'var(--foreground)', opacity: 0.6,
                }}><X size={16} /></button>

                <div style={{
                    width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSuccess ? 'rgba(158,236,55,0.12)' : 'rgba(239,68,68,0.12)',
                    animation: 'ppPulse 1.5s ease infinite',
                }}>
                    {isSuccess
                        ? <CheckCircle2 size={44} color="#559DD2" strokeWidth={2} />
                        : <XCircle size={44} color="#ef4444" strokeWidth={2} />}
                </div>

                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--foreground)' }}>
                    {isSuccess ? 'Nâng cấp thành công!' : 'Giao dịch thất bại'}
                </h3>
                <p style={{ fontSize: 14, opacity: 0.6, lineHeight: 1.6, marginBottom: 28, color: 'var(--foreground)' }}>
                    {isSuccess
                        ? 'Bạn đã nâng cấp tài khoản thành công! Tận hưởng toàn bộ tính năng PRO ngay bây giờ.'
                        : 'Giao dịch không thành công. Vui lòng thử lại hoặc liên hệ hỗ trợ nếu cần giúp đỡ.'}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {isSuccess ? (
                        <button
                            onClick={() => { onClose(); onNavigate('dashboard'); }}
                            style={{
                                width: '100%', padding: '14px 0', borderRadius: 14,
                                background: 'linear-gradient(135deg, #559DD2, #7BC62D)',
                                color: '#000', fontWeight: 700, fontSize: 15,
                                border: 'none', cursor: 'pointer',
                                transition: 'transform .15s, box-shadow .15s',
                                boxShadow: '0 4px 20px rgba(158,236,55,0.3)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            Về trang chủ
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => { onClose(); onNavigate('profile'); }}
                                style={{
                                    width: '100%', padding: '14px 0', borderRadius: 14,
                                    background: 'linear-gradient(135deg, #559DD2, #7BC62D)',
                                    color: '#000', fontWeight: 700, fontSize: 15,
                                    border: 'none', cursor: 'pointer',
                                    transition: 'transform .15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                Thử lại
                            </button>
                            <button
                                onClick={() => { onClose(); onNavigate('dashboard'); }}
                                style={{
                                    width: '100%', padding: '12px 0', borderRadius: 14,
                                    background: 'var(--secondary)', color: 'var(--foreground)',
                                    fontWeight: 600, fontSize: 14, border: '1px solid var(--border)',
                                    cursor: 'pointer', transition: 'background .15s',
                                }}
                            >
                                Quay lại trang chủ
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Confirmation Modal ── */
function ConfirmationModal({ pkg, onClose, onConfirm, theme }: {
    pkg: any;
    onClose: () => void;
    onConfirm: () => void;
    theme: string;
}) {
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                padding: '20px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{
                    background: theme === 'dark' ? '#1c212b' : '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: 24,
                    padding: '32px',
                    maxWidth: 420,
                    width: '100%',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    textAlign: 'center',
                    color: 'var(--foreground)'
                }}
            >
                <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'rgba(158,236,55,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px', color: '#559DD2'
                }}>
                    <AlertTriangle size={32} />
                </div>

                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Xác nhận mua gói</h3>
                <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 24, lineHeight: 1.6 }}>
                    Bạn đang thực hiện mua gói <strong>PRO {pkg.months} Tháng</strong> với mức giá <strong>{pkg.label}</strong>.
                    Bạn sẽ được chuyển đến trang thanh toán VNPay.
                </p>

                <div style={{
                    background: 'var(--secondary)',
                    borderRadius: 16,
                    padding: '16px',
                    marginBottom: 24,
                    textAlign: 'left'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ opacity: 0.6, fontSize: 13 }}>Sản phẩm:</span>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>PRO {pkg.months} Tháng</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ opacity: 0.6, fontSize: 13 }}>Tổng tiền:</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#559DD2' }}>{pkg.label}</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1, padding: '14px 0', borderRadius: 14,
                            background: 'var(--secondary)', color: 'var(--foreground)',
                            fontWeight: 600, fontSize: 14, border: '1px solid var(--border)',
                            cursor: 'pointer'
                        }}
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            flex: 1, padding: '14px 0', borderRadius: 14,
                            background: 'linear-gradient(135deg, #559DD2, #7BC62D)',
                            color: '#000', fontWeight: 700, fontSize: 14,
                            border: 'none', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(158,236,55,0.2)'
                        }}
                    >
                        Xác nhận mua
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

/* ── VietQR Modal ── */
function VietQRModal({ amount, memo, qrUrl, months, onClose, onUpgradeSuccess, user, theme }: {
    amount: number;
    memo: string;
    qrUrl: string;
    months: number;
    onClose: () => void;
    onUpgradeSuccess?: (months: number) => void;
    user: any;
    theme: string;
}) {
    const [copied, setCopied] = useState(false);
    const [status, setStatus] = useState<'polling' | 'success' | 'failed'>('polling');

    const handleCopy = () => {
        navigator.clipboard.writeText(memo);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        let intervalId: any;
        if (status === 'polling') {
            intervalId = setInterval(async () => {
                try {
                    const result = await authApi.checkPaymentStatus(memo);
                    if (result.success) {
                        setStatus('success');
                        clearInterval(intervalId);
                        // Backend đã tự động upgrade qua Webhook, frontend chỉ cần update UI
                        onUpgradeSuccess?.(months);
                        onClose();
                    }
                } catch (error) {
                    console.error("Checking payment error:", error);
                }
            }, 4000);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [memo, status, onUpgradeSuccess, onClose]);

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                padding: '20px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{
                    background: theme === 'dark' ? '#1c212b' : '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: 24,
                    padding: '32px',
                    maxWidth: 440,
                    width: '100%',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    color: 'var(--foreground)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800 }}>Thanh toán qua VietQR</h3>
                    <button onClick={onClose} style={{
                        background: 'var(--secondary)',
                        border: 'none', borderRadius: '50%', width: 32, height: 32,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--foreground)', opacity: 0.6,
                    }}><X size={16} /></button>
                </div>

                {/* QR Code Container */}
                <div style={{
                    position: 'relative',
                    width: 220,
                    height: 220,
                    borderRadius: 16,
                    background: '#ffffff',
                    padding: 12,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                    border: '1px solid var(--border)'
                }}>
                    <img src={qrUrl} alt="VietQR" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>

                {/* Polling Spinner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 13, opacity: 0.7 }}>
                    <div style={{
                        width: 14, height: 14, border: '2px solid var(--foreground)',
                        borderTopColor: 'transparent', borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} className="animate-spin" />
                    <span>Đang chờ thanh toán tự động...</span>
                </div>

                {/* Bank Details */}
                <div style={{
                    background: 'var(--secondary)',
                    borderRadius: 16,
                    padding: '16px 20px',
                    width: '100%',
                    marginBottom: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                        <span style={{ opacity: 0.6, fontSize: 13 }}>Ngân hàng:</span>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>MSB (Ngân hàng Hàng Hải)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                        <span style={{ opacity: 0.6, fontSize: 13 }}>Số tài khoản:</span>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>96886693013297</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                        <span style={{ opacity: 0.6, fontSize: 13 }}>Số tiền:</span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: '#559DD2' }}>{amount.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ opacity: 0.6, fontSize: 13 }}>Nội dung CK:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 850, fontSize: 14, color: '#559DD2', letterSpacing: 0.5 }}>{memo}</span>
                            <button
                                onClick={handleCopy}
                                style={{
                                    background: copied ? '#559DD222' : 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 6,
                                    padding: '4px 8px',
                                    fontSize: 11,
                                    color: copied ? '#559DD2' : 'var(--foreground)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4
                                }}
                            >
                                {copied ? 'Đã copy' : <><Copy size={12} /> Copy</>}
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ width: '100%' }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%', padding: '14px 0', borderRadius: 14,
                            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                            fontWeight: 600, fontSize: 14, border: '1px solid rgba(239, 68, 68, 0.2)',
                            cursor: 'pointer'
                        }}
                    >
                        Hủy thanh toán
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

export function ProfilePage({ virtualBalance, holdings, onLogout, onNavigate, vnpayResult, onClearVnpayResult, user, isPro, onUpgradeSuccess, tradeHistory }: ProfilePageProps) {
    const { theme, toggleTheme } = useTheme();
    const [selectedPkg, setSelectedPkg] = useState<number | null>(null);
    const [confirmPkg, setConfirmPkg] = useState<any | null>(null);
    const [showHoldingsModal, setShowHoldingsModal] = useState(false);
    const [vietQRInfo, setVietQRInfo] = useState<{ amount: number; memo: string; qrUrl: string; months: number } | null>(null);
    const [showPauseConfirm, setShowPauseConfirm] = useState(false);
    const [pauseLoading, setPauseLoading] = useState(false);
    const [resumeLoading, setResumeLoading] = useState(false);
    const [pauseError, setPauseError] = useState<string | null>(null);
    const [localUser, setLocalUser] = useState<any>(user);

    // Sync localUser when user prop changes
    useEffect(() => { setLocalUser(user); }, [user]);

    const handlePausePro = async () => {
        if (!localUser?.email) return;
        setPauseLoading(true);
        setPauseError(null);
        try {
            const updated = await authApi.pausePro(localUser.email);
            setLocalUser(updated);
            setShowPauseConfirm(false);
        } catch (err: any) {
            setPauseError(err.message || 'Không thể tạm dừng gói VIP.');
        } finally {
            setPauseLoading(false);
        }
    };

    const handleResumePro = async () => {
        if (!localUser?.email) return;
        setResumeLoading(true);
        setPauseError(null);
        try {
            const updated = await authApi.resumePro(localUser.email);
            setLocalUser(updated);
        } catch (err: any) {
            setPauseError(err.message || 'Không thể tiếp tục gói VIP.');
        } finally {
            setResumeLoading(false);
        }
    };


    const handleConfirmPurchase = async () => {
        if (!confirmPkg) return;
        
        const memo = `PRO${Math.floor(100000 + Math.random() * 900000)}`;
        const amount = confirmPkg.price;
        
        // Gọi API lưu Payment Intent lên server để Webhook xử lý sau
        if (user?.email) {
            try {
                await authApi.createPaymentIntent({
                    email: user.email,
                    months: confirmPkg.months,
                    amount: amount,
                    memo: memo
                });
            } catch (err) {
                console.error("Failed to create payment intent", err);
                return;
            }
        }

        // Tạo mã QR bằng SePay thay vì VietQR tĩnh
        const qrUrl = `https://qr.sepay.vn/img?acc=96886693013297&bank=MSB&amount=${amount}&des=${memo}`;
        setVietQRInfo({ amount, memo, qrUrl, months: confirmPkg.months });
    };

    const numHoldings = useMemo(() => Object.values(holdings).filter(a => Number(a) > 0).length, [holdings]);

    const displayUser = {
        name: localUser?.displayName || localUser?.username || 'SimuCryto User',
        email: localUser?.email || 'user@simucrypto.vn',
        joined: localUser?.createdAt ? new Date(localUser.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }) : 'Tháng 3, 2026',
        avatarUrl: localUser?.avatarUrl,
        initial: (localUser?.displayName || localUser?.username || 'U').charAt(0).toUpperCase()
    };

    // VIP pause state derived from localUser
    const isPaused = !!localUser?.proPausedAt;
    const pauseUsed = !!localUser?.proPauseUsed;
    const frozenDays = localUser?.proPausedDaysRemaining ?? 0;
    const isActiveVip = (localUser?.role >= 1) && !!localUser?.proExpiryDate;

    let vipDaysRemaining = null;
    if (isActiveVip) {
        const diffTime = new Date(localUser.proExpiryDate).getTime() - new Date().getTime();
        if (diffTime > 0) {
            vipDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
    }

    // Use actual trade history
    const recentActivity = tradeHistory ? tradeHistory.slice(0, 4).map(t => ({
        type: t.type === 'Mua' ? 'buy' : 'sell',
        coin: t.coinId.charAt(0).toUpperCase() + t.coinId.slice(1),
        symbol: t.symbol || t.coinId.substring(0, 3).toUpperCase(),
        amount: t.amount,
        price: t.price,
        time: t.time
    })) : [];

    // Pause confirm modal rendered via portal
    const PauseConfirmModal = () => (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                padding: '20px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowPauseConfirm(false); }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{
                    background: theme === 'dark' ? '#1c212b' : '#ffffff',
                    border: '1px solid var(--border)',
                    borderRadius: 24, padding: '32px', maxWidth: 420, width: '100%',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                    textAlign: 'center', color: 'var(--foreground)'
                }}
            >
                <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'rgba(251,191,36,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px', color: '#f59e0b'
                }}>
                    <Pause size={32} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Tạm dừng gói VIP?</h3>
                <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 8, lineHeight: 1.6 }}>
                    Thời gian VIP còn lại ({vipDaysRemaining} ngày) sẽ được <strong>đóng băng</strong>.
                    Quyền PRO bị thu hồi ngay lập tức.
                </p>
                <p style={{ fontSize: 13, color: '#f59e0b', marginBottom: 24, padding: '8px 12px', background: 'rgba(251,191,36,0.08)', borderRadius: 8, border: '1px solid rgba(251,191,36,0.2)' }}>
                    ⚠️ Mỗi gói VIP chỉ được tạm dừng <strong>1 lần</strong>. Không thể hoàn tác sau khi dùng.
                </p>
                {pauseError && (
                    <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 16, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
                        {pauseError}
                    </p>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={() => setShowPauseConfirm(false)}
                        disabled={pauseLoading}
                        style={{
                            flex: 1, padding: '14px 0', borderRadius: 14,
                            background: 'var(--secondary)', color: 'var(--foreground)',
                            fontWeight: 600, fontSize: 14, border: '1px solid var(--border)',
                            cursor: 'pointer', opacity: pauseLoading ? 0.5 : 1
                        }}
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handlePausePro}
                        disabled={pauseLoading}
                        style={{
                            flex: 1, padding: '14px 0', borderRadius: 14,
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            color: '#000', fontWeight: 700, fontSize: 14,
                            border: 'none', cursor: pauseLoading ? 'not-allowed' : 'pointer',
                            opacity: pauseLoading ? 0.7 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}
                    >
                        {pauseLoading ? 'Đang xử lý...' : <><Pause size={16} /> Xác nhận tạm dừng</>}
                    </button>
                </div>
            </motion.div>
        </div>
    );


    const packages = [
        {
            months: 0, price: 0, label: 'Miễn phí', perMonth: 'Luôn miễn phí',
            icon: <Shield size={28} />, color: '#94a3b8', gradient: 'linear-gradient(135deg, #94a3b822, #64748b22)',
            borderColor: '#94a3b844', glowColor: 'rgba(148,163,184,0.15)',
            features: [
                'AI Chatbox hỏi đáp crypto',
                'Theo dõi giá coin realtime',
                'Demo Trading cơ bản',
                'Portfolio tracking',
                'Tin tức crypto',
                'Lưu lịch sử giao dịch',
                'Watchlist coin yêu thích'
            ],
            isFree: true
        },
        {
            months: 1, price: 50000, label: '50.000đ', perMonth: '50.000đ/tháng',
            icon: <Zap size={28} />, color: '#60a5fa', gradient: 'linear-gradient(135deg, #60a5fa22, #3b82f622)',
            borderColor: '#60a5fa44', glowColor: 'rgba(96,165,250,0.15)',
            features: [
                'AI phân tích biểu đồ chuyên sâu',
                'AI mentor hướng dẫn trading 1-1',
                'Phân tích hành vi sau Demo Trading',
                'Gợi ý chiến lược & quản lý vốn',
                'Tín hiệu và xu hướng thị trường realtime',
                'Báo cáo AI hằng ngày / tuần',
                'Không giới hạn AI phân tích',
                'Hỗ trợ ưu tiên 24/7'
            ],
        },
        {
            months: 3, price: 139000, label: '139.000đ', perMonth: '~46.333đ/tháng', popular: true,
            savings: 'Tiết kiệm 11.000đ',
            icon: <Crown size={28} />, color: '#559DD2', gradient: 'linear-gradient(135deg, #559DD222, #7BC62D22)',
            borderColor: '#559DD2', glowColor: 'rgba(158,236,55,0.2)',
            features: [
                'AI phân tích biểu đồ chuyên sâu',
                'AI mentor hướng dẫn trading 1-1',
                'Phân tích hành vi sau Demo Trading',
                'Gợi ý chiến lược & quản lý vốn',
                'Tín hiệu và xu hướng thị trường realtime',
                'Báo cáo AI hằng ngày / tuần',
                'Không giới hạn AI phân tích',
                'Hỗ trợ ưu tiên 24/7'
            ],
        },
        {
            months: 6, price: 269000, label: '269.000đ', perMonth: '~44.833đ/tháng',
            savings: 'Tiết kiệm 31.000đ',
            icon: <Sparkles size={28} />, color: '#c084fc', gradient: 'linear-gradient(135deg, #c084fc22, #a855f722)',
            borderColor: '#c084fc44', glowColor: 'rgba(192,132,252,0.15)',
            features: [
                'AI phân tích biểu đồ chuyên sâu',
                'AI mentor hướng dẫn trading 1-1',
                'Phân tích hành vi sau Demo Trading',
                'Gợi ý chiến lược & quản lý vốn',
                'Tín hiệu và xu hướng thị trường realtime',
                'Báo cáo AI hằng ngày / tuần',
                'Không giới hạn AI phân tích',
                'Hỗ trợ ưu tiên 24/7'
            ],
        },
    ];

    return (
        <div className="mx-auto max-w-[960px] px-4 sm:px-6 py-8 sm:py-10 pb-20 text-[var(--foreground)]">
            <style>{`
                @media (min-width: 640px) {
                    .sm\\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
                    .sm\\:py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
                    .sm\\:flex-row { flex-direction: row; }
                    .sm\\:text-left { text-align: left; }
                    .sm\\:ml-auto { margin-left: auto; }
                    .sm\\:col-span-2 { grid-column: span 2 / span 2; }
                    .sm\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    .sm\\:text-base { font-size: 1rem; line-height: 1.5rem; }
                    .sm\\:text-sm { font-size: 0.875rem; line-height: 1.25rem; }
                    .sm\\:p-4 { padding: 1rem; }
                }
                @media (min-width: 768px) {
                    .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                    .md\\:col-span-1 { grid-column: span 1 / span 1; }
                }
                @keyframes proCardFloat {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                .pro-card:hover {
                    transform: translateY(-6px) !important;
                    box-shadow: var(--pro-glow) !important;
                }
                .pro-card-popular {
                    animation: proCardFloat 3s ease-in-out infinite;
                }
                .pro-btn:hover {
                    transform: scale(1.03);
                    filter: brightness(1.1);
                }
            `}</style>

            {/* Payment result popup */}
            {createPortal(
                <AnimatePresence>
                    {vnpayResult && (
                        <PaymentPopup
                            type={vnpayResult}
                            onClose={() => onClearVnpayResult?.()}
                            onNavigate={onNavigate}
                            theme={theme}
                        />
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Confirmation Modal */}
            {createPortal(
                <AnimatePresence>
                    {confirmPkg && (
                        <ConfirmationModal
                            pkg={confirmPkg}
                            onClose={() => setConfirmPkg(null)}
                            onConfirm={() => {
                                handleConfirmPurchase();
                                setConfirmPkg(null);
                            }}
                            theme={theme}
                        />
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* VietQR Modal */}
            {createPortal(
                <AnimatePresence>
                    {vietQRInfo && (
                        <VietQRModal
                            amount={vietQRInfo.amount}
                            memo={vietQRInfo.memo}
                            qrUrl={vietQRInfo.qrUrl}
                            months={vietQRInfo.months}
                            onClose={() => setVietQRInfo(null)}
                            onUpgradeSuccess={onUpgradeSuccess}
                            user={user}
                            theme={theme}
                        />
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Holdings Modal */}
            {createPortal(
                <AnimatePresence>
                    {showHoldingsModal && (
                        <HoldingsModal
                            holdings={holdings}
                            onClose={() => setShowHoldingsModal(false)}
                            onNavigate={onNavigate}
                            theme={theme}
                        />
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Profile Header */}
            <div className="flex flex-col items-center gap-6 p-10 pt-24 mt-12 mb-8 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-lg transition-all duration-300 relative overflow-visible">
                <div style={{ position: 'relative' }}>
                    <div className={`w-28 h-28 rounded-full ${displayUser.avatarUrl ? 'bg-[var(--card)] border-2 border-[var(--border)]' : 'bg-[#559DD2]'} text-black flex items-center justify-center text-4xl font-extrabold flex-shrink-0 shadow-lg`} style={{ overflow: 'hidden', position: 'relative', zIndex: 10, width: '112px', height: '112px' }}>
                        {displayUser.avatarUrl ? (
                            <img src={displayUser.avatarUrl} alt={displayUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            displayUser.initial
                        )}
                    </div>
                    {user?.role >= 1 && (
                        <img
                            src={user?.role === 10 ? khungvip2 : khungvip}
                            alt="VIP Frame"
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: `translate(-50%, -50%) scale(${user?.role === 10 ? '2.3' : '1.35'})`,
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none',
                                zIndex: 11
                            }}
                        />
                    )}
                </div>
                <div className="text-center min-w-[200px]" style={{ marginTop: '10px' }}>
                    <h1 className="text-2xl font-extrabold mb-1">{displayUser.name}</h1>
                    <p className="opacity-60 text-sm">{displayUser.email}</p>
                    <p className="opacity-50 text-xs mt-1">Tham gia từ {displayUser.joined}</p>
                    {vipDaysRemaining !== null && (
                        <p className="text-xs font-bold mt-2 py-1 px-3 inline-block rounded-full" style={{ backgroundColor: '#559DD222', color: '#559DD2', border: '1px solid #559DD244' }}>
                            VIP còn lại: {vipDaysRemaining} ngày
                        </p>
                    )}
                </div>
                <button style={{ marginBottom: '10px' }}
                    onClick={onLogout}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 cursor-pointer font-semibold text-sm transition-all hover:bg-red-500 hover:text-white"
                >
                    <LogOut size={16} />
                    Đăng xuất
                </button>
            </div>

            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition-shadow hover:shadow-md">
                    <div className="text-[13px] opacity-60 mb-1">Số dư khả dụng</div>
                    <div className="text-2xl font-bold">
                        ${virtualBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div
                    onClick={() => setShowHoldingsModal(true)}
                    className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition-all hover:shadow-md hover:-translate-y-1 cursor-pointer group"
                >
                    <div className="text-[13px] opacity-60 mb-1 group-hover:text-[#559DD2] transition-colors">Coin đang nắm giữ</div>
                    <div className="text-2xl font-bold flex items-center justify-between">
                        {numHoldings}
                        <ChevronRight size={20} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </div>
                </div>
                <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition-shadow hover:shadow-md sm:col-span-2 md:col-span-1">
                    <div className="text-[13px] opacity-60 mb-1">Tổng giá trị portfolio</div>
                    <div className="text-2xl font-bold">
                        ${virtualBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Settings */}
            <div className="p-6 mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <h2 className="text-lg font-bold mb-5">Cài đặt</h2>

                {/* Theme Toggle */}
                <div className="flex items-center justify-between py-4 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--secondary)]">
                            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                        </div>
                        <div>
                            <div className="font-semibold text-sm sm:text-base">Chế độ giao diện</div>
                            <div className="text-xs sm:text-sm opacity-60">
                                {theme === 'dark' ? 'Đang sử dụng giao diện tối' : 'Đang sử dụng giao diện sáng'}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className={`relative w-[52px] h-7 rounded-full border-none cursor-pointer transition-colors ${theme === 'dark' ? 'bg-[#559DD2]' : 'bg-[#cbced4]'}`}
                    >
                        <div
                            className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white transition-all shadow-sm ${theme === 'dark' ? 'left-[27px]' : 'left-[3px]'}`}
                        />
                    </button>
                </div>

                {/* Notifications */}
                <div className="flex items-center justify-between py-4 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--secondary)]">
                            <Bell size={20} />
                        </div>
                        <div>
                            <div className="font-semibold text-sm sm:text-base">Thông báo</div>
                            <div className="text-xs sm:text-sm opacity-60">Nhận thông báo về biến động thị trường</div>
                        </div>
                    </div>
                    <button className="relative w-[52px] h-7 rounded-full border-none bg-[#559DD2] cursor-pointer">
                        <div className="absolute top-[3px] left-[27px] w-[22px] h-[22px] rounded-full bg-white shadow-sm" />
                    </button>
                </div>

                {/* Security */}
                <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--secondary)]">
                            <Shield size={20} />
                        </div>
                        <div>
                            <div className="font-semibold text-sm sm:text-base">Bảo mật</div>
                            <div className="text-xs sm:text-sm opacity-60">Quản lý mật khẩu và xác thực</div>
                        </div>
                    </div>
                    <ChevronRight size={20} className="opacity-40" />
                </div>
            </div>

            {/* ═══════════  VIP MANAGEMENT SECTION  ═══════════ */}
            {/* Show when user is active VIP OR is paused */}
            {(isActiveVip || isPaused) && createPortal(
                <AnimatePresence>
                    {showPauseConfirm && <PauseConfirmModal />}
                </AnimatePresence>,
                document.body
            )}

            {(isActiveVip || isPaused) && (
                <div style={{
                    padding: '28px', marginBottom: 24, borderRadius: 20,
                    border: isPaused
                        ? '1px solid rgba(251,191,36,0.4)'
                        : '1px solid rgba(158,236,55,0.3)',
                    background: isPaused
                        ? 'linear-gradient(135deg, rgba(251,191,36,0.06) 0%, var(--card) 100%)'
                        : 'linear-gradient(135deg, rgba(158,236,55,0.06) 0%, var(--card) 100%)',
                    position: 'relative', overflow: 'hidden',
                }}>
                    {/* Decorative blob */}
                    <div style={{
                        position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%',
                        background: isPaused
                            ? 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(158,236,55,0.12) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: isPaused
                                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                                        : 'linear-gradient(135deg, #559DD2, #7BC62D)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {isPaused
                                        ? <Pause size={18} color="#000" />
                                        : <Crown size={18} color="#000" />}
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                                        Quản lý gói VIP
                                    </h2>
                                    <p style={{ fontSize: 12, margin: 0, opacity: 0.55 }}>
                                        {isPaused ? 'Gói VIP đang tạm dừng' : 'Gói VIP đang hoạt động'}
                                    </p>
                                </div>
                            </div>

                            {/* Status badge */}
                            <div style={{
                                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                background: isPaused ? 'rgba(251,191,36,0.15)' : 'rgba(158,236,55,0.15)',
                                color: isPaused ? '#f59e0b' : '#559DD2',
                                border: isPaused ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(158,236,55,0.3)',
                            }}>
                                {isPaused ? '⏸ Đang tạm dừng' : '✅ Đang hoạt động'}
                            </div>
                        </div>

                        {/* Info row */}
                        <div style={{
                            display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20
                        }}>
                            {isPaused ? (
                                <div style={{
                                    flex: 1, minWidth: 140, padding: '14px 16px', borderRadius: 14,
                                    background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                                }}>
                                    <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Thời gian đóng băng</div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{frozenDays} ngày</div>
                                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>sẽ được khôi phục khi tiếp tục</div>
                                </div>
                            ) : (
                                <div style={{
                                    flex: 1, minWidth: 140, padding: '14px 16px', borderRadius: 14,
                                    background: 'rgba(158,236,55,0.08)', border: '1px solid rgba(158,236,55,0.2)',
                                }}>
                                    <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Thời hạn còn lại</div>
                                    <div style={{ fontSize: 22, fontWeight: 800, color: '#559DD2' }}>{vipDaysRemaining ?? 0} ngày</div>
                                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                                        hết hạn {localUser?.proExpiryDate ? new Date(localUser.proExpiryDate).toLocaleDateString('vi-VN') : '—'}
                                    </div>
                                </div>
                            )}

                            <div style={{
                                flex: 1, minWidth: 140, padding: '14px 16px', borderRadius: 14,
                                background: 'var(--secondary)', border: '1px solid var(--border)',
                            }}>
                                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Quyền tạm dừng</div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: pauseUsed && !isPaused ? '#ef4444' : '#559DD2' }}>
                                    {isPaused ? 'Đang dùng' : pauseUsed ? 'Đã dùng' : 'Còn 1 lần'}
                                </div>
                                <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>
                                    {isPaused ? 'nhấn Tiếp tục để khôi phục' : pauseUsed ? 'mua gói mới để có lại' : 'có thể tạm dừng 1 lần'}
                                </div>
                            </div>
                        </div>

                        {/* Error message */}
                        {pauseError && (
                            <div style={{
                                padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                                color: '#ef4444', fontSize: 13
                            }}>
                                {pauseError}
                            </div>
                        )}

                        {/* Action button */}
                        {isPaused ? (
                            /* RESUME button */
                            <button
                                onClick={handleResumePro}
                                disabled={resumeLoading}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    width: '100%', padding: '14px 0', borderRadius: 14,
                                    background: 'linear-gradient(135deg, #559DD2, #7BC62D)',
                                    color: '#000', fontWeight: 700, fontSize: 15,
                                    border: 'none', cursor: resumeLoading ? 'not-allowed' : 'pointer',
                                    opacity: resumeLoading ? 0.7 : 1,
                                    boxShadow: '0 4px 20px rgba(158,236,55,0.25)',
                                    transition: 'transform .15s, opacity .15s',
                                }}
                                onMouseEnter={e => { if (!resumeLoading) e.currentTarget.style.transform = 'scale(1.02)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                {resumeLoading
                                    ? 'Đang xử lý...'
                                    : <><Play size={18} /> Tiếp tục gói VIP</>}
                            </button>
                        ) : pauseUsed ? (
                            /* Already used pause — disabled */
                            <button
                                disabled
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    width: '100%', padding: '14px 0', borderRadius: 14,
                                    background: 'var(--secondary)', color: 'var(--muted-foreground)',
                                    fontWeight: 600, fontSize: 14,
                                    border: '1px solid var(--border)', cursor: 'not-allowed', opacity: 0.6,
                                }}
                            >
                                <Pause size={16} /> Đã sử dụng quyền tạm dừng
                            </button>
                        ) : (
                            /* PAUSE button */
                            <button
                                onClick={() => { setPauseError(null); setShowPauseConfirm(true); }}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    width: '100%', padding: '14px 0', borderRadius: 14,
                                    background: 'rgba(251,191,36,0.1)',
                                    color: '#f59e0b', fontWeight: 700, fontSize: 15,
                                    border: '1px solid rgba(251,191,36,0.35)', cursor: 'pointer',
                                    transition: 'background .2s, transform .15s',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(251,191,36,0.18)';
                                    e.currentTarget.style.transform = 'scale(1.01)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(251,191,36,0.1)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                <Pause size={18} /> Tạm dừng gói VIP
                            </button>
                        )}
                    </div>
                </div>
            )}


            <div style={{
                padding: '32px 28px', marginBottom: 24, borderRadius: 20,
                border: '1px solid var(--border)',
                background: 'linear-gradient(135deg, var(--card) 0%, var(--secondary) 50%, var(--card) 100%)',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 4px 30px rgba(0,0,0,0.08)',
            }}>
                {/* Decorative blobs */}
                <div style={{
                    position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(158,236,55,0.10) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(192,132,252,0.08) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                {/* Header */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'linear-gradient(135deg, #559DD2, #7BC62D)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Star size={20} color="#000" fill="#000" />
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--foreground)' }}>
                            Nâng cấp tài khoản PRO
                        </h2>
                    </div>
                    <p style={{ fontSize: 14, opacity: 0.55, margin: '0 0 28px 0', color: 'var(--foreground)' }}>
                        Mở khóa toàn bộ tính năng phân tích chuyên sâu và tín hiệu AI không giới hạn.
                    </p>
                </div>

                {/* Pricing cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, position: 'relative', zIndex: 1 }}>
                    {packages.map((pkg) => (
                        <div
                            key={pkg.months}
                            className={`pro-card ${pkg.popular ? 'pro-card-popular' : ''}`}
                            style={{
                                '--pro-glow': `0 8px 40px ${pkg.glowColor}`,
                                position: 'relative', display: 'flex', flexDirection: 'column',
                                padding: pkg.popular ? '28px 22px 22px' : '24px 20px 20px',
                                borderRadius: 18,
                                border: pkg.popular ? `2px solid ${pkg.borderColor}` : `1px solid ${pkg.borderColor}`,
                                background: 'var(--card)',
                                cursor: 'pointer',
                                transition: 'transform .25s cubic-bezier(.16,1,.3,1), box-shadow .25s ease',
                                boxShadow: pkg.popular ? `0 4px 24px ${pkg.glowColor}` : '0 2px 12px rgba(0,0,0,0.04)',
                            } as React.CSSProperties}
                            onClick={() => setSelectedPkg(pkg.months)}
                        >
                            {/* Popular badge */}
                            {pkg.popular && (
                                <div style={{
                                    position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                                    background: 'linear-gradient(135deg, #559DD2, #7BC62D)',
                                    color: '#000', fontSize: 11, fontWeight: 700,
                                    padding: '5px 16px', borderRadius: 20,
                                    letterSpacing: 0.5, whiteSpace: 'nowrap',
                                    boxShadow: '0 2px 12px rgba(158,236,55,0.3)',
                                }}>
                                    ⭐ Phổ biến nhất
                                </div>
                            )}

                            {/* Icon + duration */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: pkg.gradient,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: pkg.color,
                                }}>
                                    {pkg.icon}
                                </div>
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--foreground)' }}>
                                        {pkg.months} Tháng
                                    </div>
                                    <div style={{ fontSize: 11, opacity: 0.5, color: 'var(--foreground)' }}>
                                        {pkg.perMonth}
                                    </div>
                                </div>
                            </div>

                            {/* Price */}
                            <div style={{
                                fontSize: 28, fontWeight: 800, marginBottom: 4,
                                color: pkg.popular ? '#559DD2' : 'var(--foreground)',
                                letterSpacing: -0.5,
                            }}>
                                {pkg.label}
                            </div>

                            {/* Savings badge */}
                            {pkg.savings && (
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    fontSize: 11, fontWeight: 600, color: '#559DD2',
                                    background: 'rgba(158,236,55,0.1)', padding: '3px 10px',
                                    borderRadius: 8, marginBottom: 14, width: 'fit-content',
                                }}>
                                    🎉 {pkg.savings}
                                </div>
                            )}
                            {!pkg.savings && <div style={{ height: 10 }} />}

                            {/* Features */}
                            <ul style={{
                                listStyle: 'none', padding: 0, margin: '0 0 18px 0',
                                display: 'flex', flexDirection: 'column', gap: 8, flex: 1,
                            }}>
                                {pkg.features.map((f, i) => (
                                    <li key={i} style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        fontSize: 13, opacity: 0.8, color: 'var(--foreground)',
                                    }}>
                                        <Check size={14} color={pkg.color} strokeWidth={2.5} />
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            {/* CTA Button */}
                            <button
                                className="pro-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!pkg.isFree) {
                                        setConfirmPkg(pkg);
                                    }
                                }}
                                style={{
                                    width: '100%', padding: '13px 0', borderRadius: 14,
                                    fontWeight: 700, fontSize: 14, cursor: pkg.isFree ? 'default' : 'pointer',
                                    transition: 'transform .15s, filter .15s',
                                    border: 'none',
                                    background: pkg.isFree 
                                        ? 'var(--secondary)'
                                        : (pkg.popular
                                            ? 'linear-gradient(135deg, #559DD2, #7BC62D)'
                                            : 'var(--secondary)'),
                                    color: (pkg.popular && !pkg.isFree) ? '#000' : 'var(--foreground)',
                                    boxShadow: (pkg.popular && !pkg.isFree) ? '0 4px 16px rgba(158,236,55,0.25)' : 'none',
                                    opacity: pkg.isFree ? 0.6 : 1
                                }}
                            >
                                {pkg.isFree ? 'Đang sử dụng' : 'Mua ngay'}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Back button */}
                <div style={{ marginTop: 20, textAlign: 'center', position: 'relative', zIndex: 1 }}>
                    <button
                        onClick={() => onNavigate('dashboard')}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'transparent', border: 'none',
                            color: 'var(--foreground)', opacity: 0.5, fontSize: 13,
                            fontWeight: 500, cursor: 'pointer',
                            transition: 'opacity .15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; }}
                    >
                        <ArrowLeft size={14} />
                        Quay lại trang chủ
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="p-6 mb-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold">Hoạt động gần đây</h2>
                    <button
                        onClick={() => onNavigate('trading')}
                        className="text-sm font-semibold bg-transparent border-none text-[#559DD2] cursor-pointer hover:underline"
                    >
                        Xem tất cả →
                    </button>
                </div>
                <div className="flex flex-col gap-3">
                    {recentActivity.length === 0 ? (
                        <div className="text-center py-6 opacity-50 text-sm">
                            Không có hoạt động
                        </div>
                    ) : (
                        recentActivity.map((a, i) => (
                            <div key={i} className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-[var(--secondary)] transition-colors hover:opacity-90">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${a.type === 'buy' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        <TrendingUp size={16} className={a.type === 'sell' ? 'rotate-180' : ''} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">{a.type === 'buy' ? 'Mua' : 'Bán'} {a.coin}</div>
                                        <div className="text-[10px] sm:text-xs opacity-50 flex items-center gap-1">
                                            <Clock size={12} /> {a.time}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-sm">{Number(a.amount).toLocaleString(undefined, { maximumFractionDigits: 6 })} {a.symbol}</div>
                                    <div className="text-[10px] sm:text-xs opacity-50">${(a.amount * a.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                {[
                    { label: 'Xem thị trường', page: 'market' as const, color: '#559DD2' },
                    { label: 'Giao dịch ngay', page: 'trading' as const, color: '#60a5fa' },
                    { label: 'Cộng đồng', page: 'community' as const, color: '#c084fc' },
                ].map((a) => (
                    <button
                        key={a.page}
                        onClick={() => onNavigate(a.page)}
                        className="flex items-center justify-center gap-2 p-5 rounded-2xl border border-opacity-20 font-semibold text-sm transition-all hover:-translate-y-0.5"
                        style={{
                            borderColor: `${a.color}33`,
                            backgroundColor: `${a.color}10`,
                            color: 'var(--foreground)'
                        }}
                    >
                        {a.label}
                        <ChevronRight size={18} />
                    </button>
                ))}
            </div>
        </div>
    );
}
