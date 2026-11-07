// app/arcade/page.tsx
import { PublicArcade } from "@/components/app/arcade/PublicArcade";
import { GAMES } from "@/lib/arcade";

export const metadata = {
  title: "QuizliAI Arcade: Five Study Games",
  description:
    "Five arcade games built from your notes. Try any of them on a sample deck right now, with no signup and no install needed.",
};

export default function ArcadePage() {
  return <PublicArcade games={GAMES} />;
}
