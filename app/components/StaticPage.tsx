import type { ReactNode } from "react";
import { SectionTitle } from "./ui";

/** Layout das páginas institucionais (sobre, contato, privacidade). */
export function StaticPage({ title, accent, lead, children }: { title: string; accent?: string; lead?: string; children: ReactNode }) {
  return (
    <main id="conteudo" className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 pt-10 sm:px-6">
      <SectionTitle as="h1" size="xl" accent={accent}>
        {title}
      </SectionTitle>
      {lead && <p className="max-w-3xl text-xl leading-relaxed text-body">{lead}</p>}
      <div className="article-body max-w-[720px]">{children}</div>
    </main>
  );
}
