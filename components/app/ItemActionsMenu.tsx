"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@/components/app/Icon";

interface ItemActionsMenuProps {
  onRename: () => void;
  onMove?: () => void;
  showMove?: boolean;
  onDelete?: () => void;
  buttonClassName?: string;
}

export function ItemActionsMenu({ onRename, onMove, showMove = true, onDelete, buttonClassName = "" }: ItemActionsMenuProps) {
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
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors ${buttonClassName}`}
        title="More actions"
      >
        <Icon name="more_vert" className="text-lg" />
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
            <Icon name="edit" className="text-lg text-orange-600" />
            Rename
          </button>
          {showMove && onMove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMove();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
            >
              <Icon name="drive_file_move" className="text-lg text-purple-600" />
              Move to Folder
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3"
            >
              <Icon name="delete" className="text-lg text-red-600" />
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
