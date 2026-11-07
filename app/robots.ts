import type { MetadataRoute } from "next";

// Standards section 11: private and app-only routes stay out of the index.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api", "/auth", "/note/notes", "/note/settings", "/note/profile-selection", "/dev"],
    },
    sitemap: "https://quizliai.com/sitemap.xml",
  };
}
