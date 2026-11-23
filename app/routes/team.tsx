import { Link } from "react-router";
import { AuthorAvatar } from "~/components/AuthorAvatar";
import { StaticPage, TextLink, type DocSection } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { absoluteUrl, AUTHORS, SECTIONS, SITE } from "~/lib/site";

export const meta = () => [
  ...seo({
    title: "Redação",
    description: `Quem faz o ${SITE.name}: os autores de cada editoria, a pessoa que confere o que é publicado e como as matérias são produzidas e corrigidas.`,
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
          O {SITE.name} é um portal pequeno que combina três coisas: <strong>tecnologia e inteligência artificial</strong>, que ajudam a escrever as
          matérias a partir de fontes identificadas; <strong>regras fixas</strong>, que impedem inventar números, datas ou declarações; e{" "}
          <strong>uma pessoa</strong>, que confere tudo depois de publicado e corrige, remove ou acrescenta o que for preciso.
        </p>
        <p>
          Os perfis acima são os <strong>autores da redação</strong>, um por tipo de conteúdo: servem para você saber que tipo de texto está lendo e de onde ele
          vem. Clique em um para ver tudo o que ele já assinou. Todas as matérias creditam a fonte original, com link.
        </p>
      </>
    ),
  },
  {
    id: "revisao",
    title: "O que a redação confere",
    body: (
      <>
        <ul>
          <li>as matérias publicadas: uma pessoa lê depois da publicação e <strong>corrige, remove ou acrescenta</strong> o que for preciso;</li>
          <li>a <strong>peça semanal</strong> (lista comentada ou guia), que nasce como rascunho e só é publicada depois da revisão;</li>
          <li>as <strong>correções</strong> pedidas pelos leitores, que viram nota no fim da matéria com a data e o que mudou;</li>
          <li>as <strong>regras</strong> da automação (fontes, limites, o que nunca fazer) e a escolha das editorias.</li>
        </ul>
        <p>
          Antes de publicar, uma checagem de código confere números, datas e nomes contra as fontes. Veja os detalhes na{" "}
          <TextLink to="/politica-editorial">política editorial</TextLink>.
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
          <li key={a.slug} id={a.slug} className="scroll-mt-24">
            <Link to={`/autores/${a.slug}`} className="group ch flex h-full flex-col gap-3 bg-ink-2 p-5 transition-colors hover:bg-ink-3">
              <AuthorAvatar slug={a.slug} className="h-20 w-20 shrink-0" />
              <span className="font-mono text-xs font-semibold text-acc">&gt; {a.sections.map((s) => SECTIONS.find((x) => x.slug === s)?.label).join(" e ").toUpperCase()}</span>
              <span className="font-display text-4xl uppercase leading-none group-hover:text-acc">{a.name}</span>
              <span className="text-[15px] leading-relaxed text-body">{a.tagline}</span>
              <span className="mt-auto font-mono text-xs font-semibold text-acc">VER AS MATÉRIAS →</span>
            </Link>
          </li>
        ))}
      </ul>
    </StaticPage>
  );
}
