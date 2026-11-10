import { StaticPage, TextLink, type DocSection } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { SITE } from "~/lib/site";

export const meta = () => seo({ title: "Política de cookies", description: `Quais cookies o ${SITE.name} usa e como desativá-los.`, path: "/cookies" });

// Atualizar a tabela (e criar o banner de consentimento) ao ativar analytics ou anúncios.
const COOKIE_TYPES = [
  { type: "Essenciais", status: "Só o necessário", use: "Fazem o site funcionar e protegem contra abusos.", consent: "Não precisa: o site não funciona sem eles." },
  { type: "Preferências", status: "Em breve", use: "Lembram escolhas, como filtros e, no futuro, o login da sua conta.", consent: "Não precisa: só guardam o que você escolheu." },
  { type: "Métricas", status: "Ainda não usamos", use: "Contam visitas e páginas lidas, de forma agregada.", consent: "Sim, pedido num aviso antes de ativar." },
  { type: "Publicidade", status: "Ainda não usamos", use: "Exibem e medem anúncios.", consent: "Sim, pedido num aviso antes de ativar." },
];

const BROWSERS = [
  { name: "Chrome", href: "https://support.google.com/chrome/answer/95647?hl=pt-BR" },
  { name: "Firefox", href: "https://support.mozilla.org/pt-BR/kb/limpe-cookies-e-dados-de-sites-no-firefox" },
  { name: "Safari", href: "https://support.apple.com/pt-br/guide/safari/sfri11471/mac" },
  { name: "Edge", href: "https://support.microsoft.com/pt-br/microsoft-edge/excluir-cookies-no-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" },
];

const sections: DocSection[] = [
  {
    id: "o-que-sao",
    title: "O que são cookies",
    body: (
      <p>
        Cookies são pequenos arquivos que o site guarda no seu navegador. Eles servem para lembrar informações entre uma página e outra, como preferências ou se
        você já fez login.
      </p>
    ),
  },
  {
    id: "tipos",
    title: "Quais usamos",
    body: (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">TIPO</th>
              <th scope="col">SITUAÇÃO</th>
              <th scope="col">PARA QUÊ</th>
              <th scope="col">CONSENTIMENTO</th>
            </tr>
          </thead>
          <tbody>
            {COOKIE_TYPES.map((c) => (
              <tr key={c.type}>
                <td>{c.type}</td>
                <td className="font-mono text-xs whitespace-nowrap">{c.status.toUpperCase()}</td>
                <td>{c.use}</td>
                <td>{c.consent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    id: "terceiros",
    title: "Cookies de terceiros",
    body: (
      <p>
        Quando uma matéria tiver um vídeo ou post incorporado (YouTube, X, Instagram), essa plataforma pode gravar os próprios cookies, de acordo com a política de
        privacidade dela.
      </p>
    ),
  },
  {
    id: "gerenciar",
    title: "Como desativar",
    body: (
      <>
        <p>Você pode apagar ou bloquear cookies nas configurações do navegador. Bloquear os essenciais pode fazer partes do site pararem de funcionar.</p>
        <ul>
          {BROWSERS.map((b) => (
            <li key={b.name}>
              <a href={b.href} target="_blank" rel="noopener noreferrer" className="inline-block py-2.5 text-paper underline decoration-acc underline-offset-4 hover:text-acc lg:py-0">
                {b.name}
              </a>
            </li>
          ))}
        </ul>
        <p>Quando os cookies de métricas e de publicidade forem ativados, você também vai poder mudar sua escolha a qualquer momento por um link no rodapé.</p>
      </>
    ),
  },
  {
    id: "mais",
    title: "Mais informações",
    body: (
      <p>
        Para saber como tratamos dados pessoais em geral, leia a <TextLink to="/privacidade">política de privacidade</TextLink>.
      </p>
    ),
  },
];

export default function Cookies() {
  return (
    <StaticPage
      path="/cookies"
      title="Política de"
      accent="cookies"
      lead="Hoje usamos só o essencial para o site funcionar. Qualquer cookie de métricas ou de anúncios vai pedir a sua permissão antes."
      sections={sections}
    />
  );
}
