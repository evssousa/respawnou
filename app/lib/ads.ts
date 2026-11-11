// Anúncios (Google AdSense) e consentimento de cookies.
//
// Tudo fica desligado até existir a variável de ambiente ADSENSE_CLIENT (ex.: ca-pub-1234567890123456,
// dada pelo Google na inscrição). Com ela, sem novo build:
//   - o <head> carrega o Modo de Consentimento v2 (tudo negado por padrão) e o script do AdSense;
//   - /ads.txt passa a responder com o ID do editor;
//   - o banner de cookies aparece para quem ainda não escolheu.
// Lido em tempo de execução (process.env), por isso só no servidor; o loader da raiz repassa.

export const CONSENT_KEY = "respawnou_consent";
/** Mude a versão quando a política mudar de forma relevante: todo mundo vê o banner de novo. */
export const CONSENT_VERSION = 1;

export type ConsentChoice = "all" | "essential";

export function adsenseClient(): string | null {
  const id = process.env.ADSENSE_CLIENT?.trim();
  return id && /^ca-pub-\d{10,20}$/.test(id) ? id : null;
}

/**
 * Script que roda antes do AdSense: cria o gtag, nega tudo por padrão e, se o visitante já
 * escolheu "aceitar todos", libera na hora (sem esperar o React).
 */
export function consentBootstrap() {
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});
try{var c=JSON.parse(localStorage.getItem('${CONSENT_KEY}')||'null');if(c&&c.v===${CONSENT_VERSION}&&c.choice==='all')gtag('consent','update',{ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted',analytics_storage:'granted'});}catch(e){}`;
}
