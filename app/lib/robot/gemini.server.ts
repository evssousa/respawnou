// Cliente mínimo da API do Gemini (plano gratuito), com saída em JSON estruturado.
// Chave em GEMINI_API_KEY. Modelo em GEMINI_MODEL (opcional): se o padrão não existir mais,
// o cliente consulta a lista de modelos e escolhe um "flash" disponível.

const API = "https://generativelanguage.googleapis.com/v1beta";
const PREFERRED = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let chosenModel: string | undefined;

export class GeminiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
  /** Limite do plano gratuito atingido: tentar de novo mais tarde. */
  get isRateLimit() {
    return this.status === 429;
  }
  /** Modelo sobrecarregado ou falha passageira do lado do Google. */
  get isTransient() {
    return this.status === 429 || this.status === 500 || this.status === 503 || this.status === 504;
  }
}

function apiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY não configurada", 0);
  return key;
}

async function call(path: string, init?: RequestInit, timeoutMs = 30_000) {
  let res: Response;
  try {
    res = await fetch(`${API}/${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey(), ...init?.headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    // Tempo esgotado ou falha de rede: trata como indisponibilidade passageira.
    const timeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    throw new GeminiError(timeout ? `Gemini não respondeu em ${timeoutMs / 1000} s` : `Falha de rede com o Gemini: ${err}`, 504);
  }
  const body = await res.text();
  if (!res.ok) throw new GeminiError(`Gemini ${res.status}: ${body.slice(0, 300)}`, res.status);
  return JSON.parse(body);
}

/** Escolhe um modelo "flash" que aceite generateContent (o mais novo, evitando "lite"). */
async function discoverModel() {
  const data = await call("models?pageSize=200");
  const names: string[] = (data.models ?? [])
    .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m: { name: string }) => m.name.replace(/^models\//, ""))
    .filter((n: string) => /flash/.test(n) && !/lite|image|tts|audio|live|thinking|exp/.test(n));
  names.sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
  if (!names.length) throw new GeminiError("Nenhum modelo flash disponível para esta chave", 404);
  return names[0];
}

export async function generateJson<T>(opts: { system: string; prompt: string; schema: object; temperature?: number }): Promise<{ data: T; model: string }> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: opts.schema,
      temperature: opts.temperature ?? 0.7,
      // Pouco "raciocínio": a tarefa é reescrever fontes, e com o raciocínio padrão as respostas
      // passavam de 90 s. Pior caso: 3 modelos × 150 s = 7,5 min, abaixo da trava de 10 min.
      thinkingConfig: { thinkingBudget: 512 },
    },
  });
  const GEN_TIMEOUT = 150_000;

  const first = process.env.GEMINI_MODEL || chosenModel;
  const candidates = [...new Set([...(first ? [first] : []), ...PREFERRED])];
  let lastError: unknown;
  let anyMissing = false;
  for (const model of candidates) {
    // Sobrecarga (503) costuma passar em segundos: 1 nova tentativa antes de trocar de modelo.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await call(`models/${model}:generateContent`, { method: "POST", body }, GEN_TIMEOUT);
        return { data: parse<T>(data), model };
      } catch (err) {
        lastError = err;
        if (!(err instanceof GeminiError)) throw err;
        if (err.status === 404) { anyMissing = true; break; }
        if (err.isRateLimit || err.status === 504) break; // cota ou lentidão: tenta o próximo modelo
        if (!err.isTransient) throw err;
        if (attempt === 0) await sleep(5000);
      }
    }
  }
  // Nenhum dos modelos conhecidos existe mais: descobre um na lista.
  if (anyMissing && lastError instanceof GeminiError && lastError.status === 404) {
    const model = await discoverModel();
    const data = await call(`models/${model}:generateContent`, { method: "POST", body }, GEN_TIMEOUT);
    chosenModel = model;
    return { data: parse<T>(data), model };
  }
  throw lastError;
}

function parse<T>(data: { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[] }): T {
  const c = data.candidates?.[0];
  const text = c?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new GeminiError(`Resposta vazia (finishReason: ${c?.finishReason ?? "?"})`, 502);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new GeminiError("Resposta do Gemini não é um JSON válido", 502);
  }
}
