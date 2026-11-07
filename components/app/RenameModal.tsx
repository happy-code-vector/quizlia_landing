"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "@/components/app/Icon";

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
}

export function RenameModal({ isOpen, onClose, onRename, currentTitle, itemType, conflictNames }: RenameModalProps) {
  const [title, setTitle] = useState(currentTitle);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle);
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.select(), 100);
    } else {
      document.body.style.overflow = "unset";
    }
    setError("");
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, currentTitle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = title.trim();
    if (!next || next === currentTitle) {
      onClose();
      return;
    }
    const lower = next.toLowerCase();
    if (conflictNames && (lower.startsWith("general") || lower === "from web")) {
      setError("This folder name is reserved");
      return;
    }
    const collides = conflictNames?.some(
      (n) => n.trim().toLowerCase() !== currentTitle.trim().toLowerCase() &&
        n.trim().toLowerCase() === next.toLowerCase()
    );
    if (collides) {
      setError("A folder with this name already exists");
      return;
    }
    onRename(next);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-3">
                <Icon name="edit" className="text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Rename {itemType}
              </h3>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="Enter new title..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || title.trim() === currentTitle}
              className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
