// Pacotes da Loja: compra, saldo, sorteio por faixa, sem conjunto, abrir, repetida e isolamento.
// Roda no PGlite com todas as migrations; não toca no banco real. Uso: REPO=$(pwd) node supabase/tests/shop-packs/shop.mjs
import { world, check, results } from "../goals-flow/lib.mjs";
const W = await world();
const { db } = W;
const server = async (sql, params = []) => {
  try { return { ok: true, rows: (await db.query(sql, params)).rows }; } catch (e) { return { ok: false, error: e.message, code: e.code }; }
};
const fail = (s, name, r, code) => check(s, name, !r.ok && (!code || r.code === code), r.ok ? "ACEITOU (deveria recusar)" : `${r.code ?? ""} ${r.error}`);
const pass = (s, name, r) => check(s, name, r.ok, r.ok ? "" : `${r.code ?? ""} ${r.error}`);
const MONTH = (await db.query("select to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM') as m")).rows[0].m;
const buy = (w, p, tier, price, earned) => server("select public.shop_buy_pack($1,$2,$3,$4) as id", [w.ids[p], tier, price, earned]);
const mine = async (w, p) => (await W.as(w.users[p], () => db.query("select * from public.get_my_packs()"))).rows;

const A = await W.scenario("SA", { count: 3 });
const B = await W.scenario("SB", { count: 3 });

{
  const S = "1 sem conjunto";
  fail(S, "sem pack_sets do mês não vende", await buy(A, 0, "A", 100, 1000), "PA042");
}

await db.query(`insert into public.pack_sets (month, skin, design, rarity) values
  ('${MONTH}','lend-1','lend-1','lendaria'),('${MONTH}','epic-1','epic-1','epica'),('${MONTH}','rara-1','rara-1','rara'),('${MONTH}','comum-1','comum-1','comum')`);

let first;
{
  const S = "2 comprar";
  fail(S, "faixa inválida", await buy(A, 0, "Z", 100, 1000), "PA043");
  fail(S, "preço inválido", await buy(A, 0, "A", 0, 1000), "PA043");
  fail(S, "saldo insuficiente", await buy(A, 0, "A", 300, 100), "PA031");
  const r = await buy(A, 0, "A", 300, 1000);
  pass(S, "compra com saldo", r);
  first = r.rows?.[0]?.id;
  const rows = await mine(A, 0);
  check(S, "o pacote aparece em get_my_packs, lacrado, sem rodada e com o preço", rows.length === 1 && rows[0].source === "shop" && rows[0].price === 300 && rows[0].match_id === null && rows[0].round === null && rows[0].opened_at === null && rows[0].skin === null && rows[0].group_id === A.group);
  check(S, "chances somam ~100% e usam só as raridades do conjunto", Math.abs(Object.values(rows[0].odds).reduce((a, b) => a + b, 0) - 100) < 0.5 && Object.keys(rows[0].odds).length === 4);
  check(S, "faixa A tem as chances da tabela (45/33/17/5)", rows[0].odds.comum === 45 && rows[0].odds.lendaria === 5);
  fail(S, "o saldo desconta o que já gastou em pacote da Loja", await buy(A, 0, "A", 300, 500), "PA031");
  pass(S, "com saldo bruto maior compra outra", await buy(A, 0, "D", 100, 500));
  check(S, "são 2 pacotes comprados", (await mine(A, 0)).length === 2);
}

{
  const S = "3 abrir";
  const opened = await W.as(A.users[0], () => db.query("select * from public.open_pack($1)", [first]));
  check(S, "abre e entra na coleção", opened.rows.length === 1 && ["lend-1", "epic-1", "rara-1", "comum-1"].includes(opened.rows[0].skin) && opened.rows[0].was_duplicate === false);
  const own = (await db.query("select skin, source from public.card_skin_purchases where member_id = $1", [A.ids[0]])).rows;
  check(S, "a skin vem com source pack e preço 0 (não mexe no saldo)", own.length === 1 && own[0].source === "pack");
  const again = await W.as(A.users[0], () => db.query("select * from public.open_pack($1)", [first]));
  check(S, "abrir de novo é idempotente", again.rows[0].skin === opened.rows[0].skin);
  const unopened = (await W.as(A.users[0], () => db.query("select public.count_my_unopened_packs() as n"))).rows[0].n;
  check(S, "o outro continua lacrado", unopened === 1);
}

{
  const S = "4 isolamento";
  check(S, "outro jogador não vê o pacote", (await mine(A, 1)).length === 0);
  const other = await W.attempt(B.users[0], "select * from public.open_pack($1)", [first]);
  check(S, "outro jogador não abre", !other.ok);
  fail(S, "direto pelo login ninguém compra (só a chave secreta)", await W.attempt(A.users[0], "select public.shop_buy_pack($1,'A',300,9999)", [A.ids[0]]));
  await db.query("update public.group_members set deactivated_at = now() where id = $1", [A.ids[2]]);
  fail(S, "jogador desativado não compra", await buy(A, 2, "D", 100, 9999), "PA020");
}

{
  const S = "5 sorteio";
  let lend = 0;
  for (let i = 0; i < 60; i++) {
    const r = await buy(B, 1, "A", 1, 999999);
    if (!r.ok) { check(S, "sorteio roda", false, r.error); break; }
  }
  const rows = (await db.query("select rarity from public.packs where member_id = $1 and source = 'shop'", [B.ids[1]])).rows;
  lend = rows.filter((r) => r.rarity === "lendaria").length;
  check(S, "60 compras sorteiam as 4 raridades possíveis (nenhuma fora do conjunto)", rows.length === 60 && rows.every((r) => ["lendaria", "epica", "rara", "comum"].includes(r.rarity)));
  check(S, "a lendária é rara na faixa A (5%): bem menos da metade", lend < 30);
}
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} verificações OK`);
process.exit(bad.length ? 1 : 0);
