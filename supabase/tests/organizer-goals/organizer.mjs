// Confirmação dos gols pelo organizador: vale como os 3 "sim", só organizador, nunca os próprios, número corrigido apaga, e o Goleador sai.
// Roda no PGlite com todas as migrations; não toca no banco real. Uso: REPO=$(pwd) node supabase/tests/organizer-goals/organizer.mjs
import { world, check, results } from "../goals-flow/lib.mjs";
const W = await world();
const { db } = W;
const fail = (s, name, r) => check(s, name, !r.ok, r.ok ? "ACEITOU (deveria recusar)" : "");
const pass = (s, name, r) => check(s, name, r.ok, r.ok ? "" : `${r.code ?? ""} ${r.error}`);
const w = await W.scenario("ORG", { count: 8, positions: Array(8).fill("FIX") });
const orgConfirm = (who, target, yes = true) => W.attempt(w.users[who], "select public.organizer_confirm_goals($1,$2,$3)", [w.match, w.ids[target], yes]);
const confirmed = async (target) => (await db.query("select public.goal_confirmed($1,$2) as c", [w.match, w.ids[target]])).rows[0].c;
const listed = async (target) => (await W.as(w.users[2], () => db.query("select * from public.get_group_goals($1) where member_id = $2", [w.group, w.ids[target]]))).rows[0];

for (let p = 0; p < 8; p++) pass("0 gols", `P${p} informa`, await W.report(w, p, p, p === 3 ? 2 : p === 0 ? 1 : 0));
{
  const S = "1 confirmar";
  pass(S, "um colega dá 1 sim", await W.confirm(w, 4, 3, true));
  check(S, "com 1 sim ainda não vale", (await confirmed(3)) === false);
  fail(S, "jogador comum não confirma sozinho", await orgConfirm(2, 3));
  fail(S, "organizador não confirma os próprios gols", await orgConfirm(0, 0));
  fail(S, "não confirma quem fez 0 gols", await orgConfirm(0, 5));
  pass(S, "organizador confirma os gols do P3", await orgConfirm(0, 3));
  check(S, "agora vale", (await confirmed(3)) === true);
  check(S, "a leitura mostra a confirmação do organizador", (await listed(3)).organizer_confirmed === true);
  pass(S, "desfaz", await orgConfirm(0, 3, false));
  check(S, "desfeito não vale", (await confirmed(3)) === false);
  pass(S, "confirma de novo", await orgConfirm(0, 3));
}
{
  const S = "2 corrigir apaga";
  pass(S, "o organizador corrige o número do P3", await W.report(w, 0, 3, 3));
  check(S, "número novo: confirmação apagada", (await confirmed(3)) === false && (await listed(3)).organizer_confirmed === false);
  pass(S, "confirma o número novo", await orgConfirm(0, 3));
}
{
  const S = "3 fechar";
  await W.unlock(w, 0);
  for (let p = 0; p < 8; p++) await W.rateAll(w, p, 7);
  pass(S, "fecha a rodada", await W.close(w, 0));
  const g = await W.awards(w, "goleador");
  check(S, "o Goleador é o P3, com os gols confirmados pelo organizador", g.length === 1 && g[0].member_id === w.ids[3] && g[0].votes === 3, JSON.stringify(g));
  fail(S, "rodada fechada: não confirma mais", await orgConfirm(0, 3, false));
}
const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} verificações OK`);
process.exit(bad.length ? 1 : 0);
