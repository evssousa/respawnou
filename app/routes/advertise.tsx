import { StaticPage, TextLink, type DocSection } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { mailto, PLATFORMS, SITE } from "~/lib/site";

export const meta = () =>
  seo({ title: "Anuncie", description: `Formatos de publicidade e parcerias no ${SITE.name}, portal de games em português.`, path: "/anuncie" });

const FORMATS = [
  { code: "FORMATO 01", title: "Display", text: "Banners nas páginas de notícias, listagens e home, em posições que não atrapalham a leitura." },
  { code: "FORMATO 02", title: "Patrocinado", text: "Matéria produzida em parceria, marcada como patrocinada do título ao fim do texto." },
  { code: "FORMATO 03", title: "Módulo da home", text: "Patrocínio de um módulo, como o calendário de lançamentos ou o de promoções." },
  { code: "FORMATO 04", title: "Lançamento", text: "Pacote de divulgação para a semana de estreia de um jogo, com trailer e destaque." },
];

const sections: DocSection[] = [
  {
    id: "publico",
    title: "Para quem você fala",
    body: (
      <p>
        O {SITE.name} fala com quem joga em português, no PC, no console ou no celular ({PLATFORMS.map((p) => p.label).join(", ")}). Números de
        audiência e perfil do público vão no mídia kit, enviado sob pedido.
      </p>
    ),
  },
  {
    id: "regras",
    title: "Regras do jogo",
    body: (
      <>
        <p>Publicidade paga as contas, mas não muda a cobertura. Por isso:</p>
        <ul>
          <li>reviews, notas e vereditos não estão à venda, em nenhum formato;</li>
          <li>todo conteúdo pago é marcado como patrocinado;</li>
          <li>anunciantes não leem nem aprovam matérias editoriais antes da publicação;</li>
          <li>não aceitamos anúncios de apostas, jogos de azar, golpes ou produtos ilegais.</li>
        </ul>
        <p>
          A lista completa está na <TextLink to="/politica-editorial#patrocinio">política editorial</TextLink>.
        </p>
      </>
    ),
  },
  {
    id: "como-comecar",
    title: "Como começar",
    body: (
      <p>
        Mande um e-mail para <TextLink to={mailto("Publicidade")}>{SITE.email}</TextLink> com o assunto “Publicidade”, contando o produto, o período e o formato
        que interessa. Respondemos com o mídia kit e os valores.
      </p>
    ),
  },
];

export default function Advertise() {
  return (
    <StaticPage
      path="/anuncie"
      title="Anuncie no"
      accent={SITE.name}
      lead="Fale com quem joga, em português, com formatos que respeitam a leitura e a independência editorial."
      sections={sections}
      after={
        <a href={mailto("Publicidade")} className="ch flex max-w-[720px] flex-col gap-3 bg-acc p-6 text-ink hover:bg-paper sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-3xl uppercase leading-none">Pedir mídia kit</span>
          <span className="font-mono text-xs font-bold">ENVIAR E-MAIL →</span>
        </a>
      }
    >
      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Formatos">
        {FORMATS.map((f) => (
          <li key={f.code} className="ch flex flex-col gap-3 bg-ink-2 p-5">
            <span className="font-mono text-[11px] font-bold text-muted">{f.code}</span>
            <span className="font-display text-[26px] uppercase leading-none text-paper">{f.title}</span>
            <span className="text-[15px] leading-relaxed text-body">{f.text}</span>
          </li>
        ))}
      </ul>
    </StaticPage>
  );
}
