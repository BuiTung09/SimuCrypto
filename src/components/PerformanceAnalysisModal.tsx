import React, { useState, useEffect } from 'react';
import { X, Brain, TrendingUp, TrendingDown, Target, Zap, Award, AlertCircle, Sparkles, MessageSquare, BarChart3, Loader2, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TradeRecord } from '../lib/types';
import { tradingApi } from '../lib/api';

interface PerformanceAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  tradeHistory: TradeRecord[];
  ledger: any[];
  holdings: Record<string, number>;
  totalBalance: number;
}

interface NotableTrade {
  label: string;
  side: string;
  pair: string;
  price: number;
  quantity: number;
  total: number;
  rsi: number | null;
  trend: string | null;
  macdHist: number | null;
  time: string;
  why: string;
  severity: 'critical' | 'warning' | 'good';
}

interface PerformanceResult {
  persona: {
    title: string;
    description: string;
    icon: string;
  };
  evaluation: string;
  advice: string[];
  growthAnalysis: string;
  highlights: {
    type: 'praise' | 'critique';
    text: string;
  }[];
  score: number;
  notableTrades: NotableTrade[];
}

export function PerformanceAnalysisModal({
  isOpen,
  onClose,
  tradeHistory,
  ledger,
  holdings,
  totalBalance
}: PerformanceAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PerformanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFullEvaluation, setShowFullEvaluation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      analyzePerformance();
    } else {
      setResult(null);
      setError(null);
      setShowFullEvaluation(false);
    }
  }, [isOpen]);

  const analyzePerformance = async () => {
    setLoading(true);
    setError(null);

    if (tradeHistory.length < 3) {
      setError("Bạn cần thực hiện ít nhất 3 giao dịch để AI có thể phân tích hành vi kỹ lưỡng hơn.");
      setLoading(false);
      return;
    }

    try {
      const currentUser = JSON.parse(sessionStorage.getItem('cs-user') || '{}');
      const userId = currentUser.id || currentUser.portfolioAccount?.userId;

      if (!userId) {
        setError("Chưa đăng nhập. Vui lòng đăng nhập để phân tích.");
        return;
      }

      // Call our new backend API instead of direct Gemini call
      const data = await tradingApi.analyzeBehavior(userId);

      if (data.error) {
        throw new Error(data.error);
      }

      const normalizedData = {
        ...data,
        persona: data.persona || { title: "Trader mới", description: "Đang khám phá thị trường", icon: "Sparkles" },
        growthAnalysis: data.summary || data.evaluation || "Đang phân tích dữ liệu...",
        highlights: data.patterns?.map((p: any) => ({
          type: p.impact === 'Tích cực' ? 'praise' : 'critique',
          text: p.name + ": " + p.description
        })) || [],
        notableTrades: data.notableTrades || []
      };

      await new Promise(resolve => setTimeout(resolve, 1500));

      setResult(normalizedData);
    } catch (err: any) {
      setError(err.message || "Hệ thống phân tích đang bận hoặc có lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const PersonaIcon = ({ type, size = 24 }: { type: string, size?: number }) => {
    switch (type) {
      case 'Zap': return <Zap size={size} color="#F0B90B" />;
      case 'Target': return <Target size={size} color="#2962FF" />;
      case 'Award': return <Award size={size} color="#559DD2" />;
      case 'AlertCircle': return <AlertCircle size={size} color="#EF4444" />;
      case 'TrendingDown': return <TrendingDown size={size} color="#0ECB81" />;
      case 'TrendingUp': return <TrendingUp size={size} color="#0ECB81" />;
      case 'Activity': return <BarChart3 size={size} color="#3B82F6" />;
      default: return <Sparkles size={size} color="#8B5CF6" />;
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return { bg: 'rgba(239, 68, 68, 0.05)', border: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', label: 'Nguy hiểm' };
      case 'warning': return { bg: 'rgba(245, 158, 11, 0.05)', border: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B', label: 'Cảnh báo' };
      case 'good': return { bg: 'rgba(14, 203, 129, 0.05)', border: 'rgba(14, 203, 129, 0.2)', color: '#0ECB81', label: 'Tốt' };
      default: return { bg: 'var(--secondary)', border: 'var(--border)', color: 'var(--foreground)', label: 'Thông tin' };
    }
  };

  const truncateText = (text: string, limit: number) => {
    if (text.length <= limit) return text;
    return text.substring(0, limit) + "...";
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ translateX: '100%' }}
        animate={{ translateX: 0 }}
        exit={{ translateX: '100%' }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
        style={{
          width: '100%',
          maxWidth: 480,
          height: '100vh',
          background: 'var(--background)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--card)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #559DD2, #2962FF)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Brain size={22} color="#000" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--foreground)' }}>AI Phân tích Hành Vi</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ padding: 8, background: 'transparent', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: "16px 20px" }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <Loader2 size={48} className="animate-spin" color="#559DD2" />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 700, fontSize: 16, margin: 0, color: 'var(--foreground)' }}>Đang tính toán P&L & Lịch sử...</p>
                <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>Mô hình toán học nội bộ đang xử lý</p>
              </div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <AlertCircle size={48} color="#EF4444" style={{ marginBottom: 16, marginInline: 'auto' }} />
              <p style={{ color: 'var(--foreground)', fontWeight: 600 }}>{error}</p>
            </div>
          ) : result ? (
            <div className="flex flex-col gap-5">
              {/* Score & Persona Card */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20,
                position: 'relative', overflow: 'hidden'
              }}>
                <div style={{ position: 'absolute', top: -5, right: -5, opacity: 0.05 }}>
                  <PersonaIcon type={result.persona.icon} size={100} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #559DD2', flexShrink: 0 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: '#559DD2' }}>{result.score}</span>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--foreground)' }}>{result.persona.title}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted-foreground)' }}>{result.persona.description}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 2, background: 'var(--secondary)', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${result.score}%`, background: '#559DD2', height: '100%' }} />
                </div>
              </div>

              {/* Detailed Evaluation */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(158, 236, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <MessageSquare size={16} color="#559DD2" />
                </div>
                <div style={{ background: 'var(--secondary)', padding: "14px 16px", borderRadius: '0 12px 12px 12px', flex: 1, border: '1px solid var(--border)' }}>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--foreground)', whiteSpace: 'pre-wrap' }}>
                    {showFullEvaluation ? result.evaluation : truncateText(result.evaluation, 180)}
                  </p>
                  {result.evaluation.length > 180 && (
                    <button
                      onClick={() => setShowFullEvaluation(!showFullEvaluation)}
                      style={{ background: 'transparent', border: 'none', color: '#559DD2', fontSize: 12, fontWeight: 700, padding: "8px 0 0", cursor: 'pointer', marginTop: 4 }}
                    >
                      {showFullEvaluation ? "Thu gọn" : "Xem toàn bộ phân tích"}
                    </button>
                  )}
                </div>
              </div>

              {/* Notable Trades Section (NEW) */}
              {result.notableTrades && result.notableTrades.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--foreground)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Target size={18} color="#3B82F6" />
                    Giao dịch nổi bật
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.notableTrades.map((trade, idx) => {
                      const style = getSeverityStyle(trade.severity);
                      return (
                        <div key={idx} style={{
                          background: style.bg, border: `1px solid ${style.border}`, borderRadius: 12, padding: 14
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: style.color, display: 'inline-block', marginBottom: 4 }}>
                                {trade.label}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600 }}>
                                <span style={{ color: trade.side === 'buy' ? '#0ECB81' : '#EF4444' }}>
                                  {trade.side === 'buy' ? 'MUA' : 'BÁN'} {trade.pair}
                                </span>
                              </div>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{trade.time}</span>
                          </div>

                          <div style={{ background: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 8, marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>Giá</span>
                              <span style={{ fontWeight: 600 }}>${trade.price.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>Tổng</span>
                              <span style={{ fontWeight: 600 }}>${trade.total.toLocaleString()}</span>
                            </div>
                            {trade.rsi && (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: 'var(--muted-foreground)', fontSize: 11 }}>RSI</span>
                                <span style={{ fontWeight: 600, color: trade.rsi > 70 ? '#EF4444' : trade.rsi < 30 ? '#0ECB81' : 'var(--foreground)' }}>
                                  {trade.rsi.toFixed(1)}
                                </span>
                              </div>
                            )}
                          </div>

                          <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>
                            {trade.why}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Highlights/Patterns */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Phát hiện thói quen</h4>
                {result.highlights.map((h, i) => (
                  <div key={i} style={{
                    padding: 14, borderRadius: 12,
                    background: h.type === 'praise' ? 'rgba(14,203,129,0.05)' : 'rgba(239, 68, 68, 0.05)',
                    border: `1px solid ${h.type === 'praise' ? 'rgba(14,203,129,0.1)' : 'rgba(239, 68, 68, 0.1)'}`,
                    display: 'flex', gap: 12, alignItems: 'flex-start'
                  }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}>
                      {h.type === 'praise' ? <Award size={18} color="#0ECB81" /> : <AlertCircle size={18} color="#EF4444" />}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--foreground)', lineHeight: 1.5 }}>{h.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Expert Advice Section */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#559DD2', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={18} />
                  Chiến lược cải thiện
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {result.advice.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(158, 236, 55, 0.15)', color: '#559DD2', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 0 }}>{i + 1}</div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--foreground)', lineHeight: 1.5 }}>{a}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--card)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0ECB81', boxShadow: '0 0 10px #0ECB81' }} />
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 600 }}>100% Data Privacy & Security</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
