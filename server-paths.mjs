// Caminhos compartilhados entre o servidor Express (server-app.js) e o app (robô).
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Pasta das imagens das matérias. Fica FORA da pasta do app: a cada deploy a Hostinger
 * cria uma versão nova do app e a anterior some; as imagens precisam sobreviver.
 * Servida em /media (cache de 1 ano: o nome do arquivo nunca é reaproveitado).
 */
export function mediaDir() {
  return process.env.MEDIA_DIR || join(homedir(), "respawnou-media");
}
