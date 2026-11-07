// Desempate das premiações individuais: OVR geral, depois média geral; empate total leva todos; antes de 2026-11-08 não muda.
// Uso: REPO=$(pwd) node supabase/tests/awards-tiebreak/tiebreak.mjs
import { world, check } from "../goals-flow/lib.mjs";
const W = await world();
const { db, attempt } = W;

async function run(label, date, goals = 0) {
  const w = await W.scenario(label, { count: 10, positions: Array(10).fill("FIX") });
  await db.query("update public.matches set played_on = $2, ratings_unlocked_at = now() where id = $1", [w.match, date]);
  // Notas por jogador: [vel, chu, pas, dri, def, fis]. 1 = 9/9/1 (média 6,3), 2 = 9/9/9, 3 = 9/9/8,5, demais 5.
  const stats = (p) => (p === 1 ? [9, 9, 9, 9, 1, 1] : p === 2 ? [9, 9, 9, 9, 9, 9] : p === 3 ? [9, 9, 9, 9, 9, 8] : [5, 5, 5, 5, 5, 5]);
  const rows = [];
  for (let p = 0; p < 10; p++) for (let e = 0; e < 10; e++) if (e !== p) rows.push(`('${w.match}','${w.ids[e]}','${w.ids[p]}',${stats(p).join(",")})`);
  await db.query(`insert into public.evaluations (match_id, evaluator_id, player_id, vel, chu, pas, dri, def, fis) values ${rows.join(",")}`);
  if (goals > 0) {
    await db.query("insert into public.match_goals (group_id, match_id, member_id, goals, reported_by) values ($1,$2,$3,$4,$3)", [w.group, w.match, w.ids[2], goals]);
    for (const voter of [3, 4, 5]) await db.query("insert into public.match_goal_confirmations (group_id, match_id, member_id, voter_id, confirmed) values ($1,$2,$3,$4,true)", [w.group, w.match, w.ids[2], w.ids[voter]]);
  }
  const r = await attempt(w.users[0], "select public.close_match($1,'default')", [w.match]);
  check(label, "fechou a rodada", r.ok, r.error ?? "");
  return w;
}
const ids = async (w, kind) => (await W.awards(w, kind)).map((r) => w.ids.indexOf(r.member_id)).sort();

const nova = await run("nova", "2026-11-12");
check("nova", "Melhor Jogador: empate de nota decidido pela média geral (só o jogador 2)", JSON.stringify(await ids(nova, "craque")) === "[2]", JSON.stringify(await ids(nova, "craque")));
const velha = await run("velha", "2026-11-05");
check("velha", "antes de 2026-11-08 o empate leva todos (1, 2 e 3)", JSON.stringify(await ids(velha, "craque")) === "[1,2,3]", JSON.stringify(await ids(velha, "craque")));

const gols = await run("gols", "2026-11-12", 4);
const card = (await db.query("select attributes, ovr from public.awards where match_id = $1 and member_id = $2 and kind = 'craque'", [gols.match, gols.ids[2]])).rows[0];
check("gols", "carta congelada: 4 gols somam +4 em VEL e CHU (90 + 4 + 1 do prêmio)", card?.attributes?.vel === 95 && card?.attributes?.chu === 95 && card?.attributes?.pas === 91, JSON.stringify(card));
const semGols = (await db.query("select attributes from public.awards where match_id = $1 and member_id = $2 and kind = 'craque'", [nova.match, nova.ids[2]])).rows[0];
check("gols", "sem gols a carta fica em 91 (90 + 1 do prêmio)", semGols?.attributes?.vel === 91, JSON.stringify(semGols));

const failed = (await import("../goals-flow/lib.mjs")).results.filter((x) => !x.ok);
console.log(failed.length ? `\n${failed.length} FALHA(S)` : "\nTUDO OK");
process.exit(failed.length ? 1 : 0);
