import type { ReactNode } from "react";
import { StaticPage, TextLink } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { SITE } from "~/lib/site";

interface Faq {
  q: string;
  /** Resposta em texto puro, usada nos dados estruturados para o Google. */
  a: string;
  /** Resposta com links, exibida na página (opcional). */
  rich?: ReactNode;
}

const FAQ: { group: string; items: Faq[] }[] = [
  {
    group: "O SITE",
    items: [
      {
        q: `O que é o ${SITE.name}?`,
        a: `Um portal de games em português com notícias, reviews, guias, calendário de lançamentos, promoções e jogos grátis para PC, consoles e celular.`,
      },
      { q: "É de graça?", a: "Sim. Todo o conteúdo é gratuito e não exige cadastro." },
      { q: "Com que frequência vocês publicam?", a: "Várias vezes por dia, todos os dias, incluindo fins de semana." },
      {
        q: "Vocês usam inteligência artificial?",
        a: "Sim, como apoio para monitorar fontes, resumir anúncios e traduzir informações, sempre com a fonte creditada. Reviews e notas são sempre feitas por uma pessoa que jogou.",
        rich: (
          <>
            Sim, como apoio para monitorar fontes, resumir anúncios e traduzir informações, sempre com a fonte creditada. Reviews e notas são sempre feitas por uma
            pessoa que jogou. Os detalhes estão na <TextLink to="/politica-editorial#automacao">política editorial</TextLink>.
          </>
        ),
      },
    ],
  },
  {
    group: "CONTEÚDO",
    items: [
      {
        q: "Como funcionam as notas das reviews?",
        a: "As notas vão de 0 a 10, e cada faixa tem um significado. Uma pessoa que jogou o jogo escreve a review e dá a nota.",
        rich: (
          <>
            As notas vão de 0 a 10, e cada faixa tem um significado. Uma pessoa que jogou o jogo escreve a review e dá a nota. Veja <TextLink to="/como-avaliamos">como avaliamos</TextLink>.
          </>
        ),
      },
      {
        q: "As promoções e jogos grátis são pagos pelas lojas?",
        a: "Não. Escolhemos as ofertas por critério editorial. Se algum link for de afiliado ou patrocinado, isso aparece sinalizado na matéria.",
      },
      {
        q: "As datas de lançamento são confiáveis?",
        a: "Usamos as datas oficiais divulgadas pelas empresas, mas elas podem mudar. Atualizamos o calendário quando há adiamentos.",
        rich: (
          <>
            Usamos as datas oficiais divulgadas pelas empresas, mas elas podem mudar. Atualizamos o <TextLink to="/lancamentos">calendário</TextLink> quando há
            adiamentos.
          </>
        ),
      },
      {
        q: "Posso republicar uma matéria no meu site?",
        a: "Você pode citar trechos curtos com crédito e link para a matéria original. Para republicar o texto inteiro, peça autorização por e-mail.",
        rich: (
          <>
            Você pode citar trechos curtos com crédito e link para a matéria original. Para republicar o texto inteiro, peça autorização. Veja os{" "}
            <TextLink to="/termos#uso-permitido">termos de uso</TextLink>.
          </>
        ),
      },
    ],
  },
  {
    group: "PARTICIPAR",
    items: [
      {
        q: "Como sugiro uma pauta ou aviso de um erro?",
        a: `Pela página de contato. Escolha o canal certo e o e-mail já sai com o assunto preenchido.`,
        rich: (
          <>
            Pela página de <TextLink to="/contato">contato</TextLink>. Escolha o canal certo e o e-mail já sai com o assunto preenchido.
          </>
        ),
      },
      {
        q: "Tem como acompanhar sem entrar no site?",
        a: "Sim, pelo feed RSS, que funciona em qualquer leitor de notícias. Perfis em redes sociais e newsletter estão a caminho.",
        rich: (
          <>
            Sim, pelo{" "}
            <a href="/rss.xml" className="text-paper underline decoration-acc underline-offset-4 hover:text-acc">
              feed RSS
            </a>
            , que funciona em qualquer leitor de notícias. Perfis em redes sociais e newsletter estão a caminho.
          </>
        ),
      },
      {
        q: "Vou poder criar uma conta e comentar?",
        a: "Sim. Contas de usuário e comentários estão nos planos. Com a conta, você vai poder salvar matérias e seguir jogos e plataformas.",
      },
    ],
  },
];

export const meta = () => [
  ...seo({ title: "Perguntas frequentes", description: `Respostas rápidas sobre o ${SITE.name}: conteúdo, notas, promoções, IA e como participar.`, path: "/faq" }),
  {
    "script:ld+json": {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.flatMap((g) => g.items).map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  },
];

export default function FaqPage() {
  let n = 0;
  return (
    <StaticPage path="/faq" title="Perguntas" accent="frequentes" lead="Respostas rápidas para as dúvidas mais comuns. Não achou a sua? Fale com a gente.">
      <div className="flex max-w-[820px] flex-col gap-8">
        {FAQ.map((g) => (
          <section key={g.group} aria-label={g.group} className="flex flex-col gap-2">
            <h2 className="font-mono text-xs font-bold text-acc">&gt; {g.group}</h2>
            {g.items.map((f) => {
              n += 1;
              return (
                <details key={f.q} className="group ch bg-ink-2 open:bg-ink-3">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <span className="font-mono text-xs font-bold text-muted">{String(n).padStart(2, "0")}</span>
                    <span className="flex-1 font-display text-xl uppercase leading-tight text-paper sm:text-[22px]">{f.q}</span>
                    <span aria-hidden className="font-mono text-lg font-bold text-acc transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="pr-4 pb-5 pl-[52px] text-[17px] leading-relaxed text-body sm:pr-5 sm:pl-[56px]">{f.rich ?? f.a}</p>
                </details>
              );
            })}
          </section>
        ))}
      </div>
    </StaticPage>
  );
}
