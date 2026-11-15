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
| `mira` | Mira | Reflexo | Alvos que encolhem; centro vale mais; sequência sobe multiplicador; dourado vale 50; bomba (X) tira vida; 3 vidas. Só mouse/toque |
| `memoria` | Memória | Quebra-cabeça | Pares de ícones em pixel art (18, desenhados no código); fases de 6 a 36 cartas; vida só cai quando dava para acertar; +1 vida por fase |
| `campo-minado` | Campo Minado | Quebra-cabeça | Infinito: campo limpo → outro com mais minas (10 a 32, 9×12); 1º toque seguro; bandeira por botão direito, toque longo ou modo bandeira; "acorde" no número |
| `paciencia` | Paciência | Clássicos | Klondike vira 1; toque manda a carta ao melhor lugar, ou arrasta; final automático; mão completa +500 e nova mão; ENCERRAR com dois toques fecha a pontuação |
| `sudoku` | Sudoku | Quebra-cabeça | Infinito: quadro gerado na hora com solução única; quadros 1–2 fáceis (40 pistas), 3–4 médios (33), do 5 em diante difíceis (27); número errado não entra e custa 1 de 3 vidas; resolver devolve 1 vida e dá bônus de tempo; anotações (tecla N) |

Todos são criações do Respawnou (estilos clássicos, sem nome, personagem ou visual de jogo existente).

## Como funciona

- `app/lib/arcade.ts`: catálogo (nome, categoria, textos de "como jogar", controles, proporção do
  canvas) e leitura/gravação do recorde.
- `app/arcade/engine.ts`: motor mínimo (canvas nítido, laço com dt limitado, partículas, grade do tema).
- **Formato:** cada jogo tem dois tamanhos lógicos em `size` (catálogo): `landscape` (PC, tablet ou
  celular deitado: largura ≥ 768 px e maior que a altura) e `portrait` (celular em pé). A moldura
  escolhe pela tela e passa `{ W, H, landscape }` ao jogo, que monta o layout a partir disso
  (ex.: Campo Minado 16×9 / 9×12, Trinca 10×7 / 7×8, Paciência com cartas 1,7× no PC). Girar ou
  redimensionar fora da partida troca na hora; no meio, a troca vale no próximo "jogar de novo".
- `app/arcade/<slug>.ts`: cada jogo exporta `create(canvas, hooks, size)` com `start/pause/resume/destroy`
  e avisa a pontuação (`onScore`) e o fim (`onOver`). Só desenha; não tem tela de menu.
- `app/components/ArcadeShell.tsx`: moldura comum. Carrega o jogo só no navegador (import dinâmico,
  um arquivo por jogo), telas de início/pausa/fim, recorde, tela cheia, pausa ao trocar de aba
  (P/Esc também pausam) e rola a página até o jogo ao começar (no celular o título empurra o jogo).
- Tela de fim de jogo: botão "Compartilhar resultado" (menu nativo no celular, WhatsApp Web no PC).
- Home: módulo "Passe o tempo" com 3 jogos que trocam todo dia (`ArcadeCard`, o mesmo card da lista).
- Páginas: `/arcade` (lista com o recorde de cada um e filtro `?categoria=`, canonical sempre `/arcade`) e `/arcade/:slug` (jogo + "como jogar" +
  controles + JSON-LD `VideoGame`). Entram no menu, rodapé e sitemap sempre.

## Novo jogo (checklist)

1. `app/arcade/<slug>.ts` exportando `create` (ver os existentes; teclado só age com o jogo rodando).
2. Os dois tamanhos (`size.landscape` e `size.portrait`) e entrada em `ARCADE_GAMES` (`app/lib/arcade.ts`) e em `LOADERS` (`ArcadeShell.tsx`). O nome do
   arquivo pode diferir do slug (ex.: `cabo.ts` → `cabo-de-forca`).
3. Miniatura em `ArcadeThumb.tsx`.
4. Testar no celular (toque, cabe na tela, sem rolagem lateral) e no teclado.

## Anúncios (quando o AdSense entrar)

- As páginas `/arcade/<jogo>` **não carregam o script do AdSense** (`gamePage` em `app/root.tsx`):
  com anúncios automáticos o Google poderia colar um anúncio em cima do jogo, e clique acidental em
  jogo é motivo de punição. A lista `/arcade` e o resto do site carregam normal.
- Ao ser aprovado, no painel do AdSense (Anúncios → Por site → Editar → Exclusões de página) excluir
  também `respawnou.com.br/arcade/*`: navegando de uma página para a página do jogo sem recarregar,
  o script da página anterior continua carregado.

## Próximos jogos (ideias)

A lista original está completa (10 jogos) e o Sudoku entrou depois (11). Ideias para depois: caça-palavras de games,
pinball simples. Ranking com apelido (precisa de banco) fica para depois.
