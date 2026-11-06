"use client";
import { useEffect, useState } from "react";
import { loadDeck } from "@/lib/games/deck";
import { buildDeckFromContent, type ContentItem } from "@/lib/arcade";
import { loadProfileContent } from "@/lib/notesSync";
import type { StudyDeck } from "@/lib/games/types";

/** Resolves the deck for a play page: real topic flashcards when noteId is
 *  present (same localStorage store the topic page reads, same first-visit
 *  cloud-pull + reload behavior), fixture deck otherwise (mock/demo). */
export function useArcadeDeck(
  noteId?: string,
  profileId?: string,
  mock?: string
): { deck: StudyDeck | null } {
  const [deck, setDeck] = useState<StudyDeck | null>(null);

  useEffect(() => {
    if (mock === "1" || !noteId) {
      setDeck(loadDeck(noteId, profileId, mock));
      return;
    }
    const currentProfile = localStorage.getItem("currentProfile");
    if (!currentProfile) {
      setDeck(loadDeck(noteId, profileId, mock));
      return;
    }
    const profileData = JSON.parse(currentProfile);
    const pid = profileId ?? String(profileData.id);
    const stored = localStorage.getItem(`content_${pid}`);
    if (!stored) {
      // First visit on this device: pull the cloud copy, then reload so
      // the deck includes it (mirrors app/note/topic/[id] behavior).
      // Pull for the pid we actually READ — a URL profileId that differs
      // from the current profile must populate content_{pid}, otherwise
      // the reload re-runs this branch forever (final-review Important).
      loadProfileContent({ ...profileData, id: pid }).then((cloud) => {
        if (cloud) window.location.reload();
        else setDeck(loadDeck(noteId, pid, mock));
      });
      return;
    }
    try {
      const items: ContentItem[] = JSON.parse(stored);
      setDeck(buildDeckFromContent(noteId, pid, items));
    } catch {
      setDeck(loadDeck(noteId, pid, mock));
    }
  }, [noteId, profileId, mock]);

  return { deck };
}
