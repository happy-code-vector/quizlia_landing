import type { MetadataRoute } from "next";
import { getAllNotesForSitemapServer } from "@/lib/firebase-server";

const SITE_URL = "https://quizliai.com";

// ISR: regenerated at most hourly on traffic, so newly published notes
// appear without a redeploy. Uses the REST server path — the client SDK
// never initializes outside the browser.
export const revalidate = 3600;

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
