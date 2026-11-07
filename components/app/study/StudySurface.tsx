"use client";

import { useState, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { ArrowLeft, Keyboard } from "lucide-react";
import { CardDialog } from "@/components/app/CardDialog";

export interface Shortcut {
  keys: string[];
  action: string;
}

interface StudySurfaceProps {
  /** Page h1 ("Flashcards", "Quiz"). */
  title: string;
  /** Deck or note name under the title. */
  subtitle?: string;
  backLabel: string;
  onBack: () => void;
  shortcuts: Shortcut[];
  /** Runs for keys pressed while focus is inside the surface (W-5.6). `?` is handled here. */
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  /** Docked bottom bar (the one rust capsule lives here). */
  footer?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
}

const ICON = { strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * Full-width study mode (W-3.6): the app sidebar is hidden, the family tint fills the screen and
 * the position counter stays visible in the content. Single-key shortcuts only fire while focus is
 * inside this surface, never globally (W-5.6, WCAG 2.1.4).
 */
export function StudySurface({
  title, subtitle, backLabel, onBack, shortcuts, onKeyDown, footer, headingRef, children,
}: StudySurfaceProps) {
  const [showKeys, setShowKeys] = useState(false);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // React bubbles events out of portals: keys pressed inside a dialog (the shortcut list) are not ours.
    if (!e.currentTarget.contains(e.target as Node)) return;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "?") {
      e.preventDefault();
      setShowKeys(true);
      return;
    }
    onKeyDown?.(e);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden text-label" onKeyDown={handleKeyDown}>
      <a href="#main" className="skip-link">Skip to content</a>
      <div aria-hidden="true" className="family-surface family-study" />

      <header className="grid h-14 shrink-0 grid-cols-[3rem_minmax(0,1fr)_3rem] items-center border-b border-divider px-1 sm:px-2" style={{ background: "var(--study-top)" }}>
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="flex size-11 items-center justify-center rounded-full text-label hover:bg-hover-fill"
        >
          <ArrowLeft {...ICON} className="size-5" />
        </button>
        <div className="flex min-w-0 flex-col items-center text-center">
          <h1 ref={headingRef} tabIndex={-1} className="text-headline">{title}</h1>
          {subtitle && <p className="w-full truncate text-footnote text-supporting">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setShowKeys(true)}
          aria-label="Keyboard shortcuts"
          className="flex size-11 items-center justify-center justify-self-end rounded-full text-supporting hover:bg-hover-fill hover:text-label"
        >
          <Keyboard {...ICON} className="size-5" />
        </button>
      </header>

      <main id="main" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {children}
      </main>

      {footer && (
        <div className="shrink-0 border-t border-divider px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" style={{ background: "var(--study-bottom)" }}>
          <div className="mx-auto w-full max-w-[45rem]">{footer}</div>
        </div>
      )}

      <CardDialog open={showKeys} onOpenChange={setShowKeys} title="Keyboard shortcuts" description="These work while you are on this screen.">
        <dl className="flex flex-col gap-3">
          {shortcuts.map((s) => (
            <div key={s.action} className="flex items-center justify-between gap-4">
              <dt className="text-callout">{s.action}</dt>
              <dd className="flex shrink-0 gap-1.5">
                {s.keys.map((k) => (
                  <kbd key={k} className="min-w-8 rounded-lg border border-card-stroke bg-control px-2 py-1 text-center font-sans text-subheadline">
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </CardDialog>
    </div>
  );
}

/** Thin rust progress bar under the counter. The counter text carries the value for screen readers. */
export function StudyProgress({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  return (
    <div aria-hidden="true" className="h-1 w-full overflow-hidden rounded-full bg-track">
      <div className="h-full rounded-full bg-primary transition-[width] duration-200 ease-[cubic-bezier(0.2,0,0,1)]" style={{ width: `${pct}%` }} />
    </div>
  );
}
