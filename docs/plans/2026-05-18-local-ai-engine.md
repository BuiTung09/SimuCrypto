# Local AI Engine Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Replace direct Gemini API calls with a fully local Rule Engine for trading history analysis, and a backend-cached endpoint for market analysis — resulting in near-zero API token consumption.

**Architecture:**
- **Feature 1 (Behavioral Analysis):** Pure local math engine in `BehavioralAnalysisService`. Detects FOMO, Overtrading, Revenge Trading from `marketContext` stored per trade. Returns structured Vietnamese analysis with no external calls.
- **Feature 2 (Market Analysis):** New `MarketAnalysisService` with backend caching (in-memory Map, 1-hour TTL). Fetches RSS news, runs local keyword scoring. Only calls Gemini once per coin per hour if API key is set; falls back to local scoring if not.

**Tech Stack:** NestJS, TypeScript, Prisma, Binance Public API, rss2json RSS, optional Gemini API (cached)

---

## Task 1: Rewrite BehavioralAnalysisService — Local Rule Engine

**Files:**
- Modify: `server/src/trading/behavioral-analysis.service.ts`

Delete the Gemini prompt+fetch block and replace with this local engine:

```typescript
// Detect FOMO: BUY when RSI > 68
const fomoTrades = enrichedTrades.filter(t => t.side === 'buy' && t.context?.rsi > 68);

// Detect Overtrading: gap < 5 mins
const overtradeTrades = enrichedTrades.filter(t =>
  t.timeSinceLastTradeMins !== null && t.timeSinceLastTradeMins < 5
);

// Detect Revenge Trading: new trade within 10 mins of previous sell
const revengeIdx: number[] = [];
for (let i = 1; i < enrichedTrades.length; i++) {
  const prev = enrichedTrades[i - 1];
  const curr = enrichedTrades[i];
  if (prev.side === 'sell' && curr.timeSinceLastTradeMins < 10) {
    revengeIdx.push(i);
  }
}

// Disciplined buys: RSI < 35
const disciplinedBuys = enrichedTrades.filter(t => t.side === 'buy' && t.context?.rsi < 35);

// Score
let score = 100;
score -= fomoTrades.length * 10;
score -= overtradeTrades.length * 7;
score -= revengeIdx.length * 15;
score += disciplinedBuys.length * 8;
score = Math.max(0, Math.min(100, score));

// Persona
let persona;
if (score >= 75) persona = { title: 'Sniper Kỷ Luật', description: 'Kiên nhẫn chờ điểm vào lệnh chuẩn xác', icon: 'Target' };
else if (fomoTrades.length >= 2) persona = { title: 'Tay Súng FOMO', description: 'Hay bị cuốn theo thị trường nóng', icon: 'Zap' };
else if (revengeIdx.length >= 1) persona = { title: 'Kẻ Trả Thù Thị Trường', description: 'Dễ mất bình tĩnh sau khi thua lỗ', icon: 'AlertCircle' };
else if (overtradeTrades.length >= 3) persona = { title: 'Người Giao Dịch Quá Mức', description: 'Mở lệnh liên tục không có chiến lược', icon: 'Activity' };
else persona = { title: 'Trader Đang Phát Triển', description: 'Đang hình thành phong cách giao dịch', icon: 'TrendingUp' };

// Patterns
const patterns = [];
if (fomoTrades.length > 0) {
  patterns.push({
    name: 'FOMO (Sợ Bỏ Lỡ)',
    description: `Bạn đã thực hiện ${fomoTrades.length} lệnh MUA khi RSI > 68. Ví dụ: MUA ${fomoTrades[0].pair} tại RSI ${fomoTrades[0].context?.rsi?.toFixed(1)}.`,
    impact: 'Tiêu cực'
  });
}
if (overtradeTrades.length > 0) {
  patterns.push({
    name: 'Overtrading',
    description: `${overtradeTrades.length} lệnh được mở trong vòng chưa đến 5 phút sau lệnh trước.`,
    impact: 'Tiêu cực'
  });
}
if (revengeIdx.length > 0) {
  patterns.push({
    name: 'Revenge Trading',
    description: `Phát hiện ${revengeIdx.length} lần mở lệnh mới ngay sau khi vừa bán trong vòng 10 phút.`,
    impact: 'Tiêu cực'
  });
}
if (disciplinedBuys.length > 0) {
  patterns.push({
    name: 'Mua Đáy Kỷ Luật',
    description: `${disciplinedBuys.length} lệnh mua khi RSI < 35 — tư duy ngược chiều tốt.`,
    impact: 'Tích cực'
  });
}

const evaluation = `Dựa trên ${enrichedTrades.length} giao dịch: ${fomoTrades.length} lỗi FOMO, ${overtradeTrades.length} lần overtrading, ${revengeIdx.length} dấu hiệu revenge trading. Điểm kỷ luật: ${score}/100.`;

const advice: string[] = [];
if (fomoTrades.length > 0) advice.push('Chỉ nên MUA khi RSI < 60 để tránh đu đỉnh.');
if (overtradeTrades.length > 0) advice.push('Đặt quy tắc: mỗi lệnh cách lệnh trước ít nhất 15 phút.');
if (revengeIdx.length > 0) advice.push('Sau khi thua, nghỉ ít nhất 30 phút trước khi mở lệnh tiếp theo.');
if (advice.length === 0) advice.push('Duy trì phong cách hiện tại. Ghi chép lý do mỗi lệnh để cải thiện.');

return { score, persona, evaluation, summary: evaluation, patterns, advice };
```

**Commit:**
```bash
cd server && git add src/trading/behavioral-analysis.service.ts
git commit -m "feat: replace Gemini behavioral analysis with local rule engine"
```

---

## Task 2: Create MarketAnalysisService — Backend Cache + Local Fallback

**Files:**
- Create: `server/src/ai/market-analysis.service.ts`
- Create: `server/src/ai/market-analysis.controller.ts`
- Modify: `server/src/ai/ai.module.ts`

**market-analysis.service.ts:**
```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class MarketAnalysisService {
  private cache = new Map<string, { result: any; cachedAt: number }>();
  private readonly TTL = 60 * 60 * 1000; // 1 hour

  private getCacheKey(symbol: string): string {
    const now = new Date();
    return `${symbol.toUpperCase()}_${now.getFullYear()}-${now.getMonth()}-${now.getDate()}_${now.getHours()}`;
  }

  async analyze(symbol: string, coinName: string): Promise<any> {
    const key = this.getCacheKey(symbol);
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.cachedAt < this.TTL) {
      return { ...cached.result, fromCache: true };
    }

    // Fetch RSS news
    let articles: any[] = [];
    try {
      const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss');
      const data = await res.json();
      articles = (data.items || []).map((a: any) => ({
        title: a.title,
        body: (a.description || '').replace(/<[^>]*>/gm, ''),
      }));
    } catch (_) {}

    // Try Gemini if key set
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (GEMINI_KEY && articles.length > 0) {
      try {
        const newsContext = articles.slice(0, 10).map((a, i) => `[${i+1}] ${a.title}`).join('\n');
        const prompt = `Phân tích tâm lý thị trường cho ${coinName} (${symbol}) từ tin tức:\n${newsContext}\n\nTrả về JSON thuần: {"score": số từ -10 đến 10, "signal": "bullish"|"bearish"|"neutral", "detail": "1 câu tóm tắt tiếng Việt", "articles": [{"title": "tiêu đề tiếng Việt", "signal": "bullish"|"bearish"|"neutral", "explanation": "giải thích ngắn"}]}`;
        const aiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 600 } }) }
        );
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const result = { ...JSON.parse(match[0]), fromCache: false };
            this.cache.set(key, { result, cachedAt: Date.now() });
            return result;
          }
        }
      } catch (_) {}
    }

    // Local fallback scoring
    return this.localScore(symbol, coinName, articles);
  }

  private localScore(symbol: string, coinName: string, articles: any[]) {
    const bullish = ['surge', 'bull', 'rally', 'adoption', 'breakout', 'growth', 'positive', 'up', 'gain', 'rise'];
    const bearish = ['crash', 'drop', 'bear', 'ban', 'hack', 'lawsuit', 'sell-off', 'negative', 'plunge', 'fall'];
    let score = 0;
    const parsedArticles = articles.slice(0, 10).map((a: any) => {
      const text = (a.title + ' ' + (a.body || '')).toLowerCase();
      const b = bullish.filter(w => text.includes(w)).length;
      const br = bearish.filter(w => text.includes(w)).length;
      score += (b - br);
      const sig = b > br ? 'bullish' : br > b ? 'bearish' : 'neutral';
      return { title: a.title, signal: sig, explanation: `Từ khóa ${sig === 'bullish' ? 'tích cực' : sig === 'bearish' ? 'tiêu cực' : 'trung lập'} được phát hiện.` };
    });
    const signal = score >= 2 ? 'bullish' : score <= -2 ? 'bearish' : 'neutral';
    const result = {
      score, signal,
      detail: `Phân tích cục bộ từ ${parsedArticles.length} tin tức. Tâm lý ${signal === 'bullish' ? 'tích cực' : signal === 'bearish' ? 'tiêu cực' : 'trung lập'}.`,
      articles: parsedArticles, fromCache: false, isLocal: true,
    };
    this.cache.set(this.getCacheKey(symbol), { result, cachedAt: Date.now() - this.TTL / 2 });
    return result;
  }
}
```

**market-analysis.controller.ts:**
```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { MarketAnalysisService } from './market-analysis.service';

@Controller('ai')
export class MarketAnalysisController {
  constructor(private marketAnalysis: MarketAnalysisService) {}

  @Get('market-analysis')
  async analyze(@Query('symbol') symbol: string, @Query('coinName') coinName: string) {
    return this.marketAnalysis.analyze(symbol || 'BTC', coinName || symbol || 'Bitcoin');
  }
}
```

**Updated ai.module.ts:**
```typescript
import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { MarketAnalysisService } from './market-analysis.service';
import { MarketAnalysisController } from './market-analysis.controller';

@Module({
  controllers: [MarketAnalysisController],
  providers: [GeminiService, MarketAnalysisService],
  exports: [GeminiService, MarketAnalysisService],
})
export class AiModule {}
```

**Commit:**
```bash
cd server && git add src/ai/
git commit -m "feat: add MarketAnalysisService with 1-hour backend cache and local fallback"
```

---

## Task 3: Update Frontend — Route Through Backend, Remove Exposed API Key

**Files:**
- Modify: `src/lib/api.ts` — add `aiApi`
- Modify: `src/components/AIAnalysisModal.tsx` — replace direct Gemini call

**api.ts addition:**
```typescript
export const aiApi = {
  marketAnalysis: (symbol: string, coinName: string) =>
    apiRequest(`/ai/market-analysis?symbol=${symbol}&coinName=${encodeURIComponent(coinName)}`, 'GET'),
};
```

**AIAnalysisModal.tsx changes:**
1. Delete line 8: `const GEMINI_API_KEY = "AIzaSy..."`
2. Add import: `import { aiApi } from '../lib/api';`
3. In `fetchNewsSentiment`, replace the entire Gemini fetch block (lines ~177-261) with:
```typescript
const data = await aiApi.marketAnalysis(symbol, coinName);
totalScore = data.score;
signal = data.signal;
detail = data.detail;
parsedArticles = (data.articles || []).map((a: any, i: number) => ({
  id: String(i),
  time: new Date().toISOString().slice(0, 16).replace('T', ' '),
  title: a.title,
  signal: a.signal,
  explanation: a.explanation || '',
}));
sentimentDetail = detail;
eventsSummary = '';
parsedEvents = [];
```
4. Remove the `if (GEMINI_API_KEY)` guard block and the local fallback `if (!GEMINI_API_KEY || parsedArticles.length === 0)` block — backend handles both cases.

**Commit:**
```bash
git add src/lib/api.ts src/components/AIAnalysisModal.tsx
git commit -m "feat: route market analysis through backend, remove exposed API key from frontend"
```

---

## Task 4: Verify End-to-End

1. `cd server && npm run start:dev`
2. `npm run dev`
3. **Test Behavioral Analysis:** Practice Trading → Click "Phân tích AI" → result appears in <100ms, no Gemini call in server logs.
4. **Test Market Analysis:** Open any coin AI Analysis → first load hits Gemini (or local fallback), subsequent loads within 1 hour return `fromCache: true` in response.
5. **Security check:** Browser DevTools → Network tab → confirm no Gemini API key visible in any request.
