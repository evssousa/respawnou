import { Link } from "react-router";
import { ChannelCard, StaticPage, TextLink, type DocSection } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { PLATFORMS, SECTIONS, SITE } from "~/lib/site";

export const meta = () =>
  seo({ title: "Sobre", description: `Conheça o ${SITE.name}: notícias, reviews, guias, lançamentos e promoções de games em português.`, path: "/sobre" });

const sections: DocSection[] = [
  {
    id: "missao",
    title: "Missão",
    body: (
      <>
        <p>
          Jogar já toma tempo demais para você ainda precisar caçar notícia em cinco sites diferentes. O {SITE.name} junta o que importa no mundo dos games num
          lugar só, em português, direto ao ponto e várias vezes por dia.
        </p>
        <p>O nome vem do momento em que o personagem volta ao jogo depois de cair. É isso que a gente quer ser: o lugar onde você volta todo dia.</p>
      </>
    ),
  },
  {
    id: "cobertura",
    title: "O que cobrimos",
    body: (
      <>
        <p>Acompanhamos anúncios, trailers, atualizações, eventos, lançamentos e o que acontece nos bastidores da indústria. Além das notícias, publicamos:</p>
        <ul>
          <li>
            <strong>Reviews</strong> com nota de 0 a 10 e um veredito claro (veja <TextLink to="/como-avaliamos">como avaliamos</TextLink>);
          </li>
          <li>
            <strong>Guias</strong> com dicas, tutoriais e passo a passo;
          </li>
          <li>
            <strong>Listas e especiais</strong> para quem quer ir além da manchete;
          </li>
          <li>
            <strong>Calendário de lançamentos</strong> semana a semana;
          </li>
          <li>
            <strong>Promoções e jogos grátis</strong> que realmente valem a pena.
          </li>
        </ul>
        <p>Tudo isso para {PLATFORMS.map((p) => p.label).join(", ").replace(/, ([^,]*)$/, " e $1")}.</p>
      </>
    ),
  },
  {
    id: "como-trabalhamos",
    title: "Como trabalhamos",
    body: (
      <>
        <p>
          Monitoramos fontes confiáveis o dia inteiro: a imprensa especializada, os canais oficiais das empresas e bases de dados de jogos. Parte do nosso conteúdo é
          produzida com apoio de ferramentas automatizadas e de inteligência artificial, sempre a partir dessas fontes e com crédito à publicação original.
        </p>
        <p>
          As regras que seguimos estão na nossa <TextLink to="/politica-editorial">política editorial</TextLink>: como escolhemos as fontes, como tratamos rumores e
          vazamentos e como sinalizamos conteúdo patrocinado.
        </p>
      </>
    ),
  },
  {
    id: "independencia",
    title: "Independência",
    body: (
      <p>
        Nenhuma empresa paga por nota ou por cobertura. Quando um conteúdo for patrocinado, ele vai aparecer marcado como tal, e anunciantes não têm acesso ao texto
        antes da publicação. Se quiser anunciar, as regras estão em <TextLink to="/anuncie">anuncie</TextLink>.
      </p>
    ),
  },
  {
    id: "erros",
    title: "Encontrou um erro?",
    body: (
      <p>
        Avise pela página de <TextLink to="/contato">contato</TextLink>. Corrigimos o mais rápido possível e informamos a correção no fim da própria matéria.
      </p>
    ),
  },
  {
    id: "proximos-passos",
    title: "O que vem por aí",
    body: (
      <>
        <p>O {SITE.name} está só começando. Estes recursos já estão no nosso radar:</p>
        <ul>
          <li>mais listas, guias e reviews;</li>
          <li>perfis oficiais nas redes sociais;</li>
          <li>uma newsletter com o resumo da semana.</li>
        </ul>
      </>
    ),
  },
];

export default function About() {
  return (
    <StaticPage path="/sobre" title="Sobre o" accent={SITE.name} lead="Um portal de games em português, com notícias todo dia e sem enrolação." sections={sections}>
      <div>
        <p className="mb-3 font-mono text-xs font-bold text-acc">&gt; MÓDULOS ATIVOS</p>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SECTIONS.map((s, i) => (
            <ChannelCard key={s.slug} code={`MÓDULO ${String(i + 1).padStart(2, "0")}`} title={s.label} href={`/${s.slug}`} cta="ABRIR">
              {s.description}
            </ChannelCard>
          ))}
          <ChannelCard code={`MÓDULO ${String(SECTIONS.length + 1).padStart(2, "0")}`} title="Lançamentos" href="/lancamentos" cta="ABRIR">
            O calendário dos próximos jogos, com contagem regressiva para cada estreia.
          </ChannelCard>
        </div>
        <p className="mt-4 text-sm text-muted">
          Prefere acompanhar por leitor de feed? Assine o{" "}
          <Link to="/rss.xml" reloadDocument className="text-paper underline decoration-acc underline-offset-4 hover:text-acc">
            RSS
          </Link>
          .
        </p>
      </div>
    </StaticPage>
  );
}
