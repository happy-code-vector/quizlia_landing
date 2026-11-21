"use client"

import { useEffect, useState } from "react"

const KEY = "quizliai-phonebar-dismissed"
const DAYS = 7

// The phone download bar with a "Not now" close. The choice is remembered in the browser for 7 days.
// Storage can be blocked, so every read and write is wrapped. The bar shows by default.
export function PhoneBar({ href }: { href: string }) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    try {
      const t = Number(localStorage.getItem(KEY))
      if (t && Date.now() - t < DAYS * 86400000) setHidden(true)
    } catch {}
  }, [])

  if (hidden) return null

  return (
    <aside aria-label="Download QuizliAI" className="fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-[45rem] items-center justify-between gap-3">
        <p className="text-headline text-label">Get the app</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem(KEY, String(Date.now()))
              } catch {}
              setHidden(true)
              // The button disappears, so move keyboard focus to the page content instead of losing it.
              const main = document.getElementById("main")
              if (main) {
                if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1")
                main.focus({ preventScroll: true })
              }
            }}
            className="min-h-11 min-w-11 rounded-full px-3 text-subheadline font-semibold text-rust hover:bg-hover-fill"
          >
            Not now
          </button>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-headline text-primary-foreground transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-primary-hover active:scale-[0.98] active:bg-primary-active"
          >
            Download
            <span className="sr-only"> QuizliAI (opens the App Store)</span>
          </a>
        </div>
      </div>
    </aside>
  )
}
