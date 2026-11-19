// Sinal de visita no navegador. Nada fica guardado no aparelho (nem cookie, nem localStorage). Só importa react e react-router.
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

type Sinal = { p: string; r?: string; u?: string; f: 0 | 1 };

function enviar(sinal: Sinal) {
  const corpo = JSON.stringify(sinal);
  try {
    if (navigator.sendBeacon?.("/api/v", new Blob([corpo], { type: "text/plain" }))) return;
  } catch {
    /* cai para o fetch */
  }
  void fetch("/api/v", { method: "POST", body: corpo, headers: { "Content-Type": "text/plain" }, keepalive: true, credentials: "same-origin" }).catch(() => {});
}

/** UTM do endereço, só no primeiro sinal da carga: "source|medium|campaign". */
function utmDaUrl(): string | undefined {
  const q = new URLSearchParams(location.search);
  const partes = ["utm_source", "utm_medium", "utm_campaign"].map((k) => (q.get(k) ?? "").slice(0, 80));
  return partes.some(Boolean) ? partes.join("|") : undefined;
}

export function VisitBeacon() {
  const { pathname } = useLocation();
  const primeiro = useRef(true);

  useEffect(() => {
    if (/^\/(admin|api)(\/|$)/.test(pathname)) return;
    const f = primeiro.current ? 1 : 0;
    primeiro.current = false;
    let cancelado = false;

    const mandar = () => {
      if (cancelado) return;
      enviar(f === 1 ? { p: pathname, r: document.referrer || undefined, u: utmDaUrl(), f } : { p: pathname, f });
    };
    // espera a pré-renderização acabar e a aba ficar visível (aba aberta escondida e fechada sem ver não conta)
    const quandoVisivel = () => {
      if (document.visibilityState === "visible") return mandar();
      const aoMudar = () => {
        if (document.visibilityState !== "visible") return;
        document.removeEventListener("visibilitychange", aoMudar);
        mandar();
      };
      document.addEventListener("visibilitychange", aoMudar);
      return () => document.removeEventListener("visibilitychange", aoMudar);
    };
    const prerender = (document as Document & { prerendering?: boolean }).prerendering;
    if (prerender) {
      const aposPrerender = () => quandoVisivel();
      document.addEventListener("prerenderingchange", aposPrerender, { once: true });
      return () => {
        cancelado = true;
        document.removeEventListener("prerenderingchange", aposPrerender);
      };
    }
    const limpar = quandoVisivel();
    return () => {
      cancelado = true;
      if (typeof limpar === "function") limpar();
    };
  }, [pathname]);

  // voltar pelo histórico com a página restaurada da memória: conta de novo (sem origem)
  useEffect(() => {
    const aoMostrar = (e: PageTransitionEvent) => {
      if (e.persisted && !/^\/(admin|api)(\/|$)/.test(location.pathname)) enviar({ p: location.pathname, f: 0 });
    };
    window.addEventListener("pageshow", aoMostrar);
    return () => window.removeEventListener("pageshow", aoMostrar);
  }, []);

  return null;
}
