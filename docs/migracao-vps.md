# Migração para a VPS (Hostinger KVM 1 + Coolify)

Status: 🔄 **em preparação (2026-11-26)**. 2º site a migrar (o criasite foi o 1º, virada em 2026-11-26).
Módulo de origem: `../criasite/docs/migracao-vps.md`, Partes B a F e "Lições do criasite". A Parte A (base da VPS)
já está feita e **não se repete**.

Marcadores: `<site>` = `respawnou`; `<dominio>` = `respawnou.com.br`; `<repo>` = `evssousa/respawnou`;
`<temp>` = `respawnou.189-24-17-85.sslip.io`. 🤖 = Claude, 👤 = dono.

## O que já existe na VPS (da Parte A do criasite)

Coolify em `https://painel.criasite.app` (token da API em `projetos\_segredos\coolify-api-token.txt`), GitHub App
`coolify-sites-evssousa` (uuid `ewmvhkc4kociuvhqgsl5paz0`), servidor `rfc2imocy7zydxlver01wlsx`, MariaDB 11.8
`mariadb-sites` (uuid `djg6eojhrivnayhax7ohoszd` = `DB_HOST`, backup diário de todos os bancos), firewall da Hostinger,
swap de 4 GB, SSH root só por chave (`~/.ssh/criasite_vps`), pastas `/srv/sites` e `/root/migracao`.
Memória em 2026-11-26, com o criasite no ar: 1,37 GB usados de 3,9 GB.

---

## Parte F — Específico do respawnou (levantado em 2026-11-26)

- **Hoje:** app Node (React Router 8 SSR + Express 5) no Cloud Startup, usuário `u218539700`, atrás da CDN
  (`respawnou.com.br.cdn.hstgr.net`), auto-deploy do GitHub `evssousa/respawnou` (main). MySQL local
  `u218539700_respawnou`. Imagens em `~/respawnou-media` (padrão do `server-paths.mjs`; sem `MEDIA_DIR` no painel).
  Última migration: `017_video_melhorias`.
- **Variáveis na Hostinger (17):** `VITE_SITE_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
  `CRON_TOKEN`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `GEMINI_API_KEY`, `YOUTUBE_API_KEY`,
  `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `ADSENSE_CLIENT`, `ELEVENLABS_API_KEY`, `SOCIAL_KEY`.
  Não existem: `GEMINI_MODEL`, `GEMINI_MODEL_VIDEO`, `DB_POOL`, `MEDIA_DIR`, `FFMPEG`.
- **Cron Jobs do respawnou (2):** `*/30 * * * *` coletar e `5 * * * *` publicar (com `?token=` na URL). Na mesma lista
  da conta há 3 do vibecoin e 1 do animeprofile: **não mexer** neles.
  Não há job próprio para vídeos, Instagram nem limpeza: o `coletar` dispara a fila do Instagram (`tickSocial`),
  a fila de vídeos (`processarFilaNoServidor`), a escolha do vídeo do dia e a limpeza de arquivos.
- **DNS (para a volta):** `@` ALIAS `respawnou.com.br.cdn.hstgr.net.` (TTL 300); `www` CNAME
  `www.respawnou.com.br.cdn.hstgr.net.` (TTL 300). Sem CAA. Ficam intocados: MX (`mx1`/`mx2.hostinger.com`), TXT do
  SPF e da verificação do Google (`google-site-verification=iYTLR…`), `_dmarc`, os 3 DKIM `hostingermail-*`,
  `autodiscover`, `autoconfig`. O `ftp` (A `187.6.160.61`) some quando o site antigo for apagado (igual ao criasite).
- **E-mail:** `contato@respawnou.com.br` continua na Hostinger (a virada não mexe no MX).
- **Pastas de `/media`:** `AAAA/MM` (capas das matérias), `social/AAAA/MM` e `social/uploads/AAAA/MM` (artes e fotos do
  Instagram), `video/AAAA/MM` (MP4 e capa dos vídeos), `video/uploads/AAAA/MM` (vídeos enviados e quadros `-tN.jpg`),
  `video/previa` (cache da voz por parte; não é referenciado no banco e não é migrado: some sozinho em 3 dias).
- **Diferenças em relação ao criasite:**
  1. **Vídeos com ffmpeg** (`ffmpeg-static`, baixado no `npm ci`). Na VPS não há o limite de processos da hospedagem
     (`pthread_create`), mas a VPS tem **1 vCPU para todos os sites**: o app fica com memória de **1.280 MB** (ffmpeg em
     1080×1920 + Node) e **peso de CPU menor** (`cpu_shares` 512, metade do padrão), para uma montagem de vídeo não deixar o
     criasite lento. O código de poucos threads (`movie=`, duas passadas) fica como está.
  2. **`SOCIAL_KEY` tem de ser a mesma de hoje**: ela cifra o token do Instagram guardado no banco. Com outra chave o
     painel não consegue ler o token (aí é preciso colar o token de novo em `/admin/instagram`).
  3. **Ensaio sem Instagram e sem ElevenLabs:** no ensaio, `SOCIAL_KEY` e `ELEVENLABS_API_KEY` ficam **de fora**, para que o
     `coletar` do ensaio não poste no Instagram nem gaste créditos de voz com a cópia do banco. Entram na virada.
  4. O Express já faz `www` → apex com 301; o Coolify também redireciona (com os rótulos 301 da lição 4).

---

## Parte B — Preparar o site na VPS

### B1. Levantamento 🤖 ✅
Parte F acima.

### B2. Código: Dockerfile e comentários 🤖
`Dockerfile` igual ao do criasite, com `VITE_SITE_URL=https://respawnou.com.br` e a conferência do ffmpeg no build
(`node -e "require('sharp'); require('node:fs').accessSync(require('ffmpeg-static'))"`). `.dockerignore` igual (os
`scripts/video/fixtures` vão para a imagem: servem para o teste de montagem no container).
Comentários: `server-paths.mjs`, `server-app.js` (`prepareDatabase`), `app/lib/db.server.ts`, `app/routes/cron.ts`,
`.env.example`. `npm run build` antes do commit.
- **Conferir:** deploy da Hostinger depois do push termina `completed` e o site segue igual.

### B3. Variáveis 🤖 + 👤
| Variável | Valor na VPS | Quem |
|---|---|---|
| `DB_HOST` | `djg6eojhrivnayhax7ohoszd` | 🤖 |
| `DB_PORT` | `3306` | 🤖 |
| `DB_NAME`, `DB_USER` | `respawnou` | 🤖 |
| `DB_PASSWORD` | nova, gerada | 🤖 |
| `CRON_TOKEN` | novo (64 hex) | 🤖 |
| `SESSION_SECRET` | novo (desloga o admin, ok) | 🤖 |
| `VITE_SITE_URL` | `https://respawnou.com.br`, **Build Variable** | 🤖 |
| `ADMIN_EMAIL` | o mesmo de hoje | 👤 |
| `ADMIN_PASSWORD_HASH` | o de hoje ou um novo (`npm run admin:hash`) | 👤 |
| `GEMINI_API_KEY`, `YOUTUBE_API_KEY`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `ADSENSE_CLIENT` | os mesmos de hoje | 👤 |
| `ELEVENLABS_API_KEY` | a mesma; **só na virada** (C9b) | 👤 |
| `SOCIAL_KEY` | **a mesma de hoje** (ver F, item 2); **só na virada** | 👤 |
| `MEDIA_DIR`, `PORT`, `NODE_ENV` | no Dockerfile; não cadastrar | — |

Arquivo `projetos\_segredos\respawnou-vps.env` gerado pelo 🤖 sem imprimir; o 👤 preenche as linhas vazias no Bloco de
Notas. O script de envio manda tudo **menos** `SOCIAL_KEY` e `ELEVENLABS_API_KEY` no ensaio, e as duas na virada.

### B4. Banco e usuário 🤖
`/root/migracao/respawnou.env` (scp, chmod 600) → `CREATE DATABASE respawnou` utf8mb4 + usuário `respawnou`@`%` só com
`respawnou.*`. Nunca imprimir a resposta de `POST /databases/*`.

### B5. Ensaio do banco 👤 + 🤖
1. 👤 phpMyAdmin do hPanel (banco `u218539700_respawnou`) → anotar a versão do servidor → Exportar → Personalizado:
   SQL; todas as tabelas; estrutura e dados; desmarcar "CREATE DATABASE / USE"; `utf8mb4`; sem compressão. Salvar em
   `projetos\_migracao\respawnou-ensaio.sql`.
2. 🤖 scp; conferir cabeçalho, `USE`, `CREATE DATABASE`, `DEFINER`, `uca1400`; `DROP DATABASE` + `CREATE DATABASE`
   (o phpMyAdmin não põe `DROP TABLE`) e importar.
3. 🤖 Contagens para comparar na virada: `posts`, `feeds`, `feed_items`, `cron_runs`, `settings`, `visit_*`,
   `social_*`, `video_jobs`, `games`/fichas; `schema_migrations` = `017_video_melhorias`.

### B6. Ensaio das imagens 🤖
Lista a partir do dump com o padrão das pastas do site (lição 6):
`grep -oE '/media/(20[0-9]{2}|social|video)/[A-Za-z0-9._/-]+' respawnou-ensaio.sql | sort -u`, baixar de
`https://respawnou.com.br` para `/srv/sites/respawnou/media`, `chown -R 1000:1000`.
- **Conferir:** arquivos = linhas da lista menos as `FALHOU` explicadas (404 também no site antigo); `du -sh` anotado
  (os MP4 pesam mais que as imagens do criasite).

### B7. Aplicação no Coolify 🤖 (API)
Projeto `respawnou` → app do repositório `evssousa/respawnou` (GitHub App), branch `main`, build pelo Dockerfile, porta
3000, healthcheck `/robots.txt`, memória **1.280 MB**, `cpu_shares` **512**, domínio só `https://<temp>` com
`noindex_domains`, pasta `/srv/sites/respawnou/media` → `/data/media` (storage `file` + `is_directory`), variáveis do
B3 (sem as 2 da virada). **Sem** tarefas agendadas.
- **Conferir:** log `[migrate] banco atualizado` e `[respawnou] ouvindo na porta 3000`; healthy; tempo de build e pico
  de memória anotados.

### B8. Tarefas agendadas (criar só na virada)
| Nome | Cron (UTC) | Comando |
|---|---|---|
| coletar | `0,30 * * * *` | `sh -c 'curl -fsS -m 280 -H "x-cron-token: $CRON_TOKEN" http://127.0.0.1:3000/api/cron/coletar'` |
| publicar | `5 * * * *` | `sh -c 'curl -fsS -m 280 -H "x-cron-token: $CRON_TOKEN" http://127.0.0.1:3000/api/cron/publicar'` |
Os horários não batem com os do criasite (`10,40` e `50`).

### B9. Checklist do ensaio em `https://respawnou.189-24-17-85.sslip.io` 🤖
1. **Páginas (200 e conteúdo real):** `/`, `/noticias`, 1 notícia, 1 review/consenso, 1 guia, `/promocoes` (ou a lista de
   jogos grátis), `/lancamentos`, 1 ficha de jogo, `/arcade` e 1 jogo do Arcade, `/busca?q=zelda`, `/redacao`,
   `/anuncie`, `/privacidade`; uma página inexistente dá 404; títulos da home iguais aos do site antigo.
2. **SEO:** `<loc>` do sitemap igual ao antigo; `/robots.txt` e `/ads.txt` iguais; canonical em `https://respawnou.com.br/…`.
3. **/media:** a lista inteira com 200 e `immutable`; 1 MP4 de vídeo com `Range` (206).
4. **Cabeçalhos:** Brotli/gzip no HTML; `/assets/*` immutable; `/admin` e `/api` com `no-store` e noindex.
5. **/admin** (👤): login; abrir `/admin/materias`, `/admin/robo`, `/admin/videos` (as 4 abas), `/admin/instagram`
   (vai avisar que falta `SOCIAL_KEY`: esperado no ensaio), `/admin/visitas`. Não editar nada que precise sobreviver.
6. **Robô (dentro do container):** `diag?wait=1` (Gemini), `jogos?wait=1` (IGDB), `ofertas?wait=1`,
   `publicar?dry=1&wait=1`. `coletar?wait=1` **só depois** de conferir que não há vídeo `approved` na fila
   (sem ElevenLabs e sem `SOCIAL_KEY` ele não gasta crédito nem posta, mas a conferência fica).
7. **Vídeo no container:** `node scripts/video/teste-local.ts` (voz falsa, sem crédito) → MP4 gerado; anotar o tempo
   (na Hostinger eram ~2 a 5 min) e o pico de memória; o criasite continua respondendo durante a montagem
   (`curl` na home do criasite a cada segundo, sem 502 e com tempo < 1 s).
8. **IP real** (`cabecalhos`, de fora, pelo PC) e `X-Forwarded-For` forjado descartado.
9. **Visitas:** 2 páginas abertas → `/admin/visitas` "Hoje" sobe.
10. **http → https**; **tempo** (TTFB da home 5×, comparar com o antigo).
11. **Deploy sem queda** (push trivial com `curl` a cada segundo) e **reinício** (`docker restart`).
12. **Recursos:** `free -m`, `docker stats --no-stream`.

---

## Parte C — Virada

Começar aos **:52** de uma hora (depois do `coletar` das :30 e antes do das :00; o `publicar` é às :05).

| # | Quem | Passo | Conferir |
|---|---|---|---|
| C1 | 🤖 | Snapshot da VPS. Avisar o dono: não editar nada no `/admin` antigo nem aprovar vídeo | snapshot criado |
| C2 | 🤖 | **Apagar só os 2 Cron Jobs do respawnou** na Hostinger (`URJfWq9bz2` coletar, `icNsqSkVTx` publicar); os do vibecoin e do animeprofile ficam | lista da conta sem os 2 |
| C3 | 🤖 | Esperar terminar o que o último `coletar`/`publicar` disparou (inclusive vídeo em geração) | `status` antigo sem job aberto; nenhum `video_jobs` em `gerando` |
| C4 | 👤 | Dump final pelo phpMyAdmin → `projetos\_migracao\respawnou-final.sql` | avisar no chat |
| C5 | 🤖 | scp; `DROP DATABASE` + `CREATE DATABASE`; importar; contagens ≥ ensaio | migration 017 |
| C6 | 🤖 | Imagens e vídeos novos (B6 com o dump final) | 0 `FALHOU` novos |
| C7 | 🤖 | `SOCIAL_KEY` e `ELEVENLABS_API_KEY` no app; restart; B9 itens 1, 3 e 5 | ok; `/admin/instagram` lê o token |
| C8 | 🤖 | **DNS:** apagar `@` ALIAS e `www` CNAME; criar `A 189.24.17.85` nos dois (TTL 300). Sem AAAA | `nslookup` no 8.8.8.8 e 1.1.1.1 = VPS |
| C9 | 🤖 | Domínios `https://respawnou.com.br`, `https://www.respawnou.com.br` (+ o temporário com noindex); deploy; rótulos 301 (lição 4) | Let's Encrypt para os dois |
| C10 | 🤖 | Checklist no domínio real (B9 1–5, 10; http→https e www→apex com 301; MX igual) | ok |
| C11 | 🤖 | Criar as 2 tarefas (B8) | `coletar` das :00/:30 e `publicar` das :05 rodam sozinhos |
| C12 | 👤 | Abrir o site e o `/admin` no celular e no PC; testar "Ouvir esta cena" num rascunho de vídeo | dono confirma |

## Parte D — Depois da virada
- **2 h** 🤖: `coletar`/`publicar` no `status`; 1 matéria nova com capa servida da VPS; fila do Instagram andando (se
  ligada); `docker logs` sem erro; `free -m`.
- **24 h** 🤖: backup diário inclui o banco `respawnou`; visitas contando; 1º vídeo real gerado na VPS (👤 gera, 🤖 olha
  tempo e memória).
- **7 dias** 🤖: TTL 3600; tirar o temporário; apagar `/root/migracao/respawnou*` e 👤 `projetos\_migracao\respawnou-*.sql`;
  `deploy-vps.md` novo, `deploy-hostinger.md` vira histórico.
- **Site antigo:** apagar do Cloud Startup (`hosting_websites_delete`) **só com o ok do dono**, depois de conferido o
  domínio real. Logo depois, conferir a zona (A da VPS, MX, SPF, DKIM, DMARC, TXT do Google) e a caixa de e-mail.

## Parte E — Volta (enquanto o site antigo existir)
1. 🤖 DNS de volta: `@` ALIAS `respawnou.com.br.cdn.hstgr.net`, `www` CNAME `www.respawnou.com.br.cdn.hstgr.net`, TTL
   300; apagar os A.
2. 🤖 Apagar as tarefas do Coolify.
3. 👤 Recriar os 2 Cron Jobs no hPanel (comando na Parte F, com o token **antigo**, que continua no app antigo).
4. 🤖 Listar o que a VPS gravou depois do C4 (posts, vídeos, fila do Instagram) para o dono decidir.

---

## Andamento

**2026-11-26 (Claude)**
- B1: levantamento feito (Parte F). VPS com folga (1,37 GB de 3,9 GB usados, disco 24%).
- B2: `Dockerfile` e `.dockerignore` no repo, comentários atualizados (commit `0185a5d`).
- B3: `projetos\_segredos\respawnou-vps.env` gerado (DB, `CRON_TOKEN`, `SESSION_SECRET` novos); faltam as 9 linhas do
  dono. Envio por `scratchpad\envs-respawnou.mjs` (sem `virada`: deixa `SOCIAL_KEY` e `ELEVENLABS_API_KEY` de fora).
  As 8 geradas já estão no app.
- B4: banco e usuário `respawnou` criados (grants só em `respawnou.*`).
- B7: projeto `respawnou` (uuid `blfkbzst4dslgir3m9s7ohn5`), app `respawnou` (uuid **`flq1qcdivqix2fwh8rrqtshq`**),
  Dockerfile, porta 3000, healthcheck `/robots.txt`, 1.280 MB, `cpu_shares` 512, domínio só o temporário com noindex,
  pasta `/srv/sites/respawnou/media` → `/data/media`. 1º build: ~1 min, imagem de 696 MB; healthy; as 17 migrations
  rodaram no banco vazio (o dump do ensaio substitui tudo com `DROP DATABASE`).
- B9.7 adiantado: `teste-local.ts` (voz falsa) no container: vídeo de 35 s montado em **36 s** (na Hostinger eram
  minutos), pico de ~930 MB no container, criasite respondendo em 0,06 s (máx. 0,11 s) durante a montagem, 0 erros.
- **Esperando o dono:** preencher o `.env` e o dump do ensaio (B5.1).
