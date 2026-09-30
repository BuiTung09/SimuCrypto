import { Injectable } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { LlmService } from './llm.service';
import { RAG_CONFIG } from './constants/rag.constants';

@Injectable()
export class RagService {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly llmService: LlmService,
  ) {}

  async ask(query: string) {

    /**
     * STEP 1 — Vector Search
     */
    const searchResults = await this.knowledgeService.search(query);

    if (!searchResults.length) {
      return {
        answer: "Không tìm thấy thông tin trong dữ liệu.",
        confidence: 0,
        sources: [],
      };
    }

    /**
     * STEP 2 — Build Context
     */
    let context = searchResults
      .map(r => r.doc.content)
      .join("\n\n")
      .slice(0, 4000);

    console.log('========== RAG DEBUG ==========');
    console.log('Query:', query);
    console.log('Search results count:', searchResults.length);
    console.log('Context length:', context.length);
    console.log('================================');

    if (context.length < RAG_CONFIG.MIN_CONTEXT_LENGTH) {
      return {
        answer: "Không tìm thấy thông tin trong dữ liệu.",
        confidence: 0,
        sources: [],  
      };
    }
    console.log("========== RAG DEBUG ==========");
    console.log("Query:", query);
    console.log("Search results count:", searchResults.length);
    console.log("Context length:", context.length);
    console.log("Context preview:", context.slice(0, 500));
    console.log("================================");

    /**
     * STEP 3 — Prompt
     */
    const prompt = `
    Bạn là chuyên gia blockchain và crypto.

    Hãy trả lời câu hỏi của người dùng dựa trên thông tin trong CONTEXT.

    Nếu context có thông tin liên quan thì hãy sử dụng nó để giải thích.

    Nếu context không hoàn toàn đầy đủ, bạn vẫn có thể suy luận dựa trên kiến thức chung về blockchain.

    Quy tắc trả lời:
    - Viết bằng tiếng Việt đơn giản, dễ hiểu.
    - Không dùng markdown.
    - Không dùng ký hiệu như #, *, -, **.
    - Không kẻ bảng.
    - Không viết danh sách bullet.
    - Viết thành các đoạn văn ngắn.
    - Trả lời trực tiếp vào nội dung câu hỏi.

    CONTEXT:
    ${context}

    QUESTION:
    ${query}

    Trả lời:
    `;

    /**
     * STEP 4 — LLM
     */
    let answer = await this.llmService.generate(prompt, {
      temperature: 0.2,
      maxTokens: 4000,
    });

    // Nếu cả 2 AI đều lỗi (Ollama offline, Gemini 429 rate limit)
    if (!answer || answer.includes('tạm thời không khả dụng')) {
      console.log('⚠️ Cả hai AI đều lỗi, kích hoạt hệ thống tự động trích xuất tri thức cục bộ...');
      const bestMatch = searchResults[0]?.doc?.content;
      if (bestMatch) {
        answer = `${bestMatch}\n\n(Lưu ý: Hệ thống đang tạm thời hiển thị dữ liệu gốc từ thư viện tri thức do máy chủ AI trực tuyến đang quá tải).`;
      } else {
        answer = 'Xin lỗi, tôi hiện đang gặp khó khăn khi kết nối với máy chủ AI và không tìm thấy tài liệu phù hợp trong thư viện.';
      }
    }

    console.log("LLM ANSWER:", answer);

    /**
     * STEP 5 — Confidence
     */
    const avgScore =
      searchResults.reduce((sum, r) => sum + r.score, 0) /
      searchResults.length;

    /**
     * STEP 6 — Unique Sources
     */
    const uniqueSources = new Map();

    for (const r of searchResults) {
      uniqueSources.set(r.metadata.sourceId, r.metadata);
    }

    return {
      answer,
      confidence: Number(avgScore.toFixed(3)),
      sources: Array.from(uniqueSources.values()),
    };
  }
}