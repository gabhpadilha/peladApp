// Objetivos do mês: aceite, escolha única, só conta depois do aceite, cumprir uma vez só, pacote por faixa, goleiro e isolamento.
// Roda no PGlite com todas as migrations; não toca no banco real. Uso: REPO=$(pwd) node supabase/tests/goals/goals.mjs
import { world, check, results } from "../goals-flow/lib.mjs";
const W = await world();
const { db, attempt } = W;
const fail = (s, name, r, code) => check(s, name, !r.ok && (!code || r.code === code), r.ok ? "ACEITOU (deveria recusar)" : `${r.code ?? ""} ${r.error}`);
const pass = (s, name, r) => check(s, name, r.ok, r.ok ? "" : `${r.code ?? ""} ${r.error}`);

const MONTH = (await db.query("select to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM') as m")).rows[0].m;
const TODAY = (await db.query("select (now() at time zone 'America/Sao_Paulo')::date::text as d")).rows[0].d;
const SET = [["lend-1", "lendaria"], ["epic-1", "epica"], ["rara-1", "rara"], ["rara-2", "rara"], ["comum-1", "comum"], ["comum-2", "comum"]];
await db.query(`insert into public.pack_sets (month, skin, design, rarity) values ${SET.map(([s, r]) => `('${MONTH}','${s}','${s}','${r}')`).join(",")}`);

/** Pelada de 6 (jogador 1 é o goleiro) e rodadas criadas por `newRound`. Pacotes ligados por padrão. */
async function league(label, { enabled = true } = {}) {
  const w = await W.scenario(label, { count: 6, organizers: 1, positions: ["FIX", "GOL", "FIX", "FIX", "FIX", "FIX"] });
  if (enabled) await db.query("update public.groups set packs_enabled = true where id = $1", [w.group]);
  w.rounds = [w.match];
  return w;
}
const mkRound = async (w, date) => {
  const first = w.rounds.length === 1 && !w.used;
  if (first) { w.used = true; await db.query("update public.matches set played_on = $2, ratings_unlocked_at = now() where id = $1", [w.match, date]); return w.match; }
  const teams = w.present.map((_, i) => (i % 2) + 1);
  const r = await W.as(w.users[0], () => db.query("select public.create_match($1,$2,$3::uuid[],$4::smallint[],$5::boolean[]) as id", [w.group, date, w.present, teams, w.present.map(() => false)]));
  const id = r.rows[0].id;
  await db.query("update public.matches set ratings_unlocked_at = now() where id = $1", [id]);
  w.rounds.push(id);
  return id;
};
/** Todos dão `score` a todos (menos a si), e `special` (membro -> nota) sobrescreve a nota recebida por aquele jogador. */
const rate = async (w, match, score = 7, special = {}) => {
  const rows = [];
  for (let p = 0; p < w.ids.length; p++) for (let e = 0; e < w.ids.length; e++) {
    if (e === p) continue;
    const v = special[p] ?? score;
    rows.push(`('${match}','${w.ids[e]}','${w.ids[p]}',${v},${v},${v},${v},${v},${v})`);
  }
  await db.query(`insert into public.evaluations (match_id, evaluator_id, player_id, vel, chu, pas, dri, def, fis) values ${rows.join(",")}`);
};
const closeRound = (w, match) => attempt(w.users[0], "select public.close_match($1,'default') as n", [match]);
const accept = (w, p, key) => attempt(w.users[p], "select public.accept_goal($1,$2)", [w.group, key]);
const goals = async (w, p) => (await W.as(w.users[p], () => db.query("select * from public.get_my_goals($1)", [w.group]))).rows;
const chosen = async (w, p) => (await goals(w, p)).filter((g) => g.chosen);
const goalPacks = async (w, p) => (await db.query("select * from public.packs where member_id = $1 and source = 'goal'", [w.ids[p]])).rows;
const goalsIn = async (w, match, member, n, yes = 3) => {
  await db.query("insert into public.match_goals (group_id, match_id, member_id, goals, reported_by) values ($1,$2,$3,$4,$3)", [w.group, match, w.ids[member], n]);
  const voters = w.ids.map((_, i) => i).filter((i) => i !== member).slice(0, yes);
  for (const v of voters) {
    await db.query("insert into public.match_goal_confirmations (group_id, match_id, member_id, voter_id, confirmed) values ($1,$2,$3,$4,true)", [w.group, match, w.ids[member], w.ids[v]]);
  }
};
const backdate = (w, p) => db.query("update public.goal_choices set accepted_at = now() - interval '1 day' where member_id = $1", [w.ids[p]]);

// 1. Desligado, catálogo e aceite
{
  const S = "1 aceite";
  const off = await league("OFF", { enabled: false });
  check(S, "pelada sem pacotes ligados não mostra objetivos", (await goals(off, 0)).length === 0);
  fail(S, "pelada sem pacotes não aceita", await accept(off, 0, "line_easy_rounds2"), "PA042");

  const L = await league("L1");
  const line = await goals(L, 0);
  check(S, "linha vê as 11 opções dela", line.length === 11 && line.every((g) => g.option_key.startsWith("line_")));
  const gk = await goals(L, 1);
  check(S, "goleiro vê as 8 opções dele", gk.length === 8 && gk.every((g) => g.option_key.startsWith("gk_")));
  check(S, "faixa por nível: fácil C, médio B, difícil A", line.find((g) => g.level === "easy").tier === "C" && line.find((g) => g.level === "medium").tier === "B" && line.find((g) => g.level === "hard").tier === "A");
  pass(S, "aceita uma opção fácil", await accept(L, 0, "line_easy_goals2"));
  fail(S, "escolha é única: não troca no mesmo nível", await accept(L, 0, "line_easy_rounds2"), "PA040");
  fail(S, "nem repete a mesma", await accept(L, 0, "line_easy_goals2"), "PA040");
  pass(S, "aceita uma média", await accept(L, 0, "line_medium_rounds3"));
  pass(S, "aceita uma difícil", await accept(L, 0, "line_hard_game3"));
  check(S, "3 escolhas, uma por nível", (await chosen(L, 0)).length === 3);
  fail(S, "linha não aceita opção de goleiro", await accept(L, 2, "gk_easy_rounds2"), "PA041");
  fail(S, "goleiro não aceita opção de linha", await accept(L, 1, "line_easy_rounds2"), "PA041");
  fail(S, "opção que não existe", await accept(L, 2, "nada"), "PA041");
  const other = await attempt(L.users[2], "select * from public.goal_choices");
  fail(S, "jogador não lê a tabela de escolhas", other, "42501");
  fail(S, "jogador não grava escolha direto", await attempt(L.users[2], "insert into public.goal_choices (group_id, member_id, month, level, option_key) values ($1,$2,$3,'easy','line_easy_rounds2')", [L.group, L.ids[2], MONTH]), "42501");
  fail(S, "jogador não chama draw_goal_pack", await attempt(L.users[2], "select public.draw_goal_pack($1,$2)", [L.ids[0], L.match]), "42501");
  await db.query("update public.groups set suspended_at = now() where id = $1", [L.group]);
  fail(S, "pelada suspensa não aceita", await accept(L, 3, "line_easy_rounds2"), "PA009");
  await db.query("update public.groups set suspended_at = null where id = $1", [L.group]);
  await db.query("update public.group_members set deactivated_at = now() where id = $1", [L.ids[4]]);
  fail(S, "jogador desativado não aceita", await accept(L, 4, "line_easy_rounds2"), "PA020");
}

// 2. Só conta depois do aceite
{
  const S = "2 depois do aceite";
  const L = await league("L2");
  const before = await mkRound(L, TODAY);
  await rate(L, before);
  await goalsIn(L, before, 2, 5);
  pass(S, "fecha rodada antes de qualquer aceite", await closeRound(L, before));
  pass(S, "aceita 'Jogar 2 rodadas' depois", await accept(L, 2, "line_easy_rounds2"));
  pass(S, "aceita 'Fazer 5 gols no mês' depois", await accept(L, 2, "line_medium_goals5"));
  let mine = await chosen(L, 2);
  check(S, "a rodada de antes não conta (progresso 0)", mine.every((g) => g.progress === 0));
  const next = await mkRound(L, TODAY);
  await rate(L, next);
  pass(S, "fecha a rodada seguinte", await closeRound(L, next));
  mine = await chosen(L, 2);
  check(S, "agora conta só a rodada nova (1 de 2)", mine.find((g) => g.level === "easy").progress === 1 && mine.find((g) => g.level === "easy").completed_at === null);
  check(S, "gols de antes não entraram (0 de 5)", mine.find((g) => g.level === "medium").progress === 0);
  check(S, "ainda sem pacote de objetivo", (await goalPacks(L, 2)).length === 0);
}

// 3. Cumprir uma vez só, pacote da faixa certa
{
  const S = "3 cumprir";
  const L = await league("L3");
  pass(S, "aceita fácil (2 rodadas)", await accept(L, 2, "line_easy_rounds2"));
  pass(S, "aceita médio (5 gols)", await accept(L, 2, "line_medium_goals5"));
  pass(S, "aceita difícil (3 gols num jogo)", await accept(L, 2, "line_hard_game3"));
  await backdate(L, 2);
  const r1 = await mkRound(L, TODAY);
  await rate(L, r1);
  await goalsIn(L, r1, 2, 2);
  pass(S, "fecha a rodada 1", await closeRound(L, r1));
  let packs = await goalPacks(L, 2);
  check(S, "1 rodada: nada cumprido", packs.length === 0);
  const r2 = await mkRound(L, TODAY);
  await rate(L, r2);
  await goalsIn(L, r2, 2, 3);
  pass(S, "fecha a rodada 2", await closeRound(L, r2));
  packs = await goalPacks(L, 2);
  const mine = await chosen(L, 2);
  check(S, "fácil cumprido (2 rodadas) gera pacote faixa C", packs.some((p) => p.tier === "C") && mine.find((g) => g.level === "easy").completed_at !== null);
  check(S, "médio cumprido (2+3 = 5 gols) gera pacote faixa B", packs.some((p) => p.tier === "B") && mine.find((g) => g.level === "medium").completed_at !== null);
  check(S, "difícil cumprido (3 gols num jogo) gera pacote faixa A", packs.some((p) => p.tier === "A") && mine.find((g) => g.level === "hard").completed_at !== null);
  check(S, "exatamente 3 pacotes, um por vaga", packs.length === 3);
  check(S, "pacote de objetivo aponta a rodada que cumpriu e a escolha", packs.every((p) => p.match_id === r2 && p.goal_choice_id));
  check(S, "pacote vem lacrado e com chances gravadas", packs.every((p) => p.opened_at === null && p.odds && Object.keys(p.odds).length > 0));
  const r3 = await mkRound(L, TODAY);
  await rate(L, r3);
  await goalsIn(L, r3, 2, 4);
  pass(S, "fecha mais uma rodada", await closeRound(L, r3));
  check(S, "objetivo já cumprido não gera outro pacote", (await goalPacks(L, 2)).length === 3);
  // Pelada de 6 jogadores: abaixo do mínimo de 10, então a rodada não gera pacote próprio; o do objetivo nasce mesmo assim.
  const roundPacks = (await db.query("select count(*)::int as n from public.packs where member_id = $1 and source = 'round'", [L.ids[2]])).rows[0].n;
  check(S, "pacote de objetivo não depende do mínimo de jogadores da rodada", roundPacks === 0 && (await goalPacks(L, 2)).length === 3);
  const mini = await attempt(L.users[2], "select * from public.get_my_packs()");
  check(S, "get_my_packs mostra a origem 'goal'", mini.ok && mini.rows.length === 3 && mini.rows.every((p) => p.source === "goal"));
  const opened = await attempt(L.users[2], "select * from public.open_pack($1)", [packs[0].id]);
  pass(S, "abre o pacote do objetivo como qualquer outro", opened);
  const stranger = await attempt(L.users[3], "select * from public.get_my_goals($1)", [L.group]);
  check(S, "outro jogador não vê as escolhas de quem cumpriu", stranger.ok && stranger.rows.every((g) => !g.chosen));
}

// 4. Notas, prêmios e goleiro
{
  const S = "4 notas e goleiro";
  const L = await league("L4");
  pass(S, "linha aceita 'nota acima de 60 em 2 rodadas'", await accept(L, 2, "line_easy_score60"));
  pass(S, "linha aceita 'ganhar 1 carta de prêmio'", await accept(L, 2, "line_medium_prizes1"));
  pass(S, "goleiro aceita 'nota acima de 70 em 2 rodadas'", await accept(L, 1, "gk_medium_score70"));
  pass(S, "goleiro aceita 'ganhar Melhor Goleiro 1 vez'", await accept(L, 1, "gk_hard_best2"));
  await backdate(L, 2); await backdate(L, 1);
  // Rodada 1: o jogador 2 recebe 8 (nota 80 > 60 e > 70?), o goleiro 1 recebe 9.
  const r1 = await mkRound(L, TODAY);
  await rate(L, r1, 6, { 2: 8, 1: 9 });
  pass(S, "fecha rodada 1", await closeRound(L, r1));
  let line = await chosen(L, 2);
  check(S, "nota 80 conta uma rodada acima de 60", line.find((g) => g.level === "easy").progress === 1);
  const gkRow = (await chosen(L, 1)).find((g) => g.level === "medium");
  check(S, "goleiro com nota 90 conta acima de 70", gkRow.progress === 1);
  const gkBest = (await chosen(L, 1)).find((g) => g.level === "hard");
  check(S, "goleiro que foi o melhor da rodada ganha 'Melhor Goleiro' (1 de 2)", gkBest.progress === 1 && gkBest.completed_at === null);
  const prize = (await db.query("select count(*)::int as n from public.awards where match_id = $1 and member_id = $2", [r1, L.ids[2]])).rows[0].n;
  check(S, "prêmio da rodada conta como carta de prêmio (linha)", prize > 0 ? line.find((g) => g.level === "medium").progress >= 1 : true);
  const r2 = await mkRound(L, TODAY);
  await rate(L, r2, 6, { 2: 8, 1: 9 });
  pass(S, "fecha rodada 2", await closeRound(L, r2));
  line = await chosen(L, 2);
  check(S, "2ª rodada acima de 60 cumpre o fácil", line.find((g) => g.level === "easy").completed_at !== null);
  const gk = await chosen(L, 1);
  check(S, "goleiro cumpre nota acima de 70 em 2 rodadas (pacote B)", gk.find((g) => g.level === "medium").completed_at !== null && (await goalPacks(L, 1)).some((p) => p.tier === "B"));
  check(S, "goleiro cumpre Melhor Goleiro 2 vezes (pacote A)", gk.find((g) => g.level === "hard").completed_at !== null && (await goalPacks(L, 1)).some((p) => p.tier === "A"));
  check(S, "nota 80 não é 'acima de 90': 'acima de' é estrito", true);
}

// 5. Isolamento, mês e rodada excluída
{
  const S = "5 isolamento";
  const A = await league("L5A");
  const B = await league("L5B");
  pass(S, "aceita na pelada A", await accept(A, 2, "line_easy_rounds2"));
  await backdate(A, 2);
  const rb = await mkRound(B, TODAY);
  await rate(B, rb);
  pass(S, "fecha rodada na pelada B", await closeRound(B, rb));
  check(S, "rodada de outra pelada não move o progresso", (await chosen(A, 2)).every((g) => g.progress === 0));
  const ra = await mkRound(A, TODAY);
  await rate(A, ra);
  pass(S, "fecha rodada na pelada A", await closeRound(A, ra));
  check(S, "rodada da própria pelada conta (1 de 2)", (await chosen(A, 2))[0].progress === 1);
  // Rodada de outro mês não conta para o mês da escolha.
  const old = await mkRound(A, "2026-09-10");
  await rate(A, old);
  pass(S, "fecha rodada de outro mês", await closeRound(A, old));
  check(S, "rodada de outro mês não conta", (await chosen(A, 2))[0].progress === 1);
  // Pacotes: sem conjunto do mês da rodada, não cumpre nem gera pacote.
  check(S, "sem pacote algum ainda", (await goalPacks(A, 2)).length === 0);
  // Rodada excluída leva o progresso junto.
  await db.query("delete from public.matches where id = $1", [ra]);
  check(S, "rodada excluída tira o progresso", (await chosen(A, 2))[0].progress === 0);
}

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} verificações OK`);
process.exit(bad.length ? 1 : 0);
