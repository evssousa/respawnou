# Registro de decisões

Mais recente no topo. Cada decisão diz o que foi decidido, quando e por quê.

## 2026-11-26 — Vídeo vertical em tela dividida (plano `video-tela-dividida.md`; implementado no mesmo dia)

- **Respostas do dono (2026-11-26): "ok as recomendações"** para as 6 perguntas: (1) vídeo de terceiros na meia tela o
  tempo todo, sem o teto de 40%, só material oficial e crédito fixo; (2) sem título no vídeo, só na capa; (3) troca da
  imagem de baixo com fade de 0,35 s; (4) cortes de até 4,5 s; (5) um vídeo só por Reel (alternar vários fica para depois);
  (6) 50/50.
- **Ajuste na implementação:** no painel, a imagem de baixo de uma cena SEM imagem própria segue a padrão e é alinhada na
  caixa da capa (o alinhamento por cena só aparece quando a cena escolhe outra imagem); os enquadramentos `b:`/`t:` já
  salvos são preservados ao salvar (o formulário não precisa mandar todos). Na capa, o título centrado na divisa não leva o
  degradê de fundo (deixava uma borda reta).
- **Depois do 1º vídeo real (2026-11-26), a pedido do dono:** legenda da tela dividida maior (Anton 84 → 96) e centrada
  de verdade (margens 64/64; antes 64/164, que a deixava ~50 px à esquerda). A margem maior à direita era para os botões
  do app, mas no meio da tela eles não atrapalham.

- **Pedido do dono:** com vídeo enviado, o Reel fica dividido ao meio (vídeo em cima, capa ou imagens da matéria embaixo,
  legenda no meio) e começa já com as cenas rodando, para prender quem assiste no primeiro segundo.
- **Liga sozinho ao enviar um vídeo**, com chave "Formato da tela" no painel para voltar à tela cheia. Guardado no roteiro
  (`layout`, `topo`, `cenas[].baixo`); roteiro sem `layout` = tela cheia. Sem migration. Por quê: é o que o dono pediu
  ("ao adicionar um vídeo") e os roteiros antigos não mudam.
- **Sem cartão de título no vídeo dividido:** o gancho vira legenda desde o quadro 0; o título fica só na capa. Por quê:
  cartão estático no começo é o que o dono quer evitar.
- **Vídeo de cima "cobrindo" 1080×960** (crop central, opções Esquerda/Direita/Inteiro), cortes secos de até 4,5 s;
  **imagem de baixo** com alinhamento próprio na proporção 9:8 (por imagem, chave `b:<i>` no `focus`) e só uma
  respiração de zoom. Por quê: um movimento forte por vez; o de cima prende, o de baixo dá contexto.
- **Legenda centrada na divisa (y 960)** sobre uma faixa verde da marca com sombra; cartões de dados descem para a metade
  de baixo (y 1060); crédito do vídeo fixo no alto à esquerda.
- **Montagem:** cada corte de cima preparado sozinho em 1080×960 e juntado sem recodificar (`topo.mp4`); passada 1 com
  `vstack`; 2 passadas mantidas. Por quê: VPS com 1 vCPU; metade dos pixels no zoompan e um único vídeo aberto na montagem.
- **Proposto (a confirmar, pergunta 1):** sem o teto de 40% de vídeo de terceiros no modo dividido, com crédito na tela o
  tempo todo, só com material oficial.

## 2026-11-24 — Plano de melhorias dos vídeos curtos (`video-melhorias.md`; itens aprovados pelo dono)

- **Fora do escopo:** vídeo semanal horizontal de 5 min, programa no PC do dono, versão em inglês (decisão do dono).
- **Roteiro escrito para a tela, voz normalizada pelo código:** o Gemini passa a escrever números em algarismos e o código
  converte para a fala (com dicionário de pronúncia e pausas antes de números), guardando um mapa tela ↔ fala. Por quê:
  legenda com algarismos (mais legível e destacável), pronúncia determinística em qualquer modelo da ElevenLabs e
  dicionário que não muda o que aparece na tela.
- **Dicionário de pronúncia:** base no arquivo de marca + itens do dono em `settings.video_pronuncia`, editados no
  `/admin/videos`. Sem migration.
- **Cartões de dados** (preço, lançamento, nota, requisitos, grátis, plataformas; ranking e dia nas séries) renderizados
  no tamanho do cartão (não em 1080×1920), um por vez, entre y 600 e 1040; o roteiro indica o cartão por cena (campo
  opcional) e o código descarta o que não tem dado. Por quê: informar sem cobrir legenda/botões e sem pesar na montagem.
- **Montagem:** primeiro tirar decodificação repetida de JPEG/PNG e filtros tela cheia (estimativa de 35–45% menos tempo,
  mesma qualidade); depois dividir em partes com áudio separado, pasta de trabalho persistente e retomada. Por quê: com
  1 thread, dividir não reduz o trabalho, mas dá retomada sem gastar voz de novo, processos curtos, menos memória e a opção
  de 2 partes em paralelo.
- **Séries:** "Grátis da semana" (quinta) e "Lançamentos da semana" (segunda, a confirmar pelo dono) por calendário;
  "Review em 60 s" e "Top 5" como formatos automáticos das reviews e listas. Chave única de `video_jobs` passa a ser
  `(post_id, serie)`.
- **Métricas:** estatísticas dos Reels em marcos (24 h, 72 h, 7 d, 30 d) numa tabela própria (`video_metrics`, migration
  017); peso por formato na escolha automática só com ≥ 6 vídeos medidos.
- **Módulo copiável:** um único `app/marca.ts` por site; `app/social/config.ts` e `app/video/config.ts` derivam dele com os
  mesmos nomes exportados; checklist em `docs/modulo-video.md`.

## 2026-11-23 — Plano de Stories, imagens próprias e vídeos curtos (`instagram-stories-videos.md`; propostas, falta o dono responder as perguntas)

- **Stories pela API sem figurinha de link** (a API não permite): CTA "link na bio" e seta para o nome da conta; o
  painel permite baixar o JPEG e marcar como "postado à mão" para os dias em que o dono posta com figurinha.
- **Coluna `kind` (`feed|story|reel`) em `social_posts`**, índice único `(post_id, network, kind)`, limites próprios de
  Story em `social_accounts`. Por quê: mesma fila, ações e anti-duplicado; `network` continua sendo a rede.
- **Dois modelos de Story** (ST-N para notícia, ST-M "moldura" com o slide 1 do feed): poucos layouts bem resolvidos.
- **Imagens próprias** em `social_posts.overrides` (JSON) e `MEDIA_DIR/social/uploads`, com foco em 6 opções.
- **Vídeos renderizados no GitHub Actions** (repositório público, minutos grátis, ffmpeg via apt), nunca na Hostinger
  (sem ffmpeg e com CPU compartilhada). Voz ElevenLabs com alinhamento por caractere para a legenda palavra por palavra;
  roteiro com 1 pedido ao Gemini; sem música. Fases: baixar → Reels → YouTube → TikTok manual.

## 2026-11-22 — Anúncios: blocos manuais, locais fixos e modo "ver espaços" (plano em `anuncios.md`)

- **O quê:** só blocos manuais; anúncios automáticos desligados no painel (inclusive âncora e vinheta). 4 unidades
  (meio In-article, faixa display, lateral display, Multiplex), com tamanhos fixos por largura de tela onde possível.
  Mapa de locais por página (tabela D3); nada em `/arcade/<jogo>`, busca, institucionais, 404, prévias, páginas
  `noindex` e `/admin`; matérias de Promoções sem anúncio no meio do texto.
- **Por quê:** o site é SPA; com só blocos manuais, o script carregado não desenha nada sozinho, então um jogo aberto
  por clique continua protegido. Tamanho reservado evita CLS. Página que não queremos no Google também não recebe anúncio.
- **IDs dos blocos no `/admin/config`** (tabela `settings`, sem migration), com interruptor de desligar na hora;
  `ADSENSE_CLIENT` continua no hPanel. Por quê: o dono cola os números sem reiniciar o app e pode desligar tudo em 1 clique.
- **Modo "ver espaços"** pelo `localStorage` (botão no painel): caixas tracejadas sem chamar o Google, para aprovar o
  layout antes da aprovação. Por quê: o HTML não varia por usuário (sem risco de cache) e não há hidratação diferente.

## 2026-11-20 — Plano de crescimento orgânico (custo zero)

- **O quê:** o dono aprovou 4 frentes, nesta ordem: SEO do Arcade, fichas de jogos úteis, evergreen consistente,
  Google Discover (plano em `crescimento.md`). Orçamento zero: sem API paga, Gemini só no plano gratuito.
- **Fichas:** saem do `noindex` só com conteúdo próprio suficiente (descrição pt-BR + data + mídia + 3 de 5 blocos
  de dados: requisitos, idiomas, nota da crítica, datas por plataforma, jogos parecidos), com teto de 5 por semana
  e campo `index_from` que não volta; ficha indexada nunca é apagada pelo sync. Por quê: evitar páginas finas e
  "conteúdo em massa", e não gerar 404 em página que o Google já conhece.
- **JSON-LD:** sem `aggregateRating`/`Review` (a nota não é nossa) e sem `FAQPage` nas fichas (o Google não mostra
  esse resultado para sites comuns e o bloco repetido em dezenas de páginas parece modelo). As perguntas ficam visíveis na página.
- **Arcade:** textos de 150–300 palavras ficam abaixo do jogo e fora do bundle do cliente (`arcade-seo.server.ts`);
  imagem de compartilhamento por jogo em `/og/arcade/<slug>.png` (fora de `/arcade/`, a regra de anúncios não muda).
- **Evergreen:** ~9 a 11 peças por semana sem aumentar o volume diário; guias de requisitos limitados a 4/semana até
  sabermos se os atuais estão sendo indexados; 1 peça com assinatura humana por semana.




## 2026-11-14 — Arcade: divulgação, textos legais e anúncios fora dos jogos

- **Home:** módulo "Passe o tempo" com 3 jogos que trocam todo dia (mesmo card da lista).
- **Compartilhar:** botão na tela de fim de jogo. Menu nativo só em tela de toque; no PC vai direto ao WhatsApp.
- **Legal:** cookies e privacidade passam a dizer que recorde/partidas ficam só no `localStorage`;
  Sobre e FAQ citam o Arcade (datas de revisão atualizadas em `site.ts`).
- **Anúncios:** `/arcade/<jogo>` não carrega o script do AdSense (anúncio automático poderia cair em cima
  do jogo). Excluir também `/arcade/*` no painel do AdSense ao ser aprovado (ver arcade.md).

## 2026-11-14 — Coleta cobre o cron de publicação

- **O quê:** se "publicar" não roda há mais de 75 min, a coleta o chama.
- **Por quê:** o Cron Job da Hostinger pulou 5 execuções seguidas sem deixar rastro no site; a coleta
  (outro Cron Job) seguiu funcionando. Sem acesso aos logs do hPanel na hora, a saída foi tornar
  o robô independente de uma falha pontual de um dos jobs.

## 2026-11-14 — Robô não repete assunto já publicado

- **O quê:** a saída do Jensen Huang da Nvidia virou duas matérias (12/11 e 13/11). Agora a pauta é
  comparada com as fontes dos últimos 4 dias e o título gerado com os publicados nos últimos 5.
- **Por quê:** conteúdo duplicado pesa contra no Google e no AdSense ("baixo valor").
- Desdobramento real do mesmo fato dentro de 5 dias também é barrado; aceitamos a troca.

## 2026-11-13 — Site enviado ao Google

- **O quê:** Search Console como propriedade de Domínio (TXT no DNS, ao lado do SPF), sitemap enviado
  e indexação da home solicitada.
- **Por quê agora:** o combinado era esperar ~10 matérias; já são 12, mais os 10 jogos do Arcade.
- O 403 do CDN para "Googlebot" falso não afeta o Google real (teste ao vivo OK).

## 2026-11-13 — Arcade: horizontal no PC, vertical no celular

- **O quê:** todos os jogos ganharam dois formatos; a moldura escolhe pela tela (largura ≥ 768 px e
  maior que a altura = horizontal) e o jogo recebe o tamanho e monta o layout.
- **Por quê:** no PC os jogos em pé desperdiçavam a tela; no celular em pé, horizontal fica minúsculo.
- Trocar de formato no meio da partida reiniciaria o jogo, então a troca espera a partida acabar.

## 2026-11-12 — Arcade: jogos de passatempo próprios

- **O quê:** seção `/arcade` com jogos infinitos em canvas (Respawn, Torre, Quebra-Pixel), no menu.
- **Por quê:** faz o leitor voltar e ficar mais tempo no site, sem depender do robô nem do Gemini.
- **Como:** sem biblioteca de jogo (canvas puro, ~10 KB por jogo, carregado só na página dele);
  recorde no navegador, sem conta nem banco. `/jogos/...` já é das fichas, por isso `/arcade`.
- Jogos próprios: estilos clássicos, nunca cópia de nome, personagem ou visual de jogo existente.
- Jogos que por natureza terminam viraram infinitos: Campo Minado emenda campos com mais minas,
  Memória emenda fases maiores, Paciência emenda mãos e só fecha a pontuação em ENCERRAR.
- Menu: com o Arcade, a busca do cabeçalho vira só a lupa entre 1024 e 1279 px para tudo caber.

## 2026-11-12 — Selo "Mais aguardado" e compilação sob demanda

- **Selo:** os 10 jogos com mais `hypes` (IGDB, mínimo 5) entre todos os próximos lançamentos ganham
  "★ MAIS AGUARDADO" no calendário, na home e nas plataformas. O ranking é sempre o do calendário
  inteiro (filtrar por plataforma não muda quem é destaque); `getReleases` busca tudo (~150 jogos) e
  filtra em memória.
- **Compilação agora:** botão no painel para gerar/publicar uma compilação fora do dia dela. Falha
  manual não marca o período, para não cancelar a automática.

## 2026-11-12 — Prévia de rascunho na própria página pública

- **O quê:** `?previa=1` na página da matéria, aceito só com o admin logado.
- **Por quê:** reaproveita a página real (mesmo visual, sem duplicar componente); sem sessão nada muda,
  e a resposta nunca vai para cache nem para o Google.

## 2026-11-12 — Falha do Gemini tenta de novo em até 30 min

- **O quê:** quando a publicação falha por 503/travamento do Gemini, a coleta seguinte (a cada 30 min)
  tenta publicar de novo (`retryAfterGeminiOutage` em robot.server.ts).
- **Por quê:** o Gemini gratuito vive sobrecarregado e a publicação roda de hora em hora; cada falha
  custava 1 h sem matéria. Reaproveitar a coleta evita mais um Cron Job no hPanel.
- Só para instabilidade ("Gemini indisponível"); limite de cota não repete.

## 2026-11-12 — Escolha da pauta premia o assunto, não a fonte

Diagnóstico (`/api/cron/fontes`): só IGN e GameSpot viravam matéria. A pontuação da coleta era
peso × 10 + tipo de notícia, então IGN/GameSpot (peso 8) começavam 10 a 40 pontos à frente e a fila
só olhava as 60 primeiras (a IGN sozinha tinha 64). As outras expiravam em 48 h. Agora a publicação
reordena até 200 pautas: tipo de notícia + peso × 3 + 10 por outro veículo no mesmo assunto + 8 se
tem menos de 6 h − 12 por matéria que a fonte já rendeu em 24 h (`rankedQueue`).

## 2026-11-12 — Contador de visitas e exclusão de rascunhos

O campo `views` existia mas nada somava. Agora a página da matéria avisa `POST /api/view` depois de
abrir no navegador; não contam bots (isbot), repetição da mesma pessoa em 30 min nem o admin logado.
No painel, rascunhos e arquivadas podem ser excluídos de vez (lista e editor); matéria no ar, não.
## 2026-11-12 — Loaders ignoram o sufixo ".data" do endereço

Clicar em "Notícias" ou "Promoções" no menu dava 404 (abrir o endereço direto funcionava): na navegação
interna o React Router busca os dados em `/noticias.data`, e a página de editoria lia a editoria do
endereço ("noticias.data"). Agora os loaders usam `app/lib/route-path.ts` (`routePath`/`firstSegment`).
Teste de regressão: clicar em todos os links do menu e do rodapé, não só abrir cada endereço.
## 2026-11-12 — Capa escolhida também pela nitidez

A capa de "Marvel 1943" saiu com 1280×720 px mas borrada (quadro de vídeo ampliado): a regra só olhava
o tamanho. Agora `probeImage` mede a nitidez (desvio-padrão do laplaciano) e `chooseMedia` prefere a
imagem grande **e** nítida; borrada (< 6) não vira capa nem entra no corpo. A matéria foi refeita com a
imagem nítida que a própria pauta tinha (IGN, 9,7).
## 2026-11-11 — Repositório como portfólio, sem licença de uso

O repositório continua público para servir de portfólio, mas **todos os direitos são reservados**:
`LICENSE` própria (sem licença open source), `"license": "UNLICENSED"` no package.json e aviso no
README. Observação: o GitHub permite que qualquer pessoa faça fork de um repositório público pela
interface (faz parte dos termos do GitHub); a licença proíbe usar ou publicar a cópia, mas não impede
o botão. Para impedir de fato, só tornando o repositório privado.

## 2026-11-11 — Páginas vazias fora do índice e AdSense ligado por variável

Editoria, plataforma ou calendário sem conteúdo some de menu, home e sitemap e leva `noindex`
(`app/lib/availability.ts`, cache de 5 min). AdSense, `ads.txt` e banner de cookies ficam desligados
até existir `ADSENSE_CLIENT` no hPanel, para não pedir consentimento de algo que o site ainda não usa.

## 2026-11-10 · Robô respeita bloqueios de sites

- **Decisão:** quando um site bloqueia robôs na página da matéria (HTTP 403), usamos só o texto que
  ele mesmo oferece no RSS. Nada de se passar por navegador.
- **Por quê:** o bloqueio é uma escolha do site; contornar seria abusivo e arriscado para a reputação.

## 2026-11-10 · Robô publica de hora em hora, mas só dentro das regras

- **Decisão:** cron horário; a rota decide se publica (8h–22h de Brasília, até `posts_per_day`,
  intervalo mínimo entre posts). Mudar o volume é só mudar `posts_per_day`.

## 2026-11-10 · Site no ar com banco vazio (sem dados de exemplo)

- **Decisão:** produção usa o MySQL desde o início; a home mostra "aguardando a primeira transmissão"
  até o robô publicar.
- **Por quê:** os dados de exemplo são fictícios e não podem aparecer num domínio público
  (enganaria leitores e prejudicaria o AdSense).

## 2026-11-10 · Migrations rodam dentro do app

- **Decisão:** `server-app.js` aplica as migrations ao iniciar, conectando em 127.0.0.1.
- **Por quê:** liberar acesso remoto ao MySQL foi negado (abre o banco para fora). Rodar no próprio
  servidor mantém o banco fechado e dispensa passo manual a cada deploy.

## 2026-11-10 · Reviews viram "consenso da crítica"

- **Decisão:** a editoria Reviews não publica reviews próprias. Cada post é um resumo do que a
  crítica especializada disse: média das notas publicadas, pontos mais elogiados e mais criticados,
  e a lista de veículos com link para cada análise.
- **Por quê:** o site é 100% automático. Uma review exige alguém que jogou; publicar "review" escrita
  por IA sem ninguém ter jogado seria enganar o leitor e é exatamente o tipo de conteúdo que o Google
  e o AdSense punem. O consenso da crítica é verificável, útil e automatizável.
- **Consequências:** dados estruturados das reviews usam `NewsArticle` (sem `reviewRating`, porque a nota
  não é nossa); a página /como-avaliamos explica o cálculo da média; política editorial e FAQ atualizadas.

## 2026-11-10 · Robô de postagem roda na Hostinger, não no GitHub Actions

- **Decisão:** a automação é uma rota protegida do próprio site (`/api/cron/...`) chamada por um
  Cron Job da Hostinger. Grava direto no MySQL local.
- **Por quê:** tudo num lugar só; o banco não precisa ficar exposto para fora (MySQL da Hostinger só
  aceita conexão local); o painel admin mostra o histórico das execuções.
- **Cuidados:** cada execução publica 1 post (limites de CPU/tempo da hospedagem compartilhada).

## 2026-11-10 · Sem contas de usuário, só admin em /admin

- Admin acessa digitando /admin (fora dos menus, `Disallow` no robots.txt).
- Removidos: ícone de login, botões favoritar/avisar/comentar.

## 2026-11-10 · Site informativo, sem CNPJ e sem vendas

- Textos legais não citam CNPJ nem Código de Defesa do Consumidor.
- Controlador de dados (LGPD) = o site + e-mail contato@respawnou.com.br (canal com o titular).

## 2026-11 · Fundação

- **Nome:** Respawnou (respawnou.com.br). Só pt-BR.
- **Hospedagem:** Hostinger plano Business (Node.js + MySQL).
- **Stack:** React 19 + React Router 8 (modo framework, SSR) + Tailwind 4 + TypeScript.
- **Repositório público** (portfólio): nunca commitar segredos ou `.env`.
- **Estilo:** "Central de Comando" (escolhido entre 12 protótipos).
- **Volume:** ~4 posts/dia. Fontes iniciais: RSS de IGN, PC Gamer, Eurogamer + RAWG/IGDB.
- **IA:** Gemini no plano gratuito (sem APIs pagas).
- **Domínio canônico:** apex `https://respawnou.com.br` (www redireciona 301). Lição do animeprofile,
  onde o BASE_URL apontava para um subdomínio que redirecionava.
