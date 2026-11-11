import { StaticPage, TextLink, type DocSection } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { SITE } from "~/lib/site";

export const meta = () => seo({ title: "Política de cookies", description: `Quais cookies o ${SITE.name} usa e como desativá-los.`, path: "/cookies" });

// Banner de consentimento: app/components/CookieConsent.tsx (liga junto com ADSENSE_CLIENT).
const COOKIE_TYPES = [
  { type: "Essenciais", status: "Só o necessário", use: "Fazem o site funcionar e protegem contra abusos.", consent: "Não precisa: o site não funciona sem eles." },
  { type: "Preferências", status: "Em uso", use: "Guardam a sua escolha no aviso de cookies, para não perguntar de novo.", consent: "Não precisa: só guardam o que você escolheu." },
  { type: "Métricas", status: "Ainda não usamos", use: "Contam visitas e páginas lidas, de forma agregada.", consent: "Sim, pedido no aviso de cookies." },
  {
    type: "Publicidade",
    status: "Google AdSense",
    use: "Exibem anúncios, evitam repetir o mesmo anúncio e medem resultados. Os personalizados usam o seu histórico de navegação.",
    consent: "Sim: anúncios personalizados só se você clicar em “Aceitar todos”.",
  },
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
        privacidade dela. Os vídeos do YouTube usam o modo de privacidade aprimorada (youtube-nocookie.com).
      </p>
    ),
  },
  {
    id: "google",
    title: "Anúncios do Google",
    body: (
      <>
        <p>
          Fornecedores terceiros, incluindo o Google, usam cookies para exibir anúncios com base nas suas visitas anteriores a este e a outros sites. Esses
          cookies permitem que o Google e os parceiros dele exibam anúncios com base nas suas visitas a este e a outros sites da internet.
        </p>
        <p>
          Você pode desativar a publicidade personalizada nas <TextLink to="https://myadcenter.google.com/">configurações de anúncios do Google</TextLink> e
          ver <TextLink to="https://policies.google.com/technologies/partner-sites?hl=pt-BR">como o Google usa essas informações</TextLink>. Outros fornecedores
          podem ser desativados em <TextLink to="https://www.aboutads.info/choices/">aboutads.info</TextLink>.
        </p>
      </>
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
        <p>Você também pode mudar a sua escolha a qualquer momento pelo link “Preferências de cookies”, no rodapé do site.</p>
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
      lead="Usamos o essencial para o site funcionar. Anúncios personalizados e métricas só com a sua permissão, pedida num aviso na primeira visita."
      sections={sections}
    />
  );
}
