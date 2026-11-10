import { ChannelCard, StaticPage, TextLink, type DocSection } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { mailto, SITE } from "~/lib/site";

export const meta = () => seo({ title: "Contato", description: `Fale com a equipe do ${SITE.name}: pautas, correções, imprensa, publicidade e privacidade.`, path: "/contato" });

// Cada canal abre o e-mail com um assunto pronto, para a triagem na caixa de entrada.
const CHANNELS = [
  { code: "CANAL 01", title: "Sugestão de pauta", subject: "Pauta", text: "Viu algo que merece virar matéria? Mande o link ou a ideia." },
  { code: "CANAL 02", title: "Correção", subject: "Correção", text: "Encontrou um erro numa matéria? Mande o link e o trecho que precisa de ajuste." },
  { code: "CANAL 03", title: "Imprensa e devs", subject: "Imprensa", text: "Anúncios, press kits, chaves para review e convites para eventos." },
  { code: "CANAL 04", title: "Publicidade", subject: "Publicidade", text: "Parcerias, patrocínios e formatos de anúncio no site." },
  { code: "CANAL 05", title: "Privacidade", subject: "LGPD", text: "Pedidos sobre seus dados pessoais, de acordo com a LGPD." },
  { code: "CANAL 06", title: "Outros assuntos", subject: "Contato", text: "Elogio, crítica ou qualquer coisa que não caiba acima." },
];

const sections: DocSection[] = [
  {
    id: "prazo",
    title: "Prazo de resposta",
    body: (
      <p>
        Lemos todas as mensagens e tentamos responder em até 3 dias úteis. Pedidos de correção e de privacidade têm prioridade. Mensagens de divulgação em massa
        podem ficar sem resposta.
      </p>
    ),
  },
  {
    id: "correcoes",
    title: "Pedido de correção",
    body: (
      <>
        <p>Para agilizar, inclua na mensagem:</p>
        <ul>
          <li>o link da matéria;</li>
          <li>o trecho com o erro;</li>
          <li>a informação correta e, se possível, uma fonte que a confirme.</li>
        </ul>
        <p>
          Quando a correção muda o sentido da matéria, ela é informada no fim do texto. Saiba mais na <TextLink to="/politica-editorial#correcoes">política editorial</TextLink>.
        </p>
      </>
    ),
  },
  {
    id: "imprensa",
    title: "Assessorias e desenvolvedores",
    body: (
      <p>
        Mande os detalhes do jogo ou do anúncio, a data de embargo (se houver), links para trailer e imagens em alta resolução. Receber uma chave de review não
        garante cobertura nem nota positiva: veja <TextLink to="/como-avaliamos">como avaliamos</TextLink>.
      </p>
    ),
  },
  {
    id: "redes",
    title: "Redes sociais",
    body: <p>Nossos perfis oficiais ainda estão sendo criados. Enquanto isso, o e-mail é o único canal oficial do {SITE.name}.</p>,
  },
];

export default function Contact() {
  return (
    <StaticPage path="/contato" title="Contato" lead="Sugestões de pauta, correções, parcerias ou só um oi: escolha o canal e o e-mail já sai com o assunto certo." sections={sections}>
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CHANNELS.map((c) => (
            <ChannelCard key={c.code} code={c.code} title={c.title} href={mailto(c.subject)} cta="ENVIAR E-MAIL">
              {c.text}
            </ChannelCard>
          ))}
        </div>
        <p className="font-mono text-xs text-muted">
          OU ESCREVA DIRETO PARA{" "}
          <a href={`mailto:${SITE.email}`} className="-my-3 inline-block py-3 font-semibold text-paper underline decoration-acc underline-offset-4 hover:text-acc">
            {SITE.email}
          </a>
        </p>
      </div>
    </StaticPage>
  );
}
