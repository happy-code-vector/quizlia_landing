"use client";

import { useEffect, useRef, type KeyboardEvent, type Ref } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Send, X } from "lucide-react";
import { MarkdownText } from "@/components/app/MarkdownText";
import type { NoteChatState } from "./useNoteChat";

const ICON = { strokeWidth: 1.75, "aria-hidden": true } as const;

interface NoteChatPanelProps {
  chat: NoteChatState;
  /** Unique per mount (the side panel and the sheet can both exist in the DOM). */
  idPrefix: string;
  inputRef?: Ref<HTMLTextAreaElement>;
}

/** Chat about the note. Visible label above the field (W-7.1); the log announces answers. */
export function NoteChatPanel({ chat, idPrefix, inputRef }: NoteChatPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const { messages, inputText, setInputText, isLoading, send } = chat;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="log" aria-live="polite" aria-label="Conversation" className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((m) => {
          if (m.sender === "default") {
            return <p key={m.id} className="rounded-2xl bg-control px-4 py-3 text-center text-subheadline text-supporting">{m.text}</p>;
          }
          if (m.sender === "user") {
            return (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-subheadline text-primary-foreground">
                  <span className="sr-only">You: </span>{m.text}
                </p>
              </div>
            );
          }
          if (m.sender === "ai") {
            return (
              <div key={m.id} className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-control px-4 py-3 text-subheadline">
                  <span className="sr-only">QuizliAI: </span>
                  <MarkdownText text={m.text} />
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className="flex justify-start">
              <p className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-control px-4 py-4">
                <span className="sr-only">QuizliAI is writing an answer</span>
                <span aria-hidden="true" className="size-2 animate-bounce rounded-full bg-supporting" />
                <span aria-hidden="true" className="size-2 animate-bounce rounded-full bg-supporting [animation-delay:150ms]" />
                <span aria-hidden="true" className="size-2 animate-bounce rounded-full bg-supporting [animation-delay:300ms]" />
              </p>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form
        className="flex flex-col gap-1.5 border-t border-divider p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor={`${idPrefix}-input`} className="text-subheadline font-semibold">Ask about this note</label>
        <div className="flex items-end gap-2">
          <textarea
            id={`${idPrefix}-input`}
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={onKeyDown}
            aria-describedby={`${idPrefix}-hint`}
            rows={2}
            className="min-h-11 flex-1 resize-none rounded-xl border border-input bg-card px-3 py-2 text-callout"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            aria-label="Send question"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-divider bg-card text-label hover:border-input disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send {...ICON} className="size-5" />
          </button>
        </div>
        <p id={`${idPrefix}-hint`} className="text-footnote text-supporting">Enter sends. Shift and Enter add a new line.</p>
      </form>
    </div>
  );
}

/** Below 1280 px the chat opens as a sheet from the right (Radix: focus trap, Escape, focus return). */
export function NoteChatSheet({ open, onOpenChange, chat }: { open: boolean; onOpenChange: (v: boolean) => void; chat: NoteChatState }) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            e.preventDefault();
            inputRef.current?.focus();
          }}
          onCloseAutoFocus={(e) => {
            if (opener.current?.isConnected) {
              e.preventDefault();
              opener.current.focus();
            }
          }}
          className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-[26rem] flex-col border-l border-card-stroke bg-card text-label shadow-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-divider pr-2 pl-4">
            <DialogPrimitive.Title className="text-headline">Ask a question</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="flex size-11 items-center justify-center rounded-full text-supporting hover:bg-hover-fill hover:text-label">
              <X {...ICON} className="size-5" />
            </DialogPrimitive.Close>
          </div>
          <NoteChatPanel chat={chat} idPrefix="chat-sheet" inputRef={inputRef} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
