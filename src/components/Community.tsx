import { useState, useEffect } from 'react';
import {
  MessageSquare,
  TrendingUp,
  BookOpen,
  Users,
  Heart,
  Share2,
  CheckCircle2,
  ChevronDown,
  LayoutGrid,
  List,
  Zap,
  MoreHorizontal,
  Send,
  Loader2,
  CornerDownRight,
  AlertCircle
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { communityApi } from '../lib/api';

interface Comment {
  id: number;
  postId: number;
  content: string;
  createdAt: string;
  author: string;
  avatar: string;
}

interface Post {
  id: number;
  userId: string;
  title: string;
  content: string;
  category: string;
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: string;
  avatar: string;
  isVerified: boolean;
  role: number;
  likes: string[]; // Mảng chứa các userId đã thích
  comments: Comment[];
  isTrending?: boolean;
}

interface CommunityProps {
  user: any;
}

export function Community({ user }: CommunityProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Các trạng thái của cột Sidebar động bên phải
  const [trendingCoins, setTrendingCoins] = useState<any[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);

  // Post categories and filters
  const [activeCategory, setActiveCategory] = useState('Feed Tổng hợp');
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Expanded post creator state
  const [isExpanding, setIsExpanding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Thảo luận');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [creatorError, setCreatorError] = useState<string | null>(null);

  // Comments section states
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Truy xuất dữ liệu widget bên phải từ Database
  const fetchSidebarData = async () => {
    try {
      const data = await communityApi.getSidebarData();
      setTrendingCoins(data.trendingCoins);
      setSuggestedUsers(data.suggestedUsers);
    } catch (err) {
      console.error('Failed to load community sidebar data:', err);
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch posts from backend API
  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await communityApi.getPosts(activeCategory, activeFilter);
      // Ánh xạ thêm cờ isTrending ngẫu nhiên/hoặc theo lượt like > 5 để đồng bộ với UI cũ
      const enrichedPosts = res.map((p: any) => ({
        ...p,
        isTrending: p.likesCount >= 5 || Math.random() > 0.8,
      }));
      setPosts(enrichedPosts);
    } catch (err: any) {
      setError(err.message || 'Không thể tải các bài đăng từ cộng đồng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchSidebarData();
  }, [activeCategory, activeFilter]);

  const categories = [
    { name: 'Feed Tổng hợp', icon: MessageSquare },
    { name: 'Phân tích kỹ thuật', icon: TrendingUp },
    { name: 'Kiến thức nền tảng', icon: BookOpen },
    { name: 'Nhóm tín hiệu', icon: Users },
  ];

  const filters = ['Tất cả', 'Thảo luận', 'Phân tích'];

  // Format numbers (e.g. 1500 -> 1.5K)
  const formatNumber = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Convert time to relative format (Vietnamese)
  const formatTimeAgo = (dateStr: string) => {
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

  // Handle new post submit
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setCreatorError('Bạn cần đăng nhập để đăng bài lên cộng đồng.');
      return;
    }
    if (!newTitle.trim() || !newContent.trim()) {
      setCreatorError('Tiêu đề và Nội dung bài viết không được để trống.');
      return;
    }

    setSubmitting(true);
    setCreatorError(null);
    try {
      const created = await communityApi.createPost({
        userId: user.id,
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        imageUrl: newImageUrl.trim() || undefined,
      });

      // Insert new post at top of list
      setPosts(prev => [created, ...prev]);
      
      // Refresh sidebar data to update trending counts dynamically
      fetchSidebarData();
      
      // Reset form
      setNewTitle('');
      setNewContent('');
      setNewCategory('Thảo luận');
      setNewImageUrl('');
      setIsExpanding(false);
    } catch (err: any) {
      setCreatorError(err.message || 'Có lỗi xảy ra khi đăng bài.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle post like/unlike
  const handleLike = async (postId: number) => {
    if (!user) {
      alert('Vui lòng đăng nhập để thích bài viết này.');
      return;
    }

    // Optimistic UI updates
    setPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          const isLikedAlready = p.likes.includes(user.id);
          return {
            ...p,
            likes: isLikedAlready ? p.likes.filter(id => id !== user.id) : [...p.likes, user.id],
            likesCount: isLikedAlready ? p.likesCount - 1 : p.likesCount + 1,
          };
        }
        return p;
      })
    );

    try {
      await communityApi.toggleLike(postId, user.id);
    } catch (err) {
      console.error('Failed to toggle like:', err);
      // Revert in case of backend failure
      fetchPosts();
    }
  };

  // Handle comment submit
  const handleAddComment = async (postId: number) => {
    if (!user) {
      alert('Vui lòng đăng nhập để gửi bình luận.');
      return;
    }
    if (!commentContent.trim()) return;

    setCommentSubmitting(true);
    try {
      const newComment = await communityApi.addComment(postId, user.id, commentContent.trim());
      
      setPosts(prevPosts =>
        prevPosts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              commentsCount: p.commentsCount + 1,
              comments: [...p.comments, newComment],
            };
          }
          return p;
        })
      );
      setCommentContent('');
    } catch (err: any) {
      alert(err.message || 'Không thể đăng bình luận.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F8F9FA] min-h-[calc(100vh-64px)] w-full overflow-x-hidden">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:py-8 relative">
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-6`}>

          {/* Left Sidebar */}
          {!isMobile && (
            <div className="w-[200px] shrink-0 space-y-4">
              <ScrollReveal delay={0.1}>
                {/* Categories Menu */}
                <div>
                  <div className="mb-3 text-[10px] font-bold text-black/40 uppercase tracking-wider px-3">
                    DANH MỤC
                  </div>
                  <nav className="space-y-0.5">
                    {categories.map((cat) => (
                      <button
                        key={cat.name}
                        onClick={() => setActiveCategory(cat.name)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${activeCategory === cat.name
                          ? 'bg-[#559DD2] text-black font-semibold shadow-sm'
                          : 'text-black/60 hover:bg-black/5 hover:text-black'
                          }`}
                      >
                        <cat.icon className="h-4.5 w-4.5 shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Become Mentor Card */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-transparent mt-4">
                  <h3 className="font-bold text-black text-sm mb-1.5">Học tập hiệu quả?</h3>
                  <p className="text-xs text-black/60 mb-3 leading-relaxed">
                    Theo dõi các chuyên gia và học hỏi các bài phân tích kỹ thuật on-chain chuyên nghiệp.
                  </p>
                  <button className="w-full bg-[#1A1D1F] text-white rounded-lg py-1.5 text-xs font-medium hover:bg-black transition-colors">
                    Tìm hiểu ngay
                  </button>
                </div>
              </ScrollReveal>
            </div>
          )}

          {/* Main Feed */}
          <div className="flex-1 space-y-6">

            {isMobile && (
              <ScrollReveal delay={0.05}>
                <div className="mb-2">
                  <div
                    className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"
                    style={{
                      maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
                    }}
                  >
                    {categories.map((cat) => (
                      <button
                        key={cat.name}
                        onClick={() => setActiveCategory(cat.name)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${activeCategory === cat.name
                          ? 'bg-[#559DD2] text-black font-semibold'
                          : 'bg-white text-black/60 border border-black/5'
                          }`}
                      >
                        <cat.icon className="h-4 w-4" />
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* Create Post Area */}
            <ScrollReveal delay={0.15}>
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-black/5 transition-all">
                {!isExpanding ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#559DD2] flex items-center justify-center text-black font-bold shrink-0">
                      {user ? (user.displayName || user.username).charAt(0).toUpperCase() : 'U'}
                    </div>
                    <button
                      onClick={() => setIsExpanding(true)}
                      className="flex-1 text-left bg-[#F3F4F6] text-black/50 hover:bg-black/5 rounded-full px-5 py-3 text-sm transition-colors border-0 outline-none"
                    >
                      {user ? `Chào ${user.displayName || user.username}, hôm nay bạn muốn chia sẻ gì về thị trường?` : "Bạn đang nghĩ gì về thị trường hôm nay?"}
                    </button>
                    <button 
                      onClick={() => setIsExpanding(true)}
                      className="bg-[#559DD2] text-black font-semibold py-2.5 px-5 rounded-full text-xs hover:opacity-90 transition-opacity whitespace-nowrap flex items-center gap-1.5"
                    >
                      <Zap className="h-4 w-4" />
                      Đăng bài
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCreatePost} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-black/5 pb-2">
                      <h4 className="font-bold text-sm text-black">Đăng bài thảo luận mới</h4>
                      <button
                        type="button"
                        onClick={() => setIsExpanding(false)}
                        className="text-xs text-black/40 hover:text-black"
                      >
                        Hủy
                      </button>
                    </div>

                    {creatorError && (
                      <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-xl text-xs">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{creatorError}</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-black/40 uppercase mb-1">Tiêu đề bài viết</label>
                        <input
                          type="text"
                          required
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="Nhập tiêu đề ấn tượng cho bài chia sẻ của bạn..."
                          className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#559DD2]/30 focus:border-[#559DD2]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-black/40 uppercase mb-1">Chuyên mục</label>
                          <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#559DD2]/30"
                          >
                            <option value="Thảo luận">💬 Thảo luận cộng đồng</option>
                            <option value="Phân tích kỹ thuật">📈 Phân tích kỹ thuật</option>
                            <option value="Kiến thức nền tảng">📚 Kiến thức nền tảng</option>
                            <option value="Nhóm tín hiệu">🚨 Nhóm tín hiệu</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-black/40 uppercase mb-1">Đường dẫn ảnh minh họa (Không bắt buộc)</label>
                          <input
                            type="text"
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            placeholder="Ví dụ: /btc_chart_analysis.png hoặc link ảnh online..."
                            className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#559DD2]/30 focus:border-[#559DD2]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-black/40 uppercase mb-1">Nội dung chi tiết</label>
                        <textarea
                          required
                          rows={4}
                          value={newContent}
                          onChange={(e) => setNewContent(e.target.value)}
                          placeholder="Chia sẻ kiến thức, phân tích biểu đồ, hoặc thắc mắc của bạn với cộng đồng tại đây..."
                          className="w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#559DD2]/30 focus:border-[#559DD2] resize-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5">
                      <button
                        type="button"
                        onClick={() => setIsExpanding(false)}
                        className="rounded-xl border border-black/10 px-4 py-2 text-xs font-semibold hover:bg-black/5 transition-colors"
                      >
                        Đóng lại
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="rounded-xl bg-[#559DD2] text-black px-5 py-2 text-xs font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Đang đăng...
                          </>
                        ) : (
                          <>
                            <Zap size={12} className="fill-current" />
                            Đăng ngay
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </ScrollReveal>

            {/* Filter Chips & Search Indicators */}
            <ScrollReveal delay={0.2}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-full">
                  {filters.map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeFilter === filter
                        ? 'bg-[#559DD2] text-black border border-transparent font-semibold shadow-sm'
                        : 'bg-white text-black/60 border border-black/10 hover:border-black/20'
                        }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {!isMobile && (
                  <div className="flex items-center gap-3 ml-auto">
                    <button 
                      onClick={() => fetchPosts()}
                      className="flex items-center gap-2 text-xs font-medium text-black/70 bg-white px-4 py-2 rounded-full border border-black/10 hover:bg-black/5"
                    >
                      Cập nhật mới
                    </button>
                    <div className="flex bg-white rounded-lg border border-black/10 p-1">
                      <button className="p-1.5 bg-[#559DD2]/20 text-[#1A1D1F] rounded-md">
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 text-black/40 hover:text-black">
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollReveal>

            {/* Posts List */}
            <div className="space-y-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[#559DD2]" />
                  <p className="text-sm text-black/40">Đang tải các cuộc thảo luận mới nhất...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-black/5 shadow-sm">
                  <MessageSquare className="h-10 w-10 text-black/20 mx-auto mb-3" />
                  <h3 className="font-bold text-base mb-1">Chưa có bài viết nào</h3>
                  <p className="text-xs text-black/50">Trở thành người đầu tiên đăng bài trong danh mục này nhé!</p>
                </div>
              ) : (
                posts.map((post, idx) => {
                  const hasLiked = user ? post.likes.includes(user.id) : false;
                  const isCommentsOpen = expandedPostId === post.id;
                  
                  return (
                    <ScrollReveal key={post.id} delay={0.1 + idx * 0.05}>
                      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-black/5 transition-all">

                        {/* Post Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-12 h-12 rounded-full bg-gradient-to-tr from-[#559DD2] to-emerald-400 flex items-center justify-center text-black font-extrabold overflow-hidden">
                              {post.avatar ? (
                                <img src={post.avatar} alt={post.author} className="w-full h-full object-cover" />
                              ) : (
                                post.author.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm sm:text-base text-black truncate">{post.author}</span>
                                {post.isVerified && <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 w-4 text-blue-500 fill-blue-500/10 flex-shrink-0" />}
                                {post.role === 999 && (
                                  <span className="bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[9px] font-bold rounded-full px-1.5 py-0.2 select-none">ADMIN</span>
                                )}
                              </div>
                              <div className="text-[10px] sm:text-xs text-black/50 mt-0.5 truncate">
                                {formatTimeAgo(post.createdAt)} • <span className="text-black/60 font-semibold bg-black/5 rounded px-1.5 py-0.2">{post.category}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {post.isTrending && (
                              <div className="flex items-center gap-1 bg-[#EEFDE0] text-[#71C70A] text-[10px] font-bold px-2.5 py-1 rounded-md whitespace-nowrap">
                                <Zap className="h-3 w-3 fill-current" />
                                <span>HOT</span>
                              </div>
                            )}
                            <button className="text-black/30 hover:text-black/60">
                              <MoreHorizontal className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        {/* Post Content */}
                        <h3 className="text-base sm:text-lg font-bold text-black mb-2.5 leading-snug">{post.title}</h3>
                        <p className="text-sm text-black/70 mb-4 leading-relaxed whitespace-pre-line">{post.content}</p>
                        
                        {post.imageUrl && (
                          <div className="mb-5 overflow-hidden rounded-2xl border border-black/5 shadow-sm max-h-[380px] bg-[#1A1D1F]/5 flex items-center justify-center">
                            <img 
                              src={post.imageUrl} 
                              alt={post.title} 
                              className="w-full h-full object-cover hover:scale-[1.015] transition-transform duration-500"
                              loading="lazy"
                            />
                          </div>
                        )}

                        {/* Post Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-black/5">
                          <div className="flex items-center gap-6 sm:gap-8">
                            {/* Like Button */}
                            <button
                              onClick={() => handleLike(post.id)}
                              className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
                                hasLiked ? 'text-red-500' : 'text-black/50 hover:text-black'
                              }`}
                            >
                              <Heart className={`h-4.5 w-4.5 ${hasLiked ? 'fill-red-500 text-red-500' : ''}`} />
                              <span>{formatNumber(post.likesCount)}</span>
                            </button>
                            
                            {/* Comments Button Toggle */}
                            <button
                              onClick={() => {
                                setExpandedPostId(isCommentsOpen ? null : post.id);
                                setCommentContent('');
                              }}
                              className={`flex items-center gap-2 text-xs font-semibold transition-colors ${
                                isCommentsOpen ? 'text-blue-500' : 'text-black/50 hover:text-black'
                              }`}
                            >
                              <MessageSquare className="h-4.5 w-4.5" />
                              <span>{formatNumber(post.commentsCount)}</span>
                            </button>
                          </div>
                          <button className="text-black/50 hover:text-black transition-colors">
                            <Share2 className="h-4.5 w-4.5" />
                          </button>
                        </div>

                        {/* Collapsible Comments Section */}
                        {isCommentsOpen && (
                          <div className="mt-4 pt-4 border-t border-black/5 space-y-4">
                            <div className="text-xs font-bold text-black/40 uppercase tracking-wider">
                              Bình luận ({post.comments.length})
                            </div>

                            {/* Comments List */}
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                              {post.comments.length === 0 ? (
                                <p className="text-xs text-black/40 py-2 italic text-center">Chưa có bình luận nào. Hãy bắt đầu cuộc trò chuyện!</p>
                              ) : (
                                post.comments.map((comment) => (
                                  <div key={comment.id} className="flex gap-2.5 text-xs bg-black/2.5 p-3 rounded-2xl relative">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-extrabold shrink-0 text-[10px]">
                                      {comment.avatar ? (
                                        <img src={comment.avatar} alt={comment.author} className="w-full h-full object-cover" />
                                      ) : (
                                        comment.author.charAt(0).toUpperCase()
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-0.5">
                                        <span className="font-bold text-black">{comment.author}</span>
                                        <span className="text-[10px] text-black/40">{formatTimeAgo(comment.createdAt)}</span>
                                      </div>
                                      <p className="text-black/70 leading-relaxed leading-normal">{comment.content}</p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Write Comment Form */}
                            <div className="flex items-center gap-2 pt-2 border-t border-black/5">
                              <div className="w-8 h-8 rounded-full bg-[#559DD2] flex items-center justify-center text-black font-bold text-xs shrink-0 select-none">
                                {user ? (user.displayName || user.username).charAt(0).toUpperCase() : 'U'}
                              </div>
                              <input
                                type="text"
                                placeholder={user ? "Viết phản hồi hoặc thảo luận..." : "Đăng nhập để viết bình luận..."}
                                disabled={!user}
                                value={commentContent}
                                onChange={(e) => setCommentContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddComment(post.id);
                                }}
                                className="flex-1 rounded-full bg-[#F3F4F6] border-0 outline-none text-xs px-4 py-2 placeholder:text-black/35 focus:ring-2 focus:ring-[#559DD2]/30"
                              />
                              <button
                                onClick={() => handleAddComment(post.id)}
                                disabled={!user || commentSubmitting || !commentContent.trim()}
                                className="bg-[#559DD2] text-black p-2 rounded-full hover:opacity-95 transition-opacity disabled:opacity-40"
                              >
                                {commentSubmitting ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Send size={14} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollReveal>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className={`${isMobile ? 'w-full' : 'w-[300px]'} shrink-0 space-y-6`}>

            <ScrollReveal delay={isMobile ? 0.1 : 0.3}>
              {/* Hot Trend */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-transparent">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-[#559DD2]" />
                    <h3 className="font-bold text-black">Hot Trend</h3>
                  </div>
                  <span className="text-[10px] text-black/40 font-bold uppercase">24H</span>
                </div>
                <div className="space-y-5">
                  {trendingCoins.map((coin, index) => (
                    <div key={coin.symbol} className="flex items-center gap-4">
                      <span className="text-sm font-medium text-black/30 w-4">{index + 1}</span>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-black">{coin.name}</div>
                        <div className="text-[10px] text-black/40 uppercase tracking-widest leading-none mt-1">
                          {coin.mentions} LƯỢT NHẮC
                        </div>
                      </div>
                      <div className="text-sm font-medium text-[#4ade80]">{coin.change}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested To Follow */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-transparent mt-6">
                <div className="flex items-center gap-2 mb-5">
                  <Users className="h-5 w-5 text-[#559DD2]" />
                  <h3 className="font-bold text-black">Gợi ý theo dõi</h3>
                </div>
                <div className="space-y-5">
                  {suggestedUsers.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#559DD2] to-emerald-400 border border-black/5 flex items-center justify-center font-bold text-black text-xs">
                          {item.initials}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-black flex items-center gap-1">
                            {item.name}
                            {item.role === 999 && (
                              <span className="bg-purple-500/10 text-purple-600 text-[8px] font-bold rounded px-1">ADMIN</span>
                            )}
                          </div>
                          <div className="text-[10px] text-black/50">{item.description}</div>
                        </div>
                      </div>
                      <button className="rounded-full border border-[#559DD2] px-4 py-1.5 text-xs font-medium text-black hover:bg-[#559DD2]/10 transition-colors">
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Community Guidelines */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-transparent mt-6">
                <h3 className="mb-5 font-bold text-sm uppercase tracking-wider text-black/40 text-center">QUY TẮC CỘNG ĐỒNG</h3>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#559DD2] text-[10px] font-bold text-black mt-0.5">
                      1
                    </div>
                    <div className="text-sm text-black/70 font-semibold">Tôn trọng mọi thành viên</div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#559DD2] text-[10px] font-bold text-black mt-0.5">
                      2
                    </div>
                    <div className="text-sm text-black/70 font-semibold">Chia sẻ kiến thức hữu ích</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

          </div>
        </div>

      </div>
    </div>
  );
}