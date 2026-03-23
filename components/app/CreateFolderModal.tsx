"use client";

import { useState } from "react";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (folderName: string, folderIcon: string) => void;
}

const FOLDER_EMOJIS = [
  "📁", "📂", "📚", "📖", "📝", "📋", "📌", "📍",
  "🎯", "🎓", "🎨", "🎭", "🎪", "🎬", "🎮", "🎲",
  "⚡", "⭐", "🌟", "💡", "🔥", "💎", "🏆", "🎁",
  "🚀", "✈️", "🌈", "🌸", "🌺", "🌻", "🌼", "🌷",
  "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐",
  "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱",
];

export function CreateFolderModal({ isOpen, onClose, onCreateFolder }: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("📁");
  const [error, setError] = useState("");

  const handleCreate = () => {
    const trimmedName = folderName.trim();

    if (!trimmedName) {
      setError("Please enter a folder name");
      return;
    }

    if (trimmedName.length < 3) {
      setError("Folder name must be at least 3 characters");
      return;
    }

    if (trimmedName.length > 20) {
      setError("Folder name must not exceed 20 characters");
      return;
    }

    onCreateFolder(trimmedName, selectedIcon);
    setFolderName("");
    setSelectedIcon("📁");
    setError("");
    onClose();
  };

  const handleClose = () => {
    setFolderName("");
    setSelectedIcon("📁");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Folder</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Selected Icon Display */}
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl flex items-center justify-center border-2 border-purple-200 dark:border-purple-800">
              <span className="text-5xl">{selectedIcon}</span>
            </div>
          </div>

          {/* Folder Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Folder Name
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value);
                setError("");
              }}
              placeholder="Enter folder name"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={20}
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {folderName.length}/20 characters
            </p>
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Choose Icon
            </label>
            <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              {FOLDER_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedIcon(emoji)}
                  className={`w-10 h-10 flex items-center justify-center text-2xl rounded-lg transition-all ${
                    selectedIcon === emoji
                      ? "bg-gradient-to-br from-purple-500 to-pink-500 scale-110 shadow-lg"
                      : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-800">
          <button onClick={handleClose} className="flex-1 btn-secondary">
            Cancel
          </button>
          <button onClick={handleCreate} className="flex-1 btn-primary">
            Create Folder
          </button>
        </div>
      </div>
    </div>
  );
}
