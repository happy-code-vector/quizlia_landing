"use client";

import { useState, useRef, useEffect } from "react";

interface ItemActionsMenuProps {
  onRename: () => void;
  onMove: () => void;
  showMove?: boolean;
}

export function ItemActionsMenu({ onRename, onMove, showMove = true }: ItemActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
        title="More actions"
      >
        <span className="material-symbols-outlined text-lg">more_vert</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRename();
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-lg text-orange-600">edit</span>
            Rename
          </button>
          {showMove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMove();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
            >
              <span className="material-symbols-outlined text-lg text-purple-600">drive_file_move</span>
              Move to Folder
            </button>
          )}
        </div>
      )}
    </div>
  );
}
