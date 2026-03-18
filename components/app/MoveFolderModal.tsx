"use client";

interface Folder {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
}

interface MoveFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: Folder[];
  currentFolderId: string | null;
  onMoveToFolder: (folderId: string | null) => void;
}

export function MoveFolderModal({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  onMoveToFolder,
}: MoveFolderModalProps) {
  const handleMove = (folderId: string | null) => {
    onMoveToFolder(folderId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Move to Folder</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Folder List */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {/* No Folder Option */}
          <button
            onClick={() => currentFolderId !== null && handleMove(null)}
            disabled={currentFolderId === null}
            className={`w-full flex items-center gap-3 p-4 rounded-lg mb-2 transition-all ${
              currentFolderId === null
                ? "bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 opacity-60 cursor-not-allowed"
                : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
            }`}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg flex items-center justify-center text-2xl">
              📂
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium text-gray-900 dark:text-white">General</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentFolderId === null ? "Current location" : "Default folder"}
              </p>
            </div>
            {currentFolderId === null && (
              <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">Current</span>
            )}
          </button>

          {/* User Folders */}
          {folders.map((folder) => {
            const isCurrent = currentFolderId === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => !isCurrent && handleMove(folder.id)}
                disabled={isCurrent}
                className={`w-full flex items-center gap-3 p-4 rounded-lg mb-2 transition-all ${
                  isCurrent
                    ? "bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 opacity-60 cursor-not-allowed"
                    : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg flex items-center justify-center text-2xl border border-purple-200 dark:border-purple-800">
                  {folder.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 dark:text-white">{folder.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isCurrent ? "Current location" : `${folder.itemCount} item${folder.itemCount !== 1 ? "s" : ""}`}
                  </p>
                </div>
                {isCurrent && (
                  <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">Current</span>
                )}
              </button>
            );
          })}

          {folders.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-sm">No custom folders yet</p>
              <p className="text-xs mt-1">Create a folder to organize your content</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800">
          <button onClick={onClose} className="w-full btn-secondary">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
