import React, { useState, useEffect } from 'react';
import { X, Brain, TrendingUp, TrendingDown, Minus, Loader2, Activity, ChevronDown, ChevronUp, Sparkles, MessageSquare, BarChart2, Info } from 'lucide-react';
import { aiApi } from '../lib/api';


interface AIAnalysisProps {
    isOpen: boolean;
    onClose: () => void;
    coinName: string;
    coinSymbol: string;
    pair: string;
    price: number;
    change24h: number;
}

interface AnalysisResult {
    recommendation: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    summary: string;
    technicalAnalysis: string;
    riskLevel: string;
    targets: {
        support: string;
        resistance: string;
    };
    signals: SignalItem[];
    newsArticles?: NewsArticle[];
    newsSentiment?: string;
    eventsSummary?: string;
    events?: EventItem[];
    bullishCount: number;
    bearishCount: number;
    totalSignals: number;
}

interface SignalItem {
    name: string;
    signal: 'bullish' | 'bearish' | 'neutral';
    detail: string;
}

interface NewsArticle {
    id: string;
    time: string;
    title: string;
    signal: 'bullish' | 'bearish' | 'neutral';
    explanation: string;
}

interface EventItem {
    id: string;
    time: string;
    title: string;
    info: string;
    explanation: string;
}

// ========== LOCAL TECHNICAL ANALYSIS ENGINE ==========

async function fetchKlines(pair: string): Promise<number[][]> {
    const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1h&limit=100`
    );
    const data = await res.json();
    return data.map((d: any) => [
        Number(d[1]), // open
        Number(d[2]), // high
        Number(d[3]), // low
        Number(d[4]), // close
        Number(d[5]), // volume
    ]);
}

function calcSMA(closes: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = 0; i < closes.length; i++) {
        if (i < period - 1) { sma.push(NaN); continue; }
        let sum = 0;
        for (let j = 0; j < period; j++) sum += closes[i - j];
        sma.push(sum / period);
    }
    return sma;
}

function calcEMA(closes: number[], period: number): number[] {
    const ema: number[] = [];
    const k = 2 / (period + 1);
    for (let i = 0; i < closes.length; i++) {
        if (i === 0) { ema.push(closes[0]); continue; }
        ema.push(closes[i] * k + ema[i - 1] * (1 - k));
    }
    return ema;
}

function calcRSI(closes: number[], period = 14): number {
    let gains = 0, losses = 0;
    const len = closes.length;
    if (len < period + 1) return 50;
    for (let i = len - period; i < len; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains += diff; else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
}

function calcMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = calcEMA(closes, 12);
    const ema26 = calcEMA(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = calcEMA(macdLine, 9);
    const last = macdLine.length - 1;
    return {
        macd: macdLine[last],
        signal: signalLine[last],
        histogram: macdLine[last] - signalLine[last],
    };
}

async function fetchNewsSentiment(symbol: string, coinName: string): Promise<{ score: number, signal: 'bullish' | 'bearish' | 'neutral', detail: string, articlesCount: number, articles: NewsArticle[], eventsSummary: string, events: EventItem[], sentimentDetail: string }> {
    try {
        const data = await aiApi.marketAnalysis(symbol, coinName);
        const parsedArticles: NewsArticle[] = (data.articles || []).map((a: any, i: number) => ({
            id: String(i),
            time: new Date().toISOString().slice(0, 16).replace('T', ' '),
            title: a.title || '',
            signal: a.signal || 'neutral',
            explanation: a.explanation || '',
        }));
        const parsedEvents: EventItem[] = (data.events || []).map((e: any) => ({
            id: e.id || String(Math.random()),
            time: e.time || '',
            title: e.title || '',
            info: e.info || '',
            explanation: e.explanation || '',
        }));
        return {
            score: data.score ?? 0,
            signal: data.signal ?? 'neutral',
            detail: data.detail ?? '',
            articlesCount: parsedArticles.length,
            articles: parsedArticles,
            eventsSummary: data.eventsSummary ?? '',
            events: parsedEvents,
            sentimentDetail: data.detail ?? '',
        };
    } catch (e) {
        console.error('fetchNewsSentiment error:', e);
        return { score: 0, signal: 'neutral', detail: 'Khong the phan tich tin tuc luc nay', articlesCount: 0, articles: [], eventsSummary: '', events: [], sentimentDetail: '' };
    }
}
function analyzeLocally(
    klines: number[][],
    price: number,
    change24h: number,
    coinName: string,
    newsData: { score: number, signal: 'bullish' | 'bearish' | 'neutral', detail: string, articlesCount: number, articles: NewsArticle[], eventsSummary: string, events: EventItem[], sentimentDetail: string }
): AnalysisResult {
    const closes = klines.map((k) => k[3]);
    const highs = klines.map((k) => k[1]);
    const lows = klines.map((k) => k[2]);
    const volumes = klines.map((k) => k[4]);
    const last = closes.length - 1;

    const ma7 = calcSMA(closes, 7);
    const ma25 = calcSMA(closes, 25);
    const ema9 = calcEMA(closes, 9);
    const ema21 = calcEMA(closes, 21);
    const rsi = calcRSI(closes);
    const macd = calcMACD(closes);

    const recentVol = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const prevVol = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
    const volTrend = recentVol > prevVol ? 'tăng' : 'giảm';

    const recent20Low = Math.min(...lows.slice(-20));
    const recent20High = Math.max(...highs.slice(-20));
    const support = recent20Low;
    const resistance = recent20High;

    const signals: SignalItem[] = [];
    let bullishCount = 0;
    let bearishCount = 0;
    let totalSignals = 0;

    if (ma7[last] > ma25[last]) {
        signals.push({ name: 'MA7/MA25', signal: 'bullish', detail: 'MA7 &gt; MA25 → Tích cực' });
        bullishCount++;
    } else {
        signals.push({ name: 'MA7/MA25', signal: 'bearish', detail: 'MA7 &lt; MA25 → Tiêu cực' });
        bearishCount++;
    }
    totalSignals++;

    if (ema9[last] > ema21[last]) {
        signals.push({ name: 'EMA9/EMA21', signal: 'bullish', detail: 'EMA9 &gt; EMA21 → Tích cực' });
        bullishCount++;
    } else {
        signals.push({ name: 'EMA9/EMA21', signal: 'bearish', detail: 'EMA9 &lt; EMA21 → Tiêu cực' });
        bearishCount++;
    }
    totalSignals++;

    if (price > ma25[last]) {
        signals.push({ name: 'Giá/MA25', signal: 'bullish', detail: `Trên MA25 → Khả quan` });
        bullishCount++;
    } else {
        signals.push({ name: 'Giá/MA25', signal: 'bearish', detail: `Dưới MA25 → Yếu` });
        bearishCount++;
    }
    totalSignals++;

    if (rsi < 30) {
        signals.push({ name: 'RSI (14)', signal: 'bullish', detail: `${rsi.toFixed(1)} (Quá bán)` });
        bullishCount++;
    } else if (rsi > 70) {
        signals.push({ name: 'RSI (14)', signal: 'bearish', detail: `${rsi.toFixed(1)} (Quá mua)` });
        bearishCount++;
    } else {
        signals.push({ name: 'RSI (14)', signal: 'neutral', detail: `${rsi.toFixed(1)} (Trung tính)` });
    }
    totalSignals++;

    if (macd.histogram > 0) {
        signals.push({ name: 'MACD', signal: 'bullish', detail: 'Histogram dương' });
        bullishCount++;
    } else {
        signals.push({ name: 'MACD', signal: 'bearish', detail: 'Histogram âm' });
        bearishCount++;
    }
    totalSignals++;

    if (recentVol > prevVol * 1.2) {
        signals.push({ name: 'Volume', signal: change24h >= 0 ? 'bullish' : 'bearish', detail: `Đột biến ${((recentVol / prevVol - 1) * 100).toFixed(0)}%` });
        if (change24h >= 0) bullishCount++; else bearishCount++;
    } else {
        signals.push({ name: 'Volume', signal: 'neutral', detail: `Bình thường` });
    }
    totalSignals++;

    if (newsData.articlesCount > 0) {
        signals.push({ name: 'Tin tức', signal: newsData.signal, detail: newsData.signal === 'bullish' ? 'Tích cực' : newsData.signal === 'bearish' ? 'Tiêu cực' : 'Trung lập' });
        if (newsData.signal === 'bullish') bullishCount += 1;
        if (newsData.signal === 'bearish') bearishCount += 1;
        totalSignals++;
    }

    let recommendation: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;

    if (bullishCount > bearishCount + 1) {
        recommendation = 'BUY';
        confidence = Math.min(95, 50 + (bullishCount / totalSignals) * 50);
    } else if (bearishCount > bullishCount + 1) {
        recommendation = 'SELL';
        confidence = Math.min(95, 50 + (bearishCount / totalSignals) * 50);
    } else {
        recommendation = 'HOLD';
        confidence = 40 + Math.abs(bullishCount - bearishCount) * 5;
    }

    const volatility = (recent20High - recent20Low) / price * 100;
    const riskLevel = volatility > 10 ? 'Cao' : volatility > 5 ? 'Trung bình' : 'Thấp';

    const directionHtml = recommendation === 'BUY' ? '<span style="color:#0ECB81; font-weight:bold">Tăng mạnh</span>' : recommendation === 'SELL' ? '<span style="color:#F6465D; font-weight:bold">Giảm rõ rệt</span>' : '<span style="color:#F0B90B; font-weight:bold">Đi ngang (Tích lũy)</span>';

    const summary = `Xin chào! Từ báo cáo kỹ thuật chuyên sâu và cập nhật tin tức mới nhất, ${coinName} hiện đang cho thấy tín hiệu ${directionHtml}.\n\nPhân tích chi tiết trên **${totalSignals}** yếu tố trọng điểm cho thấy:\n- Lực Mua: <span style="color:#0ECB81; font-weight:bold">${Math.floor(bullishCount)} tín hiệu Tăng</span>\n- Lực Bán: <span style="color:#F6465D; font-weight:bold">${Math.floor(bearishCount)} tín hiệu Giảm</span>\n\nTốc độ biến động hiện tính toán khoảng ${volatility.toFixed(1)}%, tương ứng mức rủi ro **${riskLevel}**. Giá hỗ trợ gần nhất đo được tại ngưỡng ${support.toLocaleString('en-US', { maximumFractionDigits: 4 })}$. Bạn hãy theo dõi sát sao các mốc cản này để tối ưu hóa vị thế nhé!`;

    const techAnalysis = `RSI(14) đang ở mức ${rsi.toFixed(1)}. Đường trung bình động MA7 ${ma7[last] > ma25[last] ? 'cắt lên' : 'cắt xuống'} MA25. Histogram MACD đang ${macd.histogram > 0 ? 'dương' : 'âm'}. Áp lực mua/bán từ đường EMA9 và quy mô Volume 5 phiên gần nhất đã góp phần khẳng định xu thế này.`;

    return {
        recommendation,
        confidence,
        summary,
        technicalAnalysis: techAnalysis,
        riskLevel,
        targets: {
            support: `$${support.toLocaleString('en-US', { maximumFractionDigits: 4 })}`,
            resistance: `$${resistance.toLocaleString('en-US', { maximumFractionDigits: 4 })}`,
        },
        signals,
        newsArticles: newsData.articles,
        newsSentiment: newsData.sentimentDetail,
        eventsSummary: newsData.eventsSummary,
        events: newsData.events,
        bullishCount,
        bearishCount,
        totalSignals
    };
}

// ========== COMPONENT ==========

export function AIAnalysisModal({
    isOpen,
    onClose,
    coinName,
    coinSymbol,
    pair,
    price,
    change24h,
}: AIAnalysisProps) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedNewsIds, setExpandedNewsIds] = useState<Set<string>>(new Set());

    // Tabs
    const [activeMainTab, setActiveMainTab] = useState<'overview' | 'tech' | 'news'>('overview');
    const [newsTab, setNewsTab] = useState<'historical' | 'upcoming'>('historical');

    useEffect(() => {
        if (isOpen) {
            setResult(null);
            setError(null);
            setExpandedNewsIds(new Set());
            setActiveMainTab('overview');
            setNewsTab('historical');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const analyze = async () => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const klines = await fetchKlines(pair);
            if (!klines || klines.length < 30) {
                throw new Error('Không đủ dữ liệu kline để phân tích.');
            }
            const newsData = await fetchNewsSentiment(coinSymbol, coinName);
            const analysis = analyzeLocally(klines, price, change24h, coinName, newsData);
            setResult(analysis);
        } catch (err: any) {
            setError(err.message || 'Lỗi dữ liệu. Không thể hoàn tất phân tích.');
        } finally {
            setLoading(false);
        }
    };

    const toggleExpandNews = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedNewsIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const recColor =
        result?.recommendation === 'BUY'
            ? '#0ECB81'
            : result?.recommendation === 'SELL'
                ? '#F6465D'
                : '#F0B90B';

    const bullPercentage = result ? Math.round((result.bullishCount / result.totalSignals) * 100) : 50;
    const bearPercentage = result ? Math.round((result.bearishCount / result.totalSignals) * 100) : 50;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 100,
                display: 'flex',
                justifyContent: 'flex-end',
                background: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(2px)',
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .mexc-ai-drawer {
                    animation: slideInRight 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                }
                .chat-bubble::before {
                    content: "";
                    position: absolute;
                    top: 14px;
                    left: -6px;
                    border-width: 6px 6px 6px 0;
                    border-style: solid;
                    border-color: transparent var(--secondary) transparent transparent;
                }
            `}</style>

            <div
                className="mexc-ai-drawer"
                style={{
                    width: '100%',
                    maxWidth: 420,
                    height: '100vh',
                    overflow: 'hidden',
                    background: 'var(--background)',
                    borderLeft: '1px solid var(--border)',
                    boxShadow: '-8px 0 24px rgba(0,0,0,0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* Header (MEXC Style) */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--card)',
                        flexShrink: 0
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, #2962FF, #1944BB)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(41, 98, 255, 0.3)'
                            }}
                        >
                            <Sparkles size={20} color="#FFF" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--foreground)' }}>Trợ lý AI Của Coin Sight</div>
                            <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                                Tương lai của giao dịch thông minh
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--muted-foreground)',
                        }}
                        className="hover:bg-[var(--secondary)] transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' }}>

                    {/* Coin Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--foreground)', lineHeight: 1 }}>{coinSymbol}</span>
                                <span style={{ fontSize: 14, fontWeight: 600, color: change24h >= 0 ? '#0ECB81' : '#F6465D', background: change24h >= 0 ? 'rgba(14,203,129,0.1)' : 'rgba(246,70,93,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                                    {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                                </span>
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--muted-foreground)' }}>
                                ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                            </div>
                        </div>

                        {!result && !loading && (
                            <button
                                onClick={analyze}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: 6,
                                    border: 'none',
                                    background: '#2962FF',
                                    color: '#FFF',
                                    fontWeight: 600,
                                    fontSize: 14,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                                className="hover:bg-[#1944BB] transition-colors"
                            >
                                <Brain size={16} />
                                Phân tích
                            </button>
                        )}
                        {result && (
                            <button
                                onClick={analyze}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 6,
                                    border: '1px solid var(--border)',
                                    background: 'var(--secondary)',
                                    color: 'var(--foreground)',
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                }}
                            >
                                Làm mới
                            </button>
                        )}
                    </div>

                    {result && (
                        <div className="flex bg-[var(--background)] p-1 rounded-full border border-[var(--border)] mb-6 mt-2">
                            <button
                                onClick={() => setActiveMainTab('overview')}
                                className={`flex-1 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 ${activeMainTab === 'overview' ? 'bg-[#559DD2] text-black shadow-none' : 'text-[var(--foreground)] hover:bg-[var(--secondary)]'}`}
                            >
                                Tổng quan AI
                            </button>
                            <button
                                onClick={() => setActiveMainTab('tech')}
                                className={`flex-1 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 ${activeMainTab === 'tech' ? 'bg-[#559DD2] text-black shadow-none' : 'text-[var(--foreground)] hover:bg-[var(--secondary)]'}`}
                            >
                                Kỹ thuật
                            </button>
                            <button
                                onClick={() => setActiveMainTab('news')}
                                className={`flex-1 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 ${activeMainTab === 'news' ? 'bg-[#559DD2] text-black shadow-none' : 'text-[var(--foreground)] hover:bg-[var(--secondary)]'}`}
                            >
                                Thông tin
                            </button>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
                            <div className="relative w-16 h-16 animate-pulse mb-4">
                                <div className="absolute inset-0 rounded-full border-4 border-[#2962FF] opacity-20" />
                                <div className="absolute inset-0 rounded-full border-4 border-t-[#2962FF] border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>
                                AI đang thu thập dữ liệu...
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>
                                Quét hệ thống khối lượng & phân tích tin tức
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div style={{ padding: 16, borderRadius: 8, background: 'rgba(246, 70, 93, 0.1)', border: '1px solid rgba(246, 70, 93, 0.2)', color: '#F6465D', fontSize: 14 }}>
                            {error}
                        </div>
                    )}

                    {/* Results Container */}
                    {result && !loading && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* OVERVIEW TAB */}
                            {activeMainTab === 'overview' && (
                                <div className="flex flex-col gap-6">

                                    {/* AI Trend Progress Bar (MEXC Long/Short Style) */}
                                    <div className="mb-6 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-base font-bold text-[var(--foreground)]">Dự báo Xu hướng (AI)</h3>
                                            <div className={`text-sm font-bold ${result.recommendation === 'BUY' ? 'text-[#0ECB81]' : result.recommendation === 'SELL' ? 'text-[#F6465D]' : 'text-[#F0B90B]'}`}>
                                                {result.recommendation} ({Math.round(Math.max((result.bullishCount / result.totalSignals) * 100, (result.bearishCount / result.totalSignals) * 100))}%)
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm mb-2 font-medium">
                                            <span className="text-[#0ECB81]">
                                                {Math.round((result.bullishCount / result.totalSignals) * 100)}% Tăng
                                            </span>

                                            <span className="text-[#F6465D]">
                                                {Math.round((result.bearishCount / result.totalSignals) * 100)}% Giảm
                                            </span>
                                        </div>
                                        <div className="flex w-full h-2.5 rounded-full overflow-hidden">
                                            <div style={{ width: `${bullPercentage}%`, background: '#0ECB81' }} className="h-full transition-all duration-1000" />
                                            <div style={{ width: `${100 - bullPercentage - bearPercentage}%`, background: '#F0B90B' }} className="h-full transition-all duration-1000" />
                                            <div style={{ width: `${bearPercentage}%`, background: '#F6465D' }} className="h-full transition-all duration-1000" />
                                        </div>
                                    </div>

                                    {/* AI Chat Bubble Summary */}
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded bg-gradient-to-br from-[#2962FF] to-[#1944BB] flex items-center justify-center shrink-0 mt-1 shadow-md">
                                            <Brain size={16} color="#FFF" />
                                        </div>
                                        <div
                                            className="chat-bubble relative flex-1 bg-[var(--secondary)] rounded-xl p-4 text-sm leading-relaxed text-[var(--foreground)]"
                                        >
                                            {/* Render parsed markdown intuitively (bolding) */}
                                            {result.summary.split('\n\n').map((paragraph, idx) => (
                                                <p key={idx} className={`${idx !== 0 ? 'mt-2' : ''}`} dangerouslySetInnerHTML={{
                                                    __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--foreground)">$1</strong>')
                                                }} />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Smart Target Cards */}
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        <div className="bg-[var(--card)] border border-[var(--border)] p-3 rounded-xl flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[rgba(14,203,129,0.1)] flex items-center justify-center text-[#0ECB81]">
                                                <TrendingUp size={20} />
                                            </div>
                                            <div>
                                                <div className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide">Điểm Kháng cự</div>
                                                <div className="text-[15px] font-extrabold text-[var(--foreground)]">{result.targets.resistance}</div>
                                            </div>
                                        </div>

                                        <div className="bg-[var(--card)] border border-[var(--border)] p-3 rounded-xl flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-[rgba(246,70,93,0.1)] flex items-center justify-center text-[#F6465D]">
                                                <TrendingDown size={20} />
                                            </div>
                                            <div>
                                                <div className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide">Điểm Hỗ trợ</div>
                                                <div className="text-[15px] font-extrabold text-[var(--foreground)]">{result.targets.support}</div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}

                            {/* TECHNICAL TAB */}
                            {activeMainTab === 'tech' && (
                                <div className="flex flex-col gap-4">
                                    <div className="bg-[#2962FF] bg-opacity-10 border border-[#2962FF] border-opacity-30 p-3 rounded-lg flex gap-3 text-sm text-[var(--foreground)] items-start">
                                        <Info className="text-[#2962FF] shrink-0 mt-0.5" size={16} />
                                        <span dangerouslySetInnerHTML={{ __html: result.technicalAnalysis }} />
                                    </div>

                                    <div className="text-sm border border-[var(--border)] rounded-xl overflow-hidden mt-2">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-[var(--secondary)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider">
                                                    <th className="p-3 font-semibold">Tín hiệu</th>
                                                    <th className="p-3 font-semibold text-right">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.signals.map((s, i) => (
                                                    <tr key={i} className="border-t border-[var(--border)]">
                                                        <td className="p-3 text-[13px] font-semibold text-[var(--foreground)]">
                                                            {s.name}
                                                            <div className="text-[11px] font-normal text-[var(--muted-foreground)] mt-0.5" dangerouslySetInnerHTML={{ __html: s.detail }} />
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <span
                                                                className="inline-block px-2 py-1 rounded text-xs font-bold"
                                                                style={{
                                                                    backgroundColor: s.signal === 'bullish' ? 'rgba(14,203,129,0.15)' :
                                                                        s.signal === 'bearish' ? 'rgba(246,70,93,0.15)' :
                                                                            'rgba(240,185,11,0.15)',
                                                                    color: s.signal === 'bullish' ? '#0ECB81' :
                                                                        s.signal === 'bearish' ? '#F6465D' :
                                                                            '#F0B90B'
                                                                }}
                                                            >
                                                                {s.signal === 'bullish' ? 'Tích cực' : s.signal === 'bearish' ? 'Tiêu cực' : 'Trung lập'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* MỤC HƯỚNG DẪN ĐỌC LINE BẰNG ACCORDION */}
                                    <details className="mt-2 bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden group">
                                        <summary className="p-3 font-semibold text-[13px] text-[var(--foreground)] cursor-pointer hover:bg-[var(--secondary)] transition-colors list-none flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span>💡</span> Hướng dẫn đọc các đường Line (Chỉ báo)
                                            </div>
                                            <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)] group-open:rotate-180 transition-transform" />
                                        </summary>
                                        <div className="p-4 text-[13px] text-[var(--muted-foreground)] leading-relaxed border-t border-[var(--border)] flex flex-col gap-3">
                                            <div><strong className="text-[var(--foreground)] block mb-0.5">MA (Moving Average):</strong> Đường Trung Bình Động. Là giá trị trung bình trong một khoảng thời gian. Khi giá vượt lên trên MA, xu hướng củng cố sức bật tăng và ngược lại.</div>
                                            <div><strong className="text-[var(--foreground)] block mb-0.5">EMA (Exponential MA):</strong> Giống MA nhưng phản ứng nhạy với giá mới hơn. Điểm giao cắt (Crossover) giữa EMA ngắn hạn và dài hạn dự báo xu hướng thay đổi.</div>
                                            <div><strong className="text-[var(--foreground)] block mb-0.5">RSI (Relative Strength Index):</strong> Đo sức mạnh Tăng/Giảm. Nếu &lt; 30 là vùng "Quá bán" (khả năng sẽ phục hồi), nếu &gt; 70 là "Quá mua" (dễ điều chỉnh giảm tiếp).</div>
                                            <div><strong className="text-[var(--foreground)] block mb-0.5">MACD (Moving Average Convergence Divergence):</strong> Các cột trụ màu xanh (dương) củng cố đà tăng mạnh mẽ, còn trụ đỏ (âm) cảnh báo thị trường đi xuống.</div>
                                        </div>
                                    </details>
                                </div>
                            )}

                            {/* NEWS TAB */}
                            {activeMainTab === 'news' && (
                                <div className="flex flex-col">
                                    <div className="flex bg-[var(--background)] p-1 rounded-full border border-[var(--border)] mb-6 mt-1">
                                        <button
                                            onClick={() => setNewsTab('historical')}
                                            className={`flex-1 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 ${newsTab === 'historical' ? 'bg-[#559DD2] text-black shadow-none' : 'text-[var(--foreground)] hover:bg-[var(--secondary)]'}`}
                                        >
                                            Tin Tức Ảnh Hưởng
                                        </button>
                                        <button
                                            onClick={() => setNewsTab('upcoming')}
                                            className={`flex-1 py-1.5 text-[11px] font-bold rounded-full transition-all duration-200 ${newsTab === 'upcoming' ? 'bg-[#559DD2] text-black shadow-none' : 'text-[var(--foreground)] hover:bg-[var(--secondary)]'}`}
                                        >
                                            Sự Kiện Báo Cáo
                                        </button>
                                    </div>

                                    {newsTab === 'historical' && (!result.newsArticles || result.newsArticles.length === 0) && (
                                        <div className="text-center py-6 text-sm text-[var(--muted-foreground)]">Không có bản tin đáng chú ý gần đây.</div>
                                    )}

                                    <div className="flex flex-col mt-2">
                                        {newsTab === 'historical' && result.newsArticles && (
                                            <>
                                                {result.newsSentiment && (
                                                    <div className="bg-[#2962FF] bg-opacity-10 border border-[#2962FF] border-opacity-30 p-3 rounded-lg flex gap-3 text-[13px] text-[var(--foreground)] items-start mb-4 relative overflow-hidden">
                                                        <Sparkles className="text-[#2962FF] shrink-0 mt-0.5" size={16} />
                                                        <div className="relative z-10 flex-1">
                                                            <span className="font-bold text-[#2962FF]">AI Đánh Giá Tổng Quan Tin Tức:</span> {result.newsSentiment}
                                                        </div>
                                                    </div>
                                                )}
                                                {result.newsArticles.map((item, index) => {
                                                    const isExpanded = expandedNewsIds.has(item.id);

                                                    let tagColor = '#8C8F99';
                                                    let tagLabel = 'Trung lập';
                                                    if (item.signal === 'bullish') { tagColor = '#0ECB81'; tagLabel = 'Tích cực'; }
                                                    if (item.signal === 'bearish') { tagColor = '#F6465D'; tagLabel = 'Tiêu cực'; }

                                                    return (
                                                        <div key={item.id} className="border border-[var(--border)] bg-[var(--background)] rounded-xl p-3 mb-3">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tagColor, boxShadow: `0 0 0 3px ${tagColor}33` }} />
                                                                    <span className="text-[var(--muted-foreground)] text-[12px] font-mono">{item.time}</span>
                                                                </div>
                                                                <span style={{ color: tagColor }} className="text-[10px] font-bold uppercase tracking-wider bg-[var(--secondary)] px-1.5 py-0.5 rounded">
                                                                    {tagLabel}
                                                                </span>
                                                            </div>

                                                            <div className="text-[13px] font-semibold text-[var(--foreground)] mb-1 leading-snug">
                                                                {item.title}
                                                            </div>

                                                            {item.explanation && (
                                                                <button
                                                                    onClick={(e) => toggleExpandNews(item.id, e)}
                                                                    className="flex items-center text-[12px] text-left mt-1 hover:text-[#2962FF] transition-colors w-full focus:outline-none text-[var(--muted-foreground)]"
                                                                >
                                                                    <MessageSquare className="w-3 h-3 mr-1" />
                                                                    <span>{isExpanded ? 'Thu gọn' : 'Xem phân tích'}</span>
                                                                </button>
                                                            )}
                                                            {isExpanded && (
                                                                <div className="text-[12px] text-[var(--muted-foreground)] mt-2 bg-[var(--secondary)] p-2 rounded">
                                                                    {item.explanation}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        )}

                                        {newsTab === 'upcoming' && (
                                            <>
                                                {result.eventsSummary && (
                                                    <div className="bg-[#2962FF] bg-opacity-10 border border-[#2962FF] border-opacity-30 p-3 rounded-lg flex gap-3 text-[13px] text-[var(--foreground)] items-start mb-4 relative overflow-hidden">
                                                        <Sparkles className="text-[#2962FF] shrink-0 mt-0.5" size={16} />
                                                        <div className="relative z-10 flex-1">
                                                            <span className="font-bold text-[#2962FF]">AI Đánh Giá Tổng Quan Sự Kiện:</span> {result.eventsSummary}
                                                        </div>
                                                    </div>
                                                )}
                                                {(!result?.events || result.events.length === 0) && (
                                                    <div className="text-center text-[var(--muted-foreground)] py-8 text-[13px]">
                                                        Không tìm thấy sự kiện đáng chú ý nào.
                                                    </div>
                                                )}
                                                {result?.events?.map((item, index) => {
                                                    const isExpanded = expandedNewsIds.has(item.id);

                                                    return (
                                                        <div key={item.id} className="border border-[var(--border)] bg-[var(--background)] rounded-xl p-3 mb-3">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-2 h-2 rounded-full shrink-0 bg-[#2962FF] shadow-[0_0_0_3px_rgba(41,98,255,0.2)]" />
                                                                <span className="text-[var(--muted-foreground)] text-[12px] font-mono">{item.time}</span>
                                                            </div>
                                                            <div className="text-[13px] font-semibold text-[var(--foreground)] mb-1 leading-snug">{item.title}</div>

                                                            {item.info && (
                                                                <div className="text-[12px] text-[var(--muted-foreground)] mb-1">
                                                                    {item.info}
                                                                </div>
                                                            )}

                                                            <button
                                                                onClick={(e) => toggleExpandNews(item.id, e)}
                                                                className="flex items-center text-[12px] text-left mt-1 hover:text-[#2962FF] transition-colors w-full focus:outline-none text-[var(--muted-foreground)]"
                                                            >
                                                                <MessageSquare className="w-3 h-3 mr-1" />
                                                                <span>{isExpanded ? 'Thu gọn' : 'Giải thích sự kiện'}</span>
                                                            </button>
                                                            {isExpanded && (
                                                                <div className="text-[12px] text-[var(--muted-foreground)] mt-2 bg-[var(--secondary)] p-2 rounded">
                                                                    {item.explanation}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
