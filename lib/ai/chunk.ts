export type Chunk = {
  content: string;
  metadata: { page: number; chunkIndex: number };
};

const CHARS_PER_CHUNK = 2000; // ~500 tokens
const OVERLAP_CHARS = 200; // ~50 tokens of overlap

/** Split extracted pages into overlapping chunks, tracking page + index. */
export function chunkPages(pages: { page: number; text: string }[]): Chunk[] {
  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const { page, text } of pages) {
    // split on paragraph boundaries first, then pack to size
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    let buffer = "";

    const flush = () => {
      if (!buffer.trim()) return;
      chunks.push({
        content: buffer.trim(),
        metadata: { page, chunkIndex: chunkIndex++ },
      });
      // start next buffer with the tail of this one (overlap)
      buffer = buffer.slice(-OVERLAP_CHARS);
    };

    for (const para of paragraphs) {
      if (buffer.length + para.length > CHARS_PER_CHUNK) flush();
      buffer += (buffer ? "\n\n" : "") + para;
      // a single giant paragraph: hard-split it
      while (buffer.length > CHARS_PER_CHUNK) {
        chunks.push({
          content: buffer.slice(0, CHARS_PER_CHUNK),
          metadata: { page, chunkIndex: chunkIndex++ },
        });
        buffer = buffer.slice(CHARS_PER_CHUNK - OVERLAP_CHARS);
      }
    }
    flush();
  }

  return chunks;
}
