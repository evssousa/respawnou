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
- [ ] Banner de consentimento de cookies (CMP certificada pelo Google, exigida para Brasil/UE)
- [ ] `ads.txt` na raiz do site
- [ ] Política de privacidade e de cookies atualizadas citando o AdSense
- [ ] Nenhuma página vazia (editorias sem posts mostram conteúdo útil ou ficam fora do menu)

## Monitorar depois da aprovação

- Search Console: queda brusca de páginas indexadas é sinal de alerta de "conteúdo de baixo valor".
- Taxa de descarte do robô (itens ignorados por falta de substância) visível no admin.
