"use client";

import { useState, useEffect } from "react";
import { Quiz } from "@/lib/studyGuide";

interface InteractiveQuizProps {
  quizzes: Quiz[];
}

export function InteractiveQuiz({ quizzes }: InteractiveQuizProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<{ isCorrect: boolean }[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [startTime] = useState(Date.now());
  const [showConfetti, setShowConfetti] = useState(false);

  const currentQuiz = quizzes[currentIndex];
  const progress = ((currentIndex + 1) / quizzes.length) * 100;

  const handleSelectAnswer = (option: string) => {
    if (selectedAnswer) return;
    setSelectedAnswer(option);
    setShowResult(true);

    const isCorrect = option === currentQuiz.correct_answer;
    setAnswers([...answers, { isCorrect }]);

    if (isCorrect) {
      setStreak((prev) => prev + 1);
      const bonus = streak >= 3 ? 20 : 10;
      setPoints((prev) => prev + bonus);
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < quizzes.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setShowExplanation(false);
    } else {
      setIsCompleted(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  const handleTryAgain = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setShowExplanation(false);
    setAnswers([]);
    setIsCompleted(false);
    setStreak(0);
    setPoints(0);
  };

  const getTimeTaken = () => {
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const scorePercentage = Math.round((correctCount / quizzes.length) * 100);

  // Confetti effect
  const Confetti = () => (
    <div className="fixed inset-0 pointer-events-none z-50">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            backgroundColor: ["#964CEE", "#f15bb5", "#00f5d4", "#fee440", "#00bbf9"][
              Math.floor(Math.random() * 5)
            ],
          }}
        />
      ))}
    </div>
  );

  if (isCompleted) {
    return (
      <div className="mb-12">
        {showConfetti && <Confetti />}
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">🏆</span>
          <h2 className="text-xl font-semibold text-white font-rethink-sans">Quiz Complete!</h2>
        </div>

        <div className="bg-gradient-to-br from-[#964CEE]/20 to-[#f15bb5]/10 border border-[#964CEE]/20 rounded-2xl p-8 text-center">
          <div
            className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
              scorePercentage >= 70
                ? "bg-green-500/20"
                : scorePercentage >= 50
                ? "bg-yellow-500/20"
                : "bg-red-500/20"
            }`}
          >
            <span className="text-4xl">
              {scorePercentage >= 70 ? "🎉" : scorePercentage >= 50 ? "👍" : "💪"}
            </span>
          </div>

          <h3 className="text-2xl font-bold text-white mb-2 font-source-serif-4">
            {scorePercentage >= 70 ? "Great Job!" : scorePercentage >= 50 ? "Good Effort!" : "Keep Practicing!"}
          </h3>

          <div className="text-5xl font-bold bg-gradient-to-r from-[#964CEE] to-[#f15bb5] bg-clip-text text-transparent mb-6">
            {scorePercentage}%
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6 max-w-md mx-auto">
            <div className="bg-black/20 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-400">{correctCount}</p>
              <p className="text-xs text-white/50">Correct</p>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <p className="text-2xl font-bold text-red-400">{quizzes.length - correctCount}</p>
              <p className="text-xs text-white/50">Wrong</p>
            </div>
            <div className="bg-black/20 rounded-xl p-4">
              <p className="text-2xl font-bold text-[#964CEE]">{getTimeTaken()}</p>
              <p className="text-xs text-white/50">Time</p>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleTryAgain}
              className="px-6 py-3 bg-gradient-to-r from-[#964CEE] to-[#f15bb5] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🧠</span>
          <h2 className="text-xl font-semibold text-white font-rethink-sans">Quick Quiz</h2>
        </div>
        <div className="flex items-center gap-4">
          {streak >= 2 && (
            <span className="flex items-center gap-1 text-orange-400 text-sm font-medium">
              🔥 {streak} streak
            </span>
          )}
          <span className="text-sm text-white/50 font-rethink-sans">
            Score: {points} pts
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-white/50 mb-2 font-rethink-sans">
          <span>Question {currentIndex + 1} of {quizzes.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#964CEE] to-[#f15bb5] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-4">
        <p className="text-lg md:text-xl text-white font-rethink-sans leading-relaxed">
          {currentQuiz.question}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-4">
        {currentQuiz.options.map((option, index) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option === currentQuiz.correct_answer;
          const showCorrect = showResult && isCorrect;
          const showWrong = showResult && isSelected && !isCorrect;

          return (
            <button
              key={index}
              onClick={() => handleSelectAnswer(option)}
              disabled={showResult}
              className={`w-full p-4 rounded-xl text-left transition-all flex items-center gap-4 font-rethink-sans
                ${showCorrect
                  ? "bg-green-500/20 border-2 border-green-500 text-white"
                  : showWrong
                  ? "bg-red-500/20 border-2 border-red-500 text-white"
                  : isSelected
                  ? "bg-[#964CEE]/20 border-2 border-[#964CEE] text-white"
                  : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20"
                }
                ${showResult && !isSelected && !isCorrect ? "opacity-40" : ""}
              `}
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                  ${showCorrect || showWrong
                    ? "bg-white/20"
                    : "bg-white/10"
                  }
                `}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span className="flex-1">{option}</span>
              {showCorrect && <span className="text-green-400">✓</span>}
              {showWrong && <span className="text-red-400">✗</span>}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showResult && currentQuiz.explanation && (
        <div className="mb-4">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-rethink-sans"
          >
            <span>{showExplanation ? "▲" : "▼"}</span>
            <span>{showExplanation ? "Hide" : "Show"} Explanation</span>
          </button>
          {showExplanation && (
            <div className="mt-3 bg-white/5 rounded-xl p-4 text-white/70 text-sm leading-relaxed font-rethink-sans">
              {currentQuiz.explanation}
            </div>
          )}
        </div>
      )}

      {/* Next button */}
      {showResult && (
        <button
          onClick={handleNext}
          className="w-full py-4 bg-gradient-to-r from-[#964CEE] to-[#f15bb5] text-white rounded-xl font-medium hover:opacity-90 transition-opacity font-rethink-sans"
        >
          {currentIndex < quizzes.length - 1 ? "Next Question →" : "See Results 🏆"}
        </button>
      )}
    </div>
  );
}
