// src/knowledge/vector.types.ts

export type KnowledgeSourceType =
  | 'note'
  | 'paper'
  | 'strategy'
  | 'journal'
  | 'manual';

export interface VectorMetadata {
  sourceType: KnowledgeSourceType;

  // file name hoặc id của document gốc
  sourceId: string;

  // optional – dùng khi import PDF sau này
  page?: number;

  // optional – phục vụ trading context
  symbol?: string;
  timeframe?: string;

  // để sau này filter theo topic
  tags?: string[];
}

export interface VectorDocument {
  id: string;
  content: string;
  metadata: any;
  embedding: number[]; 
}