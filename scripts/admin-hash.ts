// Gera as variáveis de acesso ao painel /admin. Rode no seu computador: `npm run admin:hash`
// Pede a senha sem mostrar na tela e imprime ADMIN_PASSWORD_HASH e um SESSION_SECRET novo
// para colar no hPanel. A senha em si não é salva em lugar nenhum.
import { randomBytes } from "node:crypto";
import { stdin, stdout } from "node:process";
import { hashPassword } from "../app/lib/admin/auth.server.ts";

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    stdout.write(question);
    let value = "";
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          return resolve(value);
        }
        if (c === "\u0003") process.exit(1); // Ctrl+C
        if (c === "\u007f" || c === "\b") value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on("data", onData);
  });
}

const password = await ask("Senha do painel (mín. 12 caracteres): ");
if (password.length < 12) {
  console.error("Senha curta demais: use pelo menos 12 caracteres.");
  process.exit(1);
}
const confirm = await ask("Repita a senha: ");
if (confirm !== password) {
  console.error("As senhas não conferem.");
  process.exit(1);
}

console.log("\nCadastre no hPanel (Sites → respawnou.com.br → Node.js → Variáveis de ambiente):\n");
console.log("ADMIN_EMAIL=<seu e-mail de login>");
console.log(`ADMIN_PASSWORD_HASH=${await hashPassword(password)}`);
console.log(`SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
console.log("\nNão mande esses valores no chat. Depois de salvar, acesse https://respawnou.com.br/admin");
