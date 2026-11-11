# Estratégia para o AdSense

Objetivo: um site que publica sozinho, sem intervenção humana diária, e que ainda assim seja
aprovado e mantido no AdSense.

## O que o Google diz (resumo)

- Conteúdo feito com IA **não é proibido**. O que é punido é conteúdo feito "para ranquear" sem
  valor para quem lê.
- A política de spam **"scaled content abuse"** pega sites que produzem muitas páginas reescrevendo
  outras fontes sem acrescentar nada. É o maior risco de um site automático.
- O AdSense reprova com frequência por **"conteúdo de baixo valor"**: páginas finas, conteúdo
  copiado ou reescrito, site com poucas páginas, navegação ruim.
- Não existe garantia de aprovação. O plano abaixo reduz o risco; não o elimina.

## Regras do robô (valem para todo post automático)

1. **Acrescentar algo**: todo post combina pelo menos 2 elementos além da notícia de origem:
   contexto (o que veio antes), dados do jogo (plataformas, data, estúdio), links internos para a
   ficha do jogo, calendário ou outras matérias, e "o que isso muda para quem joga no Brasil"
   (preço em reais, legenda/dublagem PT-BR, horário de Brasília).
2. **Nunca copiar**: nada de traduzir parágrafo por parágrafo. O texto é escrito do zero a partir dos
   fatos; citações diretas, só curtas e entre aspas, com crédito.
3. **Fonte sempre creditada** com link no fim do texto.
4. **Tamanho mínimo**: ~350 palavras em notícias; listas e guias mais longos. Se a fonte não tiver
   substância para isso, o item é descartado (não vira post).
5. **Sem invenção**: o modelo só usa fatos presentes nas fontes. Datas, preços e números são
   checados contra a fonte antes de publicar (validação automática no robô).
6. **Volume moderado e constante**: ~4 posts/dia, espalhados ao longo do dia. Nada de lotes de 50.
7. **Deduplicação**: a mesma notícia vinda de 3 sites vira 1 post (agrupamento por jogo + assunto).
8. **Transparência**: a política editorial explica o uso de IA; o autor aparece como "Redação Respawnou".
9. **Nada de review falsa**: a editoria Reviews é "consenso da crítica" (ver decisoes.md).

## Páginas que dão "cara de site de verdade" (já existem)

Sobre, Contato, Política editorial, Como avaliamos, Termos, Privacidade, Cookies, Acessibilidade,
FAQ, Mapa do site. Menu claro, busca, sitemap.xml, RSS.

## Conteúdo que só o Respawnou tem (diferencial, também automatizável)

- **Fichas de jogos** com tudo sobre o jogo num lugar (matérias, data, plataformas).
- **Calendário de lançamentos** com contagem regressiva.
- **Jogos grátis da semana** e promoções, com prazo.
- **Consenso da crítica** com média e links.

Essas páginas são geradas a partir de dados (RAWG/IGDB, lojas) e não reescrevem ninguém.
É o que diferencia o site de um "agregador de RSS".

## Checklist antes de pedir o AdSense

- [ ] Domínio próprio no ar há algumas semanas, com HTTPS
- [ ] Pelo menos ~30–40 posts publicados, de várias editorias, todos com 350+ palavras
- [ ] Imagens de capa com crédito (sem imagens "quebradas" ou placeholders)
- [ ] Search Console configurado, sitemap enviado, páginas indexadas
- [x] Banner de consentimento de cookies (próprio, LGPD + Modo de Consentimento v2) — 2026-11-11
- [ ] Mensagem de consentimento do Google para Europa/Reino Unido (ver "Ao ser aprovado" abaixo)
- [x] `ads.txt` na raiz do site (gerado a partir de `ADSENSE_CLIENT`) — 2026-11-11
- [x] Política de privacidade, de cookies e termos citando o AdSense — 2026-11-11
- [x] Nenhuma página vazia: editoria/plataforma/calendário sem conteúdo some do menu, rodapé, home e
      sitemap e leva `noindex` (`app/lib/availability.ts`) — 2026-11-11
- [x] Imagem padrão de compartilhamento (`public/og-default.png`, 1200×630) e logo PNG no JSON-LD — 2026-11-11

## Como ligar os anúncios (`ADSENSE_CLIENT`)

Tudo fica desligado até existir a variável `ADSENSE_CLIENT` (ex.: `ca-pub-1234567890123456`, mostrada
pelo Google na inscrição). Cadastrar no hPanel → Node.js → Variáveis de ambiente (sem mexer nas outras).
O app reinicia e, sem novo build, passa a:

- carregar o Modo de Consentimento v2 (tudo **negado** por padrão) e o script do AdSense no `<head>`
  (nunca no `/admin`) — `app/lib/ads.ts`, `app/root.tsx`;
- responder `/ads.txt` com `google.com, pub-…, DIRECT, f08c47fec0942fa0` — `app/routes/ads-txt.ts`;
- mostrar o banner de cookies (`app/components/CookieConsent.tsx`): "Aceitar todos" libera anúncios
  personalizados; "Só os essenciais" mantém tudo negado (o Google ainda pode mostrar anúncios não
  personalizados). A escolha fica no `localStorage` (`respawnou_consent`); o link
  "Preferências de cookies" no rodapé reabre o banner. Mudar `CONSENT_VERSION` faz todos verem de novo.

Testado localmente em 2026-11-11 (Edge headless): banner na 1ª visita, consentimento negado por
padrão, aceitar/recusar atualiza o Modo de Consentimento, escolha lembrada, rodapé reabre, painel sem
anúncios, celular sem rolagem lateral.

## Ao ser aprovado

- No AdSense → Privacidade e mensagens, ativar a mensagem **"Regulamentos europeus"** (CMP do próprio
  Google, certificada e grátis). O Google exige CMP certificada para visitantes da Europa, Reino Unido e
  Suíça; ela só aparece para eles. O banner próprio cobre o Brasil (LGPD).
- Anúncios automáticos ("Auto ads") ou blocos manuais: decidir depois de ver o layout com anúncios.

## Monitorar depois da aprovação

- Search Console: queda brusca de páginas indexadas é sinal de alerta de "conteúdo de baixo valor".
- Taxa de descarte do robô (itens ignorados por falta de substância) visível no admin.
