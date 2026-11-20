// Textos de SEO das páginas /arcade/<jogo> (docs/crescimento.md, frente 1). Ficam num arquivo só do servidor
// porque arcade.ts vai para o pacote do navegador (home e lista) e 13 textos longos pesariam em todas as páginas.
// Regras: pt-BR do site, sem repetir frases entre jogos, marcas de terceiros só como história no texto
// (nunca em title, h1Line ou description), dicas conferidas com as regras reais de app/arcade/<slug>.ts.
import type { Block } from "./types";

export interface ArcadeSeo {
  /** Até 50 caracteres (o seo() acrescenta " | Respawnou"). */
  title: string;
  /** 140 a 158 caracteres, com a palavra-chave no começo. */
  description: string;
  /** Linha pequena do H1, até 44 caracteres. */
  h1Line: string;
  keyword: string;
  /** "Sobre o jogo": 150 a 300 palavras. */
  about: Block[];
}

const p = (text: string): Block => ({ type: "p", text });
const h2 = (text: string): Block => ({ type: "h2", text });
const ul = (...items: string[]): Block => ({ type: "ul", items });

export const ARCADE_SEO: Record<string, ArcadeSeo> = {
  sudoku: {
    title: "Sudoku online grátis: fácil, médio e difícil",
    description: "Jogue sudoku online grátis, direto no navegador: quadros 9x9 sem fim, do fácil ao difícil, com anotações e 3 vidas. Sem baixar nada e sem cadastro.",
    h1Line: "SUDOKU ONLINE GRÁTIS · FÁCIL AO DIFÍCIL",
    keyword: "sudoku online",
    about: [
      p("O sudoku é um quebra-cabeça de lógica em que você preenche uma grade 9x9 com os números de 1 a 9, sem repetir nenhum na mesma linha, coluna ou quadrado de 3x3. Aqui os quadros nunca acabam: resolveu um, vem outro, e a dificuldade sobe sozinha."),
      h2("Dicas para resolver mais rápido"),
      ul(
        "Comece pelos números que mais aparecem no quadro: eles deixam menos opções para as casas vazias.",
        "Procure o \"único possível\": uma casa em que só um número cabe, olhando a linha, a coluna e o quadrado dela.",
        "Ligue o botão ANOTAR e marque os candidatos pequenos em vez de chutar. Cada número certo some das anotações vizinhas.",
        "Lembre que um número errado não entra e custa uma das 3 vidas. Na dúvida, anote.",
      ),
      h2("De onde vem o sudoku"),
      p("O formato atual foi popularizado no Japão nos anos 1980, com o nome que significa algo como \"número único\". A ideia, porém, é mais antiga e chegou a circular no Ocidente como \"Number Place\". Hoje é um dos passatempos de lógica mais jogados do mundo, e funciona bem em partidas rápidas de poucos minutos."),
    ],
  },
  "campo-minado": {
    title: "Campo Minado online grátis, sem fim",
    description: "Jogue campo minado online grátis no navegador: abra as casas, marque as minas com bandeira e encare campos novos com mais minas. Funciona no celular.",
    h1Line: "CAMPO MINADO ONLINE GRÁTIS · SEM FIM",
    keyword: "campo minado online",
    about: [
      p("No campo minado, cada número mostra quantas minas existem nas 8 casas ao redor. Com essa pista e um pouco de dedução, você abre o campo inteiro sem pisar em nenhuma. Quando limpa um campo, vem outro com mais minas, de 10 até 32."),
      h2("Dicas para não explodir"),
      ul(
        "O primeiro toque de cada campo nunca é mina, então comece abrindo uma casa no meio.",
        "Um número 1 com uma única casa fechada ao redor significa que ali está a mina: marque a bandeira.",
        "O padrão 1-2-1 numa borda costuma indicar minas nas duas casas das pontas, e a do meio fica livre.",
        "Quando um número já tem todas as bandeiras ao redor, toque nele para abrir os vizinhos de uma vez.",
      ),
      h2("Um clássico dos computadores de escritório"),
      p("O jogo ficou famoso por vir instalado em muitos computadores nos anos 1990 e virou o passatempo oficial de intervalos de trabalho e aulas de informática. A versão do Respawnou mantém a regra original e adiciona pontos por casa aberta, bônus por campo limpo e fases que ficam mais apertadas."),
    ],
  },
  paciencia: {
    title: "Paciência online grátis (Klondike)",
    description: "Jogue paciência online grátis no navegador: o clássico Klondike de cartas com mãos sem fim, toque para mover e arraste. Sem baixar e sem cadastro.",
    h1Line: "PACIÊNCIA ONLINE GRÁTIS · KLONDIKE VIRA 1",
    keyword: "paciência online",
    about: [
      p("A paciência Klondike é o jogo de cartas de um jogador que todo mundo conhece: você monta as quatro pilhas de cima por naipe, do Ás ao Rei, e usa as sete colunas para ajeitar as cartas pelo caminho. Aqui o monte vira uma carta por vez, e uma mão completa vale 500 pontos."),
      h2("Dicas para fechar mais mãos"),
      ul(
        "Abra primeiro as colunas com mais cartas viradas para baixo: elas escondem mais opções.",
        "Esvazie uma coluna cedo. Coluna vazia só aceita Rei, então guarde o espaço para ele.",
        "Evite subir cartas para as pilhas de cima cedo demais: um 5 lá em cima pode fazer falta numa coluna.",
        "Toque numa carta e ela vai sozinha para o melhor lugar. Se preferir, arraste.",
      ),
      h2("Um jogo que acompanha o computador"),
      p("A paciência ganhou fama ao vir junto com o sistema de muitos computadores e se tornou o primeiro contato de muita gente com o mouse. Aqui os pontos acumulam mão após mão, até você tocar em ENCERRAR."),
    ],
  },
  memoria: {
    title: "Jogo da memória online grátis, com fases",
    description: "Jogo da memória online grátis: vire as cartas, ache os pares e passe de fase com cada vez mais cartas, de 6 a 36. Bom para todas as idades, sem cadastro.",
    h1Line: "JOGO DA MEMÓRIA ONLINE · 6 A 36 CARTAS",
    keyword: "jogo da memória online",
    about: [
      p("O jogo da memória é simples de aprender e difícil de dominar: você vira duas cartas por vez e precisa lembrar onde está cada símbolo para formar pares. A cada fase completa entram mais cartas, de 6 até 36, e você ganha uma vida de volta."),
      h2("Como memorizar melhor"),
      ul(
        "Grave a posição, não só a figura: pense em linha e coluna, como num mapa.",
        "Vire primeiro as cartas de uma mesma região, para criar um caminho fácil de lembrar.",
        "Se a primeira carta que você virou já tinha aparecido, vá direto no par dela. Aqui, errar quando dava para acertar custa vida.",
        "Associe cada símbolo a uma palavra ou história curta: ajuda quando a grade fica grande.",
      ),
      h2("Para jogar com quem estiver por perto"),
      p("Esse tipo de jogo também é conhecido como \"concentração\" e é um dos passatempos mais usados para treinar a atenção, de crianças a adultos. As partidas são curtas, então dá para revezar o celular ou o teclado e ver quem chega mais longe."),
    ],
  },
  "caca-palavras": {
    title: "Caça-palavras online grátis de games",
    description: "Caça-palavras online grátis com palavras do mundo dos games: arraste para marcar, ganhe bônus de tempo e encare rodadas com mais palavras e direções.",
    h1Line: "CAÇA-PALAVRAS ONLINE · PALAVRAS DE GAMES",
    keyword: "caça-palavras online",
    about: [
      p("Neste caça-palavras, as palavras escondidas na grade vêm do mundo dos games, e o relógio corre no topo da tela. Achou todas, o tempo que sobrou vira bônus e já começa outra rodada, com mais palavras e mais direções."),
      h2("Dicas para achar mais rápido"),
      ul(
        "Varra a grade procurando a primeira letra mais rara da palavra, como Z, X ou K, e só depois confira as vizinhas.",
        "Comece pelas palavras mais longas: elas são mais fáceis de reconhecer no meio das letras.",
        "Nas primeiras rodadas as palavras ficam na horizontal e na vertical. Depois entram as diagonais e as de trás para frente, então olhe nas oito direções.",
        "Arraste do começo ao fim da palavra. No teclado, use as setas e confirme com a barra de espaço.",
      ),
      h2("Um passatempo de revista que virou jogo"),
      p("O caça-palavras nasceu nas páginas de revistas e jornais e continua popular porque treina a atenção sem exigir regra nenhuma. Aqui a lista é só de termos de games, o que o torna um bom jeito de relaxar entre uma partida e outra."),
    ],
  },
  pinball: {
    title: "Pinball online grátis no navegador",
    description: "Jogue pinball online grátis no navegador: dois rebatedores, bumpers, alvos para acender e multiplicador até x5. Funciona no PC e no celular, sem baixar.",
    h1Line: "PINBALL ONLINE GRÁTIS · 3 BOLAS",
    keyword: "pinball online",
    about: [
      p("O pinball, também chamado de fliperama de mesa, é o jogo da bolinha de metal que sobe, bate, desce e precisa ser rebatida antes de cair. Esta mesa tem três bolas, três bumpers de 100 pontos e cinco alvos no alto: acenda todos para ganhar bônus e subir o multiplicador até x5."),
      h2("Dicas para segurar a bola"),
      ul(
        "Bata na bola com a ponta do rebatedor para ela subir com mais força, e com a base para ela subir mais mansa.",
        "Não bata em qualquer bola que desce: espere ela chegar perto do rebatedor.",
        "Mire nos alvos de cima enquanto o multiplicador está alto, porque ele zera quando a bola cai.",
        "No celular, toque na metade esquerda ou direita da tela para acionar o rebatedor de cada lado.",
      ),
      h2("Nos fliperamas de antigamente"),
      p("O pinball vem dos fliperamas e bares do século passado, quando as mesas eram mecânicas e cheias de luzes. A versão do Respawnou usa física própria, feita para responder bem ao teclado e ao toque."),
    ],
  },
  "cabo-de-forca": {
    title: "Cabo de Força: jogo da cobrinha online",
    description: "Jogo da cobrinha online grátis: o cabo anda sozinho, você escolhe para onde vira. Pegue as pilhas, cresça sem bater e bata seu recorde. Funciona no celular.",
    h1Line: "JOGO DA COBRINHA ONLINE · ESTILO SNAKE",
    keyword: "jogo da cobrinha online",
    about: [
      p("No Cabo de Força, você controla um cabo que anda sozinho e cresce a cada pilha verde que pega. Cada pilha vale 10 pontos e acelera um pouco o ritmo; a cada 5 pilhas aparece uma dourada que vale 50, mas some em 6 segundos."),
      h2("Dicas para não se enrolar"),
      ul(
        "Ande pelas bordas enquanto o cabo for curto e deixe o meio livre para manobras.",
        "Faça curvas largas: curva fechada demais encosta no próprio cabo.",
        "Pense uma jogada à frente. Antes de pegar uma pilha, veja por onde vai sair.",
        "Vale arriscar a pilha dourada quando ela está perto, porque ela some rápido.",
      ),
      h2("O jogo que marcou os primeiros celulares"),
      p("Esse estilo de jogo ficou conhecido nos celulares dos anos 1990, quando a cobrinha era o passatempo de toda fila e de todo ônibus. A regra continua a mesma: bateu na parede ou no próprio corpo, acabou. A diferença é que aqui o cabo acelera a cada pilha, então a calma do começo vira pressa no fim."),
    ],
  },
  "quebra-pixel": {
    title: "Quebra-Pixel: quebrar blocos online grátis",
    description: "Jogo de quebrar blocos online grátis: raquete, bolinha e fases infinitas, com blocos que aguentam mais de uma batida. Sem baixar nada, funciona no celular.",
    h1Line: "JOGO DE QUEBRAR BLOCOS · FASES INFINITAS",
    keyword: "jogo de quebrar blocos online",
    about: [
      p("O Quebra-Pixel é o jogo de raquete e bolinha em que você derruba todos os blocos para passar de fase. As fases nunca acabam e a bola fica mais rápida a cada uma. Você tem 3 vidas e ganha uma a cada três fases, até o máximo de 5."),
      h2("Dicas para limpar a tela"),
      ul(
        "Rebata com a ponta da raquete para a bola sair mais inclinada, e com o centro para ela subir reta.",
        "Os blocos laranja aguentam duas batidas e os vermelhos, três. Quebre os de cima primeiro para abrir caminho.",
        "Abra um túnel pelas laterais: a bola que passa por cima dos blocos limpa a tela sozinha.",
        "Mantenha a raquete no meio, perto de onde a bola costuma voltar.",
      ),
      h2("Um gênero com décadas de história"),
      p("Os jogos de quebrar tijolos fazem parte dos primeiros sucessos dos fliperamas e dos computadores domésticos, ainda nos anos 1970. Este aqui traz o visual de pixels e a regra de sempre, com um ritmo que pede reflexo."),
    ],
  },
  meteoros: {
    title: "Chuva de Meteoros: jogo de nave online",
    description: "Jogo de nave online grátis: a nave atira sozinha e você desvia dos meteoros, pega tiro triplo e escudo e sobrevive à chuva. Sem baixar, funciona no celular.",
    h1Line: "JOGO DE NAVE ONLINE · DESVIE E ATIRE",
    keyword: "jogo de nave online",
    about: [
      p("Na Chuva de Meteoros, a nave atira sem parar e você só precisa mover e desviar. Os meteoros grandes aguentam vários tiros e se partem em dois menores quando quebram, e a chuva aperta com o tempo. Você tem 3 vidas."),
      h2("Dicas para durar mais"),
      ul(
        "Fique perto da parte de baixo e mova-se aos poucos: movimentos curtos desviam melhor que corridas.",
        "Quebre os meteoros grandes em local seguro, porque os pedaços vão em direções diferentes.",
        "Pegue o item 3 para tiro triplo por 8 segundos e o E para um escudo que aguenta uma batida.",
        "Depois de uma batida, a nave pisca e fica protegida por um instante. Use esse tempo para sair da confusão.",
      ),
      h2("A herança dos jogos de asteroides"),
      p("Atirar em rochas espaciais é um dos pontos de partida dos videogames e continua funcionando por um motivo simples: é fácil de entender e difícil de dominar. Aqui a nave atira sozinha para que a atenção fique toda em escolher o caminho."),
    ],
  },
  trinca: {
    title: "Trinca: jogo de combinar 3 peças online",
    description: "Jogo de combinar 3 peças online grátis: alinhe três iguais antes que o relógio zere, faça cascatas e ganhe pontos extras. Funciona no PC e no celular.",
    h1Line: "COMBINE 3 PEÇAS · CONTRA O RELÓGIO",
    keyword: "jogo de combinar 3",
    about: [
      p("A Trinca é um jogo de combinar três peças: você troca duas peças vizinhas para formar linhas de 3 ou mais iguais, na horizontal ou na vertical. Cada peça quebrada devolve meio segundo ao relógio, e linhas de 4 e 5 valem pontos extras."),
      h2("Dicas para fazer cascatas"),
      ul(
        "Olhe primeiro para baixo: combinações perto do fundo mexem em mais peças e geram cascatas.",
        "Quando as peças que caem formam novas linhas, os pontos são multiplicados. Procure jogadas que preparem isso.",
        "Procure linhas de 4 e de 5. Elas rendem mais pontos e mais tempo no relógio.",
        "Ficou parado? Depois de alguns segundos o jogo mostra uma dica de jogada.",
      ),
      h2("O jogo de combinar peças"),
      p("O estilo \"match-3\" virou um dos mais populares dos celulares e dos jogos de navegador. Aqui ele ganha uma corrida contra o relógio, que fica cada vez mais rápido, e peças com formatos diferentes, que ajudam quem tem dificuldade de distinguir cores."),
    ],
  },
  mira: {
    title: "Mira: teste de reflexo e treino de mira",
    description: "Teste de reflexo online grátis e treino de mira: acerte os alvos antes que sumam, faça sequências e evite as bombas. Funciona no PC e no celular.",
    h1Line: "TESTE DE REFLEXO · TREINO DE MIRA",
    keyword: "teste de reflexo online",
    about: [
      p("Na Mira, alvos aparecem pela tela e vão encolhendo até sumirem. Você clica ou toca antes disso. Acertar o centro vale mais, e a cada 5 acertos seguidos o multiplicador sobe. É ao mesmo tempo um teste de reflexo e um treino de mira."),
      h2("Dicas para acertar mais"),
      ul(
        "Mire sempre no centro: o acerto \"NA MOSCA\" vale mais e ajuda a subir o multiplicador.",
        "Priorize os alvos que estão quase sumindo. Cada alvo que some tira uma das suas 3 vidas.",
        "O alvo dourado vale 50 pontos, mas é pequeno e some rápido. Só vá nele se estiver perto.",
        "Não clique na bomba vermelha com X. Errar o tiro não tira vida, mas zera a sequência.",
      ),
      h2("Por que treinar mira ajuda"),
      p("Em jogos de tiro, a diferença costuma estar no tempo entre ver o alvo e levar o cursor até ele. Treinar essa ligação entre olho e mão, de forma leve e em partidas curtas, ajuda a ganhar confiança com mouse e com o toque."),
    ],
  },
  torre: {
    title: "Torre: jogo de empilhar blocos online",
    description: "Jogo de empilhar blocos online grátis: solte no tempo certo, encaixe perfeito e construa uma torre sem limite. Funciona no PC e no celular, sem cadastro.",
    h1Line: "EMPILHE BLOCOS · TORRE SEM LIMITE",
    keyword: "jogo de empilhar blocos online",
    about: [
      p("Na Torre, um bloco passa de um lado para o outro em cima da construção. Você solta no momento certo para encaixar. O que ficar para fora é cortado, e o próximo bloco vem com a largura que sobrou. Cada andar vale um ponto, e os blocos ficam mais rápidos conforme a torre cresce."),
      h2("Dicas para subir mais"),
      ul(
        "Olhe para a borda da torre e não para o bloco: é ali que o encaixe se decide.",
        "Encaixe perfeito não perde nada. Três perfeitos seguidos devolvem um pedaço da largura.",
        "Pegue o ritmo do bloco antes de soltar. Ele repete o movimento, então conte mentalmente.",
        "Quando a largura estiver muito pequena, não tenha pressa: espere o bloco passar bem em cima da torre.",
      ),
      h2("Um jogo de timing"),
      p("Jogos de empilhar com um único botão fazem sucesso porque qualquer pessoa entende em segundos e quase ninguém consegue passar de certo ponto sem treino. É um bom jogo para partidas de um minuto."),
    ],
  },
  respawn: {
    title: "Respawn: corredor infinito online grátis",
    description: "Jogo de corrida infinita online grátis em pixel art: pule blocos e buracos, desvie dos drones e bata seu recorde. Funciona no PC e no celular, sem baixar.",
    h1Line: "CORREDOR INFINITO · PULE E DESVIE",
    keyword: "jogo de corrida infinita online",
    about: [
      p("No Respawn, o personagem corre sozinho e a velocidade aumenta com a distância. Cabe a você pular os blocos e os buracos no chão e decidir o que fazer com os drones vermelhos que voam baixo. Cada metro conta ponto."),
      h2("Dicas para ir mais longe"),
      ul(
        "Segure o pulo para saltar mais alto e solte cedo para um pulo curto. Use o curto para obstáculos baixos.",
        "Os drones voam baixo: quem fica no chão passa por baixo, quem pula bate neles.",
        "Aprenda o ritmo dos obstáculos antes de a velocidade subir demais.",
        "Caiu? O jogo volta na hora, então tente de novo sem pensar muito.",
      ),
      h2("O que é um endless runner"),
      p("O gênero dos corredores infinitos é um dos mais comuns em celular: a fase não tem fim, só fica mais rápida, e a graça é bater o próprio recorde. O nome do jogo vem do termo \"respawn\", que nos games significa renascer depois de cair."),
    ],
  },
};
