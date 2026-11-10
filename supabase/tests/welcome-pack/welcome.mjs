// Pacote de boas-vindas: um por jogador ativo, faixa D, idempotente, abre e entra na coleção.
// Roda no PGlite com todas as migrations; não toca no banco real. Uso: REPO=$(pwd) node supabase/tests/welcome-pack/welcome.mjs
import { world, check, results } from "../goals-flow/lib.mjs";
const W = await world();
const { db } = W;
const server = async (sql, params = []) => {
  try { return { ok: true, rows: (await db.query(sql, params)).rows }; } catch (e) { return { ok: false, error: e.message, code: e.code }; }
};
const MONTH = (await db.query("select to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM') as m")).rows[0].m;
const mine = async (w, p) => (await W.as(w.users[p], () => db.query("select * from public.get_my_packs()"))).rows;

const A = await W.scenario("WA", { count: 4 });
const B = await W.scenario("WB", { count: 3 });
await db.query("update public.group_members set deactivated_at = now() where id = $1", [A.ids[3]]);

{
  const S = "1 sem conjunto";
  const r = await server("select public.give_welcome_packs() as n");
  check(S, "sem pack_sets do mês não entrega nada", !r.ok && r.code === "PA042", r.ok ? "ACEITOU" : `${r.code} ${r.error}`);
  check(S, "nada foi gravado", (await db.query("select count(*)::int as n from public.packs where source = 'gift'")).rows[0].n === 0);
}

await db.query(`insert into public.pack_sets (month, skin, design, rarity) values
  ('${MONTH}','lend-1','lend-1','lendaria'),('${MONTH}','epic-1','epic-1','epica'),('${MONTH}','rara-1','rara-1','rara'),('${MONTH}','comum-1','comum-1','comum')`);
const total = (await db.query("select count(*)::int as n from public.group_members where deactivated_at is null")).rows[0].n;

{
  const S = "2 entregar";
  const r = await server("select public.give_welcome_packs() as n");
  check(S, "entrega um por jogador ativo", r.ok && r.rows[0].n === total, r.ok ? `${r.rows[0].n} de ${total}` : r.error);
  const rows = await mine(A, 0);
  check(S, "o pacote é de presente, faixa D, lacrado, sem rodada nem preço", rows.length === 1 && rows[0].source === "gift" && rows[0].tier === "D" && rows[0].opened_at === null && rows[0].match_id === null && rows[0].price === null && rows[0].group_id === A.group);
  check(S, "chances da faixa D (72/21/6/1)", rows[0].odds.comum === 72 && rows[0].odds.lendaria === 1);
  check(S, "jogador desativado não ganha", (await db.query("select count(*)::int as n from public.packs where member_id = $1", [A.ids[3]])).rows[0].n === 0);
  check(S, "cada jogador de cada pelada ganhou o seu", (await mine(B, 2)).length === 1 && (await mine(B, 0)).length === 1);
  const again = await server("select public.give_welcome_packs() as n");
  check(S, "rodar de novo não duplica", again.ok && again.rows[0].n === 0 && (await mine(A, 0)).length === 1);
  const late = await db.query("update public.group_members set deactivated_at = null where id = $1 returning id", [A.ids[3]]);
  const third = await server("select public.give_welcome_packs() as n");
  check(S, "quem voltou depois ganha só o dele", late.rows.length === 1 && third.ok && third.rows[0].n === 1);
}

{
  const S = "3 abrir";
  const id = (await mine(A, 1))[0].pack_id;
  const opened = await W.as(A.users[1], () => db.query("select * from public.open_pack($1)", [id]));
  check(S, "abre e a skin entra na coleção", opened.rows.length === 1 && ["lend-1", "epic-1", "rara-1", "comum-1"].includes(opened.rows[0].skin) && opened.rows[0].was_duplicate === false);
  check(S, "pelo login ninguém roda a função (só o dono do banco)", !(await W.attempt(A.users[1], "select public.give_welcome_packs()")).ok);
}
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} verificações OK`);
process.exit(bad.length ? 1 : 0);
