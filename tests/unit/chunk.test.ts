import { describe, expect, it } from "vitest";
import { chunkDocument } from "@/lib/rag/chunk";

describe("chunkDocument", () => {
  it("keeps each numbered clause as its own chunk when clauses are short", () => {
    const doc = [
      "1. The security deposit is two months' rent.",
      "2. Rent is due on the 1st of each month.",
      "3. Either party may terminate with 30 days' notice.",
    ].join("\n\n");

    const chunks = chunkDocument(doc);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]?.text).toContain("security deposit");
    expect(chunks[2]?.text).toContain("terminate");
  });

  it("hard-splits a single huge paragraph with no natural breaks", () => {
    const doc = "word ".repeat(1000);
    const chunks = chunkDocument(doc);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(1800);
    }
  });

  it("assigns sequential ids and indices", () => {
    const chunks = chunkDocument("Para one.\n\nPara two.\n\nPara three.");
    chunks.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
      expect(chunk.id).toBe(`chunk-${i}`);
    });
  });

  it("returns an empty array for empty input", () => {
    expect(chunkDocument("")).toEqual([]);
  });
});
