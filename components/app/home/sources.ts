import { FileText, Images, Link as LinkIcon, SquarePlay, type LucideIcon } from "lucide-react";
import type { SourceType } from "@/hooks/useGenerateContent";

export interface SourceOption {
  type: SourceType;
  /** Label on Home's "New note from" row and on the form's source chips. */
  label: string;
  /** Visible label above the form field for this source (W-7.1). */
  fieldLabel: string;
  Icon: LucideIcon;
}

/**
 * Web sources. Exam Lens is not here: it needs the phone camera, so Home links to the
 * iPhone app instead. "Web page" stays in the form for parity with the old web form but
 * is not on Home's row (Option A shows YouTube, PDF and Photos).
 */
export const SOURCES: SourceOption[] = [
  { type: "youtube", label: "YouTube link", fieldLabel: "YouTube link", Icon: SquarePlay },
  { type: "pdf", label: "PDF file", fieldLabel: "PDF file", Icon: FileText },
  { type: "image", label: "Photos of notes", fieldLabel: "Photo of your notes", Icon: Images },
  { type: "url", label: "Web page", fieldLabel: "Web page link", Icon: LinkIcon },
];

export const HOME_SOURCES = SOURCES.filter((s) => s.type !== "url");

export function sourceOption(type: string): SourceOption {
  return SOURCES.find((s) => s.type === type) ?? SOURCES[0];
}
