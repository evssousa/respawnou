import { StaticPage, TextLink, type DocSection } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { absoluteUrl, AUTHORS, SECTIONS, SITE } from "~/lib/site";

export const meta = () => [
  ...seo({
    title: "Redação",
    description: `Quem faz o ${SITE.name}: autores de IA por editoria, a pessoa que revisa e como as matérias são produzidas e corrigidas.`,
    path: "/redacao",
  }),
  {
    "script:ld+json": {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: `Redação do ${SITE.name}`,
      url: absoluteUrl("/redacao"),
      mainEntity: { "@type": "Organization", name: SITE.name, url: SITE.url, email: SITE.email },
    },
  },
];

const sections: DocSection[] = [
  {
    id: "como",
    title: "Como trabalhamos",
    body: (
      <>
        <p>
          O {SITE.name} é um portal pequeno que combina três coisas: <strong>autores de inteligência artificial</strong>, que escrevem as matérias a partir de
          fontes identificadas; <strong>regras fixas</strong>, que impedem inventar números, datas ou declarações; e <strong>uma pessoa</strong>, que revisa
          peças, corrige erros e decide o que entra.
        </p>
        <p>
          Os nomes acima são <strong>autores de IA da redação</strong>, um por tipo de conteúdo. Não são pessoas e não têm currículo: servem para você saber
          que tipo de texto está lendo e de onde ele vem. Todas as matérias creditam a fonte original, com link.
        </p>
      </>
    ),
  },
  {
    id: "revisao",
    title: "O que é revisado por uma pessoa",
    body: (
      <>
        <ul>
          <li>a <strong>peça semanal</strong> (lista comentada ou guia) nasce como rascunho e só é publicada depois da revisão;</li>
          <li>as <strong>correções</strong> pedidas pelos leitores, que viram nota no fim da matéria com a data e o que mudou;</li>
          <li>as <strong>regras</strong> do robô (fontes, limites, o que nunca fazer) e a escolha das editorias.</li>
        </ul>
        <p>
          As demais matérias são publicadas automaticamente e passam por checagem de código (números, datas e nomes têm de estar nas fontes). Veja os detalhes
          na <TextLink to="/politica-editorial">política editorial</TextLink>.
        </p>
      </>
    ),
  },
  {
    id: "contato",
    title: "Fale com a redação",
    body: (
      <p>
        Achou um erro, quer sugerir uma pauta ou pedir direito de resposta? Use o <TextLink to="/contato">contato</TextLink> ou escreva para {SITE.email}.
      </p>
    ),
  },
];

export default function Team() {
  return (
    <StaticPage path="/redacao" title="A" accent="redação" lead="Quem escreve, quem revisa e como cada matéria chega até você." sections={sections}>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Autores da redação">
        {AUTHORS.map((a) => (
          <li key={a.slug} id={a.slug} className="ch flex scroll-mt-24 flex-col gap-3 bg-ink-2 p-5">
            <span className="font-mono text-xs font-semibold text-acc">&gt; AUTOR DE IA · {a.sections.map((s) => SECTIONS.find((x) => x.slug === s)?.label).join(" e ").toUpperCase()}</span>
            <span className="font-display text-4xl uppercase leading-none">{a.name}</span>
            <span className="text-[15px] leading-relaxed text-body">{a.bio}</span>
          </li>
        ))}
      </ul>
    </StaticPage>
  );
}
