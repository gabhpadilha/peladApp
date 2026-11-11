import type { CSSProperties } from "react";
import { BrandMark } from "@/components/brand-logo";
import type { PackTier } from "@/lib/packs";
import { cn } from "@/lib/utils";

/**
 * Capa do pacote: UMA arte só, usada na animação de abertura, em "Meus pacotes" e no aviso da rodada.
 * O desenho é sempre o mesmo (marca, nome da faixa, rodada e evento); o que muda por evento é o PADRÃO do fundo (`PACK_PATTERNS`)
 * e a cor vem da faixa do pacote. Tudo escala pela largura da capa (unidades `cqw`), então serve de 30 a 260 px.
 */
type TierLook = { rgb: string; from: string; to: string; name: string };

const TIER_LOOKS: Record<PackTier, TierLook> = {
  A: { rgb: "252,211,77", from: "#3a2f10", to: "#15100a", name: "Craque" },
  B: { rgb: "182,242,60", from: "#1f3312", to: "#0c150e", name: "Destaque" },
  C: { rgb: "125,211,252", from: "#16283a", to: "#0a1219", name: "Pelada" },
  D: { rgb: "212,212,216", from: "#2a2d2f", to: "#101213", name: "Reserva" },
};

/** Nome de cada faixa (Craque, Destaque, Pelada, Reserva). */
export const PACK_TIER_NAMES: Record<PackTier, string> = { A: TIER_LOOKS.A.name, B: TIER_LOOKS.B.name, C: TIER_LOOKS.C.name, D: TIER_LOOKS.D.name };

/** Padrão de fundo por evento (mês do conjunto, `AAAA-MM`). Evento novo = uma linha aqui e um caso em `PatternLayer`. */
type PackPatternKind = "storm" | "plain";
const PACK_PATTERNS: Record<string, { kind: PackPatternKind; label: string }> = {
  "2026-11": { kind: "storm", label: "Toró · Nov 2026" },
};

export function getPackPattern(month: string | null | undefined): { kind: PackPatternKind; label: string | null } {
  return (month ? PACK_PATTERNS[month] : undefined) ?? { kind: "plain", label: null };
}

/** Altura da tampa (a parte que voa na abertura), em % da capa. */
export const PACK_CAP_PERCENT = 14.4;

const CRIMP =
  "polygon(0% 2.6cqw,5% 0,10% 2.6cqw,15% 0,20% 2.6cqw,25% 0,30% 2.6cqw,35% 0,40% 2.6cqw,45% 0,50% 2.6cqw,55% 0,60% 2.6cqw,65% 0,70% 2.6cqw,75% 0,80% 2.6cqw,85% 0,90% 2.6cqw,95% 0,100% 2.6cqw,100% 100%,0% 100%)";

/** Raio em traço (sem preenchimento), no tom da faixa. */
function Bolt({ rgb, style }: { rgb: string; style: CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 40 100" className="absolute" style={style} fill="none" stroke={`rgb(${rgb})`} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      <path d="M26 0 L9 46 H21 L12 100 L33 40 H20 L26 0 Z" />
    </svg>
  );
}

function PatternLayer({ kind, rgb }: { kind: PackPatternKind; rgb: string }) {
  if (kind !== "storm") return null;
  return (
    <>
      {/* Chuva: riscos inclinados em todo o fundo, nuvem pesada no alto e raios dos dois lados. */}
      <div aria-hidden className="absolute inset-0" style={{ background: `repeating-linear-gradient(105deg, transparent 0 3.2cqw, rgba(${rgb},.17) 3.2cqw 3.6cqw)` }} />
      <div aria-hidden className="absolute inset-x-0 top-[14%] h-[34%]" style={{ background: `radial-gradient(70% 90% at 50% 0%, rgba(${rgb},.22), transparent 72%)` }} />
      <Bolt rgb={rgb} style={{ left: "6%", top: "30%", width: "13%", opacity: 0.5 }} />
      <Bolt rgb={rgb} style={{ right: "7%", top: "52%", width: "10%", opacity: 0.4, transform: "scaleX(-1)" }} />
    </>
  );
}

type PackCoverProps = {
  tier: PackTier;
  /** Mês do conjunto (`AAAA-MM`): escolhe o padrão do evento. */
  month?: string | null;
  /** Número da rodada (some nas miniaturas). */
  round?: number | null;
  className?: string;
  /** Sem o recorte serrilhado de cima: a arte plana, usada como textura do pacote 3D (`scripts/blender/pacote.py`). */
  flat?: boolean;
};

/** A capa inteira (proporção 21:32). O tamanho vem de `className` (largura ou altura). */
export function PackCover({ tier, month, round, className, flat = false }: PackCoverProps) {
  const look = TIER_LOOKS[tier];
  const pattern = getPackPattern(month);
  const rgb = look.rgb;
  const inset = `${PACK_CAP_PERCENT + 3.5}% 5.5% 4.5% 5.5%`;
  return (
    <div aria-hidden className={cn("@container relative aspect-[21/32] shrink-0", className)}>
      <div className="absolute inset-0" style={{ clipPath: flat ? undefined : CRIMP, background: `linear-gradient(165deg, ${look.from} 0%, ${look.to} 62%, ${look.from} 100%)` }}>
        <PatternLayer kind={pattern.kind} rgb={rgb} />
        {/* Tampa: faixa mais escura com a emenda embaixo. */}
        <div className="absolute inset-x-0 top-0" style={{ height: `${PACK_CAP_PERCENT}%`, background: "linear-gradient(180deg, rgba(255,255,255,.1), rgba(0,0,0,.28))" }} />
        <div className="absolute inset-x-0" style={{ top: `${PACK_CAP_PERCENT}%`, height: "0.7cqw", background: `rgba(${rgb},.55)` }} />
        {/* Moldura fina da parte de baixo. */}
        <div className="absolute rounded-[3cqw]" style={{ inset, border: `0.7cqw solid rgba(${rgb},.5)` }} />
        <div className="absolute flex flex-col items-center justify-center text-center font-display" style={{ inset, gap: "3cqw" }}>
          <div style={{ width: "28cqw", color: `rgb(${rgb})` }}><BrandMark className="h-auto w-full text-inherit" /></div>
          <div className="flex flex-col items-center @max-[90px]:hidden" style={{ gap: "3cqw" }}>
            <span className="leading-none font-extrabold text-white" style={{ fontSize: "7.6cqw", letterSpacing: "0.3em" }}>CANCHA CLUB</span>
            <span className="leading-none font-extrabold uppercase" style={{ fontSize: "17cqw", color: `rgb(${rgb})` }}>{look.name}</span>
            <span className="font-sans leading-none font-medium tracking-wide text-white/75 uppercase" style={{ fontSize: "5.2cqw" }}>
              {round ? `Pacote · Rodada ${round}` : "Pacote de skin"}
            </span>
            {pattern.label && (
              <span className="rounded-full font-sans leading-none font-semibold tracking-wider uppercase" style={{ fontSize: "4.6cqw", padding: "1.6cqw 3.6cqw", color: `rgb(${rgb})`, background: `rgba(${rgb},.12)`, border: `0.5cqw solid rgba(${rgb},.45)` }}>
                {pattern.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
