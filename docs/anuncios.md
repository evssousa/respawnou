# Anúncios: locais, formatos, componente e regras

Criado em 2026-11-22 pelo planejador. Status: ⏳ aprovado para execução, **antes do pedido do AdSense e antes de
qualquer outra demanda**. Complementa `adsense.md` (aprovação e consentimento) e `arcade.md` (regra dos jogos).

> **Status (2026-11-22):** fase A (AN2 a AN12) implementada e testada em modo "ver espaços" (375 e 1440 px). Tudo fica inerte (nada no HTML) até existirem `ADSENSE_CLIENT`, o interruptor e os 4 IDs de bloco em `/admin/config`. AN1 (PageSpeed) ficou como pendência do dono (a API pública recusou por cota); AN13 falta só o dono olhar as capturas.

## Objetivo

Deixar o site pronto para exibir anúncios do AdSense no dia da aprovação: locais e formatos definidos, componente
`<AdSlot>` no código (desligado e invisível até haver IDs), modo "ver espaços" para o dono conferir o layout antes, e
um roteiro simples do que fazer no painel do AdSense depois de aprovado.

## Contexto (o que existe hoje e por que muda)

- `ADSENSE_CLIENT` (variável de ambiente no hPanel) já liga: script do AdSense no `<head>` (nunca em `/admin` nem em
  `/arcade/<jogo>`), Modo de Consentimento v2 com tudo negado por padrão, banner de cookies e `/ads.txt`
  (`app/lib/ads.ts`, `app/root.tsx`, `app/components/CookieConsent.tsx`, `app/routes/ads-txt.ts`).
- Falta: **onde** os anúncios aparecem, **quais formatos**, o componente que os desenha sem estragar o layout, a forma
  de o dono ver os espaços sem chamar o Google e o passo a passo do painel do AdSense.
- Para o pedido de revisão o Google só exige o script no site. Os blocos podem entrar no código antes e ficar
  inertes (sem ID de bloco nada é desenhado), então dá para ligar tudo no dia da aprovação colando 4 números no painel.

---

## Decisões (com o porquê)

### D1. Blocos manuais, sem anúncios automáticos (Auto ads desligado)

**Recomendação: só blocos manuais. Anúncios automáticos desligados no painel do AdSense, inclusive âncora e vinheta.**

- Os automáticos colocam anúncio onde o Google quiser: podem cair colados em botões ("Jogar", "Resgatar",
  paginação), empurrar o texto depois de carregar (CLS, que piora o Google Discover e a busca) e quebrar o visual.
- O site é uma SPA (React Router): ao clicar de uma matéria para `/arcade/<jogo>` sem recarregar, o script continua
  carregado. Com automáticos, uma âncora ou um anúncio na página poderia aparecer em cima do jogo, e clique acidental
  em jogo é motivo de punição. **Com só blocos manuais, o script carregado não desenha nada sozinho**: o jogo fica
  protegido mesmo na navegação por clique. Esta é a principal razão da escolha.
- Blocos manuais têm tamanho conhecido: reservamos o espaço antes e o layout não pula.
- Custo da escolha: a receita inicial pode ser um pouco menor que com automáticos. Para um site novo, com pouco
  tráfego, a diferença em reais é pequena e o risco de punição é o que mais importa.
- Revisão possível na 3ª semana: testar **só a âncora inferior no celular** (ver "Fase D", opcional, depende do dono).

### D2. Formatos que usamos e que não usamos

| Formato | Usa? | Por quê |
|---|---|---|
| Display de tamanho fixo por largura de tela (300×250, 728×90, 970×250, 300×600) | Sim | Tamanho conhecido = espaço reservado exato = zero CLS. É o "bloco de display responsivo com tamanhos por CSS" da documentação do Google |
| In-article (no meio do texto, fluido) | Sim, só em matérias | Melhor desempenho em texto longo; aparece abaixo da 1ª tela, onde a variação de altura não conta como CLS |
| Multiplex (grade de "recomendados", fluido) | Sim, só no fim da matéria | Fica no fim, longe de botões; paga razoável e não atrapalha a leitura |
| In-feed (imita os cards da lista) | Não | Exige montar o estilo no painel para cada lista; parece card do site e confunde quem não é técnico. A faixa display entre itens dá o mesmo resultado com menos risco |
| Vinheta (tela cheia entre páginas) | **Nunca** | Numa SPA aparece no clique de navegação, irrita, e poderia surgir no caminho para um jogo |
| Âncora no topo | **Nunca** | Cobre o cabeçalho fixo e o menu: clique acidental garantido |
| Âncora inferior | Não agora (Fase D opcional) | Só via automáticos; exige o cuidado de recarregar a página ao entrar em jogo |
| Side rails (laterais fixas fora do conteúdo) | Não | O conteúdo vai até 1280 px; em 1440 px sobram 80 px por lado, pouco para o formato |
| "Ad intents"/links automáticos no texto | Não | Transformam palavras do texto em links de anúncio, que se confundem com os nossos links internos |
| Anúncio recompensado / offerwall | Não | Incentivar o visitante a interagir com anúncio é contra o espírito da política (e ruim para o público) |

### D3. Mapa de locais por tipo de página

Regras gerais (valem para todas as linhas da tabela):

- **Distância mínima de 32 px** entre o espaço do anúncio e qualquer botão, link, filtro, menu, paginação ou campo.
  Nos lugares escolhidos isso já sai do `gap` do contêiner (40 a 64 px); onde não houver `gap`, usar `my-8`/`my-10`.
- **No máximo 1 anúncio por altura de tela no celular** (nunca dois anúncios visíveis ao mesmo tempo em 375 × 667).
- **Nunca** dentro de um `<Link>`, do cabeçalho fixo, do rodapé, do banner de cookies ou de qualquer elemento com
  `.ch`/`.chs` (o `clip-path` dos cantos chanfrados cortaria o ícone "AdChoices", que o Google exige visível).
- **Página `noindex` não tem anúncio** (filtros por plataforma, fichas sem matéria, páginas vazias, busca).
  Regra simples: se não queremos que o Google indexe, também não é página para anunciar.
- Nomes de bloco ("unidades") no AdSense: são **4**, reaproveitados em vários lugares (ver D4).

| Página | Local (posição exata) | Tipo (`kind`) | Tamanho | Celular | Máx. na página |
|---|---|---|---|---|---|
| **Home** `/` | Depois do 1º módulo (normalmente "Últimas operações"); e depois do 4º módulo, se nem ele nem o seguinte forem "Loot" ou "Arcade" (se for, não entra o 2º). Nunca no topo (destaque + grade de módulos) | `billboard` | 300×250 (<768) · 728×90 (768–1023) · 970×250 (≥1024) | Sim, 300×250 | 2 |
| **Lista de editoria** `/noticias`, `/artigos`, `/reviews`, `/guias` e `/plataforma/:slug` | Depois da 4ª linha (`PostRow`), só se a página tiver ≥ 6 matérias. Na lateral, abaixo de "Mais lidas", fixo ao rolar (sticky) | `horizontal` + `lateral` | 300×250 / 728×90 · lateral 300×600 | Só o da lista (lateral some) | 2 (1 no celular) |
| **Promoções** `/promocoes` | Página 1 (com o quadro de jogos grátis): nada perto do quadro; só depois da **6ª** linha, se houver ≥ 8, e a lateral. Páginas 2+: igual às outras listas | `horizontal` + `lateral` | idem | Só o da lista | 2 (1 no celular) |
| **Matéria** `/<editoria>/:slug` | (a) **Meio do corpo**: depois do 3º parágrafo, num ponto entre dois blocos de texto (ver regra em AN7). (b) **2º meio** só se o texto tiver ≥ 900 palavras, ≥ 6 blocos depois do 1º e ≥ 3 blocos antes do fim. (c) **Lateral**: último item da coluna lateral, sticky (só ≥ 1024 px). (d) **Fim**: Multiplex depois de "Mais em <editoria>" (ou depois do artigo, se não houver relacionados). **Nada no topo** (título/capa) e nada colado nos botões de compartilhar | `meio` · `lateral` · `multiplex` | meio: largura do texto, ~280 px de altura reservada · lateral 300×600 · multiplex largura total, ~320–420 px | meio(s) + multiplex | 4 no PC, 3 no celular |
| **Matéria de Promoções** `/promocoes/:slug` | **Sem "meio"** (o corpo tem links de resgate e preço; anúncio no meio confunde com o botão de pegar o jogo). Só lateral e multiplex no fim | `lateral` · `multiplex` | idem | Só multiplex | 2 |
| **Matéria com menos de 350 palavras** (ex.: escrita à mão, curta) | Nenhum | — | — | — | 0 |
| **Prévia** `?previa=1` | Nenhum | — | — | — | 0 |
| **Ficha de jogo** `/jogos/:slug` | Só fichas indexáveis (com matéria ou `indexFrom`): 1 faixa logo antes da seção "Tudo sobre <jogo>" | `horizontal` | 300×250 / 728×90 | Sim | 1 |
| **Calendário** `/lancamentos` | Sem filtro de plataforma: depois do 1º grupo de mês e depois do 3º, cada um só se o grupo tiver ≥ 4 jogos. Entre seções, nunca no meio da lista | `horizontal` | 300×250 / 728×90 | Sim | 2 |
| **Lista do Arcade** `/arcade` | 1 faixa depois da grade de jogos, antes do parágrafo de texto; só se a grade mostrar ≥ 3 jogos. Nunca entre os cards (pareceria um jogo) | `horizontal` | 300×250 / 728×90 | Sim | 1 |
| **Jogo do Arcade** `/arcade/<jogo>` | **Nenhum**, e o script nem carrega (regra do projeto, mantida) | — | — | — | 0 |
| **Busca** `/busca` | Nenhum (`noindex` e bloqueada no `robots.txt`) | — | — | — | 0 |
| **Institucionais/legais** (sobre, contato, privacidade, termos, cookies, política editorial, como avaliamos, anuncie, FAQ, acessibilidade, mapa do site) | Nenhum (página de confiança, não de audiência) | — | — | — | 0 |
| **404, erro, páginas vazias** | Nenhum (o Google proíbe anúncio em página sem conteúdo) | — | — | — | 0 |
| **/admin** | **Nunca** (já é assim no `root.tsx`) | — | — | — | 0 |

Densidade resultante: matéria longa no PC = 4 espaços em uma página de ~4 a 6 telas; no celular = 2 a 3 espaços com
pelo menos 1 tela e meia entre eles. Fica bem abaixo do limite de 30% da altura no celular (padrão "Better Ads").

### D4. Onde ficam os IDs dos blocos: no painel `/admin/config` (tabela `settings`)

**Recomendação: painel.** `ADSENSE_CLIENT` continua como variável de ambiente (já decidido); os 4 IDs de bloco e um
interruptor "Anúncios ligados" ficam numa seção nova de `/admin/config`.

- Por quê: o dono cola os números sem mexer no hPanel e sem reiniciar o app; e ganha um **botão de desligar** imediato
  se algum anúncio ficar ruim. Os IDs de bloco não são segredo (aparecem no HTML de qualquer site com anúncio).
- Sem migration: a tabela `settings` já é chave/valor em JSON (`app/lib/admin/data.server.ts`).
- Alternativa descartada: `ADSENSE_SLOT_*` no hPanel (4 variáveis, reinício a cada troca, sem botão de desligar).

As 4 unidades (nomes sugeridos para criar no AdSense):

| Chave no código | Nome no AdSense | Tipo no AdSense | Usada em (`kind`) |
|---|---|---|---|
| `meio` | `respawnou-meio` | Anúncio In-article | `meio` |
| `faixa` | `respawnou-faixa` | Anúncio de display, **responsivo** | `horizontal` e `billboard` (o tamanho vem do CSS) |
| `lateral` | `respawnou-lateral` | Anúncio de display, **responsivo** | `lateral` |
| `multiplex` | `respawnou-multiplex` | Anúncio Multiplex | `multiplex` |

Duas unidades de display separadas (faixa e lateral) só para o relatório mostrar quanto cada local rende.

### D5. Componente `<AdSlot>` (comportamento)

Arquivo: `app/components/AdSlot.tsx`. Uso: `<AdSlot kind="horizontal" place="lista-1" />`.

- `kind`: `"meio" | "horizontal" | "billboard" | "lateral" | "multiplex"`. `place`: nome curto do local
  (`home-1`, `home-2`, `lista-1`, `lista-lateral`, `materia-meio-1`, `materia-meio-2`, `materia-lateral`,
  `materia-fim`, `ficha-1`, `calendario-1`, `calendario-2`, `arcade-lista`), usado no modo "ver espaços" e no
  atributo `data-place` (ajuda a achar no DevTools).
- **Quando desenha algo** (de verdade): `ADSENSE_CLIENT` válido **e** interruptor ligado **e** ID da unidade
  preenchido **e** `adsPathAllowed(pathname, search)` verdadeiro. Faltou qualquer um: retorna `null` (nada no HTML,
  nenhum buraco). A página também só coloca o `<AdSlot>` onde a tabela D3 manda (condições de `noindex`, número de
  itens etc. ficam na página).
- **Sem CLS**: no servidor (SSR) já sai a caixa com o tamanho reservado (CSS fixo por largura de tela, ver Tokens).
  O `<ins class="adsbygoogle">` **não** sai no SSR: só é criado no navegador, depois de montar. Assim o script do
  Google não mexe em HTML que o React ainda vai hidratar (sem aviso de hidratação vindo dos blocos).
- **Carrega perto de aparecer**: `IntersectionObserver` com `rootMargin: "600px 0px"`; só cria o `<ins>` e faz o
  `push` quando a caixa está a ~600 px da tela. Melhora o desempenho e a "visibilidade" (o Google paga melhor
  anúncio visto). Lazy loading de bloco manual é permitido.
- **`push` uma vez por `<ins>`**: guarda num `useRef` se já empurrou (o modo estrito do React em desenvolvimento roda
  efeitos duas vezes). Envolver em `try/catch` e nunca deixar erro do AdSense derrubar a página.
- **Navegação por clique (SPA)**: o bloco interno leva `key={pathname + search}`. Ao trocar de matéria para matéria
  (mesmo componente de rota), nasce um `<ins>` novo e um `push` novo; o antigo some com a página. Isso é
  "novo conteúdo por ação do usuário", permitido. **Proibido**: recarregar anúncio por tempo (timer) ou ao rolar.
- **Script ausente**: se a página anterior era um jogo (`/arcade/<jogo>`, sem script) e o visitante clicou para uma
  matéria, o script não está no documento. A função `ensureAdsScript(client)` procura
  `script[src*="adsbygoogle.js"]`; se não houver, cria um igual ao do `root.tsx` (async, `crossOrigin="anonymous"`)
  uma única vez.
- **Sem preenchimento**: quando o Google responde `data-ad-status="unfilled"` no `<ins>`, a caixa inteira (rótulo +
  espaço) some via CSS (`.ad-slot:has(ins[data-ad-status="unfilled"]) { display: none }`). Reforço em JS: um
  `MutationObserver` no `<ins>` que, ao ver `unfilled`, marca `data-state="off"` na caixa (navegadores sem `:has`).
- **Bloqueador de anúncio / script com erro**: 6 s depois do `push`, se o `<ins>` não tiver o atributo
  `data-adsbygoogle-status`, a caixa vira `data-state="off"` (some). Sem buraco preto para quem usa bloqueador.
- **`lateral` só no PC**: a caixa tem `hidden lg:flex` e o JS só cria o `<ins>` se
  `matchMedia("(min-width: 1024px)").matches` (bloco escondido com `display:none` dá erro "availableWidth=0").
- **Teste local**: em `localhost` o `<ins>` leva `data-adtest="on"` (impressão de teste não conta como inválida).
- **Acessibilidade**: wrapper `<aside aria-label="Publicidade" data-place=… class="ad-slot">`; o rótulo visível é
  `aria-hidden` (o `aria-label` já diz). Nenhum foco/teclado próprio.

Atributos do `<ins>` por tipo (exatos):

```tsx
// meio (In-article)
<ins className="adsbygoogle" style={{ display: "block", textAlign: "center" }} data-ad-layout="in-article" data-ad-format="fluid" data-ad-client={client} data-ad-slot={slots.meio} />
// horizontal / billboard / lateral (display responsivo com tamanho por CSS: SEM data-ad-format)
<ins className="adsbygoogle ad-size-h" /* ou ad-size-bb / ad-size-v */ style={{ display: "inline-block" }} data-ad-client={client} data-ad-slot={slots.faixa /* ou slots.lateral */} />
// multiplex
<ins className="adsbygoogle" style={{ display: "block" }} data-ad-format="autorelaxed" data-ad-client={client} data-ad-slot={slots.multiplex} />
```

### D6. Modo "ver espaços" (pré-visualização sem o Google) — obrigatório

- **Como liga**: em `/admin/config`, card "Anúncios", botão **VER ESPAÇOS NO SITE**. Ele grava
  `localStorage["respawnou:ads-preview"] = "1"` e abre `/` em outra aba. Botão vizinho **DESLIGAR** apaga a chave.
  Fica só no navegador do dono; não depende de `ADSENSE_CLIENT`, do interruptor nem dos IDs (funciona hoje, antes do
  pedido). Alguém que descobrir a chave só veria caixas tracejadas no próprio navegador: sem risco.
- **O que faz**: todo `<AdSlot>` permitido naquela página (mesmas regras de local, `adsPathAllowed` e condições da
  página) desenha uma **caixa tracejada** com o tamanho exato do anúncio, o tipo, o tamanho na largura atual e o
  `place`. **Nunca** cria `<ins>`, nunca faz `push`, nunca chama `ensureAdsScript`.
- **Aviso fixo**: com o modo ligado, aparece no canto inferior esquerdo de todas as páginas do site (fora do admin)
  o selo `MODO ESPAÇOS · SAIR` (SAIR apaga a chave e recarrega).
- Hidratação: o modo é lido só depois de montar (`useEffect`), então o SSR é igual para todo mundo (sem risco de
  cache servir caixas tracejadas para visitantes, sem diferença de hidratação).

### D7. Consentimento

- Brasil (LGPD): o banner próprio continua (`CookieConsent.tsx`), já com Modo de Consentimento v2. Quem escolhe
  "Só os essenciais" ainda vê anúncios (não personalizados ou limitados); nada muda.
- Europa/Reino Unido/Suíça: depois da aprovação, ativar a mensagem **"Regulamentos europeus"** do próprio Google
  (CMP certificada, grátis; ver Fase C). Para o visitante europeu não ver **dois** avisos, o banner próprio passa a
  não abrir quando a CMP do Google disser que o GDPR se aplica (passo AN12). No Brasil nada muda.

---

## Direção visual dos espaços

O anúncio é um "corpo estranho" no painel tático: deve parecer **encaixado e honesto**, nunca parte do conteúdo nem
chamativo. Sem verde-limão, sem cantos chanfrados, sem ícones, sem animação. Um rótulo mono minúsculo e uma moldura
de 1 px no tom das linhas do site. Hierarquia: o olho vê o conteúdo; o anúncio fica no plano de fundo até carregar.

### Tokens (o site só tem tema escuro)

| Uso | Valor |
|---|---|
| Fundo da caixa enquanto carrega | `#0c110c` (`--color-ink-2`) + classe `.scan` (linhas de varredura que já existem) |
| Borda da caixa | 1 px sólida `#1c241a` (`--color-line`) |
| Rótulo "PUBLICIDADE" | JetBrains Mono, 10 px, peso 600, `letter-spacing: 0.14em`, maiúsculas, cor `#8a9787` (`--color-muted`) |
| Espaço rótulo → caixa | 6 px |
| Raio / sombra | 0 / nenhuma (sem `.ch`/`.chs`) |
| Pré-visualização: borda | 1 px **tracejada** `#c8ff2e` (`--color-acc`) |
| Pré-visualização: fundo | `repeating-linear-gradient(45deg, rgba(200,255,46,.06) 0 8px, transparent 8px 16px)` sobre `#0c110c` |
| Pré-visualização: texto | linha 1 mono 11 px bold `#c8ff2e`; linhas 2–3 mono 11 px `#b4bfb0` / `#8a9787` |
| Pré-visualização: "SEM ID" | mono 10 px bold `#ffb020` (`--color-warn`) |

### CSS a acrescentar em `app/app.css` (final do arquivo)

```css
/* Anúncios (AdSlot). Nada de clip-path aqui: o ícone AdChoices precisa ficar visível. */
.ad-slot { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%; }
.ad-slot[data-state="off"],
.ad-slot:has(ins[data-ad-status="unfilled"]) { display: none; }
.ad-label { font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--color-muted); }
.ad-box { position: relative; max-width: 100%; border: 1px solid var(--color-line); background-color: var(--color-ink-2); }
/* Tamanhos fixos por largura de tela (caixa e <ins> usam a mesma classe). */
.ad-size-h  { width: 300px; height: 250px; }
.ad-size-bb { width: 300px; height: 250px; }
.ad-size-v  { width: 300px; height: 600px; }
@media (min-width: 768px)  { .ad-size-h, .ad-size-bb { width: 728px; height: 90px; } }
@media (min-width: 1024px) { .ad-size-bb { width: 970px; height: 250px; } }
.ad-size-meio { width: 100%; min-height: 280px; }
.ad-size-mx   { width: 100%; min-height: 420px; }
@media (min-width: 768px)  { .ad-size-mx { min-height: 320px; } }
/* No corpo da matéria o espaço respira como uma figura. */
.article-body .ad-slot { margin: 2.5rem 0; }
/* Modo "ver espaços" (só o dono). */
.ad-preview { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 8px; text-align: center;
  border: 1px dashed var(--color-acc);
  background: repeating-linear-gradient(45deg, rgba(200, 255, 46, 0.06) 0 8px, transparent 8px 16px), var(--color-ink-2); }
```

A caixa `.ad-box` recebe a classe de tamanho (`ad-size-h` etc.); o `<ins>` dentro dela recebe a mesma classe (fixos)
ou só `display:block` (fluidos). A borda de 1 px fica em volta (caixa 2 px maior que o anúncio, nada é cortado).

### Componentes e estados

| Estado | O que aparece |
|---|---|
| Desligado (sem client/ID/interruptor, ou página proibida) | Nada no HTML |
| Carregando (SSR e antes do Google responder) | Rótulo "PUBLICIDADE" + caixa com tamanho reservado, fundo `#0c110c` com `.scan`, borda `#1c241a`. Sem spinner (chamaria atenção) |
| Preenchido | Rótulo + anúncio do Google dentro da caixa (a borda fina continua) |
| Sem preenchimento (`unfilled`) | Some inteiro (rótulo e caixa) |
| Bloqueador / erro do script (6 s sem status) | Some inteiro |
| `lateral` abaixo de 1024 px | Não existe (CSS `hidden lg:flex`, JS não cria `<ins>`) |
| Pré-visualização | Rótulo "PUBLICIDADE" + caixa `.ad-preview` no tamanho exato, com 3 linhas: `ANÚNCIO · <TIPO>`, tamanho na largura atual (ex.: `300 × 250` abaixo de 768, `728 × 90` em 768–1023, `970 × 250` a partir de 1024, trocados por classes `md:hidden`/`hidden md:block`/`lg:…`), e `<place>`; se a unidade não tiver ID no painel, acrescenta `SEM ID` em `#ffb020` |
| Foco/hover | Nenhum estilo próprio (o anúncio não é elemento do site) |

Textos de tamanho na pré-visualização: `meio` → `LARGURA DO TEXTO · ~280 PX (FLUIDO)`; `multiplex` →
`LARGURA TOTAL · ~320–420 PX (FLUIDO)`; `lateral` → `300 × 600 · SÓ NO PC`.

Selo do modo: `fixed bottom-3 left-3 z-[60]`, `border border-acc bg-ink-2 px-3 py-2 font-mono text-[11px] font-bold
text-acc`, texto `MODO ESPAÇOS` + botão `SAIR` (`text-paper hover:text-acc`, `min-h-9`, `ml-3`). Sem `.chs`.

### Reuso

- `useRouteLoaderData("root")` (padrão de `root.tsx`) para ler a configuração.
- `.scan`, variáveis de cor de `app/app.css`; `Card`, `Field`, `inputCls`, `Button`, `Notice` de
  `app/components/admin-ui` no card do painel.
- `isAdmin` não é necessário (o modo vive no `localStorage`; o botão fica atrás do login).

---

## Arquivos afetados

| Arquivo | O que muda |
|---|---|
| `app/lib/ads.ts` | Tipos `AdKind`/`AdUnit`, mapa `KIND_UNIT`, `AD_PREVIEW_KEY`, `adsPathAllowed()`, `ensureAdsScript()` (só cliente) |
| `app/lib/ads.server.ts` (novo) | `getAdsConfig()` com cache de 60 s e `saveAdsConfig()` (tabela `settings`, chaves `ads_enabled` e `ads_slots`) |
| `app/lib/ad-placement.ts` (novo) | `inArticleSlots(body, section)` (função pura: onde entram os "meio") |
| `app/components/AdSlot.tsx` (novo) | `<AdSlot>`, caixa de pré-visualização, `<AdPreviewBadge>` |
| `app/root.tsx` | Loader devolve `ads`; `Layout` renderiza `<AdPreviewBadge>` fora do admin |
| `app/routes/admin/settings.tsx` | Card "Anúncios" com formulário próprio (`intent=ads`) e botões do modo espaços |
| `app/routes/home.tsx`, `section.tsx`, `platform.tsx`, `post.tsx`, `game.tsx`, `releases.tsx`, `arcade.tsx` | Colocam os `<AdSlot>` conforme D3 |
| `app/components/CookieConsent.tsx` | Não abre quando a CMP do Google atende o visitante (GDPR) |
| `app/app.css` | Classes `.ad-*` |
| `docs/adsense.md`, `docs/arcade.md`, `docs/admin.md`, `docs/README.md`, `docs/decisoes.md` | Referências a este plano |

Não mexer: `app/routes/arcade-game.tsx` (sem anúncios), regra `gamePage` do `root.tsx`, `ads-txt.ts`.

---

## Passos

Um passo = um commit. `npm run build` antes de cada push. Tamanho: **P** (até ~30 min), **M** (~1 h), **G** (2 h+).

### Fase A — código pronto e inerte (fazer já, antes do pedido)

**AN1 (P) — Medir o desempenho de hoje (linha de base).**
Rodar o PageSpeed Insights (API pública, sem chave:
`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<URL>&strategy=mobile` e `strategy=desktop`) em
4 URLs de produção: `/`, uma matéria recente de `/noticias/…`, `/noticias`, `/arcade`. Anotar nota de Desempenho,
LCP, CLS e TBT na tabela "Medição" deste arquivo (coluna "Antes"). Se a API falhar, deixar como pendência do dono
(pagespeed.web.dev).
Verificar: tabela preenchida com 8 linhas (4 URLs × 2 aparelhos).

**AN2 (P) — Tipos e regras em `app/lib/ads.ts`.**
Acrescentar (sem mexer no que existe):
```ts
export type AdKind = "meio" | "horizontal" | "billboard" | "lateral" | "multiplex";
export type AdUnit = "meio" | "faixa" | "lateral" | "multiplex";
export const KIND_UNIT: Record<AdKind, AdUnit> = { meio: "meio", horizontal: "faixa", billboard: "faixa", lateral: "lateral", multiplex: "multiplex" };
export const AD_PREVIEW_KEY = "respawnou:ads-preview";
export type AdsConfig = { enabled: boolean; slots: Partial<Record<AdUnit, string>> };
const NO_ADS = /^\/(admin|busca|sobre|contato|privacidade|termos|cookies|politica-editorial|como-avaliamos|anuncie|faq|acessibilidade|mapa-do-site)(\/|$)/;
/** Página pode ter anúncio? (as páginas ainda aplicam as próprias condições de D3) */
export function adsPathAllowed(pathname: string, search: string) {
  if (NO_ADS.test(pathname)) return false;
  if (/^\/arcade\/[^/]+/.test(pathname)) return false; // jogos: nunca
  if (new URLSearchParams(search).get("previa") === "1") return false;
  return true;
}
```
e `ensureAdsScript(client: string)` (cria o `<script async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=…">` se não existir; só roda no navegador).
Verificar: `npm run typecheck` (ou `npm run build`) sem erro.

**AN3 (P) — Configuração no banco (`app/lib/ads.server.ts`) e loader da raiz.**
`getAdsConfig(): Promise<AdsConfig>` lê `settings` (`ads_enabled` padrão `false`, `ads_slots` padrão `{}`), guarda
em memória por 60 s e, se o banco falhar ou não existir (modo de dados de exemplo), devolve
`{ enabled: false, slots: {} }`. `saveAdsConfig(cfg)` grava as duas chaves (`INSERT … ON DUPLICATE KEY UPDATE`, igual
a `saveSettings`) e zera o cache. Validar cada ID com `/^\d{8,12}$/` (ID de bloco do AdSense tem 10 dígitos);
inválido vira vazio. No `root.tsx`, o loader passa a devolver também `ads: await getAdsConfig()` (no mesmo
`Promise.all`). Não incluir em `SETTING_KEYS` (o formulário do robô salva tudo de uma vez e apagaria os anúncios).
Verificar: build ok; abrir o site localmente sem banco e confirmar que nada quebra.

**AN4 (M) — Card "Anúncios" em `/admin/config`.**
Segundo `<Form method="post">` abaixo do card do robô, com `<input type="hidden" name="intent" value="ads">`. Na
`action`, se `intent === "ads"`, validar e chamar `saveAdsConfig`, redirecionar para `/admin/config?ok=ads`
(mensagem "Anúncios salvos. Valem em até 1 minuto."); senão segue o fluxo atual. Conteúdo do card:
- Linha de status (mono, 12 px): `ADSENSE_CLIENT: CONFIGURADO` (acc) ou `ADSENSE_CLIENT: AUSENTE` (warn). Nunca
  mostrar o valor. (O loader da página lê `adsenseClient()` só para saber se existe.)
- Checkbox "Anúncios ligados (blocos manuais)" (`ads_enabled`), com dica "Desmarque para tirar todos os anúncios do site na hora".
- 4 campos `Field` em grade `sm:grid-cols-2`: "No meio da matéria (In-article)", "Faixa entre blocos (Display)",
  "Lateral no PC (Display)", "Fim da matéria (Multiplex)", `inputMode="numeric"`, `placeholder="ex.: 1234567890"`,
  dica comum "Número em data-ad-slot no código do bloco, no AdSense".
- Botão Salvar.
- Fora do `<Form>` (componente de cliente): botões **VER ESPAÇOS NO SITE** e **DESLIGAR**, mais texto "Mostra
  caixas tracejadas onde os anúncios vão ficar, só neste navegador. Não chama o Google." e o estado atual
  ("Modo espaços: ligado/desligado", lido do `localStorage` depois de montar).
Verificar: salvar, recarregar e ver os valores; ID com letras some; o formulário do robô continua salvando sem
apagar os anúncios (salvar um, depois o outro, conferir os dois).

**AN5 (G) — Componente `app/components/AdSlot.tsx` + CSS.**
Implementar exatamente D5 (comportamento), D6 (pré-visualização) e a tabela de estados; CSS da seção "CSS a
acrescentar". Estrutura do HTML ao vivo:
```html
<aside aria-label="Publicidade" data-place="home-1" class="ad-slot [hidden lg:flex se lateral]">
  <span class="ad-label" aria-hidden="true">Publicidade</span>
  <div class="ad-box ad-size-bb scan"><!-- <ins> só no navegador --></div>
</aside>
```
Exportar também `AdPreviewBadge` (o selo) e um hook `useAdsPreview()` (lê `AD_PREVIEW_KEY` em `useEffect`, começa
`false`). Classe de tamanho por `kind`: `meio → ad-size-meio`, `horizontal → ad-size-h`, `billboard → ad-size-bb`,
`lateral → ad-size-v`, `multiplex → ad-size-mx`.
Verificar: ainda sem colocar em nenhuma página, build ok.

**AN6 (P) — Selo do modo espaços na raiz.**
No `Layout` do `root.tsx`, renderizar `<AdPreviewBadge />` quando `!admin` (ele mesmo só aparece se o modo estiver
ligado). Verificar: ligar pelo painel, abrir `/` e ver o selo; SAIR remove.

**AN7 (P) — Regra do "meio" em `app/lib/ad-placement.ts`.**
`inArticleSlots(body: Block[], section: string): number[]` devolve os índices de bloco **depois** dos quais entra um
`meio` (0, 1 ou 2 índices):
- `section === "promocoes"` → `[]`.
- Contar palavras dos blocos `p` (sem os "Leia também:"), `ul` e `quote`; total < 350 → `[]`.
- 1º: depois do 3º `p` comum (não "Leia também"), desde que haja ≥ 150 palavras antes; se o bloco seguinte não for
  `p` ou `h2` (ex.: `img`, `video`, `ul`, "Leia também"), avançar até a primeira fronteira em que o bloco atual é `p`
  comum e o seguinte é `p` ou `h2`. Precisa sobrar ≥ 3 blocos depois; senão `[]`.
- 2º: só com total ≥ 900 palavras; procurar a mesma fronteira a partir de 6 blocos depois do 1º, com ≥ 3 blocos
  antes do fim.
Verificar: testar no console/arquivo de rascunho com 3 corpos de matérias reais (curta, média, guia longo) e anotar
no commit os índices obtidos.

**AN8 (M) — Matéria (`app/routes/post.tsx`).**
- Calcular `const ads = preview ? [] : inArticleSlots(post.body, post.section)` e, no `map` do corpo, depois do
  bloco `i` incluído em `ads`, renderizar `<AdSlot kind="meio" place={`materia-meio-${n}`} />` (n = 1 ou 2). Usar
  `Fragment` com `key`.
- Lateral: último filho do `<aside>`, envolto em `<div className="sticky top-[92px] hidden lg:block">` com
  `<AdSlot kind="lateral" place="materia-lateral" />` (só se `!preview`).
- Fim: `<AdSlot kind="multiplex" place="materia-fim" />` como último filho do `<main>`, depois da seção de
  relacionados (o `gap-14` dá 56 px); só se `!preview` e a matéria tiver ≥ 350 palavras (reaproveitar a contagem de
  AN7: exportar `bodyWords(body)`).
Verificar (modo espaços, 375 e 1440): matéria média mostra 1 meio + multiplex (+ lateral no PC); guia longo mostra
2 meios; matéria de `/promocoes/…` sem meio; `?previa=1` sem nada; nenhuma caixa encostada nos botões de
compartilhar.

**AN9 (M) — Home (`app/routes/home.tsx`).**
Depois de filtrar `modules`, calcular os índices: `0` sempre (se existir módulo seguinte) e `3` se `modules[3]` e
`modules[4]` existirem e nenhum dos dois tiver `code` com `LOOT` ou `ARCADE`. No `map`, depois da `<section>` do
módulo `i` marcado, renderizar `<AdSlot kind="billboard" place={`home-${n}`} />`. Só com `d.featured` (home com
conteúdo). Verificar em 375/1024/1440 no modo espaços: 300×250, 970×250; o 2º nunca encosta no Loot/Arcade.

**AN10 (P) — Listas (`app/routes/section.tsx` e `app/routes/platform.tsx`).**
- `section.tsx`: anúncio na lista só se `!platform` e `posts.items.length >= 6`; posição depois do índice `3`
  (`PostRow` nº 4), ou do índice `5` com `posts.items.length >= 8` quando `free.length > 0` (página 1 de
  Promoções). Envolver em `<div className="my-8">` (a lista não tem `gap`). Lateral: no `<aside>`, depois de
  `MostRead`, `<div className="sticky top-[92px] mt-8 hidden lg:block"><AdSlot kind="lateral" place="lista-lateral" /></div>`,
  só se `!platform` e `posts.items.length >= 3`.
- `platform.tsx`: mesma regra de lista e lateral, usando a mesma condição de `noindex` do `meta` da página para
  desligar (ler o arquivo antes; se a estrutura for diferente, aplicar só o da lista).
Verificar: `/noticias` com e sem `?plataforma=pc` (sem anúncio com filtro); `/promocoes` página 1 sem nada perto
do quadro de jogos grátis.

**AN11 (P) — Ficha, calendário e lista do Arcade.**
- `game.tsx`: `const indexable = posts.length > 0 || Boolean(game.indexFrom)` (igual ao `meta`); se verdadeiro,
  `<AdSlot kind="horizontal" place="ficha-1" />` imediatamente antes da seção "Tudo sobre".
- `releases.tsx`: sem `platform`, depois do grupo de índice 0 e de índice 2, cada um só se `g.items.length >= 4`
  (`place` `calendario-1`/`calendario-2`).
- `arcade.tsx`: depois do `<ul>` da grade e antes do parágrafo, se `games.length >= 3`
  (`place="arcade-lista"`).
Verificar no modo espaços: ficha sem matéria não mostra caixa; `/arcade?categoria=…` com 2 jogos não mostra.

**AN12 (P) — Banner próprio x CMP do Google (Europa).**
Em `CookieConsent.tsx`, antes de abrir na 1ª visita: se `window.__tcfapi` existir, chamar
`__tcfapi("addEventListener", 2, (tc, ok) => …)`; se `ok && tc.gdprApplies === true`, **não** abrir o banner
próprio (a CMP do Google cuida). Se `__tcfapi` não existir até 1,5 s, seguir como hoje. O link "Preferências de
cookies" do rodapé, nesse caso, chama `googlefc.showRevocationMessage()` se existir. Hoje (sem CMP) nada muda.
Verificar: build ok; comportamento atual igual no Brasil.

**AN13 (P) — Revisão final no modo espaços + docs.**
Ligar o modo espaços e passar por: `/`, `/noticias`, `/promocoes`, uma notícia, um guia longo, uma matéria de
promoção, uma ficha indexada e uma sem matéria, `/lancamentos`, `/arcade`, `/arcade/sudoku`, `/sobre`, `/busca?q=gta`,
uma URL inexistente. Em 375, 768, 1024 e 1440 px. Conferir a tabela D3 (quantidades e posições) e a regra de 1
anúncio por tela no celular. Sem rolagem lateral em 375 px. Atualizar `adsense.md` ("Ao ser aprovado": trocar
"decidir depois" por "blocos manuais, ver anuncios.md"), `arcade.md` (citar que os automáticos ficam desligados),
`admin.md` (card Anúncios) e o status no `README.md`. Fazer 2 capturas (375 e 1440 de uma matéria no modo espaços)
em `docs/screenshots/anuncios-*.png` para o dono aprovar.
Verificar: dono olha as capturas e aprova (pendência dele).

### Fase B — pedido de revisão (dono, previsão 24/11 a 1/12)

Checklist antes de clicar em "Solicitar revisão" (além do checklist de `adsense.md`):

- [ ] Fase A no ar e capturas do modo espaços aprovadas.
- [x] (2026-11-22, conferido ao vivo) `ADSENSE_CLIENT` cadastrado no hPanel; abrir `https://respawnou.com.br/ads.txt` e ver a linha `google.com, pub-…, DIRECT, f08c47fec0942fa0`.
- [x] (2026-11-22, conferido ao vivo: script na home/matéria e ausente em /arcade/sudoku) Ver o código-fonte de uma matéria e achar `adsbygoogle.js?client=ca-pub-…` (e **não** achar em `/arcade/sudoku`).
- [ ] Banner de cookies aparece numa janela anônima.
- [ ] Nenhuma página com "em breve", placeholder ou imagem quebrada no menu.
- [ ] Interruptor "Anúncios ligados" **desmarcado** e IDs vazios (durante a revisão não há blocos; é normal).
- [ ] Não clicar em anúncios do próprio site, nunca (nem para testar). Para ver o layout, usar o modo espaços.

### Fase C — aprovado: o que fazer no painel do AdSense (passo a passo para quem nunca fez)

1. **Desligar os automáticos**: AdSense → **Anúncios** → aba **Por site** → lápis ao lado de `respawnou.com.br` →
   desligar **Anúncios automáticos** (e conferir que "Formatos de sobreposição": âncora e vinheta, e "Anúncios na
   página" ficam desligados) → **Aplicar ao site**.
2. **Excluir páginas** (proteção extra): na mesma tela, **Exclusões de página** → **Gerenciar** → adicionar
   `respawnou.com.br/arcade/*` (todas as páginas de jogo). Salvar.
3. **Desligar a otimização automática**: menu **Otimização** → **Otimização automática** → desligar (ela pode
   ligar formatos sozinha).
4. **Criar as 4 unidades**: **Anúncios** → aba **Por unidade de anúncio** →
   - **Anúncios de display** → nome `respawnou-faixa` → tipo **Responsivo** → Criar → copiar só o número de
     `data-ad-slot="…"` → colar em `/admin/config` → "Faixa entre blocos".
   - De novo **Anúncios de display** → `respawnou-lateral` → Responsivo → colar em "Lateral no PC".
   - **Anúncios In-article** → `respawnou-meio` → em "Estilo", fundo `#0c110c`, título `#eef3ea`, texto `#b4bfb0`
     (se o painel oferecer) → colar em "No meio da matéria".
   - **Anúncios Multiplex** → `respawnou-multiplex` → mesmas cores se oferecer → colar em "Fim da matéria".
   (Não precisa colar o código do Google em lugar nenhum: o site já monta o código sozinho.)
5. Em `/admin/config`, marcar **Anúncios ligados** e salvar. Em até 1 minuto os blocos começam a aparecer (nos
   primeiros dias podem vir vazios: é normal, o espaço some sozinho).
6. **Bloquear categorias sensíveis**: **Proteção da marca** → **Conteúdo** → **Controles de bloqueio** →
   `respawnou.com.br` (ou "Todos os sites") → **Gerenciar categorias sensíveis** → bloquear **Jogos de azar e
   apostas** (público de games é jovem e "bets" são assunto sensível no Brasil) e as outras da pergunta em aberto 2.
7. **Europa**: **Privacidade e mensagens** → **Regulamentos europeus** → Criar mensagem → escolher o site, idioma
   português e inglês, aceitar o padrão → **Publicar**. (O site já esconde o banner próprio para esses visitantes,
   passo AN12.)
8. **Não marcar** o site como direcionado a crianças (Configurações da conta/Conteúdo): o site é para o público geral.
9. **Pagamentos**: preencher dados de pagamento e verificar o endereço (o Google manda um PIN pelo correio quando o
   saldo passa de ~US$ 10). O pagamento só sai quando o saldo chega a US$ 100.
10. Avisar o Claude para fazer AN14 e lembrar do e-mail ao partner@igdb.com (`adsense.md`).

**AN14 (P, executor, logo depois do passo 5 do dono) — Conferência ao vivo.**
Em produção, abrir uma matéria, a home e `/arcade` com o console aberto: sem erro de `adsbygoogle.push`, sem aviso
de hidratação novo (o aviso do `<head>` já é conhecido, ver `adsense.md`), caixas `unfilled` somem, nenhuma caixa
sobra vazia depois de 6 s, `/arcade/sudoku` sem `<ins>` e sem script (abrindo a URL direto). Navegar por clique
matéria → matéria e conferir `<ins>` novos (um `push` por caixa). Registrar no README.

**AN15 (P, executor, 3 dias depois) — Medir de novo.** Repetir AN1 (coluna "Depois"). Se o CLS de alguma URL
passar de 0,1 ou o LCP piorar mais de 0,5 s, investigar o local responsável e corrigir antes de qualquer outra coisa.

### Fase D — DESCARTADA pelo dono em 2026-11-22 (sem âncora)

**AN16 (M) — Teste da âncora inferior no celular.** Só se o dono quiser (pergunta 1). Antes de ligar no painel
(Anúncios automáticos → só "Âncora", posição inferior, sem vinheta, sem anúncios na página), os links para
`/arcade/<jogo>` (`ArcadeCard.tsx`, o card da lateral em `post.tsx`) passam a usar `reloadDocument` quando o
AdSense estiver configurado, para o jogo sempre abrir sem script. Medir 7 dias; manter só se o RPM subir sem queda de
páginas por visita no `/admin/visitas`.

---

## Políticas do AdSense que este plano respeita

- **Rótulo**: "Publicidade" (permitido). Nunca "clique aqui", "apoie o site clicando", setas ou destaque em verde.
- **Distância**: ≥ 32 px de botões, links, menus e campos; nada no cabeçalho fixo, no rodapé ou no banner; nada
  dentro de link; nada que pareça card do site (por isso sem in-feed e sem anúncio entre cards do Arcade).
- **Não incentivar cliques** e **não clicar nos próprios anúncios** (nem o dono, nem amigos). Cliques inválidos são
  a causa nº 1 de conta banida. Para conferir layout, modo espaços.
- **Páginas sem conteúdo**: 404, erro, vazias, busca, prévia e institucionais sem anúncio. Fichas só com dados
  (`noindex`) sem anúncio.
- **Conteúdo gerado por IA**: permitido se for útil; o robô já segue as regras de `adsense.md` (≥ 350 palavras,
  valor acrescentado, fonte creditada, sem invenção). Matéria abaixo de 350 palavras não recebe anúncio.
- **Jogos**: o Google pede que anúncios fiquem fora da área do jogo e afastados dos controles (a referência usada no
  programa de jogos é 150 px). Escolhemos o mais seguro: nenhum anúncio e nenhum script em `/arcade/<jogo>`.
- **Cassino e apostas**: o site não escreve sobre isso e a categoria de anúncio fica bloqueada (Fase C, passo 6).
- **Recarregar anúncio**: só quando o visitante muda de página. Nunca por tempo.
- **Não alterar o anúncio**: nada de `clip-path`, `opacity`, sobreposição ou esconder o "AdChoices".
- **`ads.txt`** na raiz, gerado do `ADSENSE_CLIENT` (já existe).
- **Consentimento**: banner próprio + Modo de Consentimento v2 no Brasil; CMP certificada do Google na Europa.

---

## Medição

| URL | Aparelho | Antes (AN1): Desempenho / LCP / CLS / TBT | Depois (AN15) |
|---|---|---|---|
| `/` | celular | | |
| `/` | PC | | |
| matéria | celular | | |
| matéria | PC | | |
| `/noticias` | celular | | |
| `/noticias` | PC | | |
| `/arcade` | celular | | |
| `/arcade` | PC | | |

- **AdSense → Relatórios**: olhar por **Unidade de anúncio** a "RPM da página", as "Impressões" e a
  **"Visibilidade do Active View"** (quanto do anúncio foi visto). Search Console → Core Web Vitals só terá dados com
  mais tráfego; até lá vale o PageSpeed.
- **`/admin/visitas`**: comparar a semana antes e a semana depois de ligar: visitas, páginas por visita e origem.
  Queda de páginas por visita acima de ~15% é sinal de anúncio atrapalhando.

Plano da 1ª semana depois de ligar:

| Dia | O que olhar | Ajuste se precisar |
|---|---|---|
| 1 | AN14 (console, caixas vazias, jogo sem script) | Corrigir qualquer caixa que sobre vazia |
| 3 | AN15 (PageSpeed) | CLS > 0,1 ou LCP pior → corrigir o local culpado |
| 7 | Relatório por unidade + `/admin/visitas` | Unidade com visibilidade < 40% → mudar de lugar ou tirar (candidatos: 2º meio e `home-2`). Queda de páginas/visita > 15% → tirar o 2º meio e o `home-2` primeiro |
| 14 | Mesmo do dia 7 | Decidir a Fase D (âncora) com o dono |

## Estimativa honesta de receita

Com o tráfego de hoje (poucas centenas de visitas por dia, quase tudo do Google) e RPM típico de games em português,
o esperado nas primeiras semanas é de **centavos a poucos reais por dia**; o primeiro pagamento (mínimo de US$ 100)
deve levar meses, e o que faz a receita crescer é o tráfego, não mais anúncios por página.

---

## Riscos e cuidados

- **React Router**: não renomear rotas; loaders seguem usando `routePath`/`firstSegment`. `npm run build` antes do push.
- **Hidratação**: nada de `<ins>` no SSR; o modo espaços só depois de montar. Se aparecer aviso novo de hidratação
  depois do AN5, é bug do componente (o aviso do `<head>` já é conhecido).
- **Modo estrito do React** roda efeitos 2 vezes em dev: o `useRef` evita `push` duplo ("All ins elements … already
  have ads in them").
- **Cache**: o HTML não pode variar por usuário. Por isso o modo espaços é `localStorage` e não cookie/parâmetro no
  loader.
- **Formulário do painel**: o card do robô salva todas as `SETTING_KEYS`; as chaves de anúncio ficam fora dessa
  lista e têm `action` própria.
- **Banco fora do ar / dados de exemplo**: `getAdsConfig()` devolve desligado; nunca derruba a página.
- **`:has()`**: navegadores muito antigos não têm; o `MutationObserver` cobre.
- **Sticky lateral**: só dentro do `<aside>`; nunca `position: fixed` (anúncio fixo que cobre conteúdo é proibido).
- **Nada de migration** neste plano (a tabela `settings` já existe). Se alguém achar que precisa, colar o SQL no chat.

## Como verificar (resumo)

- `npm run build` sem erro em todos os passos.
- Modo espaços ligado: conferir a tabela D3 em 375, 768, 1024 e 1440 px nas páginas do AN13.
- Sem modo espaços e sem IDs: HTML de uma matéria sem `ad-slot` (nada muda para o visitante antes da aprovação).
- Depois da aprovação: AN14 e AN15.

## Decisões do dono (2026-11-22)

1. **Âncora inferior:** não. Sem âncora, nunca: a Fase D (AN16) fica **descartada** e os automáticos continuam todos desligados.
2. **Categorias sensíveis:** bloquear "Jogos de azar e apostas" desde o início; "Namoro" e "Conteúdo sexual sugestivo" **só se o AdSense apontar problema** (o dono avisa e bloqueia no painel, Fase C, passo 6).
3. **2º anúncio no meio** das matérias longas (900+ palavras): **sim**, ligado desde o início (já é o comportamento do código, regra AN7).
4. **Home no PC:** billboard **970×250** (já é o tamanho da classe `ad-size-bb` a partir de 1024 px), mesmo sendo menos discreto.
5. **Faixa na lista do Arcade** (`/arcade`): não foi respondida; **fica como recomendado** (1 faixa abaixo da grade, nunca nos jogos). Se o dono preferir o Arcade todo sem anúncio, é só tirar o `<AdSlot place="arcade-lista">` de `app/routes/arcade.tsx`.

**Andamento (2026-11-22):** `ADSENSE_CLIENT` configurado e conferido ao vivo; banner de cookies visto pelo dono numa janela anônima; **pedido de revisão feito no AdSense**. PageSpeed (AN1) adiado por decisão do dono. Enquanto o Google analisa, o interruptor "Anúncios ligados" fica desmarcado.
