// AES-256-GCM para guardar o token do Instagram. A chave vem de SOCIAL_KEY (64 caracteres hexadecimais = 32 bytes).
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export const chaveOk = () => /^[0-9a-fA-F]{64}$/.test(process.env.SOCIAL_KEY ?? "");
const chave = () => Buffer.from(process.env.SOCIAL_KEY ?? "", "hex");

/** "iv.tag.cifra" em base64. */
export function cifrar(texto: string): string {
  if (!chaveOk()) throw new Error("SOCIAL_KEY ausente ou inválida (precisa de 64 caracteres hexadecimais)");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const enc = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

export function decifrar(valor: string): string {
  if (!chaveOk()) throw new Error("SOCIAL_KEY ausente ou inválida");
  const [iv, tag, enc] = valor.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", chave(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
