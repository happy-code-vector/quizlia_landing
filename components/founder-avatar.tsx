"use client"

import { useState } from "react"
import Image from "next/image"

export function FounderAvatar() {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="w-36 h-36 rounded-full bg-c-brand flex items-center justify-center text-6xl font-extrabold text-white mb-6 shrink-0">
        A
      </div>
    )
  }

  return (
    <div className="relative w-36 h-36 rounded-full overflow-hidden mb-6 shrink-0 ring-2 ring-c-brand/30">
      <Image
        src="/founder.jpg"
        alt="Ahmad Rasheed, Founder of QuizliAI"
        fill
        sizes="144px"
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  )
}
