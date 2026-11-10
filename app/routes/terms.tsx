import { StaticPage, TextLink, type DocSection } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { SITE } from "~/lib/site";

export const meta = () => seo({ title: "Termos de uso", description: `Regras de uso do ${SITE.name} e do conteúdo publicado no site.`, path: "/termos" });

// Texto-base. Revisar com um advogado antes do lançamento e ao ativar contas, comentários ou anúncios.
const sections: DocSection[] = [
  {
    id: "aceitacao",
    title: "Aceitação",
    body: (
      <p>
        Ao acessar o {SITE.name} ({SITE.url.replace(/^https?:\/\//, "")}), você concorda com estes termos e com a nossa{" "}
        <TextLink to="/privacidade">política de privacidade</TextLink>. Se não concordar, não use o site.
      </p>
    ),
  },
  {
    id: "servico",
    title: "O serviço",
    body: (
      <p>
        O {SITE.name} é um site gratuito de notícias, reviews, guias e informações sobre jogos eletrônicos. Podemos mudar, suspender ou encerrar qualquer parte do
        site a qualquer momento, sem aviso prévio.
      </p>
    ),
  },
  {
    id: "propriedade",
    title: "Propriedade intelectual",
    body: (
      <>
        <p>
          Textos, marca, logotipo e elementos visuais criados pelo {SITE.name} são nossos e protegidos pela Lei de Direitos Autorais (Lei 9.610/1998).
        </p>
        <p>
          Nomes de jogos, personagens, logotipos, capturas de tela e trailers pertencem às suas respectivas empresas. Eles aparecem aqui com fins informativos,
          jornalísticos e de crítica. Se você é titular de algum desses direitos e quer pedir a remoção de um material, escreva para nós pela página de{" "}
          <TextLink to="/contato">contato</TextLink>.
        </p>
      </>
    ),
  },
  {
    id: "uso-permitido",
    title: "O que você pode fazer",
    body: (
      <ul>
        <li>ler, compartilhar e linkar as nossas matérias;</li>
        <li>citar trechos curtos, desde que com crédito ao {SITE.name} e link para a matéria original;</li>
        <li>assinar o nosso feed RSS em leitores de notícias para uso pessoal.</li>
      </ul>
    ),
  },
  {
    id: "uso-proibido",
    title: "O que você não pode fazer",
    body: (
      <ul>
        <li>copiar matérias inteiras ou republicá-las em outro site, perfil ou canal sem autorização por escrito;</li>
        <li>coletar o conteúdo de forma automatizada e em massa (scraping) para republicar ou treinar sistemas;</li>
        <li>tentar invadir, sobrecarregar ou atrapalhar o funcionamento do site;</li>
        <li>usar o nome ou a marca {SITE.name} de forma que sugira uma parceria que não existe.</li>
      </ul>
    ),
  },
  {
    id: "ofertas",
    title: "Promoções, preços e links externos",
    body: (
      <>
        <p>
          Não vendemos jogos. Preços, descontos e jogos grátis divulgados aqui dependem das lojas e podem mudar ou acabar a qualquer momento. Confira sempre o valor
          final na loja antes de comprar.
        </p>
        <p>
          Os links para sites de terceiros são oferecidos por conveniência. Não controlamos esses sites e não respondemos pelo conteúdo, pelas compras ou pelas
          políticas de privacidade deles. Alguns links podem ser de afiliados, e isso será sinalizado na matéria.
        </p>
      </>
    ),
  },
  {
    id: "informacao",
    title: "Precisão das informações",
    body: (
      <p>
        Trabalhamos para publicar informações corretas e atualizadas, mas datas de lançamento, requisitos e outros detalhes podem mudar depois da publicação. O
        conteúdo é oferecido como está, sem garantia de que esteja livre de erros. Se encontrar algum, <TextLink to="/contato">avise a gente</TextLink>.
      </p>
    ),
  },
  {
    id: "contas",
    title: "Contas e comentários",
    body: (
      <p>
        O {SITE.name} ainda não tem contas de usuário nem comentários. Quando esses recursos forem lançados, estes termos vão ganhar regras de convivência e de
        moderação, e você será avisado antes de elas valerem.
      </p>
    ),
  },
  {
    id: "responsabilidade",
    title: "Limitação de responsabilidade",
    body: (
      <p>
        Na medida permitida pela lei, o {SITE.name} não responde por danos causados pelo uso das informações publicadas, por indisponibilidade do site ou por
        conteúdo de terceiros. Nada nestes termos limita os direitos que você tem pelo Código de Defesa do Consumidor.
      </p>
    ),
  },
  {
    id: "alteracoes",
    title: "Alterações",
    body: <p>Podemos atualizar estes termos. A data da última atualização aparece no topo da página, e mudanças importantes serão avisadas no site.</p>,
  },
  {
    id: "lei",
    title: "Lei aplicável",
    body: (
      <p>
        Estes termos seguem as leis do Brasil. Qualquer disputa será resolvida no foro do domicílio do usuário, conforme o Código de Defesa do Consumidor.
      </p>
    ),
  },
];

export default function Terms() {
  return <StaticPage path="/termos" title="Termos de" accent="uso" lead={`As regras para usar o ${SITE.name} e o conteúdo que publicamos, em linguagem direta.`} sections={sections} />;
}
