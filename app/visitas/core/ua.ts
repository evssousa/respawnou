// User-agent → aparelho, navegador e sistema. Puro, sem biblioteca. Só categorias grossas: nada identifica ninguém.
export type Aparelho = "celular" | "computador" | "tablet";

/** `mobileHint` é o cabeçalho Sec-CH-UA-Mobile ("?1" = celular), quando o navegador manda. */
export function aparelhoDe(ua: string, mobileHint?: string | null): Aparelho {
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
  if (mobileHint === "?1" || /Mobi|iPhone|iPod|Android/i.test(ua)) return "celular";
  return "computador";
}

export function navegadorDe(ua: string): string {
  if (/Instagram/i.test(ua)) return "App do Instagram";
  if (/FBAN|FBAV/i.test(ua)) return "App do Facebook";
  if (/Edg(e|A|iOS)?\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
  if (/Chrome|CriOS/i.test(ua)) return "Chrome";
  if (/Safari/i.test(ua)) return "Safari";
  return "Outro";
}

export function sistemaDe(ua: string): string {
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Outro";
}
