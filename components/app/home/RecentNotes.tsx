import Link from "next/link";
import type { Topic } from "@/lib/types";
import { sourceOption } from "./sources";

const DAY = 24 * 60 * 60 * 1000;

/** "Today", "Yesterday", a weekday within the week, else "Oct 28". `now` keeps fixtures stable. */
export function relativeDay(iso: string, now: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / DAY);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function stats(topic: Topic): string {
  const parts: string[] = [];
  const cards = topic.flashcards?.length ?? 0;
  const questions = topic.quiz?.length ?? 0;
  if (cards) parts.push(`${cards} flashcard${cards === 1 ? "" : "s"}`);
  if (questions) parts.push(`${questions} quiz question${questions === 1 ? "" : "s"}`);
  return parts.length ? parts.join(" · ") : "Notes only";
}

interface RecentNotesProps {
  topics: Topic[];
  now: Date;
  folderNames: Record<string, string>;
}

/** Newest three notes. "See all" goes to All notes, which has search, folders and delete. */
export function RecentNotes({ topics, now, folderNames }: RecentNotesProps) {
  const recent = [...topics].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 3);
  if (recent.length === 0) return null;

  return (
    <section aria-labelledby="recent-notes" className="flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="recent-notes" className="text-title2 font-semibold">Recent notes</h2>
        <Link href="/note/notes" className="inline-flex min-h-6 items-center text-subheadline font-semibold text-rust-on-tint hover:underline">
          See all<span className="sr-only"> notes</span>
        </Link>
      </div>
      <ul role="list" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {recent.map((topic) => {
          const where = (topic.folderId && folderNames[String(topic.folderId)]) || sourceOption(topic.sourceType).label;
          return (
            <li key={topic.id} className="min-w-0">
              <Link href={`/note/topic/${topic.id}`} className="ds-card ds-card-link flex h-full flex-col gap-2.5 p-5 text-label">
                <span className="text-footnote text-supporting">
                  {where} · {relativeDay(topic.createdAt, now)}
                </span>
                <span className="line-clamp-2 text-headline">{topic.title}</span>
                <span className="tabular text-subheadline text-supporting">{stats(topic)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
