// NÚCLEO (copiar igual para outro site; o que é do site fica em app/marca.ts)
// Voz: ElevenLabs com alinhamento por caractere (with-timestamps). Uma chamada por vídeo.
import type { Alinhamento } from "./ass";

export interface Sintese {
  mp3: Buffer;
  alinhamento: Alinhamento;
}

export async function sintetizar(o: { chave: string; voz: string; modelo: string; velocidade: number; estabilidade?: number; estilo?: number; texto: string; /** texto que vem antes/depois (só dá contexto de entonação; não é falado) */ antes?: string; depois?: string }): Promise<Sintese> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(o.voz)}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": o.chave, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: o.texto,
      ...(o.antes ? { previous_text: o.antes } : {}),
      ...(o.depois ? { next_text: o.depois } : {}),
      model_id: o.modelo,
      voice_settings: { stability: o.estabilidade ?? 0.55, similarity_boost: 0.8, style: o.estilo ?? 0, use_speaker_boost: true, speed: o.velocidade },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = (await res.json()) as { audio_base64?: string; alignment?: Alinhamento };
  if (!j.audio_base64 || !j.alignment?.characters?.length) throw new Error("ElevenLabs não devolveu áudio com alinhamento");
  return { mp3: Buffer.from(j.audio_base64, "base64"), alinhamento: j.alignment };
}

/** Alinhamento falso (65 ms por caractere): para testar a montagem sem gastar créditos. */
export function alinhamentoFalso(texto: string): Alinhamento {
  const chars = [...texto];
  const passo = 0.065;
  return {
    characters: chars,
    character_start_times_seconds: chars.map((_, i) => i * passo),
    character_end_times_seconds: chars.map((_, i) => (i + 1) * passo),
  };
}
