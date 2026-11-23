// Espaço de anúncio (docs/anuncios.md, D5 e D6).
// - Só desenha algo com ADSENSE_CLIENT válido + interruptor ligado + ID do bloco preenchido + página permitida.
// - O espaço sai reservado no servidor (tamanho fixo, sem pulo de layout); o <ins> do Google só nasce no navegador,
//   perto de aparecer, para o script não mexer em HTML que o React ainda vai hidratar.
// - "Ver espaços": o dono liga no painel e cada espaço vira uma caixa tracejada com o tamanho exato. Nunca chama o Google.
import { useEffect, useRef, useState } from "react";
import { useLocation, useRouteLoaderData } from "react-router";
import { AD_PREVIEW_KEY, adsPathAllowed, ensureAdsScript, KIND_UNIT, type AdKind, type AdsConfig } from "~/lib/ads";
import { cx } from "./ui";

type RootAds = { ads?: AdsConfig; adsClient?: string | null };

const SIZE_CLASS: Record<AdKind, string> = { meio: "ad-size-meio", horizontal: "ad-size-h", billboard: "ad-size-bb", lateral: "ad-size-v", multiplex: "ad-size-mx" };
const TYPE_LABEL: Record<AdKind, string> = { meio: "IN-ARTICLE", horizontal: "FAIXA", billboard: "FAIXA GRANDE", lateral: "LATERAL", multiplex: "RECOMENDADOS" };

/** Modo "ver espaços" ligado neste navegador? Começa falso: o HTML do servidor é igual para todo mundo. */
export function useAdsPreview() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      setOn(localStorage.getItem(AD_PREVIEW_KEY) === "1");
    } catch {
      /* sem localStorage: modo desligado */
    }
  }, []);
  return on;
}

/** Selo fixo que lembra o dono de que o modo está ligado (só aparece com o modo ligado). */
export function AdPreviewBadge() {
  const on = useAdsPreview();
  if (!on) return null;
  return (
    <div className="fixed bottom-3 left-3 z-[60] border border-acc bg-ink-2 px-3 py-2 font-mono text-[11px] font-bold text-acc">
      MODO ESPAÇOS
      <button
        type="button"
        className="ml-3 min-h-9 text-paper hover:text-acc"
        onClick={() => {
          try {
            localStorage.removeItem(AD_PREVIEW_KEY);
          } catch {
            /* nada */
          }
          location.reload();
        }}
      >
        SAIR
      </button>
    </div>
  );
}

function PreviewBox({ kind, place, missingId }: { kind: AdKind; place: string; missingId: boolean }) {
  const size =
    kind === "meio" ? (
      "LARGURA DO TEXTO · ~280 PX (FLUIDO)"
    ) : kind === "multiplex" ? (
      "LARGURA TOTAL · ~320–420 PX (FLUIDO)"
    ) : kind === "lateral" ? (
      "300 × 600 · SÓ NO PC"
    ) : kind === "billboard" ? (
      <>
        <span className="md:hidden">300 × 250</span>
        <span className="hidden md:inline lg:hidden">728 × 90</span>
        <span className="hidden lg:inline">970 × 250</span>
      </>
    ) : (
      <>
        <span className="md:hidden">300 × 250</span>
        <span className="hidden md:inline">728 × 90</span>
      </>
    );
  return (
    <div className="ad-preview h-full w-full">
      <span className="font-mono text-[11px] font-bold text-acc">ANÚNCIO · {TYPE_LABEL[kind]}</span>
      <span className="font-mono text-[11px] text-body">{size}</span>
      <span className="font-mono text-[11px] text-muted">{place}</span>
      {missingId && <span className="font-mono text-[10px] font-bold text-warn">SEM ID</span>}
    </div>
  );
}

export function AdSlot({ kind, place }: { kind: AdKind; place: string }) {
  const root = useRouteLoaderData("root") as RootAds | undefined;
  const { pathname, search } = useLocation();
  const preview = useAdsPreview();
  const asideRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const client = root?.adsClient ?? null;
  const ads = root?.ads;
  const unit = KIND_UNIT[kind];
  const slot = ads?.slots[unit];
  const allowed = adsPathAllowed(pathname, search);
  const live = Boolean(client && ads?.enabled && slot && allowed);

  // Cria o anúncio só no navegador, perto de aparecer. Uma chamada por página (a navegação por clique troca pathname/search).
  useEffect(() => {
    if (!live || preview || !client || !slot) return;
    const box = boxRef.current;
    const aside = asideRef.current;
    if (!box || !aside) return;
    aside.removeAttribute("data-state");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let mo: MutationObserver | undefined;
    let ins: HTMLModElement | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        // Bloco escondido (display:none) dá erro "availableWidth=0": a lateral só existe no PC.
        if (kind === "lateral" && !window.matchMedia("(min-width: 1024px)").matches) return;
        try {
          ins = document.createElement("ins") as HTMLModElement;
          ins.className = `adsbygoogle ${kind === "meio" || kind === "multiplex" ? "" : SIZE_CLASS[kind]}`.trim();
          ins.setAttribute("data-ad-client", client);
          ins.setAttribute("data-ad-slot", slot);
          if (kind === "meio") {
            ins.style.display = "block";
            ins.style.textAlign = "center";
            ins.setAttribute("data-ad-layout", "in-article");
            ins.setAttribute("data-ad-format", "fluid");
          } else if (kind === "multiplex") {
            ins.style.display = "block";
            ins.setAttribute("data-ad-format", "autorelaxed");
          } else ins.style.display = "inline-block";
          if (location.hostname === "localhost") ins.setAttribute("data-adtest", "on");
          box.appendChild(ins);
          mo = new MutationObserver(() => {
            if (ins?.getAttribute("data-ad-status") === "unfilled") aside.setAttribute("data-state", "off");
          });
          mo.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
          ensureAdsScript(client);
          const w = window as unknown as { adsbygoogle?: unknown[] };
          (w.adsbygoogle = w.adsbygoogle || []).push({});
          // Bloqueador de anúncio ou erro do script: sem status depois de 6 s, o espaço some (nada de buraco).
          timer = setTimeout(() => {
            if (ins && !ins.hasAttribute("data-adsbygoogle-status")) aside.setAttribute("data-state", "off");
          }, 6000);
        } catch {
          aside.setAttribute("data-state", "off");
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(box);
    return () => {
      io.disconnect();
      mo?.disconnect();
      if (timer) clearTimeout(timer);
      box.replaceChildren();
    };
  }, [live, preview, client, slot, kind, pathname, search]);

  // Página proibida: nunca desenha (nem no modo espaços). Sem nada ligado e sem o modo espaços: nada no HTML.
  if (!allowed) return null;
  if (!live && !preview) return null;

  return (
    <aside ref={asideRef} aria-label="Publicidade" data-place={place} className={cx("ad-slot", kind === "lateral" && "hidden lg:flex")}>
      <span className="ad-label" aria-hidden>
        Publicidade
      </span>
      <div ref={boxRef} className={cx("ad-box", SIZE_CLASS[kind], !preview && "scan")}>
        {preview && <PreviewBox kind={kind} place={place} missingId={!slot} />}
      </div>
    </aside>
  );
}
