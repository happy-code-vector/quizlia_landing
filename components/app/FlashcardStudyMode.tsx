"use client";

import { useState } from "react";

interface Flashcard {
  question: string;
  answer: string;
}

interface FlashcardStudyModeProps {
  flashcards: Flashcard[];
  onClose: () => void;
}

export function FlashcardStudyMode({ flashcards, onClose }: FlashcardStudyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex - 1), 150);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") handleNext();
    if (e.key === "ArrowLeft") handlePrev();
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleFlip();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-green-900 via-teal-900 to-emerald-900 overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 text-white shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
          title="Exit Study Mode"
        >
          <span className="material-symbols-outlined">close</span>
          <span className="text-sm font-medium hidden sm:inline">Exit Study</span>
        </button>
        <div className="text-center">
          <p className="text-xs sm:text-sm opacity-75">Flashcard</p>
          <p className="text-base sm:text-lg font-bold">{currentIndex + 1} of {flashcards.length}</p>
        </div>
        <div className="w-16 sm:w-24" />
      </div>

      {/* Progress Bar */}
      <div className="px-3 sm:px-4 shrink-0">
        <div className="h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 md:p-8 min-h-0 overflow-hidden">
        <div
          className="relative w-full max-w-2xl h-full max-h-[70vh] sm:max-h-[60vh] cursor-pointer perspective-1000"
          onClick={handleFlip}
        >
          <div
            className={`absolute inset-0 transition-transform duration-500 transform-style-3d ${
              isFlipped ? "rotate-y-180" : ""
            }`}
          >
            {/* Front - Question */}
            <div className="absolute inset-0 backface-hidden bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 mb-3 sm:mb-4 shrink-0">
                <span className="bg-green-100 text-green-600 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                  Question
                </span>
              </div>
              <div className="flex-1 flex items-center justify-center overflow-y-auto min-h-0">
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium text-gray-900 text-center leading-relaxed px-2">
                  {currentCard.question}
                </p>
              </div>
              <div className="text-center text-gray-400 text-xs sm:text-sm mt-3 shrink-0">
                <span className="material-symbols-outlined text-base sm:text-lg align-middle">touch_app</span>
                {" "}Tap to reveal answer
              </div>
            </div>

            {/* Back - Answer */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 mb-3 sm:mb-4 shrink-0">
                <span className="bg-white/20 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                  Answer
                </span>
              </div>
              <div className="flex-1 flex items-center justify-center overflow-y-auto min-h-0">
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium text-white text-center leading-relaxed px-2">
                  {currentCard.answer}
                </p>
              </div>
              <div className="text-center text-white/60 text-xs sm:text-sm mt-3 shrink-0">
                <span className="material-symbols-outlined text-base sm:text-lg align-middle">touch_app</span>
                {" "}Tap to see question
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 p-3 sm:p-6 shrink-0">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg sm:rounded-xl transition-colors"
          title="Previous Card"
        >
          <span className="material-symbols-outlined text-lg sm:text-xl">arrow_back</span>
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page Indicators - Hide on mobile if too many */}
        <div className="hidden sm:flex gap-1.5 sm:gap-2 px-2 sm:px-4 max-w-[200px] overflow-x-auto">
          {flashcards.length <= 10 ? (
            flashcards.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex(index);
                }}
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all shrink-0 ${
                  index === currentIndex
                    ? "bg-white scale-125"
                    : "bg-white/30 hover:bg-white/50"
                }`}
                title={`Go to card ${index + 1}`}
              />
            ))
          ) : (
            <span className="text-white/60 text-sm">{currentIndex + 1} / {flashcards.length}</span>
          )}
        </div>

        {/* Mobile indicator */}
        <div className="sm:hidden text-white/60 text-sm px-2">
          {currentIndex + 1} / {flashcards.length}
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === flashcards.length - 1}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg sm:rounded-xl transition-colors"
          title="Next Card"
        >
          <span className="hidden sm:inline">Next</span>
          <span className="material-symbols-outlined text-lg sm:text-xl">arrow_forward</span>
        </button>
      </div>

      {/* Keyboard Hints - Hide on mobile */}
      <div className="hidden sm:block text-center pb-4 text-white/50 text-sm shrink-0">
        Use ← → arrow keys to navigate, Space to flip
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
