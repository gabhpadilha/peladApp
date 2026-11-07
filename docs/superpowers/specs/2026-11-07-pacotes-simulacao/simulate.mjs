// Simulação do sistema de pacotes (design em ../2026-11-07-pacotes-design.md). Uso: node simulate.mjs
// Modelo: uma pelada joga R rodadas no mês (1 por semana), N jogadores por rodada; cada um ganha 1 pacote de uma faixa
// (A: 1º; B: 2º e 3º; D: os 30% de baixo; C: o resto) e o servidor sorteia 1 design do conjunto do mês.

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const ODDS = { A: { C: 45, R: 33, E: 17, L: 5 }, B: { C: 55, R: 29, E: 12, L: 4 }, C: { C: 64, R: 25, E: 9, L: 2 }, D: { C: 72, R: 21, E: 6, L: 1 } };
// Conjunto do mês (12 designs): 1 lendária, 2 épicas, 4 raras e 5 comuns.
const DESIGNS = ["L", "E", "E", "R", "R", "R", "R", "C", "C", "C", "C", "C"];
const COUNT = DESIGNS.reduce((m, r) => ((m[r] = (m[r] ?? 0) + 1), m), {});
const RANK = { L: 4, E: 3, R: 2, C: 1 };
const DAYS = 30;
const LAST_DAYS = 7;

function tiersFor(n) {
  const d = Math.ceil(0.3 * n);
  return [..."A", ..."BB", ...Array(n - 3 - d).fill("C"), ...Array(d).fill("D")];
}

function pick(weights, rand) {
  let total = 0;
  for (const w of weights) total += w;
  let x = rand() * total;
  for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x < 0) return i; }
  return weights.length - 1;
}

/** Um mês de uma pelada. strategy: none | boost | boost+guarantee. */
function simulateMonth({ n, rounds, strategy, boostMax, boostPower, forcedCap }, rand) {
  const offset = 1 + Math.floor(rand() * (DAYS - (rounds - 1) * 7 > 7 ? 7 : DAYS - (rounds - 1) * 7));
  const dropped = new Array(DESIGNS.length).fill(0);
  let legendaryPacks = 0, totalPacks = 0, forcedPacks = 0;
  const tiers = tiersFor(n);
  const legendaryByTier = { A: 0, B: 0, C: 0, D: 0 }, packsByTier = { A: 0, B: 0, C: 0, D: 0 };
  for (let i = 0; i < rounds; i++) {
    const day = Math.min(offset + i * 7, DAYS);
    const t = day / DAYS;
    const boost = strategy === "none" ? 1 : 1 + (boostMax - 1) * Math.pow(t, boostPower);
    const forced = new Array(n).fill(-1);
    if (strategy === "boost+guarantee" && day > DAYS - LAST_DAYS) {
      const missing = DESIGNS.map((r, d) => [r, d]).filter(([, d]) => dropped[d] === 0).sort((a, b) => RANK[b[0]] - RANK[a[0]]);
      let cap = Math.ceil(forcedCap * n);
      for (const [r, d] of missing) {
        if (cap-- <= 0) break;
        const free = tiers.map((tier, p) => (forced[p] === -1 ? ODDS[tier][r] : 0));
        if (free.every((w) => w === 0)) break;
        forced[pick(free, rand)] = d;
      }
    }
    for (let p = 0; p < n; p++) {
      const tier = tiers[p];
      let d = forced[p];
      if (d === -1) {
        const w = DESIGNS.map((r, k) => (ODDS[tier][r] / COUNT[r]) * (dropped[k] === 0 ? boost : 1));
        d = pick(w, rand);
      } else forcedPacks++;
      dropped[d]++;
      totalPacks++;
      packsByTier[tier]++;
      if (DESIGNS[d] === "L") { legendaryPacks++; legendaryByTier[tier]++; }
    }
  }
  return { dropped, legendaryPacks, totalPacks, forcedPacks, legendaryByTier, packsByTier };
}

function run(config, runs, seed) {
  const rand = rng(seed);
  let allOk = 0, legOk = 0, epicOk = 0, legShare = 0, forcedShare = 0;
  const byTierLeg = { A: 0, B: 0, C: 0, D: 0 }, byTierPacks = { A: 0, B: 0, C: 0, D: 0 };
  let missingTotal = 0;
  for (let k = 0; k < runs; k++) {
    const m = simulateMonth(config, rand);
    const miss = m.dropped.filter((c) => c === 0).length;
    missingTotal += miss;
    if (miss === 0) allOk++;
    const li = DESIGNS.indexOf("L");
    if (m.dropped[li] > 0) legOk++;
    const epics = DESIGNS.map((r, d) => [r, d]).filter(([r]) => r === "E");
    if (epics.every(([, d]) => m.dropped[d] > 0)) epicOk++;
    legShare += m.legendaryPacks / m.totalPacks;
    forcedShare += m.forcedPacks / m.totalPacks;
    for (const tier of "ABCD") { byTierLeg[tier] += m.legendaryByTier[tier]; byTierPacks[tier] += m.packsByTier[tier]; }
  }
  const tierRate = Object.fromEntries("ABCD".split("").map((t) => [t, byTierPacks[t] ? (100 * byTierLeg[t]) / byTierPacks[t] : 0]));
  return { all: (100 * allOk) / runs, leg: (100 * legOk) / runs, epic: (100 * epicOk) / runs, legShare: (100 * legShare) / runs, forced: (100 * forcedShare) / runs, missing: missingTotal / runs, tierRate };
}

const f = (x, d = 1) => x.toFixed(d);
const RUNS = 4000;
const out = [];
const log = (s = "") => { out.push(s); console.log(s); };

// 1) Escolha dos parâmetros: N=10 e N=20, R=4.
log("## Calibração (R = 4 rodadas, 4000 pelada-meses por linha)\n");
log("| Jogadores | Estratégia | M | p | Cap | Lendária saiu | Todas saíram | % pacotes lendária | % forçados |");
log("|---|---|---|---|---|---|---|---|---|");
for (const n of [10, 20]) {
  for (const cfg of [
    { strategy: "none", boostMax: 1, boostPower: 1, forcedCap: 0 },
    { strategy: "boost", boostMax: 20, boostPower: 2, forcedCap: 0 },
    { strategy: "boost", boostMax: 60, boostPower: 2, forcedCap: 0 },
    { strategy: "boost", boostMax: 60, boostPower: 3, forcedCap: 0 },
    { strategy: "boost+guarantee", boostMax: 20, boostPower: 2, forcedCap: 0.15 },
    { strategy: "boost+guarantee", boostMax: 20, boostPower: 2, forcedCap: 0.3 },
  ]) {
    const r = run({ n, rounds: 4, ...cfg }, RUNS, 7 + n);
    log(`| ${n} | ${cfg.strategy} | ${cfg.boostMax} | ${cfg.boostPower} | ${cfg.forcedCap} | ${f(r.leg)}% | ${f(r.all)}% | ${f(r.legShare, 2)}% | ${f(r.forced, 1)}% |`);
  }
}

// 2) Configuração escolhida em todos os tamanhos e números de rodadas.
const CHOSEN = { strategy: "boost+guarantee", boostMax: 20, boostPower: 2, forcedCap: 0.3 };
const BASE = { strategy: "none", boostMax: 1, boostPower: 1, forcedCap: 0 };
log("\n## Configuração escolhida: boost M=20, p=2 + garantia nos últimos 7 dias (teto 30% dos pacotes da rodada)\n");
log("Colunas: % de peladas em que a lendária saiu (sem proteção → com proteção) · % em que TODOS os 12 designs saíram (sem → com) · lendária por pacote (esperado → com proteção).\n");
log("| Jogadores | Rodadas | Lendária saiu | Todos os designs saíram | Lendária por pacote | % forçados |");
log("|---|---|---|---|---|---|");
for (const n of [10, 12, 14, 16, 18, 20, 24, 28, 30]) {
  for (const rounds of [1, 2, 3, 4, 5]) {
    const b = run({ n, rounds, ...BASE }, RUNS, 100 + n * 7 + rounds);
    const c = run({ n, rounds, ...CHOSEN }, RUNS, 100 + n * 7 + rounds);
    log(`| ${n} | ${rounds} | ${f(b.leg)}% → **${f(c.leg)}%** | ${f(b.all)}% → **${f(c.all)}%** | ${f(b.legShare, 2)}% → ${f(c.legShare, 2)}% | ${f(c.forced, 1)}% |`);
  }
}

// 3) A diferença entre faixas se mantém com a proteção ligada?
log("\n## A vantagem de quem foi melhor continua? (N = 20, R = 4, com proteção)\n");
const t = run({ n: 20, rounds: 4, ...CHOSEN }, 20000, 999);
const tb = run({ n: 20, rounds: 4, ...BASE }, 20000, 999);
log("| Faixa | Lendária por pacote, sem proteção | com proteção |");
log("|---|---|---|");
for (const tier of "ABCD") log(`| ${tier} | ${f(tb.tierRate[tier], 2)}% | ${f(t.tierRate[tier], 2)}% |`);

import { writeFileSync } from "node:fs";
writeFileSync(new URL("./resultado.md", import.meta.url), "# Resultado da simulação (gerado por simulate.mjs)\n\n" + out.join("\n") + "\n");
