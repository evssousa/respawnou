// Leitura e gravação da configuração dos vídeos (settings.video_config). Só no servidor.
import { SECOES_VOZ, VIDEO, type VideoConfig } from "./config";
import { exec, query } from "./db";

export async function lerConfig(): Promise<VideoConfig> {
  const [r] = await query<{ value: unknown }>("SELECT value FROM settings WHERE name = 'video_config'");
  let v: Partial<VideoConfig> = {};
  try {
    v = typeof r?.value === "string" ? JSON.parse(r.value) : ((r?.value as Partial<VideoConfig>) ?? {});
  } catch {
    /* usa os padrões */
  }
  const p = VIDEO.padrao;
  const num = (x: unknown, min: number, max: number, pad: number) => (typeof x === "number" && x >= min && x <= max ? x : pad);
  return {
    enabled: v.enabled === true,
    perDay: Math.round(num(v.perDay, 0, 3, p.perDay)),
    hour: Math.round(num(v.hour, 0, 23, p.hour)),
    autoApprove: v.autoApprove === true,
    model: v.model === "eleven_flash_v2_5" ? "eleven_flash_v2_5" : p.model,
    speed: num(v.speed, 0.85, 1.1, p.speed),
    creditsMonth: Math.round(num(v.creditsMonth, 1000, 1_000_000, p.creditsMonth)),
    voiceDefault: typeof v.voiceDefault === "string" ? v.voiceDefault.trim().slice(0, 40) : "",
    voices: Object.fromEntries(Object.entries(v.voices ?? {}).filter(([k, x]) => SECOES_VOZ.some((s) => s.id === k) && typeof x === "string" && x.trim()).map(([k, x]) => [k, String(x).trim().slice(0, 40)])),
  };
}

export async function salvarConfig(c: VideoConfig): Promise<void> {
  await exec("INSERT INTO settings (name, value) VALUES ('video_config', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", [JSON.stringify(c)]);
}
