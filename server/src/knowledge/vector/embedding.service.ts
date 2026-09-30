import { Injectable } from '@nestjs/common';
import { AiProviderService } from '../../ai/ai-provider.service';

@Injectable()
export class EmbeddingService {
  private embeddingCache = new Map<string, number[]>();
  private apiCallCount = 0;
  private vectorDimension: number | null = null;

  constructor(private readonly aiProvider: AiProviderService) {}

  async embed(text: string): Promise<number[]> {
    if (!text?.trim()) {
      throw new Error('Cannot embed empty text');
    }

    const normalized = text.trim().toLowerCase();

    if (this.embeddingCache.has(normalized)) {
      console.log('⚡ EMBEDDING CACHE HIT');
      return this.embeddingCache.get(normalized)!;
    }

    console.log('🤖 CALLING AI EMBEDDING');
    this.apiCallCount++;
    console.log('API CALL COUNT:', this.apiCallCount);

    const embedding = await this.aiProvider.embed(normalized);

    if (!embedding || embedding.length === 0) {
      throw new Error('Embedding failed from all providers (Ollama + Gemini)');
    }

    if (!this.vectorDimension) {
      this.vectorDimension = embedding.length;
      console.log('📏 Embedding dimension:', this.vectorDimension);
    }

    this.embeddingCache.set(normalized, embedding);
    return embedding;
  }

  getCacheSize(): number {
    return this.embeddingCache.size;
  }

  getApiCallCount(): number {
    return this.apiCallCount;
  }
}