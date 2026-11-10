import { StaticPage } from "~/components/StaticPage";
import { seo } from "~/lib/seo";
import { SITE } from "~/lib/site";

export const meta = () => seo({ title: "Política de privacidade", description: `Como o ${SITE.name} trata seus dados pessoais.`, path: "/privacidade" });

// Texto-base. Revisar antes do lançamento, principalmente ao ativar analytics, anúncios ou contas de usuário.
export default function Privacy() {
  return (
    <StaticPage title="Política de" accent="privacidade" lead={`Como o ${SITE.name} trata seus dados, de acordo com a Lei Geral de Proteção de Dados (LGPD).`}>
      <h2>Quais dados coletamos</h2>
      <p>
        Hoje o {SITE.name} não tem contas de usuário nem formulários de cadastro. Podemos coletar dados técnicos de navegação, como páginas visitadas, tipo de
        navegador e endereço IP, para medir audiência e manter o site seguro.
      </p>
      <h2>Cookies</h2>
      <p>Podemos usar cookies para lembrar preferências e medir o uso do site. Você pode bloqueá-los nas configurações do navegador.</p>
      <h2>Compartilhamento</h2>
      <p>Não vendemos dados pessoais. Dados técnicos podem ser processados por serviços de hospedagem e de métricas contratados para operar o site.</p>
      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento pelo e-mail{" "}
        <a href={`mailto:${SITE.email}`} className="text-paper underline hover:text-alert">
          {SITE.email}
        </a>
        .
      </p>
      <h2>Mudanças nesta política</h2>
      <p>Esta política será atualizada quando lançarmos novos recursos, como contas de usuário e comentários.</p>
    </StaticPage>
  );
}
