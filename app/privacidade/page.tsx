import type { Metadata } from "next";
import { ContactInfo, LegalPage } from "@/app/_components/legal-page";
import { CONTROLLER_NAME } from "@/lib/terms";

export const metadata: Metadata = {
  title: "Política de Privacidade · Cancha Club",
};

/** Política de Privacidade (pública, LGPD). Rascunho gerado por IA: revisar com advogada. Ver `lib/terms.ts`. */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Política de Privacidade"
      intro={<p>Aqui explicamos quais dados do Cancha Club tratamos, para quê, com quem aparecem e quais são os seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).</p>}
      sections={[
        {
          title: "Quem é responsável pelos dados",
          body: (
            <>
              <p>O controlador dos dados é {CONTROLLER_NAME}, que opera o Cancha Club.</p>
              <ContactInfo />
            </>
          ),
        },
        {
          title: "Quais dados tratamos",
          body: (
            <ul className="list-disc space-y-1.5 pl-5">
              <li><strong>Cadastro:</strong> nome completo, apelido, posição, usuário e senha (a senha é guardada de forma protegida, nunca em texto legível). Em contas antigas, o e-mail.</li>
              <li><strong>Foto:</strong> a foto que você envia para a carta, a versão sem fundo e a original, além de uma versão melhorada quando o recorte usa inteligência artificial.</li>
              <li><strong>Uso do jogo:</strong> presença nas rodadas, notas dadas e recebidas, votos, gols informados e confirmados, cartas, XP, CanchaCoins e compras na Loja.</li>
              <li><strong>Técnicos:</strong> cookies essenciais de sessão e da pelada ativa, e dados de funcionamento do serviço.</li>
            </ul>
          ),
        },
        {
          title: "Para que usamos",
          body: (
            <>
              <p>
                Usamos os dados para fazer o app funcionar: criar e manter a sua conta, calcular OVR, cartas, ranking e prêmios, mostrar
                a sua carta e o seu perfil, permitir a comunidade entre peladas e manter a segurança do serviço. A base legal é a
                execução do serviço que você usa (art. 7º, V, da LGPD) e, para o uso da sua imagem na carta e na comunidade, o seu
                consentimento ao aceitar estes documentos (art. 7º, I).
              </p>
              <p>Não vendemos os seus dados e não fazemos publicidade com eles.</p>
            </>
          ),
        },
        {
          title: "Quem vê o quê",
          body: (
            <>
              <p>
                <strong>Na sua pelada:</strong> os outros jogadores veem a sua carta, o seu apelido, o seu perfil e as suas conquistas.
                O administrador da pelada também vê o seu nome completo e o seu usuário, porque cria e gerencia as contas.
              </p>
              <p>
                <strong>Em outras peladas (Comunidade):</strong> apelido, carta, foto da carta, OVR, patente, nível, pontos, gols e
                cartas especiais, e as conquistas que você publicar no feed.
              </p>
              <p>
                <strong>Nunca aparecem fora do que está descrito:</strong> as notas que você deu e recebeu são anônimas (ninguém vê
                quem deu qual nota), e o seu nome completo e usuário não saem da sua pelada.
              </p>
            </>
          ),
        },
        {
          title: "Serviços que usamos",
          body: (
            <>
              <p>Para funcionar, usamos empresas que tratam dados em nosso nome:</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li><strong>Supabase:</strong> banco de dados, login e armazenamento de fotos.</li>
                <li><strong>Vercel:</strong> hospedagem do aplicativo.</li>
                <li><strong>Hugging Face e remove.bg:</strong> recorte e melhoria da foto da carta, quando você envia uma foto.</li>
              </ul>
              <p>
                Esses serviços podem processar dados fora do Brasil, como nos Estados Unidos. Escolhemos fornecedores que adotam
                medidas de segurança e protegem os dados, e esse tratamento fora do país ocorre para prestar o serviço (art. 33 da
                LGPD).
              </p>
            </>
          ),
        },
        {
          title: "Por quanto tempo guardamos",
          body: (
            <p>
              Guardamos os dados enquanto a sua conta e a sua pelada existirem, porque o histórico (notas, cartas, ranking) é o
              coração do jogo. Quando uma pelada é excluída, o cadastro, as rodadas, as notas, as cartas, as fotos e as contas de quem
              só estava nela são apagados. Você pode pedir a exclusão da sua conta a qualquer momento.
            </p>
          ),
        },
        {
          title: "Seus direitos",
          body: (
            <>
              <p>
                Você pode pedir: confirmação de que tratamos seus dados, acesso, correção, anonimização ou exclusão de dados
                desnecessários, portabilidade, informação sobre com quem compartilhamos e a revogação do seu consentimento (art. 18 da
                LGPD). Revogar o consentimento ou excluir a conta pode impedir o uso do app.
              </p>
              <p>
                Para pedir a exclusão da sua conta, use o botão <strong>Apagar minha conta</strong> na página Eu do app. O pedido chega
                a quem opera o Cancha Club, que responde em até 15 dias. Ao apagar a conta, saem a sua carta, as suas cartas especiais e
                as notas que você deu e recebeu, o que pode mudar o OVR e o ranking de outros jogadores.
              </p>
              <ContactInfo />
              <p>Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>
            </>
          ),
        },
        {
          title: "Segurança, crianças e mudanças",
          body: (
            <>
              <p>
                Usamos senhas protegidas, conexão segura e acesso restrito aos dados. Nenhum sistema é totalmente imune a falhas; se
                houver um incidente que afete você, avisaremos como a lei exige.
              </p>
              <p>O app é para maiores de 18 anos. Menores só devem usar com autorização de um responsável.</p>
              <p>Podemos atualizar esta política. Quando a mudança for relevante, o app pede um novo aceite.</p>
            </>
          ),
        },
      ]}
    />
  );
}
