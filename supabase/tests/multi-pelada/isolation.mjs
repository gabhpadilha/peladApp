// Isolamento entre peladas e regras novas de várias peladas (nome único, renomear, suspensão, termos).
// Roda no PGlite com todas as migrations; não toca no banco real. Uso: REPO=$(pwd) node supabase/tests/multi-pelada/isolation.mjs
import { world, check, results } from "../goals-flow/lib.mjs";
const W = await world();
const { db, as, attempt } = W;
const fail = (s, name, r, code) => check(s, name, !r.ok && (!code || r.code === code), r.ok ? "ACEITOU (deveria recusar)" : `${r.code ?? ""} ${r.error}`);
const pass = (s, name, r) => check(s, name, r.ok, r.ok ? "" : `${r.code ?? ""} ${r.error}`);
const count = async (user, sql, params = []) => (await as(user, () => db.query(sql, params))).rows.length;

const A = await W.scenario("A", { count: 8, organizers: 2 });
const B = await W.scenario("B", { count: 8, organizers: 2 });
await db.query("insert into public.card_skin_purchases (member_id, group_id, skin, price) select $1, $2, 'safira', 250", [B.ids[1], B.group]).catch(() => {});

// 1. Leitura: quem é da pelada A não enxerga nada da B (e vice-versa)
{
  const S = "1 leitura isolada";
  for (const [who, mine, other, label] of [[A.users[1], A, B, "A"], [B.users[1], B, A, "B"]]) {
    check(S, `${label}: só vê a própria pelada`, (await count(who, "select 1 from public.groups")) === 1);
    check(S, `${label}: não vê elenco da outra`, (await count(who, "select 1 from public.group_members where group_id = $1", [other.group])) === 0);
    check(S, `${label}: não vê rodadas da outra`, (await count(who, "select 1 from public.matches where group_id = $1", [other.group])) === 0);
    check(S, `${label}: não vê presenças da outra`, (await count(who, "select 1 from public.match_attendance where group_id = $1", [other.group])) === 0);
    check(S, `${label}: não vê cartas da outra`, (await count(who, "select 1 from public.awards where group_id = $1", [other.group])) === 0);
    check(S, `${label}: não vê compras da outra`, (await count(who, "select 1 from public.card_skin_purchases where group_id = $1", [other.group])) === 0);
    check(S, `${label}: não lê perfis da outra`, (await count(who, "select 1 from public.profiles where id = any($1::uuid[])", [other.users])) === 0);
    check(S, `${label}: RPC de notas da outra devolve vazio ou recusa`, await (async () => { const r = await attempt(who, "select * from public.get_group_scores($1)", [other.group]); return !r.ok || r.rows.length === 0; })());
  }
}

// 2. Escrita: nada da outra pelada
{
  const S = "2 escrita isolada";
  fail(S, "A cria rodada na B (create_match)", await attempt(A.users[0], "select public.create_match($1,'2026-11-20',$2::uuid[],$3::smallint[],$4::boolean[])", [B.group, B.ids.slice(0, 4), [1, 2, 1, 2], [false, false, false, false]]));
  fail(S, "A fecha rodada da B", await attempt(A.users[0], "select public.close_match($1,'default')", [B.match]));
  const del = await attempt(A.users[0], "delete from public.matches where id = $1 returning id", [B.match]);
  check(S, "A apaga rodada da B: 0 linhas", !del.ok || del.rows.length === 0, del.ok ? "" : del.error);
  fail(S, "A avalia jogador da B", await attempt(A.users[1], "insert into public.evaluations (match_id, evaluator_id, player_id, vel, chu, pas, dri, def, fis) values ($1,$2,$3,7,7,7,7,7,7)", [B.match, A.ids[1], B.ids[2]]));
  const up = await attempt(A.users[0], "update public.group_members set nickname='X' where group_id = $1 returning id", [B.group]);
  check(S, "A edita jogador da B: 0 linhas", !up.ok || up.rows.length === 0);
  fail(S, "A se põe como organizador na B", await attempt(A.users[0], "update public.group_members set role='organizer' where id = $1", [B.ids[3]]));
  fail(S, "A renomeia a B (rename_group)", await attempt(A.users[0], "select public.rename_group($1,'Outro nome')", [B.group]), "42501");
  fail(S, "A desativa jogador da B", await attempt(A.users[0], "select public.set_member_active($1, false)", [B.ids[2]]));
}

// 3. groups: ninguém altera slug, suspensão ou nome direto
{
  const S = "3 groups protegida";
  fail(S, "dono altera o próprio slug direto", await attempt(A.users[0], "update public.groups set slug='hack' where id=$1", [A.group]), "42501");
  fail(S, "dono tira a própria suspensão direto", await attempt(A.users[0], "update public.groups set suspended_at=null where id=$1", [A.group]), "42501");
  fail(S, "dono renomeia direto (sem a função)", await attempt(A.users[0], "update public.groups set name='Livre' where id=$1", [A.group]), "42501");
  fail(S, "organizador (não dono) renomeia pela função", await attempt(A.users[1], "select public.rename_group($1,'Nome novo')", [A.group]), "42501");
}

// 4. Nome único
{
  const S = "4 nome único";
  pass(S, "dono renomeia para nome livre", await attempt(A.users[0], "select public.rename_group($1,'  Pelada   do Zé ')", [A.group]));
  check(S, "nome é gravado limpo", (await db.query("select name from public.groups where id=$1", [A.group])).rows[0].name === "Pelada do Zé");
  for (const variant of ["pelada do zé", "PELADA DO ZE", "Pelada-do-Zé!", "peladadoze"]) {
    fail(S, `B não pega "${variant}"`, await attempt(B.users[0], "select public.rename_group($1,$2)", [B.group, variant]), "PA010");
  }
  pass(S, "renomear para o próprio nome (outra grafia) é permitido", await attempt(A.users[0], "select public.rename_group($1,'PELADA DO ZÉ')", [A.group]));
  fail(S, "nome curto demais", await attempt(A.users[0], "select public.rename_group($1,'a')", [A.group]), "23514");
  fail(S, "nome só com símbolos", await attempt(A.users[0], "select public.rename_group($1,'!!!')", [A.group]));
  const u = await attempt(B.users[0], "select public.create_group('pelada do ze','Z','FIX')");
  fail(S, "criar pelada nova com nome repetido (create_group)", u, "23505");
}

// 5. Suspensão
{
  const S = "5 suspensão";
  await db.query("update public.groups set suspended_at = now() where id = $1", [A.group]);
  fail(S, "pelada suspensa não cria rodada (PA009)", await attempt(A.users[0], "select public.create_match($1,'2026-11-21',$2::uuid[],$3::smallint[],$4::boolean[])", [A.group, A.ids.slice(0, 4), [1, 2, 1, 2], [false, false, false, false]]), "PA009");
  check(S, "continua vendo o elenco", (await count(A.users[2], "select 1 from public.group_members where group_id=$1", [A.group])) === 8);
  check(S, "continua vendo as rodadas", (await count(A.users[2], "select 1 from public.matches where group_id=$1", [A.group])) === 1);
  pass(S, "a rodada aberta ainda pode ser fechada (ou recusa só pela regra dos 5 envios, não pela suspensão)", await (async () => { const r = await attempt(A.users[0], "select public.close_match($1,'default')", [A.match]); return r.ok || r.code === "PA005" ? { ok: true } : r; })());
  pass(S, "a outra pelada não é afetada", await attempt(B.users[0], "select public.create_match($1,'2026-11-22',$2::uuid[],$3::smallint[],$4::boolean[])", [B.group, B.ids.slice(0, 4), [1, 2, 1, 2], [false, false, false, false]]));
  await db.query("update public.groups set suspended_at = null where id = $1", [A.group]);
  pass(S, "reativada, cria rodada de novo", await attempt(A.users[0], "select public.create_match($1,'2026-11-23',$2::uuid[],$3::smallint[],$4::boolean[])", [A.group, A.ids.slice(0, 4), [1, 2, 1, 2], [false, false, false, false]]));
}

// 6. Perfil: admin da plataforma e termos
{
  const S = "6 perfil";
  fail(S, "jogador se torna admin da plataforma", await attempt(A.users[1], "update public.profiles set is_platform_admin = true where id = $1", [A.users[1]]), "42501");
  fail(S, "jogador marca o aceite direto", await attempt(A.users[1], "update public.profiles set terms_accepted_at = now() where id = $1", [A.users[1]]), "42501");
  pass(S, "aceite por accept_terms", await attempt(A.users[1], "select public.accept_terms('2026-11')"));
  const p = (await db.query("select terms_accepted_at, terms_version, is_platform_admin from public.profiles where id=$1", [A.users[1]])).rows[0];
  check(S, "aceite gravado só para ele", p.terms_accepted_at !== null && p.terms_version === "2026-11" && p.is_platform_admin === false);
  const other = (await db.query("select count(*)::int c from public.profiles where id <> $1 and terms_accepted_at is not null", [A.users[1]])).rows[0].c;
  check(S, "ninguém mais foi marcado", other === 0, `${other} outros`);
}

// 7. Plano: limite de rodadas por semana e dados privados do admin
{
  const S = "7 plano";
  const mk = (g, ids, d) => ["select public.create_match($1,$2::date,$3::uuid[],$4::smallint[],$5::boolean[])", [g, d, ids.slice(0, 4), [1, 2, 1, 2], [false, false, false, false]]];
  await db.query("update public.groups set weekly_round_limit = 1 where id = $1", [B.group]);
  // 2026-12-07 é segunda; 2026-12-13 é domingo da mesma semana; 2026-12-14 é a segunda seguinte.
  pass(S, "1ª rodada da semana passa", await attempt(B.users[0], ...mk(B.group, B.ids, "2026-12-07")));
  fail(S, "2ª rodada na mesma semana (domingo) é recusada (PA011)", await attempt(B.users[0], ...mk(B.group, B.ids, "2026-12-13")), "PA011");
  pass(S, "semana seguinte passa", await attempt(B.users[0], ...mk(B.group, B.ids, "2026-12-14")));
  pass(S, "outra pelada sem limite não é afetada", await attempt(A.users[0], ...mk(A.group, A.ids, "2026-12-07")));
  pass(S, "outra pelada sem limite cria 2ª na semana", await attempt(A.users[0], ...mk(A.group, A.ids, "2026-12-08")));
  await db.query("insert into public.group_private (group_id, owner_contact, admin_notes) values ($1,'(41) 99999-0000','amigo do Zé')", [B.group]);
  fail(S, "jogador não lê contato e observações", await attempt(B.users[0], "select * from public.group_private"), "42501");
  fail(S, "jogador não grava em group_private", await attempt(B.users[0], "insert into public.group_private (group_id) values ($1)", [A.group]), "42501");
  fail(S, "jogador não muda o limite da pelada", await attempt(B.users[0], "update public.groups set weekly_round_limit = null where id = $1", [B.group]), "42501");
  fail(S, "jogador não muda o plano", await attempt(B.users[0], "update public.groups set plan = 'x' where id = $1", [B.group]), "42501");
  check(S, "jogador lê cidade e dia do jogo da própria pelada", (await count(B.users[2], "select city, play_weekday from public.groups where id=$1", [B.group])) === 1);
}

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} verificações passaram`);
if (bad.length) { console.log("FALHARAM:\n" + bad.map((b) => `- [${b.scenario}] ${b.name} ${b.detail}`).join("\n")); process.exit(1); }
