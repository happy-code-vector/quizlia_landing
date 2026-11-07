"use client";

import { useRef, useState, type ReactNode } from "react";
import type React from "react";
import Link from "next/link";
import * as Menu from "@radix-ui/react-dropdown-menu";
import {
  ArrowLeft, ChevronDown, CirclePlay, Ellipsis, EyeOff, FileText, Gamepad2, Globe, Image as ImageIcon,
  Layers, Link as LinkIcon, MessageCircleQuestion, Pencil, Share2, Trash2,
} from "lucide-react";
import type { Topic } from "@/lib/types";
import { getYouTubeEmbedUrl } from "@/lib/types";
import { MarkdownText } from "@/components/app/MarkdownText";
import { CardDialog } from "@/components/app/CardDialog";
import { RenameModal } from "@/components/app/RenameModal";
import { NoteChatPanel, NoteChatSheet } from "./NoteChat";
import type { NoteChatState } from "./useNoteChat";

const ICON = { strokeWidth: 1.75, "aria-hidden": true } as const;

const SOURCE: Record<Topic["sourceType"], { label: string; Icon: typeof FileText }> = {
  url: { label: "Web page", Icon: Globe },
  pdf: { label: "PDF file", Icon: FileText },
  youtube: { label: "YouTube video", Icon: CirclePlay },
  image: { label: "Photos of notes", Icon: ImageIcon },
};

export interface NoteMenuActions {
  onShare: () => void;
  /** Called with the new title from the rename dialog. */
  onRename: (title: string) => void;
  onDelete: () => void;
  /** Public library (admins publish; owners of legacy guides can copy or unpublish). */
  publishedSlug: string | null;
  isAdmin: boolean;
  isPublishing: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onCopyLink: () => void;
}

export interface NoteViewProps {
  topic: Topic;
  chat: NoteChatState;
  menu: NoteMenuActions;
  onStudyFlashcards: () => void;
  onQuiz: () => void;
  onPlay: () => void;
}

/**
 * Note hub, ported from iOS (2026-11-03, option B): the note title is the one serif line, the
 * summary sits on paper (the radius-22 object), Flashcards, games and chat are chips, the lesson
 * groups collapse, and one rust capsule is docked at the bottom.
 */
export function NoteView({ topic, chat, menu, onStudyFlashcards, onQuiz, onPlay }: NoteViewProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const sideInputRef = useRef<HTMLTextAreaElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  const note = topic.note;
  const cards = topic.flashcards?.length ?? 0;
  const questions = topic.quiz?.length ?? 0;
  const source = SOURCE[topic.sourceType] ?? SOURCE.url;
  const created = formatDate(topic.createdAt);
  const youtube = topic.sourceType === "youtube" && topic.sourceUrl ? getYouTubeEmbedUrl(topic.sourceUrl) : null;
  const keyTerms = Array.from(new Set((note?.sections ?? []).flatMap((s) => s.keyTerms ?? []))).slice(0, 4);

  const askQuestion = () => {
    // The side panel shows at 1280 px and up; below that the chat opens as a sheet.
    if (window.matchMedia("(min-width: 1280px)").matches) sideInputRef.current?.focus();
    else setChatOpen(true);
  };

  const groups: { id: string; title: string; count?: number; body: ReactNode }[] = [];
  if (note?.key_findings?.length) {
    groups.push({
      id: "findings",
      title: "Key findings",
      count: note.key_findings.length,
      body: (
        <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-supporting">
          {note.key_findings.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      ),
    });
  }
  if (note?.sections?.length) {
    groups.push({
      id: "cheat",
      title: "Cheat sheet",
      count: note.sections.length,
      body: (
        <div className="flex flex-col gap-5">
          {note.sections.map((s, i) => (
            <section key={i} className="flex flex-col gap-2">
              <h4 className="text-headline">{s.title}</h4>
              <MarkdownText text={s.content} className="leading-relaxed" />
              {!!s.keyTerms?.length && <Terms terms={s.keyTerms} />}
            </section>
          ))}
        </div>
      ),
    });
  }
  if (note?.important_notes?.length) {
    groups.push({
      id: "important",
      title: "Important notes",
      count: note.important_notes.length,
      body: (
        <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-supporting">
          {note.important_notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      ),
    });
  }
  if (note?.detailed_notes) {
    groups.push({
      id: "detailed",
      title: "Detailed notes",
      body: <MarkdownText text={note.detailed_notes} className="leading-relaxed" />,
    });
  }

  // One rust capsule (lock rule 3): the quiz, or flashcards when the note has no quiz.
  const dock = questions > 0
    ? { label: `Quiz me · ${questions} ${questions === 1 ? "question" : "questions"}`, onClick: onQuiz }
    : cards > 0
      ? { label: `Study flashcards · ${cards} ${cards === 1 ? "card" : "cards"}`, onClick: onStudyFlashcards }
      : null;

  return (
    <main id="main" className="flex min-h-0 min-w-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[45rem] flex-col gap-6 px-4 py-4 md:px-6 md:py-6 lg:px-8">
            <div className="flex items-center justify-between">
              <Link
                href="/note"
                aria-label="Back to Home"
                className="flex size-11 items-center justify-center rounded-full text-label hover:bg-hover-fill"
              >
                <span className="flex size-[2.125rem] items-center justify-center rounded-full border border-card-stroke bg-card">
                  <ArrowLeft {...ICON} className="size-5" />
                </span>
              </Link>
              <NoteMenu menu={menu} onDelete={() => setConfirmDelete(true)} onRename={() => setRenameOpen(true)} triggerRef={menuTriggerRef} />
            </div>

            <header className="flex flex-col gap-2">
              <p className="flex items-center gap-1.5 text-subheadline text-supporting">
                <source.Icon {...ICON} className="size-4" />
                {source.label}
                {created && <><span aria-hidden="true">·</span><span className="tabular">{created}</span></>}
              </p>
              <h1 tabIndex={-1} className="font-serif text-title font-semibold break-words lg:text-large-title">{topic.title}</h1>
            </header>

            {note?.quick_summary && (
              <section aria-labelledby="note-summary" className="flex flex-col gap-3 rounded-[1.375rem] bg-paper p-6 text-on-paper shadow-[0_1px_2px_rgb(0_0_0/0.06),0_6px_18px_rgb(0_0_0/0.08)] sm:p-7">
                <h2 id="note-summary" className="text-footnote font-semibold text-on-paper-supporting">Summary</h2>
                <MarkdownText text={note.quick_summary} className="text-body leading-relaxed" />
                {keyTerms.length > 0 && <Terms terms={keyTerms} onPaper />}
              </section>
            )}

            <div className="flex flex-wrap gap-2">
              {cards > 0 && questions > 0 && (
                <Chip onClick={onStudyFlashcards} icon={<Layers {...ICON} className="size-4" />}>
                  Flashcards <span className="tabular text-supporting">{cards}</span>
                </Chip>
              )}
              {cards > 0 && (
                <Chip onClick={onPlay} icon={<Gamepad2 {...ICON} className="size-4" />}>Play a game</Chip>
              )}
              <Chip onClick={askQuestion} icon={<MessageCircleQuestion {...ICON} className="size-4" />}>Ask a question</Chip>
            </div>

            {youtube && (
              <div className="ds-card overflow-hidden">
                <iframe
                  src={youtube}
                  title={`YouTube video: ${topic.title}`}
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="aspect-video w-full"
                />
              </div>
            )}

            {groups.length > 0 && (
              <section aria-labelledby="note-lesson" className="ds-card flex flex-col p-2">
                <h2 id="note-lesson" className="px-4 pt-3 pb-1 text-title3 font-semibold">In this lesson</h2>
                {groups.map((g) => (
                  <details key={g.id} className="group border-t border-divider first-of-type:border-t-0">
                    <summary className="flex min-h-12 list-none items-center gap-3 rounded-xl px-4 py-2 hover:bg-hover-fill [&::-webkit-details-marker]:hidden">
                      <h3 className="flex-1 text-headline">{g.title}</h3>
                      {g.count !== undefined && <span className="tabular text-subheadline text-supporting">{g.count}</span>}
                      <ChevronDown {...ICON} className="size-5 text-supporting transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)] group-open:rotate-180" />
                    </summary>
                    <div className="px-4 pt-1 pb-4 text-body">{g.body}</div>
                  </details>
                ))}
              </section>
            )}

            {!note && (
              <p className="text-callout text-supporting">This note has study cards only. Open them below.</p>
            )}
          </div>
        </div>

        {dock && (
          <div className="shrink-0 border-t border-divider px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 lg:px-8" style={{ background: "var(--study-bottom)" }}>
            <div className="mx-auto w-full max-w-[45rem]">
              <button type="button" onClick={dock.onClick} className="btn-primary tabular min-h-12 w-full">{dock.label}</button>
            </div>
          </div>
        )}
      </div>

      <aside aria-labelledby="chat-heading" className="hidden w-[22rem] shrink-0 flex-col border-l border-divider bg-card xl:flex">
        <h2 id="chat-heading" className="flex h-14 shrink-0 items-center border-b border-divider px-4 text-headline">Ask a question</h2>
        <NoteChatPanel chat={chat} idPrefix="chat-side" inputRef={sideInputRef} />
      </aside>
      <NoteChatSheet open={chatOpen} onOpenChange={setChatOpen} chat={chat} />

      <RenameModal
        isOpen={renameOpen}
        onClose={() => setRenameOpen(false)}
        onRename={menu.onRename}
        currentTitle={topic.title || "Note"}
        itemType="note"
        returnFocusTo={menuTriggerRef}
      />

      <CardDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this note?"
        returnFocusTo={menuTriggerRef}
        description="This deletes the note, its flashcards and its quiz on every device. You can't undo this."
      >
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={() => setConfirmDelete(false)} className="btn-secondary">Keep note</button>
          <button
            type="button"
            onClick={() => {
              setConfirmDelete(false);
              menu.onDelete();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-destructive px-6 text-headline text-destructive-foreground hover:bg-destructive/90"
          >
            Delete note
          </button>
        </div>
      </CardDialog>
    </main>
  );
}

function Chip({ onClick, icon, children }: { onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative inline-flex h-[2.125rem] items-center gap-1.5 rounded-full border border-card-stroke bg-card px-3 text-subheadline font-semibold shadow-card hover:bg-hover-fill after:absolute after:-inset-y-[0.3125rem] after:inset-x-0 after:content-['']"
    >
      {icon}
      {children}
    </button>
  );
}

function Terms({ terms, onPaper }: { terms: string[]; onPaper?: boolean }) {
  return (
    <ul aria-label="Key terms" className="flex flex-wrap gap-2">
      {terms.map((t) => (
        <li
          key={t}
          className={`rounded-full border px-2.5 py-0.5 text-subheadline ${onPaper ? "border-on-paper-supporting/40 text-on-paper" : "border-input text-label"}`}
        >
          {t}
        </li>
      ))}
    </ul>
  );
}

function NoteMenu({ menu, onDelete, onRename, triggerRef }: { menu: NoteMenuActions; onDelete: () => void; onRename: () => void; triggerRef: React.RefObject<HTMLButtonElement | null> }) {
  const item = "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-callout data-[highlighted]:bg-hover-fill data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40";
  return (
    <Menu.Root>
      <Menu.Trigger
        ref={triggerRef}
        aria-label="Note actions"
        className="flex size-11 items-center justify-center rounded-full text-label hover:bg-hover-fill"
      >
        <span className="flex size-[2.125rem] items-center justify-center rounded-full border border-card-stroke bg-card">
          <Ellipsis {...ICON} className="size-5" />
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={4} className="ds-card z-50 min-w-[14rem] p-1.5 text-label">
          <Menu.Item className={item} onSelect={menu.onShare}>
            <Share2 {...ICON} className="size-5 text-supporting" /> Share
          </Menu.Item>
          <Menu.Item className={item} onSelect={onRename}>
            <Pencil {...ICON} className="size-5 text-supporting" /> Rename
          </Menu.Item>
          {menu.publishedSlug ? (
            <>
              <Menu.Item className={item} onSelect={menu.onCopyLink}>
                <LinkIcon {...ICON} className="size-5 text-supporting" /> Copy public link
              </Menu.Item>
              <Menu.Item className={item} disabled={menu.isPublishing} onSelect={menu.onUnpublish}>
                <EyeOff {...ICON} className="size-5 text-supporting" /> Unpublish
              </Menu.Item>
            </>
          ) : menu.isAdmin ? (
            <Menu.Item className={item} disabled={menu.isPublishing} onSelect={menu.onPublish}>
              <Globe {...ICON} className="size-5 text-supporting" /> Publish to the library
            </Menu.Item>
          ) : null}
          <Menu.Separator className="my-1 h-px bg-divider" />
          <Menu.Item className={`${item} text-danger`} onSelect={onDelete}>
            <Trash2 {...ICON} className="size-5" /> Delete
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}
