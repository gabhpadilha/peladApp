import { boot } from "./boot.mjs";

let n = 0;
const uuid = () => { n += 1; return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`; };

export const results = [];
export function check(scenario, name, ok, detail = "") {
  results.push({ scenario, name, ok, detail });
  console.log(`${ok ? "OK  " : "FALHA"} [${scenario}] ${name}${detail ? "  → " + detail : ""}`);
}

export async function world() {
  const db = await boot();
  // Executa como um usuário logado (papel authenticated, auth.uid() = userId).
  const as = async (userId, fn) => {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${userId}', false);`);
    try { return await fn(); }
    finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
  };
  // Tenta e devolve { ok } ou { error, code }.
  const attempt = (userId, sql, params = []) => as(userId, async () => {
    try { const r = await db.query(sql, params); return { ok: true, rows: r.rows }; }
    catch (e) { return { ok: false, error: e.message, code: e.code }; }
  });

  // Cria uma pelada com `count` jogadores (o 1º é o Administrador/organizador) e uma rodada aberta com todos presentes.
  async function scenario(label, { count = 10, positions = [], organizers = 1, members } = {}) {
    const users = [], ids = [];
    for (let i = 0; i < count; i++) {
      const u = uuid(); users.push(u);
      await db.query("insert into auth.users (id, email) values ($1, $2)", [u, `${label}-${i}@x.test`]);
    }
    const group = (await as(users[0], () => db.query("select public.create_group($1, $2, $3) as id", [`Pelada ${label}`, "P0", positions[0] ?? "FIX"]))).rows[0].id;
    const m0 = (await db.query("select id from public.group_members where group_id = $1 and user_id = $2", [group, users[0]])).rows[0].id;
    ids.push(m0);
    for (let i = 1; i < count; i++) {
      const row = (await db.query(
        "insert into public.group_members (group_id, user_id, role, nickname, position) values ($1,$2,$3,$4,$5) returning id",
        [group, users[i], i < organizers ? "organizer" : "player", `P${i}`, positions[i] ?? (i === 1 ? "GOL" : "FIX")],
      )).rows[0];
      ids.push(row.id);
    }
    const present = members ?? ids;
    const teams = present.map((_, i) => (i % 2) + 1);
    const flags = present.map(() => false);
    const match = (await as(users[0], () => db.query(
      "select public.create_match($1, $2, $3::uuid[], $4::smallint[], $5::boolean[]) as id",
      [group, "2026-11-12", present, teams, flags],
    ))).rows[0].id;
    return { group, match, users, ids, present };
  }

  const report = (w, who, target, goals) => attempt(w.users[who], "select public.report_goals($1,$2,$3)", [w.match, w.ids[target], goals]);
  const confirm = (w, who, target, yes) => attempt(w.users[who], "select public.confirm_goals($1,$2,$3)", [w.match, w.ids[target], yes]);
  const finish = (w, who) => attempt(w.users[who], "select public.finish_goal_check($1)", [w.match]);
  const confirmExp = (w, who, target, yes, expected) => attempt(w.users[who], "select public.confirm_goals($1,$2,$3,$4)", [w.match, w.ids[target], yes, expected]);
  const unlock = (w, who) => attempt(w.users[who], "select public.unlock_ratings($1)", [w.match]);
  const ratingsOpen = async (w) => (await db.query("select public.ratings_open($1) as o", [w.match])).rows[0].o;
  // Envia as notas de `who` para todos os outros presentes (uma inserção só, como o app).
  const rateAll = (w, who, score = 7) => {
    const rows = w.present.filter((id) => id !== w.ids[who]).map((id) => `('${w.match}','${w.ids[who]}','${id}',${score},${score},${score},${score},${score},${score})`);
    return attempt(w.users[who], `insert into public.evaluations (match_id, evaluator_id, player_id, vel, chu, pas, dri, def, fis) values ${rows.join(",")}`);
  };
  const state = async (w, target) => (await as(w.users[0], () => db.query(
    "select goals, yes_count, no_count, reported_by from public.get_group_goals($1) g where g.match_id=$2 and g.member_id=$3", [w.group, w.match, w.ids[target]]))).rows[0];
  const close = (w, who) => attempt(w.users[who], "select public.close_match($1, 'default')", [w.match]);
  const awards = async (w, kind) => (await db.query("select member_id, votes from public.awards where match_id=$1 and kind=$2", [w.match, kind])).rows;
  return { db, as, attempt, scenario, report, confirm, confirmExp, finish, unlock, ratingsOpen, rateAll, state, close, awards };
}
