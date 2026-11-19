"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Check, X } from "lucide-react"

type Q = { q: string; options: string[]; answer: number; why: string }

const primary =
  "inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-headline text-primary-foreground transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-primary-hover active:scale-[0.98] active:bg-primary-active"

// What the result card says for each score. The score is out of the number of questions.
function result(right: number, total: number) {
  if (right === total) {
    return { head: `${right} out of ${total}. You know your stuff.`, body: "Keep it going. QuizliAI turns any lesson into notes, flashcards and quizzes.", cta: "Learn more at QuizliAI", bear: "celebrate" }
  }
  if (right >= total - 1) {
    return { head: `${right} out of ${total}. So close.`, body: "A little more practice will lock it in. QuizliAI builds that practice from your own notes.", cta: "Get the app", bear: "think" }
  }
  return { head: `${right} out of ${total}. Seems like you need more help.`, body: "Download the app today. QuizliAI makes flashcards and quizzes from any lesson.", cta: "Download the app", bear: "think" }
}

// Pick an option, see the result and the reason. When every question is answered, a card shows the score and a matching call to action.
// No score is stored.
export function Quiz({ items, storeUrl }: { items: Q[]; storeUrl: string }) {
  const [picked, setPicked] = useState<(number | null)[]>(items.map(() => null))
  const list = useRef<HTMLOListElement>(null)
  const answered = picked.filter((p) => p !== null).length
  const done = answered === items.length
  const right = picked.filter((p, i) => p === items[i].answer).length
  const r = done ? result(right, items.length) : null

  return (
    <div>
      <ol ref={list} className="space-y-4">
        {items.map((item, i) => {
          const p = picked[i]
          const isDone = p !== null
          return (
            <li key={item.q} className="ds-card p-5">
              <p className="text-subheadline font-semibold text-rust">Question {i + 1}</p>
              <p className="mt-1 text-headline text-label">{item.q}</p>
              <ul className="mt-3 space-y-2">
                {item.options.map((o, j) => {
                  const isRight = isDone && j === item.answer
                  const isWrong = isDone && j === p && j !== item.answer
                  return (
                    <li key={o}>
                      <button
                        type="button"
                        disabled={isDone}
                        aria-pressed={p === j}
                        onClick={() => setPicked((s) => s.map((v, k) => (k === i ? j : v)))}
                        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-4 py-2 text-left text-callout text-label transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] ${
                          isRight ? "border-success" : isWrong ? "border-danger" : "border-input hover:bg-hover-fill"
                        }`}
                      >
                        <span>{o}</span>
                        {isRight && <Check aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-success" />}
                        {isWrong && <X aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-danger" />}
                        {isRight && <span className="sr-only">Correct</span>}
                        {isWrong && <span className="sr-only">Not correct</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
              {isDone && (
                <p className="mt-3 text-subheadline text-supporting" role="status">
                  {p === item.answer ? "Correct. " : "Not quite. "}
                  {item.why}
                </p>
              )}
            </li>
          )
        })}
      </ol>

      {r && (
        <div role="status" className="ds-card mt-4 flex items-center gap-5 p-5 md:gap-6 md:p-6 motion-safe:animate-[fadeUp_220ms_cubic-bezier(0.2,0,0,1)]">
          <Image src={`/mascot/quizliai_mascot_${r.bear}.webp`} alt="" width={69} height={128} className="h-28 w-auto shrink-0" />
          <div className="min-w-0">
            <p className="text-title3 font-semibold text-label">{r.head}</p>
            <p className="mt-1 text-callout text-supporting">{r.body}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
              <a href={storeUrl} target="_blank" rel="noopener noreferrer" className={primary}>
                {r.cta}
                <span className="sr-only"> (opens the App Store)</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setPicked(items.map(() => null))
                  // The result card disappears, so move keyboard focus to the first answer instead of losing it.
                  requestAnimationFrame(() => list.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus())
                }}
                className="min-h-11 text-subheadline font-semibold text-rust underline-offset-4 hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
