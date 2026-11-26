// Caminhos compartilhados entre o servidor Express (server-app.js) e o app (robô).
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Pasta das imagens das matérias. Fica FORA da pasta do app: a cada deploy o app é trocado
 * e as imagens precisam sobreviver. Na VPS é /data/media (pasta do servidor montada no container).
 * Servida em /media (cache de 1 ano: o nome do arquivo nunca é reaproveitado).
 */
export function mediaDir() {
  return process.env.MEDIA_DIR || join(homedir(), "respawnou-media");
}
