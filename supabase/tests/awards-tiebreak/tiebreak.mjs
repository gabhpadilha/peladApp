// Desempate das premiações individuais: OVR geral, depois média geral; empate total leva todos; antes de 2026-11-08 não muda.
// Uso: REPO=$(pwd) node supabase/tests/awards-tiebreak/tiebreak.mjs
import { world, check } from "../goals-flow/lib.mjs";
const W = await world();
const { db, attempt } = W;

async function run(label, date) {
  const w = await W.scenario(label, { count: 10, positions: Array(10).fill("FIX") });
  await db.query("update public.matches set played_on = $2, ratings_unlocked_at = now() where id = $1", [w.match, date]);
  // Notas por jogador: [vel, chu, pas, dri, def, fis]. 1 = 9/9/1 (média 6,3), 2 = 9/9/9, 3 = 9/9/8,5, demais 5.
  const stats = (p) => (p === 1 ? [9, 9, 9, 9, 1, 1] : p === 2 ? [9, 9, 9, 9, 9, 9] : p === 3 ? [9, 9, 9, 9, 9, 8] : [5, 5, 5, 5, 5, 5]);
  const rows = [];
  for (let p = 0; p < 10; p++) for (let e = 0; e < 10; e++) if (e !== p) rows.push(`('${w.match}','${w.ids[e]}','${w.ids[p]}',${stats(p).join(",")})`);
  await db.query(`insert into public.evaluations (match_id, evaluator_id, player_id, vel, chu, pas, dri, def, fis) values ${rows.join(",")}`);
  const r = await attempt(w.users[0], "select public.close_match($1,'default')", [w.match]);
  check(label, "fechou a rodada", r.ok, r.error ?? "");
  return w;
}
const ids = async (w, kind) => (await W.awards(w, kind)).map((r) => w.ids.indexOf(r.member_id)).sort();

const nova = await run("nova", "2026-11-12");
check("nova", "Melhor Jogador: empate de nota decidido pela média geral (só o jogador 2)", JSON.stringify(await ids(nova, "craque")) === "[2]", JSON.stringify(await ids(nova, "craque")));
const velha = await run("velha", "2026-11-05");
check("velha", "antes de 2026-11-08 o empate leva todos (1, 2 e 3)", JSON.stringify(await ids(velha, "craque")) === "[1,2,3]", JSON.stringify(await ids(velha, "craque")));

const failed = (await import("../goals-flow/lib.mjs")).results.filter((x) => !x.ok);
console.log(failed.length ? `\n${failed.length} FALHA(S)` : "\nTUDO OK");
process.exit(failed.length ? 1 : 0);
