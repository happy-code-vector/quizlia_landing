// app/note/arcade/page.tsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/app/Sidebar";
import { GAMES, topicsWithFlashcards, type ContentItem, type GameSlug } from "@/lib/arcade";
import type { Profile } from "@/lib/types";

export default function ArcadePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [topics, setTopics] = useState<{ id: string; title: string }[]>([]);
  const [pickerFor, setPickerFor] = useState<GameSlug | null>(null);

  useEffect(() => {
    const currentProfile = localStorage.getItem("currentProfile");
    if (!currentProfile) return;
    const profileData = JSON.parse(currentProfile);
    setProfile(profileData);
    setProfileId(String(profileData.id));
    const stored = localStorage.getItem(`content_${profileData.id}`);
    if (!stored) return;
    try {
      setTopics(topicsWithFlashcards(JSON.parse(stored)));
    } catch {
      // leave the list empty — demo links still work
    }
  }, []);

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex">
        <Sidebar profile={profile} />
        <main className="flex-1 p-6 lg:p-10">
          <div className="mx-auto max-w-5xl">
            <header className="mb-8">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Arcade
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Turn your notes into games. Five ways to drill the same deck.
              </p>
            </header>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {GAMES.map((game) => (
                <div
                  key={game.slug}
                  className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className={`mb-4 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${game.accent} text-2xl`}>
                    {game.icon}
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{game.name}</h2>
                  <p className="mt-1 flex-1 text-sm text-gray-600 dark:text-gray-400">{game.tagline}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => setPickerFor(game.slug)}
                      className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      Pick a note
                    </button>
                    <Link
                      href={`/note/play/${game.slug}?mock=1`}
                      className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Demo
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {pickerFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPickerFor(null)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">
              Play {GAMES.find((g) => g.slug === pickerFor)?.name} with…
            </h3>
            {topics.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No notes with flashcards yet — generate a note first, or try the demo.
              </p>
            ) : (
              <ul className="space-y-2">
                {topics.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/note/play/${pickerFor}?noteId=${encodeURIComponent(t.id)}&profileId=${profileId ?? ""}`}
                      className="block rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-800 transition-colors hover:border-purple-400 hover:bg-purple-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-purple-900/20"
                    >
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
