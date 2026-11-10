// Entrada de produção (Hostinger): `node server.js` (ou require, pelo LiteSpeed).
//
// Regras para rodar na Hostinger:
// - nada de `await` no nível do módulo (o LiteSpeed usa require() e daria ERR_REQUIRE_ASYNC_MODULE);
// - NODE_ENV não vai nas variáveis de ambiente do painel: com ele, o `npm install` do build
//   pula pacotes de desenvolvimento. É definido aqui, ANTES de carregar React e cia.
//   Por isso o servidor fica em server-app.js e é carregado com import() dinâmico:
//   imports estáticos rodariam antes desta linha e o React subiria em modo de desenvolvimento.
process.env.NODE_ENV ??= "production";

import("./server-app.js").catch((err) => {
  console.error("[respawnou] falha ao iniciar:", err);
  process.exit(1);
});
