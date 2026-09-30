import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { MarketAnalysisService } from './market-analysis.service';
import { AiProviderService } from './ai-provider.service';

@Controller('ai')
export class MarketAnalysisController {
  constructor(
    private readonly marketAnalysis: MarketAnalysisService,
    private readonly aiProvider: AiProviderService,
  ) {}

  @Get('market-analysis')
  async analyze(
    @Query('symbol') symbol: string,
    @Query('coinName') coinName: string,
    @Query('refresh') refresh?: string,
  ) {
    if (!symbol) {
      throw new BadRequestException('symbol query param is required');
    }
    const isRefresh = refresh === 'true';
    return this.marketAnalysis.analyze(
      symbol.toUpperCase(),
      coinName || symbol.toUpperCase(),
      isRefresh,
    );
  }

  /**
   * GET /ai/health
   * Kiểm tra trạng thái AI Provider đang hoạt động
   */
  @Get('health')
  async health() {
    const ollamaAlive = await this.aiProvider.isOllamaAlive();
    const geminiKeySet = !!process.env.GEMINI_API_KEY;
    const groqKeySet = !!process.env.GROQ_API_KEY;
    const provider = this.aiProvider.getProviderName();
    const ollamaModel = this.aiProvider.getOllamaModel();

    let activeProvider: string;
    if (provider === 'ollama') {
      activeProvider = ollamaAlive ? 'ollama' : 'unavailable';
    } else if (provider === 'gemini') {
      activeProvider = geminiKeySet ? 'gemini' : 'unavailable';
    } else if (provider === 'groq') {
      activeProvider = groqKeySet ? 'groq' : 'unavailable';
    } else {
      // auto mode: Ollama -> Groq -> Gemini -> rule-engine
      activeProvider = ollamaAlive 
        ? 'ollama' 
        : groqKeySet 
          ? 'groq' 
          : geminiKeySet 
            ? 'gemini' 
            : 'rule-engine';
    }

    return {
      status: 'ok',
      configuredProvider: provider,
      activeProvider,
      ollama: {
        alive: ollamaAlive,
        url: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
        model: ollamaModel,
        embedModel: process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text',
      },
      groq: {
        configured: groqKeySet,
        model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
      },
      gemini: {
        configured: geminiKeySet,
      },
    };
  }
}
