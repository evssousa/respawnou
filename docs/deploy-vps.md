# Deploy na VPS (Coolify)

Status: ✅ no ar na VPS desde **2026-11-26** (virada às 13:06–13:30 de Brasília). Antes: Hostinger Cloud Startup
([deploy-hostinger.md](deploy-hostinger.md), agora histórico). Plano e andamento completos: [migracao-vps.md](migracao-vps.md).

| Item | Valor |
|---|---|
| Servidor | VPS Hostinger KVM 1 (1 vCPU, 4 GB, swap 4 GB), Ubuntu 24.04, IPv4 `189.24.17.85` (sem AAAA), compartilhada com o criasite |
| Painel | Coolify 4 em `https://painel.criasite.app` (2FA). Acesso de emergência: SSH root só por chave |
| App | projeto `respawnou` → app `respawnou` (uuid `flq1qcdivqix2fwh8rrqtshq`), build pelo `Dockerfile`, porta 3000, healthcheck `/robots.txt`, 1.280 MB, `cpu_shares` 512 |
| Deploy | **auto-deploy a cada push** na `main` (GitHub App `coolify-sites-evssousa`), troca sem queda |
| Domínios | `https://respawnou.com.br` (principal), `https://www.respawnou.com.br` (301), `https://respawnou.189-24-17-85.sslip.io` (ensaio, noindex; tirar em 7 dias) |
| SSL | Let's Encrypt pelo Traefik do Coolify, renovação automática |
| Banco | MariaDB 11.8 compartilhado `mariadb-sites` (projeto `bancos`), banco e usuário `respawnou`; `DB_HOST` = `djg6eojhrivnayhax7ohoszd`. Migrations rodam a cada início do app |
| Mídia | `/srv/sites/respawnou/media` no servidor → `/data/media` no container (imagens, artes do Instagram, vídeos) |
| Variáveis | 17, cadastradas no app do Coolify (só `VITE_SITE_URL` no build). Cópia local do dono em `projetos\_segredos\respawnou-vps.env` |
| Tarefas | Scheduled Tasks (UTC): `coletar` `0,30 * * * *` (também move a fila do Instagram e a de vídeos), `publicar` `5 * * * *`; `curl` com o `CRON_TOKEN` dentro do container |
| Vídeos | ffmpeg-static dentro da imagem. Sem o limite de processos da hospedagem: 35 s de vídeo montam em ~36 s |
| Backup | banco: todos os bancos, diário `30 6 * * *` UTC, 14 cópias locais |

## Rótulos do proxy (atenção)

Redirecionamentos 301 por **rótulos próprios** (gerenciamento automático desligado): `permanent=true` no
`to-non-www` e no `redirect-to-https`. O middleware `redirect-to-https` é **compartilhado por todos os apps** da VPS:
se um app o declarar diferente, todo http da VPS dá 503. Para trocar domínio: ligar "Readonly labels", salvar o
domínio, deixar o Coolify gerar os rótulos, aplicar de novo as duas linhas `permanent=true`, desligar o automático e
conferir `curl -sI http://criasite.app/x` → 301.

## Comandos úteis (SSH `root@189.24.17.85`, chave `~/.ssh/criasite_vps`)

- Logs do app: `docker logs --since 1h $(docker ps -qf name=flq1qcdivqix2fwh8rrqtshq)`
- Robô à mão: `docker exec <container> sh -c 'curl -s -H "x-cron-token: $CRON_TOKEN" http://127.0.0.1:3000/api/cron/status'`
- SQL: `docker exec -it djg6eojhrivnayhax7ohoszd sh -c 'mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" respawnou'`
- Teste de vídeo sem crédito: `docker exec -e VIDEO_TESTE=1 <container> sh -c "npx -y tsx scripts/video/teste-local.ts"`

## Site antigo na Hostinger

**Apagado em 2026-11-26** (17:06 UTC) com o ok do dono; não há mais volta. A exclusão apagou arquivos e banco antigos e o
registro `ftp` da zona, e mudou o TTL do `@` para 1800; `@` e `www` (A da VPS), MX, SPF, DKIM, DMARC e a verificação do
Google ficaram. A caixa `contato@respawnou.com.br` (pedido "Free Business Email", separado, até 2027-11-14) continua ativa.
