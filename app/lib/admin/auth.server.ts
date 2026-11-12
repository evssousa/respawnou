// Acesso ao painel /admin: um único administrador, definido por variáveis de ambiente.
//   ADMIN_EMAIL           e-mail de login
//   ADMIN_PASSWORD_HASH   hash scrypt da senha (gerado por `npm run admin:hash`, nunca a senha)
//   SESSION_SECRET        segredo que assina o cookie de sessão (32+ caracteres aleatórios)
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { createCookieSessionStorage, redirect } from "react-router";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;

// ───────────── Senha ─────────────

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

/**
 * Formato: scrypt:N:r:p:<salt base64>:<hash base64>
 * Sem "$": alguns painéis tratam "$algo" como variável e apagam o trecho. O formato antigo
 * (separado por "$") continua aceito.
 */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt:${N}:${R}:${P}:${salt.toString("base64")}:${hash.toString("base64")}`;
}

function parseHash(stored: string) {
  const s = stored.trim();
  const parts = s.split(s.includes(":") ? ":" : "$");
  const [alg, n, r, p, salt, hash] = parts;
  if (parts.length !== 6 || alg !== "scrypt" || !Number(n) || !Number(r) || !Number(p) || !salt || !hash) return null;
  return { n: Number(n), r: Number(r), p: Number(p), salt, hash };
}

export async function verifyPassword(password: string, stored: string) {
  const parsed = parseHash(stored);
  if (!parsed) return false;
  const { n, r, p, salt, hash } = parsed;
  const expected = Buffer.from(hash, "base64");
  const got = await scrypt(password, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

// ───────────── Configuração ─────────────

export function adminConfig() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const secret = process.env.SESSION_SECRET?.trim();
  // O que falta ou está inválido (só nomes, nunca valores) — mostrado na tela de login.
  const problems: string[] = [];
  if (!email) problems.push("ADMIN_EMAIL não encontrada");
  else if (!email.includes("@")) problems.push("ADMIN_EMAIL não parece um e-mail");
  if (!hash) problems.push("ADMIN_PASSWORD_HASH não encontrada");
  else if (!parseHash(hash)) problems.push("ADMIN_PASSWORD_HASH incompleta ou alterada (cole a linha inteira gerada pelo npm run admin:hash)");
  if (!secret) problems.push("SESSION_SECRET não encontrada");
  else if (secret.length < 32) problems.push("SESSION_SECRET curta demais (mín. 32 caracteres)");
  return { ready: problems.length === 0, problems, email, hash, secret };
}

type SessionData = { admin: string };
let storage: ReturnType<typeof createCookieSessionStorage<SessionData>> | undefined;
function sessions() {
  const { secret } = adminConfig();
  if (!secret) throw new Error("SESSION_SECRET não configurado");
  storage ??= createCookieSessionStorage<SessionData>({
    cookie: {
      name: "__respawnou_admin",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/", // "/admin" não serve: a navegação interna busca "/admin.data", fora desse caminho
      maxAge: 7 * 24 * 3600,
      secrets: [secret],
    },
  });
  return storage;
}

// ───────────── Limite de tentativas (por IP, em memória) ─────────────

const WINDOW_MS = 15 * 60_000;
const MAX_FAILS = 5;
const fails = new Map<string, number[]>();

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
}

export function loginBlocked(ip: string) {
  const now = Date.now();
  const list = (fails.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  fails.set(ip, list);
  return list.length >= MAX_FAILS;
}

export function registerFail(ip: string) {
  fails.set(ip, [...(fails.get(ip) ?? []), Date.now()]);
}

// ───────────── Sessão ─────────────

export async function login(request: Request, email: string, password: string): Promise<{ ok: true; cookie: string } | { ok: false; error: string }> {
  const cfg = adminConfig();
  if (!cfg.ready) return { ok: false, error: "Painel não configurado." };
  const ip = clientIp(request);
  if (loginBlocked(ip)) return { ok: false, error: "Muitas tentativas. Espere 15 minutos." };
  const emailOk = email.trim().toLowerCase() === cfg.email;
  // Sempre calcula o hash (mesmo com e-mail errado) para não revelar pelo tempo de resposta.
  const passOk = await verifyPassword(password, cfg.hash!);
  if (!emailOk || !passOk) {
    registerFail(ip);
    return { ok: false, error: "E-mail ou senha incorretos." };
  }
  fails.delete(ip);
  const session = await sessions().getSession();
  session.set("admin", cfg.email!);
  return { ok: true, cookie: await sessions().commitSession(session) };
}

export async function logout(request: Request) {
  const session = await sessions().getSession(request.headers.get("Cookie"));
  return sessions().destroySession(session);
}

/** Exige sessão de admin; sem ela, manda para o login. Em ações (POST), confere também a origem. */
export async function requireAdmin(request: Request) {
  const cfg = adminConfig();
  if (!cfg.ready) throw redirect("/admin/login");
  const session = await sessions().getSession(request.headers.get("Cookie"));
  if (session.get("admin") !== cfg.email) throw redirect("/admin/login");
  if (request.method !== "GET" && !sameOrigin(request)) throw new Response("Origem inválida", { status: 403 });
  return cfg.email!;
}

/** Há sessão de admin válida? (sem redirecionar; usado na pré-visualização de rascunhos) */
export async function isAdmin(request: Request) {
  const cfg = adminConfig();
  if (!cfg.ready) return false;
  const session = await sessions().getSession(request.headers.get("Cookie"));
  return session.get("admin") === cfg.email;
}

/** Formulário enviado do próprio site (o cookie SameSite=Lax já barra a maioria; isto fecha o resto). */
export function sameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true; // navegadores antigos não mandam em POST do mesmo site
  const host = request.headers.get("X-Forwarded-Host") ?? request.headers.get("Host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
