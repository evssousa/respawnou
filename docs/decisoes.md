# Registro de decisões

Mais recente no topo. Cada decisão diz o que foi decidido, quando e por quê.




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
