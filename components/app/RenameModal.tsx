"use client";

import { useId, useRef, useState, type RefObject } from "react";
import { CircleAlert } from "lucide-react";
import { CardDialog } from "@/components/app/CardDialog";

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (newTitle: string) => void;
  currentTitle: string;
  itemType: string;
  /** Case-insensitive names that block the rename (folders only). The
   *  current title itself is excluded — renaming to a case-variant of
   *  yourself is a harmless no-op (spec 2026-11-06). */
  conflictNames?: string[];
  /** Focus target on close when the opener is gone (a menu item). */
  returnFocusTo?: RefObject<HTMLElement | null>;
}

/** Rename dialog (W-7: visible label, validate on submit, error above the field, never clears the field). */
export function RenameModal({ isOpen, onClose, onRename, currentTitle, itemType, conflictNames, returnFocusTo }: RenameModalProps) {
  const [title, setTitle] = useState(currentTitle);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = title.trim();
    if (!next) {
      setError(`Enter a name for the ${itemType}`);
      inputRef.current?.focus();
      return;
    }
    if (next === currentTitle) {
      onClose();
      return;
    }
    const lower = next.toLowerCase();
    if (conflictNames && (lower.startsWith("general") || lower === "from web")) {
      setError("Choose another name. This folder name is reserved");
      inputRef.current?.focus();
      return;
    }
    const collides = conflictNames?.some(
      (n) => n.trim().toLowerCase() !== currentTitle.trim().toLowerCase() &&
        n.trim().toLowerCase() === next.toLowerCase()
    );
    if (collides) {
      setError("Choose another name. A folder with this name already exists");
      inputRef.current?.focus();
      return;
    }
    onRename(next);
    onClose();
  };

  return (
    <CardDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={`Rename ${itemType}`}
      returnFocusTo={returnFocusTo}
      onOpenAutoFocus={(e) => {
        e.preventDefault();
        setTitle(currentTitle);
        setError("");
        requestAnimationFrame(() => inputRef.current?.select());
      }}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${id}-name`} className="text-subheadline font-semibold">Name</label>
          {error && (
            <p id={`${id}-error`} className="flex items-center gap-1.5 text-subheadline text-danger">
              <CircleAlert aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0" />
              <span className="sr-only">Error:</span> {error}
            </p>
          )}
          <input
            ref={inputRef}
            id={`${id}-name`}
            type="text"
            autoComplete="off"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError("");
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`h-11 rounded-xl bg-card px-3 text-callout ${error ? "border-2 border-danger" : "border border-input"}`}
          />
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">Rename</button>
        </div>
      </form>
    </CardDialog>
  );
}
