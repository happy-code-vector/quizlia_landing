"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"

type Q = { q: string; options: string[]; answer: number; why: string }

// One question at a time on the page: pick an option, see the result and the reason. No score is stored.
export function Quiz({ items }: { items: Q[] }) {
  const [picked, setPicked] = useState<(number | null)[]>(items.map(() => null))
  return (
    <ol className="space-y-4">
      {items.map((item, i) => {
        const p = picked[i]
        const done = p !== null
        return (
          <li key={item.q} className="ds-card p-5">
            <p className="text-subheadline font-semibold text-rust">Question {i + 1}</p>
            <p className="mt-1 text-headline text-label">{item.q}</p>
            <ul className="mt-3 space-y-2">
              {item.options.map((o, j) => {
                const right = done && j === item.answer
                const wrong = done && j === p && j !== item.answer
                return (
                  <li key={o}>
                    <button
                      type="button"
                      disabled={done}
                      aria-pressed={p === j}
                      onClick={() => setPicked((s) => s.map((v, k) => (k === i ? j : v)))}
                      className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-4 py-2 text-left text-callout text-label transition-colors duration-150 ease-[cubic-bezier(0.2,0,0,1)] ${
                        right ? "border-success" : wrong ? "border-danger" : "border-divider hover:bg-hover-fill"
                      }`}
                    >
                      <span>{o}</span>
                      {right && <Check aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-success" />}
                      {wrong && <X aria-hidden="true" strokeWidth={1.75} className="size-5 shrink-0 text-danger" />}
                      {right && <span className="sr-only">Correct</span>}
                      {wrong && <span className="sr-only">Not correct</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
            {done && (
              <p className="mt-3 text-subheadline text-supporting" role="status">
                {p === item.answer ? "Correct. " : "Not quite. "}
                {item.why}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
