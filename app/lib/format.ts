// Formatação de datas sempre no fuso de Brasília, para servidor e navegador renderizarem igual.
const TZ = "America/Sao_Paulo";

const dateLong = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" });
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const weekdayLong = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long" });
const monthShort = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, month: "short" });
const dayNum = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit" });
const timeShort = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const monthYear = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, month: "long", year: "numeric" });

/** Datas só com dia ("2026-11-12") viram meio-dia UTC para não "voltar" um dia no fuso BR. */
const toDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);

export const formatDate = (iso: string) => dateLong.format(toDate(iso));
export const formatDateTime = (iso: string) => dateTime.format(toDate(iso)).replace(",", " às");
export const formatWeekday = (iso: string) => weekdayLong.format(toDate(iso));
export const formatDay = (iso: string) => dayNum.format(toDate(iso));
export const formatMonthShort = (iso: string) => monthShort.format(toDate(iso)).replace(".", "").toUpperCase();
export const formatTime = (iso: string) => timeShort.format(toDate(iso));
export const formatMonthYear = (iso: string) => monthYear.format(toDate(iso));

/** "HÁ 3H", "ONTEM", "HÁ 4 DIAS" ou a data completa. */
export function timeAgo(iso: string, now = Date.now()) {
  const diff = now - toDate(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "AGORA";
  if (min < 60) return `HÁ ${min} MIN`;
  const h = Math.round(min / 60);
  if (h < 24) return `HÁ ${h}H`;
  const d = Math.round(h / 24);
  if (d === 1) return "ONTEM";
  if (d < 7) return `HÁ ${d} DIAS`;
  return formatDate(iso).toUpperCase();
}

/** Remove acentos e caixa para busca. */
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export const formatScore = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: n % 1 ? 1 : 0, maximumFractionDigits: 1 });

/** Dias inteiros entre hoje (BR) e uma data "AAAA-MM-DD". */
/** Dia (AAAA-MM-DD) de um instante no fuso de Brasília: "2026-11-13T02:00Z" ainda é dia 12 aqui. */
export const brDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(toDate(iso));

export function daysUntil(isoDay: string, now = Date.now()) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(now));
  return Math.round((Date.parse(`${isoDay.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}
