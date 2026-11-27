# Matérias patrocinadas: decisões do dono (antes do plano)

Combinado no chat de planejamento em 2026-11-27. Este arquivo é a **entrada do `planejador`**: o plano completo
(`patrocinado.md`) deve partir daqui e não contrariar nada abaixo sem perguntar ao dono.

## Por quê
Os sites (principalmente animeprofile e respawnou) recebem muitos e-mails de gente querendo publicar matérias que
divulgam algo seu. Em vez de publicar de graça, cobrar, para ajudar a pagar os custos dos sites.

## Escopo e ordem
- **Um plano só para os 4 sites**, como módulo copiável (mesmo padrão de `app/visitas/` e `app/analytics/`).
- Ordem: **respawnou (piloto)** → **animeprofile** → vibecoin e criasite.
- O plano fica em `respawnou/docs/patrocinado.md`, com uma parte "como copiar para os outros sites".
- Ligar ao mídia kit em "Anuncie" (piloto do mídia kit: `criasite/docs/midia-kit.md`, Partes G e H).

## Fluxo
1. O pedido continua chegando **por e-mail**. Não existe página pública de envio.
2. O dono responde com um **texto pronto** (3 linhas) e um **link pessoal**, que expira (7 dias), fica fora do menu e do sitemap e tem `noindex`.
3. No link, a pessoa escreve ou cola o texto, envia imagens e links, escolhe o pacote e o tempo no ar e lê as perguntas frequentes.
4. **Pré-checagem com IA** (Gemini, como no robô): lista de recusa, tamanho, quantidade de links, texto copiado. O resultado vai para o dono, não para o cliente.
5. O dono **aprova, pede ajuste ou recusa no `/admin`**. Ajuste e recusa usam **motivos prontos** e o e-mail sai sozinho.
6. **Só depois de aprovar** sai o link de pagamento (o cliente nunca paga por algo recusado: não há reembolso a fazer).
7. O pagamento confirmado (aviso automático do Mercado Pago) publica a matéria, na hora ou agendada, e envia um **recibo automático** por e-mail.
8. **15 dias antes de vencer**, sai um e-mail automático oferecendo prorrogar. Ao vencer, a matéria sai do ar e do sitemap; link pago vencido nunca fica no ar.

**Regra do dono:** o mínimo de contato com o cliente, tudo automático. **Sem relatório de visitas para o cliente.**

## Preços (do dono)
| Pacote | Preço | Limites sugeridos (confirmar no plano) |
|---|---|---|
| Matéria pequena | R$ 49,90 | até ~400 palavras, 1 imagem, 1 link |
| Matéria maior | R$ 89,90 | até ~1.000 palavras, até 4 imagens, até 3 links |

Tempo no ar: 6 meses incluído · 12 meses + R$ 19,90 · permanente + R$ 39,90.
- **Preço por site configurável** no `/admin` (o site com mais visitas pode cobrar mais).
- **Pacote de 3 matérias** com desconto, para quem divulga com frequência.
- Os preços subiram de R$ 9,90/29,90 para os valores acima porque preço baixo atrai pedido ruim e toma tempo de revisão.

## Extras (2ª etapa, depois do piloto)
Destaque na home por 7 dias · post no Instagram/Stories · "escrito pela redação" (a partir do briefing) · **Reel narrado no respawnou** (usa a geração de vídeos que já existe).

## Pagamento
- **Mercado Pago** (decisão do dono), conta no **CPF** (não há CNPJ), **Pix e cartão**, Checkout Pro (o cartão não passa pelo servidor), aviso automático de pagamento.
- O nome do dono não deve aparecer: configurar o nome do site no pagamento e na fatura do cartão. No Pix o recebedor sempre aparece de alguma forma (no mínimo, nome abreviado ou CPF mascarado): fazer um **pagamento de teste de R$ 1** e conferir no app do banco antes de abrir.
- Imposto: como pessoa física, o valor entra no carnê-leão. Avaliar MEI de publicidade com um contador quando o volume crescer (não trava o piloto).

## Regras de conteúdo
- Selo **"Publicidade"** ou **"Patrocinado"** na matéria (CONAR e AdSense) e todos os links pagos com `rel="sponsored"` (regra do Google).
- **Lista de recusa:** bets e cassino, cripto com promessa de ganho, remédios, conteúdo adulto, outros sites de notícia. No vibecoin, cuidado dobrado (publicidade de finanças/cripto); no animeprofile, público jovem.
- **Independência:** patrocínio nunca compra nota de review, consenso da crítica nem lugar em "Top 5". Isso vai escrito nos termos e no mídia kit.
- Página curta de **termos do conteúdo patrocinado** (regras, recusa sem custo, tempo no ar, sem reembolso depois de publicado).

## Painel
- Fila de pedidos no `/admin` (pré-checagem da IA, aprovar, pedir ajuste ou recusar com motivo pronto).
- Tela **Receita** (no animeprofile, o item já existe na barra do painel).
