import { proof } from "@/content/proof"

export function ProofLine() {
  const items = [proof.rating, proof.students, proof.schools, proof.notesThisMonth].filter(
    (v): v is string => Boolean(v && v.trim()),
  )
  if (items.length === 0) return null
  return (
    <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[15px] font-semibold text-c-muted">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  )
}
