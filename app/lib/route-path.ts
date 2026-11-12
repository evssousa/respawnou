// Na navegação dentro do site (clique em link), o React Router busca os dados em "<endereço>.data"
// (ex.: /noticias.data). Loaders que leem o endereço precisam ignorar esse sufixo; sem isso,
// /noticias.data virava a editoria "noticias.data" e dava 404 só ao clicar (2026-11-12).
export function routePath(request: Request) {
  const path = new URL(request.url).pathname.replace(/\.data$/, "");
  return path === "/_" ? "/" : path;
}

/** Primeiro trecho do endereço ("/noticias/x" → "noticias"). */
export const firstSegment = (request: Request) => routePath(request).split("/")[1] ?? "";
