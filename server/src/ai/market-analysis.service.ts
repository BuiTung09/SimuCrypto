import { Injectable, Logger } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';

interface CacheEntry {
  result: any;
  cachedAt: number;
}

interface ParsedArticle {
  title: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  explanation: string;
}

@Injectable()
export class MarketAnalysisService {
  private readonly logger = new Logger(MarketAnalysisService.name);
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(private readonly aiProvider: AiProviderService) {}

  private getCacheKey(symbol: string): string {
    const now = new Date();
    return `${symbol.toUpperCase()}_${now.getFullYear()}-${now.getMonth()}-${now.getDate()}_${now.getHours()}`;
  }

  async analyze(symbol: string, coinName: string, refresh = false): Promise<any> {
    this.logger.log(`[ANALYSIS] Fetching fresh data for ${symbol} (Cache disabled)`);

    // Fetch news from RSS
    let articles: Array<{ title: string; body: string }> = [];
    try {
      const rssRes = await fetch(
        'https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss',
      );
      const rssData = await rssRes.json();
      articles = (rssData.items || []).map((a: any) => ({
        title: a.title || '',
        body: (a.description || '').replace(/<[^>]*>/gm, '').substring(0, 300),
      }));
    } catch {
      this.logger.warn('RSS fetch failed, using empty articles list');
    }

    // Try LLM (Ollama → Gemini → localScore)
    if (articles.length > 0) {
      const llmResult = await this.tryLlmAnalysis(symbol, coinName, articles);
      if (llmResult) {
        return { ...llmResult, fromCache: false };
      }
    }

    // Final fallback: local keyword scoring
    const localResult = this.localScore(symbol, coinName, articles);
    return { ...localResult, fromCache: false };
  }

  private async tryLlmAnalysis(
    symbol: string,
    coinName: string,
    articles: Array<{ title: string; body: string }>,
  ): Promise<any | null> {
    const newsContext = articles
      .slice(0, 8)
      .map((a, i) => `[${i + 1}] ${a.title}`)
      .join('\n');

    const prompt = `Phân tích tâm lý thị trường cho ${coinName} (${symbol}) từ các tin tức sau:\n${newsContext}\n\nBẮT BUỘC dịch 100% tất cả tiêu đề tin tức (articles[].title) sang tiếng Việt mượt mà. Toàn bộ giải thích (explanation), tóm tắt (detail, eventsSummary), sự kiện (events[].title, events[].info, events[].explanation) đều PHẢI viết bằng tiếng Việt.\n\nTrả về JSON thuần (không markdown, không giải thích):\n{\n  "score": số từ -10 đến 10,\n  "signal": "bullish"|"bearish"|"neutral",\n  "detail": "1 câu tóm tắt tiếng Việt",\n  "articles": [\n    {"title": "tiêu đề ĐÃ DỊCH SANG TIẾNG VIỆT", "signal": "bullish"|"bearish"|"neutral", "explanation": "giải thích ngắn bằng tiếng Việt"}\n  ],\n  "eventsSummary": "1 câu tóm tắt các sự kiện nổi bật trong tuần này bằng tiếng Việt",\n  "events": [\n    {"id": "chuỗi số", "time": "Thời gian diễn ra (ví dụ: Hôm nay, Tuần tới)", "title": "Tên sự kiện vĩ mô hoặc liên quan coin bằng tiếng Việt", "info": "Mô tả ngắn gọn sự kiện bằng tiếng Việt", "explanation": "Giải thích chi tiết ảnh hưởng của sự kiện đến giá coin bằng tiếng Việt"}\n  ]\n}`;

    try {
      const llmText = await this.aiProvider.generate(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
        systemPrompt:
          'Bạn là chuyên gia phân tích thị trường crypto bằng tiếng Việt. Chỉ trả về JSON thuần theo đúng cấu trúc mô tả, không markdown. Bắt buộc dịch toàn bộ tiêu đề sang tiếng Việt.',
      });

      if (!llmText) return null;

      const match = llmText.match(/\{[\s\S]*\}/);
      if (!match) {
        this.logger.warn('[MARKET] LLM returned non-JSON response');
        return null;
      }

      const parsed = JSON.parse(match[0]);
      this.logger.log(`[MARKET] LLM analysis done — signal: ${parsed.signal}, events count: ${parsed.events?.length ?? 0}`);

      return {
        score: parsed.score ?? 0,
        signal: parsed.signal ?? 'neutral',
        detail: parsed.detail ?? '',
        articles: (parsed.articles ?? []).map((a: any) => ({
          title: a.title ?? '',
          signal: a.signal ?? 'neutral',
          explanation: a.explanation ?? '',
        })),
        eventsSummary: parsed.eventsSummary ?? 'Các sự kiện quan trọng trong tuần đối với thị trường tiền điện tử.',
        events: (parsed.events ?? []).map((e: any, idx: number) => ({
          id: e.id ?? String(idx),
          time: e.time ?? 'Hôm nay',
          title: e.title ?? '',
          info: e.info ?? '',
          explanation: e.explanation ?? '',
        })),
        isLocal: false,
      };
    } catch (e: any) {
      this.logger.warn(`[MARKET] LLM parse error: ${e?.message}`);
      return null;
    }
  }

  private localScore(
    symbol: string,
    coinName: string,
    articles: Array<{ title: string; body: string }>,
  ): any {
    const bullishWords = [
      'surge', 'bull', 'rally', 'adoption', 'breakout', 'growth', 'positive',
      'up', 'gain', 'rise', 'pump', 'partnership', 'approve', 'launch', 'milestone',
    ];
    const bearishWords = [
      'crash', 'drop', 'bear', 'ban', 'hack', 'lawsuit', 'sell-off', 'negative',
      'plunge', 'fall', 'dump', 'warning', 'risk', 'investigation', 'fraud',
    ];

    let totalScore = 0;
    const parsedArticles: ParsedArticle[] = articles.slice(0, 10).map((a) => {
      const text = (a.title + ' ' + a.body).toLowerCase();
      const b = bullishWords.filter((w) => text.includes(w)).length;
      const br = bearishWords.filter((w) => text.includes(w)).length;
      totalScore += b - br;
      const sig: 'bullish' | 'bearish' | 'neutral' =
        b > br ? 'bullish' : br > b ? 'bearish' : 'neutral';
      return {
        title: a.title,
        signal: sig,
        explanation:
          sig === 'bullish'
            ? 'Tin tức mang tín hiệu tích cực cho thị trường.'
            : sig === 'bearish'
              ? 'Tin tức mang tín hiệu tiêu cực, có thể gây áp lực bán.'
              : 'Tin tức trung lập, ít ảnh hưởng trực tiếp đến giá.',
      };
    });

    const signal: 'bullish' | 'bearish' | 'neutral' =
      totalScore >= 2 ? 'bullish' : totalScore <= -2 ? 'bearish' : 'neutral';
    const signalVi =
      signal === 'bullish' ? 'tích cực' : signal === 'bearish' ? 'tiêu cực' : 'trung lập';

    return {
      score: totalScore,
      signal,
      detail: `Phân tích cục bộ từ ${parsedArticles.length} tin tức. Tâm lý thị trường đang ${signalVi} đối với ${coinName} (${symbol}).`,
      articles: parsedArticles,
      eventsSummary: `Hệ thống phân tích cục bộ đang hoạt động. Tổng hợp các sự kiện kinh tế vĩ mô và chỉ số kỹ thuật ảnh hưởng đến ${coinName}.`,
      events: [
        {
          id: '1',
          time: 'Ngày mai',
          title: 'Công bố chỉ số giá tiêu dùng CPI Hoa Kỳ',
          info: 'Số liệu lạm phát vĩ mô quan trọng',
          explanation: 'Chỉ số CPI phản ánh mức độ lạm phát, có ảnh hưởng trực tiếp đến quyết định tăng/giảm lãi suất của FED, gây biến động mạnh toàn thị trường Crypto.',
        },
        {
          id: '2',
          time: 'Tuần này',
          title: 'Cuộc họp chính sách tiền tệ FOMC',
          info: 'FED quyết định mức lãi suất tiếp theo',
          explanation: 'Nếu FED giữ nguyên hoặc hạ lãi suất, dòng tiền sẽ đổ mạnh vào tài sản rủi ro như Crypto. Nếu tăng lãi suất, thị trường có xu hướng điều chỉnh giảm.',
        },
        {
          id: '3',
          time: 'Định kỳ',
          title: 'Điều chỉnh độ khó khai thác Bitcoin (Mining Difficulty)',
          info: 'Cập nhật sức mạnh đào coin toàn cầu',
          explanation: 'Độ khó tăng phản ánh thợ đào đang đẩy mạnh công suất, củng cố tính bảo mật và tính khan hiếm dài hạn của Bitcoin.',
        },
      ],
      isLocal: true,
    };
  }
}
