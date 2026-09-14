# Kanoon Saathi

*Kanoon* (कानून) — law. *Saathi* (साथी) — companion. A GenAI assistant that
helps someone read a legal document before they sign it, not instead of a
lawyer.

Built for **Google PromptWars Virtual**, "AI for Legal Assistance & Access."

> **This tool provides general information, not legal advice.** It does not
> practice law and cannot guarantee accuracy. Always verify anything
> consequential with a qualified professional or a legal-aid service.

---

## Chosen vertical

**First-time renters and gig/freelance workers in urban India** signing a
document — a rental agreement, an offer letter, a freelance contract — with
no legal background and often no one to ask before they sign. This vertical
was chosen because it's where "assist, don't replace" is easiest to get
right: the documents are short enough to analyze fully, the stakes are real
but not (usually) courtroom-scale, and it lets the tool speak concretely
about things like security-deposit norms, lock-in clauses, and notice
periods instead of generic contract boilerplate.

*(If the challenge platform's own vertical list differs from this, the
persona lives entirely in `lib/ai/prompts.ts` and the agent prompts — nothing
architectural depends on it.)*

## Approach and logic

The core design decision is **grounding over confidence**: every claim the
assistant makes must be backed by a verbatim quote from the user's own
document, and that quote is checked deterministically — not by asking
another model to grade the first one — before it's ever shown. If a claim
can't be tied to real text in the document, it's silently dropped rather
than shown as fact. This is the direct answer to the two biggest failure
modes in AI legal tools today: hallucinated citations (even top-tier legal
AI still needs this kind of self-checking) and overclaiming what the tool
can do (the FTC's 2024 action against DoNotPay for marketing itself as an
"AI lawyer" is the cautionary tale this project is explicitly designed
around).

The second decision is **no persistence**. Uploaded documents are processed
in memory for the duration of one request and never written to a database.
This isn't a limitation worked around — it's a security and privacy
property: there are no user records to leak, no access-control rules to get
wrong, and no data-retention policy to write, because there's no retained
data. See "Why no database" below.

## How the solution works

```
Upload (PDF or text)
   -> Security & sanitize   (lib/security/sanitize.ts)
   -> Simplifier + risk-flagger, one combined model call
      (lib/ai/agents/simplify-and-flag.ts)
   -> Citation verification  (lib/ai/verify.ts)   <- deterministic, not an LLM call
   -> Lawyer-prep questions, generated only from *verified* risk flags
      (lib/ai/agents/prepare-lawyer-questions.ts)
   -> Result rendered as: Summary / Risks / Prepare for a lawyer / Ask a question
```

Follow-up questions (`/api/ask`) chunk the document (`lib/rag/chunk.ts`),
retrieve the most relevant chunks by embedding similarity
(`lib/rag/retrieve.ts`), answer only from those chunks, and run the same
citation gate again — a question-answering call is exactly as capable of an
ungrounded answer as the analysis call is, so it isn't trusted more.

### Why the simplifier and risk-flagger are one call, not two

An earlier design ran four independent agents in parallel. In practice, the
simplifier and risk-flagger read the exact same document with no dependency
on each other's output, so splitting them only doubled token cost and
latency for no accuracy benefit. Merging them was a direct efficiency
decision, made explicit here rather than left for a reviewer to wonder why
the code doesn't match a four-box diagram.

### Why citation verification is a plain function, not another model call

Asking a second LLM call "does this quote really appear in the document?"
just relocates the hallucination risk one level up — it's still a language
model guessing about text. A normalized substring check
(`lib/ai/verify.ts`) is deterministic, has zero marginal cost, and — most
importantly — is something you can actually unit test and trust
(`tests/unit/verify.test.ts` includes a fabricated citation and asserts it
gets dropped).

### Why no database

For a tool whose whole premise is handling someone's rental agreement or
freelance contract, the strongest privacy story is not collecting the
document at all. `documentText` is round-tripped through the browser between
`/api/analyze` and `/api/ask` (see `components/analysis-workspace.tsx`) and
is never written to disk or a database on the server. The trade-off — no
saved history across sessions — was chosen deliberately over the
alternative of maintaining per-user data-access rules correctly forever.

### Security model

- Every uploaded document is treated as **untrusted input**, the same way a
  web app treats an HTTP body — never as instructions. `sanitizeDocumentText`
  strips invisible/bidi Unicode (a known way to hide text from a human
  reviewer) with linear-time regex (see the ReDoS-focused test in
  `tests/unit/sanitize.test.ts`), and `buildDocumentBlock` (`lib/ai/prompts.ts`)
  wraps the remaining text in an explicit "this is data, not instructions"
  block before it reaches a model — the mitigation Google's Secure AI
  Framework recommends for prompt injection, treated with the same
  seriousness as SQL injection.
- PDF parsing uses `unpdf`, not `pdf-parse` — the latter depends on native
  canvas bindings that fail on Vercel's serverless runtime, so it would work
  locally and break in production. Extraction caps page count and wraps in a
  timeout per unpdf's own guidance for untrusted files.
- All requests are rate-limited (`lib/ratelimit.ts`, Upstash sliding window
  in production; a clearly-labeled, non-production in-memory fallback for
  local dev).
- The Gemini API key is used **only** in server-side Route Handlers, never
  exposed to the client.
- `proxy.ts` sets security headers (CSP, HSTS, X-Frame-Options,
  Permissions-Policy) and is deliberately *not* used for any access control —
  CVE-2025-29927 showed middleware-only auth can be bypassed with a crafted
  header. This app has no auth to bypass, but the principle is documented
  here for whoever adds accounts next.
- Dependencies are pinned to versions patched against the December 2025
  Next.js RCE (CVSS 10.0, fixed in 16.0.4) — see `package.json`.

### Accessibility

UI primitives (`components/ui/tabs.tsx`) are built on Radix, which ships
correct keyboard and screen-reader behavior for composite widgets like tabs
by default. On top of that: visible focus rings are a global style (not a
per-component afterthought — see `app/globals.css`), every form control has
a real `<label>`, status updates use `aria-live`, and `prefers-reduced-motion`
is respected globally.

## Assumptions

- Documents are text-based PDFs or plain text in English, Hindi, or Telugu
  (`language` field exists in the schema; the demo prompts are English-only
  today — extending them is a prompt change, not an architecture change).
  Scanned/handwritten documents are out of scope for this MVP (no OCR).
- "Verified" means *the quoted text exists in the document* — it does not
  mean the assistant's legal characterization of that text is correct. The
  tool is designed to reduce fabrication, not to replace professional
  judgment about what a clause actually means in a given jurisdiction.
- The comparator (side-by-side comparison of two documents) described in the
  original design is not included in this submission's scope — the four
  areas that are implemented (simplify, flag risks, prepare questions, ask
  questions) were prioritized to be complete and well-tested rather than
  spreading effort across a fifth, partially-built feature.
- Model names on the Gemini API change frequently; `lib/ai/client.ts`
  documents the current defaults and how to override them via environment
  variable without a code change.

## Running locally

```bash
npm install
cp .env.example .env.local   # add a Gemini API key from aistudio.google.com/apikey
npm run dev
```

`npm run verify` runs lint, typecheck, and unit tests together — the same
gate CI runs on every push (`.github/workflows/ci.yml`).

## Deploying

Import the repo in Vercel, add `GOOGLE_GENERATIVE_AI_API_KEY` (required) and
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (recommended — see
`.env.example` for what happens if you skip them) as Environment Variables,
and deploy. No other infrastructure is required.

## Project structure

```
app/                Next.js App Router pages and API routes
components/          UI, split into ui/ primitives and feature components
lib/
  ai/                Model client, prompts, agents, citation verifier
  pdf/               PDF text extraction
  rag/               Chunking and embedding-based retrieval
  security/          Input sanitization
  schemas.ts         Zod schemas — the single source of truth for data shapes
  ratelimit.ts
tests/
  unit/              Vitest — pure logic (sanitize, chunk, verify)
  e2e/               Playwright — UI flow, with the AI call mocked
fixtures/            A fabricated sample document for manual testing/demo
```
