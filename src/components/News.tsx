import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ExternalLink,
  RefreshCcw,
  Clock,
} from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  category: string;
  source: string;
  date: string;
  imageUrl?: string;
  content?: string;
  url?: string;
  tags?: string[];
}

const CATEGORIES = [
  "All",
  "BTC",
  "ETH",
  "Altcoin",
  "Trading",
  "Mining",
  "Regulation",
  "ICO",
  "Blockchain",
];

// Map CryptoCompare categories to our categories
function mapCategory(cats: string | undefined): string {
  if (!cats) return "Altcoin";
  const c = cats.toUpperCase();
  if (c.includes("BTC") || c.includes("BITCOIN")) return "BTC";
  if (c.includes("ETH") || c.includes("ETHEREUM")) return "ETH";
  if (c.includes("TRADING") || c.includes("EXCHANGE")) return "Trading";
  if (c.includes("MINING")) return "Mining";
  if (c.includes("REGULATION") || c.includes("LEGAL")) return "Regulation";
  if (c.includes("ICO") || c.includes("TOKEN SALE")) return "ICO";
  if (c.includes("BLOCKCHAIN") || c.includes("TECHNOLOGY")) return "Blockchain";
  return "Altcoin";
}

function timeAgo(ts: number): string {
  const now = Date.now() / 1000;
  const diff = Math.floor(now - ts);
  if (diff < 60) return "Vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

export function News() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      let mapped: NewsArticle[] = [];

      // --- Try CoinGecko first (stable, free, no key) ---
      try {
        const res = await fetch("https://api.coingecko.com/api/v3/news?page=1");
        const data = await res.json();
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          mapped = data.data.map((item: any, index: number) => ({
            id: index,
            title: item.title || "Crypto News",
            summary: item.description
              ? item.description.substring(0, 250) + (item.description.length > 250 ? "..." : "")
              : "Crypto market update",
            category: mapCategory(item.title + " " + (item.description || "")),
            source: item.news_site || item.author || "CoinGecko",
            date: timeAgo(item.created_at),
            imageUrl: item.thumb_2x,
            content: item.description,
            url: item.url,
            tags: [],
          }));
        }
      } catch (e) {
        console.warn("CoinGecko news failed, trying CryptoCompare...", e);
      }

      // --- Fallback: CryptoCompare ---
      if (mapped.length === 0) {
        try {
          const res2 = await fetch(
            "https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest"
          );
          const data2 = await res2.json();
          if (data2.Data && Array.isArray(data2.Data) && data2.Data.length > 0) {
            mapped = data2.Data.map((item: any) => ({
              id: item.id,
              title: item.title,
              summary: item.body
                ? item.body.substring(0, 250) + (item.body.length > 250 ? "..." : "")
                : "Crypto market update",
              category: mapCategory(item.categories),
              source: item.source_info?.name || item.source || "CryptoCompare",
              date: timeAgo(item.published_on),
              imageUrl: item.imageurl,
              content: item.body,
              url: item.url || item.guid,
              tags: item.tags
                ? item.tags.split("|").filter((t: string) => t.trim())
                : [],
            }));
          }
        } catch (e2) {
          console.warn("CryptoCompare news also failed", e2);
        }
      }

      // --- Final Fallback: RSS via rss2json (very stable) ---
      if (mapped.length === 0) {
        try {
          const rssRes = await fetch(
            "https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss"
          );
          const rssData = await rssRes.json();
          if (rssData.items && Array.isArray(rssData.items) && rssData.items.length > 0) {
            mapped = rssData.items.map((item: any, index: number) => ({
              id: index,
              title: item.title,
              summary: item.description 
                ? item.description.replace(/<[^>]*>?/gm, "").substring(0, 250) + "..."
                : "Crypto market update",
              category: mapCategory(item.categories?.join(" ") || item.title),
              source: "CoinTelegraph",
              date: "Vừa xong",
              imageUrl: item.thumbnail || item.enclosure?.link,
              content: item.content || item.description,
              url: item.link,
              tags: item.categories || [],
            }));
          }
        } catch (e3) {
          console.warn("RSS fallback also failed", e3);
        }
      }

      if (mapped.length > 0) {
        setArticles(mapped);
        setLastUpdate(
          new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      }
    } catch (err) {
      console.error("News fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch on mount + auto-refresh every 2 minutes
  useEffect(() => {
    fetchNews();
    const interval = setInterval(() => fetchNews(false), 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.summary.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid var(--border)",
              borderTopColor: "#559DD2",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: "var(--muted-foreground)" }}>
            Đang tải tin tức crypto...
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ================= DETAIL VIEW =================
  if (selectedArticle) {
    return (
      <div className="page-transition">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <button
            onClick={() => setSelectedArticle(null)}
            className="mb-8 flex items-center gap-2 transition-colors"
            style={{ color: "var(--muted-foreground)", background: "transparent", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--foreground)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách
          </button>

          <ScrollReveal delay={0.1}>
            <div
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 16,
                background: "#559DD2",
                color: "#000",
              }}
            >
              {selectedArticle.category}
            </div>

            <h1 style={{ fontSize: window.innerWidth < 640 ? 24 : 32, fontWeight: 700, lineHeight: 1.3, marginBottom: 16 }}>
              {selectedArticle.title}
            </h1>

            <div
              className="flex items-center gap-4"
              style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 24 }}
            >
              <span>{selectedArticle.source}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {selectedArticle.date}
              </span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.2}>
            {selectedArticle.imageUrl && (
              <img
                src={selectedArticle.imageUrl}
                alt={selectedArticle.title}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  marginBottom: 32,
                  maxHeight: 400,
                  objectFit: "cover",
                  border: "1px solid var(--border)",
                }}
              />
            )}

            <div
              style={{
                fontSize: 16,
                lineHeight: 1.8,
                color: "var(--foreground)",
                whiteSpace: "pre-wrap",
              }}
            >
              {selectedArticle.content}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.3}>
            {selectedArticle.tags && selectedArticle.tags.length > 0 && (
              <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selectedArticle.tags.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 20,
                      fontSize: 12,
                      background: "var(--secondary)",
                      color: "var(--muted-foreground)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {selectedArticle.url && (
              <a
                href={selectedArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 32,
                  padding: "10px 20px",
                  borderRadius: 8,
                  background: "#559DD2",
                  color: "#000",
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Đọc bài gốc
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </ScrollReveal>
        </div>
      </div>
    );
  }

  // ================= LIST VIEW =================
  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <ScrollReveal delay={0.1}>
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 style={{ fontSize: window.innerWidth < 640 ? 24 : 28, fontWeight: 700, marginBottom: 4 }}>
              Tin tức Crypto
            </h1>
            <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>
              Cập nhật liên tục từ CryptoCompare • Tự động refresh mỗi 2 phút
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
                Cập nhật: {lastUpdate}
              </span>
            )}
            <button
              onClick={() => fetchNews(true)}
              disabled={refreshing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--secondary)",
                color: "var(--foreground)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <RefreshCcw
                className="h-4 w-4"
                style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }}
              />
              {refreshing ? "Đang tải..." : "Làm mới"}
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍  Tìm kiếm tin tức..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--secondary)",
            color: "var(--foreground)",
            fontSize: 14,
            marginBottom: 20,
            outline: "none",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#559DD2")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
        />
      </ScrollReveal>

      <ScrollReveal delay={0.2}>
        {/* Category Filter */}
        <div style={{ position: 'relative' }} className="mb-8">
          <div
            className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"
            style={{
              maskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
            }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  border:
                    selectedCategory === cat ? "1px solid #559DD2" : "1px solid var(--border)",
                  background: selectedCategory === cat ? "#559DD2" : "var(--secondary)",
                  color: selectedCategory === cat ? "#000" : "var(--muted-foreground)",
                  transition: "all 0.15s",
                }}
              >
                {cat === "All" ? "Tất cả" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Articles Count */}
        <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>
          {filteredArticles.length} bài viết
        </div>
      </ScrollReveal>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredArticles.map((article, idx) => (
          <ScrollReveal key={article.id} delay={0.2 + idx * 0.1}>
            <article
              onClick={() => setSelectedArticle(article)}
              style={{
                cursor: "pointer",
                borderRadius: 12,
                overflow: "hidden",
                border: "1px solid var(--border)",
                background: "var(--card)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {article.imageUrl && (
                <div style={{ position: "relative", overflow: "hidden" }}>
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    style={{
                      width: "100%",
                      height: 180,
                      objectFit: "cover",
                      transition: "transform 0.3s",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      padding: "3px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      background: "#559DD2",
                      color: "#000",
                    }}
                  >
                    {article.category}
                  </div>
                </div>
              )}

              <div style={{ padding: 16 }}>
                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    marginBottom: 8,
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {article.title}
                </h3>

                <p
                  style={{
                    fontSize: 13,
                    color: "var(--muted-foreground)",
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    marginBottom: 12,
                  }}
                >
                  {article.summary}
                </p>

                <div
                  className="flex items-center justify-between"
                  style={{ fontSize: 12, color: "var(--muted-foreground)" }}
                >
                  <span>{article.source}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {article.date}
                  </span>
                </div>
              </div>
            </article>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={0.4}>
        {filteredArticles.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "80px 20px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--card)",
            }}
          >
            <p style={{ fontSize: 16, color: "var(--muted-foreground)" }}>
              Không tìm thấy bài viết phù hợp.
            </p>
          </div>
        )}
      </ScrollReveal>
    </div>
  );
}
