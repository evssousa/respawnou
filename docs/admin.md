# Painel administrativo (/admin)

Status: ✅ no ar; dono entrou pela primeira vez em 2026-11-11.

## Acesso

- Só existe o admin; não há contas de usuário.
- URL `/admin`, fora dos menus, `Disallow: /admin` no robots.txt, `noindex` nas páginas e
  `X-Robots-Tag: noindex` + `Cache-Control: no-store` (middleware no `server-app.js`).
- Variáveis de ambiente (hPanel → Node.js → Variáveis de ambiente):
  - `ADMIN_EMAIL` — e-mail de login;
  - `ADMIN_PASSWORD_HASH` — hash **scrypt** da senha (nunca a senha), gerado com `npm run admin:hash`
    no computador do dono (pede a senha sem mostrar e imprime as variáveis);
  - `SESSION_SECRET` — 32+ caracteres aleatórios (o mesmo script gera).
  Sem as três, `/admin/login` mostra "Painel ainda não configurado" com a lista do que falta ou
  está inválido (só nomes, nunca valores).
- Formato do hash: `scrypt:N:r:p:salt:hash` (sem `$`: alguns painéis tratam `$algo` como variável e
  cortam o valor). O formato antigo com `$` continua aceito.
- Depois de salvar no hPanel, conferir com `hosting_nodejs_list-environment-variables` (mostra só os
  nomes). Em 2026-11-11 a primeira tentativa não gravou: a lista não tinha nenhuma das três.
- Sessão: cookie `__respawnou_admin` assinado, `HttpOnly`, `Secure`, `SameSite=Lax`, 7 dias,
  **path `/`** (com path `/admin` a navegação interna quebrava: os dados vêm de `/admin.data`).
- Força bruta: 5 erros por IP em 15 min bloqueiam o login (em memória).
- Formulários: além do SameSite, toda ação confere o cabeçalho `Origin` (outro site → recusado).
- Trocar a senha: rodar `npm run admin:hash` de novo e substituir `ADMIN_PASSWORD_HASH`.
  Trocar `SESSION_SECRET` derruba todas as sessões abertas.

## Telas

Código: `app/routes/admin/*`, `app/lib/admin/*` (auth, dados, conversor do corpo), `app/components/admin-ui.tsx`.

1. **Painel** (`/admin`): publicadas hoje/limite, 7 dias, total, pautas na fila; últimas execuções do
   robô; pendências (rascunhos, pautas reprovadas em 24 h, fontes com erro); aviso se o robô está desligado.
1b. **Configurações > Anúncios** (`/admin/config`, 2026-11-22): interruptor "Anúncios ligados" e os 4 números dos blocos do AdSense (meio, faixa, lateral, multiplex), salvos na tabela `settings` (`ads_enabled`, `ads_slots`; valem em até 1 minuto). Mostra se `ADSENSE_CLIENT` existe (nunca o valor). Botões **Ver espaços no site** / **Desligar**: caixas tracejadas com o tamanho de cada anúncio, só neste navegador (`localStorage`), sem chamar o Google. Plano em `anuncios.md`.
2. **Visitas** (`/admin/visitas`, 2026-11-19): cartões Hoje/Ontem/7 dias/30 dias/Total, gráfico de 30 dias, páginas mais vistas
   (com título e filtro por tipo), origem do tráfego, aparelho, navegador e sistema. Contagem própria, sem cookie e sem
   guardar IP: `<VisitBeacon />` (no `App` do `root.tsx`) avisa `POST /api/v` depois que a página abre; o servidor soma
   no buffer e grava a cada 10 s em `visit_daily`, `visit_pages`, `visit_dims` e `visit_seen` (migration 009). Código do
   módulo em `app/visitas/` (copiado do animeprofile; específicos do site: `config.ts`, `db.ts`, `site.server.ts`,
   `ui/visitas.css`, `ui/icones.tsx` em SVG próprio). O `posts.views` agora é somado pela mesma coleta (janela de
   30 min por pessoa e matéria). O dono logado (`__respawnou_admin`) não é contado. Retenção: `visit_seen` só do dia,
   páginas e origens 400 dias, totais por dia sem prazo (limpeza roda uma vez por dia dentro da coleta do robô).
   `POST /api/view` (antigo) só responde 204; pode ser apagado depois de 7 dias do deploy.
3. **Matérias** (`/admin/materias`): busca, filtro por editoria e status, paginação.
   **Editar** (`/admin/materias/:id`): título (contador 30–70), linha fina, palavra-chave, tags,
   descrição do Google (contador 120–160), plataformas, capa/crédito/alt e corpo.
   Ações: publicar, tirar do ar (rascunho), arquivar, destacar na home, **refazer com o robô**
   (só posts do robô; roda em segundo plano).
3. **Fila** (`/admin/fila`): abas Na fila / Usadas / Reprovadas / Descartadas, com motivo; descartar
   pauta ou devolver para a fila.
4. **Fontes** (`/admin/fontes`): ativar/desativar, peso 1–10, pautas e matérias por fonte em 7 dias,
   último erro; adicionar fonte (o feed é lido antes de cadastrar).
5. **Robô** (`/admin/robo`): coletar, publicar uma agora (ignora horário/limite), testar sem gravar
   (o rascunho aparece nos detalhes), diagnóstico (Gemini + YouTube); histórico das 40 últimas
   execuções com detalhes; atualiza sozinho a cada 5 s enquanto algo roda. Card **Compilação agora**:
   ofertas da Steam, resumo da semana, grátis do mês ou lançamentos do mês, com teste sem gravar ou
   publicação imediata (ignora dia, horário e limite).
6. **Configurações** (`/admin/config`): robô ligado, matérias por dia, janela de horário, mínimo de
   palavras e editorias permitidas (reviews fica de fora: consenso da crítica ainda não automatizado).

## Editor do corpo (texto ⇄ blocos, `app/lib/admin/body-text.ts`)

```
Parágrafos separados por linha em branco. Links: [texto](url)
## Intertítulo            ### Subtítulo
- item de lista            > citação
![texto alternativo](/media/...webp "Imagem: reprodução/IGN") =1600x900
@video(abcdefghijk) Título do vídeo
```

## Testes (2026-11-11, local: MySQL em memória + Edge headless)

Senha errada recusada; login; painel; lista e filtro; corpo convertido para texto e salvo sem perder
vídeo/imagem; edição aparece no site; tirar do ar → 404; publicar de novo; descartar pauta; fontes;
histórico do robô com rascunho; salvar configurações; celular sem rolagem lateral; sair; POST de
outro site recusado; bloqueio após 5 senhas erradas.

## Matéria manual e envio de imagens (2026-11-12)

- **Nova matéria** (`/admin/materias/nova`): editoria + título → rascunho `origin = manual` → editor.
  Enquanto nunca foi publicada, editoria e endereço acompanham o título (`updateDraftAddress`).
- **Publicar** exige corpo e capa salvos.
- **Enviar imagem** (`POST /admin/upload`, só admin, até 10 MB, JPG/PNG/WebP/AVIF/GIF): vira WebP até
  1600 px em `/media` (`storeUpload`). "Enviar capa" preenche o campo da capa; "Enviar imagem para o
  corpo" insere `![Descreva a imagem](/media/... "Imagem: ") =LxA` onde está o cursor (troque o texto
  alternativo e o crédito).
- Testado localmente: criar, barrar publicação sem corpo/capa, enviar capa e imagem do corpo, salvar,
  publicar, endereço pelo título, página pública com a imagem; envio sem login redireciona ao login.

## Pré-visualização (2026-11-12)

- No editor de rascunho/arquivada, "pré-visualizar ↗" abre `/<editoria>/<slug>?previa=1`: a página
  pública com o visual do site e uma faixa "PRÉ-VISUALIZAÇÃO · RASCUNHO · SÓ VOCÊ VÊ ESTA PÁGINA".
  Mostra a última versão **salva**.
- Só com sessão de admin (`isAdmin`); sem ela o parâmetro é ignorado e o rascunho segue 404.
- `Cache-Control: private, no-store`, `X-Robots-Tag` e meta `noindex`; não conta visita.
- Rascunho sem data usa a hora atual. Testado localmente (anônimo 404, admin 200, cabeçalhos, celular).
