import type { MetadataRoute } from "next";
import { absoluteUrl, docPages, productPages } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const home: MetadataRoute.Sitemap[number] = {
    url: absoluteUrl("/"),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 1,
  };

  const product: MetadataRoute.Sitemap = productPages.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  const docs: MetadataRoute.Sitemap = docPages.map((page, i) => ({
    url: absoluteUrl(page.path),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: i === 0 ? 0.9 : 0.8,
  }));

  return [
    home,
    ...product,
    ...docs,
    {
      url: absoluteUrl("/llms.txt"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
