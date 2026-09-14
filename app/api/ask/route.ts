import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AskRequestSchema } from "@/lib/schemas";
import { sanitizeDocumentText } from "@/lib/security/sanitize";
import { chunkDocument } from "@/lib/rag/chunk";
import { retrieveRelevantChunks } from "@/lib/rag/retrieve";
import { answerQuestion } from "@/lib/ai/agents/answer-question";
import { checkRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

function clientIdentifier(request: NextRequest): string {
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
    const { documentText, question } = AskRequestSchema.parse(await request.json());

    // The client resends the document on every question (see
    // README "Why no database") — re-sanitize rather than trusting
    // that it's still clean, since this is a fresh untrusted request.
    const { text: sanitizedText } = sanitizeDocumentText(documentText);
    const chunks = chunkDocument(sanitizedText);
    const relevant = await retrieveRelevantChunks(question, chunks);
    const answer = await answerQuestion(question, relevant);

    return NextResponse.json({ answer });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid request.", details: error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    console.error("[api/ask] unexpected error:", error);
    return NextResponse.json(
      { error: "Something went wrong while answering that question. Please try again." },
      { status: 500 },
    );
  }
}
