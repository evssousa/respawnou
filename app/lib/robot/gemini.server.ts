// Cliente mínimo da API do Gemini (plano gratuito), com saída em JSON estruturado.
// Chave em GEMINI_API_KEY. Modelo em GEMINI_MODEL (opcional): se o padrão não existir mais,
// o cliente consulta a lista de modelos e escolhe um "flash" disponível.

const API = "https://generativelanguage.googleapis.com/v1beta";
// Chaves novas não acessam mais a família 2.5 (404 "no longer available to new users"), e
// "gemini-flash-latest" aponta para um modelo sem cota gratuita. Ordem: melhor → mais leve.
const PREFERRED = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];
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
  if (!res.ok) {
    let detail = body;
    try {
      detail = JSON.parse(body)?.error?.message ?? body;
    } catch {}
    // Mantém a parte útil (ex.: "Quota exceeded for metric ..., limit: 0, model: ...").
    detail = detail
      .replace(/https?:\/\/\S+/g, "")
      .replace(/(For more information|To monitor your current usage)[^\n*]*/g, "")
      .replace(/\s+/g, " ")
      .trim();
    throw new GeminiError(`Gemini ${res.status}: ${detail.slice(0, 400)}`, res.status);
  }
  return JSON.parse(body);
}

/** Escolhe um modelo "flash" numerado (gemini-N.N-flash) que aceite generateContent, o mais novo. */
async function discoverModel(exclude: string[]) {
  const data = await call("models?pageSize=200");
  const names: string[] = (data.models ?? [])
    .filter((m: { supportedGenerationMethods?: string[] }) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m: { name: string }) => m.name.replace(/^models\//, ""))
    .filter((n: string) => /^gemini-\d+(\.\d+)?-flash$/.test(n) && !exclude.includes(n));
  names.sort((a, b) => b.localeCompare(a, "en", { numeric: true }));
  if (!names.length) throw new GeminiError("Nenhum modelo flash disponível para esta chave", 404);
  return names[0];
}

/** Pouco "raciocínio": a tarefa é reescrever fontes, e com o padrão as respostas demoravam demais.
 *  A família 2.x usa thinkingBudget; a 3.x em diante, thinkingLevel. */
function thinkingConfig(model: string) {
  return /^gemini-2\./.test(model) ? { thinkingBudget: 512 } : { thinkingLevel: "low" };
}

/** O 404 de modelo aposentado sugere o substituto ("use models/gemini-x.y-flash"). */
function suggestedModel(err: GeminiError) {
  return /use models\/([\w.-]+)/.exec(err.message)?.[1];
}

export async function generateJson<T>(opts: { system: string; prompt: string; schema: object; temperature?: number }): Promise<{ data: T; model: string }> {
  const bodyFor = (model: string) =>
    JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: opts.schema,
        temperature: opts.temperature ?? 0.7,
        thinkingConfig: thinkingConfig(model),
      },
    });
  // Pior caso: 3 modelos × 150 s = 7,5 min, abaixo da trava de 10 min do robô.
  const GEN_TIMEOUT = 150_000;

  const first = process.env.GEMINI_MODEL || chosenModel;
  const queue = [...new Set([...(first ? [first] : []), ...PREFERRED])];
  const attempts: string[] = [];
  let lastError: unknown;
  let onlyMissing = true;

  for (let i = 0; i < queue.length && i < 5; i++) {
    const model = queue[i];
    // Sobrecarga (503) costuma passar em segundos: 1 nova tentativa antes de trocar de modelo.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const data = await call(`models/${model}:generateContent`, { method: "POST", body: bodyFor(model) }, GEN_TIMEOUT);
        if (attempts.length) chosenModel = model; // o preferido falhou: começa por este nas próximas
        return { data: parse<T>(data), model };
      } catch (err) {
        lastError = err;
        if (!(err instanceof GeminiError)) throw err;
        attempts.push(`${model}: ${err.message.slice(0, 300)}`);
        if (err.status === 404) {
          const next = suggestedModel(err);
          if (next && !queue.includes(next)) queue.splice(i + 1, 0, next);
          break;
        }
        onlyMissing = false;
        if (err.isRateLimit || err.status === 504) break; // cota ou lentidão: tenta o próximo modelo
        if (!err.isTransient) throw err;
        if (attempt === 0) await sleep(5000);
      }
    }
  }
  // Nenhum modelo conhecido existe mais: descobre um na lista da chave.
  if (onlyMissing && lastError instanceof GeminiError) {
    const model = await discoverModel(queue);
    const data = await call(`models/${model}:generateContent`, { method: "POST", body: bodyFor(model) }, GEN_TIMEOUT);
    chosenModel = model;
    return { data: parse<T>(data), model };
  }
  if (lastError instanceof GeminiError && attempts.length > 1) throw new GeminiError(attempts.join(" | "), lastError.status);
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

/** Diagnóstico (/api/cron/diag): modelos flash da chave e um teste curto em cada candidato. */
export async function diagnose() {
  const list = await call("models?pageSize=200").catch((e) => ({ error: String(e) }));
  const flash: string[] = ((list as { models?: { name: string; supportedGenerationMethods?: string[] }[] }).models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent") && /flash/.test(m.name))
    .map((m) => m.name.replace(/^models\//, ""));
  const tests = [];
  for (const model of [...new Set([process.env.GEMINI_MODEL, ...PREFERRED].filter(Boolean) as string[])]) {
    const t0 = Date.now();
    try {
      await call(
        `models/${model}:generateContent`,
        { method: "POST", body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Responda apenas: ok" }] }], generationConfig: { thinkingConfig: thinkingConfig(model) } }) },
        60_000,
      );
      tests.push({ model, ok: true, ms: Date.now() - t0 });
    } catch (err) {
      tests.push({ model, ok: false, ms: Date.now() - t0, error: err instanceof Error ? err.message.slice(0, 300) : String(err) });
    }
  }
  return { flash, tests };
}
