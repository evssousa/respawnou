# Módulo de vídeos curtos (Reels / Shorts / TikTok)

Guia permanente do módulo e checklist para copiá-lo para outro site (animeprofile, vibecoin, criasite…). Plano e histórico das
decisões: `video-melhorias.md` e `instagram-stories-videos.md`.

## O que o módulo faz

1. Escolhe uma matéria publicada (sozinho, 1 por dia, ou pelo botão "Fazer vídeo desta matéria") e pede o roteiro ao Gemini
   grátis (3 ganchos, pergunta, destaques, cartões de dados por cena).
2. Mostra o roteiro em `/admin/videos` para o dono revisar: escolher o gancho, editar falas, trocar imagem/enquadramento,
   enviar imagens e vídeos próprios, escolher o cartão de cada cena, ajustar pronúncia.
3. Ao aprovar, o próprio servidor monta o vídeo 1080×1920: voz (ElevenLabs, com alinhamento por palavra), imagens com zoom ou
   deslize, transições, cartões de dados animados, legenda palavra por palavra com destaque, trilha e efeitos sintetizados.
4. O dono baixa o MP4, copia as legendas (Instagram, YouTube, TikTok) ou clica em "Publicar no Instagram (Reels)".
5. A cada 3 h o robô busca as métricas dos Reels (views, retenção, curtidas) e o painel mostra o desempenho por formato.
6. Séries fixas: Grátis da semana, Lançamentos da semana, Review em 60 s, Top 5.

Sem GitHub Actions, sem worker externo, sem música de terceiros (trilha e efeitos são sintetizados pelo ffmpeg), sem baixar
vídeo do YouTube (só envio manual de arquivo).

## Núcleo (copiar igual) × do site (adaptar)

Cada arquivo tem na 1ª linha `// NÚCLEO (copiar igual…)` ou `// DO SITE (adaptar…)`.

| Núcleo: copiar igual | Do site: adaptar |
|---|---|
| `scripts/video/` inteiro: `ass.ts`, `ffmpeg.ts`, `musica.ts`, `efeitos.ts`, `falar.ts`, `videoclip.ts`, `elevenlabs.ts`, `teste-local.ts`, `testes/` | `app/marca.ts` — **o único arquivo de marca** |
| `app/video/`: `roteiro.ts`, `roteiro.server.ts`, `cartoes.ts`, `config.ts`, `config.server.ts`, `fila.server.ts`, `gerador.server.ts`, `legendas.ts`, `metricas.ts`, `metricas.server.ts`, `pronuncia.ts`, `pronuncia.server.ts`, `fatos.server.ts`, `render/` | `app/video/db.ts` e `app/social/db.ts` — ponte com o banco do site |
| `app/social/` (`core/`, `render/`, `server/`, `tipos.ts`, `config.ts`) | `app/social/site.server.ts` — `lerEntrada` e `escolherModelo` leem as tabelas do site e devolvem `EntradaSocial` |
| `app/components/video/*`, `EscolherImagem.tsx`, `AlinharImagem.tsx`, `app/routes/admin/videos*.ts(x)` | `app/video/series.server.ts` — dados das séries (pode começar sem séries) |
| `app/routes/admin/post-edit.tsx` (só o botão "Fazer vídeo", se o site tiver editor de matérias) | `app/video/fonts/` e `app/social/fonts/` (fontes), `public/logo-512.png` |
| | Migrations (equivalentes a 012–017) e a chamada no robô do site |

Pontos de acoplamento que **não** são genéricos (ajustar ao copiar):
- `fila.server.ts`: `escolherDoDia()` consulta `posts` e `visit_pages` (visitas das últimas 24 h) e `listarJobs`/`obterJob`
  juntam `video_jobs` com `posts` (`title`, `section`, `image_url`). Se o site tiver outros nomes de tabela/coluna, mude ali.
- `fatos.server.ts` lê campos de `EntradaSocial`; se o site não tiver preço, nota ou requisitos, os cartões correspondentes
  simplesmente não existem (sem dado = sem cartão).
- `series.server.ts` lê `free_games` e `social_posts.payload`; no site novo devolva `null` até haver dados.

## `app/marca.ts`: campos

| Campo | Para que serve |
|---|---|
| `site`, `marca`, `handle`, `dominio`, `baseUrl`, `logo` | Nome, logo em texto, @ do Instagram, endereço do site e logo PNG quadrada |
| `descricao`, `tom` | Entram no prompt do roteiro ("do Respawnou, portal brasileiro de notícias de games"; "Tom de quem joga para quem joga") |
| `cores` | Fundo, painéis, linhas, texto, destaque (a cor de acento: barra, legenda, botões), alerta (âmbar: números), ruim, sobreDestaque |
| `fontes` | Famílias da arte (`titulo`, `corpo`, `mono`), arquivos WOFF/TTF do satori e a fonte da legenda (o libass precisa de TTF) |
| `titulo` | Caixa alta, largura média da letra e tamanhos tentados nos títulos |
| `secoes` | id da editoria → rótulo na arte, nome no painel e **perfil de duração** (`curto` 30–60 s ou `longo` 60–120 s) |
| `social` | Frases, perguntas de engajamento, hashtags, limites e prioridades da fila do Instagram, Stories |
| `video.fechamento`, `fechamentoPergunta`, `ctaCartao` | O que a voz fala no fim e o botão do cartão final |
| `video.hashtagTikTokExtra`, `avisoVoz`, `userAgent` | Detalhes das legendas e das requisições |
| `video.pronunciaBase` | Como a voz fala as siglas e nomes do assunto do site (o dono acrescenta no painel) |
| `video.series` | Rótulo, nome, estilo de trilha e pergunta padrão de cada série |
| `video.pastaBin`, `pastaTrabalho` | Pastas na casa do servidor |

## Checklist de cópia

1. Copiar os arquivos do núcleo (tabela acima) para o site novo.
2. Criar o `app/marca.ts` do site a partir do do Respawnou: cores, fontes, logo, textos de fechamento/CTA, `descricao`, `tom`,
   seções com rótulo e perfil, hashtags, `pronunciaBase` do assunto do site, séries.
3. Copiar as fontes: TTF da fonte da legenda em `app/video/fonts/` (e ajustar `MARCA.fontes.legenda.ttf`) e WOFF/TTF
   **estáticos** para o satori em `app/social/fonts/` (o satori não lê WOFF2 nem fonte variável).
4. Escrever as pontes `db.ts` e `site.server.ts` (`lerEntrada` devolvendo `EntradaSocial`, `escolherModelo`) para as tabelas
   do site.
5. `series.server.ts`: começar sem séries (`dadosDaSerie` e `serieDeCalendario` devolvendo `null`), ativar depois.
6. Migrations equivalentes (social 012–014; vídeo 015–017) com a numeração do site; **colar o SQL no chat** para o dono rodar.
7. Rotas em `app/routes.ts`: `videos`, `videos/capa/:id`, `videos/cartao/:id`, e item "Vídeos" no menu do painel.
8. No robô do site, no fim da coleta, em `try/catch`: `escolherDoDia()`, `processarFilaNoServidor()`, `coletarMetricas()` e
   `limparArquivos()` (ver `rodarVideoDoDia` em `app/lib/robot/robot.server.ts`).
9. Dependências: `satori`, `sharp`, `ffmpeg-static`, `react`. Variáveis: `ELEVENLABS_API_KEY`, `SOCIAL_KEY` (cifra o token do
   Instagram), chaves do Gemini (`GEMINI_MODEL_VIDEO` opcional).
10. Teste local, sem gastar crédito: `VIDEO_TESTE=1 npx tsx --tsconfig tsconfig.json scripts/video/teste-local.ts --perfil curto --manter`
    (PowerShell: `$env:VIDEO_TESTE=1; …`). Conferir os quadros (moldura, abertura, legenda, cartões, fechamento). Variações:
    `--perfil longo`, `--pergunta`, `--serie top5|gratis|semana`. Testes puros: `scripts/video/testes/*.teste.ts`
    (`npx tsx --tsconfig tsconfig.json scripts/video/testes/<arquivo>`; terminam com "ok").
11. `npm run build` e deploy.
12. No painel do site novo: voz de cada editoria, pronúncias, séries (as de calendário vêm desligadas), energia da voz.

Observações da hospedagem compartilhada (Hostinger): o ffmpeg roda com 1 thread por entrada/filtro e `/tmp` é `noexec`
(não rodar programas ali); a montagem roda em 2 passadas (cenas → `base.mp4`; moldura, cartões, legenda e áudio por cima) para usar menos threads (limite da conta); vídeo longo demora (uns 2 a 4 s de montagem por segundo de vídeo, mais com cartões).

Ordem sugerida de cópia: animeprofile só depois de migrar para MySQL/Hostinger; vibecoin e criasite quando tiverem o módulo
social (Instagram) funcionando.

## Testes e como verificar

- `npm run build` antes de todo push (rotas do React Router: componentes de cliente não podem importar `*.server.ts`).
- Testes puros: `ass`, `falar`, `cartoes`, `efeitos`, `roteiro` em `scripts/video/testes/`.
- Quadros dos cartões lado a lado: `scripts/video/testes/cartoes-render.ts [pasta]`.
- Teste de ponta a ponta com voz falsa: `scripts/video/teste-local.ts` (imprime o tempo de cada fase).
- Não coberto por teste automático: voz real da ElevenLabs, Gemini real, Instagram real e a hospedagem. Confira no primeiro
  vídeo de cada site.
