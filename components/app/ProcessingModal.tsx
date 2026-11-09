"use client";

interface ProcessingModalProps {
  isOpen: boolean;
  message?: string;
}

/**
 * Generating loader. The bear (think pose) is allowed here: it is a state-change moment
 * (mascot rule). Under reduced motion the spinner stops (globals.css).
 */
export function ProcessingModal({ isOpen, message = "Reading your source and writing notes, flashcards and a quiz." }: ProcessingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="status" aria-live="polite" className="ds-card flex w-full max-w-[26rem] flex-col items-center gap-3 p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot/quizliai_mascot_think.webp" alt="" width={72} height={72} className="size-[4.5rem] object-contain" />
        <p className="text-title3 font-semibold">Making your study set</p>
        <p className="text-subheadline text-supporting">{message}</p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-track" aria-hidden="true">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
        <p className="text-subheadline text-supporting">This usually takes under a minute.</p>
      </div>
    </div>
  );
}
