import { Link } from "react-router";
import { cx } from "~/components/ui";
import { formatScore } from "~/lib/format";
import { StaticPage, TextLink, type DocSection } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { SITE } from "~/lib/site";

export const meta = () =>
  seo({ title: "Como avaliamos", description: `Como o ${SITE.name} calcula a média da crítica e o que cada nota quer dizer.`, path: "/como-avaliamos" });

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
    id: "o-que-e",
    title: "O que é a nota",
    body: (
      <>
        <p>
          O {SITE.name} não publica reviews próprias. A nota que aparece na editoria Reviews é a <strong>média da crítica</strong>: reunimos as análises
          publicadas pela imprensa especializada e mostramos o que elas concluíram, com link para cada uma.
        </p>
        <p>Assim você vê numa página só se o jogo foi bem recebido, o que mais agradou e o que mais incomodou quem jogou para analisar.</p>
      </>
    ),
  },
  {
    id: "calculo",
    title: "Como calculamos",
    body: (
      <ol>
        <li>reunimos análises de veículos especializados reconhecidos (hoje, principalmente de fora do Brasil), uma por veículo;</li>
        <li>usamos a nota exatamente como o veículo a publicou, lida dos dados da própria página da análise;</li>
        <li>convertemos cada nota para a escala de 0 a 10 (por exemplo, 4 de 5 estrelas vira 8 e 85 de 100 vira 8,5);</li>
        <li>calculamos a média simples, arredondada para uma casa decimal. Só entram análises com nota.</li>
      </ol>
    ),
  },
  {
    id: "minimo",
    title: "Quando publicamos",
    body: (
      <p>
        Só publicamos o consenso quando um jogo tem pelo menos 4 análises com nota, de veículos diferentes, publicadas em até 30 dias. Com menos do que
        isso, a média ainda não representa bem a recepção do jogo.
      </p>
    ),
  },
  {
    id: "resumo",
    title: "Pontos elogiados e criticados",
    body: (
      <p>
        Os pontos “mais elogiado” e “mais criticado” resumem o que aparece em várias análises, não a opinião de um veículo só. Esse resumo é feito com apoio de
        inteligência artificial, a partir dos textos das análises (veja a <TextLink to="/politica-editorial#automacao">política editorial</TextLink>).
      </p>
    ),
  },
  {
    id: "atualizacoes",
    title: "Atualizações",
    body: (
      <p>
        Quando novas análises saem depois da publicação, a média é recalculada e a lista de veículos é atualizada. A data da última atualização aparece na
        própria matéria.
      </p>
    ),
  },
  {
    id: "versao",
    title: "Versões e plataformas",
    body: (
      <p>
        As análises podem ter sido feitas em plataformas diferentes. Quando a crítica aponta que uma versão é muito diferente das outras (por exemplo, roda pior
        no Switch), isso aparece no resumo.
      </p>
    ),
  },
];

export default function ReviewPolicy() {
  return (
    <StaticPage path="/como-avaliamos" title="Como" accent="avaliamos" lead="A nota das nossas reviews é a média da crítica especializada. Veja como ela é calculada e o que cada número quer dizer." sections={sections}>
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
          Como a nota é uma média, ela costuma ter casas decimais (como 8,5). Veja as médias na prática em{" "}
          <Link to="/reviews" className="text-paper underline decoration-acc underline-offset-4 hover:text-acc">
            reviews
          </Link>
          .
        </p>
      </section>
    </StaticPage>
  );
}
