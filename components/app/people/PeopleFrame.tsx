import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * Full-screen people-family frame for screens shown before a profile exists (sign in, create profile).
 * No app shell: there is no current profile to build navigation for. Forms are 480 px wide (W-3.1).
 */
export function PeopleFrame({ backHref, backLabel = "Back", children }: { backHref?: string; backLabel?: string; children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <div aria-hidden="true" className="family-surface family-people" />
      <header className="mx-auto flex h-14 w-full max-w-[30rem] items-center px-2 sm:px-4">
        {backHref && (
          <Link href={backHref} className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-subheadline font-semibold text-rust-on-tint hover:underline">
            <ChevronLeft aria-hidden="true" strokeWidth={1.75} className="size-5" />
            {backLabel}
          </Link>
        )}
      </header>
      <main id="main" className="mx-auto w-full max-w-[30rem] px-4 pt-2 pb-10">{children}</main>
    </>
  );
}

/** Token spinner for people-family loading states (replaces the old brand-color spinners). */
export function PeopleLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <div aria-hidden="true" className="family-surface family-people" />
      <div aria-hidden="true" className="size-8 animate-spin rounded-full border-2 border-track border-b-rust" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
