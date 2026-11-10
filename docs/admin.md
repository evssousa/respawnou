# Painel administrativo (/admin)

Status: ⏳ a construir (fase 3).

## Acesso

- Só existe o admin; não há contas de usuário.
- URL `/admin`, fora dos menus, `Disallow: /admin` no robots.txt e `noindex` nas páginas.
- Login com e-mail e senha vindos de variáveis de ambiente (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`
  em bcrypt/scrypt, nunca a senha em texto).
- Sessão em cookie assinado (`SESSION_SECRET`), `HttpOnly`, `Secure`, `SameSite=Lax`, expira em 7 dias.
- Limite de tentativas de login (por IP) para evitar força bruta.

## Telas (primeira versão)

1. **Painel**: posts hoje/semana, última execução do robô (ok/erro), itens na fila.
2. **Posts**: lista com filtro por editoria/status; editar título, linha fina, corpo, capa; publicar,
   despublicar, destacar na home.
3. **Fontes**: feeds RSS (ativar/desativar, adicionar).
4. **Robô**: histórico de `cron_runs`, botão "coletar agora" e "publicar agora".
5. **Configurações**: posts por dia, editorias permitidas para o robô.
