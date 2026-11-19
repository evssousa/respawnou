// Endereço antigo do contador (POST /api/view). A contagem agora é do módulo app/visitas (POST /api/v, no site inteiro).
// Páginas em cache da CDN ainda podem chamar este endereço por alguns minutos: responde 204 sem contar.
// Pode ser apagado depois de 7 dias do deploy.
export async function loader() {
  return new Response(null, { status: 405 });
}

export async function action() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
