// Cliente mínimo da API do Gemini (plano gratuito), com saída em JSON estruturado.
// Chave em GEMINI_API_KEY. Modelo em GEMINI_MODEL (opcional): se o padrão não existir mais,
// o cliente consulta a lista de modelos e escolhe um "flash" disponível.

const API = "https://generativelanguage.googleapis.com/v1beta";
const PREFERRED = ["gemini-2.5-flash", "gemini-flash-latest"];

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
}

function apiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("GEMINI_API_KEY não configurada", 0);
  return key;
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${API}/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey(), ...init?.headers },
    signal: AbortSignal.timeout(90_000),
  });
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
    generationConfig: { responseMimeType: "application/json", responseSchema: opts.schema, temperature: opts.temperature ?? 0.7 },
  });

  const candidates = chosenModel ? [chosenModel] : process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : PREFERRED;
  let lastError: unknown;
  for (const model of candidates) {
    try {
      const data = await call(`models/${model}:generateContent`, { method: "POST", body });
      chosenModel = model;
      return { data: parse<T>(data), model };
    } catch (err) {
      lastError = err;
      if (!(err instanceof GeminiError) || err.status !== 404) throw err;
    }
  }
  // Nenhum dos modelos conhecidos existe mais: descobre um na lista.
  if (lastError instanceof GeminiError && lastError.status === 404) {
    const model = await discoverModel();
    const data = await call(`models/${model}:generateContent`, { method: "POST", body });
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
