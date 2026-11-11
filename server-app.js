// Servidor Express de produção. Carregado por server.js depois de definir NODE_ENV.
import compression from "compression";
import express from "express";
import { createRequestHandler } from "@react-router/express";
import { dbConfigFromEnv, migrate } from "./db/migrate.mjs";
import { mediaDir } from "./server-paths.mjs";

const PORT = Number(process.env.PORT || 3000);

async function prepareDatabase() {
  // O MySQL da Hostinger só aceita conexão local, então as migrations rodam daqui.
  const db = dbConfigFromEnv();
  if (!db) {
    console.log("[db] sem DB_NAME/DB_USER: usando os dados de exemplo");
    return;
  }
  try {
    const applied = await migrate(db);
    console.log(applied.length ? `[migrate] ${applied.length} aplicada(s): ${applied.join(", ")}` : "[migrate] banco atualizado");
  } catch (err) {
    // Não derruba o site: as páginas mostram erro só onde o banco é usado.
    console.error("[migrate] falhou:", err?.message ?? err);
  }
}

async function main() {
  await prepareDatabase();

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);
  // Domínio canônico sem www (evita conteúdo duplicado no Google).
  app.use((req, res, next) => {
    const host = req.headers.host ?? "";
    if (host.startsWith("www.")) return res.redirect(301, `https://${host.slice(4)}${req.originalUrl}`);
    next();
  });
  app.use(compression());

  // Arquivos com hash no nome podem ficar em cache "para sempre".
  app.use("/assets", express.static("build/client/assets", { immutable: true, maxAge: "1y" }));
  app.use(express.static("build/client", { maxAge: "1h" }));
  // Imagens das matérias (fora da pasta do app, sobrevivem aos deploys). Nome nunca é reaproveitado.
  app.use("/media", express.static(mediaDir(), { immutable: true, maxAge: "1y", index: false }));

  const build = await import("./build/server/index.js");
  app.use(createRequestHandler({ build, mode: process.env.NODE_ENV }));

  app.listen(PORT, () => console.log(`[respawnou] ouvindo na porta ${PORT}`));
}

main().catch((err) => {
  console.error("[respawnou] falha ao iniciar:", err);
  process.exit(1);
});
