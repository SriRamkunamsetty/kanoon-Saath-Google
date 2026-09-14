import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AnalyzeTextRequestSchema } from "@/lib/schemas";
import { runAnalysisPipeline } from "@/lib/ai/pipeline";
import { extractTextFromPdf, PdfExtractionTimeoutError, PdfTooLargeError } from "@/lib/pdf/extract";
import { checkRateLimit } from "@/lib/ratelimit";

// Node runtime: PDF parsing and the multi-call AI pipeline both need
// more time and a fuller Node API surface than the Edge runtime
// budgets for.
export const runtime = "nodejs";
export const maxDuration = 60;

function clientIdentifier(request: NextRequest): string {
  // Standard header set by Vercel's edge network; falls back to a
  // shared bucket in local dev where it isn't present.
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local-dev";
}

export async function POST(request: NextRequest) {
  const identifier = clientIdentifier(request);
  const { success, remaining } = await checkRateLimit(identifier);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(remaining) } },
    );
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let rawText: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json(
          { error: "Expected a 'file' field in the form data." },
          { status: 400 },
        );
      }
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: "File is larger than the 10MB limit for this demo." },
          { status: 413 },
        );
      }

      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const buffer = await file.arrayBuffer();
        const { text } = await extractTextFromPdf(buffer);
        rawText = text;
      } else {
        rawText = await file.text();
      }
    } else {
      const body = AnalyzeTextRequestSchema.parse(await request.json());
      rawText = body.documentText;
    }

    if (!rawText || rawText.trim().length < 20) {
      return NextResponse.json(
        { error: "Couldn't find enough readable text in that document." },
        { status: 422 },
      );
    }

    const { result, sanitizedText, warnings } = await runAnalysisPipeline(rawText);
    // sanitizedText is returned so the client can carry it forward for
    // follow-up questions (POST /api/ask) without the server persisting
    // anything — see README "Why no database". It has already been
    // through sanitizeDocumentText, so nothing unsafe is being handed
    // back that wasn't already handed back in the analysis itself.
    return NextResponse.json({ result, sanitizedText, warnings });
  } catch (error) {
    return handleAnalysisError(error);
  }
}

function handleAnalysisError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request.", details: error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  if (error instanceof PdfTooLargeError || error instanceof PdfExtractionTimeoutError) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  // Never forward raw error messages/stack traces from unexpected
  // failures (which may include SDK internals or partial prompts) —
  // log server-side, return a generic message to the client.
  console.error("[api/analyze] unexpected error:", error);
  return NextResponse.json(
    { error: "Something went wrong while analyzing this document. Please try again." },
    { status: 500 },
  );
}
