// Banner de consentimento (LGPD). Só aparece quando os anúncios estão ligados (ver app/lib/ads.ts).
// A escolha fica no navegador; "Preferências de cookies" no rodapé reabre o banner.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { CONSENT_KEY, CONSENT_VERSION, type ConsentChoice } from "~/lib/ads";

export const OPEN_CONSENT_EVENT = "respawnou:cookies";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    /** API do aviso europeu do Google (CMP certificada), presente só depois de ativada no painel do AdSense. */
    __tcfapi?: (command: string, version: number, callback: (data: { gdprApplies?: boolean }, ok: boolean) => void) => void;
    googlefc?: { showRevocationMessage?: () => void };
  }
}

/**
 * O aviso europeu do Google atende este visitante (GDPR)? Espera até 1,5 s o __tcfapi existir; sem ele, responde false
 * e o banner próprio segue como sempre (Brasil, LGPD). Assim o visitante europeu não vê dois avisos.
 */
function googleCmpApplies(): Promise<boolean> {
  return new Promise((resolve) => {
    let waited = 0;
    const tick = () => {
      if (typeof window.__tcfapi === "function") {
        try {
          window.__tcfapi("addEventListener", 2, (tc, ok) => resolve(Boolean(ok && tc?.gdprApplies === true)));
        } catch {
          resolve(false);
        }
        return;
      }
      waited += 100;
      if (waited >= 1500) resolve(false);
      else setTimeout(tick, 100);
    };
    tick();
  });
}

function readChoice(): ConsentChoice | null {
  try {
    const c = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null");
    return c?.v === CONSENT_VERSION ? c.choice : null;
  } catch {
    return null;
  }
}

function saveChoice(choice: ConsentChoice) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ v: CONSENT_VERSION, choice, at: new Date().toISOString() }));
  } catch {
    // Navegador sem armazenamento: vale só para esta visita.
  }
  const state = choice === "all" ? "granted" : "denied";
  window.gtag?.("consent", "update", { ad_storage: state, ad_user_data: state, ad_personalization: state, analytics_storage: state });
}

export function CookieConsent() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let google = false;
    // Decide uma vez por visita quem atende: o aviso do Google (Europa) ou o banner próprio (Brasil).
    const decided = googleCmpApplies().then((applies) => {
      google = applies;
      if (!cancelled && !applies && !readChoice()) setOpen(true);
    });
    void decided;
    const reopen = () => {
      // Visitante da Europa: quem cuida das preferências é o aviso do Google.
      if (google && typeof window.googlefc?.showRevocationMessage === "function") window.googlefc.showRevocationMessage();
      else setOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => {
      cancelled = true;
      window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
    };
  }, []);

  if (!open) return null;
  const choose = (choice: ConsentChoice) => {
    saveChoice(choice);
    setOpen(false);
  };

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookies-titulo"
      className="ch fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-3xl flex-col gap-4 border border-line-soft bg-ink-2 p-5 shadow-2xl sm:inset-x-6 sm:bottom-6 sm:p-6"
    >
      <div className="flex flex-col gap-2">
        <h2 id="cookies-titulo" className="font-mono text-xs font-bold text-acc">
          &gt; COOKIES
        </h2>
        <p className="text-sm leading-relaxed text-body">
          Usamos cookies essenciais para o site funcionar. Com a sua permissão, o Google também usa cookies para exibir anúncios personalizados e medir o
          resultado deles. Você pode mudar de ideia quando quiser pelo link “Preferências de cookies” no rodapé. Saiba mais na{" "}
          <Link to="/cookies" className="text-paper underline decoration-acc underline-offset-4 hover:text-acc">
            política de cookies
          </Link>
          .
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => choose("essential")}
          className="chs min-h-11 border border-line-soft px-5 font-mono text-xs font-bold text-paper hover:border-acc hover:text-acc"
        >
          SÓ OS ESSENCIAIS
        </button>
        <button type="button" onClick={() => choose("all")} className="chs min-h-11 bg-acc px-5 font-mono text-xs font-bold text-ink hover:bg-paper">
          ACEITAR TODOS
        </button>
      </div>
    </section>
  );
}

/** Link do rodapé que reabre o banner. */
export function CookiePrefsButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))} className={className}>
      Preferências de cookies
    </button>
  );
}
