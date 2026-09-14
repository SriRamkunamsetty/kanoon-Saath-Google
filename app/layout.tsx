import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kanoon Saathi — understand your document before you sign",
  description:
    "Upload a rental agreement, offer letter, or freelance contract and get a plain-language explanation, risk flags, and questions to ask a professional. Not a substitute for legal advice.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to main content
        </a>
        <div className="min-h-screen bg-paper">
          <header className="border-b border-border bg-paper-raised">
            <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
              <span className="font-display text-xl text-ink">Kanoon Saathi</span>
              <span className="text-xs text-muted">General information, not legal advice</span>
            </div>
          </header>
          <main id="main-content">{children}</main>
          <footer className="mx-auto max-w-3xl px-6 py-10 text-sm text-muted">
            Kanoon Saathi explains and organizes information from documents you provide.
            It does not practice law, does not replace a qualified lawyer, and cannot
            guarantee accuracy — always verify important decisions with a professional
            or your local legal-aid service.
          </footer>
        </div>
      </body>
    </html>
  );
}
