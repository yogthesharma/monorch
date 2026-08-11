import type { Metadata } from "next";
import { absoluteUrl, siteConfig, type DocPageMeta } from "@/lib/site";

export function pageMetadata({
  title,
  description,
  path,
  noIndex = false,
}: {
  title: string | Metadata["title"];
  description: string;
  path: string;
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const ogTitle =
    typeof title === "string"
      ? `${title} · ${siteConfig.name}`
      : title && typeof title === "object" && "absolute" in title && title.absolute
        ? String(title.absolute)
        : `${siteConfig.name} | ${siteConfig.tagline}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: path === "/" ? "website" : "article",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      site: siteConfig.twitter,
      creator: siteConfig.twitter,
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}

export function docMetadata(page: DocPageMeta): Metadata {
  return pageMetadata(page);
}

