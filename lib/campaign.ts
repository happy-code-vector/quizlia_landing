import { APP_STORE_URL } from "@/lib/constants"

// Apple provider token (the pt value of an App Store Connect campaign link). It is an ID, not a secret.
const APPLE_PROVIDER_TOKEN = "127599943"

// Campaign names are limited to 30 characters in App Store Connect. "s-" plus the page slug, cut to fit.
export function studyCampaign(slug: string): string {
  return `s-${slug}`.slice(0, 30).replace(/-+$/, "")
}

export function studyStoreUrl(slug: string): string {
  return `${APP_STORE_URL}?pt=${APPLE_PROVIDER_TOKEN}&ct=${encodeURIComponent(studyCampaign(slug))}&mt=8`
}
