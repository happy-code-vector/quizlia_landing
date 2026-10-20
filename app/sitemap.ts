import type { MetadataRoute } from "next";
import { getAllNotesForSitemapServer } from "@/lib/firebase-server";

const SITE_URL = "https://quizliai.com";

// Truly dynamic: every request queries Firestore (REST server path —
// the client SDK never initializes outside the browser), so an admin
// publish is in the sitemap on the very next crawl. No ISR dependency,
// no rebuild, no stale window. The underlying fetch keeps a short
// in-process cache so bursts of crawler hits stay cheap.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  const notes = await getAllNotesForSitemapServer();
  const noteEntries: MetadataRoute.Sitemap = notes.map((n) => ({
    url: `${SITE_URL}/note/${n.slug}`,
    lastModified: n.lastModified ? new Date(n.lastModified) : undefined,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...noteEntries];
}
