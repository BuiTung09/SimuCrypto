import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Crown, ArrowLeft, TrendingUp, DollarSign } from 'lucide-react';
import { tradingApi } from '../lib/api';
import khungvip from '../assets/khungvip.webp';
import khungvip2 from '../assets/khung-vip-2.png';

interface LeaderboardUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: number;
  email: string;
  totalValue: number;
  profit: number;
  initials: string;
}

interface LeaderboardViewProps {
  onBack: () => void;
}

const VIPFrame = ({ role, email, size = 112 }: { role: number; email: string; size?: number }) => {
  const isSpecialVip = role === 10;
  const isVip = role >= 1;

  if (!isVip) return null;

  return (
    <img
      src={isSpecialVip ? khungvip2 : khungvip}
      alt="VIP Frame"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${isSpecialVip ? '2.3' : '1.35'})`,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 11,
      }}
    />
  );
};

export function LeaderboardView({ onBack }: LeaderboardViewProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await tradingApi.getLeaderboard();
        setLeaderboard(data);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#559DD2] border-t-transparent"></div>
      </div>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);

  // Helper for Top 3 styling
  const getTop3Style = (index: number) => {
    switch (index) {
      case 0: return { glow: 'shadow-[0_0_50px_rgba(234,179,8,0.3)]', border: 'border-yellow-500/50', icon: <Crown className="text-yellow-500" size={32} />, rank: '1' };
      case 1: return { glow: 'shadow-[0_0_50px_rgba(6,182,212,0.3)]', border: 'border-cyan-500/50', icon: <Medal className="text-cyan-500" size={28} />, rank: '2' };
      case 2: return { glow: 'shadow-[0_0_50px_rgba(239,68,68,0.3)]', border: 'border-red-500/50', icon: <Medal className="text-red-500" size={24} />, rank: '3' };
      default: return { glow: '', border: 'border-[var(--border)]', icon: null, rank: '' };
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Premium Sticky Header */}
      <div className="sticky top-0 z-[60] -mx-4 px-6 py-4 mb-10 backdrop-blur-2xl bg-[var(--background)]/60 border-b border-[var(--border)] flex items-center justify-between shadow-2xl shadow-black/20">
        <div className="flex items-center gap-4">
          <button style={{ paddingRight: '5px' }}
            onClick={onBack}
            className="flex items-center gap-4 px-12 py-3 rounded-2xl bg-[#2a2d36] hover:bg-[#353945] text-white border border-white/10 transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-lg shadow-black/40 whitespace-nowrap"
          >
            <ArrowLeft size={18} />
            <span className="font-bold text-sm tracking-tight text-white leading-none">Quay lại Giao dịch ảo</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#559DD2]/10 border border-[#559DD2]/20">
          <Trophy size={16} className="text-[#559DD2]" />
          <span className="text-xs font-bold text-[#559DD2] uppercase tracking-wider">Top Nhà Giao Dịch</span>
        </div>
      </div>

      <div className="flex flex-col items-center mb-28 pt-8" style={{ marginBottom: '9%' }}>
        <div className="w-16 h-1 bg-[#559DD2] rounded-full mb-8 shadow-[0_0_15px_rgba(158,236,55,0.4)]"></div>
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight transition-all duration-300">
          Bảng Xếp Hạng
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm font-medium opacity-80">
          Những nhà giao dịch tài ba nhất hệ thống
        </p>
      </div>

      {/* Top 3 Showcase */}
      <div className="flex flex-col items-center gap-8 mb-48">
        {/* Rank 1 - Top Center */}
        {top3[0] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative flex flex-col items-center p-10 rounded-[2.5rem] border-2 ${getTop3Style(0).border} bg-[var(--card)]/60 backdrop-blur-2xl ${getTop3Style(0).glow} z-20 w-full max-w-md`}
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--background)] p-3 rounded-full border border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.5)]">
              {getTop3Style(0).icon}
            </div>
            <div className="relative mb-8" style={{ width: '112px', height: '112px' }}>
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-yellow-500/40 relative z-10 bg-[var(--secondary)] flex items-center justify-center text-4xl font-bold">
                {top3[0].avatarUrl ? (
                  <img src={top3[0].avatarUrl} alt={top3[0].displayName} className="w-full h-full object-cover" />
                ) : top3[0].initials}
              </div>
              <VIPFrame role={top3[0].role} email={top3[0].email} />
            </div>
            <h3 className="text-2xl font-black mb-1 truncate w-full text-center">{top3[0].displayName}</h3>
            <p className="text-yellow-400 font-mono text-2xl mb-1 font-bold">${top3[0].totalValue.toLocaleString()}</p>
            <div className={`text-base font-bold flex items-center justify-center gap-1 mb-6 ${top3[0].profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp size={16} className={top3[0].profit < 0 ? 'rotate-180' : ''} />
              {top3[0].profit >= 0 ? '+' : ''}${Math.abs(top3[0].profit).toLocaleString()}
            </div>
            <div className="px-6 py-2 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-black uppercase tracking-widest shadow-[0_0_15px_rgba(234,179,8,0.2)]">
              Quán Quân
            </div>
          </motion.div>
        )}

        {/* Rank 2 & 3 - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Rank 2 */}
          {top3[1] && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className={`relative flex flex-col items-center p-8 rounded-3xl border ${getTop3Style(1).border} bg-[var(--card)]/40 backdrop-blur-xl ${getTop3Style(1).glow}`}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--background)] p-2 rounded-full border border-cyan-500/50">
                {getTop3Style(1).icon}
              </div>
              <div className="relative mb-6" style={{ width: '112px', height: '112px' }}>
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-cyan-500/30 relative z-10 bg-[var(--secondary)] flex items-center justify-center text-2xl font-bold">
                  {top3[1].avatarUrl ? (
                    <img src={top3[1].avatarUrl} alt={top3[1].displayName} className="w-full h-full object-cover" />
                  ) : top3[1].initials}
                </div>
                <VIPFrame role={top3[1].role} email={top3[1].email} />
              </div>
              <h3 className="text-xl font-bold mb-1 truncate w-full text-center">{top3[1].displayName}</h3>
              <p className="text-cyan-400 font-mono text-lg mb-1">${top3[1].totalValue.toLocaleString()}</p>
              <div className={`text-sm font-bold flex items-center justify-center gap-1 mb-4 ${top3[1].profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp size={14} className={top3[1].profit < 0 ? 'rotate-180' : ''} />
                {top3[1].profit >= 0 ? '+' : ''}${Math.abs(top3[1].profit).toLocaleString()}
              </div>
              <div className="px-4 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                Á Quân
              </div>
            </motion.div>
          )}

          {/* Rank 3 */}
          {top3[2] && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className={`relative flex flex-col items-center p-8 rounded-3xl border ${getTop3Style(2).border} bg-[var(--card)]/40 backdrop-blur-xl ${getTop3Style(2).glow}`}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--background)] p-2 rounded-full border border-red-500/50">
                {getTop3Style(2).icon}
              </div>
              <div className="relative mb-6" style={{ width: '112px', height: '112px' }}>
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-red-500/30 relative z-10 bg-[var(--secondary)] flex items-center justify-center text-2xl font-bold">
                  {top3[2].avatarUrl ? (
                    <img src={top3[2].avatarUrl} alt={top3[2].displayName} className="w-full h-full object-cover" />
                  ) : top3[2].initials}
                </div>
                <VIPFrame role={top3[2].role} email={top3[2].email} />
              </div>
              <h3 className="text-xl font-bold mb-1 truncate w-full text-center">{top3[2].displayName}</h3>
              <p className="text-red-400 font-mono text-lg mb-1">${top3[2].totalValue.toLocaleString()}</p>
              <div className={`text-sm font-bold flex items-center justify-center gap-1 mb-4 ${top3[2].profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp size={14} className={top3[2].profit < 0 ? 'rotate-180' : ''} />
                {top3[2].profit >= 0 ? '+' : ''}${Math.abs(top3[2].profit).toLocaleString()}
              </div>
              <div className="px-4 py-1 rounded-full bg-red-500/10 text-red-400 text-xs font-bold uppercase tracking-wider">
                Hạng Ba
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Others List */}
      <div className="mt-20 space-y-4 max-w-3xl mx-auto" style={{ marginTop: '20px' }}>
        {others.map((user, index) => (
          <motion.div
            key={user.userId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]/30 hover:bg-[var(--secondary)] transition-all group w-full"
          >
            <div className="flex items-center gap-6 min-w-0 flex-1">
              <div className="w-10 text-center font-black text-xl text-[var(--muted-foreground)] group-hover:text-[#559DD2] transition-colors">
                {index + 4}
              </div>
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-[var(--border)] relative z-10 bg-[var(--secondary)] flex items-center justify-center font-bold">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : user.initials}
                </div>
                <div className="scale-50">
                  <VIPFrame role={user.role} email={user.email} />
                </div>
              </div>
              <div className="min-w-0">
                <h4 className="font-bold truncate text-lg group-hover:text-[#559DD2] transition-colors">{user.displayName}</h4>
                <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-widest">Cao Thủ Giao Dịch</p>
              </div>
            </div>
            <div className="text-right min-w-[160px] flex-shrink-0">
              <div className="text-xl font-mono font-bold text-[var(--foreground)]">${user.totalValue.toLocaleString()}</div>
              <div className={`text-sm flex items-center justify-end gap-1 ${user.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp size={12} className={user.profit < 0 ? 'rotate-180' : ''} />
                {user.profit >= 0 ? '+' : ''}${Math.abs(user.profit).toLocaleString()}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
