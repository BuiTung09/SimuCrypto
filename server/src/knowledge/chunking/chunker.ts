export interface ChunkOptions {
  chunkSize: number;
  overlap?: number;
}

export function chunkText(
  text: string,
  options: { chunkSize?: number; overlap?: number } = {},
): string[] {

  const chunkSize = options.chunkSize ?? 1200;

  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {

    if ((currentChunk + paragraph).length < chunkSize) {
      currentChunk += paragraph + '\n\n';
    } else {

      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }

      currentChunk = paragraph + '\n\n';
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}