// Mercado de skins: anunciar, cancelar, vencer, comprar, saldo, corrida e isolamento entre peladas.
// Roda no PGlite com todas as migrations; não toca no banco real. Uso: REPO=$(pwd) node supabase/tests/market/market.mjs
import { world, check, results } from "../goals-flow/lib.mjs";
const W = await world();
const { db, attempt } = W;
const fail = (s, name, r, code) => check(s, name, !r.ok && (!code || r.code === code), r.ok ? "ACEITOU (deveria recusar)" : `${r.code ?? ""} ${r.error}`);
const pass = (s, name, r) => check(s, name, r.ok, r.ok ? "" : `${r.code ?? ""} ${r.error}`);
// O servidor chama as funções que mudam dados com a chave secreta (aqui: o dono do banco).
const server = async (sql, params = []) => {
  try { return { ok: true, rows: (await db.query(sql, params)).rows }; } catch (e) { return { ok: false, error: e.message, code: e.code }; }
};
const grant = async (w, p, skin, price = 0, source = "shop") =>
  (await db.query("insert into public.card_skin_purchases (group_id, member_id, skin, price, source) values ($1,$2,$3,$4,$5) returning id", [w.group, w.ids[p], skin, price, source])).rows[0].id;
const list = (w, p, purchase, price, hours = 24) => server("select public.market_list($1,$2,$3,$4) as id", [w.ids[p], purchase, price, hours]);
const buy = (w, p, listing, earned) => server("select public.market_buy($1,$2,$3) as skin", [w.ids[p], listing, earned]);
const owned = async (w, p) => (await db.query("select skin from public.card_skin_purchases where member_id = $1 and transferred_at is null order by skin", [w.ids[p]])).rows.map((r) => r.skin);
const spent = async (w, p) => (await db.query("select coalesce(sum(price),0)::int as s from public.card_skin_purchases where member_id = $1", [w.ids[p]])).rows[0].s;
const income = async (w, p) => (await W.as(w.users[p], () => db.query("select public.get_my_market_income($1) as v", [w.group]))).rows[0].v;

const A = await W.scenario("MA", { count: 4 });
const B = await W.scenario("MB", { count: 3 });

// 1. Anunciar
let safiraA, listing1;
{
  const S = "1 anunciar";
  safiraA = await grant(A, 1, "safira", 250);
  const esm = await grant(A, 1, "esmeralda", 0);
  const r = await list(A, 1, safiraA, 300);
  pass(S, "anuncia skin própria", r);
  listing1 = r.rows?.[0]?.id;
  fail(S, "não anuncia a mesma skin duas vezes", await list(A, 1, safiraA, 300), "PA025");
  fail(S, "Esmeralda não pode ser vendida", await list(A, 1, esm, 100), "PA022");
  fail(S, "não anuncia skin de outro", await list(A, 2, safiraA, 300), "PA021");
  const rubi = await grant(A, 1, "rubi", 450);
  await db.query("update public.group_members set card_skin = 'rubi' where id = $1", [A.ids[1]]);
  fail(S, "não anuncia a skin em uso", await list(A, 1, rubi, 500), "PA023");
  fail(S, "preço zero recusado", await list(A, 2, await grant(A, 2, "ametista", 250), 0), "PA024");
  fail(S, "prazo acima de 72 h recusado", await list(A, 2, (await db.query("select id from public.card_skin_purchases where member_id=$1 and skin='ametista'", [A.ids[2]])).rows[0].id, 200, 100), "PA024");
  fail(S, "jogador não chama market_list direto", await attempt(A.users[1], "select public.market_list($1,$2,$3)", [A.ids[1], safiraA, 300]), "42501");
  fail(S, "jogador não lê a tabela de anúncios", await attempt(A.users[1], "select * from public.market_listings"), "42501");
  fail(S, "jogador não grava anúncio direto", await attempt(A.users[1], "insert into public.market_listings (purchase_id, seller_member_id, seller_group_id, skin, price, expires_at) values ($1,$2,$3,'safira',1, now() + interval '1 hour')", [safiraA, A.ids[1], A.group]), "42501");

  // Limite de 10 ativos
  const many = [];
  for (let i = 0; i < 10; i++) many.push(await grant(A, 3, `skin-${i}`, 10));
  for (let i = 0; i < 10; i++) await list(A, 3, many[i], 100);
  fail(S, "11º anúncio ativo recusado", await list(A, 3, await grant(A, 3, "skin-10", 10), 100), "PA026");
}

// 2. Cancelar
{
  const S = "2 cancelar";
  const id = (await db.query("select id from public.card_skin_purchases where member_id=$1 and skin='ametista'", [A.ids[2]])).rows[0].id;
  const l = (await list(A, 2, id, 200)).rows[0].id;
  fail(S, "outro não cancela o anúncio", await server("select public.market_cancel($1,$2)", [A.ids[1], l]), "PA027");
  pass(S, "dono cancela", await server("select public.market_cancel($1,$2)", [A.ids[2], l]));
  fail(S, "cancelado não cancela de novo", await server("select public.market_cancel($1,$2)", [A.ids[2], l]), "PA027");
  fail(S, "cancelado não é comprado", await buy(B, 1, l, 10000), "PA028");
  pass(S, "relista depois de cancelar", await list(A, 2, id, 220));
}

// 3. Vencer
{
  const S = "3 vencer";
  const id = await grant(A, 2, "onix", 100);
  const l = (await list(A, 2, id, 150)).rows[0].id;
  await db.query("update public.market_listings set created_at = now() - interval '25 hours', expires_at = now() - interval '1 hour' where id = $1", [l]);
  fail(S, "vencido não é comprado", await buy(B, 1, l, 10000), "PA028");
  pass(S, "vencido é relistado (libera sozinho)", await list(A, 2, id, 160));
  check(S, "o vencido virou cancelado", (await db.query("select status from public.market_listings where id=$1", [l])).rows[0].status === "cancelled");
  await db.query("update public.market_listings set created_at = now() - interval '25 hours', expires_at = now() - interval '1 hour' where seller_member_id = $1", [A.ids[3]]);
  pass(S, "vencidos não contam no limite de 10", await list(A, 3, (await db.query("select id from public.card_skin_purchases where member_id=$1 and skin='skin-10'", [A.ids[3]])).rows[0].id, 100));
}

// 4. Comprar (entre peladas)
{
  const S = "4 comprar";
  fail(S, "não compra o próprio anúncio", await buy(A, 1, listing1, 10000), "PA029");
  fail(S, "saldo insuficiente", await buy(B, 1, listing1, 299), "PA031");
  await grant(B, 2, "safira", 250);
  fail(S, "não compra skin que já tem", await buy(B, 2, listing1, 10000), "PA030");
  fail(S, "jogador não chama market_buy direto", await attempt(B.users[1], "select public.market_buy($1,$2,$3)", [B.ids[1], listing1, 10000]), "42501");
  const before = await spent(A, 1);
  const r = await buy(B, 1, listing1, 300);
  pass(S, "compra com saldo exato (outra pelada)", r);
  check(S, "devolve a skin comprada", r.rows?.[0]?.skin === "safira");
  check(S, "comprador fica com a skin", (await owned(B, 1)).includes("safira"));
  check(S, "comprador gastou o preço do anúncio", (await spent(B, 1)) === 300);
  check(S, "vendedor perde a posse", !(await owned(A, 1)).includes("safira"));
  check(S, "o gasto do vendedor não muda (nada de moeda do nada)", (await spent(A, 1)) === before);
  check(S, "vendedor recebe o preço como ganho", (await income(A, 1)) === 300);
  check(S, "outro jogador da pelada não vê esse ganho como dele", (await income(A, 2)) === 0);
  check(S, "comprador não tem ganho de venda", (await income(B, 1)) === 0);
  fail(S, "segunda compra do mesmo anúncio recusada", await buy(B, 0, listing1, 10000), "PA028");
  const st = (await db.query("select status, buyer_member_id, sold_at from public.market_listings where id=$1", [listing1])).rows[0];
  check(S, "anúncio marcado vendido", st.status === "sold" && st.buyer_member_id === B.ids[1] && st.sold_at !== null);
  check(S, "origem da compra = market", (await db.query("select source from public.card_skin_purchases where member_id=$1 and skin='safira' and transferred_at is null", [B.ids[1]])).rows[0].source === "market");

  // Saldo já gasto conta: com 300 ganhos e 300 gastos, não compra mais nada
  const id = await grant(A, 2, "turquesa", 100);
  const l = (await list(A, 2, id, 50)).rows[0].id;
  fail(S, "o que já gastou sai do saldo", await buy(B, 1, l, 300), "PA031");

  // Vendedor pode comprar a mesma skin de novo (índice parcial)
  const sapB = (await db.query("select id from public.card_skin_purchases where member_id=$1 and skin='safira' and transferred_at is null", [B.ids[1]])).rows[0].id;
  const back = (await list(B, 1, sapB, 280)).rows[0].id;
  pass(S, "quem vendeu compra a mesma skin de volta", await buy(A, 1, back, 100000));
  check(S, "volta a ter 1 cópia em posse", (await owned(A, 1)).filter((s) => s === "safira").length === 1);
  check(S, "renda de B soma a venda", (await income(B, 1)) === 280);
}

// 5. Suspensa e desativado
{
  const S = "5 suspensa/desativado";
  const C = await W.scenario("MC", { count: 3 });
  const id = await grant(C, 1, "vampiro", 200);
  const l = (await list(C, 1, id, 250)).rows[0].id;
  await db.query("update public.groups set suspended_at = now() where id = $1", [C.group]);
  fail(S, "anúncio de pelada suspensa sai do ar", await buy(B, 0, l, 10000), "PA028");
  fail(S, "pelada suspensa não anuncia", await list(C, 1, await grant(C, 1, "lobisomem", 200), 250), "PA009");
  await db.query("update public.groups set suspended_at = null where id = $1", [C.group]);
  await db.query("update public.group_members set deactivated_at = now() where id = $1", [C.ids[1]]);
  fail(S, "anúncio de desativado sai do ar", await buy(B, 0, l, 10000), "PA028");
  fail(S, "desativado não anuncia", await list(C, 1, id, 250), "PA020");
  await db.query("update public.group_members set deactivated_at = now() where id = $1", [B.ids[0]]);
  fail(S, "desativado não compra", await buy(B, 0, l, 10000), "PA020");
}

// 6. Pacote depois da venda
{
  const S = "6 pacote";
  const fn = (await db.query("select prosrc from pg_proc where proname = 'open_pack'")).rows[0].prosrc;
  check(S, "open_pack só conta como repetida a cópia em posse", fn.includes("transferred_at is null"));
}

// 7. Isolamento: comprador não lê as compras da outra pelada
{
  const S = "7 isolamento";
  const r = await attempt(B.users[1], "select * from public.card_skin_purchases where group_id = $1", [A.group]);
  check(S, "não vê as compras da pelada do vendedor", r.ok && r.rows.length === 0);
}

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} verificações OK`);
process.exit(bad.length ? 1 : 0);
