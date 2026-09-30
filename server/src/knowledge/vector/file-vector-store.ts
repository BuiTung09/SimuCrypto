import * as fs from 'fs';
import * as path from 'path';
import { VectorDocument } from './vector.types';
import { cosineSimilarity } from './math';

export class FileVectorStore {

  private filePath = path.join(process.cwd(), 'vectors.json');
  private docs: VectorDocument[] = [];

  constructor() {
    this.load();
  }

  private load() {

    if (!fs.existsSync(this.filePath)) {
      this.docs = [];
      return;
    }

    const raw = fs.readFileSync(this.filePath, 'utf-8');
    this.docs = JSON.parse(raw);
  }

  private save() {
    fs.writeFileSync(
      this.filePath,
      JSON.stringify(this.docs, null, 2),
    );
  }

  addDocuments(docs: VectorDocument[]) {

    this.docs.push(...docs);

    this.save();
  }

  similaritySearch(queryEmbedding: number[], topK = 5) {

    const scored = this.docs.map(doc => ({
      doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, topK);
  }

  getAll() {
    return this.docs;
  }
}