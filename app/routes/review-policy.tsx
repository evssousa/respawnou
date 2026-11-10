import { Link } from "react-router";
import { cx } from "~/components/ui";
import { formatScore } from "~/lib/format";
import { StaticPage, TextLink, type DocSection } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { SITE } from "~/lib/site";

export const meta = () =>
  seo({ title: "Como avaliamos", description: `O que significa cada nota das reviews do ${SITE.name} e como chegamos a ela.`, path: "/como-avaliamos" });

// Faixas da escala. A barra mostra a nota de referência de cada faixa.
const SCALE: { score: number; display?: string; label: string; text: string }[] = [
  { score: 10, label: "Obra-prima", text: "Referência no gênero. Vai ser lembrado por anos." },
  { score: 9, label: "Excelente", text: "Pequenos defeitos que quase não atrapalham. Jogue." },
  { score: 8, label: "Ótimo", text: "Muito bom no que se propõe, com algumas arestas." },
  { score: 7, label: "Bom", text: "Diverte, mas tem problemas que você vai notar." },
  { score: 6, label: "OK", text: "Agrada aos fãs do gênero. Os outros podem esperar uma promoção." },
  { score: 5, label: "Mediano", text: "Acertos e erros na mesma medida." },
  { score: 4, label: "Fraco", text: "Os problemas pesam mais do que as qualidades." },
  { score: 3, label: "Ruim", text: "Difícil recomendar, mesmo para fãs." },
  { score: 1, display: "0–2", label: "Desastre", text: "De 0 a 2: quebrado ou sem nada que se salve." },
];

const sections: DocSection[] = [
  {
    id: "quem-avalia",
    title: "Quem avalia",
    body: (
      <p>
        Toda review do {SITE.name} é escrita por uma pessoa que jogou o jogo. Automação ajuda em notícias, mas nunca escreve uma review nem dá nota (veja a{" "}
        <TextLink to="/politica-editorial#automacao">política editorial</TextLink>).
      </p>
    ),
  },
  {
    id: "quanto-jogamos",
    title: "Quanto jogamos",
    body: (
      <p>
        Jogos com campanha são jogados até o fim da história principal. Em jogos sem fim definido, como multiplayer, serviços contínuos e simuladores, jogamos o
        suficiente para conhecer os modos principais, e o tempo de jogo aparece na review.
      </p>
    ),
  },
  {
    id: "o-que-pesa",
    title: "O que pesa na nota",
    body: (
      <>
        <p>Não existe fórmula com pesos fixos: um jogo de luta e um jogo narrativo são julgados pelo que tentam fazer. Em geral, olhamos:</p>
        <ul>
          <li>
            <strong>jogabilidade</strong>: controles, ritmo, desafio e se é divertido;
          </li>
          <li>
            <strong>conteúdo</strong>: história, variedade e o que o jogo entrega pelo preço;
          </li>
          <li>
            <strong>técnica</strong>: desempenho, bugs, visual e som na versão analisada;
          </li>
          <li>
            <strong>acessibilidade e localização</strong>: opções de acessibilidade e se tem legendas ou dublagem em português.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "versao",
    title: "Versão analisada",
    body: (
      <p>
        Cada review informa a plataforma em que o jogo foi jogado. Quando sabemos que outra versão é muito diferente (por exemplo, roda pior no Switch), avisamos no
        texto.
      </p>
    ),
  },
  {
    id: "copias",
    title: "Cópias de imprensa",
    body: (
      <p>
        Muitas reviews são feitas com cópias cedidas pelas empresas. Isso é informado no fim do texto e não influencia a nota. As empresas não leem a review antes
        da publicação.
      </p>
    ),
  },
  {
    id: "atualizacoes",
    title: "Atualizações e reavaliações",
    body: (
      <p>
        Jogos mudam depois do lançamento. A nota vale para a versão analisada. Se uma atualização mudar muito o jogo, para melhor ou para pior, podemos publicar
        uma reavaliação, sem apagar a review original.
      </p>
    ),
  },
];

export default function ReviewPolicy() {
  return (
    <StaticPage path="/como-avaliamos" title="Como" accent="avaliamos" lead="Uma nota de 0 a 10 e um veredito claro. Aqui está o que cada número quer dizer." sections={sections}>
      <section aria-labelledby="escala" className="flex flex-col gap-3">
        <h2 id="escala" className="font-mono text-xs font-bold text-acc">
          &gt; ESCALA DE NOTAS
        </h2>
        <ol className="flex flex-col gap-2">
          {SCALE.map((s) => (
            <li key={s.score} className="ch grid grid-cols-[56px_1fr] items-center gap-4 bg-ink-2 pr-4 sm:grid-cols-[56px_150px_1fr_160px]">
              <span
                className={cx(
                  "chs flex h-14 w-14 items-center justify-center font-display text-2xl",
                  s.score >= 7 ? "bg-acc text-ink" : s.score >= 5 ? "bg-warn text-ink" : "bg-line-soft text-paper",
                )}
              >
                {s.display ?? formatScore(s.score)}
              </span>
              <div className="flex flex-col gap-1 py-3 sm:contents">
                <span className="font-display text-2xl uppercase leading-none text-paper sm:py-3">{s.label}</span>
                <span className="text-[15px] leading-snug text-body">{s.text}</span>
                <span aria-hidden className="hidden h-2 bg-ink-3 sm:block">
                  <span className="block h-full bg-acc" style={{ width: `${s.score * 10}%` }} />
                </span>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm text-muted">
          Notas quebradas (como 8,5) são usadas quando um jogo fica entre duas faixas. Veja as notas na prática em{" "}
          <Link to="/reviews" className="text-paper underline decoration-acc underline-offset-4 hover:text-acc">
            reviews
          </Link>
          .
        </p>
      </section>
    </StaticPage>
  );
}
