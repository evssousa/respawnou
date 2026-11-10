import { isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteLoaderData } from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { formatDate } from "./lib/format";
import { SITE } from "./lib/site";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "alternate", type: "application/rss+xml", title: `${SITE.name} — RSS`, href: "/rss.xml" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Anton&family=IBM+Plex+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap",
  },
];

export function loader() {
  return { today: formatDate(new Date().toISOString()).toUpperCase() };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0b0b0b" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen">
        <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-alert focus:px-4 focus:py-3 focus:text-ink">
          Pular para o conteúdo
        </a>
        <Header today={data?.today ?? ""} />
        {children}
        <Footer />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  let details = notFound ? "A página que você procura não existe ou foi removida." : "Algo deu errado do nosso lado. Tente de novo em instantes.";
  let stack: string | undefined;
  if (!notFound && import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main id="conteudo" className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6">
      <title>{`${notFound ? "Página não encontrada" : "Erro"} | ${SITE.name}`}</title>
      <p className="font-mono text-sm font-semibold text-alert">{notFound ? "ERRO 404 · ALVO NÃO ENCONTRADO" : "ERRO · FALHA NA MISSÃO"}</p>
      <h1 className="mt-4 font-display text-6xl uppercase leading-[0.9] sm:text-[120px]">{notFound ? "Game over?" : "Deu ruim."}</h1>
      <p className="mt-6 max-w-xl text-lg text-body">{details}</p>
      <Link to="/" className="mt-8 inline-block bg-alert px-6 py-4 font-mono text-sm font-bold text-ink hover:bg-paper hover:text-ink">
        RESPAWNAR NA HOME →
      </Link>
      {stack && (
        <pre className="mt-10 overflow-x-auto border border-line p-4 text-xs text-muted">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
