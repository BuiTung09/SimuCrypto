// src/knowledge/data/raw-knowledge.types.ts

export type KnowledgeDomain =
  | 'blockchain'
  | 'defi'
  | 'trading'
  | 'macro'
  | 'psychology';

export type KnowledgeCategory =
  | 'theory'
  | 'strategy'
  | 'indicator'
  | 'risk_management'
  | 'case_study'
  | 'research_paper';

export type KnowledgeLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced';

export interface RawKnowledge {
  id: string;

  title: string;
  source?: string;        // tên paper / sách / blog
  author?: string;
  publishedYear?: number;

  domain: KnowledgeDomain;
  category: KnowledgeCategory;

  level: KnowledgeLevel;

  tags: string[];

  version: number;

  content: string;
}