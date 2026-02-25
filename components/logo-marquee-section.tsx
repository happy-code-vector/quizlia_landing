"use client"

export function LogoMarqueeSection() {
  const logos = [
    { name: "Spotify" },
    { name: "NYSE" },
    { name: "Amazon AWS" },
    { name: "Morgan Stanley" },
    { name: "City National Bank" },
    { name: "Estée Lauder" },
  ]

  return (
    <section className="w-full py-12 md:py-16 overflow-hidden">
      <div className="w-full px-4">
        {/* Header Text */}
        <p className="text-center text-white/50 font-rethink-sans text-[14px] md:text-[16px] mb-8">
          Loved by professionals and students from
        </p>

        {/* Marquee Container */}
        <div
          className="relative w-full overflow-hidden flex items-center"
          style={{
            maskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 8%, rgb(0, 0, 0) 92%, rgba(0, 0, 0, 0) 100%)',
            WebkitMaskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgb(0, 0, 0) 8%, rgb(0, 0, 0) 92%, rgba(0, 0, 0, 0) 100%)'
          }}
        >
          {/* Animated marquee - continuous seamless loop */}
          <ul className="flex animate-marquee gap-16 items-center">
            {/* Multiple sets for seamless loop */}
            {logos.map((logo, index) => (
              <li key={`logo-1-${index}`} className="flex-shrink-0">
                <span className="text-white/40 text-lg md:text-xl font-semibold tracking-wide whitespace-nowrap font-rethink-sans">
                  {logo.name}
                </span>
              </li>
            ))}
            {logos.map((logo, index) => (
              <li key={`logo-2-${index}`} className="flex-shrink-0">
                <span className="text-white/40 text-lg md:text-xl font-semibold tracking-wide whitespace-nowrap font-rethink-sans">
                  {logo.name}
                </span>
              </li>
            ))}
            {logos.map((logo, index) => (
              <li key={`logo-3-${index}`} className="flex-shrink-0">
                <span className="text-white/40 text-lg md:text-xl font-semibold tracking-wide whitespace-nowrap font-rethink-sans">
                  {logo.name}
                </span>
              </li>
            ))}
            {logos.map((logo, index) => (
              <li key={`logo-4-${index}`} className="flex-shrink-0">
                <span className="text-white/40 text-lg md:text-xl font-semibold tracking-wide whitespace-nowrap font-rethink-sans">
                  {logo.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
