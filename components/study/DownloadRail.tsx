import QRCode from "qrcode"
import { studyStoreUrl } from "@/lib/campaign"

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

      <aside aria-label="Download QuizliAI" className="fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[45rem] items-center justify-between gap-3">
          <p className="text-headline text-label">Get the app</p>
          <a
            href={studyStoreUrl(slug, "m")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-headline text-primary-foreground transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-primary-hover active:scale-[0.98] active:bg-primary-active"
          >
            Download
            <span className="sr-only"> QuizliAI (opens the App Store)</span>
          </a>
        </div>
      </aside>
    </>
  )
}
