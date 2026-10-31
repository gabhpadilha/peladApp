/**
 * Moldura elétrica das cartas de neon (skin Nuvem carregada, pedido do dono do app em
 * 2026-10-31, a partir de uma referência de moldura de raios): fios de eletricidade correndo
 * por fora da metade de baixo da carta, das laterais até a base. Coordenadas da carta
 * (100 × 140, cantos de 9 × 9,1). Gerada uma vez, com sorteio fixo: sai igual em toda carta.
 */

/** Altura (em unidades da carta) onde os fios começam nas laterais. */
export const ELECTRIC_TOP = 74;

const CORNER_X = 9;
const CORNER_Y = 9.1;

let seed = 23;
function random() {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
}

type Point = { x: number; y: number; nx: number; ny: number };

/** Contorno da metade de baixo da carta afastado `offset` para fora, a cada `step` unidades. */
function outline(offset: number, step: number): Point[] {
  const dense: Point[] = [];
  const bottom = 140 - CORNER_Y;
  for (let y = ELECTRIC_TOP; y < bottom; y += 0.25) dense.push({ x: -offset, y, nx: -1, ny: 0 });
  for (let a = Math.PI; a > Math.PI / 2; a -= 0.01) {
    dense.push({ x: CORNER_X + (CORNER_X + offset) * Math.cos(a), y: bottom + (CORNER_Y + offset) * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) });
  }
  for (let x = CORNER_X; x < 100 - CORNER_X; x += 0.25) dense.push({ x, y: 140 + offset, nx: 0, ny: 1 });
  for (let a = Math.PI / 2; a > 0; a -= 0.01) {
    dense.push({ x: 100 - CORNER_X + (CORNER_X + offset) * Math.cos(a), y: bottom + (CORNER_Y + offset) * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) });
  }
  for (let y = bottom; y > ELECTRIC_TOP; y -= 0.25) dense.push({ x: 100 + offset, y, nx: 1, ny: 0 });

  const points: Point[] = [dense[0]];
  let walked = 0;
  for (let i = 1; i < dense.length; i++) {
    walked += Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y);
    if (walked >= step) {
      points.push(dense[i]);
      walked = 0;
    }
  }
  return points;
}

const fmt = (value: number) => value.toFixed(2);

/** Pontos de um segmento levemente curvo (com a normal), a cada `step` unidades: o caminho de um mini raio. */
function segment(x1: number, y1: number, x2: number, y2: number, step: number, bend: number): Point[] {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const nx = -(y2 - y1) / length, ny = (x2 - x1) / length;
  const count = Math.max(2, Math.round(length / step));
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = i / count, b = bend * Math.sin(Math.PI * t) + bend * 0.4 * Math.sin(Math.PI * 3 * t);
    return { x: x1 + (x2 - x1) * t + nx * b, y: y1 + (y2 - y1) * t + ny * b, nx, ny };
  });
}

/** Fio principal: quebrado em zigue-zague miúdo, com picos de vez em quando. */
function jagged(points: Point[], amplitude: number): string {
  return points
    .map((p, i) => {
      const spike = random() < 0.12 ? 2.2 : 1;
      const d = (random() - 0.5) * 2 * amplitude * spike;
      return `${i === 0 ? "M" : "L"}${fmt(p.x + p.nx * d)} ${fmt(p.y + p.ny * d)}`;
    })
    .join(" ");
}

/** Fio fino que ondula em volta do principal, cruzando com ele (curvas suaves). */
function wavy(base: Point[], amplitude: number, phase: number): string {
  const points = base.map((p, i) => {
    const d = amplitude * Math.sin(i * 0.9 + phase) + (random() - 0.5) * amplitude * 0.8;
    return { x: p.x + p.nx * d, y: p.y + p.ny * d };
  });
  let path = `M${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mid = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
    path += ` Q${fmt(points[i].x)} ${fmt(points[i].y)} ${fmt(mid.x)} ${fmt(mid.y)}`;
  }
  return path;
}

/** Faíscas soltas perto dos fios (pontinhos de luz da referência). */
function sparks(base: Point[], spread: number) {
  return base.map((p) => {
    const d = (random() - 0.2) * spread;
    return { x: p.x + p.nx * d + (random() - 0.5) * 2, y: p.y + p.ny * d + (random() - 0.5) * 2, r: 0.25 + random() * 0.45 };
  });
}

export const ELECTRIC_MAIN = jagged(outline(2.4, 1.5), 0.75);
export const ELECTRIC_STRANDS = [wavy(outline(3.6, 3.2), 1.7, 0), wavy(outline(1.6, 2.6), 1.2, 2.1), wavy(outline(4.4, 4.4), 2, 4.2)];
export const ELECTRIC_SPARKS = sparks(outline(3, 6), 5);

/**
 * Mini raios dentro da carta, nas nuvens das laterais (longe do rosto e dos textos), no mesmo
 * estilo da moldura elétrica (fio quebrado, fios finos ondulando e faíscas), cada um com o
 * clarão da nuvem atrás e o seu atraso no estalo. Coordenadas da carta (100 × 140).
 */
const CLOUD_BOLT_LINES = [
  { from: [14, 28], to: [9, 46], delay: "0s" },
  { from: [86, 32], to: [91.5, 50], delay: "0.9s" },
  { from: [8, 60], to: [13.5, 78], delay: "1.7s" },
  { from: [92.5, 64], to: [87, 82], delay: "2.4s" },
  { from: [22.5, 46], to: [18.5, 60], delay: "3.1s" },
  { from: [78.5, 52], to: [82.5, 66], delay: "1.2s" },
] as const;

export const CLOUD_BOLTS = CLOUD_BOLT_LINES.map(({ from: [x1, y1], to: [x2, y2], delay }, i) => {
  const bend = (i % 2 ? -1 : 1) * 2.2;
  return {
    main: jagged(segment(x1, y1, x2, y2, 1.1, bend), 0.85),
    strands: [wavy(segment(x1, y1, x2, y2, 2.2, bend), 1.5, 0), wavy(segment(x1, y1, x2, y2, 2.8, bend), 1.9, 2.4)],
    sparks: sparks(segment(x1, y1, x2, y2, 4, bend), 3.6),
    glow: { cx: (x1 + x2) / 2, cy: (y1 + y2) / 2, r: Math.hypot(x2 - x1, y2 - y1) * 0.6 },
    delay,
  };
});
