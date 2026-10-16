// Real numbers only. Leave a value undefined (or empty) to hide it; the proof line
// below the demo renders nothing until at least one value is set.
export type Proof = {
  rating?: string // e.g. "4.8 on the App Store"
  students?: string // e.g. "Used by 12,000 students"
  schools?: string // e.g. "Students at UCLA, NYU & UT Austin"
  notesThisMonth?: string // e.g. "48,000 notes made this month"
}

export const proof: Proof = {}
