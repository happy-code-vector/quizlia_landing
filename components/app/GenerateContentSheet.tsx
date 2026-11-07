"use client";

import { GenerateContentForm } from "./GenerateContentForm";
import type { Profile, ContentItem } from "@/lib/types";
import { Icon } from "@/components/app/Icon";

interface GenerateContentSheetProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  targetFolderId?: string;
  targetFolderName?: string;
  onGenerated?: (updatedContent: ContentItem[]) => void;
}

export function GenerateContentSheet({
  isOpen,
  onClose,
  profile,
  targetFolderId,
  targetFolderName,
  onGenerated,
}: GenerateContentSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Generate Content</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="p-6">
          <GenerateContentForm
            profile={profile}
            targetFolderId={targetFolderId}
            targetFolderName={targetFolderName}
            onGenerated={onGenerated}
          />
        </div>
      </div>
    </div>
  );
}
