import { StaticPage, TextLink, type DocSection } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { mailto, SITE } from "~/lib/site";

export const meta = () =>
  seo({ title: "Acessibilidade", description: `O compromisso do ${SITE.name} com acessibilidade e os recursos disponíveis no site.`, path: "/acessibilidade" });

const FEATURES = [
  { title: "Teclado", text: "Todo o site funciona com Tab, Enter e Esc, com o foco sempre visível." },
  { title: "Atalho", text: "“Pular para o conteúdo” é o primeiro item da página ao apertar Tab." },
  { title: "Contraste", text: "Textos com contraste de pelo menos 4,5:1 sobre o fundo." },
  { title: "Toque", text: "Botões e links com área de toque de pelo menos 44 × 44 pixels no celular." },
  { title: "Movimento", text: "Animações desligadas quando o sistema pede movimento reduzido." },
  { title: "Leitores de tela", text: "Títulos em ordem, regiões nomeadas e textos alternativos nas imagens." },
];

const sections: DocSection[] = [
  {
    id: "compromisso",
    title: "Nosso compromisso",
    body: (
      <p>
        Queremos que qualquer pessoa consiga ler o {SITE.name}, use ela mouse, teclado, leitor de tela ou ampliação. Nossa meta é seguir o nível AA das Diretrizes
        de Acessibilidade para Conteúdo Web (WCAG 2.2) e o que pede a Lei Brasileira de Inclusão (Lei 13.146/2015).
      </p>
    ),
  },
  {
    id: "limitacoes",
    title: "Limitações conhecidas",
    body: (
      <ul>
        <li>vídeos e posts incorporados de outras plataformas seguem a acessibilidade dessas plataformas;</li>
        <li>trailers e vídeos de terceiros nem sempre têm legendas em português;</li>
        <li>algumas imagens antigas podem estar sem descrição completa.</li>
      </ul>
    ),
  },
  {
    id: "dicas",
    title: "Dicas de navegação",
    body: (
      <ul>
        <li>
          use <strong>Ctrl</strong> e <strong>+</strong> (ou <strong>⌘</strong> e <strong>+</strong> no Mac) para aumentar o texto; o layout se adapta;
        </li>
        <li>o menu do celular fecha com a tecla Esc;</li>
        <li>
          nas páginas longas, como esta, o índice “Nesta página” leva direto a cada seção.
        </li>
      </ul>
    ),
  },
  {
    id: "feedback",
    title: "Encontrou uma barreira?",
    body: (
      <p>
        Conte para a gente o que aconteceu, em qual página e com qual navegador ou tecnologia assistiva, pelo e-mail{" "}
        <TextLink to={mailto("Acessibilidade")}>{SITE.email}</TextLink>. Problemas de acessibilidade têm prioridade na fila de correções.
      </p>
    ),
  },
];

export default function Accessibility() {
  return (
    <StaticPage path="/acessibilidade" title="Acessibilidade" lead="O site é para todo mundo que joga. Veja o que já fizemos e como avisar se algo estiver no caminho." sections={sections}>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Recursos de acessibilidade">
        {FEATURES.map((f) => (
          <li key={f.title} className="ch flex flex-col gap-2 bg-ink-2 p-5">
            <span className="font-mono text-[11px] font-bold text-acc">■ ATIVO</span>
            <span className="font-display text-[26px] uppercase leading-none text-paper">{f.title}</span>
            <span className="text-[15px] leading-relaxed text-body">{f.text}</span>
          </li>
        ))}
      </ul>
    </StaticPage>
  );
}
