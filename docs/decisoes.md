# Registro de decisões

Mais recente no topo. Cada decisão diz o que foi decidido, quando e por quê.

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
