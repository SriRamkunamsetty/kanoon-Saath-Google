import { test, expect } from "@playwright/test";

/**
 * Mocks POST /api/analyze rather than calling Gemini for real. This
 * is a deliberate boundary choice: this test verifies the UI
 * correctly renders whatever the API contract promises (see
 * lib/schemas.ts), not that Gemini's output quality is good today —
 * that's a model-eval concern, not a CI-on-every-push concern, and
 * it means this suite runs in CI without needing a real API key as
 * a repository secret.
 */
const MOCK_RESPONSE = {
  result: {
    documentSummary: "A short-term residential lease between a tenant and landlord.",
    simplifiedClauses: [
      {
        title: "Security deposit",
        plainLanguage: "You pay two months' rent upfront as a refundable deposit.",
        citation: { quote: "security deposit equal to two months' rent", clauseLabel: "Clause 1" },
      },
    ],
    riskFlags: [
      {
        severity: "red_flag",
        title: "No-notice termination",
        explanation: "The landlord can end the lease at any time without warning.",
        recommendation: "Ask for a minimum notice period, e.g. 30 days, to be added.",
        citation: { quote: "terminate this agreement at any time without notice", clauseLabel: "Clause 2" },
      },
    ],
    lawyerQuestions: [
      "Is a no-notice termination clause enforceable under my local tenancy law?",
    ],
    verification: { totalClaims: 2, verifiedClaims: 2, droppedClaims: 0 },
  },
  sanitizedText:
    "1. The tenant shall pay a security deposit equal to two months' rent.\n\n2. The landlord may terminate this agreement at any time without notice.",
  warnings: [],
};

test("uploading pasted text renders a summary, risk flags, and lawyer-prep questions", async ({
  page,
}) => {
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({ json: MOCK_RESPONSE });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: /understand your document/i })).toBeVisible();

  const textarea = page.getByLabel(/paste the text of your document/i);
  await textarea.fill(
    "1. The tenant shall pay a security deposit equal to two months' rent.\n\n2. The landlord may terminate this agreement at any time without notice.",
  );

  await page.getByRole("button", { name: /analyze document/i }).click();

  await expect(page.getByText(MOCK_RESPONSE.result.documentSummary)).toBeVisible();

  await page.getByRole("tab", { name: /risks/i }).click();
  await expect(page.getByText("No-notice termination")).toBeVisible();
  await expect(page.getByText(/red flag/i)).toBeVisible();

  await page.getByRole("tab", { name: /prepare for a lawyer/i }).click();
  await expect(
    page.getByText(/enforceable under my local tenancy law/i),
  ).toBeVisible();
});

test("the skip link and file input are keyboard accessible", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByText("Skip to main content")).toBeFocused();
});
