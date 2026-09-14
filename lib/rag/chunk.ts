export interface Chunk {
  id: string;
  index: number;
  text: string;
}

const TARGET_CHUNK_SIZE = 900;

// Matches common clause/paragraph numbering styles at the start of a
// line, e.g. "4.", "4.2", "4.2.1)", "(a)". Anchored and bounded —
// no nested quantifiers — so it stays linear-time on adversarial input.
const CLAUSE_MARKER = /^\s*(\d{1,3}(\.\d{1,3}){0,3}[.)]|\([a-z]\))\s+/;

/**
 * Splits document text into chunks the AI SDK's embedding calls and
 * agents can work with individually. Prefers to break on paragraph
 * boundaries and detected clause numbering so a chunk tends to hold
 * one coherent clause rather than an arbitrary character slice —
 * that matters because every citation an agent produces is checked
 * against a chunk's exact text later in the pipeline.
 */
export function chunkDocument(text: string): Chunk[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const startsNewClause = CLAUSE_MARKER.test(paragraph);
    const wouldOverflow = current.length + paragraph.length > TARGET_CHUNK_SIZE;

    if (current && (startsNewClause || wouldOverflow)) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  // A document with no blank-line paragraph breaks at all (common in
  // PDF text extraction) falls through as one giant "paragraph" — in
  // that case, hard-split on size so downstream agents still get
  // bounded inputs.
  const final: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= TARGET_CHUNK_SIZE * 2) {
      final.push(chunk);
      continue;
    }
    for (let i = 0; i < chunk.length; i += TARGET_CHUNK_SIZE) {
      final.push(chunk.slice(i, i + TARGET_CHUNK_SIZE));
    }
  }

  return final.map((chunkText, index) => ({
    id: `chunk-${index}`,
    index,
    text: chunkText,
  }));
}
