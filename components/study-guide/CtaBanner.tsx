import Link from "next/link";

interface CtaBannerProps {
  headline?: string;
  features?: string[];
}

export function CtaBanner({ headline, features }: CtaBannerProps) {
  const defaultHeadline = "Master This Topic on Your Phone";
  const defaultFeatures = [
    "Flashcards for every key term",
    "AI Tutor to explain concepts",
    "Practice quizzes for your exam",
  ];

  return (
    <div className="mb-12">
      <div className="bg-gradient-to-br from-[#964CEE]/20 via-[#964CEE]/10 to-[#f15bb5]/10 border border-[#964CEE]/30 rounded-2xl p-8 md:p-10 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#964CEE]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#f15bb5]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-3xl">📱</span>
            <h2 className="text-2xl md:text-3xl font-bold text-white font-source-serif-4">
              {headline || defaultHeadline}
            </h2>
          </div>

          <p className="text-white/60 mb-6 font-rethink-sans max-w-xl">
            Don&apos;t just read the notes — master the material with spaced repetition flashcards, AI-powered explanations, and practice quizzes.
          </p>

          <ul className="grid md:grid-cols-3 gap-4 mb-8">
            {(features || defaultFeatures).map((feature, index) => (
              <li
                key={index}
                className="flex items-center gap-3 text-white/80 font-rethink-sans"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-green-400 text-sm">✓</span>
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <Link
            href="https://apps.apple.com/us/app/quizliai/id6751740981"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black rounded-xl font-semibold hover:bg-white/90 transition-colors font-rethink-sans"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Download QuizliAI
          </Link>
        </div>
      </div>
    </div>
  );
}
