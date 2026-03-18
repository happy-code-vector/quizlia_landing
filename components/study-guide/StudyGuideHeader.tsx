import Link from "next/link";
import { categoryColors, difficultyColors } from "@/lib/studyGuide";

interface StudyGuideHeaderProps {
  title: string;
  category: string;
  difficulty: string;
  sourceChannel: string;
}

export function StudyGuideHeader({ title, category, difficulty, sourceChannel }: StudyGuideHeaderProps) {
  const categoryGradient = categoryColors[category] || "from-gray-500 to-gray-600";
  const difficultyStyle = difficultyColors[difficulty] || difficultyColors.medium;

  return (
    <div className="mb-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-white/50 mb-6 font-rethink-sans">
        <Link href="/" className="hover:text-white transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/" className="hover:text-white transition-colors capitalize">
          {category}
        </Link>
        <span>/</span>
        <span className="text-white/70 truncate">{title}</span>
      </nav>

      {/* Title */}
      <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 font-source-serif-4 tracking-tight">
        {title}
      </h1>

      {/* Meta badges */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Category badge */}
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r ${categoryGradient} text-white`}>
          <span className="capitalize">{category}</span>
        </span>

        {/* Difficulty badge */}
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${difficultyStyle}`}>
          <span className="capitalize">{difficulty}</span>
        </span>

        {/* Source */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/70">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          {sourceChannel}
        </span>
      </div>
    </div>
  );
}
