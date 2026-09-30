# Dual AI Provider Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Nâng cấp LlmService và EmbeddingService để hỗ trợ Ollama (Local) làm AI chính, Gemini làm dự phòng, Rule Engine là lớp an toàn cuối cùng. Cấu hình qua biến môi trường `AI_PROVIDER`.

**Architecture:** AiProviderService mới thay thế LlmService cũ — cùng interface nhưng routing nội bộ sang Ollama hoặc Gemini tuỳ config. BehavioralAnalysisService và MarketAnalysisService sẽ gọi AiProviderService để nhận nhận xét tiếng Việt thay vì trả về câu mẫu cứng. Chuỗi fallback: Ollama → Gemini → Rule Engine.

**Tech Stack:** NestJS, TypeScript, Ollama REST API (localhost:11434), Gemini API v1, Prisma

---

## Task 1: Cập nhật .env — Thêm cấu hình Ollama

**Files:**
- Modify: `server/.env`

**Step 1: Thêm các biến Ollama vào .env**

```env
# AI Provider: ollama | gemini | auto
AI_PROVIDER=auto
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:1.5b
OLLAMA_EMBED_MODEL=nomic-embed-text
```

> `auto` = thử Ollama trước, nếu lỗi chuyển sang Gemini, nếu Gemini lỗi dùng Rule Engine.

**Step 2: Commit**
```bash
cd server && git add .env
git commit -m "config: add Ollama AI provider env vars"
```

---

## Task 2: Tạo AiProviderService — Unified LLM Interface

**Files:**
- Create: `server/src/ai/ai-provider.service.ts`

**Step 1: Tạo file với đầy đủ logic Ollama + Gemini + Fallback**

```typescript
import { Injectable, Logger } from '@nestjs/common';

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private readonly provider = process.env.AI_PROVIDER ?? 'auto';
  private readonly ollamaUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  private readonly ollamaModel = process.env.OLLAMA_MODEL ?? 'qwen2.5:1.5b';
  private readonly geminiKey = process.env.GEMINI_API_KEY ?? '';

  /** Gọi LLM: Ollama → Gemini → null */
  async generate(prompt: string, options: GenerateOptions = {}): Promise<string | null> {
    if (this.provider === 'gemini') return this.tryGemini(prompt, options);
    if (this.provider === 'ollama') return this.tryOllama(prompt, options);

    // auto: thử Ollama trước
    const ollamaResult = await this.tryOllama(prompt, options);
    if (ollamaResult !== null) return ollamaResult;

    // fallback Gemini
    this.logger.warn('[AUTO] Ollama failed → trying Gemini');
    return this.tryGemini(prompt, options);
  }

  /** Tạo embedding: Ollama nomic-embed-text → Gemini embedding */
  async embed(text: string): Promise<number[] | null> {
    if (this.provider === 'gemini') return this.tryGeminiEmbed(text);
    const ollamaEmbed = await this.tryOllamaEmbed(text);
    if (ollamaEmbed !== null) return ollamaEmbed;
    return this.tryGeminiEmbed(text);
  }

  /** Kiểm tra Ollama có đang chạy không */
  async isOllamaAlive(): Promise<boolean> {
    try {
      const res = await fetch(`${this.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async tryOllama(prompt: string, options: GenerateOptions): Promise<string | null> {
    try {
      const messages: any[] = [];
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const res = await fetch(`${this.ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          messages,
          stream: false,
          options: {
            temperature: options.temperature ?? 0.7,
            num_predict: options.maxTokens ?? 1024,
          },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        this.logger.warn(`[OLLAMA] HTTP ${res.status}`);
        return null;
      }

      const data = await res.json();
      const text = data?.message?.content?.trim();
      if (!text) return null;
      this.logger.log(`[OLLAMA] Generated ${text.length} chars`);
      return text;
    } catch (e) {
      this.logger.warn(`[OLLAMA] Error: ${e.message}`);
      return null;
    }
  }

  private async tryGemini(prompt: string, options: GenerateOptions): Promise<string | null> {
    if (!this.geminiKey) return null;
    try {
      const contents: any[] = [];
      if (options.systemPrompt) {
        contents.push({ role: 'user', parts: [{ text: options.systemPrompt }] });
        contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
      }
      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${this.geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens ?? 1024,
            },
          }),
        },
      );
      if (!res.ok) {
        this.logger.warn(`[GEMINI] HTTP ${res.status}`);
        return null;
      }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) return null;
      this.logger.log(`[GEMINI] Generated ${text.length} chars`);
      return text;
    } catch (e) {
      this.logger.warn(`[GEMINI] Error: ${e.message}`);
      return null;
    }
  }

  private async tryOllamaEmbed(text: string): Promise<number[] | null> {
    const embedModel = process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text';
    try {
      const res = await fetch(`${this.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: embedModel, prompt: text }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.embedding ?? null;
    } catch {
      return null;
    }
  }

  private async tryGeminiEmbed(text: string): Promise<number[] | null> {
    if (!this.geminiKey) return null;
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${this.geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: { parts: [{ text }] } }),
        },
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data?.embedding?.values ?? null;
    } catch {
      return null;
    }
  }
}
```

**Step 2: Commit**
```bash
cd server && git add src/ai/ai-provider.service.ts
git commit -m "feat: add AiProviderService with Ollama+Gemini+fallback routing"
```

---

## Task 3: Cập nhật AiModule — Đăng ký AiProviderService

**Files:**
- Modify: `server/src/ai/ai.module.ts`

**Step 1: Thêm AiProviderService vào module**

```typescript
import { Module } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { MarketAnalysisService } from './market-analysis.service';
import { MarketAnalysisController } from './market-analysis.controller';
import { AiProviderService } from './ai-provider.service';

@Module({
  controllers: [MarketAnalysisController],
  providers: [GeminiService, MarketAnalysisService, AiProviderService],
  exports: [GeminiService, MarketAnalysisService, AiProviderService],
})
export class AiModule {}
```

**Step 2: Commit**
```bash
cd server && git add src/ai/ai.module.ts
git commit -m "feat: register AiProviderService in AiModule"
```

---

## Task 4: Nâng cấp EmbeddingService — Dùng AiProviderService

**Files:**
- Modify: `server/src/knowledge/vector/embedding.service.ts`

**Step 1: Cập nhật EmbeddingService để gọi AiProviderService thay vì Gemini trực tiếp**

```typescript
import { AiProviderService } from '../../ai/ai-provider.service';

export class EmbeddingService {
  private embeddingCache = new Map<string, number[]>();
  private apiCallCount = 0;
  private vectorDimension: number | null = null;

  constructor(private readonly aiProvider: AiProviderService) {}

  async embed(text: string): Promise<number[]> {
    if (!text?.trim()) throw new Error('Cannot embed empty text');
    const normalized = text.trim().toLowerCase();

    if (this.embeddingCache.has(normalized)) {
      console.log('⚡ EMBEDDING CACHE HIT');
      return this.embeddingCache.get(normalized)!;
    }

    console.log('🤖 CALLING AI EMBEDDING');
    this.apiCallCount++;

    const embedding = await this.aiProvider.embed(normalized);
    if (!embedding || embedding.length === 0) {
      throw new Error('Embedding failed from all providers');
    }

    if (!this.vectorDimension) {
      this.vectorDimension = embedding.length;
      console.log('📏 Embedding dimension:', this.vectorDimension);
    }

    this.embeddingCache.set(normalized, embedding);
    return embedding;
  }

  getCacheSize() { return this.embeddingCache.size; }
  getApiCallCount() { return this.apiCallCount; }
}
```

**Step 2: Commit**
```bash
cd server && git add src/knowledge/vector/embedding.service.ts
git commit -m "feat: EmbeddingService now uses AiProviderService for Ollama/Gemini embedding"
```

---

## Task 5: Nâng cấp LlmService — Delegate sang AiProviderService

**Files:**
- Modify: `server/src/knowledge/llm.service.ts`

**Step 1: Viết lại LlmService để delegate sang AiProviderService**

```typescript
import { AiProviderService } from '../ai/ai-provider.service';

export class LlmService {
  constructor(private readonly aiProvider: AiProviderService) {}

  async generate(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<string> {
    const result = await this.aiProvider.generate(prompt, options ?? {});
    return result ?? 'Xin lỗi, hệ thống AI tạm thời không khả dụng.';
  }

  async chatWithTools(messages: any[], tools: any[]) {
    // Tool-calling chỉ Gemini hỗ trợ — gọi trực tiếp Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY required for tool calling');
    const geminiTools = tools.map((t) => ({
      functionDeclarations: [
        { name: t.function.name, description: t.function.description, parameters: t.function.parameters },
      ],
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : m.role,
            parts: [{ text: m.content }],
          })),
          tools: geminiTools,
        }),
      },
    );
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }

  async generateWithTools(messages: any[], tools: any[]) {
    return this.chatWithTools(messages, tools);
  }

  async generateStream(prompt: string, onChunk: (text: string) => void) {
    // Stream chỉ dùng Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) { onChunk('Streaming không khả dụng.'); return; }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 800 },
        }),
      },
    );
    if (!res.body) throw new Error('No stream body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const json = line.replace('data: ', '').trim();
        if (!json || json === '[DONE]') continue;
        try {
          const parsed = JSON.parse(json);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) onChunk(text);
        } catch {}
      }
    }
  }
}
```

**Step 2: Commit**
```bash
cd server && git add src/knowledge/llm.service.ts
git commit -m "feat: LlmService delegates to AiProviderService, keeps Gemini for tool-calling"
```

---

## Task 6: Nâng cấp KnowledgeModule — Inject AiProviderService

**Files:**
- Modify: `server/src/knowledge/knowledge.module.ts`

**Step 1: Import AiModule và inject AiProviderService vào EmbeddingService và LlmService**

```typescript
import { Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { RagService } from './rag.service';
import { EmbeddingService } from './vector/embedding.service';
import { InMemoryVectorStore } from './vector/in-memory.vector-store';
import { LlmService } from './llm.service';
import { NewsService } from './news/news.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [
    KnowledgeService,
    RagService,
    EmbeddingService,
    InMemoryVectorStore,
    LlmService,
    NewsService,
  ],
  exports: [RagService, LlmService],
})
export class KnowledgeModule {}
```

**Step 2: Đánh dấu EmbeddingService và LlmService là Injectable để NestJS inject được**

Thêm `@Injectable()` decorator vào đầu class `EmbeddingService` và `LlmService` (nếu chưa có). Sửa constructor để nhận `AiProviderService` qua DI thay vì tự khởi tạo.

**Step 3: Commit**
```bash
cd server && git add src/knowledge/knowledge.module.ts
git commit -m "feat: KnowledgeModule imports AiModule for DI of AiProviderService"
```

---

## Task 7: Nâng cấp MarketAnalysisService — Dùng LLM viết nhận xét

**Files:**
- Modify: `server/src/ai/market-analysis.service.ts`

**Step 1: Inject AiProviderService, dùng LLM để viết nhận xét tin tức thay vì keyword đơn thuần**

Thêm constructor inject:
```typescript
constructor(private readonly aiProvider: AiProviderService) {}
```

Trong method `analyze()`, sau khi fetch RSS thành công, gọi LLM để phân tích:
```typescript
// Sau khi fetch articles thành công:
const newsContext = articles.slice(0, 8).map((a, i) => `[${i+1}] ${a.title}`).join('\n');
const prompt = `Phân tích tâm lý thị trường cho ${coinName} (${symbol}) từ các tin tức sau:\n${newsContext}\n\nTrả về JSON thuần (không markdown):\n{"score": số từ -10 đến 10, "signal": "bullish"|"bearish"|"neutral", "detail": "1 câu tiếng Việt", "articles": [{"title": "tiêu đề dịch tiếng Việt", "signal": "bullish"|"bearish"|"neutral", "explanation": "giải thích ngắn"}]}`;

const llmText = await this.aiProvider.generate(prompt, {
  temperature: 0.3,
  maxTokens: 600,
  systemPrompt: 'Bạn là chuyên gia phân tích thị trường crypto. Trả về JSON thuần, không markdown.',
});

if (llmText) {
  const match = llmText.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      const result = {
        score: parsed.score ?? 0,
        signal: parsed.signal ?? 'neutral',
        detail: parsed.detail ?? '',
        articles: parsed.articles ?? [],
        events: [],
        eventsSummary: '',
        isLocal: false,
      };
      this.cache.set(key, { result, cachedAt: Date.now() });
      return { ...result, fromCache: false };
    } catch {}
  }
}

// Fallback: localScore
return this.localScore(symbol, coinName, articles);
```

**Step 2: Commit**
```bash
cd server && git add src/ai/market-analysis.service.ts
git commit -m "feat: MarketAnalysisService uses AiProviderService (Ollama→Gemini→keyword fallback)"
```

---

## Task 8: Nâng cấp BehavioralAnalysisService — LLM viết nhận xét cá nhân hóa

**Files:**
- Modify: `server/src/trading/behavioral-analysis.service.ts`

**Step 1: Inject AiProviderService vào constructor**

```typescript
constructor(
  private prisma: PrismaService,
  private readonly aiProvider: AiProviderService,
) {}
```

**Step 2: Sau khi Rule Engine tính xong score/persona/patterns, gọi LLM để viết evaluation**

Thay phần tạo chuỗi `evaluation` bằng:

```typescript
// Tạo summary dữ liệu thô cho LLM
const rawSummary = {
  totalTrades: enriched.length,
  buyCount,
  sellCount,
  mostTradedPair,
  totalVolume: fmt(totalVolume),
  score,
  fomoCount: fomoTrades.length,
  revengeCount: revengeList.length,
  overtradeCount: overtrades.length,
  panicSellCount: panicSells.length,
  oversoldBuyCount: oversoldBuys.length,
  goodSellCount: goodSells.length,
  winRate: pnlData.total > 0 ? (pnlData.winRate * 100).toFixed(0) + '%' : 'N/A',
  totalPnl: pnlData.total > 0 ? fmt(pnlData.totalPnl) : 'N/A',
  persona: persona.title,
};

const behaviorPrompt = `Bạn là chuyên gia tâm lý giao dịch crypto. Hãy viết nhận xét phân tích hành vi giao dịch cá nhân hóa bằng tiếng Việt, dựa trên dữ liệu sau (KHÔNG bịa thêm số liệu):

Trader Profile:
- Tổng giao dịch: ${rawSummary.totalTrades} (${rawSummary.buyCount} mua / ${rawSummary.sellCount} bán)
- Cặp giao dịch nhiều nhất: ${rawSummary.mostTradedPair}
- Tổng khối lượng: $${rawSummary.totalVolume}
- Điểm kỷ luật: ${rawSummary.score}/100
- Phong cách: ${rawSummary.persona}
- Lỗi FOMO (mua quá mua): ${rawSummary.fomoCount} lần
- Revenge trading: ${rawSummary.revengeCount} lần
- Overtrading: ${rawSummary.overtradeCount} lần
- Panic sell (bán đáy): ${rawSummary.panicSellCount} lần
- Mua đáy kỷ luật: ${rawSummary.oversoldBuyCount} lần
- Win rate: ${rawSummary.winRate}, P&L: $${rawSummary.totalPnl}

Viết 2-3 đoạn văn ngắn, thân thiện, có tính khích lệ nhưng thẳng thắn. Không dùng bullet list, không dùng markdown. Bắt đầu bằng nhận xét tổng quan, sau đó chỉ ra điểm mạnh và điểm cần cải thiện.`;

let evaluation: string;
const llmEvaluation = await this.aiProvider.generate(behaviorPrompt, {
  temperature: 0.6,
  maxTokens: 500,
  systemPrompt: 'Bạn là chuyên gia tâm lý giao dịch crypto. Viết tiếng Việt tự nhiên.',
});

if (llmEvaluation) {
  evaluation = llmEvaluation;
} else {
  // Fallback: giữ nguyên logic evaluation cũ
  evaluation = `Phân tích ${enriched.length} giao dịch... (Rule Engine)`;
}
```

**Step 3: Commit**
```bash
cd server && git add src/trading/behavioral-analysis.service.ts
git commit -m "feat: BehavioralAnalysisService uses LLM for personalized Vietnamese evaluation"
```

---

## Task 9: Cập nhật TradingModule — Import AiModule

**Files:**
- Modify: `server/src/trading/trading.module.ts`

**Step 1: Import AiModule để inject AiProviderService vào BehavioralAnalysisService**

```typescript
import { Module } from '@nestjs/common';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { BehavioralAnalysisService } from './behavioral-analysis.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [TradingController],
  providers: [TradingService, BehavioralAnalysisService],
  exports: [TradingService, BehavioralAnalysisService],
})
export class TradingModule {}
```

**Step 2: Commit**
```bash
cd server && git add src/trading/trading.module.ts
git commit -m "feat: TradingModule imports AiModule for AI-powered behavioral analysis"
```

---

## Task 10: Tạo Script Cài đặt Ollama tự động

**Files:**
- Create: `server/scripts/setup-ollama.sh`

**Step 1: Viết script bash cài Ollama và pull model**

```bash
#!/bin/bash
# Script cài Ollama và pull model cho VPS Linux (Ubuntu/Debian)

echo "=== OLLAMA SETUP SCRIPT ==="
echo "VPS Requirements: 4GB RAM, 2 CPU cores"
echo ""

# 1. Cài đặt Ollama
echo "[1/4] Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

# 2. Start Ollama service
echo "[2/4] Starting Ollama service..."
systemctl enable ollama
systemctl start ollama
sleep 3

# 3. Pull model siêu nhẹ (tối ưu cho 4GB RAM)
echo "[3/4] Pulling qwen2.5:1.5b model (~900MB)..."
ollama pull qwen2.5:1.5b

# 4. Pull embedding model
echo "[4/4] Pulling nomic-embed-text model (~274MB)..."
ollama pull nomic-embed-text

echo ""
echo "=== SETUP COMPLETE ==="
echo "Test: ollama run qwen2.5:1.5b 'Xin chào, bạn có thể nói tiếng Việt không?'"
echo "API: curl http://localhost:11434/api/tags"
```

**Step 2: Commit**
```bash
cd server && git add scripts/setup-ollama.sh
git commit -m "chore: add Ollama auto-setup script for VPS deployment"
```

---

## Task 11: Thêm Health Check Endpoint — Kiểm tra trạng thái AI

**Files:**
- Modify: `server/src/ai/market-analysis.controller.ts`

**Step 1: Thêm endpoint `/ai/health` kiểm tra Ollama + Gemini**

```typescript
@Get('health')
async health() {
  const ollamaAlive = await this.marketAnalysis['aiProvider']?.isOllamaAlive?.() ?? false;
  const geminiKeySet = !!process.env.GEMINI_API_KEY;
  const provider = process.env.AI_PROVIDER ?? 'auto';
  return {
    provider,
    ollama: { alive: ollamaAlive, url: process.env.OLLAMA_BASE_URL, model: process.env.OLLAMA_MODEL },
    gemini: { configured: geminiKeySet },
    activeProvider: ollamaAlive ? 'ollama' : geminiKeySet ? 'gemini' : 'rule-engine',
  };
}
```

**Step 2: Commit**
```bash
cd server && git add src/ai/market-analysis.controller.ts
git commit -m "feat: add /ai/health endpoint to check active AI provider status"
```

---

## Task 12: Verify End-to-End

**Step 1: Build kiểm tra TypeScript**
```bash
cd server && npm run build
```
Expected: Build thành công, không có lỗi TypeScript.

**Step 2: Khởi động server (không cần Ollama, test fallback)**
```bash
cd server && npm run start:dev
```
Expected: Server khởi động. Log hiện `[AUTO] Ollama failed → trying Gemini` nếu Ollama chưa chạy.

**Step 3: Test market analysis endpoint**
```bash
curl "http://localhost:3000/ai/market-analysis?symbol=BTC&coinName=Bitcoin"
```
Expected: JSON với `signal`, `detail`, `articles`.

**Step 4: Test health endpoint**
```bash
curl "http://localhost:3000/ai/health"
```
Expected: JSON với `activeProvider: "gemini"` hoặc `"ollama"` tuỳ trạng thái.

**Step 5: (Nếu Ollama đã cài) Test với Ollama**
```bash
# Terminal 1
ollama serve
# Terminal 2
curl "http://localhost:3000/ai/health"
# Expected: activeProvider: "ollama"
```

**Step 6: Commit cuối**
```bash
cd server && git add -A
git commit -m "feat: Dual AI Provider complete — Ollama local-first with Gemini fallback"
```
