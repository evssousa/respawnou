# Arcade (/arcade)

Jogos de passatempo próprios, infinitos, que rodam no navegador (PC e celular). Não dependem do
banco nem do robô: o catálogo é código. Sem conta e sem servidor; recorde e partidas ficam no
`localStorage` do navegador (`respawnou:arcade:<slug>`).

## Jogos

| Slug | Nome | Categoria | Ideia |
|---|---|---|---|
| `respawn` | Respawn | Ação | Corredor infinito: pula blocos e buracos, não pula quando vem drone baixo. Segurar = pulo mais alto |
| `torre` | Torre | Reflexo | Empilhar blocos que vão e voltam; sobra é cortada; 3 perfeitos devolvem largura |
| `quebra-pixel` | Quebra-Pixel | Clássicos | Raquete e bolinha; fases geradas na hora (desenho espelhado), blocos de 1 a 3 batidas, 3 vidas |
| `meteoros` | Chuva de Meteoros | Ação | Nave com tiro automático; meteoros grandes se partem; itens tiro triplo e escudo; 3 vidas |
| `cabo-de-forca` | Cabo de Força | Clássicos | Estilo cobrinha: cabo cresce com pilhas; pilha dourada a cada 5 (some em 6 s); deslizar ou tocar do lado |
| `trinca` | Trinca | Quebra-cabeça | Juntar 3+ iguais contra o relógio (cada peça devolve 0,5 s; o relógio acelera até 2,5×); cascatas multiplicam; dica após 6 s parado; embaralha sem jogada. Peças com cor e formato diferentes (daltonismo) |

Todos são criações do Respawnou (estilos clássicos, sem nome, personagem ou visual de jogo existente).

## Como funciona

- `app/lib/arcade.ts`: catálogo (nome, categoria, textos de "como jogar", controles, proporção do
  canvas) e leitura/gravação do recorde.
- `app/arcade/engine.ts`: motor mínimo (canvas nítido, laço com dt limitado, partículas, grade do tema).
- `app/arcade/<slug>.ts`: cada jogo exporta `create(canvas, hooks)` com `start/pause/resume/destroy`
  e avisa a pontuação (`onScore`) e o fim (`onOver`). Só desenha; não tem tela de menu.
- `app/components/ArcadeShell.tsx`: moldura comum. Carrega o jogo só no navegador (import dinâmico,
  um arquivo por jogo), telas de início/pausa/fim, recorde, tela cheia, pausa ao trocar de aba
  (P/Esc também pausam) e rola a página até o jogo ao começar (no celular o título empurra o jogo).
- Páginas: `/arcade` (lista com o recorde de cada um) e `/arcade/:slug` (jogo + "como jogar" +
  controles + JSON-LD `VideoGame`). Entram no menu, rodapé e sitemap sempre.

## Novo jogo (checklist)

1. `app/arcade/<slug>.ts` exportando `create` (ver os existentes; teclado só age com o jogo rodando).
2. Entrada em `ARCADE_GAMES` (`app/lib/arcade.ts`) e em `LOADERS` (`ArcadeShell.tsx`). O nome do
   arquivo pode diferir do slug (ex.: `cabo.ts` → `cabo-de-forca`).
3. Miniatura em `ArcadeThumb.tsx`.
4. Testar no celular (toque, cabe na tela, sem rolagem lateral) e no teclado.

## Anúncios (quando o AdSense entrar)

Nunca colados na área do jogo nem nos botões (clique acidental é motivo de punição). Lugares
seguros: abaixo de "Como jogar"/"Controles" e na lista `/arcade`.

## Próximos jogos (ideias)

Mira (reflexo), Memória, Campo Minado e Paciência. Ranking com apelido (precisa de banco) fica para depois.
