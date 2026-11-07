"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { GenerateContentForm } from "@/components/app/GenerateContentForm";
import type { SourceType } from "@/hooks/useGenerateContent";
import type { ContentItem, Profile } from "@/lib/types";

interface NewNoteDialogProps {
  /** Source to open on; null means closed. */
  source: SourceType | null;
  onClose: () => void;
  profile: Profile;
  onGenerated: (updatedContent: ContentItem[]) => void;
  /** The button that opened the dialog. There is no Radix Trigger, so focus goes back here on close (W-5.3). */
  returnFocusTo: React.RefObject<HTMLElement | null>;
}

/**
 * New note from Home. Radix handles focus in, trap, Escape and focus return (W-5.3).
 * The form remounts per open (key) so it starts on the clicked source. No transform on the
 * content: the processing and paywall overlays inside the form are position: fixed.
 */
export function NewNoteDialog({ source, onClose, profile, onGenerated, returnFocusTo }: NewNoteDialogProps) {
  const open = source !== null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            const el = returnFocusTo.current;
            if (el?.isConnected) {
              e.preventDefault();
              el.focus();
            }
          }}
          className="ds-card fixed inset-0 z-40 m-auto flex h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[30rem] flex-col gap-5 overflow-y-auto p-6 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <div className="flex items-start justify-between gap-4">
            <DialogPrimitive.Title className="text-title2 font-semibold">New note</DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="Close"
              className="relative -mt-1 -mr-1 flex size-[2.125rem] shrink-0 items-center justify-center rounded-full text-supporting hover:bg-hover-fill hover:text-label after:absolute after:-inset-[0.3125rem] after:content-['']"
            >
              <X aria-hidden="true" strokeWidth={1.75} className="size-5" />
            </DialogPrimitive.Close>
          </div>
          {source && (
            <GenerateContentForm key={source} profile={profile} initialType={source} onGenerated={onGenerated} />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
