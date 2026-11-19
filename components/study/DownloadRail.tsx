import QRCode from "qrcode"
import { studyStoreUrl } from "@/lib/campaign"

const primary =
  "inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-headline text-primary-foreground transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-primary-hover active:scale-[0.98] active:bg-primary-active"

// Download surfaces for the study pages. On desktop (1024 px and up) a card stays in view on the right
// while the page scrolls. On phones a bar stays at the bottom. The QR code is made at build time.
// `slug` tags each surface with its own App Store campaign code (q = rail, m = phone bar).
export async function DownloadRail({ slug }: { slug: string }) {
  const qrUrl = studyStoreUrl(slug, "q")
  const svg = await QRCode.toString(qrUrl, { type: "svg", margin: 0, width: 160, errorCorrectionLevel: "M" })
  return (
    <>
      <aside aria-label="Get QuizliAI" className="sticky top-6 hidden self-start lg:block">
        <div className="ds-card flex flex-col items-center gap-4 p-5 text-center">
          <p className="text-headline text-label">Get QuizliAI on iPhone</p>
          <a
            href={qrUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="QR code for QuizliAI on the App Store. Click it to open the App Store."
            className="block rounded-2xl bg-white p-3 shadow-card"
          >
            <span aria-hidden="true" className="block size-40 [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
          </a>
          <p className="text-subheadline text-supporting">Scan with your iPhone camera, or click the code.</p>
          <a href={qrUrl} target="_blank" rel="noopener noreferrer" className={`${primary} w-full`}>
            Download QuizliAI
            <span className="sr-only"> (opens the App Store)</span>
          </a>
          <p className="text-footnote text-supporting">Notes, flashcards and quizzes from any YouTube link, PDF or photo.</p>
        </div>
      </aside>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-divider bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[45rem] items-center gap-3">
          <p className="min-w-0 flex-1 text-subheadline text-label">Full notes, flashcards and quizzes on iPhone.</p>
          <a href={studyStoreUrl(slug, "m")} target="_blank" rel="noopener noreferrer" className={`${primary} shrink-0`}>
            Download
            <span className="sr-only"> QuizliAI (opens the App Store)</span>
          </a>
        </div>
      </div>
    </>
  )
}
