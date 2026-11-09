import { PACK_RARITY_NAMES, type PackRarity } from "@/lib/packs";

/**
 * Verso da carta, um por raridade (ideia do dono do app em 2026-11-09: a carta gira e o verso mostra a raridade da skin).
 * Estilo aprovado: placa lisa e fosca, fio fino na cor da raridade, a quadra de futsal vista de cima (a própria logo é uma quadra) e,
 * no centro, uma moeda com a logo (a arte da moeda é do Gemini, em quatro cores: `public/cartas/versos/moeda-<raridade>.webp`).
 * As linhas da quadra são desenhadas em código na proporção real (quadra de 40 x 20 m: área de 6 m em quartos de círculo e
 * linha reta de 3 m, marca do pênalti a 6 m e a de 10 m, círculo central, escanteios e marcas do banco), simétricas nos dois lados:
 * foi o erro da imagem gerada, que desenhava a quadra torta.
 */
type Look = { plate: [string, string]; line: [string, string, string]; glow: string; text: string };

const LOOKS: Record<PackRarity, Look> = {
  comum: { plate: ["#22272c", "#111417"], line: ["#e4eaf0", "#9aa7b4", "#5d6874"], glow: "170,184,198", text: "#cdd6de" },
  rara: { plate: ["#14234f", "#0a1330"], line: ["#e6f1ff", "#8fb4ee", "#4f72b4"], glow: "86,150,255", text: "#dbe9ff" },
  epica: { plate: ["#2d1559", "#150a2f"], line: ["#fbeccb", "#d9b878", "#8f6f3a"], glow: "184,112,255", text: "#f6e8c2" },
  lendaria: { plate: ["#191714", "#070605"], line: ["#ffe7a3", "#e2b24a", "#8d6720"], glow: "255,196,84", text: "#ffe29a" },
};

const W = 1000;
const H = 1400;
const CX = 500;

// Quadra (vertical): 20 m de largura x 40 m de comprimento a 28 px por metro.
const M = 28;
const COURT = { x: 500 - 10 * M, y: 140, w: 20 * M, h: 40 * M };
const MID_Y = COURT.y + COURT.h / 2;
const GOAL_HALF = 1.5 * M;
const AREA_R = 6 * M;

/** Linhas de uma meta (a de cima; a de baixo é o espelho): área, marca do pênalti e a segunda marca. */
function goalEnd(top: boolean): { path: string; marks: [number, number][] } {
  const s = top ? 1 : -1;
  const goalY = top ? COURT.y : COURT.y + COURT.h;
  const left = CX - GOAL_HALF;
  const right = CX + GOAL_HALF;
  const lineY = goalY + s * AREA_R;
  const sweep = top ? 0 : 1;
  const sweepRight = top ? 0 : 1;
  const path = `M${left - AREA_R} ${goalY}A${AREA_R} ${AREA_R} 0 0 ${sweep} ${left} ${lineY}L${right} ${lineY}A${AREA_R} ${AREA_R} 0 0 ${sweepRight} ${right + AREA_R} ${goalY}`;
  return { path, marks: [[CX, goalY + s * 6 * M], [CX, goalY + s * 10 * M]] };
}

function courtPaths(): { lines: string; marks: [number, number][] } {
  const top = goalEnd(true);
  const bottom = goalEnd(false);
  const r = 14;
  const { x, y, w, h } = COURT;
  // Escanteios: arcos pequenos nos quatro cantos.
  const corners = `M${x + r} ${y}A${r} ${r} 0 0 1 ${x} ${y + r}M${x + w - r} ${y}A${r} ${r} 0 0 0 ${x + w} ${y + r}M${x} ${y + h - r}A${r} ${r} 0 0 1 ${x + r} ${y + h}M${x + w} ${y + h - r}A${r} ${r} 0 0 0 ${x + w - r} ${y + h}`;
  // Marcas do banco nas laterais: a 5 m de cada escanteio, para dentro e para fora.
  const ticks = [y + 5 * M, y + h - 5 * M].map((ty) => `M${x - 16} ${ty}H${x + 16}M${x + w - 16} ${ty}H${x + w + 16}`).join("");
  const lines = [
    `M${x} ${y}H${x + w}V${y + h}H${x}Z`,
    `M${x} ${MID_Y}H${x + w}`,
    top.path,
    bottom.path,
    corners,
    ticks,
  ].join("");
  return { lines, marks: [...top.marks, ...bottom.marks] };
}

const COURT_PATHS = courtPaths();

function Art({ rarity }: { rarity: PackRarity }) {
  const look = LOOKS[rarity];
  const id = (name: string) => `${name}-${rarity}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <linearGradient id={id("plate")} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor={look.plate[0]} />
          <stop offset="1" stopColor={look.plate[1]} />
        </linearGradient>
        <radialGradient id={id("halo")} cx="50%" cy="50.7%" r="38%">
          <stop offset="0" stopColor={`rgb(${look.glow})`} stopOpacity="0.28" />
          <stop offset="1" stopColor={`rgb(${look.glow})`} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("foil")} x1="0" y1="0" x2="1" y2="1" gradientUnits="userSpaceOnUse" gradientTransform={`scale(${W / 1000})`}>
          <stop offset="0" stopColor={look.line[0]} />
          <stop offset="0.45" stopColor={look.line[1]} />
          <stop offset="0.7" stopColor={look.line[0]} />
          <stop offset="1" stopColor={look.line[2]} />
        </linearGradient>
        <linearGradient id={id("sheen")} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id("plate")})`} />
      <rect width={W} height={H} fill={`url(#${id("halo")})`} />
      <rect width={W} height={H} fill={`url(#${id("sheen")})`} />

      {/* Cada traço é desenhado três vezes: sombra, fio e reflexo, para parecer relevo em foil. */}
      {[
        { dx: 2, dy: 3, stroke: "#000", opacity: 0.7, width: 1 },
        { dx: 0, dy: 0, stroke: `url(#${id("foil")})`, opacity: 1, width: 1 },
        { dx: -0.8, dy: -0.8, stroke: look.line[0], opacity: 0.35, width: 0.4 },
      ].map((pass, index) => (
        <g key={index} transform={`translate(${pass.dx} ${pass.dy})`} fill="none" stroke={pass.stroke} strokeOpacity={pass.opacity} strokeLinecap="round" strokeLinejoin="round">
          {/* Moldura externa e fio interno */}
          <rect x="36" y="36" width={W - 72} height={H - 72} rx="44" strokeWidth={8 * pass.width} />
          <rect x="56" y="56" width={W - 112} height={H - 112} rx="30" strokeWidth={3 * pass.width} />
          {/* Quadra */}
          <path d={COURT_PATHS.lines} strokeWidth={4.5 * pass.width} />
          <circle cx={CX} cy={MID_Y} r={6 * M} strokeWidth={4.5 * pass.width} />
          <circle cx={CX} cy={MID_Y} r={6 * M + 16} strokeWidth={2 * pass.width} />
          {/* Plaquinhas (nome da skin em cima, raridade embaixo) */}
          <rect x={CX - 210} y="76" width="420" height="52" rx="14" strokeWidth={4 * pass.width} />
          <rect x={CX - 230} y={H - 128} width="460" height="62" rx="16" strokeWidth={4 * pass.width} />
        </g>
      ))}
      <g fill={`url(#${id("foil")})`}>
        {COURT_PATHS.marks.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5" />
        ))}
        <circle cx={CX} cy={MID_Y} r="0" />
      </g>
    </svg>
  );
}

export function CardBack({ rarity, skinName, className }: { rarity: PackRarity; skinName: string; className?: string }) {
  const look = LOOKS[rarity];
  return (
    <div
      className={`@container relative aspect-[5/7] w-full overflow-hidden rounded-[6%/4.3%] select-none ${className ?? ""}`}
      style={{ boxShadow: `0 0 0 1px rgba(${look.glow},.35), 0 10px 28px rgba(0,0,0,.5)` }}
    >
      <Art rarity={rarity} />
      {/* eslint-disable-next-line @next/next/no-img-element -- imagem estática (public/cartas/versos), sem o otimizador do Next */}
      <img
        alt=""
        aria-hidden
        src={`/cartas/versos/moeda-${rarity}.webp`}
        className="absolute left-1/2 aspect-square w-[28%] -translate-x-1/2 -translate-y-1/2"
        style={{ top: `${((MID_Y) / H) * 100}%` }}
      />
      <span
        className="absolute inset-x-0 text-center font-display text-[4.2cqw] leading-none font-bold tracking-[0.22em] uppercase"
        style={{ color: look.text, top: `${(102 / H) * 100}%`, transform: "translateY(-50%)" }}
      >
        {skinName}
      </span>
      <span
        className="absolute inset-x-0 text-center font-display text-[6.4cqw] leading-none font-extrabold tracking-[0.3em] uppercase"
        style={{ color: look.line[1], top: `${((H - 97) / H) * 100}%`, transform: "translateY(-50%)" }}
      >
        {PACK_RARITY_NAMES[rarity]}
      </span>
    </div>
  );
}
