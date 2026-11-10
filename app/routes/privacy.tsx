import { StaticPage, TextLink, type DocSection } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { mailto, SITE } from "~/lib/site";

export const meta = () =>
  seo({ title: "Política de privacidade", description: `Como o ${SITE.name} trata seus dados pessoais, de acordo com a LGPD.`, path: "/privacidade" });

// Texto-base. Revisar com um advogado antes do lançamento, incluir a identificação
// completa do controlador (razão social/CNPJ ou responsável) e atualizar ao ativar
// analytics, anúncios ou contas de usuário.
const sections: DocSection[] = [
  {
    id: "controlador",
    title: "Quem cuida dos seus dados",
    body: (
      <p>
        O controlador dos dados tratados neste site é o {SITE.name}. Para qualquer assunto sobre privacidade, inclusive para falar com o encarregado de dados
        (DPO), escreva para <TextLink to={mailto("LGPD")}>{SITE.email}</TextLink> com o assunto “LGPD”.
      </p>
    ),
  },
  {
    id: "dados",
    title: "Quais dados coletamos",
    body: (
      <>
        <p>Hoje o {SITE.name} não tem contas de usuário, comentários ou formulários de cadastro. Os dados que podemos tratar são:</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">DADO</th>
                <th scope="col">QUANDO</th>
                <th scope="col">PARA QUÊ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Dados técnicos de acesso</td>
                <td>Toda visita: endereço IP, data e hora, navegador, página acessada.</td>
                <td>Manter o site seguro e funcionando. O Marco Civil da Internet exige guardar registros de acesso por 6 meses.</td>
              </tr>
              <tr>
                <td>Métricas de audiência</td>
                <td>Se você aceitar cookies de métricas (quando ativados).</td>
                <td>Entender quais conteúdos são mais lidos e melhorar o site.</td>
              </tr>
              <tr>
                <td>Nome e e-mail</td>
                <td>Quando você nos escreve.</td>
                <td>Responder a sua mensagem.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: "bases-legais",
    title: "Bases legais",
    body: (
      <ul>
        <li>
          <strong>Obrigação legal</strong>: guarda dos registros de acesso (Marco Civil da Internet, art. 15);
        </li>
        <li>
          <strong>Legítimo interesse</strong>: segurança do site e resposta às mensagens que você envia;
        </li>
        <li>
          <strong>Consentimento</strong>: cookies de métricas e de publicidade, quando existirem. Você pode retirar o consentimento quando quiser.
        </li>
      </ul>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    body: (
      <p>
        Usamos cookies para o site funcionar e, no futuro, para medir audiência e exibir anúncios. Os detalhes e as formas de desativar estão na{" "}
        <TextLink to="/cookies">política de cookies</TextLink>.
      </p>
    ),
  },
  {
    id: "compartilhamento",
    title: "Com quem compartilhamos",
    body: (
      <>
        <p>Não vendemos dados pessoais. Dados podem ser tratados por fornecedores que nos ajudam a operar o site, sempre só no necessário:</p>
        <ul>
          <li>empresa de hospedagem, onde o site e o banco de dados ficam guardados;</li>
          <li>ferramentas de métricas e de anúncios, se e quando forem ativadas, mediante consentimento;</li>
          <li>autoridades públicas, quando houver ordem judicial ou obrigação legal.</li>
        </ul>
        <p>
          Alguns desses fornecedores podem guardar dados fora do Brasil. Nesses casos, a transferência segue as regras da LGPD para transferência internacional.
        </p>
      </>
    ),
  },
  {
    id: "retencao",
    title: "Por quanto tempo guardamos",
    body: (
      <ul>
        <li>registros de acesso: 6 meses, como exige o Marco Civil da Internet;</li>
        <li>mensagens de contato: pelo tempo necessário para resolver o assunto e, depois, até 2 anos para histórico;</li>
        <li>métricas: de forma agregada, sem identificar você.</li>
      </ul>
    ),
  },
  {
    id: "seguranca",
    title: "Segurança",
    body: (
      <p>
        O site usa conexão criptografada (HTTPS) e acesso restrito aos sistemas. Nenhum sistema é totalmente imune a falhas, mas, se acontecer um incidente que
        coloque seus dados em risco, avisaremos você e a Autoridade Nacional de Proteção de Dados (ANPD), como determina a lei.
      </p>
    ),
  },
  {
    id: "direitos",
    title: "Seus direitos",
    body: (
      <>
        <p>Pela LGPD (art. 18), você pode pedir a qualquer momento:</p>
        <ul>
          <li>confirmação de que tratamos seus dados e acesso a eles;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>portabilidade dos dados a outro fornecedor;</li>
          <li>informação sobre com quem compartilhamos seus dados;</li>
          <li>revogação do consentimento.</li>
        </ul>
        <p>
          Faça o pedido pelo e-mail <TextLink to={mailto("LGPD")}>{SITE.email}</TextLink>. Respondemos em até 15 dias. Se não ficar satisfeito, você também pode
          reclamar à ANPD.
        </p>
      </>
    ),
  },
  {
    id: "menores",
    title: "Crianças e adolescentes",
    body: (
      <p>
        O {SITE.name} é aberto a todos os públicos, mas não coleta de propósito dados de crianças. Quando houver contas de usuário, menores de idade precisarão de
        autorização dos responsáveis, como manda a lei.
      </p>
    ),
  },
  {
    id: "mudancas",
    title: "Mudanças nesta política",
    body: (
      <p>
        Esta política será atualizada quando lançarmos novos recursos, como contas de usuário, comentários e newsletter. A data da última atualização fica no topo
        da página.
      </p>
    ),
  },
];

export default function Privacy() {
  return (
    <StaticPage
      path="/privacidade"
      title="Política de"
      accent="privacidade"
      lead={`Como o ${SITE.name} trata seus dados, de acordo com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).`}
      sections={sections}
    />
  );
}
