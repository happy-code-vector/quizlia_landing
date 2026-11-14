// "Type or paste" note source (web parity with iOS "Type or speak",
// TypeOrSpeakViewController on iOS main). Pure functions only: this file is
// imported from a "use client" bundle and from node:test.

/** iOS minimum: 15 words, or 60 characters for languages written without
 *  spaces (Japanese, Chinese). Same rule as TypeOrSpeakViewController.submit. */
export const TYPED_TEXT_MIN_WORDS = 15;
export const TYPED_TEXT_MIN_CHARS = 60;

/** iOS has no upper limit. The web caps typed text at the length the server
 *  already accepts for a YouTube transcript (MAX_TRANSCRIPT_CHARS in
 *  lib/generate-core.ts), so a pasted text never costs more than a video. */
export const TYPED_TEXT_MAX_CHARS = 120_000;

export function countTypedWords(text: string): number {
  return (text || "").split(/\s+/).filter(Boolean).length;
}

/** A single link and nothing else: the YouTube or Web page source handles it. */
export function isLoneLink(text: string): boolean {
  const t = (text || "").trim();
  return /^(https?:\/\/|www\.)\S+$/i.test(t);
}

/** W-7.7 wording. null when the text can be sent. */
export function validateTypedText(text: string): string | null {
  const value = (text || "").trim();
  if (!value) return "Type or paste what you want to study";
  if (isLoneLink(value)) return "That is a link. Choose YouTube link or Web page instead";
  if (value.length > TYPED_TEXT_MAX_CHARS) {
    return `Shorten your text to ${TYPED_TEXT_MAX_CHARS.toLocaleString("en-US")} characters or fewer. It has ${value.length.toLocaleString("en-US")}`;
  }
  const enough = countTypedWords(value) >= TYPED_TEXT_MIN_WORDS || value.length >= TYPED_TEXT_MIN_CHARS;
  // iOS kTSNeedMore.
  if (!enough) return "Add a few more sentences so there is enough to quiz you on";
  return null;
}

/** Display name for a typed source: its first line, spaces collapsed, cut to 50 characters. */
export function typedTextSourceName(text: string): string {
  const first = (text || "").trim().split(/\n/)[0].replace(/\s+/g, " ").trim();
  if (!first) return "Typed notes";
  return first.length > 50 ? `${first.slice(0, 50)}...` : first;
}

/** Web sourceType for a synced note doc. The note doc's contentType "text"
 *  is shared by typed notes (iOS Type or speak, Exam Lens, web Type or
 *  paste) and older web link notes (webContentType wrote "text" for "url"),
 *  so "text" is a link note only when the doc carries a source URL. */
export function docSourceType(contentType: unknown, remoteUrl: string): "youtube" | "pdf" | "image" | "url" | "text" {
  const t = String(contentType || "").toLowerCase();
  if (t.includes("youtube")) return "youtube";
  if (t.includes("pdf")) return "pdf";
  if (t.includes("image") || t.includes("photo")) return "image";
  if (t === "text" && !remoteUrl) return "text";
  return "url";
}
