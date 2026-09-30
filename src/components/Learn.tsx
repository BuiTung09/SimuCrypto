import { BookOpen, CheckCircle2, Clock, Filter, PlayCircle, Search, Trophy, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Level = 'Beginner' | 'Intermediate' | 'Advanced';
type Category = 'Fundamentals' | 'Blockchain' | 'Trading' | 'Risk' | 'DeFi' | 'Web3' | 'On-chain';

interface VideoLesson {
  id: number;
  title: string;
  description: string;
  youtubeId: string;
  duration: string;
  level: Level;
  category: Category;
  instructor: string;
  topics: string[];
  recommended: boolean;
}

const lessons: VideoLesson[] = [
  {
    id: 1,
    title: 'Tất cả mọi thứ cơ bản bạn cần biết về Crypto trong hơn 200 phút',
    description: 'Video nhập môn cực hợp để bắt đầu: giải thích tổng quan Bitcoin, Ethereum, blockchain, DeFi và bức tranh toàn cảnh của thị trường crypto.',
    youtubeId: 'N_NWiGPr2W4',
    duration: '200+ min',
    level: 'Beginner',
    category: 'Fundamentals',
    instructor: 'Spiderum',
    topics: ['Crypto basics', 'Bitcoin', 'Ethereum', 'Blockchain'],
    recommended: true,
  },
  {
    id: 2,
    title: 'Lộ Trình Học Crypto Cho Người Mới Từ Con Số 0',
    description: 'Lộ trình học theo từng bước cho người mới: ví, seed phrase, sàn, quản trị vốn và cách tiếp cận thị trường an toàn.',
    youtubeId: '9AmqM73MTYs',
    duration: '12+ min',
    level: 'Beginner',
    category: 'Fundamentals',
    instructor: 'YouTube Creator',
    topics: ['Roadmap', 'Wallet', 'Seed phrase'],
    recommended: true,
  },
  {
    id: 3,
    title: 'Blockchain là gì? Bí mật sau công nghệ Blockchain Crypto',
    description: 'Giải thích công nghệ blockchain, cơ chế phi tập trung, tính bảo mật và vai trò của blockchain trong crypto.',
    youtubeId: 'm3el0EgnYE4',
    duration: '15+ min',
    level: 'Beginner',
    category: 'Blockchain',
    instructor: 'FAM Trading',
    topics: ['Blockchain', 'Decentralization'],
    recommended: true,
  },
  {
    id: 4,
    title: 'Blockchain là gì? Giải Thích Dễ Hiểu Về Công Nghệ Blockchain',
    description: 'Một video nền tảng khác để hiểu blockchain bằng ngôn ngữ đơn giản, phù hợp cho người chưa biết gì.',
    youtubeId: 'NdAMXvG3Z7A',
    duration: '10+ min',
    level: 'Beginner',
    category: 'Blockchain',
    instructor: 'YouTube Creator',
    topics: ['Blockchain basics'],
    recommended: false,
  },
  {
    id: 5,
    title: '(P2) Bitcoin hoạt động thế nào? “Đào” Bitcoin là gì?',
    description: 'Hiểu cách mạng lưới Bitcoin vận hành, mining là gì và vì sao Bitcoin có giá trị.',
    youtubeId: '86AGwssLH1M',
    duration: '16 min',
    level: 'Beginner',
    category: 'Fundamentals',
    instructor: 'Spiderum',
    topics: ['Bitcoin', 'Mining'],
    recommended: true,
  },
  {
    id: 6,
    title: '(P3) ETHEREUM và BITCOIN, chúng khác biệt ra sao?',
    description: 'So sánh Bitcoin và Ethereum, từ vai trò, công nghệ đến các ứng dụng thực tế của từng hệ sinh thái.',
    youtubeId: 'cJXvP9V0yZ8',
    duration: '24 min',
    level: 'Beginner',
    category: 'Fundamentals',
    instructor: 'Spiderum',
    topics: ['Bitcoin', 'Ethereum', 'Layer 1'],
    recommended: true,
  },
  {
    id: 7,
    title: 'Cách đọc biểu đồ nến Nhật cơ bản',
    description: 'Bài học nền tảng về nến Nhật, tâm lý giá và cách đọc biểu đồ trước khi học kỹ thuật nâng cao.',
    youtubeId: 'yubzJw0uiE4',
    duration: '20 min',
    level: 'Beginner',
    category: 'Trading',
    instructor: 'YouTube Creator',
    topics: ['Candlesticks', 'Chart reading'],
    recommended: true,
  },
  {
    id: 8,
    title: 'Phần 1/4 | Trader có 30 năm đọc hành vi giá',
    description: 'Học tư duy đọc hành vi giá, khối lượng và thị trường từ góc nhìn thực chiến lâu năm.',
    youtubeId: 'qPH7us0nW3c',
    duration: '20+ min',
    level: 'Intermediate',
    category: 'Trading',
    instructor: 'Trader',
    topics: ['Price action', 'Volume', 'VSA'],
    recommended: true,
  },
  {
    id: 9,
    title: 'Phương pháp đánh Crypto SCALPING M5 hiệu quả nhất 2025',
    description: 'Chiến lược scalping trên khung M5 với tỷ lệ win cao, bao gồm cách nhận diện vùng hỗ trợ kháng cự và điểm vào lệnh lý tưởng.',
    youtubeId: 't8ID4KxKSfc',
    duration: '25+ min',
    level: 'Intermediate',
    category: 'Trading',
    instructor: 'FAM Trading',
    topics: ['Scalping', 'M5', 'Support/Resistance'],
    recommended: true,
  },
  {
    id: 10,
    title: 'Chia Sẻ Phương Pháp Giao Dịch Với Fibonacci (Cực Kỳ Chi Tiết)',
    description: 'Hướng dẫn chi tiết cách sử dụng Fibonacci Retracement và Extension để tìm vùng hỗ trợ, kháng cự và chốt lời hiệu quả.',
    youtubeId: 'xNpEeu0fFhc',
    duration: '30+ min',
    level: 'Intermediate',
    category: 'Trading',
    instructor: 'Nukida',
    topics: ['Fibonacci', 'Retracement', 'Extension'],
    recommended: true,
  },
  {
    id: 11,
    title: 'HƯỚNG DẪN TOÀN TẬP VỀ FUTURES',
    description: 'Video tổng quan về futures crypto: đòn bẩy, cross, isolated, rủi ro và các lỗi người mới hay mắc phải.',
    youtubeId: 'wpMtg6nTpRc',
    duration: '30+ min',
    level: 'Intermediate',
    category: 'Trading',
    instructor: 'GenZ Crypto',
    topics: ['Futures', 'Leverage', 'Risk'],
    recommended: true,
  },
  {
    id: 12,
    title: 'Chấp Nhận Rủi Ro Trong Giao Dịch – Tư Duy Cần Có',
    description: 'Xây nền tư duy đúng về rủi ro, cách giữ kỷ luật và không để thị trường phá vỡ hệ thống giao dịch của bạn.',
    youtubeId: 'gMl9CJViAmI',
    duration: '15+ min',
    level: 'Intermediate',
    category: 'Risk',
    instructor: 'Long Short Liên Tục',
    topics: ['Risk management', 'Mindset'],
    recommended: true,
  },
  {
    id: 13,
    title: 'Làm sao để quản trị rủi ro trong giao dịch và trading',
    description: 'Phù hợp để học song song với kỹ thuật: quản trị vốn, tỷ lệ risk-reward và kỷ luật khi vào lệnh.',
    youtubeId: 'OXxA_fhskiQ',
    duration: '15+ min',
    level: 'Intermediate',
    category: 'Risk',
    instructor: 'YouTube Creator',
    topics: ['Money management', 'Risk-reward'],
    recommended: true,
  },
  {
    id: 14,
    title: 'Quản Trị Rủi Ro Để Xây Dựng Tài Sản Lớn',
    description: 'Nội dung đi sâu hơn về tư duy xây hệ thống đầu tư bền vững thay vì chỉ săn kèo ngắn hạn.',
    youtubeId: 'qPTWNqRSRHQ',
    duration: '20+ min',
    level: 'Advanced',
    category: 'Risk',
    instructor: 'YouTube Creator',
    topics: ['Portfolio', 'Capital preservation'],
    recommended: false,
  },
  {
    id: 15,
    title: '(P7) Hệ thống tài chính của Crypto vận hành như thế nào?',
    description: 'Mảnh ghép rất quan trọng để hiểu stablecoin, thanh khoản, thị trường vốn và cách tiền di chuyển trong crypto.',
    youtubeId: '3pZoftwq0Ks',
    duration: '24 min',
    level: 'Advanced',
    category: 'DeFi',
    instructor: 'Spiderum',
    topics: ['Crypto economy', 'Liquidity', 'Stablecoin'],
    recommended: true,
  },
  {
    id: 16,
    title: '(P8) Giải thích đơn giản về Stablecoin',
    description: 'Hiểu stablecoin là gì, vì sao nó quan trọng và những rủi ro tiềm ẩn trong hệ sinh thái crypto.',
    youtubeId: 'ZodauQXUXIg',
    duration: '19 min',
    level: 'Advanced',
    category: 'DeFi',
    instructor: 'Spiderum',
    topics: ['Stablecoin', 'DeFi'],
    recommended: true,
  },
  {
    id: 17,
    title: '(P9) Kiến thức cơ bản về DeFi',
    description: 'Bài nhập môn DeFi rất hợp để hiểu lending, borrowing, AMM, yield và cách DeFi khác tài chính truyền thống.',
    youtubeId: 'SXnU0rno0ms',
    duration: '19 min',
    level: 'Advanced',
    category: 'DeFi',
    instructor: 'Spiderum',
    topics: ['DeFi', 'Lending', 'AMM'],
    recommended: true,
  },
  {
    id: 18,
    title: '(P10) Cơ hội nào cho các nhà đầu tư trong DeFi?',
    description: 'Bài học nối tiếp DeFi: cơ hội, chiến lược và cách nhìn rủi ro-lợi nhuận trong tài chính phi tập trung.',
    youtubeId: 'IYwN9SIQeHs',
    duration: '17 min',
    level: 'Advanced',
    category: 'DeFi',
    instructor: 'Spiderum',
    topics: ['DeFi opportunities', 'Yield'],
    recommended: true,
  },
  {
    id: 19,
    title: '[OnChain] Học Phân tích On Chain | CryptoQuant',
    description: 'Chuỗi video quan trọng cho người muốn lên level phân tích dữ liệu on-chain để đọc dòng tiền và hành vi thị trường.',
    youtubeId: 'umYy4Hy7Jbo',
    duration: '20+ min',
    level: 'Advanced',
    category: 'On-chain',
    instructor: 'GemX Network',
    topics: ['On-chain', 'CryptoQuant', 'Market data'],
    recommended: true,
  },
  {
    id: 20,
    title: '(FINAL) Money, Trust and the Future of Crypto',
    description: 'Bài kết khóa rất hợp để chốt lại góc nhìn dài hạn: tiền tệ, niềm tin, hạ tầng và tương lai của crypto.',
    youtubeId: 'sHhEMhcvT1Y',
    duration: '19 min',
    level: 'Advanced',
    category: 'Web3',
    instructor: 'Spiderum',
    topics: ['Future of crypto', 'Money', 'Trust'],
    recommended: true,
  },
];

const levelOptions: Array<'all' | Level> = ['all', 'Beginner', 'Intermediate', 'Advanced'];
const categoryOptions: Array<'all' | Category> = ['all', 'Fundamentals', 'Blockchain', 'Trading', 'Risk', 'DeFi', 'Web3', 'On-chain'];
const storageKey = 'crypto-course-progress-v2';

function getYouTubeThumb(youtubeId: string) {
  return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
}

function getLevelBadge(level: Level) {
  if (level === 'Beginner') return 'bg-sky-500/15 text-sky-400 border border-blue-500/20';
  if (level === 'Intermediate') return 'bg-blue-500/15 text-blue-400 border border-blue-500/20';
  return 'bg-purple-500/15 text-purple-400 border border-purple-500/20';
}

export function Learn() {
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [filterLevel, setFilterLevel] = useState<'all' | Level>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | Category>('all');
  const [search, setSearch] = useState('');
  const [activeVideo, setActiveVideo] = useState<VideoLesson | null>(lessons[0]);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as number[];
      if (Array.isArray(parsed)) {
        setCompletedLessons(parsed);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(completedLessons));
  }, [completedLessons]);

  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const matchLevel = filterLevel === 'all' || lesson.level === filterLevel;
      const matchCategory = filterCategory === 'all' || lesson.category === filterCategory;
      const keyword = search.trim().toLowerCase();
      const matchSearch =
        keyword.length === 0 ||
        lesson.title.toLowerCase().includes(keyword) ||
        lesson.description.toLowerCase().includes(keyword) ||
        lesson.topics.some((topic) => topic.toLowerCase().includes(keyword)) ||
        lesson.instructor.toLowerCase().includes(keyword);

      return matchLevel && matchCategory && matchSearch;
    });
  }, [filterLevel, filterCategory, search]);

  const completedCount = completedLessons.length;
  const progressPercent = Math.round((completedCount / lessons.length) * 100);

  const handleStartLesson = (lesson: VideoLesson) => {
    setActiveVideo(lesson);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleComplete = (lessonId: number) => {
    setCompletedLessons((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId],
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-sm text-[var(--muted-foreground)]">
            <BookOpen className="h-4 w-4" />
            20 bài học crypto tiếng Việt từ cơ bản đến nâng cao
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] sm:text-4xl">
            Khóa học Crypto hoàn chỉnh
          </h1>
          <p className="mt-2 max-w-3xl text-[var(--muted-foreground)]">
            Lộ trình đã được sắp theo thứ tự học hợp lý: nhập môn → blockchain → trading → quản trị rủi ro → DeFi → on-chain → góc nhìn dài hạn.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-[var(--foreground)]">{lessons.length}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Bài học</div>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-[var(--foreground)]">{completedCount}</div>
            <div className="text-xs text-[var(--muted-foreground)]">Đã hoàn thành</div>
          </div>
        </div>
      </div>

      {activeVideo && (
        <div className="mb-8 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-xl">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--secondary)]/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 inline-flex items-center gap-2 text-sm text-sky-400">
                <PlayCircle className="h-4 w-4" /> Đang học
              </div>
              <h2 className="text-lg font-semibold text-[var(--foreground)] sm:text-xl">{activeVideo.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`https://www.youtube.com/watch?v=${activeVideo.youtubeId}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--background)]"
              >
                Mở trên YouTube
              </a>
              <button
                onClick={() => setActiveVideo(null)}
                className="rounded-xl border border-[var(--border)] p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
                aria-label="Đóng video"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="relative w-full bg-black" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute"
                style={{ top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                src={`https://www.youtube.com/embed/${activeVideo.youtubeId}`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getLevelBadge(activeVideo.level)}`}>
                  {activeVideo.level}
                </span>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
                  {activeVideo.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
                  <Clock className="h-3.5 w-3.5" /> {activeVideo.duration}
                </span>
              </div>

              <p className="mb-4 text-sm leading-7 text-[var(--muted-foreground)]">{activeVideo.description}</p>

              <div className="mb-5 rounded-2xl bg-[var(--secondary)]/50 p-4">
                <div className="mb-2 text-sm font-semibold text-[var(--foreground)]">Giảng/kênh</div>
                <div className="text-sm text-[var(--muted-foreground)]">{activeVideo.instructor}</div>
              </div>

              <div className="mb-5">
                <div className="mb-2 text-sm font-semibold text-[var(--foreground)]">Chủ đề chính</div>
                <div className="flex flex-wrap gap-2">
                  {activeVideo.topics.map((topic) => (
                    <span
                      key={topic}
                      className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => toggleComplete(activeVideo.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${completedLessons.includes(activeVideo.id)
                  ? 'bg-sky-500/15 text-sky-400 border border-blue-500/20'
                  : 'bg-[var(--foreground)] text-[var(--background)] hover:opacity-90'
                  }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                {completedLessons.includes(activeVideo.id) ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Tiến độ học tập</h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              Hoàn thành {completedCount}/{lessons.length} bài học
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl bg-[var(--secondary)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
            <Trophy className="h-4 w-4" /> {progressPercent}%
          </div>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[var(--secondary)]">
          <div className="h-full rounded-full bg-sky-400 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.25fr_1fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, chủ đề, kênh..."
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] py-3 pl-11 pr-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--foreground)]/30"
          />
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4">
          <Filter className="h-4 w-4 text-[var(--muted-foreground)]" />
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as 'all' | Level)}
            className="h-12 w-full bg-transparent text-sm text-[var(--foreground)] outline-none"
          >
            {levelOptions.map((level) => (
              <option key={level} value={level}>
                {level === 'all' ? 'Tất cả cấp độ' : level}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4">
          <BookOpen className="h-4 w-4 text-[var(--muted-foreground)]" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as 'all' | Category)}
            className="h-12 w-full bg-transparent text-sm text-[var(--foreground)] outline-none"
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'Tất cả chủ đề' : category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-400">
          Đề xuất: bắt đầu từ bài 1 → 6
        </span>
        <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-400">
          Trading: bài 7 → 11
        </span>
        <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-semibold text-purple-400">
          Nâng cao: bài 12 → 20
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredLessons.map((lesson) => {
          const isCompleted = completedLessons.includes(lesson.id);
          const isActive = activeVideo?.id === lesson.id;

          return (
            <div
              key={lesson.id}
              className={`group overflow-hidden rounded-3xl border bg-[var(--card)] shadow-sm transition ${isActive
                ? 'border-blue-400/40 shadow-lg'
                : 'border-[var(--border)] hover:-translate-y-0.5 hover:shadow-lg'
                }`}
            >
              <button
                onClick={() => handleStartLesson(lesson)}
                className="block w-full text-left"
              >
                <div className="relative aspect-video overflow-hidden bg-black/5">
                  <img
                    src={getYouTubeThumb(lesson.youtubeId)}
                    alt={lesson.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${lesson.youtubeId}/mqdefault.jpg`;
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
                    <PlayCircle className="h-14 w-14 text-white" />
                  </div>
                  <div className="absolute left-3 top-3 flex gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${getLevelBadge(lesson.level)}`}>
                      {lesson.level}
                    </span>
                    {lesson.recommended && (
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300 border border-amber-500/20">
                        Nên học
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 right-3 rounded-lg bg-black/75 px-2 py-1 text-xs font-semibold text-white">
                    {lesson.duration}
                  </div>
                </div>
              </button>

              <div className="p-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <button onClick={() => handleStartLesson(lesson)} className="text-left">
                    <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-[var(--foreground)] transition group-hover:text-sky-400">
                      {lesson.id}. {lesson.title}
                    </h3>
                  </button>

                  <button
                    onClick={() => toggleComplete(lesson.id)}
                    className="shrink-0 rounded-full p-1 text-[var(--muted-foreground)] transition hover:bg-[var(--secondary)] hover:text-sky-400"
                    title={isCompleted ? 'Bỏ hoàn thành' : 'Đánh dấu hoàn thành'}
                  >
                    <CheckCircle2 className={`h-5 w-5 ${isCompleted ? 'fill-emerald-500/20 text-sky-400' : ''}`} />
                  </button>
                </div>

                <p className="mb-4 line-clamp-3 text-sm leading-6 text-[var(--muted-foreground)]">{lesson.description}</p>

                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]">
                    {lesson.category}
                  </span>
                  <span className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]">
                    {lesson.instructor}
                  </span>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {lesson.topics.slice(0, 3).map((topic) => (
                    <span
                      key={topic}
                      className="rounded-md bg-[var(--secondary)] px-2.5 py-1 text-xs text-[var(--muted-foreground)]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartLesson(lesson)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-[var(--background)] transition hover:opacity-90"
                  >
                    <PlayCircle className="h-4 w-4" /> Xem bài học
                  </button>
                  <a
                    href={`https://www.youtube.com/watch?v=${lesson.youtubeId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--secondary)]"
                  >
                    YouTube
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredLessons.length === 0 && (
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-12 text-center shadow-sm">
          <p className="text-[var(--muted-foreground)]">Không tìm thấy bài học phù hợp với bộ lọc hiện tại.</p>
        </div>
      )}

      <div className="mt-14 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">
        <h2 className="mb-6 text-2xl font-bold text-[var(--foreground)]">Lộ trình học đề xuất</h2>
        <div className="grid gap-5 md:grid-cols-4">
          <div className="rounded-2xl border border-[var(--border)] p-5">
            <div className="mb-3 text-sm font-semibold text-sky-400">Giai đoạn 1</div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">Nhập môn</h3>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              Học bài 1 → 6 để hiểu blockchain, Bitcoin, Ethereum và bức tranh toàn cảnh của crypto.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] p-5">
            <div className="mb-3 text-sm font-semibold text-blue-400">Giai đoạn 2</div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">Trading nền tảng</h3>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              Học bài 7 → 11 để biết đọc nến, price action, scalping, Fibonacci và futures.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] p-5">
            <div className="mb-3 text-sm font-semibold text-purple-400">Giai đoạn 3</div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">Quản trị rủi ro</h3>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              Học bài 12 → 14 để xây tư duy giao dịch bền vững trước khi đi sâu vào DeFi và on-chain.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] p-5">
            <div className="mb-3 text-sm font-semibold text-amber-300">Giai đoạn 4</div>
            <h3 className="mb-2 text-lg font-semibold text-[var(--foreground)]">Nâng cao</h3>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              Học bài 15 → 20 để hiểu DeFi, stablecoin, on-chain và góc nhìn dài hạn về tương lai crypto.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
