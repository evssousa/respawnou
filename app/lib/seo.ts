import type { MetaDescriptor } from "react-router";
import { absoluteUrl, SITE } from "./site";

interface SeoInput {
  title?: string;
  description?: string;
  path: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  publishedAt?: string;
  updatedAt?: string;
}

/** Monta title, description, canonical, Open Graph e Twitter Card de uma página. */
export function seo({ title, description = SITE.description, path, image, type = "website", noindex, publishedAt, updatedAt }: SeoInput): MetaDescriptor[] {
  const fullTitle = title ? `${title} | ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`;
  const url = absoluteUrl(path);
  const tags: MetaDescriptor[] = [
    { title: fullTitle },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: url },
    { property: "og:site_name", content: SITE.name },
    { property: "og:locale", content: SITE.locale },
    { property: "og:type", content: type },
    { property: "og:title", content: title ?? SITE.name },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title ?? SITE.name },
    { name: "twitter:description", content: description },
  ];
  if (image) {
    const img = image.startsWith("http") ? image : absoluteUrl(image);
    tags.push({ property: "og:image", content: img }, { name: "twitter:image", content: img });
  }
  if (publishedAt) tags.push({ property: "article:published_time", content: publishedAt });
  if (updatedAt) tags.push({ property: "article:modified_time", content: updatedAt });
  // max-image-preview:large libera a imagem grande no Google Discover.
  tags.push({ name: "robots", content: noindex ? "noindex, follow" : "index, follow, max-image-preview:large" });
  return tags;
}
