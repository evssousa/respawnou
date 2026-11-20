// Corpo das matérias e textos do site: renderiza os blocos (p, h2, h3, ul, quote, img, video) e links [texto](url).
import { type ReactNode } from "react";
import { Link } from "react-router";
import type { Block } from "~/lib/types";

const LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/g;

/** Texto com links no formato [texto](url): interno vira <Link>, externo abre em outra aba. */
function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    parts.push(text.slice(last, m.index));
    const [, label, href] = m;
    if (href.startsWith("/")) parts.push(<Link key={m.index} to={href}>{label}</Link>);
    else if (/^https:\/\//.test(href))
      parts.push(
        <a key={m.index} href={href} target="_blank" rel="noopener">
          {label}
        </a>,
      );
    else parts.push(label);
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

export function BodyBlock({ block }: { block: Block }) {
  switch (block.type) {
    case "p": {
      const also = block.text.match(/^Leia também:\s*(.+)$/);
      if (also)
        return (
          <p className="read-also">
            <span>&gt; LEIA TAMBÉM</span>
            <RichText text={also[1]} />
          </p>
        );
      return (
        <p>
          <RichText text={block.text} />
        </p>
      );
    }
    case "h2":
      return <h2>{block.text}</h2>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "quote":
      return (
        <blockquote>
          <RichText text={block.text} />
        </blockquote>
      );
    case "ul":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>
              <RichText text={item} />
            </li>
          ))}
        </ul>
      );
    case "img":
      return (
        <figure>
          <img src={block.src} alt={block.alt} width={block.width} height={block.height} loading="lazy" decoding="async" />
          {block.credit && <figcaption>{block.credit}</figcaption>}
        </figure>
      );
    case "video":
      return (
        <div className="video">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${block.youtubeId}`}
            title={block.title}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
  }
}
