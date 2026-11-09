import Link from "next/link";

/**
 * Full-screen welcome-family frame (auth, pricing, subscription success). No app shell:
 * these screens are reached before a profile exists or as a purchase flow (lock rule 4).
 * Forms are 480 px wide (W-3.1).
 */
export function WelcomeFrame({
  children,
  width = "form",
  headerEnd,
}: {
  children: React.ReactNode;
  width?: "form" | "wide";
  headerEnd?: React.ReactNode;
}) {
  const max = width === "wide" ? "max-w-[70rem]" : "max-w-[30rem]";
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <div aria-hidden="true" className="family-surface family-welcome" />
      <header className={`mx-auto flex h-14 w-full ${max} items-center justify-between px-4 sm:px-6`}>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-full text-headline text-label">QuizliAI</Link>
        {headerEnd}
      </header>
      <main id="main" className={`mx-auto w-full ${max} px-4 pt-2 pb-10 sm:px-6`}>{children}</main>
    </>
  );
}

/** Token spinner for welcome-family loading states. */
export function WelcomeLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <div aria-hidden="true" className="family-surface family-welcome" />
      <div aria-hidden="true" className="size-8 animate-spin rounded-full border-2 border-track border-b-rust" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
