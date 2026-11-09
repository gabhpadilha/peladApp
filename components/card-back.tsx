import { PACK_RARITY_NAMES, type PackRarity } from "@/lib/packs";

/**
 * Verso da carta, um por raridade (ideia do dono do app em 2026-11-09: a carta gira e o verso mostra a raridade da skin).
 * Cada nível acrescenta ornamento: comum, moldura simples; rara, moldura dupla, luas e estrelas; épica, anel de marcas com raios
 * e o brilho do sol; lendária, tudo isso mais filigranas, mais raios e o campo de estrelas, em ouro sobre preto.
 * No centro, o cristal da raridade (`public/rarity/`, renderizado com three.js). A arte final de cada verso pode ser trocada por uma
 * imagem do Gemini (`public/cartas/versos/<raridade>.webp`) sem mexer em quem usa o componente.
 */
type Look = { bg: [string, string]; line: string; soft: string; glow: string; text: string };

const LOOKS: Record<PackRarity, Look> = {
  comum: { bg: ["#1b232b", "#0e1318"], line: "#aab8c6", soft: "#5e6c79", glow: "170,184,198", text: "#d3dce5" },
  rara: { bg: ["#0f1f56", "#080f2c"], line: "#cfe2ff", soft: "#5679c9", glow: "86,150,255", text: "#e4efff" },
  epica: { bg: ["#321262", "#160733"], line: "#f2dca5", soft: "#9a6bd6", glow: "184,112,255", text: "#f6e8c2" },
  lendaria: { bg: ["#15100a", "#050403"], line: "#f3c969", soft: "#9b7a33", glow: "255,196,84", text: "#ffe29a" },
};

const W = 500;
const H = 700;
const CX = 250;
const CY = 330;

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

/** Estrela de quatro pontas curvas. */
function star(cx: number, cy: number, r: number): string {
  const k = r * 0.16;
  return `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
}

function ringPoint(r: number, angle: number): [number, number] {
  return [CX + Math.cos(angle) * r, CY + Math.sin(angle) * r];
}

/** Raios e marcas em volta do anel do centro. */
function rays(count: number, inner: number, longEvery: number, short: number, long: number): string {
  let d = "";
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const length = i % longEvery === 0 ? long : short;
    const [x1, y1] = ringPoint(inner, a);
    const [x2, y2] = ringPoint(inner + length, a);
    d += `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d;
}

/** Ornamento de canto: dois arcos e uma estrela. */
function corner(x: number, y: number, sx: number, sy: number, rich: boolean): string {
  let d = `M${x} ${y + sy * 70}A70 70 0 0 ${sx * sy > 0 ? 1 : 0} ${x + sx * 70} ${y}`;
  d += `M${x} ${y + sy * 46}A46 46 0 0 ${sx * sy > 0 ? 1 : 0} ${x + sx * 46} ${y}`;
  if (rich) d += `M${x} ${y + sy * 24}A24 24 0 0 ${sx * sy > 0 ? 1 : 0} ${x + sx * 24} ${y}`;
  return d;
}

function Art({ rarity }: { rarity: PackRarity }) {
  const look = LOOKS[rarity];
  const level = ["comum", "rara", "epica", "lendaria"].indexOf(rarity);
  const rand = seeded(11 + level * 7);

  const dots: [number, number, number][] = [];
  const dotCount = [0, 46, 70, 120][level];
  for (let i = 0; i < dotCount; i++) {
    const x = 70 + rand() * (W - 140);
    const y = 70 + rand() * (H - 140);
    if (Math.hypot(x - CX, y - CY) < 215) continue;
    dots.push([x, y, 0.8 + rand() * 1.6]);
  }
  const starSpots: [number, number, number][] = [
    [120, 110, 15], [380, 110, 15], [120, 590, 15], [380, 590, 15],
    [90, 330, 11], [410, 330, 11], [250, 70, 12], [250, 630, 12],
    [170, 190, 9], [330, 190, 9], [170, 470, 9], [330, 470, 9],
    [70, 200, 8], [430, 200, 8], [70, 460, 8], [430, 460, 8],
  ];
  const starCount = [4, 8, 12, 16][level];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <linearGradient id={`bg-${rarity}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.bg[0]} />
          <stop offset="1" stopColor={look.bg[1]} />
        </linearGradient>
        <radialGradient id={`halo-${rarity}`} cx="50%" cy="47%" r="45%">
          <stop offset="0" stopColor={`rgb(${look.glow})`} stopOpacity={0.34 + level * 0.06} />
          <stop offset="1" stopColor={`rgb(${look.glow})`} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#bg-${rarity})`} />
      <rect width={W} height={H} fill={`url(#halo-${rarity})`} />

      {/* Molduras */}
      <g fill="none" stroke={look.line} strokeLinejoin="round">
        <rect x="22" y="22" width={W - 44} height={H - 44} rx="30" strokeWidth="3" />
        {level >= 1 && <rect x="38" y="38" width={W - 76} height={H - 76} rx="20" strokeWidth="1.2" opacity="0.8" />}
        {level >= 3 && <rect x="48" y="48" width={W - 96} height={H - 96} rx="14" strokeWidth="0.8" strokeDasharray="2 5" opacity="0.7" />}
        {level >= 1 && (
          <g strokeWidth="1.4" opacity="0.85">
            <path d={corner(38, 38, 1, 1, level >= 3)} />
            <path d={corner(W - 38, 38, -1, 1, level >= 3)} />
            <path d={corner(38, H - 38, 1, -1, level >= 3)} />
            <path d={corner(W - 38, H - 38, -1, -1, level >= 3)} />
          </g>
        )}
      </g>

      {/* Anéis do centro */}
      <g fill="none" stroke={look.line}>
        <circle cx={CX} cy={CY} r="148" strokeWidth="2" />
        {level >= 1 && <circle cx={CX} cy={CY} r="158" strokeWidth="0.9" opacity="0.8" />}
        {level >= 2 && <path d={rays(72, 162, 6, 7, 14)} strokeWidth="1.2" opacity="0.9" />}
        {level >= 2 && <circle cx={CX} cy={CY} r="178" strokeWidth="0.8" opacity="0.7" />}
        {level >= 2 && <path d={rays(level === 3 ? 48 : 32, 184, 2, 20, 46)} strokeWidth="1.1" opacity="0.8" />}
        {level >= 3 && <circle cx={CX} cy={CY} r="236" strokeWidth="0.8" strokeDasharray="1 6" opacity="0.8" />}
      </g>

      {/* Sol e lua nas extremidades (épica e lendária) e luas (rara) */}
      <g fill={look.line}>
        {level >= 1 && (
          <>
            <path d="M92 150a42 42 0 1 0 38 56 34 34 0 1 1-38-56z" transform="translate(-6 -2)" opacity="0.95" />
            <path d="M408 150a42 42 0 1 1-38 56 34 34 0 1 0 38-56z" transform="translate(6 -2)" opacity="0.95" />
            <path d="M92 550a42 42 0 1 1 38-56 34 34 0 1 0-38 56z" transform="translate(-6 2)" opacity="0.95" />
            <path d="M408 550a42 42 0 1 0-38-56 34 34 0 1 1 38 56z" transform="translate(6 2)" opacity="0.95" />
          </>
        )}
        {starSpots.slice(0, starCount).map(([x, y, r]) => (
          <path key={`${x}-${y}`} d={star(x, y, r)} />
        ))}
        {dots.map(([x, y, r]) => (
          <circle key={`${x.toFixed(0)}-${y.toFixed(0)}`} cx={x} cy={y} r={r} opacity="0.7" />
        ))}
      </g>

      {level >= 2 && (
        <g fill="none" stroke={look.line} strokeWidth="1.3" opacity="0.9">
          <circle cx={CX} cy="76" r="16" />
          <path d={rays(16, 0, 1, 0, 0)} />
          <circle cx={CX} cy={H - 76} r="16" />
        </g>
      )}
    </svg>
  );
}

export function CardBack({ rarity, skinName, className }: { rarity: PackRarity; skinName: string; className?: string }) {
  const look = LOOKS[rarity];
  return (
    <div
      className={`@container relative aspect-[5/7] w-full overflow-hidden rounded-[9%/6.5%] select-none ${className ?? ""}`}
      style={{ boxShadow: `0 0 0 1px rgba(${look.glow},.35), 0 10px 28px rgba(0,0,0,.5)` }}
    >
      <Art rarity={rarity} />
      {/* Cristal da raridade no centro dos anéis */}
      {/* eslint-disable-next-line @next/next/no-img-element -- imagem estática (public/rarity), sem o otimizador do Next */}
      <img
        alt=""
        aria-hidden
        src={`/rarity/${rarity}.webp`}
        className="absolute left-1/2 h-[44%] w-auto -translate-x-1/2 -translate-y-1/2"
        style={{ top: `${(CY / H) * 100}%` }}
      />
      <span
        className="absolute inset-x-0 top-[13.5%] text-center font-display text-[6.6cqw] leading-none font-bold tracking-[0.28em] uppercase"
        style={{ color: look.text }}
      >
        {skinName}
      </span>
      <span
        className="absolute inset-x-0 bottom-[12.5%] text-center font-display text-[10cqw] leading-none font-extrabold tracking-[0.3em] uppercase"
        style={{ color: look.line }}
      >
        {PACK_RARITY_NAMES[rarity]}
      </span>
    </div>
  );
}
