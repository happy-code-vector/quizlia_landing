interface TldrSectionProps {
  items: string[];
}

export function TldrSection({ items }: TldrSectionProps) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🚀</span>
        <h2 className="text-xl font-semibold text-white font-rethink-sans">TL;DR</h2>
        <span className="text-sm text-white/40 font-rethink-sans">30-Second Summary</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-gradient-to-br from-[#964CEE]/10 to-[#964CEE]/5 border border-[#964CEE]/20 rounded-2xl p-5 hover:border-[#964CEE]/40 transition-colors"
          >
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#964CEE]/20 flex items-center justify-center text-xs font-bold text-[#964CEE]">
                {index + 1}
              </span>
              <p className="text-white/80 text-sm leading-relaxed font-rethink-sans">
                {item}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
