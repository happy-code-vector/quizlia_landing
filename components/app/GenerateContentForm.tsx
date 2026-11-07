"use client";

import { ProcessingModal } from "@/components/app/ProcessingModal";
import { PaywallModal } from "@/components/app/PaywallModal";
import { useGenerateContent } from "@/hooks/useGenerateContent";
import type { Profile, ContentItem } from "@/lib/types";
import { Icon } from "@/components/app/Icon";

interface GenerateContentFormProps {
  profile: Profile | null;
  targetFolderId?: string;
  targetFolderName?: string;
  onGenerated?: (updatedContent: ContentItem[]) => void;
}

export function GenerateContentForm({
  profile,
  targetFolderId,
  targetFolderName,
  onGenerated,
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
  } = useGenerateContent({ profile, targetFolderId, onGenerated });

  return (
    <>
      <ProcessingModal
        isOpen={isProcessing}
        message="Analyzing your content and generating study materials..."
      />

      {targetFolderName && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-4">
          <Icon name="folder" className="text-sm" />
          Saving to: {targetFolderName}
        </p>
      )}

      {/* Content Type Tabs */}
      <div className="flex flex-col sm:flex-row h-auto sm:h-14 w-full items-center rounded-xl bg-gray-100 dark:bg-gray-800 p-1.5 gap-2 sm:gap-1 mb-6">
        {[
          { type: "url", icon: "link", label: "URL" },
          { type: "pdf", icon: "picture_as_pdf", label: "PDF" },
          { type: "youtube", icon: "play_circle", label: "YouTube" },
          { type: "image", icon: "image", label: "Image" },
        ].map(({ type, icon, label }) => (
          <button
            key={type}
            onClick={() => setContentType(type)}
            className={`flex cursor-pointer h-full grow items-center justify-center gap-2 rounded-lg px-4 py-2 w-full text-sm font-medium transition-all ${
              contentType === type
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <Icon name={icon} className="text-lg" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Input Field */}
      <div className="flex flex-col sm:flex-row gap-3">
        {contentType === "url" || contentType === "youtube" ? (
          <input
            type="text"
            value={contentInput}
            onChange={(e) => setContentInput(e.target.value)}
            placeholder={contentType === "url" ? "Paste URL here..." : "Paste YouTube URL here..."}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <div className="flex-1 relative">
            <input
              type="file"
              id="file-upload"
              accept={contentType === "pdf" ? ".pdf" : "image/*"}
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center justify-between w-full px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:border-blue-500 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-2">
                <Icon name="upload_file" className="text-gray-400" />
                <span className="text-sm">
                  {selectedFile ? selectedFile.name : `Click to upload ${contentType.toUpperCase()}`}
                </span>
              </span>
              {selectedFile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedFile(null);
                    setContentInput("");
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Icon name="close" className="text-sm" />
                </button>
              )}
            </label>
          </div>
        )}
        <button
          onClick={generateContent}
          disabled={!contentInput.trim() && !selectedFile}
          className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate
        </button>
      </div>

      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        remainingGenerations={remainingGenerations}
        profileId={profile?.id || 0}
      />
    </>
  );
}
