import { StaticPage, TextLink, type DocSection } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { SITE } from "~/lib/site";

export const meta = () =>
  seo({ title: "Política editorial", description: `Como o ${SITE.name} escolhe fontes, usa automação, trata rumores e corrige erros.`, path: "/politica-editorial" });

const PRINCIPLES = [
  { n: "01", title: "Precisão", text: "Informação checada vale mais do que ser o primeiro a publicar." },
  { n: "02", title: "Independência", text: "Nenhuma empresa compra nota, cobertura ou opinião." },
  { n: "03", title: "Transparência", text: "Fonte creditada, patrocínio sinalizado e erro corrigido à vista." },
];

const sections: DocSection[] = [
  {
    id: "fontes",
    title: "Fontes",
    body: (
      <>
        <p>Nossas matérias se baseiam, nesta ordem de preferência, em:</p>
        <ol>
          <li>canais oficiais: comunicados, blogs e perfis das desenvolvedoras, publicadoras e fabricantes;</li>
          <li>imprensa especializada reconhecida, no Brasil e no exterior;</li>
          <li>bases de dados públicas de jogos, para datas, plataformas e fichas técnicas.</li>
        </ol>
        <p>Quando uma matéria se baseia em outra publicação, a fonte original aparece creditada, com link, no fim do texto.</p>
      </>
    ),
  },
  {
    id: "automacao",
    title: "Automação e inteligência artificial",
    body: (
      <>
        <p>
          Para cobrir muita coisa todo dia, o {SITE.name} usa ferramentas automatizadas e de inteligência artificial para monitorar fontes, resumir anúncios e
          traduzir informações. Essas ferramentas seguem regras fixas:
        </p>
        <ul>
          <li>só trabalham a partir de fontes identificadas, que são sempre creditadas;</li>
          <li>não inventam declarações, números ou datas que não estejam na fonte;</li>
          <li>não escrevem reviews: nota e veredito são sempre de uma pessoa que jogou.</li>
        </ul>
        <p>Matérias produzidas com apoio de automação podem conter erros. Se encontrar um, use o canal de correções abaixo.</p>
      </>
    ),
  },
  {
    id: "rumores",
    title: "Rumores e vazamentos",
    body: (
      <p>
        Rumores só são publicados quando vêm de fontes com histórico de acerto e sempre com a palavra <strong>rumor</strong> no título ou no início do texto. Não
        publicamos material vazado que exponha dados pessoais nem conteúdo obtido por invasão.
      </p>
    ),
  },
  {
    id: "spoilers",
    title: "Spoilers",
    body: <p>Matérias com revelações de história avisam no início do texto. Títulos e imagens de capa nunca trazem spoilers.</p>,
  },
  {
    id: "patrocinio",
    title: "Patrocínio e afiliados",
    body: (
      <>
        <p>
          Conteúdo pago é marcado como <strong>patrocinado</strong> no topo da matéria e nunca é apresentado como review. Links de afiliados, que podem render
          comissão quando você compra algo, são sinalizados na própria matéria e não mudam o preço para você.
        </p>
        <p>
          A escolha das promoções segue critério editorial: só entram ofertas que consideramos boas de verdade. Mais detalhes em{" "}
          <TextLink to="/anuncie">anuncie</TextLink>.
        </p>
      </>
    ),
  },
  {
    id: "reviews",
    title: "Reviews",
    body: (
      <p>
        Cópias de jogos cedidas por empresas são informadas no fim da review e não garantem nota positiva. Os critérios estão em{" "}
        <TextLink to="/como-avaliamos">como avaliamos</TextLink>.
      </p>
    ),
  },
  {
    id: "correcoes",
    title: "Correções",
    body: (
      <>
        <p>Erros acontecem, e a gente prefere assumir:</p>
        <ul>
          <li>erros de digitação e de formatação são corrigidos sem aviso;</li>
          <li>erros de informação são corrigidos com uma nota no fim da matéria, com a data e o que mudou;</li>
          <li>se a matéria inteira estiver errada, ela ganha um aviso no topo em vez de ser apagada.</li>
        </ul>
        <p>
          Viu algo errado? <TextLink to="/contato">Fale com a gente</TextLink> usando o canal de correção.
        </p>
      </>
    ),
  },
  {
    id: "resposta",
    title: "Direito de resposta",
    body: (
      <p>
        Pessoas e empresas citadas numa matéria podem pedir para incluir o seu lado da história pelo e-mail {SITE.email}. Respostas relevantes são publicadas na
        própria matéria.
      </p>
    ),
  },
];

export default function Editorial() {
  return (
    <StaticPage
      path="/politica-editorial"
      title="Política"
      accent="editorial"
      lead="As regras que seguimos para escolher fontes, usar automação, tratar rumores e corrigir erros."
      sections={sections}
    >
      <ul className="grid gap-3 sm:grid-cols-3" aria-label="Princípios">
        {PRINCIPLES.map((p) => (
          <li key={p.n} className="ch flex flex-col gap-2 bg-ink-2 p-5">
            <span className="stroke-num font-display text-5xl leading-none">{p.n}</span>
            <span className="font-display text-[26px] uppercase leading-none text-acc">{p.title}</span>
            <span className="text-[15px] leading-relaxed text-body">{p.text}</span>
          </li>
        ))}
      </ul>
    </StaticPage>
  );
}
