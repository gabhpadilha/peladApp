"use client";

import {
  getCanchaCardLook,
  getNeonTrimShape,
  mirrorPath,
  NEON_HALO_DIM_STROKES,
  NEON_HALO_STROKES,
  type Roupa,
} from "@/components/cancha-card";
import { CARD_THEME_LABELS, type CardThemeKey } from "@/lib/card-themes";
import type { CardRank } from "@/lib/card-rank";
import { formatMonth, formatWeekdayDate } from "@/lib/format-date";
import { getInitials } from "@/lib/get-initials";
import { AWARD_LABELS, formatRoundScore, hasSeasonalTheme, STAT_AWARD_SOURCES, type Award } from "@/types/award";

/**
 * Story do Instagram (1080 × 1920) desenhado direto num canvas, peça por peça, com as
 * mesmas contas da carta (`getCanchaCardLook`). Substitui a captura da tela
 * (`modern-screenshot`), que no iPhone (Safari e Chrome) saía sem o fundo e sem o nome da
 * carta (pedido do dono do app em 2026-10-30: "recriar do zero").
 */

export const STORY_SIZE = { width: 1080, height: 1920 } as const;

const PRIMARY = "#bdf150";
const INK = "#0b130f";

/** Fundo de cada tema (o mesmo `PACK_THEMES.screen` da revelação, em cores fixas). */
const THEME_BACKGROUND: Record<CardThemeKey, [string, string]> = {
  default: ["#17211c", "#070b09"],
  halloween: ["#1f1430", "#08050d"],
};

/** Selo da patente: cor lisa (carta fosca) ou degradê (as outras), como na carta. */
const RANK_FLAT: Record<CardRank, string> = {
  peneira: "#c9cec9",
  base: "#9ccbad",
  profissional: "#cfe58a",
  selecao: "#dcc074",
  lenda: "#d9cbe8",
};
const RANK_GRADIENT: Record<CardRank, readonly (readonly [number, string])[]> = {
  peneira: [[0, "#e9ece9"], [1, "#a9b0aa"]],
  base: [[0, "#d9f2e3"], [1, "#5fa77b"]],
  profissional: [[0, "#e4ff9e"], [1, "#8fbf1f"]],
  selecao: [[0, "#fbe39a"], [1, "#c9971f"]],
  lenda: [[0, "#ffffff"], [0.4, "#f6b7ff"], [0.75, "#9fe7ff"], [1, "#fff4b0"]],
};

// --- Cores ------------------------------------------------------------------

type Rgba = [number, number, number, number];

function parseColor(color: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const value = parseInt(hex[1], 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255, 1];
  }
  const rgb = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.]+))?\s*\)/.exec(color);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])];
  return [255, 255, 255, 1];
}

function toCss([r, g, b, a]: Rgba): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

/** `color-mix` simples: `amount` (0–1) da segunda cor. */
function mix(color: string, other: string, amount: number): string {
  const a = parseColor(color);
  const b = parseColor(other);
  return toCss([a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount, a[2] + (b[2] - a[2]) * amount, a[3] + (b[3] - a[3]) * amount]);
}

function withAlpha(color: string, alpha: number): string {
  const [r, g, b] = parseColor(color);
  return toCss([r, g, b, alpha]);
}

/** "R G B" (a luz da roupa) com transparência. */
function light(roupa: Roupa, alpha: number): string {
  const [r, g, b] = roupa.light.split(" ").map(Number);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- Formas -----------------------------------------------------------------

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rx: number, ry = rx) {
  ctx.beginPath();
  ctx.moveTo(x + rx, y);
  ctx.lineTo(x + w - rx, y);
  ctx.ellipse(x + w - rx, y + ry, rx, ry, 0, -Math.PI / 2, 0);
  ctx.lineTo(x + w, y + h - ry);
  ctx.ellipse(x + w - rx, y + h - ry, rx, ry, 0, 0, Math.PI / 2);
  ctx.lineTo(x + rx, y + h);
  ctx.ellipse(x + rx, y + h - ry, rx, ry, 0, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + ry);
  ctx.ellipse(x + rx, y + ry, rx, ry, 0, Math.PI, (3 * Math.PI) / 2);
  ctx.closePath();
}

/** Degradê linear com o ângulo do CSS (`linear-gradient(<deg>, …)`) numa caixa. */
function cssLinear(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, deg: number, stops: readonly (readonly [number, string])[]) {
  const rad = (deg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const gradient = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
}

/** Degradê radial elíptico do CSS (`radial-gradient(rx ry at cx cy, …)`), pintado num retângulo. */
function fillRadial(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
  ellipse: { cx: number; cy: number; rx: number; ry: number },
  stops: readonly (readonly [number, string])[],
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  ctx.translate(ellipse.cx, ellipse.cy);
  ctx.scale(1, ellipse.ry / ellipse.rx);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, ellipse.rx);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  const scaleY = ellipse.rx / ellipse.ry;
  ctx.fillRect(box.x - ellipse.cx, (box.y - ellipse.cy) * scaleY, box.w, box.h * scaleY);
  ctx.restore();
}

/** Desenha um texto cortando com "…" se passar da largura. */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut}…`;
}

function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number, family: string, spacing = 0) {
  ctx.font = `${weight} ${size}px ${family}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing}px`;
}

// --- Imagens ----------------------------------------------------------------

async function loadImage(url: string): Promise<HTMLImageElement> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`imagem ${response.status}: ${url}`);
  const objectUrl = URL.createObjectURL(await response.blob());
  const image = new Image();
  image.src = objectUrl;
  await image.decode();
  return image;
}

/**
 * A foto vem do Storage original (WebP com transparência, liberado para qualquer origem).
 * Não use o otimizador do Next (`/_next/image`): pedido por `fetch`, ele devolve JPEG, sem
 * transparência, e a foto vira um retângulo preto por cima do fundo e do nome da carta
 * (era isso no story do iPhone).
 */
function photoUrl(url: string): string {
  return url;
}

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  const iw = image.naturalWidth * scale;
  const ih = image.naturalHeight * scale;
  ctx.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function drawContainBottom(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight);
  const iw = image.naturalWidth * scale;
  const ih = image.naturalHeight * scale;
  ctx.drawImage(image, x + (w - iw) / 2, y + h - ih, iw, ih);
}

// --- Insígnia da patente (mesmos traços de `RankInsignia`, caixa 30 × 18) ---

function drawInsignia(ctx: CanvasRenderingContext2D, rank: CardRank, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(w / 30, h / 18);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  const stroke = (d: string, width: number, dash?: number[]) => {
    ctx.lineWidth = width;
    ctx.setLineDash(dash ?? []);
    ctx.stroke(new Path2D(d));
  };
  if (rank === "peneira") stroke("M3 9 15 3l12 6", 2.4, [3, 2.4]);
  if (rank === "base") stroke("M3 11 15 5l12 6", 3.2);
  if (rank === "profissional") stroke("M3 8 15 2l12 6M3 15 15 9l12 6", 3);
  if (rank === "selecao") {
    ctx.fill(new Path2D("M15 1.5l2 4.2 4.6.6-3.4 3.1.9 4.5L15 11.7l-4.1 2.2.9-4.5-3.4-3.1 4.6-.6z"));
    stroke("M2 16h7M21 16h7", 2.4);
  }
  if (rank === "lenda") ctx.fill(new Path2D("M4 15 2 4l7 5 6-7 6 7 7-5-2 11z"));
  ctx.restore();
}

// --- Carta ------------------------------------------------------------------

type CardImages = { background: HTMLImageElement; photo: HTMLImageElement | null };
type Fonts = { display: string; sans: string };

/**
 * A carta inteira numa caixa de largura `boxWidth` (proporção 5:7), com as medidas da
 * `CanchaCard` em unidades da carta (100 × 140).
 */
function drawCard(ctx: CanvasRenderingContext2D, award: Award, images: CardImages, fonts: Fonts, boxX: number, boxY: number, boxWidth: number) {
  const player = award.card;
  const { roupa, rank, stats, band, subtitle, trim } = getCanchaCardLook(player, award);
  const isNeon = roupa.neon !== undefined;
  const boxHeight = boxWidth * 1.4;
  // Carta de neon: 84% do meio da caixa, o resto é do brilho e do enfeite (`TRIMMED_CARD`).
  const cardX = isNeon ? boxX + boxWidth * 0.08 : boxX;
  const cardY = isNeon ? boxY + boxHeight * 0.08 : boxY;
  const cardW = isNeon ? boxWidth * 0.84 : boxWidth;
  const u = cardW / 100;
  const X = (value: number) => cardX + value * u;
  const Y = (value: number) => cardY + value * u;
  const neon = roupa.neon ?? roupa.accent;

  // Moldura.
  roundedRect(ctx, X(0), Y(0), 100 * u, 140 * u, 9 * u, 9.1 * u);
  if (isNeon) {
    ctx.fillStyle = roupa.neonDim
      ? cssLinear(ctx, X(0), Y(0), 100 * u, 140 * u, 160, [[0, mix(neon, "#ffffff", 0.3)], [0.3, neon], [0.55, mix(neon, "#000000", 0.3)], [0.8, neon], [1, mix(neon, "#ffffff", 0.2)]])
      : cssLinear(ctx, X(0), Y(0), 100 * u, 140 * u, 160, [[0, "#ffffff"], [0.3, mix(neon, "#ffffff", 0.55)], [0.55, mix(neon, "#ffffff", 0.25)], [0.8, mix(neon, "#ffffff", 0.6)], [1, "#ffffff"]]);
  } else {
    const m = roupa.metal[1];
    ctx.fillStyle = cssLinear(ctx, X(0), Y(0), 100 * u, 140 * u, 145, [
      [0, mix(m, "#000000", 0.45)], [0.14, m], [0.28, mix(m, "#ffffff", 0.6)], [0.4, m],
      [0.54, mix(m, "#000000", 0.4)], [0.68, m], [0.82, mix(m, "#ffffff", 0.7)], [1, mix(m, "#000000", 0.5)],
    ]);
  }
  ctx.fill();

  // Janela de dentro.
  const inset = isNeon ? { x: 1.7, y: 1.694, r: 7.3 } : { x: 2.6, y: 2.604, r: 6.4 };
  const wx = X(inset.x);
  const wy = Y(inset.y);
  const ww = (100 - 2 * inset.x) * u;
  const wh = (140 - 2 * inset.y) * u;
  const box = { x: wx, y: wy, w: ww, h: wh };
  ctx.save();
  roundedRect(ctx, wx, wy, ww, wh, inset.r * u);
  ctx.clip();

  drawCover(ctx, images.background, wx, wy, ww, wh);
  if (!roupa.matte) {
    fillRadial(ctx, box, { cx: wx + ww * 0.5, cy: wy + wh * 0.3, rx: ww * 0.34, ry: wh * 0.24 }, [[0, light(roupa, 0.55)], [0.75, light(roupa, 0)]]);
  }
  if (images.photo) {
    const shadow: readonly (readonly [number, string])[] = [[0, "rgba(0,0,0,0.85)"], [0.6, "rgba(0,0,0,0.45)"], [1, "rgba(0,0,0,0)"]];
    fillRadial(ctx, box, { cx: wx + ww * 0.5, cy: wy + wh * (56 / 140), rx: ww * 0.46, ry: wh * (42 / 140) }, shadow);
    fillRadial(ctx, box, { cx: wx + ww * 0.5, cy: wy + wh * (115 / 140), rx: ww * 0.7, ry: wh * (42 / 140) }, shadow);
  }

  // Faixa do nome.
  const barH = wh * 0.16;
  ctx.fillStyle = roupa.matte ? roupa.bar : cssLinear(ctx, wx, wy, ww, barH, 180, [[0, "rgba(0,0,0,0.8)"], [1, "rgba(0,0,0,0.4)"]]);
  ctx.fillRect(wx, wy, ww, barH);
  ctx.fillStyle = roupa.accent;
  ctx.fillRect(wx, wy + barH - 0.6 * u, ww, 0.6 * u);
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  const textTop = wy + 2.6 * u + (barH - 2.6 * u - 15.3 * u) / 2;
  setFont(ctx, 800, 10.5 * u, fonts.display);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(fitText(ctx, player.nickname, ww - 34 * u), wx + 8 * u, textTop);
  setFont(ctx, 700, 3.8 * u, fonts.display, 3.8 * u * 0.2);
  ctx.fillStyle = roupa.muted;
  ctx.fillText(fitText(ctx, subtitle.toUpperCase(), ww - 34 * u), wx + 8 * u, textTop + 11.5 * u);

  // Foto (inteira, presa acima do rodapé, como o enquadramento "atual").
  if (images.photo) {
    drawContainBottom(ctx, images.photo, wx - ww * 0.2, wy + wh * 0.03, ww * 1.4, wh * 0.85);
  } else {
    setFont(ctx, 800, 34 * u, fonts.display);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(getInitials(player.fullName), wx + ww / 2, wy + wh * 0.88 - 6 * u);
  }

  // Luz e vinheta por cima da foto.
  const lower = { x: wx, y: wy + wh * 0.16, w: ww, h: wh * 0.84 };
  if (roupa.matte) {
    fillRadial(ctx, lower, { cx: wx + ww / 2, cy: lower.y + lower.h * 0.42, rx: ww * 0.95, ry: lower.h * 0.8 }, [[0, "rgba(0,0,0,0)"], [0.6, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.45)"]]);
  } else {
    ctx.fillStyle = cssLinear(ctx, lower.x, lower.y, lower.w, lower.h, 180, [[0, light(roupa, 0.14)], [0.35, "rgba(0,0,0,0)"], [0.6, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.35)"]]);
    ctx.fillRect(lower.x, lower.y, lower.w, lower.h);
    fillRadial(ctx, lower, { cx: wx + ww / 2, cy: lower.y + lower.h * 0.42, rx: ww * 0.9, ry: lower.h * 0.75 }, [[0, "rgba(0,0,0,0)"], [0.55, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.55)"]]);
    ctx.fillStyle = cssLinear(ctx, wx, wy, ww, wh, 118, [
      [0.26, "rgba(255,255,255,0)"], [0.33, "rgba(255,255,255,0.16)"], [0.4, "rgba(255,255,255,0)"],
      [0.6, light(roupa, 0)], [0.66, light(roupa, 0.14)], [0.72, light(roupa, 0)],
    ]);
    ctx.fillRect(wx, wy, ww, wh);
  }
  const fadeY = wy + wh * 0.88 - wh * 0.2;
  ctx.fillStyle = cssLinear(ctx, wx, fadeY, ww, wh * 0.2, 180, [[0, withAlpha(roupa.bar, 0)], [1, roupa.bar]]);
  ctx.fillRect(wx, fadeY, ww, wh * 0.2);

  // Selo da patente com o OVR.
  const crest = { x: wx + ww - 5.5 * u - 19 * u, y: wy + 5 * u, w: 19 * u, h: 24 * u };
  ctx.beginPath();
  ctx.moveTo(crest.x, crest.y);
  ctx.lineTo(crest.x + crest.w, crest.y);
  ctx.lineTo(crest.x + crest.w, crest.y + crest.h * 0.76);
  ctx.lineTo(crest.x + crest.w / 2, crest.y + crest.h);
  ctx.lineTo(crest.x, crest.y + crest.h * 0.76);
  ctx.closePath();
  ctx.fillStyle = roupa.matte ? RANK_FLAT[rank] : cssLinear(ctx, crest.x, crest.y, crest.w, crest.h, 160, RANK_GRADIENT[rank]);
  ctx.fill();
  setFont(ctx, 800, 9 * u, fonts.display);
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(player.ovr === null ? "–" : String(player.ovr), crest.x + crest.w / 2, crest.y + 2.3 * u);
  drawInsignia(ctx, rank, crest.x + (crest.w - 9.5 * u) / 2, crest.y + 2.3 * u + 9 * u + 0.6 * u, 9.5 * u, 5.6 * u);

  // Faixa do prêmio (ou da patente).
  setFont(ctx, 800, 3.9 * u, fonts.display, 3.9 * u * 0.35);
  ctx.fillStyle = roupa.accent;
  ctx.textBaseline = "bottom";
  ctx.fillText(fitText(ctx, band.toUpperCase(), ww - 8 * u), wx + ww / 2 + (3.9 * u * 0.35) / 2, wy + wh * (1 - 0.135));

  // Estatísticas.
  const statsY = wy + wh * 0.88;
  const statsH = wh * 0.12;
  ctx.fillStyle = roupa.bar;
  ctx.fillRect(wx, statsY, ww, statsH);
  ctx.fillStyle = roupa.accent;
  ctx.fillRect(wx, statsY, ww, 0.6 * u);
  const cellW = ww / stats.length;
  stats.forEach((stat, index) => {
    const cx = wx + cellW * index + cellW / 2;
    if (index > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(wx + cellW * index, statsY + 0.6 * u, 0.4 * u, statsH - 0.6 * u);
    }
    const blockH = 7.6 * u + 0.6 * u + 2.7 * u;
    const top = statsY + 0.6 * u + (statsH - 0.6 * u - blockH) / 2;
    setFont(ctx, 800, 7.6 * u, fonts.display);
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "top";
    ctx.fillText(stat.value === null ? "–" : String(stat.value), cx, top);
    setFont(ctx, 600, 2.7 * u, fonts.sans, 2.7 * u * 0.04);
    ctx.fillStyle = roupa.muted;
    ctx.fillText(stat.label.toUpperCase(), cx, top + 7.6 * u + 0.6 * u);
  });

  // Por dentro da moldura: fio claro (metal) ou brilho do neon.
  roundedRect(ctx, wx, wy, ww, wh, inset.r * u);
  if (isNeon) {
    ctx.strokeStyle = withAlpha(neon, roupa.neonDim ? 0.18 : 0.35);
    ctx.lineWidth = (roupa.neonDim ? 3.2 : 7) * u;
    ctx.stroke();
    if (!roupa.neonDim) {
      ctx.strokeStyle = neon;
      ctx.lineWidth = 1.6 * u;
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1.8 * u;
    ctx.stroke();
    ctx.strokeStyle = roupa.metal[2];
    ctx.lineWidth = 1 * u;
    ctx.stroke();
  }
  ctx.restore();

  if (!isNeon) return;

  // Brilho em volta e enfeite, em unidades da carta (como `NeonOverlay`).
  ctx.save();
  ctx.translate(cardX, cardY);
  ctx.scale(u, u);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = neon;
  for (const stroke of roupa.neonDim ? NEON_HALO_DIM_STROKES : NEON_HALO_STROKES) {
    ctx.globalAlpha = stroke.opacity;
    ctx.lineWidth = stroke.width;
    roundedRect(ctx, 0, 0, 100, 140, 9, 9.1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (trim) {
    const shape = getNeonTrimShape(trim);
    const core = mix(neon, "#ffffff", 0.65);
    const neonLine = (d: string, width: number, subtle?: boolean) => {
      const path = new Path2D(d);
      const layers: [number, number, string][] = [
        [subtle ? 2.4 : 4.4, subtle ? 0.14 : 0.18, neon],
        [subtle ? 1.2 : 2.2, subtle ? 0.3 : 0.45, neon],
        [width * 1.6, subtle ? 0.7 : 0.9, neon],
        [width * 0.6, 1, core],
      ];
      for (const [lineWidth, alpha, color] of layers) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.stroke(path);
      }
      ctx.globalAlpha = 1;
    };
    for (const line of shape.side) {
      neonLine(line.d, line.width, shape.subtle);
      neonLine(mirrorPath(line.d), line.width, shape.subtle);
    }
    if (shape.centerLines) neonLine(shape.centerLines, 0.5);
    if (shape.center) {
      const path = new Path2D(shape.center);
      ctx.strokeStyle = neon;
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 4;
      ctx.stroke(path);
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.8;
      ctx.stroke(path);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 0.5;
      ctx.stroke(path);
      ctx.fillStyle = core;
      ctx.fill(path, "evenodd");
    }
  }
  ctx.restore();
}

// --- Story ------------------------------------------------------------------

function storySubtitle(award: Award): string {
  const ratings = award.votes === 1 ? "1 avaliação" : `${award.votes} avaliações`;
  if (award.kind === "time_da_semana") return award.score === null ? ratings : `Nota ${formatRoundScore(award.score)} na rodada · ${ratings}`;
  if (award.kind === "jogador_do_mes") return award.score === null ? ratings : `Média ${formatRoundScore(award.score)} no mês · ${ratings}`;
  const source = STAT_AWARD_SOURCES[award.kind];
  if (source && award.score !== null) return `${source.label}: ${formatRoundScore(award.score)} · ${ratings}`;
  return award.votes === 1 ? "1 voto da galera" : `${award.votes} votos da galera`;
}

/** Fonte de verdade das famílias: as variáveis do `next/font` no `<html>`. */
function readFonts(): Fonts {
  const style = getComputedStyle(document.documentElement);
  return {
    display: style.getPropertyValue("--font-barlow-condensed").trim() || "sans-serif",
    sans: style.getPropertyValue("--font-geist-sans").trim() || "sans-serif",
  };
}

async function svgToImage(svg: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await image.decode();
  return image;
}

export type StoryInput = {
  award: Award;
  groupName: string;
  /** SVG do ícone do prêmio (`AWARD_ICONS`), já renderizado na página. */
  iconSvg: string | null;
};

/** Monta o story e devolve o PNG (1080 × 1920). */
export async function renderStoryPng({ award, groupName, iconSvg }: StoryInput): Promise<Blob> {
  const fonts = readFonts();
  // `allSettled`: a fonte reserva do `next/font` (local) pode falhar em alguns aparelhos, e
  // isso não pode derrubar o story; a fonte principal já está na página.
  await Promise.allSettled([
    document.fonts.load(`800 60px ${fonts.display}`),
    document.fonts.load(`700 60px ${fonts.display}`),
    document.fonts.load(`600 30px ${fonts.sans}`),
    document.fonts.load(`400 30px ${fonts.sans}`),
  ]);
  const { roupa } = getCanchaCardLook(award.card, award);
  const accent = roupa.accent;
  const [background, photo, icon] = await Promise.all([
    loadImage(`/cartas/fundos/${roupa.background}.webp`),
    award.card.photo ? loadImage(photoUrl(award.card.photo.url)).catch(() => null) : Promise.resolve(null),
    iconSvg ? svgToImage(iconSvg.replaceAll("currentColor", accent)).catch(() => null) : Promise.resolve(null),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = STORY_SIZE.width;
  canvas.height = STORY_SIZE.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sem canvas 2d");
  const { width: W, height: H } = STORY_SIZE;
  const centerX = W / 2;

  // Fundo, brilho e raios na cor do prêmio.
  const [inner, outer] = THEME_BACKGROUND[award.theme];
  const base = ctx.createRadialGradient(centerX, H * 0.4, 0, centerX, H * 0.4, H * 0.75);
  base.addColorStop(0, inner);
  base.addColorStop(1, outer);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);
  const cardCenterY = H * 0.5;
  const glow = ctx.createRadialGradient(centerX, cardCenterY, 0, centerX, cardCenterY, 630);
  glow.addColorStop(0, withAlpha(accent, 0.45));
  glow.addColorStop(0.65, withAlpha(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  const rays = document.createElement("canvas");
  rays.width = W;
  rays.height = H;
  const raysCtx = rays.getContext("2d");
  if (raysCtx) {
    raysCtx.fillStyle = withAlpha(accent, 0.22);
    for (let angle = 0; angle < 360; angle += 18) {
      const a0 = ((angle - 90) * Math.PI) / 180;
      const a1 = ((angle + 6 - 90) * Math.PI) / 180;
      raysCtx.beginPath();
      raysCtx.moveTo(centerX, cardCenterY);
      raysCtx.arc(centerX, cardCenterY, 1400, a0, a1);
      raysCtx.closePath();
      raysCtx.fill();
    }
    const fade = raysCtx.createRadialGradient(centerX, cardCenterY, 0, centerX, cardCenterY, 840);
    fade.addColorStop(0, "rgba(0,0,0,1)");
    fade.addColorStop(0.32, "rgba(0,0,0,1)");
    fade.addColorStop(1, "rgba(0,0,0,0)");
    raysCtx.globalCompositeOperation = "destination-in";
    raysCtx.fillStyle = fade;
    raysCtx.fillRect(0, 0, W, H);
    ctx.drawImage(rays, 0, 0);
  }

  // Cabeçalho: marca, pelada e evento, prêmio e rodada.
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  setFont(ctx, 800, 66, fonts.display);
  const cancha = "CANCHA";
  const brandWidth = ctx.measureText(`${cancha}CLUB`).width;
  const brandX = centerX - brandWidth / 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(cancha, brandX, 132);
  ctx.fillStyle = PRIMARY;
  ctx.fillText("CLUB", brandX + ctx.measureText(cancha).width, 132);

  const year = award.date.slice(0, 4);
  const event = hasSeasonalTheme(award.kind) ? CARD_THEME_LABELS[award.theme] : formatMonth(award.date);
  setFont(ctx, 400, 36, fonts.sans, 36 * 0.14);
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.textAlign = "center";
  ctx.fillText(fitText(ctx, `${groupName} · ${event} ${year}`.toUpperCase(), W - 144), centerX + 2.5, 216);

  const title = AWARD_LABELS[award.kind].title.toUpperCase();
  setFont(ctx, 800, 116, fonts.display);
  const titleWidth = Math.min(ctx.measureText(title).width, W - 220);
  const iconSize = icon ? 78 : 0;
  const gap = icon ? 22 : 0;
  const rowX = centerX - (iconSize + gap + titleWidth) / 2;
  if (icon) ctx.drawImage(icon, rowX, 318, iconSize, iconSize);
  ctx.fillStyle = accent;
  ctx.textAlign = "left";
  ctx.fillText(title, rowX + iconSize + gap, 300, W - 220);

  setFont(ctx, 400, 44, fonts.sans);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.textAlign = "center";
  ctx.fillText(`Rodada ${award.round} · ${formatWeekdayDate(award.date)}`, centerX, 444);

  // A carta, grande no meio.
  const boxWidth = 600;
  drawCard(ctx, award, { background, photo }, fonts, centerX - boxWidth / 2, 540, boxWidth);

  // Nome, nota e rodapé.
  setFont(ctx, 700, 100, fonts.display);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(fitText(ctx, award.card.nickname, W - 160), centerX, 1420);
  setFont(ctx, 400, 44, fonts.sans);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillText(storySubtitle(award), centerX, 1540);
  setFont(ctx, 400, 33, fonts.sans, 33 * 0.25);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("CARTA ESPECIAL · CANCHA CLUB", centerX + 4, 1790);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob vazio"))), "image/png");
  });
}
