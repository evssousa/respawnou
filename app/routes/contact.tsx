import { StaticPage } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { SITE } from "~/lib/site";

export const meta = () => seo({ title: "Contato", description: `Fale com a equipe do ${SITE.name}.`, path: "/contato" });

export default function Contact() {
  return (
    <StaticPage title="Contato" lead="Sugestões de pauta, correções, parcerias ou só um oi: estamos por aqui.">
      <h2>E-mail</h2>
      <p>
        <a href={`mailto:${SITE.email}`} className="font-mono text-paper underline hover:text-acc">
          {SITE.email}
        </a>
      </p>
      <h2>Assessoria e desenvolvedores</h2>
      <p>Tem um jogo para mostrar ou um anúncio para divulgar? Mande os detalhes, links e materiais de imprensa para o mesmo e-mail com o assunto “Imprensa”.</p>
    </StaticPage>
  );
}
