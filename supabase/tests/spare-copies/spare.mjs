// Skin repetida vira cópia extra: guardada, vendável (Mercado e venda rápida) mesmo com a skin em uso, uma posse só por skin.
// Roda no PGlite com todas as migrations; não toca no banco real. Uso: REPO=$(pwd) node supabase/tests/spare-copies/spare.mjs
import { world, check, results } from "../goals-flow/lib.mjs";
const W = await world();
const { db } = W;
const server = async (sql, params = []) => {
  try { return { ok: true, rows: (await db.query(sql, params)).rows }; } catch (e) { return { ok: false, error: e.message, code: e.code }; }
};
const fail = (s, name, r, code) => check(s, name, !r.ok && (!code || r.code === code), r.ok ? "ACEITOU (deveria recusar)" : `${r.code ?? ""} ${r.error}`);
const pass = (s, name, r) => check(s, name, r.ok, r.ok ? "" : `${r.code ?? ""} ${r.error}`);
const MONTH = (await db.query("select to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM') as m")).rows[0].m;
await db.query(`insert into public.pack_sets (month, skin, design, rarity) values ('${MONTH}','rubi','rubi','epica')`);
const A = await W.scenario("PA", { count: 3 });

const rows = async (p, skin) => (await db.query("select id, is_spare, transferred_at, quick_sell_coins from public.card_skin_purchases where member_id = $1 and skin = $2 order by is_spare, created_at", [A.ids[p], skin])).rows;
const giftPack = async (p) => {
  await db.query("insert into public.packs (group_id, member_id, match_id, month, tier, rarity, skin, odds, source, price) values ($1,$2,null,$3,'D','epica','rubi','{\"epica\":100}','shop',100) returning id", [A.group, A.ids[p], MONTH]);
  return (await db.query("select id from public.packs where member_id = $1 and opened_at is null order by created_at desc limit 1", [A.ids[p]])).rows[0].id;
};
const open = (p, id) => W.attempt(A.users[p], "select * from public.open_pack($1)", [id]);
const income = async (p) => (await W.as(A.users[p], () => db.query("select public.get_my_market_income($1) as v", [A.group]))).rows[0].v;

{
  const S = "1 abrir repetida";
  const first = await open(0, await giftPack(0));
  check(S, "a primeira vez entra como posse normal", first.ok && first.rows[0].was_duplicate === false && (await rows(0, "rubi")).length === 1 && !(await rows(0, "rubi"))[0].is_spare);
  const second = await open(0, await giftPack(0));
  check(S, "a segunda vem repetida e sem moedas", second.ok && second.rows[0].was_duplicate === true && second.rows[0].coins_awarded === 0);
  const r = await rows(0, "rubi");
  check(S, "ficam 2 linhas: a posse e a cópia extra", r.length === 2 && r.filter((x) => x.is_spare).length === 1);
  const third = await open(0, await giftPack(0));
  check(S, "uma terceira vira mais uma extra", third.ok && (await rows(0, "rubi")).filter((x) => x.is_spare).length === 2);
  check(S, "o saldo não mexe (preço 0)", (await income(0)) === 0);
}

{
  const S = "2 vender a extra";
  await db.query("update public.group_members set card_skin = 'rubi' where id = $1", [A.ids[0]]);
  const [main, spare1, spare2] = await rows(0, "rubi").then((r) => [r.find((x) => !x.is_spare), ...r.filter((x) => x.is_spare)]);
  fail(S, "a posse em uso não vende", await server("select public.quick_sell_skin($1,$2,70)", [A.ids[0], main.id]), "PA023");
  pass(S, "a extra vende mesmo com a skin em uso (venda rápida)", await server("select public.quick_sell_skin($1,$2,70)", [A.ids[0], spare1.id]));
  check(S, "a renda soma 70", (await income(0)) === 70);
  pass(S, "a outra extra vai para o Mercado mesmo em uso", await server("select public.market_list($1,$2,300,24)", [A.ids[0], spare2.id]));
  const after = await rows(0, "rubi");
  check(S, "a posse continua e segue em uso", after.some((x) => !x.is_spare && x.transferred_at === null));
  fail(S, "sem extra, a posse em uso volta a não poder vender", await server("select public.quick_sell_skin($1,$2,70)", [A.ids[0], main.id]), "PA023");
}

{
  const S = "3 posse única";
  const dup = await server("insert into public.card_skin_purchases (group_id, member_id, skin, price, source) values ($1,$2,'rubi',0,'pack')", [A.group, A.ids[0]]);
  fail(S, "duas posses normais da mesma skin continuam proibidas", dup);
  const b = await open(1, await giftPack(1));
  check(S, "outro jogador abre a dele sem interferência", b.ok && b.rows[0].was_duplicate === false);
}
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} verificações OK`);
process.exit(bad.length ? 1 : 0);
