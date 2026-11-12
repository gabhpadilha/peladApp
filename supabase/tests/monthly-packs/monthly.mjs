// Prêmios do mês em pacotes: entrega na última quinta pelo ranking de pontos do mês, tamanhos 4/3/1, faixas, sem repetir dentro
// do pacote, empate, abertura de várias skins (cópia extra para a repetida) e idempotência.
// Roda no PGlite com todas as migrations; não toca no banco real. Uso: REPO=$(pwd) node supabase/tests/monthly-packs/monthly.mjs
import { world, check, results } from "../goals-flow/lib.mjs";
const W = await world();
const { db, attempt } = W;
const pass = (s, name, r) => check(s, name, r.ok, r.ok ? "" : `${r.code ?? ""} ${r.error}`);

const SET = [
  ["lend-1", "lendaria"], ["epic-1", "epica"], ["epic-2", "epica"],
  ["rara-1", "rara"], ["rara-2", "rara"], ["rara-3", "rara"], ["rara-4", "rara"],
  ["comum-1", "comum"], ["comum-2", "comum"], ["comum-3", "comum"], ["comum-4", "comum"], ["comum-5", "comum"],
];
await db.query(`insert into public.pack_sets (month, skin, design, rarity) values ${SET.map(([s, r]) => `('2026-12','${s}','${s}','${r}')`).join(",")}`);
const RANK = { comum: 1, rara: 2, epica: 3, lendaria: 4 };

/** Pelada de `count` jogadores de linha com rodada em `date`; nota de todos para todos pela base (p maior = nota maior). */
async function round(label, count, { date, base } = {}) {
  const w = await W.scenario(label, { count, positions: Array(count).fill("FIX") });
  await db.query("update public.matches set played_on = $2, ratings_unlocked_at = now() where id = $1", [w.match, date]);
  await db.query("update public.groups set packs_enabled = true where id = $1", [w.group]);
  const scores = base ?? w.ids.map((_, p) => 3 + p * 0.3);
  const rows = [];
  for (let p = 0; p < count; p++) {
    const lo = Math.floor(scores[p]);
    const others = [...Array(count).keys()].filter((e) => e !== p);
    const ceilCount = Math.round((scores[p] - lo) * others.length);
    others.forEach((e, i) => {
      const v = Math.min(10, Math.max(1, i < ceilCount ? lo + 1 : lo));
      rows.push(`('${w.match}','${w.ids[e]}','${w.ids[p]}',${v},${v},${v},${v},${v},${v})`);
    });
  }
  await db.query(`insert into public.evaluations (match_id, evaluator_id, player_id, vel, chu, pas, dri, def, fis) values ${rows.join(",")}`);
  return w;
}
const closeRound = (w) => attempt(w.users[0], "select public.close_match($1,'default') as n", [w.match]);
const monthly = async (w) => (await db.query(
  "select p.*, (select count(*)::int from public.pack_items i where i.pack_id = p.id) as items from public.packs p where p.group_id = $1 and p.source = 'monthly'",
  [w.group],
)).rows;
const byMember = (packs, w, p) => packs.find((x) => x.member_id === w.ids[p]);

// 1. Fora da última quinta não entrega
{
  const S = "1 só na última quinta";
  const w = await round("QUI24", 10, { date: "2026-12-24" });
  pass(S, "fecha a rodada de 24/12", await closeRound(w));
  check(S, "24/12 não é a última quinta: nenhum pacote do mês", (await monthly(w)).length === 0);
  check(S, "os pacotes da rodada continuam saindo", (await db.query("select count(*)::int as n from public.packs where match_id = $1 and source = 'round'", [w.match])).rows[0].n === 10);
}

// 2. Última quinta: tamanhos e faixas
const R = await round("QUI31", 10, { date: "2026-12-31" });
{
  const S = "2 entrega";
  pass(S, "fecha a rodada de 31/12", await closeRound(R));
  const packs = await monthly(R);
  check(S, "um pacote do mês por jogador", packs.length === 10, `${packs.length}`);
  // p maior = mais pontos: P9 é o 1º.
  const champ = byMember(packs, R, 9);
  check(S, "1º leva o pacote de 4 skins, faixa A", champ.size === 4 && champ.items === 4 && champ.tier === "A" && champ.place === 1);
  check(S, "2º e 3º levam o de 3 skins", [8, 7].every((p) => byMember(packs, R, p).size === 3 && byMember(packs, R, p).items === 3));
  check(S, "do 4º ao 7º: 1 skin da faixa B (o meio)", [6, 5, 4, 3].every((p) => byMember(packs, R, p).size === 1 && byMember(packs, R, p).tier === "B"));
  check(S, "os 30% de baixo: faixa C", [2, 1, 0].every((p) => byMember(packs, R, p).tier === "C"));
  check(S, "chances do pacote grande são as do Craque (45/33/17/5)", champ.odds.comum === 45 && champ.odds.lendaria === 5);
  const items = (await db.query("select position, skin, rarity from public.pack_items where pack_id = $1 order by position", [champ.id])).rows;
  check(S, "sem repetir dentro do pacote", new Set(items.map((i) => i.skin)).size === items.length);
  check(S, "da mais rara para a mais comum", items.every((it, k) => k === 0 || RANK[items[k - 1].rarity] >= RANK[it.rarity]));
  check(S, "packs.skin é a mais rara (a da animação)", champ.skin === items[0].skin && champ.rarity === items[0].rarity);
  const champCard = (await db.query("select member_id from public.awards where match_id = $1 and kind = 'campeao_do_mes'", [R.match])).rows;
  check(S, "o Campeão do Mês ganha a carta e o pacote de 4", champCard.length === 1 && champCard[0].member_id === R.ids[9]);
  const again = await db.query("select public.grant_monthly_prize_packs($1) as n", [R.match]);
  check(S, "rodar de novo não duplica", again.rows[0].n === 0 && (await monthly(R)).length === 10);
}

// 3. Sorteio sem repetir, muitas vezes
{
  const S = "3 sem repetir";
  let ok = true;
  for (let i = 0; i < 200; i++) {
    const rows = (await db.query("select skin from public.draw_pack_multi('2026-12','A',4)")).rows;
    if (rows.length !== 4 || new Set(rows.map((r) => r.skin)).size !== 4) ok = false;
  }
  check(S, "200 pacotes de 4, nenhum com skin repetida", ok);
  const all = (await db.query("select skin from public.draw_pack_multi('2026-12','A',20)")).rows;
  check(S, "conjunto menor que o pacote: vem o que houver, sem repetir", all.length === 12 && new Set(all.map((r) => r.skin)).size === 12);
}

// 4. Abrir
{
  const S = "4 abrir";
  const champ = byMember(await monthly(R), R, 9);
  const items = (await db.query("select skin from public.pack_items where pack_id = $1 order by position", [champ.id])).rows;
  // Ele já tinha a 2ª skin: ela tem que virar cópia extra.
  await db.query("insert into public.card_skin_purchases (group_id, member_id, skin, price, source) values ($1,$2,$3,0,'pack')", [R.group, R.ids[9], items[1].skin]);
  const lacrado = (await W.as(R.users[9], () => db.query("select * from public.get_my_packs() where source = 'monthly'"))).rows[0];
  check(S, "lacrado: sem skin e sem a lista", lacrado.skin === null && lacrado.items === null && lacrado.size === 4 && lacrado.place === 1);
  check(S, "outro jogador não abre", !(await attempt(R.users[3], "select * from public.open_pack($1)", [champ.id])).ok);
  const opened = await attempt(R.users[9], "select * from public.open_pack($1)", [champ.id]);
  check(S, "abre e devolve as 4, na ordem", opened.ok && opened.rows.length === 4 && opened.rows.every((r, k) => r.skin === items[k].skin));
  check(S, "a que ele já tinha vem como repetida, as outras como novas", opened.ok && opened.rows[1].was_duplicate === true && [0, 2, 3].every((k) => opened.rows[k].was_duplicate === false));
  const owned = (await db.query("select skin, is_spare from public.card_skin_purchases where member_id = $1 and transferred_at is null", [R.ids[9]])).rows;
  check(S, "as 4 entram na coleção, a repetida como cópia extra", items.every((it) => owned.some((o) => o.skin === it.skin && !o.is_spare)) && owned.filter((o) => o.is_spare && o.skin === items[1].skin).length === 1);
  const again = await attempt(R.users[9], "select * from public.open_pack($1)", [champ.id]);
  const count = (await db.query("select count(*)::int as n from public.card_skin_purchases where member_id = $1", [R.ids[9]])).rows[0].n;
  check(S, "abrir de novo devolve o mesmo e não duplica a posse", again.ok && again.rows.length === 4 && count === 5);
  const mine = (await W.as(R.users[9], () => db.query("select * from public.get_my_packs() where source = 'monthly'"))).rows[0];
  check(S, "Meus pacotes lista as 4 depois de aberto", Array.isArray(mine.items) && mine.items.length === 4 && mine.items[1].was_duplicate === true);
  const single = byMember(await monthly(R), R, 5);
  const one = await attempt(R.users[5], "select * from public.open_pack($1)", [single.id]);
  check(S, "pacote de 1 skin do mês abre como os outros", one.ok && one.rows.length === 1);
}

// 5. Empate no 1º
{
  const S = "5 empate";
  const base = Array.from({ length: 10 }, (_, p) => 3 + p * 0.3);
  base[8] = base[9];
  const w = await round("EMP", 10, { date: "2026-12-31", base });
  pass(S, "fecha a rodada com empate no topo", await closeRound(w));
  const packs = await monthly(w);
  check(S, "os dois empatados em 1º levam o pacote de 4", byMember(packs, w, 9).size === 4 && byMember(packs, w, 8).size === 4);
  check(S, "o próximo é o 3º e leva o de 3", byMember(packs, w, 7).place === 3 && byMember(packs, w, 7).size === 3);
  check(S, "o 4º já não leva pacote grande", byMember(packs, w, 6).size === 1);
}

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} verificações OK`);
process.exit(bad.length ? 1 : 0);
