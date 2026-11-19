import { APP_STORE_URL } from "@/lib/constants"

// Apple provider token (the pt value of an App Store Connect campaign link). It is an ID, not a secret.
const APPLE_PROVIDER_TOKEN = "127599943"

// Campaign names are limited to 30 characters in App Store Connect. A one-letter surface prefix plus the page slug, cut to fit.
// s = button at the bottom of the page, q = QR code and button in the side rail, m = bar on phones.
export type Surface = "s" | "q" | "m"

export function studyCampaign(slug: string, surface: Surface = "s"): string {
  return `${surface}-${slug}`.slice(0, 30).replace(/-+$/, "")
}

export function studyStoreUrl(slug: string, surface: Surface = "s"): string {
  return `${APP_STORE_URL}?pt=${APPLE_PROVIDER_TOKEN}&ct=${encodeURIComponent(studyCampaign(slug, surface))}&mt=8`
}
