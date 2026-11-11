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

/** Imagem de compartilhamento das páginas sem capa própria (1200×630, public/og-default.png). */
export const DEFAULT_OG_IMAGE = "/og-default.png";

/** Monta title, description, canonical, Open Graph e Twitter Card de uma página. */
export function seo({ title, description = SITE.description, path, image, type = "website", noindex, publishedAt, updatedAt }: SeoInput): MetaDescriptor[] {
  const ogImage = image || DEFAULT_OG_IMAGE;
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
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title ?? SITE.name },
    { name: "twitter:description", content: description },
  ];
  const img = ogImage.startsWith("http") ? ogImage : absoluteUrl(ogImage);
  tags.push({ property: "og:image", content: img }, { name: "twitter:image", content: img });
  if (!image) tags.push({ property: "og:image:width", content: "1200" }, { property: "og:image:height", content: "630" }, { property: "og:image:alt", content: SITE.name });
  if (publishedAt) tags.push({ property: "article:published_time", content: publishedAt });
  if (updatedAt) tags.push({ property: "article:modified_time", content: updatedAt });
  // max-image-preview:large libera a imagem grande no Google Discover.
  tags.push({ name: "robots", content: noindex ? "noindex, follow" : "index, follow, max-image-preview:large" });
  return tags;
}
