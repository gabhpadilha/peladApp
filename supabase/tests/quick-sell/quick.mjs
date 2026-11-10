// Venda rápida de skins: valor entra no saldo, a skin sai da posse, recusas e idempotência.
// Roda no PGlite com todas as migrations; não toca no banco real. Uso: REPO=$(pwd) node supabase/tests/quick-sell/quick.mjs
import { world, check, results } from "../goals-flow/lib.mjs";
const W = await world();
const { db } = W;
const server = async (sql, params = []) => {
  try { return { ok: true, rows: (await db.query(sql, params)).rows }; } catch (e) { return { ok: false, error: e.message, code: e.code }; }
};
const fail = (s, name, r, code) => check(s, name, !r.ok && (!code || r.code === code), r.ok ? "ACEITOU (deveria recusar)" : `${r.code ?? ""} ${r.error}`);
const pass = (s, name, r) => check(s, name, r.ok, r.ok ? "" : `${r.code ?? ""} ${r.error}`);
const grant = async (w, p, skin, price = 0) =>
  (await db.query("insert into public.card_skin_purchases (group_id, member_id, skin, price, source) values ($1,$2,$3,$4,'shop') returning id", [w.group, w.ids[p], skin, price])).rows[0].id;
const sell = (w, p, purchase, coins) => server("select public.quick_sell_skin($1,$2,$3)", [w.ids[p], purchase, coins]);
const income = async (w, p) => (await W.as(w.users[p], () => db.query("select public.get_my_market_income($1) as v", [w.group]))).rows[0].v;
const owned = async (w, p) => (await db.query("select skin from public.card_skin_purchases where member_id = $1 and transferred_at is null order by skin", [w.ids[p]])).rows.map((r) => r.skin);
const spent = async (w, p) => (await db.query("select coalesce(sum(price),0)::int as s from public.card_skin_purchases where member_id = $1", [w.ids[p]])).rows[0].s;

const A = await W.scenario("QA", { count: 3 });
const B = await W.scenario("QB", { count: 2 });

{
  const S = "1 vender";
  const safira = await grant(A, 0, "safira", 250);
  check(S, "sem venda, sem renda", (await income(A, 0)) === 0);
  pass(S, "vende a skin própria", await sell(A, 0, safira, 70));
  check(S, "a skin sai da posse", !(await owned(A, 0)).includes("safira"));
  check(S, "a renda soma o valor da venda rápida", (await income(A, 0)) === 70);
  check(S, "o preço pago continua no gasto (a venda não devolve)", (await spent(A, 0)) === 250);
  fail(S, "vender de novo a mesma compra é recusado", await sell(A, 0, safira, 70), "PA021");
  check(S, "a renda não dobrou", (await income(A, 0)) === 70);
  const again = await grant(A, 0, "safira", 0);
  pass(S, "pode ter a mesma skin de novo (pacote) e vender outra vez", await sell(A, 0, again, 70));
  check(S, "as duas vendas somam", (await income(A, 0)) === 140);
}

{
  const S = "2 recusas";
  const esm = await grant(A, 1, "esmeralda", 0);
  fail(S, "Esmeralda (grátis) não vende", await sell(A, 1, esm, 70), "PA022");
  const rubi = await grant(A, 1, "rubi", 0);
  await db.query("update public.group_members set card_skin = 'rubi' where id = $1", [A.ids[1]]);
  fail(S, "skin em uso não vende", await sell(A, 1, rubi, 70), "PA023");
  await db.query("update public.group_members set card_skin = null where id = $1", [A.ids[1]]);
  const ic = await grant(A, 1, "icone", 0);
  await server("select public.market_list($1,$2,$3,24)", [A.ids[1], ic, 300]);
  fail(S, "skin anunciada no Mercado não vende (cancele antes)", await sell(A, 1, ic, 70), "PA025");
  fail(S, "valor inválido", await sell(A, 1, rubi, 0), "PA024");
  const other = await grant(B, 0, "safira", 0);
  fail(S, "compra de outro jogador não vende", await sell(A, 1, other, 70), "PA021");
  fail(S, "pelo login ninguém vende direto (só a chave secreta)", await W.attempt(A.users[1], "select public.quick_sell_skin($1,$2,70)", [A.ids[1], rubi]));
  await db.query("update public.group_members set deactivated_at = now() where id = $1", [A.ids[2]]);
  const x = await grant(A, 2, "ametista", 0);
  fail(S, "jogador desativado não vende", await sell(A, 2, x, 70), "PA020");
  check(S, "nada vazou para outra pelada", (await income(B, 0)) === 0);
}

{
  const S = "3 saldo junto com o Mercado";
  const c = await grant(A, 1, "ametista", 0);
  pass(S, "vende mais uma", await sell(A, 1, c, 70));
  check(S, "renda da venda rápida do jogador 1 = 70", (await income(A, 1)) === 70);
}
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} verificações OK`);
process.exit(bad.length ? 1 : 0);
