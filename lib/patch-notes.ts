/**
 * Patch notes do app (2026-11-12, pedido do dono do app): um bloco por mês, o mais novo primeiro. A Home mostra o último no primeiro slide
 * e a página `/novidades` mostra todos. Mês novo = um objeto novo no começo de `PATCH_NOTES` (e o vídeo em `public/patch-notes/`).
 */
export type PatchVisual = "premios" | "skins" | "pacotes" | "raridade" | "mercado" | "objetivos" | "lista";

export type PatchSection = {
  visual: PatchVisual;
  title: string;
  text: string;
  /** Só no visual "lista": pares título e descrição. */
  items?: readonly (readonly [string, string])[];
  href?: string;
  cta?: string;
};

export type PatchMonth = {
  /** `AAAA-MM`. */
  key: string;
  title: string;
  /** Evento do mês (tema das cartas). */
  event: string;
  /** Faixa de versões do mês, para quem acompanha. */
  versions: string;
  summary: string;
  /** Pontos de destaque (chips). */
  highlights: readonly string[];
  /** Vídeo do mês (vertical) e a imagem de capa; `duration` em texto ("1:20"). */
  video: { src: string; poster: string; duration: string };
  sections: readonly PatchSection[];
};

export const PATCH_NOTES: readonly PatchMonth[] = [
  {
    key: "2026-11",
    title: "Patch notes de novembro",
    event: "Evento Toró",
    versions: "3.11 a 3.28",
    summary: "O mês foi de colecionar: agora todo jogo rende pacote, e o que sai dele vira coleção, troca e meta.",
    highlights: ["Pacotes de skins", "Mercado", "Objetivos do mês"],
    video: { src: "/patch-notes/2026-11.mp4", poster: "/patch-notes/2026-11-poster.jpg", duration: "1:20" },
    sections: [
      { visual: "premios", title: "Os prêmios do Toró", text: "Vêm ao fechar a rodada, com o visual do evento, e ficam na coleção para sempre." },
      { visual: "skins", title: "Skins do conjunto Toró", text: "Doze skins nos pacotes do mês, da comum à lendária.", href: "/loja", cta: "Ver a Loja" },
      { visual: "pacotes", title: "Pacotes de skins", text: "Cada pacote traz 1 skin do conjunto do mês. Ganhe ao fechar a rodada, no pacote de boas-vindas ou compre na Loja.", href: "/loja", cta: "Ver os pacotes" },
      { visual: "raridade", title: "Raridade das skins", text: "Comum, rara, épica e lendária. Toque numa carta em Minhas cartas e ela vira para mostrar a raridade no verso.", href: "/eu#minhas-cartas", cta: "Ver minhas cartas" },
      { visual: "mercado", title: "Mercado e venda rápida", text: "Venda skins para jogadores de todas as peladas ou faça uma venda rápida. A repetida de pacote fica guardada para vender.", href: "/loja/mercado", cta: "Ir para o Mercado" },
      { visual: "objetivos", title: "Objetivos do mês", text: "Um objetivo fácil, um médio e um difícil. Cumpriu, ganha um pacote: quanto mais difícil, melhor.", href: "/objetivos", cta: "Ver os objetivos" },
      {
        visual: "lista",
        title: "Também chegou",
        text: "Outras mudanças do mês.",
        items: [
          ["Comunidade", "Veja outras peladas, rankings e perfis"],
          ["OVR de carreira", "Cada gol confirmado soma +1 no Ataque"],
          ["Desempate dos prêmios", "Regra clara quando a nota empata"],
          ["Corrigir a lista da rodada", "O organizador ajusta antes de as notas abrirem"],
          ["Termos e privacidade", "Aceite no primeiro acesso"],
        ],
      },
    ],
  },
];

export const LATEST_PATCH_NOTES = PATCH_NOTES[0];
