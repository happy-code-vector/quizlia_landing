"use client";

import { useId, useRef, useState } from "react";
import { Check, CircleAlert, Folder, Upload, X } from "lucide-react";
import { ProcessingModal } from "@/components/app/ProcessingModal";
import { PaywallModal } from "@/components/app/PaywallModal";
import { useGenerateContent, type SourceType } from "@/hooks/useGenerateContent";
import { SOURCES, sourceOption } from "@/components/app/home/sources";
import { extractYouTubeId } from "@/lib/url-dedupe";
import type { Profile, ContentItem } from "@/lib/types";

interface GenerateContentFormProps {
  profile: Profile | null;
  targetFolderId?: string;
  targetFolderName?: string;
  onGenerated?: (updatedContent: ContentItem[]) => void;
  /** Source the form opens on. Home's source buttons pass the one that was clicked. */
  initialType?: SourceType;
}

const STROKE = 1.75;

/** W-7.7 wording: say what to do. Returns null when the input is usable. */
function validate(type: string, text: string, file: File | null): string | null {
  if (type === "pdf") return file ? null : "Choose a PDF file";
  if (type === "image") return file ? null : "Choose a photo of your notes";
  const value = text.trim();
  if (type === "youtube") {
    if (!value) return "Enter a YouTube link";
    return extractYouTubeId(value) ? null : "Enter a YouTube link like https://www.youtube.com/watch?v=abc123";
  }
  if (!value) return "Enter a web page link";
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return u.hostname.includes(".") ? null : "Enter a web page link like https://example.com/article";
  } catch {
    return "Enter a web page link like https://example.com/article";
  }
}

export function GenerateContentForm({
  profile,
  targetFolderId,
  targetFolderName,
  onGenerated,
  initialType,
}: GenerateContentFormProps) {
  const {
    contentType,
    setContentType,
    contentInput,
    setContentInput,
    selectedFile,
    setSelectedFile,
    handleFileChange,
    generateContent,
    isProcessing,
    isPaywallOpen,
    setIsPaywallOpen,
    remainingGenerations,
  } = useGenerateContent({ profile, targetFolderId, onGenerated, initialType });

  const id = useId();
  const fieldId = `${id}-field`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  // W-7.4: after a field has shown an error, re-validate it as the user types.
  const [touched, setTouched] = useState(false);

  const source = sourceOption(contentType);
  const isFile = contentType === "pdf" || contentType === "image";

  const pickSource = (type: SourceType) => {
    if (type === contentType) return;
    setContentType(type);
    setContentInput("");
    setSelectedFile(null);
    setError(null);
    setTouched(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const message = validate(contentType, contentInput, selectedFile);
    setTouched(true);
    setError(message);
    if (message) {
      // W-7.6: one-field form, so focus goes to the field.
      (isFile ? fileRef.current : textRef.current)?.focus();
      return;
    }
    void generateContent();
  };

  const hint =
    contentType === "youtube"
      ? "Paste the address from the YouTube app or your browser."
      : contentType === "url"
        ? "An article or lesson page. Pages behind a sign-in will not work."
        : contentType === "pdf"
          ? "One PDF, up to the size your browser can upload."
          : "A clear photo of handwritten or printed notes.";

  return (
    <>
      <ProcessingModal isOpen={isProcessing} />

      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        {targetFolderName && (
          <p className="flex items-center gap-1.5 text-subheadline text-supporting">
            <Folder aria-hidden="true" strokeWidth={STROKE} className="size-4" />
            Saving to {targetFolderName}
          </p>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-subheadline font-semibold">Make a note from</legend>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map(({ type, label, Icon }) => {
              const selected = contentType === type;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => pickSource(type)}
                  className={`relative inline-flex h-[2.125rem] items-center gap-1.5 rounded-full px-3 text-subheadline transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] pointer-coarse:after:absolute pointer-coarse:after:-inset-x-0 pointer-coarse:after:-inset-y-[0.3125rem] pointer-coarse:after:content-[''] ${
                    selected
                      ? "border-[1.5px] border-rust bg-rust-wash font-semibold text-label"
                      : "border border-divider bg-card text-label hover:bg-hover-fill"
                  }`}
                >
                  {selected ? (
                    <Check aria-hidden="true" strokeWidth={STROKE} className="size-4 text-rust" />
                  ) : (
                    <Icon aria-hidden="true" strokeWidth={STROKE} className="size-4 text-supporting" />
                  )}
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={fieldId} className="text-subheadline font-semibold">
            {source.fieldLabel}
          </label>
          <p id={hintId} className="text-subheadline text-supporting">{hint}</p>
          {error && (
            <p id={errorId} className="flex items-start gap-1.5 text-subheadline text-danger">
              <CircleAlert aria-hidden="true" strokeWidth={STROKE} className="mt-0.5 size-4 shrink-0" />
              <span><span className="sr-only">Error: </span>{error}</span>
            </p>
          )}

          {isFile ? (
            <div className="flex flex-col gap-2">
              {/* The native input is visually hidden but stays focusable, so the label and focus work. */}
              <input
                ref={fileRef}
                id={fieldId}
                type="file"
                accept={contentType === "pdf" ? "application/pdf,.pdf" : "image/*"}
                aria-describedby={error ? `${errorId} ${hintId}` : hintId}
                aria-invalid={error ? true : undefined}
                onChange={(e) => {
                  handleFileChange(e);
                  if (touched) setError(validate(contentType, "", e.target.files?.[0] ?? null));
                }}
                className="peer sr-only"
              />
              <label
                htmlFor={fieldId}
                className={`flex min-h-11 items-center gap-3 rounded-xl border-dashed bg-card px-3 py-2 text-callout peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring ${
                  error ? "border-2 border-danger" : "border border-input"
                }`}
              >
                <Upload aria-hidden="true" strokeWidth={STROKE} className="size-5 shrink-0 text-rust" />
                <span className="min-w-0 truncate">
                  {selectedFile ? selectedFile.name : contentType === "pdf" ? "Choose a PDF" : "Choose a photo"}
                </span>
              </label>
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setContentInput("");
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="inline-flex min-h-6 items-center gap-1 self-start text-subheadline text-rust hover:underline"
                >
                  <X aria-hidden="true" strokeWidth={STROKE} className="size-4" />
                  Remove {selectedFile.name}
                </button>
              )}
            </div>
          ) : (
            <input
              ref={textRef}
              id={fieldId}
              type="url"
              inputMode="url"
              autoComplete="url"
              spellCheck={false}
              value={contentInput}
              aria-describedby={error ? `${errorId} ${hintId}` : hintId}
              aria-invalid={error ? true : undefined}
              onChange={(e) => {
                setContentInput(e.target.value);
                if (touched) setError(validate(contentType, e.target.value, null));
              }}
              className={`h-11 rounded-xl bg-card px-3 text-callout text-label ${
                error ? "border-2 border-danger" : "border border-input"
              }`}
            />
          )}
        </div>

        <button type="submit" className="btn-primary self-start" disabled={isProcessing}>
          Make my study set
        </button>
      </form>

      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        remainingGenerations={remainingGenerations}
        profileId={profile?.id || 0}
      />
    </>
  );
}
