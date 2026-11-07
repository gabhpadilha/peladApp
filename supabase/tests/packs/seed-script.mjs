// Valida supabase/scripts/seed-test-packs.sql e cleanup-test-packs.sql contra as migrations (PGlite).
// Uso: REPO=$(pwd) node supabase/tests/packs/seed-script.mjs
import { readFileSync } from "node:fs";
import { world, check, results } from "../goals-flow/lib.mjs";
const W = await world();
const { db, attempt } = W;
const seed = readFileSync("supabase/scripts/seed-test-packs.sql", "utf8");
const cleanup = readFileSync("supabase/scripts/cleanup-test-packs.sql", "utf8");

// O auth.users do teste é simplificado: acrescenta as colunas que o script de seed preenche (como no Supabase).
await db.exec(`alter table auth.users add column instance_id uuid, add column aud text, add column role text, add column encrypted_password text,
  add column email_confirmed_at timestamptz, add column raw_app_meta_data jsonb, add column created_at timestamptz, add column updated_at timestamptz`);
const w = await W.scenario("tp", { count: 2 });
await db.query("update public.groups set name = 'Teste Pacotes' where id = $1", [w.group]);
await db.query("delete from public.matches where group_id = $1", [w.group]);

await db.exec(seed);
const match = (await db.query("select id from public.matches where group_id = $1 and status = 'open'", [w.group])).rows[0];
check("seed", "criou a rodada aberta", Boolean(match));
const present = (await db.query("select count(*)::int n from public.match_attendance where match_id = $1", [match.id])).rows[0].n;
check("seed", "12 presentes", present === 12, String(present));

// O dono avalia todos os outros e fecha.
const owner = (await db.query("select id from public.group_members where group_id = $1 and user_id = $2", [w.group, w.users[0]])).rows[0].id;
const others = (await db.query("select member_id from public.match_attendance where match_id = $1 and member_id <> $2", [match.id, owner])).rows;
const rows = others.map((o) => `('${match.id}','${owner}','${o.member_id}',7,7,7,7,7,7)`);
const gk = (await db.query("select ma.member_id from public.match_attendance ma join public.group_members gm on gm.id = ma.member_id where ma.match_id = $1 and gm.position = 'GOL'", [match.id])).rows.map((r) => r.member_id);
const lineRows = others.filter((o) => !gk.includes(o.member_id)).map((o) => `('${match.id}','${owner}','${o.member_id}',7,7,7,7,7,7)`);
const gkRows = others.filter((o) => gk.includes(o.member_id)).map((o) => `('${match.id}','${owner}','${o.member_id}',7,7,7,7,7,7)`);
if (lineRows.length) check("seed", "dono avalia a linha", (await attempt(w.users[0], `insert into public.evaluations (match_id, evaluator_id, player_id, vel, chu, pas, dri, def, fis) values ${lineRows.join(",")}`)).ok);
if (gkRows.length) check("seed", "dono avalia o gol", (await attempt(w.users[0], `insert into public.evaluations (match_id, evaluator_id, player_id, ref, ela, pos, sai, rep, pes) values ${gkRows.join(",")}`)).ok);
const closed = await attempt(w.users[0], "select public.close_match($1,'default')", [match.id]);
check("seed", "fechou a rodada", closed.ok, closed.error ?? "");
const packs = (await db.query("select count(*)::int n, count(distinct member_id)::int m from public.packs where match_id = $1", [match.id])).rows[0];
check("seed", "12 pacotes, um por presente", packs.n === 12 && packs.m === 12, JSON.stringify(packs));

await db.exec(cleanup);
const left = (await db.query("select (select count(*)::int from auth.users where email like 'seed.pk.%') u, (select count(*)::int from public.matches where group_id = $1) m, (select count(*)::int from public.pack_sets where month='2026-11') s, (select packs_enabled from public.groups where id = $1) e", [w.group])).rows[0];
check("cleanup", "limpou fictícios, rodadas e conjunto de teste e desligou os pacotes", left.u === 0 && left.m === 0 && left.s === 0 && left.e === false, JSON.stringify(left));

const failed = results.filter((r) => !r.ok);
console.log(failed.length ? `\n${failed.length} FALHA(S)` : "\nTUDO OK");
process.exit(failed.length ? 1 : 0);
