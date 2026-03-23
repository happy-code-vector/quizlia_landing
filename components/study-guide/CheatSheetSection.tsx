import { Section } from "@/lib/studyGuide";

interface CheatSheetSectionProps {
  sections: Section[];
}

export function CheatSheetSection({ sections }: CheatSheetSectionProps) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">📝</span>
        <h2 className="text-xl font-semibold text-white font-rethink-sans">The Cheat Sheet</h2>
      </div>

      <div className="space-y-6">
        {sections.map((section, index) => (
          <div
            key={index}
            className="bg-[#111] border border-white/10 rounded-2xl p-6 md:p-8"
          >
            <h3 className="text-lg font-semibold text-white mb-4 font-rethink-sans flex items-center gap-2">
              <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#964CEE]/20 flex items-center justify-center text-sm font-bold text-[#964CEE]">
                {index + 1}
              </span>
              {section.title}
            </h3>

            <div className="text-white/70 leading-relaxed font-rethink-sans whitespace-pre-line mb-4">
              {highlightKeyTerms(section.content, section.keyTerms)}
            </div>

            {section.keyTerms && section.keyTerms.length > 0 && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-white/40 mb-2 font-rethink-sans">Key Terms:</p>
                <div className="flex flex-wrap gap-2">
                  {section.keyTerms.map((term, termIndex) => (
                    <span
                      key={termIndex}
                      className="px-2.5 py-1 text-xs font-medium bg-white/5 border border-white/10 rounded-full text-white/60"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper to highlight key terms in content
function highlightKeyTerms(content: string, keyTerms?: string[]): React.ReactNode {
  if (!keyTerms || keyTerms.length === 0) return content;

  let result = content;
  // Terms are already shown below, so we just return content as-is
  return content;
}
