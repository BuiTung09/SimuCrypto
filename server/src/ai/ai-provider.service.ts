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
  private readonly groqKey = process.env.GROQ_API_KEY ?? '';

  /** Sinh text: Groq → Gemini → null */
  async generate(prompt: string, options: GenerateOptions = {}): Promise<string | null> {
    if (this.provider === 'gemini') return this.tryGemini(prompt, options);
    if (this.provider === 'groq') return this.tryGroq(prompt, options);
    if (this.provider === 'ollama') return this.tryOllama(prompt, options);

    // auto: Ưu tiên Groq trực tuyến (Zero-RAM, siêu nhanh)
    const groqResult = await this.tryGroq(prompt, options);
    if (groqResult !== null) return groqResult;

    // Nếu Groq lỗi, dùng Gemini làm chốt chặn
    this.logger.warn('[AUTO] Groq unavailable → trying Gemini');
    const geminiResult = await this.tryGemini(prompt, options);
    if (geminiResult !== null) return geminiResult;

    // Tắt hoàn toàn Ollama khỏi luồng auto để tiết kiệm RAM server
    return null;
  }

  /** Tạo embedding: Gemini Embedding (tiết kiệm RAM) */
  async embed(text: string): Promise<number[] | null> {
    // Chế độ auto/gemini/groq đều đẩy sang Gemini để tính toán embedding trên Cloud
    if (this.provider !== 'ollama') {
      const geminiEmbed = await this.tryGeminiEmbed(text);
      if (geminiEmbed !== null) return geminiEmbed;
      this.logger.warn('[EMBED] Gemini embed failed.');
    }
    
    // Chỉ chạy Ollama nếu người dùng cấu hình cứng (provider === 'ollama')
    if (this.provider === 'ollama') {
       return this.tryOllamaEmbed(text);
    }
    return null;
  }

  /** Kiểm tra Ollama có đang chạy không (timeout 2s) */
  async isOllamaAlive(): Promise<boolean> {
    try {
      const res = await fetch(`${this.ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  getProviderName(): string {
    return this.provider;
  }

  getOllamaModel(): string {
    return this.ollamaModel;
  }

  // ─────────────────────── Private Helpers ────────────────────────

  private async tryOllama(prompt: string, options: GenerateOptions): Promise<string | null> {
    try {
      const messages: Array<{ role: string; content: string }> = [];
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
      const text: string | undefined = data?.message?.content?.trim();
      if (!text) return null;

      this.logger.log(`[OLLAMA] OK — ${text.length} chars (model: ${this.ollamaModel})`);
      return text;
    } catch (e: any) {
      this.logger.warn(`[OLLAMA] Error: ${e?.message ?? String(e)}`);
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
      const text: string | undefined =
        data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) return null;

      this.logger.log(`[GEMINI] OK — ${text.length} chars`);
      return text;
    } catch (e: any) {
      this.logger.warn(`[GEMINI] Error: ${e?.message ?? String(e)}`);
      return null;
    }
  }

  private async tryGroq(prompt: string, options: GenerateOptions): Promise<string | null> {
    if (!this.groqKey) return null;
    const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

    try {
      const messages: Array<{ role: string; content: string }> = [];
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 1024,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        this.logger.warn(`[GROQ] HTTP ${res.status}`);
        return null;
      }

      const data = await res.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content?.trim();
      if (!text) return null;

      this.logger.log(`[GROQ] OK — ${text.length} chars (model: ${model})`);
      return text;
    } catch (e: any) {
      this.logger.warn(`[GROQ] Error: ${e?.message ?? String(e)}`);
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
      const embedding: number[] | undefined = data?.embedding;
      return embedding ?? null;
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
