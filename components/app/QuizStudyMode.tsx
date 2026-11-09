"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, CircleCheck, CircleX, Share2 } from "lucide-react";
import { MarkdownText } from "@/components/app/MarkdownText";
import { StudySurface, StudyProgress, type Shortcut } from "@/components/app/study/StudySurface";

interface Quiz {
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export interface QuizRunResult {
  total: number;
  answers: Array<{ i: number; correct: boolean }>;
  startedAt: Date;
  finishedAt: Date;
}

interface QuizStudyModeProps {
  quizzes: Quiz[];
  topicTitle?: string;
  onClose: () => void;
  /** Called once each time a run finishes (also after Try again). */
  onComplete?: (result: QuizRunResult) => void;
}

interface Answer {
  questionIndex: number;
  selected: string;
  correct: string;
  isCorrect: boolean;
}

const ICON = { strokeWidth: 1.75, "aria-hidden": true } as const;
const LETTERS = ["A", "B", "C", "D", "E", "F"];

const SHORTCUTS: Shortcut[] = [
  { keys: ["1", "2", "3", "4"], action: "Pick an answer" },
  { keys: ["Enter"], action: "Next question" },
  { keys: ["→"], action: "Next question" },
  { keys: ["Esc"], action: "Back to the note" },
  { keys: ["?"], action: "Show these shortcuts" },
];

/**
 * Quiz study mode on the study surface. Correctness always shows as an icon plus words, never
 * color alone (W-9.6). No live score while answering, matching the games (2026-11-05). The bear
 * appears only on the result screen.
 */
export function QuizStudyMode({ quizzes, topicTitle, onClose, onComplete }: QuizStudyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [startTime, setStartTime] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [shared, setShared] = useState<string | null>(null);
  const reported = useRef(false);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);

  // One report per finished run; Try again resets it.
  useEffect(() => {
    if (!isCompleted || reported.current || !onComplete) return;
    reported.current = true;
    onComplete({
      total: quizzes.length,
      answers: answers.map((a) => ({ i: a.questionIndex, correct: a.isCorrect })),
      startedAt: new Date(startTime),
      finishedAt: new Date(finishedAt ?? Date.now()),
    });
  }, [isCompleted, onComplete, answers, quizzes.length, startTime, finishedAt]);

  // Focus follows the question (W-5.4): the new question heading on Next, the result heading at the end.
  useEffect(() => {
    if (isCompleted) {
      resultRef.current?.focus({ preventScroll: true });
      return;
    }
    // First question: no keyboard step yet, so no ring; later questions follow the browser heuristic.
    questionRef.current?.focus(currentIndex === 0 ? ({ preventScroll: true, focusVisible: false } as FocusOptions) : { preventScroll: true });
  }, [currentIndex, isCompleted]);

  // The Next button appears once an answer is picked; focus moves to it after it renders.
  useEffect(() => {
    if (selectedAnswer !== null) nextRef.current?.focus({ preventScroll: true });
  }, [selectedAnswer]);

  if (quizzes.length === 0) return null;

  const currentQuiz = quizzes[currentIndex];
  const answered = selectedAnswer !== null;
  const isLast = currentIndex >= quizzes.length - 1;

  const handleSelectAnswer = (option: string) => {
    if (answered) return;
    setSelectedAnswer(option);
    const isCorrect = option === currentQuiz.correct_answer;
    setAnswers((prev) => [...prev, { questionIndex: currentIndex, selected: option, correct: currentQuiz.correct_answer, isCorrect }]);
  };

  const handleNext = () => {
    if (!answered) return;
    if (!isLast) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
    } else {
      setFinishedAt(Date.now());
      setIsCompleted(true);
    }
  };

  const handleTryAgain = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAnswers([]);
    setIsCompleted(false);
    setFinishedAt(null);
    setShared(null);
    setStartTime(Date.now());
    reported.current = false;
  };

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const scorePercentage = Math.round((correctCount / quizzes.length) * 100);
  const seconds = Math.max(0, Math.floor(((finishedAt ?? startTime) - startTime) / 1000));
  const timeTaken = `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  const handleShareResult = async () => {
    const text = `I got ${correctCount} of ${quizzes.length} right (${scorePercentage}%) on ${topicTitle ? `"${topicTitle}"` : "a QuizliAI quiz"}.`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // share sheet cancelled
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShared("Result copied to the clipboard.");
    } catch {
      setShared("Sharing isn't available in this browser.");
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (isCompleted) return;
    const target = e.target as HTMLElement;
    const onControl = !!target.closest("button, a, input, textarea, select");
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 1 && n <= currentQuiz.options.length) {
      e.preventDefault();
      handleSelectAnswer(currentQuiz.options[n - 1]);
    } else if ((e.key === "Enter" && !onControl) || e.key === "ArrowRight") {
      if (!answered) return;
      e.preventDefault();
      handleNext();
    }
  };

  if (isCompleted) {
    return (
      <StudySurface
        title="Quiz"
        subtitle={topicTitle}
        backLabel="Back to the note"
        onBack={onClose}
        shortcuts={SHORTCUTS}
        onKeyDown={onKeyDown}
        footer={
          <div className="flex flex-col items-center gap-2">
            <button type="button" onClick={handleTryAgain} className="btn-primary min-h-12 w-full">Try again</button>
            <div className="flex flex-wrap items-center justify-center gap-x-4">
              <button type="button" onClick={handleShareResult} className="inline-flex min-h-11 items-center gap-2 px-3 text-subheadline font-semibold text-rust-on-tint hover:underline">
                <Share2 {...ICON} className="size-4" /> Share result
              </button>
              <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center px-3 text-subheadline font-semibold text-rust-on-tint hover:underline">
                Back to the note
              </button>
            </div>
          </div>
        }
      >
        <div className="mx-auto flex w-full max-w-[45rem] flex-1 flex-col items-center justify-center gap-6 px-4 py-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mascot/quizliai_mascot_thumbs_up.webp" alt="" width={160} height={160} className="size-36 object-contain sm:size-40" />
          <div className="flex flex-col gap-2">
            <h2 ref={resultRef} tabIndex={-1} className="font-serif text-title font-semibold lg:text-large-title">
              You got {correctCount} of {quizzes.length} right
            </h2>
            <p className="tabular text-callout text-supporting">{scorePercentage}% on {topicTitle ?? "this quiz"}</p>
          </div>
          <div className="grid w-full max-w-[30rem] grid-cols-3 gap-3">
            <div className="ds-card flex flex-col items-center gap-1 p-4">
              <CircleCheck {...ICON} className="size-6 text-success" />
              <p className="tabular text-title2 font-semibold">{correctCount}</p>
              <p className="text-subheadline text-supporting">Correct</p>
            </div>
            <div className="ds-card flex flex-col items-center gap-1 p-4">
              <CircleX {...ICON} className="size-6 text-danger" />
              <p className="tabular text-title2 font-semibold">{quizzes.length - correctCount}</p>
              <p className="text-subheadline text-supporting">Missed</p>
            </div>
            <div className="ds-card flex flex-col items-center gap-1 p-4">
              <span aria-hidden="true" className="size-6" />
              <p className="tabular text-title2 font-semibold">{timeTaken}</p>
              <p className="text-subheadline text-supporting">Time</p>
            </div>
          </div>
          <p role="status" className="min-h-6 text-subheadline text-supporting">{shared}</p>
        </div>
      </StudySurface>
    );
  }

  const picked = answers[answers.length - 1];
  const wasCorrect = answered && picked?.questionIndex === currentIndex && picked.isCorrect;

  return (
    <StudySurface
      title="Quiz"
      subtitle={topicTitle}
      backLabel="Back to the note"
      onBack={onClose}
      shortcuts={SHORTCUTS}
      onKeyDown={onKeyDown}
      footer={
        answered ? (
          <button ref={nextRef} type="button" onClick={handleNext} className="btn-primary min-h-12 w-full">
            {isLast ? "See results" : "Next question"}
            <ArrowRight {...ICON} className="size-5" />
          </button>
        ) : (
          <p className="flex min-h-12 items-center justify-center text-center text-subheadline text-supporting">
            Pick an answer to continue.
          </p>
        )
      }
    >
      <div className="mx-auto flex w-full max-w-[45rem] flex-col gap-5 px-4 pt-4 pb-6 sm:pt-6">
        <div className="flex flex-col gap-2">
          <p className="tabular text-subheadline font-semibold">Question {currentIndex + 1} of {quizzes.length}</p>
          <StudyProgress value={currentIndex + (answered ? 1 : 0)} total={quizzes.length} />
        </div>

        <section aria-labelledby="quiz-question" className="ds-card rounded-[1.375rem] p-6 sm:p-8">
          <h2 id="quiz-question" ref={questionRef} tabIndex={-1} className="font-serif text-title3 font-semibold sm:text-title2">
            <span className="sr-only">Question {currentIndex + 1} of {quizzes.length}. </span>
            {currentQuiz.question}
          </h2>
        </section>

        <ul aria-label="Answers" className="flex flex-col gap-3">
          {currentQuiz.options.map((option, i) => {
            const isPicked = selectedAnswer === option;
            const isCorrect = option === currentQuiz.correct_answer;
            const showCorrect = answered && isCorrect;
            const showWrong = answered && isPicked && !isCorrect;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => handleSelectAnswer(option)}
                  aria-disabled={answered || undefined}
                  className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left text-body transition-[border-color,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] ${
                    showCorrect ? "border-success" : showWrong ? "border-danger" : "border-card-stroke shadow-card"
                  } ${answered ? "cursor-default" : "hover:border-input"}`}
                >
                  <span
                    aria-hidden="true"
                    className={`tabular flex size-8 shrink-0 items-center justify-center rounded-full text-subheadline font-semibold ${
                      isPicked ? "bg-label text-card" : "bg-control text-label"
                    }`}
                  >
                    {i < LETTERS.length ? LETTERS[i] : i + 1}
                  </span>
                  <span className="flex-1">{option}</span>
                  {showCorrect && (
                    <span className="flex shrink-0 items-center gap-1 text-subheadline font-semibold">
                      <CircleCheck {...ICON} className="size-5 text-success" />
                      {isPicked ? "Your answer" : "Answer"}
                    </span>
                  )}
                  {showWrong && (
                    <span className="flex shrink-0 items-center gap-1 text-subheadline font-semibold">
                      <CircleX {...ICON} className="size-5 text-danger" />
                      Your answer
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div aria-live="polite" className="flex flex-col gap-3">
          {answered && (
            <>
              <p className="flex items-center gap-2 text-headline">
                {wasCorrect ? (
                  <><CircleCheck {...ICON} className="size-5 shrink-0 text-success" /> Correct.</>
                ) : (
                  <><CircleX {...ICON} className="size-5 shrink-0 text-danger" /> Not quite. The answer is {currentQuiz.correct_answer}.</>
                )}
              </p>
              {currentQuiz.explanation && (
                <div className="rounded-2xl bg-paper p-5 text-on-paper">
                  <p className="text-footnote font-semibold text-on-paper-supporting">Why</p>
                  <MarkdownText text={currentQuiz.explanation} className="mt-1 text-callout leading-relaxed [&_strong]:font-semibold" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </StudySurface>
  );
}
