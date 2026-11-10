import { useState } from "react";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${title} ${url}`)}` },
    { label: "X", href: `https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Navegador sem permissão de área de transferência: não faz nada.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-2 w-full font-mono text-xs font-semibold text-muted sm:w-auto">&gt; COMPARTILHAR</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="chs inline-flex h-11 min-w-11 items-center justify-center bg-ink-3 px-3.5 font-mono text-xs font-semibold text-acc hover:bg-acc hover:text-ink"
        >
          {l.label.toUpperCase()}
        </a>
      ))}
      <button type="button" onClick={copy} className="chs inline-flex h-11 min-w-11 items-center justify-center bg-ink-3 px-3.5 font-mono text-xs font-semibold text-acc hover:bg-acc hover:text-ink">
        <span aria-live="polite">{copied ? "LINK COPIADO!" : "COPIAR LINK"}</span>
      </button>
    </div>
  );
}
