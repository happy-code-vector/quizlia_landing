import Image from "next/image"
import Link from "next/link"

interface AppStoreBadgeProps {
  className?: string
  size?: "small" | "medium" | "large"
}

export function AppStoreBadge({ className, size = "medium" }: AppStoreBadgeProps) {
  const dimensions = {
    small: { width: 120, height: 40 },
    medium: { width: 170, height: 50 },
    large: { width: 200, height: 60 }
  }
  
  const { width, height } = dimensions[size]
  
  return (
    <Link 
      href="https://apps.apple.com/us/app/antique-identifier-by-picture/id6736771469" 
      className={`relative block ${className}`}
      style={{ width, height }}
    >
      <Image 
        src="/app-store-badge.svg" 
        alt="Download on the App Store"
        fill
        className="object-contain"
      />
    </Link>
  )
} 