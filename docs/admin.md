# Painel administrativo (/admin)

Status: ✅ construído e testado (2026-11-11). Falta o dono cadastrar as 3 variáveis abaixo no hPanel.

## Acesso

- Só existe o admin; não há contas de usuário.
- URL `/admin`, fora dos menus, `Disallow: /admin` no robots.txt, `noindex` nas páginas e
  `X-Robots-Tag: noindex` + `Cache-Control: no-store` (middleware no `server-app.js`).
- Variáveis de ambiente (hPanel → Node.js → Variáveis de ambiente):
  - `ADMIN_EMAIL` — e-mail de login;
  - `ADMIN_PASSWORD_HASH` — hash **scrypt** da senha (nunca a senha), gerado com `npm run admin:hash`
    no computador do dono (pede a senha sem mostrar e imprime as variáveis);
  - `SESSION_SECRET` — 32+ caracteres aleatórios (o mesmo script gera).
  Sem as três, `/admin/login` mostra "Painel ainda não configurado".
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
2. **Matérias** (`/admin/materias`): busca, filtro por editoria e status, paginação.
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
   execuções com detalhes; atualiza sozinho a cada 5 s enquanto algo roda.
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

## Próximos passos

- Enviar imagem própria (upload) para a capa e o corpo.
- Criar matéria manual do zero (hoje edita as existentes).
