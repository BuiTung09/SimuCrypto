import { useState, useEffect } from 'react';
import { authApi } from '../lib/api';
import { 
  Users, 
  UserCheck, 
  ShieldCheck, 
  Crown, 
  Search, 
  ArrowUpDown, 
  TrendingUp, 
  Activity, 
  MessageSquare, 
  DollarSign, 
  Clock, 
  RefreshCw 
} from 'lucide-react';

interface AdminViewProps {
  user: any;
}

interface AnalyticsData {
  summary: {
    totalUsers: number;
    active24h: number;
    active7d: number;
    active30d: number;
    proUsers: number;
    freeUsers: number;
    adminUsers: number;
    totalRevenue: number;
  };
  registrationsTrend: Array<{ date: string; count: number }>;
  users: Array<{
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    createdAt: string;
    lastLoginAt: string | null;
    role: number;
    virtualBalance: number;
    tradesCount: number;
    postsCount: number;
    commentsCount: number;
  }>;
  activities?: Array<{
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
    user: {
      displayName: string;
      username: string;
      email: string;
      avatarUrl: string | null;
    };
  }>;
  payments?: Array<{
    id: string;
    amount: number;
    currency: string;
    months: number;
    method: string;
    memo: string | null;
    status: string;
    createdAt: string;
    user: {
      displayName: string;
      username: string;
      email: string;
      avatarUrl: string | null;
    };
  }>;
}

export function AdminView({ user }: AdminViewProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastLoginAt' | 'trades' | 'balance'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeRightTab, setActiveRightTab] = useState<'density' | 'timeline'>('density');
  const [activeMainTab, setActiveMainTab] = useState<'users' | 'payments'>('users');
  const [monthsFilter, setMonthsFilter] = useState<'all' | 1 | 3 | 6>('all');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.getAdminAnalytics(user.email);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu phân tích quản trị viên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getFilteredAndSortedUsers = () => {
    if (!data) return [];
    
    const filtered = data.users.filter(u => 
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      let valueA: any = 0;
      let valueB: any = 0;

      if (sortBy === 'createdAt') {
        valueA = new Date(a.createdAt).getTime();
        valueB = new Date(b.createdAt).getTime();
      } else if (sortBy === 'lastLoginAt') {
        valueA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        valueB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      } else if (sortBy === 'trades') {
        valueA = a.tradesCount;
        valueB = b.tradesCount;
      } else if (sortBy === 'balance') {
        valueA = a.virtualBalance;
        valueB = b.virtualBalance;
      }

      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  };

  const getFilteredPayments = () => {
    if (!data?.payments) return [];
    
    let filtered = data.payments;

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (monthsFilter !== 'all') {
      filtered = filtered.filter(p => p.months === monthsFilter);
    }

    return filtered;
  };

  // Helper formats
  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Chưa đăng nhập';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    return `${diffDays} ngày trước`;
  };

  const isActiveInLast24h = (dateStr: string | null) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    return now.getTime() - date.getTime() < 24 * 60 * 60 * 1000;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-[#559DD2] border-t-transparent" />
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Đang truy xuất bảng phân tích hệ thống...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
          <ShieldCheck size={24} />
        </div>
        <h3 className="mb-2 text-lg font-bold">Lỗi Truy Cập Quản Trị</h3>
        <p className="mb-6 text-sm" style={{ color: 'var(--muted-foreground)' }}>{error}</p>
        <button 
          onClick={fetchData}
          className="rounded-lg bg-[#559DD2] px-4 py-2 text-sm font-medium text-black hover:opacity-90 transition-opacity"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const sortedUsers = getFilteredAndSortedUsers();
  const filteredPayments = getFilteredPayments();
  const summary = data?.summary;
  const maxTrendCount = data ? Math.max(...data.registrationsTrend.map(t => t.count), 1) : 1;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-400 border border-purple-500/20">
              Admin Console
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Trung Tâm Quản Trị Hệ Thống</h1>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Theo dõi lưu lượng người dùng, hoạt động học tập và mức độ tương tác thời gian thực.
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--secondary)]"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* Grid Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          {/* Card 1: Total Users */}
          <div className="rounded-2xl p-6 border border-[var(--border)] bg-[var(--card)] relative overflow-hidden"
               style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Tổng Người Dùng</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <Users size={20} />
              </div>
            </div>
            <div className="text-2xl font-extrabold mb-1">{summary.totalUsers.toLocaleString()}</div>
            <div className="mt-2 text-xs flex items-center gap-1 text-sky-400">
              <TrendingUp size={12} />
              <span>Tài khoản hoạt động an toàn</span>
            </div>
          </div>

          {/* Card 2: Active 24h */}
          <div className="rounded-2xl p-6 border border-[var(--border)] bg-[var(--card)] relative overflow-hidden"
               style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Hoạt Động 24h</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                <Activity size={20} />
              </div>
            </div>
            <div className="text-2xl font-extrabold mb-1">{summary.active24h.toLocaleString()}</div>
            <div className="mt-2 text-xs text-[var(--muted-foreground)] flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
              <span>Mật độ tương tác cao trong ngày</span>
            </div>
          </div>

          {/* Card 3: Active 7d */}
          <div className="rounded-2xl p-6 border border-[var(--border)] bg-[var(--card)] relative overflow-hidden"
               style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Hoạt Động 7 Ngày</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <UserCheck size={20} />
              </div>
            </div>
            <div className="text-2xl font-extrabold mb-1">{summary.active7d.toLocaleString()}</div>
            <div className="mt-2 text-xs text-[var(--muted-foreground)]">
              Tỷ lệ duy trì tuần: <span className="font-semibold text-purple-400">{((summary.active7d / Math.max(summary.totalUsers, 1)) * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Card 4: Pro Users / Subscriptions */}
          <div className="rounded-2xl p-6 border border-[var(--border)] bg-[var(--card)] relative overflow-hidden"
               style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Thành Viên Premium</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-400">
                <Crown size={20} />
              </div>
            </div>
            <div className="text-2xl font-extrabold mb-1">{summary.proUsers.toLocaleString()}</div>
            <div className="mt-2 text-xs text-[var(--muted-foreground)] flex items-center gap-3">
              <span>Free: <strong className="text-[var(--foreground)]">{summary.freeUsers}</strong></span>
              <span>Admin: <strong className="text-[var(--foreground)]">{summary.adminUsers}</strong></span>
            </div>
          </div>

          {/* Card 5: Total Revenue */}
          <div className="rounded-2xl p-6 border border-[var(--border)] bg-[var(--card)] relative overflow-hidden"
               style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>Tổng Doanh Thu</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold mb-1">
               {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary.totalRevenue || 0)}
            </div>
            <div className="mt-2 text-xs text-[var(--muted-foreground)] flex items-center gap-1">
              <span>Đã thanh toán thành công</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid registrations trend and quick info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Registration Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-sm sm:text-base">Biểu Đồ Tăng Trưởng Người Dùng Mới</h3>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Lượng tài khoản đăng ký mới 7 ngày qua.</p>
            </div>
            <span className="text-xs font-semibold text-[#559DD2] flex items-center gap-1">
              <TrendingUp size={12} />
              <span>Real-time</span>
            </span>
          </div>

          <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2">
            {data?.registrationsTrend.map((t, idx) => {
              const heightPercent = (t.count / maxTrendCount) * 100;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center group">
                  {/* Bar Value (Registrations) */}
                  <span className={`text-[10px] font-extrabold mb-2 transition-all duration-300 ${
                    t.count > 0 ? 'text-[#559DD2] drop-shadow-[0_0_4px_rgba(158,236,55,0.2)]' : 'text-[var(--muted-foreground)]/40'
                  } group-hover:scale-110`}>
                    {t.count > 0 ? `+${t.count}` : '0'}
                  </span>

                  {/* Chart Track Container */}
                  <div className="w-full max-w-[32px] sm:max-w-[44px] h-28 bg-[#1A1D1F]/50 border border-white/[0.05] rounded-lg flex items-end justify-center relative overflow-hidden group-hover:border-[#559DD2]/30 group-hover:bg-white/[0.03] transition-all duration-300">
                    {/* Visual Filled Bar */}
                    <div 
                      style={{ height: `${Math.max(heightPercent, 2)}%` }} 
                      className={`w-full rounded-t-md transition-all duration-500 origin-bottom ${
                        t.count > 0 
                          ? 'bg-gradient-to-t from-[#559DD2]/20 to-[#559DD2] shadow-[0_0_8px_rgba(158,236,55,0.25)]' 
                          : 'bg-white/[0.04]'
                      }`}
                    >
                      {/* Glossy top reflection highlight */}
                      {t.count > 0 && <div className="absolute inset-x-0 top-0 h-0.5 bg-white/30 rounded-t-md" />}
                    </div>
                  </div>

                  {/* Date Label */}
                  <span className="text-[10px] mt-2 font-semibold tracking-wider transition-colors duration-200 uppercase group-hover:text-white" style={{ color: 'var(--muted-foreground)' }}>
                    {t.date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* System Activity Summary & Live Timeline Feed */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 flex flex-col justify-between h-[328px]">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2 mb-4">
              <div className="flex gap-4">
                <button 
                  onClick={() => setActiveRightTab('density')}
                  className={`text-xs sm:text-sm font-bold pb-2 border-b-2 transition-all ${
                    activeRightTab === 'density' ? 'border-[#559DD2] text-[var(--foreground)]' : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Mật Độ Hệ Thống
                </button>
                <button 
                  onClick={() => setActiveRightTab('timeline')}
                  className={`text-xs sm:text-sm font-bold pb-2 border-b-2 transition-all ${
                    activeRightTab === 'timeline' ? 'border-[#559DD2] text-[var(--foreground)]' : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Nhật Ký Gần Đây
                </button>
              </div>
              <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            </div>

            {activeRightTab === 'density' ? (
              <div className="space-y-4 pt-1">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[var(--border)]">
                  <span style={{ color: 'var(--muted-foreground)' }}>Trung bình lệnh giao dịch / user</span>
                  <span className="font-bold text-[var(--foreground)]">
                    {(data ? data.users.reduce((acc, curr) => acc + curr.tradesCount, 0) / Math.max(data.users.length, 1) : 0).toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[var(--border)]">
                  <span style={{ color: 'var(--muted-foreground)' }}>Tổng số bài đăng cộng đồng</span>
                  <span className="font-bold text-[var(--foreground)]">
                    {data ? data.users.reduce((acc, curr) => acc + curr.postsCount, 0) : 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[var(--border)]">
                  <span style={{ color: 'var(--muted-foreground)' }}>Tổng số bình luận cộng đồng</span>
                  <span className="font-bold text-[var(--foreground)]">
                    {data ? data.users.reduce((acc, curr) => acc + curr.commentsCount, 0) : 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <span style={{ color: 'var(--muted-foreground)' }}>Người dùng sở hữu VIP Khung Viền</span>
                  <span className="font-bold text-yellow-500">
                    {data ? data.users.filter(u => u.role >= 1).length : 0}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[175px] pr-1 scrollbar-thin">
                {data?.activities && data.activities.length > 0 ? (
                  data.activities.map((act) => (
                    <div key={act.id} className="flex gap-2.5 pb-2 border-b border-[var(--border)]/40 last:border-0">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                        {act.user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[10px] text-[var(--foreground)] truncate">
                            {act.user.displayName}
                          </span>
                          <span className="text-[9px] text-[var(--muted-foreground)] flex-shrink-0">
                            {formatTimeAgo(act.createdAt)}
                          </span>
                        </div>
                        <p className="text-[10px] mt-0.5 text-[var(--muted-foreground)] leading-snug line-clamp-2">
                          <span className={`inline-block rounded px-1 text-[8px] font-bold mr-1 ${
                            act.action.includes('TRADE') ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                          }`}>
                            {act.action}
                          </span>
                          {act.details}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs py-8" style={{ color: 'var(--muted-foreground)' }}>
                    Chưa có nhật ký hoạt động nào được ghi nhận.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-purple-500/5 border border-purple-500/10 p-2.5 mt-2">
            <p className="text-[9px]" style={{ color: 'var(--muted-foreground)' }}>
              Nhật ký hệ thống PostgreSQL tự động theo dõi các lệnh giao dịch & sự kiện đăng nhập thời gian thực.
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-4 mb-4">
        <button 
           onClick={() => setActiveMainTab('users')}
           className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors ${activeMainTab === 'users' ? 'bg-[#559DD2] text-black border-transparent' : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--secondary)]'}`}>
           Quản Lý Thành Viên
        </button>
        <button 
           onClick={() => setActiveMainTab('payments')}
           className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors flex items-center gap-2 ${activeMainTab === 'payments' ? 'bg-[#559DD2] text-black border-transparent' : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--secondary)]'}`}>
           Lịch Sử Giao Dịch
        </button>
      </div>

      {/* Directory Table */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        {/* Table Controls */}
        <div className="px-6 py-5 border-b border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-3.5 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
            <input
              type="text"
              placeholder={activeMainTab === 'users' ? "Tìm kiếm email, tên hiển thị..." : "Tìm kiếm giao dịch..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#559DD2]/30"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)',
              }}
            />
          </div>

          {activeMainTab === 'users' ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span style={{ color: 'var(--muted-foreground)' }}>Sắp xếp theo:</span>
            <button 
              onClick={() => handleSort('createdAt')}
              className={`rounded-lg px-2.5 py-1.5 font-medium border border-[var(--border)] transition-colors flex items-center gap-1 ${
                sortBy === 'createdAt' ? 'bg-[#559DD2] text-black border-transparent' : 'bg-[var(--card)] hover:bg-[var(--secondary)]'
              }`}
            >
              Ngày đăng ký
              <ArrowUpDown size={10} />
            </button>
            <button 
              onClick={() => handleSort('lastLoginAt')}
              className={`rounded-lg px-2.5 py-1.5 font-medium border border-[var(--border)] transition-colors flex items-center gap-1 ${
                sortBy === 'lastLoginAt' ? 'bg-[#559DD2] text-black border-transparent' : 'bg-[var(--card)] hover:bg-[var(--secondary)]'
              }`}
            >
              Đăng nhập gần nhất
              <ArrowUpDown size={10} />
            </button>
            <button 
              onClick={() => handleSort('trades')}
              className={`rounded-lg px-2.5 py-1.5 font-medium border border-[var(--border)] transition-colors flex items-center gap-1 ${
                sortBy === 'trades' ? 'bg-[#559DD2] text-black border-transparent' : 'bg-[var(--card)] hover:bg-[var(--secondary)]'
              }`}
            >
              Giao dịch
              <ArrowUpDown size={10} />
            </button>
            <button 
              onClick={() => handleSort('balance')}
              className={`rounded-lg px-2.5 py-1.5 font-medium border border-[var(--border)] transition-colors flex items-center gap-1 ${
                sortBy === 'balance' ? 'bg-[#559DD2] text-black border-transparent' : 'bg-[var(--card)] hover:bg-[var(--secondary)]'
              }`}
            >
              Số dư
              <ArrowUpDown size={10} />
            </button>
          </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span style={{ color: 'var(--muted-foreground)' }}>Lọc gói:</span>
              {(['all', 1, 3, 6] as const).map(months => (
                <button 
                  key={months}
                  onClick={() => setMonthsFilter(months)}
                  className={`rounded-lg px-2.5 py-1.5 font-medium border border-[var(--border)] transition-colors ${
                    monthsFilter === months ? 'bg-[#559DD2] text-black border-transparent' : 'bg-[var(--card)] hover:bg-[var(--secondary)]'
                  }`}
                >
                  {months === 'all' ? 'Tất cả' : `${months} Tháng`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actual Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr style={{ background: 'var(--secondary)' }} className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                {activeMainTab === 'users' ? (
                  <>
                    <th className="px-6 py-4 font-semibold">Thành Viên</th>
                    <th className="px-6 py-4 font-semibold">Vai Trò</th>
                    <th className="px-6 py-4 font-semibold">Tình Trạng (Đăng Nhập)</th>
                    <th className="px-6 py-4 font-semibold text-center">Lệnh Giao Dịch</th>
                    <th className="px-6 py-4 font-semibold text-center">Cộng Đồng (Bài / Cmt)</th>
                    <th className="px-6 py-4 font-semibold text-right">Số Dư Giả Lập</th>
                    <th className="px-6 py-4 font-semibold text-right">Ngày Đăng Ký</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 font-semibold">Người Dùng</th>
                    <th className="px-6 py-4 font-semibold text-right">Số Tiền</th>
                    <th className="px-6 py-4 font-semibold">Gói (Tháng)</th>
                    <th className="px-6 py-4 font-semibold">Phương Thức</th>
                    <th className="px-6 py-4 font-semibold">Ghi Chú</th>
                    <th className="px-6 py-4 font-semibold text-right">Thời Gian</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {activeMainTab === 'users' ? (
                sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      Không tìm thấy thành viên nào khớp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((u) => {
                    const active = isActiveInLast24h(u.lastLoginAt);
                    return (
                      <tr key={u.id} className="hover:bg-[var(--secondary)]/30 transition-colors">
                        {/* Name & Avatar */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="flex h-8 w-8 items-center justify-center rounded-full font-bold text-black overflow-hidden border border-[var(--border)]"
                              style={{ background: u.role === 999 ? '#a855f7' : u.role >= 1 ? '#eab308' : '#559DD2' }}
                            >
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                              ) : (
                                u.displayName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{u.displayName}</div>
                              <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                                @{u.username} • {u.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="px-6 py-4">
                          {u.role === 999 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-3 py-1 font-bold text-purple-400 border border-purple-500/20">
                              <ShieldCheck size={10} />
                              ADMIN
                            </span>
                          ) : u.role >= 1 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-3 py-1 font-bold text-sky-400 border border-blue-500/20">
                              <Crown size={10} />
                              PRO
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-3 py-1 font-semibold text-gray-400 border border-gray-500/20">
                              Thường
                            </span>
                          )}
                        </td>

                        {/* Tình trạng Đăng nhập */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`relative flex h-2 w-2`}>
                              {active && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                              )}
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${active ? 'bg-sky-500' : 'bg-gray-500'}`} />
                            </span>
                            <span className="font-medium">{formatTimeAgo(u.lastLoginAt)}</span>
                          </div>
                        </td>

                        {/* Giao dịch */}
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center rounded-lg bg-blue-500/10 px-3 py-1.5 font-bold text-blue-400 border border-blue-500/10">
                            {u.tradesCount} lệnh
                          </span>
                        </td>

                        {/* Cộng đồng */}
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 text-[var(--muted-foreground)]">
                            <span className="font-semibold text-[var(--foreground)]">{u.postsCount} bài</span>
                            <span>/</span>
                            <span>{u.commentsCount} cmt</span>
                          </div>
                        </td>

                        {/* Số dư giả lập */}
                        <td className="px-6 py-4 text-right font-bold text-sky-400">
                          ${u.virtualBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Ngày đăng ký */}
                        <td className="px-6 py-4 text-right" style={{ color: 'var(--muted-foreground)' }}>
                          {formatDate(u.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )
              ) : (
                filteredPayments.length > 0 ? (
                  filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--secondary)]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full font-bold text-black overflow-hidden border border-[var(--border)] bg-[#559DD2]">
                            {p.user.avatarUrl ? (
                              <img src={p.user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                              p.user.displayName.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{p.user.displayName}</div>
                            <div className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                              @{p.user.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-orange-400">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.amount)}
                      </td>
                      <td className="px-6 py-4 font-semibold text-[var(--foreground)]">
                        {p.months} tháng
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-1 font-bold text-[10px] ${
                          p.method === 'VietQR' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {p.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] text-[var(--muted-foreground)]">
                        {p.memo || '-'}
                      </td>
                      <td className="px-6 py-4 text-right" style={{ color: 'var(--muted-foreground)' }}>
                        {formatTimeAgo(p.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      Không có giao dịch nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="px-6 py-4 border-t border-[var(--border)] text-right" style={{ color: 'var(--muted-foreground)' }}>
          {activeMainTab === 'users' ? (
            <>Hiển thị <strong>{sortedUsers.length}</strong> trên tổng số <strong>{data?.summary.totalUsers}</strong> người dùng.</>
          ) : (
            <>Hiển thị <strong>{filteredPayments.length}</strong> giao dịch.</>
          )}
        </div>
      </div>
    </div>
  );
}
