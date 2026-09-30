// src/knowledge/vector/in-memory.vector-store.ts

import type { VectorDocument } from './vector.types';
import { cosineSimilarity } from './math';
import { RAG_CONFIG } from '../constants/rag.constants';

export class InMemoryVectorStore {
  private documents: VectorDocument[] = [];

  addDocuments(docs: VectorDocument[]) {
    this.documents.push(...docs);
  }

  getAll() {
    return this.documents;
  }

  similaritySearch(queryEmbedding: number[], topK = RAG_CONFIG.TOP_K) {
    const scored = this.documents.map((doc) => ({
      doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }
}