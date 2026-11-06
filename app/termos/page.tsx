import type { Metadata } from "next";
import { ContactInfo, LegalPage } from "@/app/_components/legal-page";
import { CONTROLLER_NAME } from "@/lib/terms";

export const metadata: Metadata = {
  title: "Termos de Uso · Cancha Club",
};

/** Termos de Uso (pública). Rascunho gerado por IA: revisar com advogada. Ver `lib/terms.ts`. */
export default function TermsPage() {
  return (
    <LegalPage
      title="Termos de Uso"
      intro={<p>Estas regras valem para quem usa o Cancha Club. Ao aceitar, você concorda com elas. Escrevemos em linguagem simples de propósito.</p>}
      sections={[
        {
          title: "O que é o Cancha Club",
          body: (
            <>
              <p>
                O Cancha Club é um aplicativo que transforma a pelada de futsal da galera num jogo: depois de cada rodada, os jogadores
                dão notas uns aos outros, o app calcula cartas, ranking e prêmios, e as peladas podem se ver numa comunidade. É um
                serviço de entretenimento entre amigos. Ele não organiza jogos, não marca presença e não guarda placar.
              </p>
              <p>O serviço é operado por {CONTROLLER_NAME}, pessoa física, e hoje é oferecido sem custo.</p>
            </>
          ),
        },
        {
          title: "Sua conta",
          body: (
            <>
              <p>
                A conta é criada pelo administrador da sua pelada, com um usuário e uma senha. Guarde sua senha e não a passe a
                ninguém. Você pode trocá-la quando quiser, na página Eu. O que for feito com a sua conta vale como feito por você.
              </p>
              <p>
                O app é para maiores de 18 anos. Quem tem menos que isso só deve usar com o conhecimento e a autorização de um
                responsável, que responde pelo uso.
              </p>
            </>
          ),
        },
        {
          title: "Como usar",
          body: (
            <>
              <p>
                Dê notas de boa-fé, com honestidade e respeito. Não use o app para ofender, constranger, ameaçar ou perseguir
                ninguém, nem para tentar burlar as regras, acessar dados de outras pessoas ou derrubar o serviço.
              </p>
              <p>
                Envie como foto da carta apenas uma foto sua, ou de alguém que autorizou. Fotos que violem direitos de terceiros,
                tenham nudez ou conteúdo ofensivo podem ser removidas.
              </p>
            </>
          ),
        },
        {
          title: "A Comunidade",
          body: (
            <>
              <p>
                O Cancha Club é uma comunidade entre peladas. Para outras peladas, aparecem o seu <strong>apelido, a sua carta, a foto da
                carta, o seu OVR, patente e nível, os seus pontos e gols e as cartas especiais que você ganhou</strong>. Você também pode
                publicar uma conquista no feed.
              </p>
              <p>
                <strong>Nunca aparecem</strong> o seu nome completo, o seu usuário, as notas que você recebeu ou deu, nem o histórico
                rodada a rodada. As notas são anônimas: ninguém vê quem deu qual nota.
              </p>
              <p>
                Você pode remover do feed uma publicação sua a qualquer momento. Se quiser deixar de aparecer na comunidade, fale com a
                gente (veja Contato): vamos analisar o seu pedido.
              </p>
            </>
          ),
        },
        {
          title: "CanchaCoins, cartas e a Loja",
          body: (
            <>
              <p>
                CanchaCoins (CC), XP, níveis e cartas são itens virtuais do jogo. Não valem dinheiro, não podem ser trocados, vendidos
                ou transferidos e não são reembolsáveis. Eles são calculados a partir do histórico das rodadas e podem mudar se uma
                rodada for corrigida ou excluída.
              </p>
              <p>
                Hoje a Loja funciona só com CanchaCoins ganhas no jogo. Se um dia houver cobrança em dinheiro, avisaremos antes e as
                regras serão apresentadas na hora.
              </p>
            </>
          ),
        },
        {
          title: "Disponibilidade e mudanças",
          body: (
            <>
              <p>
                O serviço é oferecido como está. Fazemos o possível para mantê-lo no ar, mas podem ocorrer falhas, manutenções e
                mudanças. Podemos suspender uma pelada (por exemplo, por falta de pagamento, se um dia houver plano pago) ou encerrar
                contas que descumpram estes termos. Uma pelada suspensa continua visível, mas não cria rodadas novas.
              </p>
              <p>
                Podemos atualizar estes termos. Quando a mudança for relevante, o app pede um novo aceite antes de você continuar.
              </p>
            </>
          ),
        },
        {
          title: "Responsabilidades",
          body: (
            <p>
              O Cancha Club é um jogo entre amigos e as notas expressam a opinião de cada jogador, não a nossa. Não nos
              responsabilizamos por desavenças entre os participantes, nem por perdas indiretas decorrentes do uso do app, nos limites
              da lei. Nada aqui afasta direitos que a lei garante a você como consumidor.
            </p>
          ),
        },
        {
          title: "Privacidade, lei e contato",
          body: (
            <>
              <p>
                O tratamento dos seus dados pessoais está explicado na <a href="/privacidade" className="font-medium text-primary hover:underline">Política de Privacidade</a>.
                Estes termos seguem a lei brasileira, e qualquer dúvida pode ser resolvida no foro do seu domicílio.
              </p>
              <ContactInfo />
            </>
          ),
        },
      ]}
    />
  );
}
