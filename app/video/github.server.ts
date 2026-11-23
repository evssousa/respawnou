// Disparo do worker de vídeo no GitHub Actions (workflow video.yml). O token fino só tem "Actions: write" neste repositório.
export async function dispararWorkflow(): Promise<{ ok: boolean; aviso?: string }> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) return { ok: false, aviso: "GITHUB_DISPATCH_TOKEN/GITHUB_REPO não cadastrados: o vídeo sai na próxima rodada automática (a cada 3 h)." };
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/video.yml/dispatches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "respawnou-video" },
      body: JSON.stringify({ ref: "main" }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 204) return { ok: true };
    return { ok: false, aviso: `O GitHub recusou o disparo (${res.status}). O vídeo sai na próxima rodada automática.` };
  } catch (err) {
    return { ok: false, aviso: `Não deu para falar com o GitHub (${String((err as Error)?.message ?? err).slice(0, 80)}). O vídeo sai na próxima rodada automática.` };
  }
}
