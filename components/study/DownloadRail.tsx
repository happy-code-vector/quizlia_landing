import QRCode from "qrcode"
import { studyStoreUrl } from "@/lib/campaign"
import { PhoneBar } from "./PhoneBar"

// Download surfaces for the study pages.
// Desktop (1024 px and up): a slim tab on the right edge of the screen, above the fold, that stays in view while the page scrolls.
// Phones: a small bar at the bottom. The QR code is made at build time and tagged with its own App Store campaign code (q = tab, m = phone bar).
export async function DownloadRail({ slug }: { slug: string }) {
  const qrUrl = studyStoreUrl(slug, "q")
  const svg = await QRCode.toString(qrUrl, { type: "svg", margin: 0, width: 160, errorCorrectionLevel: "M" })
  return (
    <>
      <aside aria-label="Get the QuizliAI app" className="hidden lg:block">
      <a
        href={qrUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get the app. Scan the QR code with your iPhone camera, or click it to open the App Store."
        style={{ boxShadow: "var(--card-shadow-raised)" }}
        className="fixed right-0 top-28 z-30 hidden w-[7.25rem] flex-col items-center gap-2 rounded-l-[1.25rem] border border-r-0 border-card-stroke bg-card py-3 pl-3 pr-3 lg:flex"
      >
        <span aria-hidden="true" className="block size-24 rounded-lg bg-white p-1.5 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <span className="text-subheadline font-semibold text-rust">Get the app</span>
      </a>
      </aside>

      <PhoneBar href={studyStoreUrl(slug, "m")} />
    </>
  )
}
