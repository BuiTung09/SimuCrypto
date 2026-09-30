import { Injectable, OnModuleInit } from '@nestjs/common';
import { RAW_KNOWLEDGE } from './data/raw-knowledge';
import { RawKnowledge } from './data/raw-knowledge.types';
import { chunkText } from './chunking/chunker';
import { VectorDocument } from './vector/vector.types';
import { FileVectorStore } from './vector/file-vector-store';
import { EmbeddingService } from './vector/embedding.service';
import { RAG_CONFIG } from './constants/rag.constants';
import { NewsService } from './news/news.service';
import { NewsArticle } from './news/news.types';
@Injectable()
export class KnowledgeService implements OnModuleInit {

  private vectorStore = new FileVectorStore();

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly newsService: NewsService
  ) {}

  async onModuleInit() {

    console.log('--- KNOWLEDGE PIPELINE START ---');

    /**
     * STEP 1 — Load static knowledge
     */
    const rawKnowledge: RawKnowledge[] = RAW_KNOWLEDGE;

    console.log('Loaded static knowledge count:', rawKnowledge.length);

    /**
     * STEP 2 — Fetch crypto news (safe)
     */
    let newsArticles: NewsArticle[] = [];

    try {

      newsArticles = await this.newsService.fetchCryptoNews();

      console.log('News fetched:', newsArticles.length);

    } catch (err) {

      console.log('News fetch failed → skip news');

      newsArticles = [];

    }

    /**
     * STEP 3 — Convert news → RawKnowledge format
     */
    const newsKnowledge: RawKnowledge[] = newsArticles.map(
      (article, index): RawKnowledge => ({
        id: `news-${index}`,

        title: article.title,

        source: article.source?.name,

        domain: 'trading',

        category: 'research_paper',

        level: 'beginner',

        tags: ['crypto', 'news', 'market'],

        version: 1,

        content: `
      Title: ${article.title}

      Description: ${article.description ?? ''}

      Content: ${article.content ?? ''}

      Source: ${article.source?.name ?? ''}

      Published: ${article.publishedAt}
`,
      }),
    );

    /**
     * STEP 4 — Merge static knowledge + news
     */
    const rawItems: RawKnowledge[] = [
      ...rawKnowledge,
      ...newsKnowledge,
    ];

    console.log('Total knowledge items:', rawItems.length);

    /**
     * STEP 5 — Chunk → Embed → Vector Store
     */

    const vectorDocs: VectorDocument[] = [];

    const existingVectors = this.vectorStore.getAll();

    console.log('Existing vectors:', existingVectors.length);

    for (const item of rawItems) {

      const chunks = chunkText(item.content, {
        chunkSize: 1500,
        overlap: 200,
      });

      console.log(`Item ${item.id} chunk count:`, chunks.length);

      for (let i = 0; i < chunks.length; i++) {

        const chunk = chunks[i];

        const id = `${item.id}-chunk-${i}`;

        /**
         * Skip nếu vector đã tồn tại
         */
        const exists = existingVectors.some(v => v.id === id);

        if (exists) {
          continue;
        }

        try {

          const embedding = await this.embeddingService.embed(chunk);

          vectorDocs.push({
            id,
            content: chunk,
            metadata: {
              sourceType: 'knowledge',
              sourceId: item.id,
              tags: [
                ...item.tags,
                item.domain,
                item.category,
                item.level,
              ],
            },
            embedding,
          });

        } catch (err) {

          console.log('Embedding failed for chunk:', id);

        }

      }
    }

    /**
     * Save vectors
     */
    if (vectorDocs.length > 0) {

      this.vectorStore.addDocuments(vectorDocs);

      console.log('New vectors added:', vectorDocs.length);

    }

    /**
     * DEBUG INFO
     */

    const allVectors = this.vectorStore.getAll();

    console.log(
      'Total vector documents:',
      allVectors.length,
    );

    if (allVectors.length > 0) {

      console.log(
        'Embedding dimension:',
        allVectors[0].embedding.length,
      );

      console.log(
        'Sample vector:',
        {
          id: allVectors[0].id,
          contentPreview: allVectors[0].content.slice(0, 150)
        }
      );

    }

    console.log('--- KNOWLEDGE PIPELINE END ---');
  }

  /**
   * RAG HYBRID SEARCH (Vector Similarity + Accent-Insensitive Keyword Boosting)
   */
  async search(query: string, topK = RAG_CONFIG.TOP_K) {
    let queryEmbedding: number[] = [];
    let vectorResults: any[] = [];

    // 1. Thử lấy kết quả Vector Similarity (nếu AI online)
    try {
      queryEmbedding = await this.embeddingService.embed(query);
      vectorResults = this.vectorStore.similaritySearch(queryEmbedding, topK * 3);
    } catch (err: any) {
      console.warn('[RAG SEARCH] Vector lookup failed, falling back to pure keyword search:', err.message);
    }

    // 2. Lấy toàn bộ tài liệu tĩnh + tin tức hiện có để đối chiếu
    const rawItems: RawKnowledge[] = RAW_KNOWLEDGE;

    // Chuẩn hóa từ khóa: bỏ dấu tiếng Việt, viết thường
    const normalizeText = (text: string) => {
      if (!text) return '';
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd');
    };

    const normalizedQuery = normalizeText(query);
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.trim().length > 1);

    // 3. Tính điểm Hybrid Score (Vector Score + Keyword Overlap Boost)
    const scoredItems = rawItems.map(item => {
      // Tìm xem document này có trong kết quả vector không
      const matchingVector = vectorResults.find(v => v.doc.id.startsWith(item.id));
      let vectorScore = matchingVector ? matchingVector.score : 0;

      const normalizedTitle = normalizeText(item.title);
      const normalizedContent = normalizeText(item.content);

      let keywordScore = 0;
      for (const word of queryWords) {
        // Tiêu đề chứa từ khóa → Tăng điểm cực mạnh (+2.5)
        if (normalizedTitle.includes(word)) {
          keywordScore += 2.5;
        }
        // Thẻ tags chứa từ khóa → Tăng điểm mạnh (+1.5)
        if (item.tags.some(tag => normalizeText(tag).includes(word))) {
          keywordScore += 1.5;
        }
        // Nội dung chứa từ khóa → Điểm cộng nhẹ (+0.2)
        if (normalizedContent.includes(word)) {
          keywordScore += 0.2;
        }
      }

      // Điểm tổng hợp Hybrid
      const finalScore = vectorScore + (keywordScore > 0 ? 0.3 + (keywordScore * 0.2) : 0);

      return {
        doc: {
          content: item.content,
          id: item.id,
          metadata: {
            sourceId: item.id,
            sourceType: 'knowledge',
            tags: item.tags,
          }
        },
        score: finalScore,
      };
    });

    // 4. Sắp xếp và trích xuất topK
    scoredItems.sort((a, b) => b.score - a.score);
    const filtered = scoredItems.slice(0, topK);

    console.log('--- HYBRID SEARCH DEBUG ---');
    console.log('Query:', query);
    filtered.forEach((r, i) => {
      console.log(`Result ${i + 1} [ID: ${r.doc.id}] Score: ${r.score.toFixed(3)}`);
      console.log(r.doc.content.slice(0, 150).replace(/\s+/g, ' ').trim() + '...');
      console.log('---------------------------');
    });

    return filtered.map(r => ({
      doc: { content: r.doc.content },
      metadata: r.doc.metadata,
      score: r.score,
    }));
  }

  /**
   * Debug vector store
   */
  getAllVectors() {

    return this.vectorStore.getAll();

  }

}

export interface SearchResult {
  doc: {
    content: string;
  };
  metadata: {
    sourceId: string;
    sourceType: string;
    tags?: string[];
  };
  score?: number;
}