import { extractText, getDocumentProxy } from "unpdf";

/**
 * `pdf-parse` depends on `pdfjs-dist`'s optional native canvas
 * bindings, which fail to build in Vercel's serverless runtime.
 * `unpdf` ships a pure-JS, serverless-targeted build of PDF.js
 * instead, so it's the only one of the two that actually works after
 * deployment rather than only in local dev.
 */

const MAX_PAGES = 40;
const EXTRACTION_TIMEOUT_MS = 20_000;

export class PdfTooLargeError extends Error {
  constructor(pageCount: number) {
    super(
      `This PDF has ${pageCount} pages. To keep processing time and cost bounded, this demo only handles documents up to ${MAX_PAGES} pages.`,
    );
    this.name = "PdfTooLargeError";
  }
}

export class PdfExtractionTimeoutError extends Error {
  constructor() {
    super("Extracting text from this PDF took too long and was cancelled.");
    this.name = "PdfExtractionTimeoutError";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new PdfExtractionTimeoutError()), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

/**
 * Extracts plain text from an untrusted PDF buffer.
 *
 * Per unpdf's own security guidance for untrusted input, this checks
 * the page count before doing any extraction work and wraps the
 * whole operation in a timeout — we never call the image-decoding
 * APIs at all, so the `maxImageSize` concern in their docs doesn't
 * apply to a text-only pipeline like this one.
 */
export async function extractTextFromPdf(
  buffer: ArrayBuffer,
): Promise<{ text: string; pageCount: number }> {
  const run = async () => {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    try {
      if (pdf.numPages > MAX_PAGES) {
        throw new PdfTooLargeError(pdf.numPages);
      }
      const { text } = await extractText(pdf, { mergePages: true });
      return { text, pageCount: pdf.numPages };
    } finally {
      // pdf.js's newer API exposes `cleanup()`, not `destroy()`, for
      // releasing a document's resources on both the main and worker
      // threads once you're done with it.
      await pdf.cleanup();
    }
  };

  return withTimeout(run(), EXTRACTION_TIMEOUT_MS);
}
