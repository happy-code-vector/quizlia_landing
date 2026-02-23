"use client"

import Image from "next/image"

export function LogoMarqueeSection() {
  const logos = [
    { 
      name: "Yale", 
      width: 161, 
      url: "https://framerusercontent.com/images/W12RFZTy9sZZ52oKJYmqUPW98k.png?scale-down-to=512&width=1280&height=720",
      height: 40
    },
    { 
      name: "Delta", 
      width: 144, 
      url: "https://framerusercontent.com/images/lAdpsWqZegDTeYy587SQmZnXw.png?scale-down-to=512&width=1725&height=330",
      height: 40
    },
    { 
      name: "Michigan", 
      width: 123, 
      url: "https://framerusercontent.com/images/ri1alU5C5K3l04tCo3Es7baUUU.png?scale-down-to=512&width=1920&height=1080",
      height: 40
    },
    { 
      name: "Amex", 
      width: 93, 
      url: "https://framerusercontent.com/images/GDKYgneRgI4Wbfcaqv5WeX2qOdc.png?scale-down-to=512&width=1126&height=330",
      height: 40
    },
    { 
      name: "Princeton", 
      width: 124, 
      url: "https://framerusercontent.com/images/p4JWo5uH1sWhD6wHq9aO3m0dIM.png?scale-down-to=512&width=3840&height=2160",
      height: 40
    },
    { 
      name: "Edward Jones", 
      width: 154, 
      url: "https://framerusercontent.com/images/34FNO7LCwk73vysXxFPKheKMk.png?scale-down-to=512&width=1804&height=330",
      height: 40
    },
    { 
      name: "Harvard", 
      width: 102, 
      url: "https://framerusercontent.com/images/6xdafTFNmnEnoof3mZlz9KwkLYo.png?scale-down-to=512&width=2560&height=704",
      height: 40
    },
    { 
      name: "Morgan Stanley", 
      width: 132, 
      url: "https://framerusercontent.com/images/ERa90TtVxvQyJjBJKOPk93Z0KE.png?scale-down-to=512&width=1547&height=330",
      height: 40
    },
    { 
      name: "Virginia", 
      width: 199, 
      url: "https://framerusercontent.com/images/nv3347qY5QqALp5EMYOJzlLtPo.png?scale-down-to=512&width=2500&height=598",
      height: 40
    },
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
          {/* Animated marquee */}
          <ul className="flex animate-marquee gap-16 items-center">
            {/* First set of logos */}
            {logos.map((logo, index) => (
              <li key={`logo-1-${index}`} className="flex-shrink-0">
                <div className="relative grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                  <Image
                    src={logo.url}
                    alt={logo.name}
                    width={logo.width}
                    height={logo.height}
                    className="w-auto h-[40px] object-contain"
                    style={{ width: `${logo.width}px`, height: '40px' }}
                  />
                </div>
              </li>
            ))}
            {/* Duplicate set for seamless loop */}
            {logos.map((logo, index) => (
              <li key={`logo-2-${index}`} className="flex-shrink-0">
                <div className="relative grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
                  <Image
                    src={logo.url}
                    alt={logo.name}
                    width={logo.width}
                    height={logo.height}
                    className="w-auto h-[40px] object-contain"
                    style={{ width: `${logo.width}px`, height: '40px' }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

