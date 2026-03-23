"use client";

import { useEffect } from "react";

interface DeleteFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMoveToGeneral: () => void;
  onDeleteAll: () => void;
  folderName: string;
  itemCount: number;
}

export function DeleteFolderModal({
  isOpen,
  onClose,
  onMoveToGeneral,
  onDeleteAll,
  folderName,
  itemCount,
}: DeleteFolderModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800 animate-slide-in">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-3 shrink-0">
              <span className="material-symbols-outlined text-red-600">folder_delete</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Delete Folder
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                What would you like to do with &quot;{folderName}&quot; and its {itemCount} item{itemCount !== 1 ? "s" : ""}?
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 flex flex-col gap-3">
          {/* Move to General option */}
          <button
            onClick={() => {
              onMoveToGeneral();
              onClose();
            }}
            className="w-full px-4 py-3 rounded-lg font-medium text-left flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-200 dark:border-blue-800"
          >
            <span className="material-symbols-outlined">drive_file_move</span>
            <div>
              <p className="font-medium">Keep Items</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Move all items to General folder</p>
            </div>
          </button>

          {/* Delete All option */}
          <button
            onClick={() => {
              onDeleteAll();
              onClose();
            }}
            className="w-full px-4 py-3 rounded-lg font-medium text-left flex items-center gap-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800"
          >
            <span className="material-symbols-outlined">delete_forever</span>
            <div>
              <p className="font-medium">Delete Everything</p>
              <p className="text-xs text-red-600 dark:text-red-400">Delete folder and all its items permanently</p>
            </div>
          </button>

          {/* Cancel */}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mt-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
