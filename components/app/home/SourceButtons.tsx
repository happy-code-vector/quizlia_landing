import { ScanLine } from "lucide-react";
import { APP_STORE_URL } from "@/lib/constants";
import type { SourceType } from "@/hooks/useGenerateContent";
import { HOME_SOURCES } from "./sources";

/** The three web sources as secondary buttons (Option A row). Each opens the New note dialog. */
export function SourceButtons({ onPick }: { onPick: (type: SourceType) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {HOME_SOURCES.map(({ type, label, Icon }) => (
        <button
          key={type}
          type="button"
          onClick={() => onPick(type)}
          className="flex h-14 items-center gap-3 rounded-[0.875rem] border border-divider bg-card px-4 text-left text-headline text-label transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:border-input active:bg-hover-fill"
        >
          <Icon aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-rust" />
          {label}
        </button>
      ))}
    </div>
  );
}

/** Exam Lens needs the phone camera, so web only points to the iPhone app. */
export function ExamLensLink({ onTint = true }: { onTint?: boolean }) {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-6 items-center gap-1.5 text-subheadline hover:underline ${onTint ? "text-rust-on-tint" : "text-rust"}`}
    >
      <ScanLine aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
      Scan a test with Exam Lens on iPhone
      <span className="sr-only"> (opens the App Store in a new tab)</span>
    </a>
  );
}
