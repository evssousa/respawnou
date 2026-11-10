import { Link } from "react-router";
import { StaticPage } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { SITE } from "~/lib/site";

export const meta = () => seo({ title: "Sobre", description: `Conheça o ${SITE.name}, portal de notícias de games em português.`, path: "/sobre" });

export default function About() {
  return (
    <StaticPage title="Sobre o" accent="Respawnou" lead="Um portal de games em português, com notícias todo dia e sem enrolação.">
      <p>
        O {SITE.name} acompanha o que acontece no mundo dos games: anúncios, lançamentos, atualizações, promoções e jogos grátis, além de reviews, listas e guias
        para PC, PlayStation, Xbox, Nintendo Switch e mobile.
      </p>
      <h2>Como trabalhamos</h2>
      <p>
        Parte do nosso conteúdo é produzida com apoio de ferramentas automatizadas, que acompanham fontes confiáveis da imprensa e das próprias empresas. Sempre que
        uma matéria se baseia em outra publicação, a fonte original aparece creditada no fim do texto.
      </p>
      <h2>Encontrou um erro?</h2>
      <p>
        Avise a gente pela página de <Link to="/contato" className="text-acc underline">contato</Link>. Correções são feitas o mais rápido possível e sinalizadas
        na própria matéria.
      </p>
    </StaticPage>
  );
}
