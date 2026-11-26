# Vídeo vertical em tela dividida (vídeo enviado em cima, imagem da matéria embaixo, legenda no meio)

Status: ✅ **DV1 a DV10 implementados e testados localmente (2026-11-26)**; DV11 com docs e build feitos, falta o 1º vídeo
real na VPS. Perguntas respondidas: "ok as recomendações" (ver `decisoes.md`). Base: `docs/modulo-video.md` (núcleo × do
site) e as regras de `docs/video-melhorias.md`.

## Objetivo

Quando a matéria tem um vídeo enviado pelo dono, o Reel/Short 1080×1920 passa a ser **dividido ao meio**: em cima, os
cortes do vídeo enviado rodando **desde o quadro 0**; embaixo, a capa da matéria (ou uma imagem por cena, com
alinhamento próprio); a legenda fica **na divisa** entre as duas metades. A meta é prender quem assiste no primeiro
segundo (movimento + texto já na tela, sem cartão estático de título).

## Contexto (conferido no código em 2026-11-26)

| Peça | Onde | Hoje | Por que muda |
|---|---|---|---|
| Plano de clipes | `app/video/gerador.server.ts` (passo 3) | Cada cena mostra 1 imagem ou 1 trecho de vídeo em tela cheia; cena 1 começa em 0 com o cartão de abertura por cima | Em cima e embaixo passam a ser **duas linhas do tempo** independentes |
| Vídeo enviado | `scripts/video/videoclip.ts` (`ehVideoSrc`, `escolherTrechos`, `TRECHO_MAX_S` 4,5 s, `FRACAO_MAX_VIDEO` 0,4) e `ss` manual por cena | Trechos de até 4,5 s, no máximo 40% do vídeo quando o servidor escolhe sozinho; vídeo inteiro no centro com ele mesmo desfocado ao fundo (`comandoClipeVideo`) | Em cima o vídeo ocupa o tempo todo, recortado para 1080×960 |
| Montagem | `scripts/video/ffmpeg.ts` (`montar`, 2 passadas) | Passada 1: cenas 1080×1920 + `xfade` + fechamento → `base.mp4`. Passada 2: pulso, moldura topo (y 0) e base (y 1100), cartões (x 24, y 560 ou 290), abertura (y 940), barra (y 226), legenda, áudio | Passada 1 ganha o ramo "dividido" (`vstack`); passada 2 ganha a divisória e perde a abertura no modo dividido |
| Legenda | `scripts/video/ass.ts` (`gerarAss`) | Estilo `Pal`: Anton 92, alinhamento 2 (embaixo), `MarginV` 480 → base do texto em y 1440; crédito `Cred` embaixo à esquerda (`MarginV` 330); só palavras das cenas | Legenda centrada em y 960; no modo dividido o gancho também vira legenda (não há cartão de título) |
| Quadros | `app/video/render/quadros.tsx` + `quadros.server.ts` | `Moldura`, `Abertura` (painel em y 980), `Fechamento` | Nova `Divisoria`; `Abertura` com posição configurável (só para a capa) |
| Cartões | `app/video/cartoes.ts` (`planoCartoes`, `y` 290/560) | Sobre a metade de cima | Iriam cobrir o vídeo: no modo dividido descem para a metade de baixo |
| Roteiro | `app/video/roteiro.ts` (`Roteiro`, `CenaRoteiro`) e `roteiro.server.ts` (`validarRoteiro`) | `validarRoteiro` **monta um objeto novo** e descarta campos que não conhece | Campos novos precisam entrar na validação, senão somem ao salvar |
| Painel | `app/routes/admin/videos.tsx` (`CapaEscolha`, `CenasEditor`, `CenaLinha`, action `salvar`) | O formulário **remonta** `cenas` e o mapa `focus` inteiros a partir dos campos `fala_i`, `img_i`, `foco_i`, `ss_i`, `capa`, `capa_foco` | Todo campo novo (layout, imagem de baixo, foco de baixo) precisa ir no formulário |
| Foco por imagem | `video_jobs.focus` (JSON) | Chave = índice da imagem (`"3": "40,60"`), `"_capa"` = índice da capa | Ganha chaves `"b:<i>"` (foco de baixo, proporção 9:8) e `"t:<i>"` (enquadramento do vídeo de cima) |
| Prévia da 1ª tela | `app/routes/admin/videos-capa.ts` | Imagem 9:16 + moldura + abertura | Ganha o modo dividido |
| Teste local | `scripts/video/teste-local.ts` (`--video` cria `video0.mp4` com `testsrc2` 1280×720, 30 s) | Vídeo só nas cenas 2 e 3 | Ganha `--dividido` |

Sem migration: tudo fica no JSON de `video_jobs.script` e `video_jobs.focus`.

## Decisões deste plano (uma recomendação por ponto pedido)

1. **Quando liga:** automático. Ao enviar um vídeo (`adicionarVideo`), se o roteiro ainda não tem `layout`, ele recebe
   `layout: "dividido"` e `topo: <índice do vídeo>`. No painel há a chave "Formato da tela" (Tela dividida / Tela
   cheia) para desligar. Guardado **no roteiro**: `layout?: "dividido" | "cheio"` e `topo?: number`. Roteiro sem
   `layout` = tela cheia (todos os antigos continuam iguais). "Refazer roteiro" (Gemini) preserva `layout` e `topo`.
   Se `layout = "dividido"` mas não houver vídeo legível, o gerador cai para tela cheia e registra aviso no log.
2. **Metade de cima (1080×960):** o vídeo enviado rodando desde 0 s, cortes secos de até 4,5 s (`TRECHO_MAX_S`), um ou
   mais por cena, pontos escolhidos por `escolherTrechos` ou pelo `ss` manual da cena (mesma regra de hoje: o `ss` vale
   para o 1º corte da cena e os seguintes continuam dali). Preenchimento **cobrindo** (crop central, sem bordas) por padrão;
   opções por vídeo: Centro, Esquerda, Direita, Inteiro com fundo desfocado. Sem áudio original. **Sem o teto de 40%**
   no modo dividido (o dono escolheu o formato; mesma regra de hoje para vídeo escolhido pelo dono nas cenas), com o
   crédito na tela o tempo todo. Ver pergunta 1.
3. **Metade de baixo (1080×960):** padrão = imagem da capa escolhida no painel (`focus._capa`) ou, sem escolha, a 1ª imagem
   utilizável (é a capa da matéria em `imagensDisponiveis`). Por cena, campo opcional `baixo` (índice de imagem; vazio =
   padrão). Alinhamento **por imagem** na proporção 9:8 (chave `"b:<i>"`), editado com o `AlinharImagem` existente
   (`aspecto={9 / 8}`). Movimento: **respiração leve** (zoom 1,00 → 1,05 centrado, o modo `fixo` de `movimento()`), sem
   panorâmica: o movimento forte é o de cima; embaixo fica calmo e legível. Troca de imagem com `fade` de 0,35 s.
4. **Legenda:** centrada em y 960 (alinhamento 5 do ASS), Anton 84, contorno 7 px na cor do fundo. Atrás dela, a
   **divisória**: faixa de 8 px na cor de destaque (`#c8ff2e`) em y 956–964 com sombra escura de 76 px para cima e para
   baixo (dá contraste à legenda sobre qualquer imagem e separa as metades).
5. **Demais peças no modo dividido:**
   - **Cartão de abertura (título): sai do vídeo.** O vídeo começa com o corte de cima rodando, a imagem de baixo e o
     **gancho já como legenda** na divisa. O título fica só na capa (thumbnail).
   - **Moldura:** mantida igual (topo 0–420 com logo e seção sobre o vídeo; base 1100–1920 escurecendo o fim da imagem).
   - **Barra de progresso:** mantida em y 226.
   - **Cartões de dados:** sobre a metade de baixo, `y = 1060` (caixa visível de 1100 até no máximo 1500), para não cobrir
     o vídeo nem a legenda. Mesma animação.
   - **Crédito do vídeo:** no alto à esquerda da metade de cima, logo abaixo do logo (x 64, topo do texto em y 312), Anton 30,
     do quadro 0 até o fechamento.
   - **Fechamento:** mantido (cartão final de tela cheia com o CTA/pergunta, entrada com `fade`).
   - **Capa/thumbnail:** composta como a 1ª tela dividida (quadro do 1º corte em cima, imagem padrão embaixo, moldura,
     divisória) + o cartão de título centrado na divisa (painel a partir de y 700).
   - **Efeitos de whoosh:** só nas trocas da imagem de baixo e no fechamento (os cortes secos de cima ficam sem som; a cada
     ~4 s seria cansativo).
6. **Desempenho (VPS, 1 vCPU, app com 1280 MB):** mantém as 2 passadas. Antes da montagem, cada corte de cima é preparado
   **sozinho** (1 processo por vez, como hoje) em 1080×960 com `ultrafast`, e os cortes são juntados **sem recodificar**
   (concat com `-c copy`) num `topo.mp4`. Assim a passada 1 abre só 1 vídeo + as imagens de baixo (zoompan em 1080×960, metade
   dos pixels de hoje) + `vstack`. Sem desfoque no padrão "cobrindo" (mais barato que o `comandoClipeVideo` atual).
7. **Painel:** bloco "Formato da tela" (só aparece se o job tem vídeo), "Vídeo de cima" e enquadramento do vídeo; na
   `CapaEscolha`, no modo dividido, o rótulo vira "Imagem de baixo (padrão) e da capa", o alinhamento usa 9:8 e a prévia
   mostra a tela dividida; em cada cena, linha "Em cima: vídeo" (os quadros de `ss` de sempre) e "Embaixo" (escolher imagem
   ou padrão + alinhar 9:8), com miniatura dividida. Sem vídeo no job: painel igual ao de hoje.
8. **Testes:** `teste-local.ts --dividido` e teste puro `scripts/video/testes/dividido.teste.ts` (ver "Como verificar").
9. **Núcleo × do site:** tudo deste plano é **NÚCLEO** (marcado na tabela de arquivos). Nenhum campo novo em `app/marca.ts`:
   as cores vêm de `MARCA.cores` como já acontece.

## Geometria (1080×1920; zonas seguras do `quadros.tsx`: topo 0–220, base 1500–1920, lateral direita x 950–1080)

| Elemento | x | y (topo) | Tamanho | Observação |
|---|---|---|---|---|
| Metade de cima (vídeo) | 0 | 0 | 1080×960 | Conteúdo útil 220–960 (o app cobre 0–220) |
| Metade de baixo (imagem) | 0 | 960 | 1080×960 | Conteúdo útil 960–1500 (o app cobre 1500–1920 e a lateral direita) |
| Moldura topo | 0 | 0 | 1080×420 | Igual a hoje (logo e chip da seção em y 236–292) |
| Barra de progresso | — | 226 | 1080×8 | Igual a hoje |
| Crédito do vídeo | 64 | 312 | Anton 30 | Estilo `Cred` no modo meio |
| Divisória (PNG) | 0 | 880 | 1080×160 | Sombra 880–956, faixa verde 956–964, sombra 964–1040 |
| Legenda (centro do bloco) | 540 | 960 | Anton 112, até 2 linhas (~270 px: ~825–1095) | ASS alinhamento 5, margens 64/64 (ajuste de 2026-11-26) |
| Moldura base | 0 | 1100 | 1080×820 | Igual a hoje |
| Cartões de dados | 24 | 1100 (ajuste de 2026-11-26) | 932 × (altura do tipo + 80) | Caixa visível de 1100 até ≤ 1500 (requisitos/grátis: 400 + 40 de folga) |
| Capa do Reel | — | — | tela cheia 9:16 | NÃO dividida (ajuste de 2026-11-26): imagem da capa + moldura + `Abertura` padrão |

Constantes no código (arquivo novo `scripts/video/dividido.ts`, ver DV2):

```ts
export const DIVIDIDO = {
  topo: { y: 0, w: 1080, h: 960 },
  baixo: { y: 960, w: 1080, h: 960 },
  /** Imagem de baixo preparada maior que a saída (1,5×) para o zoom lento não "tremer". */
  prepBaixo: { w: 1620, h: 1440 },
  divisoria: { y: 880, h: 160 },
  cartaoY: 1060,
  creditoY: 312,
  /** Zoom da respiração da imagem de baixo (1 → 1 + zoomBaixo, alternando o sentido por troca). */
  zoomBaixo: 0.05,
};
export const ASPECTO_BAIXO = 9 / 8; // também em app/video/layout.ts para o painel (cliente)
```

## Direção visual

Clima de "reação a trailer" dos Shorts de games: em cima o jogo em movimento, cru e cheio de energia; embaixo a imagem da
matéria calma, como contexto; a faixa verde da marca costura as duas e carrega a legenda. Hierarquia: (1) o movimento do
vídeo de cima, (2) a legenda na divisa (gancho logo no quadro 0), (3) a imagem de baixo e os cartões, (4) logo, barra e
crédito. Evitar: cartão estático no começo, bordas pretas no vídeo, legenda sobre o rosto/ação do vídeo, duas coisas se
mexendo forte ao mesmo tempo.

Tokens (todos já existem em `MARCA.cores` / `app/app.css`): fundo `#060807` (sombras `rgba(6,8,7,·)`), destaque
`#c8ff2e` (faixa, palavra da vez, nomes), texto `#eef3ea` (legenda), alerta `#ffb020` (números). Fontes: Anton (legenda,
título, crédito), JetBrains Mono (chips). O site só tem tema escuro no painel; não há versão clara.

## Arquivos afetados

Todos são **NÚCLEO** (copiar igual para animeprofile/vibecoin/criasite), conforme `modulo-video.md`.

| Arquivo | Muda o quê | Tipo |
|---|---|---|
| `app/video/roteiro.ts` | `Roteiro.layout`, `Roteiro.topo`, `CenaRoteiro.baixo` | NÚCLEO |
| `app/video/layout.ts` (novo, puro) | `ASPECTO_BAIXO`, `ehVideoSrc` reexportado, `layoutDoRoteiro`, `ENQUADRAMENTOS_TOPO` | NÚCLEO |
| `app/video/roteiro.server.ts` | `validarRoteiro` aceita os campos novos | NÚCLEO |
| `app/video/fila.server.ts` | `adicionarVideo` liga o modo; `gerarRoteiroDoJob` preserva; `pacoteDoJob` passa focos novos | NÚCLEO (ponte de banco já existente; não é `db.ts`) |
| `scripts/video/dividido.ts` (novo, puro) | Geometria, planos de tempo, comando do corte de cima, filtro da passada 1 dividida | NÚCLEO |
| `scripts/video/ffmpeg.ts` | `PlanoMontagem.dividido`, `semAbertura`, `divisoria`; ramo na passada 1 | NÚCLEO |
| `scripts/video/ass.ts` | `gerarAss({ posicao: "meio" })` | NÚCLEO |
| `app/video/render/quadros.tsx` + `quadros.server.ts` | `Divisoria`; `Abertura({ topo })`; `gerarQuadros({ dividido })` | NÚCLEO |
| `app/video/gerador.server.ts` | Ramo dividido (vídeo, plano, imagens, legenda, cartões, trilha, capa) | NÚCLEO |
| `app/routes/admin/videos-capa.ts` | Prévia dividida | NÚCLEO |
| `app/routes/admin/videos.tsx` | Formato da tela, vídeo de cima, imagem/alinhamento de baixo por cena, action | NÚCLEO |
| `app/components/video/FormatoTela.tsx` (novo) | Seletor de formato com diagrama | NÚCLEO |
| `scripts/video/teste-local.ts` | `--dividido` | NÚCLEO |
| `scripts/video/testes/dividido.teste.ts` (novo) | Teste puro | NÚCLEO |
| `docs/modulo-video.md`, `docs/README.md`, `docs/decisoes.md` | Documentação | — |

Sem mudança: `app/marca.ts`, `app/video/db.ts`, `app/social/*`, migrations.

---

## Passos

### DV1 (P) Tipos, validação e quando o modo liga

**Arquivos:** `app/video/roteiro.ts`, `app/video/layout.ts` (novo), `app/video/roteiro.server.ts`, `app/video/fila.server.ts`.

1. `roteiro.ts`:
   ```ts
   export interface CenaRoteiro { …; /** Tela dividida: imagem da metade de baixo nesta cena (vazio = a padrão). */ baixo?: number | null }
   export interface Roteiro { …; /** Formato: "dividido" = vídeo em cima, imagem embaixo. Sem o campo = tela cheia. */ layout?: "dividido" | "cheio"; /** Índice (em images) do vídeo de cima. */ topo?: number | null }
   ```
2. `app/video/layout.ts` (puro, sem `.server`, importável no painel; 1ª linha `// NÚCLEO (copiar igual…)`):
   - `export const ASPECTO_BAIXO = 9 / 8;`
   - `export const ENQUADRAMENTOS_TOPO = [{ id: "centre", rotulo: "Centro" }, { id: "west", rotulo: "Esquerda" }, { id: "east", rotulo: "Direita" }, { id: "inteira", rotulo: "Inteiro (fundo desfocado)" }] as const;`
   - `export function layoutDoRoteiro(r: Roteiro | null | undefined, imagens: { src: string }[]): { modo: "dividido" | "cheio"; topo: number }`:
     `modo = "dividido"` só se `r?.layout === "dividido"` **e** existir vídeo (`/\.(mp4|webm|mov)$/i`) em `imagens`;
     `topo` = `r.topo` se for índice de vídeo, senão o 1º vídeo da lista; senão `{ modo: "cheio", topo: -1 }`.
3. `validarRoteiro` (`roteiro.server.ts`), depois de montar `cena`: `if (typeof x.baixo === "number" && Number.isInteger(x.baixo) && x.baixo >= 0 && x.baixo < nImagens) cena.baixo = x.baixo;`.
   Depois de montar `roteiro`: `if (o.layout === "dividido" || o.layout === "cheio") roteiro.layout = o.layout;` e
   `if (typeof o.topo === "number" && Number.isInteger(o.topo) && o.topo >= 0 && o.topo < nImagens) roteiro.topo = o.topo;`.
   Os campos valem para roteiro antigo e v2.
4. `adicionarVideo` (`fila.server.ts`): no mesmo `UPDATE` que grava `images`, se `job.script` existe e `job.script.layout`
   é `undefined`, gravar também `script = { ...job.script, layout: "dividido", topo: <índice do vídeo novo> }`
   (= `job.images.length`). Se o dono já escolheu "cheio", não mexe. Mensagem `MSG.video` no painel passa a ser:
   "Vídeo acrescentado (e o roteiro salvo). O vídeo vertical passou para tela dividida: o vídeo em cima, a imagem da matéria
   embaixo. Dá para voltar à tela cheia em Formato da tela." (só quando ligou; senão a mensagem atual — usar `ok=video_dividido`).
5. `gerarRoteiroDoJob`: antes do `UPDATE … SET script`, ler o `script` anterior e copiar `layout` e `topo` para o roteiro
   novo (as cenas mudam, então `baixo` não é copiado).

**Pronto quando:** `npm run typecheck` passa; teste rápido em `scripts/video/testes/roteiro.teste.ts` (acrescentar casos):
roteiro com `layout`, `topo` e `baixo` sai de `validarRoteiro` com os 3 campos; `baixo: 99` é descartado; roteiro sem os
campos sai igual a antes.

### DV2 (M) Funções puras do modo dividido

**Arquivo novo:** `scripts/video/dividido.ts` (puro, sem `node:*`; 1ª linha NÚCLEO). Contém `DIVIDIDO` e `ASPECTO_BAIXO`
(acima) e:

1. `quadrosDosCortes(cortes: { ini: number; dur: number }[], fim: number): number[]` → quantos quadros cada corte tem, a
   partir das bordas arredondadas: `b_k = round(ini_k*30)`, última borda `round(fim*30)`; `q_k = b_{k+1} − b_k` (mínimo 1).
   A soma é exatamente `round(fim*30)` (sem deriva). `fim` = `inicioFechamento + TRANSICAO/2` (o topo precisa durar até o
   meio da transição para o fechamento).
2. `gruposBaixo(cenas: { ini: number; fim: number; baixo: number }[]): { img: number; ini: number; dur: number }[]` →
   junta cenas seguidas com a mesma imagem; o 1º grupo começa em 0.
3. `comandoCorteTopo(o: { arquivo: string; ss: number; quadros: number; enquadramento: "centre" | "west" | "east" | "inteira"; saida: string; leve: boolean }): string[]`:
   - entrada: `-ss <ss> -i <arquivo> -an`;
   - filtro "cobrindo": `fps=30,scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960:<X>:(ih-oh)/2,eq=contrast=1.07:saturation=1.22,setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=5`
     com `X` = `(iw-ow)/2` (centre), `0` (west), `iw-ow` (east);
   - filtro "inteira": o mesmo truque barato do `comandoClipeVideo`, em 1080×960:
     `fps=30,split=2[a][b];[a]scale=108:96:force_original_aspect_ratio=increase,crop=108:96,boxblur=3:1,scale=1080:960,eq=brightness=-0.12[f];[b]scale=1080:960:force_original_aspect_ratio=decrease[g];[f][g]overlay=(W-w)/2:(H-h)/2,eq=contrast=1.07:saturation=1.22,setsar=1,format=yuv420p,tpad=stop_mode=clone:stop_duration=5`;
   - saída: `-frames:v <quadros>`, `-c:v libx264 -preset ultrafast -crf 17 -pix_fmt yuv420p -r 30 -g 30`, mais
     `-threads 1 -filter_threads 1 -x264-params threads=1:lookahead-threads=1:sliced-threads=0` quando `leve`.
     **Todos os cortes com exatamente os mesmos parâmetros** (é o que permite juntar sem recodificar).
4. `comandoJuntarTopo(lista: string, saida: string): string[]` → `-f concat -safe 0 -i <lista> -c copy <saida>`.
5. `filtroPassada1Dividida(o: { topo: string; fimCenas: number; baixo: { img: string; ini: number; dur: number }[]; fechamento: { arquivo: string; ini: number; dur: number } }): string`
   (as linhas do `filter_complex`, juntadas com `;\n`):
   ```
   movie=topo.mp4,setpts=PTS-STARTPTS,fps=30,format=yuv420p,setsar=1,trim=end_frame=<round(fimCenas*30)>,settb=AVTB[top]
   movie=baixo3.jpg,zoompan=z='<z>':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=<Q>:s=1080x960:fps=30,setsar=1,format=yuv420p,settb=AVTB[b0]
   …(um por grupo; Q = round((dur + T)*30) para os que têm transição depois, e round((fimCenas − ini)*30) para o último)
   [b0][b1]xfade=transition=fade:duration=0.350:offset=<ini_1 − T/2>[bx1] …  → [bot]   (1 grupo só: [b0]null[bot])
   [top][bot]vstack=inputs=2,settb=AVTB[cenas]
   movie=fechamento.png,scale=1080:1920,setsar=1,format=yuv420p,loop=loop=<qFech−1>:size=1,setpts=N/30/TB,fps=30,settb=AVTB[cf]
   [cenas][cf]xfade=transition=fade:duration=0.350:offset=<fechamento.ini − T/2>[base]
   ```
   Zoom `z` alternado por grupo `k`: par `1+0.05*on/Q`, ímpar `1.05-0.05*on/Q` (respiração; mesmo espírito do modo `fixo`).
   `qFech` igual ao de `montar()` hoje.

**Pronto quando:** `scripts/video/testes/dividido.teste.ts` (com `node:assert`, termina com "ok") cobre: soma de
`quadrosDosCortes` = `round(fim*30)` para 25 cortes com tempos quebrados; nenhum `q_k` < 1; `gruposBaixo` de
`[3,3,5,5,3]` → 3 grupos com inícios crescentes e 1º em 0; `filtroPassada1Dividida` com 1 grupo contém `null[bot]` e não
contém `xfade=transition=fade:duration=0.350:offset` antes de `vstack`; com 3 grupos contém 2 `xfade` antes do `vstack`;
`comandoCorteTopo` em "west" contém `crop=1080:960:0:`.

### DV3 (P) Legenda no meio

**Arquivo:** `scripts/video/ass.ts`.

1. `gerarAss` ganha `opts.posicao?: "baixo" | "meio"` (padrão `"baixo"`, nada muda).
2. Com `"meio"`:
   - `Style: Pal`: tamanho **84**, contorno **7**, alinhamento **5**, `MarginL 64`, `MarginR 164`, `MarginV 0` (no ASS o
     alinhamento 5 centra o bloco em `PlayResY/2` = 960).
   - Nas tags de palavra, trocar `\bord6` por `\bord7` e `\bord8` por `\bord9` (o contorno é o que separa o texto da faixa e
     das imagens).
   - `Style: Cred`: tamanho **30**, alinhamento **7** (alto à esquerda), `MarginL 64`, `MarginV 312`.
3. Nada muda em `paginas` (até 4 palavras / 30 caracteres → no máximo 2 linhas).

**Pronto quando:** `scripts/video/testes/ass.teste.ts` ganha 2 casos (ordem do `Format`: `…, BorderStyle, Outline,
Shadow, Alignment, MarginL, MarginR, MarginV, Encoding`): com `posicao: "meio"` a linha `Style: Pal` termina em
`,1,7,0,5,64,164,0,1` e a `Style: Cred` em `,1,3,0,7,64,48,312,1`; sem `posicao`, o arquivo sai idêntico ao de hoje.

### DV4 (P) Quadros: divisória e título da capa

**Arquivos:** `app/video/render/quadros.tsx`, `app/video/render/quadros.server.ts`.

1. `Divisoria()` → PNG **1080×160** transparente:
   - `div` absoluto 0–76: `linear-gradient(to bottom, rgba(6,8,7,0), rgba(6,8,7,0.6))`;
   - `div` absoluto 76–84 (8 px): `backgroundColor: COR.destaque`;
   - `div` absoluto 84–160: `linear-gradient(to bottom, rgba(6,8,7,0.6), rgba(6,8,7,0))`.
   (Sobreposto em y 880, a faixa cai em 956–964.)
2. `Abertura({ titulo, secao, topo = 980 })`: o painel usa `top: topo` e o gradiente `top: topo - 40` (hoje 980 e 940;
   padrão mantém o vídeo de hoje idêntico).
3. `gerarQuadros(p)` ganha `dividido?: boolean`; quando `true`, devolve também `divisoria` (render 1080×160) e
   `aberturaCapa` (`Abertura` com `topo: 700`, 1080×1920).

**Pronto quando:** `typecheck` passa e os PNGs abrem (salvar no teste local, DV8).

### DV5 (M) Montagem: ramo dividido nas 2 passadas

**Arquivo:** `scripts/video/ffmpeg.ts`.

1. `PlanoMontagem` ganha:
   ```ts
   /** Tela dividida: o topo já vem pronto (topo.mp4, 1080×960) e as imagens de baixo (1620×1440) entram com zoom lento. */
   dividido?: { topo: string; fimCenas: number; baixo: { img: string; ini: number; dur: number }[] };
   /** Sem o cartão de abertura (o vídeo começa já com as cenas). */
   semAbertura?: boolean;
   /** PNG 1080×160 sobreposto em y 880 até o fechamento. */
   divisoria?: string;
   ```
2. Passada 1 (`etapa !== 2`): se `plano.dividido`, as `partes` vêm de `filtroPassada1Dividida(...)` (DV2) no lugar do laço
   de `clips` + `xfade`; o resto (saída `base.mp4`, `ultrafast`, crf 14) igual.
3. Passada 2: se `semAbertura`, não criar `[abert]` nem o `overlay` dele (a camada segue direto para a barra). Se
   `divisoria`, logo depois de `[v1]` (moldura base) e **antes** dos cartões:
   `movie=<divisoria>,format=yuva420p[div]` e `[v1][div]overlay=0:880:enable='lt(t,<fechamento.ini>)':eof_action=repeat[v1d]`
   (a camada dos cartões parte de `v1d`). Ordem final das camadas: cenas → pulso → moldura topo → moldura base →
   divisória → cartões → barra → legenda.
4. Modo de uma passada (`etapa` 0, sem `leve`): mesmo ramo (o laço de clipes é trocado pelo filtro dividido).

**Pronto quando:** `typecheck` passa; o vídeo de tela cheia do teste local sai idêntico ao de antes (comparar quadros de 1 s
e 5 s com `--perfil curto` antes e depois).

### DV6 (G) Gerador: ramo dividido

**Arquivo:** `app/video/gerador.server.ts`. A voz, `analisarVoz`, trilha (estilo), efeitos e a 2ª passada continuam os mesmos.

1. `PacoteVideo.imagens[]` ganha `focoBaixo?: string` (chave `b:<i>`) e `focoTopo?: string` (chave `t:<i>`).
2. Logo depois de `analisarVoz`: `let lay = layoutDoRoteiro(p.roteiro, p.imagens)`. Se `lay.modo === "dividido"`:
   - copiar o vídeo `p.imagens[lay.topo]` para `video_topo.<ext>` (mesmo código de hoje: `copyFile` de `/media`, senão
     `baixar`) e rodar `comandoCortes` → `duracaoVideo`, `cortes`. Se falhar ou `duracaoVideo < 4`:
     `console.warn("[video] tela dividida sem vídeo legível: gerando em tela cheia")`, `lay = { modo: "cheio", topo: -1 }` e
     seguir o caminho de hoje inteiro.
3. **Plano de cima** (só dividido): para cada `c` de `cenasSeg` (o 1º já com `ini = 0`):
   `partes = max(1, ceil(dur / TRECHO_MAX_S))`, cortes `{ cena, ini: c.ini + dur/partes*k, dur: dur/partes, ssManual }`
   com `ssManual = cenas[c.cena].ss + dur/partes*k` quando a cena tem `ss`. Pontos: `escolherTrechos(duracaoVideo, cortes, durs)`
   **sem** `FRACAO_MAX_VIDEO` e sem `fundirEmImagem`; `ss` manual com a mesma trava de hoje
   (`min(ssManual, duracaoVideo − dur − 0.2)`); trecho ausente → `ss = 0`. Se `t.dur < dur`, usar mesmo assim (o corte pode
   atravessar uma mudança de cena do trailer; o `tpad` congela só se o arquivo acabar).
4. **Preparar o topo:** `fimCenas = seg.inicioFechamento + TRANSICAO/2`; `q = quadrosDosCortes(cortes, fimCenas)`; para cada
   corte, `rodar(ff, comandoCorteTopo({ arquivo: "video_topo.<ext>", ss, quadros: q[k], enquadramento: p.imagens[lay.topo].focoTopo ?? "centre", saida: "topo_k.mp4", leve }))`
   **um por vez**, com `o.progresso?.(32 + 6*k/n, "Vídeo de cima: corte k de n")`; gravar `topo_lista.txt`
   (`file 'topo_0.mp4'` …) e `rodar(ff, comandoJuntarTopo("topo_lista.txt", "topo.mp4"))`. Conferir com `-frames` que nada
   se perde; se o concat falhar, cair para um 2º comando com `-c:v libx264 -preset ultrafast -crf 17` (recodifica, mais lento)
   e registrar no log.
5. **Plano de baixo:** `padrao = p.capa` se for imagem utilizável, senão `usaveis[0]`. Por cena:
   `baixo = cenas[c.cena].baixo` se for utilizável (não vídeo, não `arte:` sem arquivo, não `yt:`), senão `padrao`.
   `grupos = gruposBaixo(...)`. Para cada imagem usada, preparar uma vez `baixo<i>.jpg`:
   `enquadrarVertical(buf, 1620, 1440, img.focoBaixo || "auto")` (a função já aceita qualquer `w,h`; "inteira" faz o fundo
   desfocado na proporção nova). Em `leve` mantém `sharp.concurrency(1)`.
6. **Legenda:** `gerarAss(palavras.slice(0, nG + nCenas), { …mesmas opções…, posicao: "meio", creditos: [{ ini: 0, fim: seg.inicioFechamento, texto: crédito do vídeo }] })`
   — com o **gancho incluído** (no modo cheio continua `slice(nG, nG + nCenas)`). Crédito = `p.imagens[lay.topo].alt` ou
   "Vídeo: material de divulgação" (igual a hoje).
7. **Quadros:** `gerarQuadros({ …, dividido: true })`; gravar `moldura_topo.png`, `moldura_base.png` (iguais), `divisoria.png`
   e `fechamento.png`. **Não** gravar `abertura.png`.
8. **Cartões:** mesmo `planoCartoes`, depois sobrescrever `y = DIVIDIDO.cartaoY` (1060) em todos.
9. **Trilha:** `instantesTransicao` recebe só os inícios dos grupos de baixo (do 2º em diante) + `fechIni` (montar um
   `Clip[]` mínimo com esses `ini`, ou passar a lista direto se `comandoTrilha` aceitar instantes; não mudar `musica.ts`).
10. **Montagem:** `planoMontagem` com `clips: []` (não usados no ramo), `dividido: { topo: "topo.mp4", fimCenas, baixo: grupos com img "baixo<i>.jpg" }`,
    `semAbertura: true`, `divisoria: "divisoria.png"`, `fimAbertura` = o mesmo de hoje (só serve para os cartões não
    entrarem durante o gancho). As 2 passadas iguais.
11. **Capa:** extrair um quadro de `topo.mp4` em 0,4 s (`-ss 0.4 -i topo.mp4 -frames:v 1 capa_topo.jpg`); `baixo` =
    `baixo<padrao>.jpg` redimensionada para 1080×960 (`fit: "cover"`); compor em tela 1080×1920 (`sharp({ create: { width: 1080, height: 1920, channels: 3, background: MARCA.cores.fundo } })`):
    topo em (0,0), baixo em (0,960), `q.moldura`, `q.divisoria` em top 880, `q.aberturaCapa`. JPEG 88.

**Pronto quando:** o teste local do DV8 gera o MP4 dividido; o de tela cheia continua igual.

### DV7 (P) Pacote do job

**Arquivo:** `app/video/fila.server.ts` (`pacoteDoJob`): em `imagens`, acrescentar
`focoBaixo: job.focus[\`b:${i}\`] ?? undefined, focoTopo: job.focus[\`t:${i}\`] ?? undefined`.

**Pronto quando:** `typecheck` passa.

### DV8 (M) Teste local `--dividido`

**Arquivo:** `scripts/video/teste-local.ts`.

1. `--dividido` liga `--video` sozinho e monta o roteiro com `layout: "dividido"`, `topo: iVideo`, as cenas com `imagem`
   normal (não o vídeo) e `baixo`: cenas 1–2 vazias (padrão), cena 3 = imagem 2, cena 4 = imagem 2 (mesmo grupo), demais
   vazias. Focos: `"b:2": "30,50"`; `"t:<iVideo>": "centre"`. Aceitar `--topo west|east|inteira` para trocar o enquadramento.
2. Extrair, além dos quadros de hoje, `quadro_0.0s.png` e `quadro_0.5s.png`, e imprimir
   `topo mudou entre 0 s e 0,5 s: sim/não` (com `sharp`, comparar a média absoluta da diferença dos pixels da faixa
   y 300–900; "sim" se > 2). Imprimir também o tempo de "Vídeo de cima" separado da montagem.
3. Gravar a capa em `capa.jpg` na pasta de saída.

**Pronto quando:** `VIDEO_TESTE=1 npx tsx --tsconfig tsconfig.json scripts/video/teste-local.ts --perfil curto --dividido --manter`
(PowerShell: `$env:VIDEO_TESTE=1; npx tsx --tsconfig tsconfig.json scripts/video/teste-local.ts --perfil curto --dividido --manter`)
gera o MP4, imprime "topo mudou…: sim" e os quadros passam no checklist de "Como verificar". Rodar também `--perfil longo --dividido`
e anotar os tempos na tabela abaixo.

| Medição (local) | curto | longo |
|---|---|---|
| Tela cheia com `--video` (referência) | 35,4 s de vídeo; ~291 s (rodou junto com o build, PC ocupado) | |
| Dividido: vídeo de cima (preparo) | 31 s | 64 s (`--topo inteira`) |
| Dividido: montagem (2 passadas) | 94 s | 317 s |
| Dividido: total | 35,4 s de vídeo em 146 s | 86,5 s de vídeo em 406 s |
| Na VPS (1º vídeo real) | | |

Medido no PC (Windows, 1 thread por etapa, voz falsa) em 2026-11-26. "Topo mudou entre 0 s e 0,5 s: sim" nos dois.

### DV9 (M) Prévia da 1ª tela dividida

**Arquivo:** `app/routes/admin/videos-capa.ts`.

1. Aceitar na query `layout=dividido`, `focob=<foco>` (foco de baixo), `topo=<índice do vídeo>`, `ss=<segundos>`.
2. Com `layout=dividido`: metade de cima = o quadro de `images[topo].trechos` mais próximo de `ss` (ou o 1º; é um JPEG de
   270 px, suficiente para a prévia de 180 px), redimensionado com `fit: "cover"` para 1080×960 (ou com fundo desfocado se
   `focot=inteira`); sem quadros ainda, um retângulo `#111611` com o texto "VÍDEO" (SVG simples). Metade de baixo =
   `enquadrarVertical(imagem, 1080, 960, focob || job.focus["b:<i>"] || "auto")`. Compor como a capa do DV6 passo 11
   (moldura, divisória, `aberturaCapa`), reduzir para 540×960, mesmos cabeçalhos sem cache.
3. Sem `layout`: comportamento de hoje.

**Pronto quando:** abrir no navegador `/admin/videos/capa/<id>/<img>/1?layout=dividido` (logado) mostra a tela dividida.

### DV10 (G) Painel `/admin/videos`

**Arquivos:** `app/routes/admin/videos.tsx`, `app/components/video/FormatoTela.tsx` (novo, puro). Reusar `Field`, `Button`,
`inputCls`, `EscolherImagem` (`semVideo`, `permitirAutomatica`), `AlinharImagem` (`aspecto`), as listas `FOCOS`/`ROTULO_FOCO`
e `ehFocoManual` já usadas no arquivo. Nada pode importar `*.server.ts` (usar `app/video/layout.ts`).

**Hierarquia do card do job em rascunho (com vídeo):** gancho → título → **Formato da tela** → imagem de baixo/capa →
cenas → envio de imagem/vídeo → fechamento → botões. Sem vídeo no job: o bloco "Formato da tela" não aparece e tudo fica
como hoje (com um `<input type="hidden" name="layout" value={r.layout ?? ""}>` para não perder o campo).

1. **`FormatoTela`** (`{ valor: "dividido" | "cheio"; onChange; videos: { indice: number; alt: string }[]; topo: number; onTopo; enquadramento: string; onEnquadramento }`):
   - `<Field label="Formato da tela">` com `div role="radiogroup"` `grid gap-2 sm:grid-cols-2`.
   - Cada opção é um `button type="button" role="radio" aria-checked` com `flex min-h-[88px] items-center gap-3 border-2 p-3 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc`;
     escolhida `border-acc bg-acc/10`; não escolhida `border-line hover:border-line-soft`. Setas ← → trocam entre as duas
     (padrão de radiogroup).
   - **Diagrama** à esquerda (SVG 36×64, `shrink-0`): dividido = retângulo de cima `fill #1c241a` com triângulo ▶ `#c8ff2e`
     no centro, linha de 3 px `#c8ff2e` no meio, retângulo de baixo `fill #243022` com 3 traços `#8a9787` (texto); cheio =
     retângulo único `#1c241a` com ▶ e um bloco escuro embaixo (título). Borda do SVG 1 px `#243022`.
   - Texto: título `font-mono text-xs font-bold uppercase text-paper` ("Tela dividida" / "Tela cheia"); descrição
     `text-[11px] text-muted`: "Vídeo em cima, imagem da matéria embaixo, legenda no meio. Começa já com o vídeo rodando." /
     "Uma imagem ou trecho por vez em tela inteira, com o cartão de título no começo.". Escolhida: chip à direita
     `ml-auto font-mono text-[10px] font-bold text-acc` "✓ ESCOLHIDO".
   - Abaixo, só no dividido, numa linha `flex flex-wrap gap-2`: select "Vídeo de cima" (só se houver 2+ vídeos; opções =
     `alt` de cada vídeo) e select "Enquadramento do vídeo" (`ENQUADRAMENTOS_TOPO`), ambos `min-h-9 border border-line bg-ink px-2 text-xs text-paper`.
     Texto de ajuda `text-[11px] text-muted`: "O vídeo ocupa a metade de cima o tempo todo, em cortes de até 4,5 s, sem o
     áudio original. O crédito fica na tela."
   - Campos do formulário: `layout`, `topo`, `focot` (hidden).
2. **`CapaEscolha`** recebe `dividido: boolean`:
   - rótulo do `Field`: "Imagem de baixo (padrão) e da capa" (dividido) ou o de hoje;
   - no dividido o select de enquadramento e o "Mover e alinhar" editam o **foco de baixo** (estado próprio, inicial
     `j.focus["b:<indice>"] ?? "auto"`; `AlinharImagem aspecto={ASPECTO_BAIXO}` com título "PARTE DE BAIXO · enquadramento (1080×960)");
     hidden `capa_focob`; o `capa_foco` (9:16) é enviado com o valor salvo, sem mudar;
   - a prévia chama a rota com `&layout=dividido&focob=…&topo=…&ss=<ss da cena 1 ou vazio>`; texto de ajuda:
     "Esta imagem fica embaixo em todas as cenas que não têm imagem própria. A prévia mostra a 1ª tela do vídeo."
   - estados da prévia: iguais aos de hoje (carregando com `opacity-50` + "Atualizando…", erro escrito na caixa).
3. **`CenaLinha`** recebe `dividido`, `topo` (índice do vídeo), `baixoPadrao`:
   - **Miniatura** (coluna de 64 px): dividida, 64×114 = metade de cima 64×57 com o quadro do trecho (`trechoAtual.thumb`,
     `object-cover`), faixa de 2 px `bg-acc`, metade de baixo 64×55 com a imagem de baixo (`object-cover`, `objectPosition`
     do foco manual se houver). Clicar abre o alinhamento de baixo.
   - Linha **"Em cima: vídeo"**: o bloco de quadros de `ss` que já existe (botões AUTO + quadros), sempre visível no
     dividido, usando os `trechos` do vídeo `topo` (não da `img` da cena). `ss_${i}` é enviado sempre no dividido.
   - Linha **"Embaixo"**: `EscolherImagem` com `semVideo`, `permitirAutomatica="a imagem padrão (capa)"`, valor = `baixo`
     (vazio = padrão), rótulo `Imagem de baixo da cena ${i + 1}`; select de enquadramento (Imagem inteira / Recorte… /
     Manual) e botão "Alinhar embaixo" → `AlinharImagem aspecto={ASPECTO_BAIXO}` título `CENA ${i + 1} · PARTE DE BAIXO (1080×960)`.
     Alinhamento é **por imagem** (vale em todas as cenas com essa imagem, como hoje): texto `text-[11px] text-muted`
     "O alinhamento vale para esta imagem em todo o vídeo."
   - O `EscolherImagem` "Imagem da cena" e o select de foco 9:16 **ficam escondidos** no dividido, mas `img_${i}` e
     `foco_${i}` continuam no formulário com os valores atuais (voltar para tela cheia restaura tudo).
   - Hidden novos: `baixo_${i}` (índice ou vazio), `focob_${i}` (foco de baixo da imagem efetiva da cena).
   - O seletor de cartão continua igual.
4. **Action** (bloco `salvar|ouvir|aprovar|img_add|vid_add`):
   - por cena: `baixo` = `Number(f.get("baixo_i"))` se não vazio; `focob_i` → `focus["b:<baixo efetivo>"]` (`"inteira"` ou
     `focoValido`), onde "baixo efetivo" = `baixo` ou o índice padrão (capa) — mandar o padrão num hidden `baixo_padrao`;
   - `capa_focob` → `focus["b:<padrão>"]`; `focot` → `focus["t:<topo>"]` (só aceitar `centre|west|east|inteira`);
   - roteiro: `layout: f.get("layout") === "dividido" ? "dividido" : f.get("layout") === "cheio" ? "cheio" : undefined`,
     `topo: Number(f.get("topo"))` se inteiro;
   - **cuidado:** o `focus` é remontado do zero a cada salvar; qualquer chave `b:`/`t:` que não vier do formulário some.
5. **Celular (375 px):** as duas opções do formato empilham (`sm:grid-cols-2`); os quadros de `ss` rolam na horizontal (já
   é assim); "Embaixo" quebra linha (`flex-wrap`). **Tela larga (1440 px):** a coluna de 270 px com a prévia continua à
   esquerda.

**Pronto quando:** num job com vídeo, em 1440 e 375 px: o formato aparece já em "Tela dividida" depois de enviar o vídeo;
trocar para "Tela cheia" e salvar mantém a troca depois de recarregar; escolher imagem de baixo numa cena + alinhar + salvar
mantém os dois; a prévia mostra a tela dividida e muda ao alinhar; num job sem vídeo o painel é igual ao de hoje.

### DV11 (P) Documentação, build e 1º vídeo real

1. `docs/modulo-video.md`: em "O que o módulo faz", item novo sobre a tela dividida; no checklist de cópia, citar
   `scripts/video/dividido.ts`, `app/video/layout.ts` e `FormatoTela.tsx` como núcleo; no teste local, a variação `--dividido`.
2. `docs/README.md`: status deste plano; `docs/decisoes.md`: marcar as perguntas respondidas.
3. `npm run typecheck`, `npm run build`, commit + push. Na VPS: 1 vídeo real em tela dividida com o dono olhando; anotar o
   tempo na tabela do DV8.

---

## Riscos e cuidados

- `validarRoteiro` e o formulário **descartam** campos desconhecidos: `layout`, `topo`, `baixo`, `b:`, `t:` precisam
  estar nos dois (DV1 e DV10), senão somem no primeiro "Salvar roteiro".
- "Refazer roteiro" troca o `script` inteiro: preservar `layout`/`topo` (DV1 passo 5).
- React Router: das peças novas, o painel só importa `app/video/layout.ts` (puro). Nada de `*.server.ts`; manter
  `scripts/video/dividido.ts` puro também (sem `node:*`). Loaders/actions usam `routePath`
  (cliques internos pedem `.data`). `npm run build` antes do push.
- Concat com `-c copy` só funciona se todos os `topo_k.mp4` tiverem os mesmos parâmetros (resolução, fps, pix_fmt,
  perfil x264); por isso um único `comandoCorteTopo`. Plano B recodificando está no DV6.
- `vstack` exige mesma largura, formato e base de tempo nas duas entradas: `fps=30,format=yuv420p,setsar=1,settb=AVTB`
  nas duas antes.
- `zoompan` lento "treme" em imagem do tamanho da saída: por isso a imagem de baixo é preparada em 1620×1440.
- Sem o teto de 40%, mais segundos de vídeo de terceiros: o preparo do topo fica mais longo (vídeo de 60 s ≈ 60 s de
  material recodificado em `ultrafast`). Medir no DV8 e no 1º vídeo da VPS.
- Vídeo vertical (9:16) enviado: o "cobrindo" mostra só a faixa do meio; recomendar "Inteiro" nesse caso (texto de ajuda
  do select).
- Créditos: o vídeo de terceiros fica na tela o tempo todo; o crédito também (DV6 passo 6). Ver pergunta 1.
- A divisa (y 960) está dentro da zona segura; a metade de baixo perde 1500–1920 para a interface do app: o que importa
  da imagem de baixo deve ficar acima de 1500 (por isso o alinhamento manual).
- Sem migration. Nada novo a colar no chat.

## Como verificar

1. Testes puros: `npx tsx --tsconfig tsconfig.json scripts/video/testes/dividido.teste.ts`, `…/ass.teste.ts`,
   `…/roteiro.teste.ts` (todos terminam com "ok").
2. Tela cheia sem regressão: `--perfil curto` e `--perfil curto --video` antes e depois; quadros de 1 s e 5 s iguais a olho.
3. Dividido: `--perfil curto --dividido --manter` e `--perfil longo --dividido`. Conferir nos quadros:
   - `quadro_0.0s.png`: vídeo em cima (sem bordas pretas), capa embaixo, faixa verde em y 956–964, **gancho como legenda
     centrada na faixa**, logo/seção no alto, **sem** cartão de título; "topo mudou entre 0 s e 0,5 s: sim";
   - `quadro_1s` / `quadro_5s`: legenda legível sobre a faixa (contorno escuro), crédito no alto à esquerda (y ≈ 312),
     barra de progresso em y 226;
   - quadro no meio da cena 3: imagem 2 embaixo, alinhada à esquerda (foco 30,50); quadro 0,2 s depois do início da cena 3:
     meio do `fade` entre as imagens de baixo;
   - quadro com cartão (perfil com fatos): cartão sobre a metade de baixo, abaixo da legenda, sem cobrir o vídeo;
   - último quadro: fechamento em tela cheia;
   - `capa.jpg`: tela dividida + título centrado na divisa;
   - `--topo west`, `--topo inteira`: enquadramento muda como esperado.
4. Duração do MP4 = `seg.total` (± 1 quadro) e a última palavra bate com a legenda.
5. Painel: checklist do DV10 em 1440 e 375 px. `npm run typecheck` e `npm run build`.
6. VPS: 1 vídeo real (o dono assiste no celular: primeiro segundo, legibilidade da legenda, crédito).

## Perguntas em aberto (do dono)

1. **Direitos do vídeo:** no modo dividido o vídeo enviado aparece o tempo todo (meia tela), não mais no máximo 40%.
   Recomendo aceitar só com trailer/material oficial de imprensa e crédito fixo na tela. Confirma? (Se não, o topo passa a
   alternar vídeo e imagens da matéria, e o plano muda no DV6.)
2. **Título no vídeo:** recomendo **nenhum** (só o gancho como legenda; o título fica na capa). Alternativa: uma faixa
   curta com o `titulo_curto` sobre a metade de baixo nos 2 primeiros segundos.
3. **Troca da imagem de baixo:** `fade` de 0,35 s (recomendado, calmo) ou corte seco junto com o corte de cima?
4. **Ritmo do vídeo de cima:** cortes de até 4,5 s (recomendado, padrão de hoje) ou trechos mais longos (até 6 s)?
5. **Mais de um vídeo enviado:** nesta versão o topo usa **um** vídeo (escolhido em "Vídeo de cima"). Quer, depois,
   alternar entre vários vídeos por cena?
6. **Proporção:** 50/50 como pedido (recomendado) ou 55/45 com mais espaço para o vídeo?
