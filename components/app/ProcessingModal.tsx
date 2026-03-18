"use client";

interface ProcessingModalProps {
  isOpen: boolean;
  message?: string;
}

export function ProcessingModal({ isOpen, message = "Processing your content..." }: ProcessingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-800">
        <div className="flex flex-col items-center text-center">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-blue-200 dark:border-blue-900 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            <span className="material-symbols-outlined absolute inset-0 flex items-center justify-center text-blue-600 text-3xl">
              auto_awesome
            </span>
          </div>

          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            AI is Working Its Magic
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {message}
          </p>

          <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
            This usually takes a few seconds...
          </p>
        </div>
      </div>
    </div>
  );
}
