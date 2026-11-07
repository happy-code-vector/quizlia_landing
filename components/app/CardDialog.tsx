"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode, type RefObject } from "react";

interface CardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Short line under the title. Rendered as the dialog description. */
  description?: string;
  children: ReactNode;
  /** Wider dialogs for lists (game picker). */
  wide?: boolean;
  /** Move focus to a field instead of the first focusable (the close button). */
  onOpenAutoFocus?: (e: Event) => void;
  /** Where focus goes on close when the opener is gone (a menu item, for example). W-5.3. */
  returnFocusTo?: RefObject<HTMLElement | null>;
}

/**
 * Card dialog used across the app (W-5.3: Radix traps focus, Escape closes, focus returns to
 * the trigger). Sits above the full-screen study surfaces (z-50), so it uses z-60.
 */
export function CardDialog({ open, onOpenChange, title, description, children, wide, onOpenAutoFocus, returnFocusTo }: CardDialogProps) {
  // Radix's own focus return lands on <body> in this app, so remember the opener ourselves (W-5.3).
  const opener = useRef<HTMLElement | null>(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={(e) => {
            opener.current = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
            onOpenAutoFocus?.(e);
          }}
          onCloseAutoFocus={(e) => {
            const target = returnFocusTo?.current ?? opener.current;
            if (target?.isConnected) {
              e.preventDefault();
              target.focus();
            }
          }}
          className={`ds-card fixed inset-0 z-[60] m-auto flex h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col gap-5 overflow-y-auto p-6 text-label data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 ${wide ? "max-w-[32rem]" : "max-w-[26rem]"}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <DialogPrimitive.Title className="text-title2 font-semibold">{title}</DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-subheadline text-supporting">{description}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="relative -mt-1 -mr-1 flex size-[2.125rem] shrink-0 items-center justify-center rounded-full text-supporting hover:bg-hover-fill hover:text-label after:absolute after:-inset-[0.3125rem] after:content-['']"
            >
              <X aria-hidden="true" strokeWidth={1.75} className="size-5" />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
