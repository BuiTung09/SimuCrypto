import { Injectable } from '@nestjs/common';
import { PriceStrategy } from './price.strategy';
import { KnowledgeStrategy } from './knowledge.strategy';
import { OutOfScopeStrategy } from './outofscope.strategy';
import { LlmService } from '../../knowledge/llm.service';
import { GEMINI_TOOLS } from '../tools';
import { extractSymbol } from '../utils/symbol-extractor';
import { normalizeVietnamese } from '../utils/normalize';
import { detectPriceTimeIntent } from '../utils/time-intent';

@Injectable()
export class ChatOrchestratorService {

  private conversationHistory: any[] = [];
  private answerCache = new Map<string, string>();

  // nhớ coin trong hội thoại
  private currentSymbol: string | null = null;

  constructor(
    private priceStrategy: PriceStrategy,
    private knowledgeStrategy: KnowledgeStrategy,
    private outOfScopeStrategy: OutOfScopeStrategy,
    private llmService: LlmService,
  ) { }

  async handle(message: string): Promise<string> {
    const normalizedMessage = normalizeVietnamese(message);
    const cacheKey = normalizedMessage;

    if (this.answerCache.has(cacheKey)) {
      return this.answerCache.get(cacheKey)!;
    }

    this.conversationHistory.push({
      role: 'user',
      content: message,
    });

    if (this.conversationHistory.length > 20) {
      this.conversationHistory.shift();
    }

    // ===============================
    // 🕵️ CREATOR INTENT DETECTOR (Easter Egg: Triển là người tạo ra)
    // ===============================
    const messageLower = normalizedMessage.toLowerCase();
    const isWhoCreatedQuery =
      messageLower.includes('ai tao') ||
      messageLower.includes('ai lap trinh') ||
      messageLower.includes('ai thiet ke') ||
      messageLower.includes('ai viet ra') ||
      messageLower.includes('ai code') ||
      messageLower.includes('ai lam ra') ||
      messageLower.includes('ai sang lap') ||
      messageLower.includes('creator') ||
      messageLower.includes('tac gia') ||
      messageLower.includes('nguoi sang lap') ||
      messageLower.includes('nguoi tao ra');

    const isTrienMention = messageLower.includes('trien');

    const isAboutThisSite =
      messageLower.includes('SimuCryto') ||
      messageLower.includes('web nay') ||
      messageLower.includes('web nay') ||
      messageLower.includes('trang web') ||
      messageLower.includes('he thong') ||
      messageLower.includes('app nay') ||
      messageLower.includes('co phai la nguoi tao') ||
      messageLower.includes('co phai nguoi tao') ||
      messageLower.includes('phai nguoi tao') ||
      messageLower.includes('tao ra web') ||
      messageLower.includes('tao ra app');

    if (
      (isWhoCreatedQuery && isAboutThisSite) ||
      (isTrienMention && isAboutThisSite) ||
      (isTrienMention && isWhoCreatedQuery)
    ) {
      const creatorAnswer = "Người tạo ra SimuCryto và phát triển trang web này chính là Triển trúc tru và Vinh tham nhũng! 2 bựa nhân này đã thiết kế và lập trình hệ thống nền tảng học tập và giả lập giao dịch này. 🚀";
      this.conversationHistory.push({
        role: 'assistant',
        content: creatorAnswer,
      });
      this.answerCache.set(cacheKey, creatorAnswer);
      return creatorAnswer;
    }

    // ===============================
    // 🌸 EASTER EGG: XINH / ĐẸP TRAI (Chốt chặn 100% chống lỗi chữ Đ)
    // ===============================
    const lowerOrig = message.toLowerCase();
    const isComplimentIntent =
      lowerOrig.includes('xinh') ||
      lowerOrig.includes('đẹp') ||
      lowerOrig.includes('dep') ||
      lowerOrig.includes('dễ thương') ||
      lowerOrig.includes('de thuong') ||
      lowerOrig.includes('cute');

    const isQuestionIntent =
      lowerOrig.includes('không') ||
      lowerOrig.includes('khong') ||
      lowerOrig.includes('ko') ||
      lowerOrig.includes('k');

    if (isComplimentIntent && isQuestionIntent) {
      let compliments: string[] = [];
      const isMaleQuery = lowerOrig.includes('dep trai') || lowerOrig.includes('đẹp trai');
      const isFemaleQuery = lowerOrig.includes('xinh') || lowerOrig.includes('dep gai') || lowerOrig.includes('đẹp gái');

      if (isMaleQuery) {
        compliments = [
          "Có chứ! Trong mắt tôi bạn là người siêu cấp đẹp trai và phong độ nhất luôn! 😎 Chúc bạn một ngày giao dịch thật nhiều may mắn nhé!",
          "Chắc chắn là CÓ rồi! Vừa đẹp trai vừa am hiểu crypto thế này thì giao dịch kiểu gì cũng thắng lớn! 🚀",
          "Có chứ, phong độ ngời ngời luôn! Cười lên một cái cho ngày mới giao dịch thật rực rỡ nào! 👨‍💼✨"
        ];
      } else if (isFemaleQuery) {
        compliments = [
          "Có chứ! Bạn cực kỳ xinh đẹp, quý phái và dễ thương luôn! 🥰 Chúc bạn một ngày giao dịch gặt hái thật nhiều lợi nhuận nhé!",
          "Chắc chắn là CÓ rồi! Bạn vừa xinh đẹp vừa thông minh thế này thì giao dịch kiểu gì cũng thắng lớn! 🚀",
          "Có chứ, siêu cấp xinh đẹp ngọc ngà luôn! Chúc nàng một ngày mới tràn đầy niềm vui và may mắn nha! 🌸✨"
        ];
      } else {
        compliments = [
          "Có chứ! Bạn cực kỳ dễ thương và đáng yêu luôn! 🥰 Chúc bạn một ngày giao dịch thật nhiều may mắn và ngập tràn niềm vui nhé!",
          "Chắc chắn là CÓ rồi! Bạn vừa đáng yêu vừa thông minh thế này thì giao dịch kiểu gì cũng thắng lớn! 🚀",
          "Có chứ, siêu cấp dễ thương luôn! Cười lên một cái cho ngày mới thật rực rỡ nào! 😊✨"
        ];
      }

      const randomCompliment = compliments[Math.floor(Math.random() * compliments.length)];

      this.conversationHistory.push({
        role: 'assistant',
        content: randomCompliment,
      });
      this.answerCache.set(cacheKey, randomCompliment);
      return randomCompliment;
    }

    // ===============================
    // 3️⃣ SYMBOL DETECTION
    // ===============================

    const detectedSymbol = extractSymbol(message);
    // nếu user chỉ nhập coin symbol → mặc định hỏi giá
    const isOnlySymbol =
      detectedSymbol &&
      normalizedMessage.trim() === detectedSymbol.toLowerCase();
    if (detectedSymbol) {
      this.currentSymbol = detectedSymbol;
    }

    // ===============================
    // 4️⃣ TIME INTENT
    // ===============================

    const timeIntent = detectPriceTimeIntent(message);

    // ===============================
    // 5️⃣ PRICE INTENT DETECTION
    // ===============================

    const hasDate = /\d{1,2}\/\d{1,2}\/\d{4}/.test(message);

    const needPrice =
      detectedSymbol &&
      (
        isOnlySymbol ||
        normalizedMessage.includes('gia') ||
        normalizedMessage.includes('bao nhieu') ||
        normalizedMessage.includes('hien tai') ||
        normalizedMessage.includes('hom nay') ||
        normalizedMessage.includes('hom qua') ||
        normalizedMessage.includes('dong cua') ||
        normalizedMessage.includes('price') ||
        hasDate
      );

    const needKnowledge =
      normalizedMessage.includes('la gi') ||
      normalizedMessage.includes('giai thich');

    // ===============================
    // 6️⃣ FAST PRICE PATH
    // ===============================

    if (needPrice) {

      const symbol = detectedSymbol;

      if (!symbol) {
        return 'Bạn vui lòng cung cấp tên coin (BTC, ETH, SOL...)';
      }

      try {

        const result = await this.priceStrategy.execute(
          symbol,
          timeIntent
        );

        this.answerCache.set(cacheKey, result);

        return result;

      } catch (error) {

        return 'Không thể lấy dữ liệu giá lúc này.';

      }
    }

    // ===============================
    // 7️⃣ FAST KNOWLEDGE PATH
    // ===============================

    if (needKnowledge) {

      const result = await this.knowledgeStrategy.execute(message);

      this.answerCache.set(cacheKey, result);

      return result;

    }

    // ===============================
    // 8️⃣ AGENT TOOL DECISION
    // ===============================

    const toolDecisionMessages = [
      {
        role: 'system',
        content: `
You are SimuCryto AI.

You MUST decide which tool to call.

TOOLS:

get_price
Use when the user asks about:
• crypto price
• today price
• historical price
• "bao nhiêu"
• "giá"
• "hôm nay"
• "hôm qua"
• specific date

search_knowledge
Use when the user asks about:
• definition
• explanation
• mechanism
• "là gì"
• "giải thích"

CRITICAL RULES:

If crypto symbol appears AND user implies price → call get_price.

Do NOT answer price directly.

Prefer tool calls when possible.
`,
      },
      {
        role: 'user',
        content: message,
      },
    ];

    let response;
    try {
      response = await this.llmService.generateWithTools(
        toolDecisionMessages,
        GEMINI_TOOLS,
      );

      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const functionCallPart = parts.find(p => p.functionCall);

      // ===============================
      // 9️⃣ TOOL EXECUTION
      // ===============================
      if (functionCallPart?.functionCall) {
        const { name, args } = functionCallPart.functionCall;
        console.log('FUNCTION CALL:', name, args);
        let toolResult = '';

        if (name === 'get_price') {
          const symbol =
            extractSymbol(args.query) ||
            extractSymbol(message) ||
            this.currentSymbol;

          if (!symbol) {
            toolResult = 'Bạn vui lòng cung cấp tên coin (BTC, ETH, SOL...)';
          } else {
            this.currentSymbol = symbol;
            const timeIntent = detectPriceTimeIntent(args.query || message);
            toolResult = await this.priceStrategy.execute(
              symbol,
              timeIntent
            );
          }
        }

        if (name === 'search_knowledge') {
          toolResult = await this.knowledgeStrategy.execute(args.query);
        }

        this.conversationHistory.push({
          role: 'assistant',
          content: toolResult,
        });

        this.answerCache.set(cacheKey, toolResult);
        return toolResult;
      }

      // ===============================
      // 🔟 DIRECT LLM RESPONSE
      // ===============================
      const textPart = parts.find(p => p.text);
      const directText =
        textPart?.text || 'Xin lỗi, tôi chưa hiểu câu hỏi.';

      this.conversationHistory.push({
        role: 'assistant',
        content: directText,
      });

      this.answerCache.set(cacheKey, directText);
      return directText;

    } catch (error) {
      console.warn('⚠️ Gemini rate limit / error, switching to rule-based offline search:', error.message);

      const messageLower = normalizedMessage.toLowerCase();
      // Fallback 1: Trực tiếp tìm kiếm RAG cục bộ nếu liên quan kiến thức
      if (
        messageLower.includes('la gi') ||
        messageLower.includes('giai thich') ||
        messageLower.includes('blockchain') ||
        messageLower.includes('bitcoin') ||
        messageLower.includes('crypto')
      ) {
        try {
          return await this.knowledgeStrategy.execute(message);
        } catch (e) {
          // ignore and fall through
        }
      }

      // Fallback 2: Trực tiếp lấy giá nếu có symbol
      const symbol = extractSymbol(message) || this.currentSymbol;
      if (symbol) {
        try {
          return await this.priceStrategy.execute(symbol, detectPriceTimeIntent(message));
        } catch (e) {
          // ignore
        }
      }

      return 'Hệ thống AI hiện đang quá tải. Bạn có thể hỏi về giá coin (ví dụ: "BTC") hoặc các khái niệm blockchain để tôi tra cứu thư viện nhé!';
    }
  }
}