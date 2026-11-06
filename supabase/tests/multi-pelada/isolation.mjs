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
  for (const [who, , other, label] of [[A.users[1], A, B, "A"], [B.users[1], B, A, "B"]]) {
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

// 8. Exclusão de rodada: organizador só apaga rodada aberta
{
  const S = "8 exclusão";
  const ids = (await db.query("select id from public.matches where group_id=$1 and status='open' order by played_on limit 2", [A.group])).rows.map((r) => r.id);
  const [open, closed] = ids;
  await db.query("update public.matches set status='closed' where id=$1", [closed]);
  check(S, "há rodada aberta e fechada para testar", Boolean(open) && Boolean(closed));
  const del = async (id) => (await db.query("with d as (delete from public.matches where id=$1 returning 1) select count(*)::int c from d", [id])).rows[0].c;
  // O teste roda como o papel do jogador pelas helpers: usa attempt + contagem depois.
  await attempt(A.users[0], "delete from public.matches where id = $1", [closed]);
  check(S, "organizador não apaga rodada fechada", (await db.query("select 1 from public.matches where id=$1", [closed])).rows.length === 1);
  await attempt(A.users[0], "delete from public.matches where id = $1", [open]);
  check(S, "organizador apaga rodada aberta", (await db.query("select 1 from public.matches where id=$1", [open])).rows.length === 0);
  await attempt(B.users[0], "delete from public.matches where id = $1", [closed]);
  check(S, "organizador de outra pelada não apaga", (await db.query("select 1 from public.matches where id=$1", [closed])).rows.length === 1);
  check(S, "chave secreta (dono do banco) apaga a fechada", (await del(closed)) === 1);
}

// 9. Comunidade: vitrine, perfil público e feed (tudo desligado por padrão)
{
  const S = "9 comunidade";
  const aw = async (member, group, match, kind) => (await db.query("insert into public.awards (group_id, match_id, member_id, kind, position, ovr, votes, score, attributes) values ($1,$2,$3,$4,'ALA',80,3,8.5,'{}'::jsonb) returning id", [group, match, member, kind])).rows[0].id;
  const aMatch = (await db.query("select id from public.matches where group_id=$1 limit 1", [A.group])).rows[0].id;
  // Peladas e jogadores nascem ligados (migrations 20261107130000 e 20261107140000).
  check(S, "pelada nova nasce ligada", (await db.query("select count(*)::int c from public.groups where listed_at is null")).rows[0].c === 0);
  check(S, "jogador novo nasce ligado", (await db.query("select count(*)::int c from public.group_members where public_profile_at is null")).rows[0].c === 0);
  // Daqui em diante o teste parte do cenário "desligado" (por SQL, como o admin faria) para provar os filtros.
  await db.query("update public.groups set listed_at = null");
  await db.query("update public.group_members set public_profile_at = null");
  const award = await aw(A.ids[1], A.group, aMatch, "craque");
  const countOf = count;

  check(S, "pelada desligada não aparece na vitrine", (await countOf(B.users[1], "select * from public.get_listed_groups()")) === 0);
  check(S, "vitrine de pelada desligada vem vazia", (await countOf(B.users[1], "select * from public.get_group_showcase($1)", [A.group])) === 0);
  fail(S, "não existe mais função para desligar a pelada", await attempt(A.users[0], "select public.set_group_listed($1, false)", [A.group]), "42883");
  fail(S, "não existe mais função para desligar o perfil", await attempt(A.users[1], "select public.set_public_profile($1, false)", [A.ids[1]]), "42883");
  await db.query("update public.groups set listed_at = now() where id = $1", [A.group]);
  check(S, "pelada ligada aparece para outra pelada", (await countOf(B.users[1], "select * from public.get_listed_groups()")) === 1);

  await db.query("insert into public.group_showcase (group_id, players) values ($1, $2::jsonb)", [A.group, JSON.stringify([{ id: A.ids[1], nickname: "x" }, { id: A.ids[2], nickname: "y" }])]);
  const shown = async (who) => (await attempt(who, "select jsonb_array_length(players)::int n from public.get_group_showcase($1)", [A.group])).rows?.[0]?.n;
  check(S, "ranking público vem sem ninguém antes do aceite", (await shown(B.users[1])) === 0);
  await db.query("update public.group_members set public_profile_at = now() where id = $1", [A.ids[1]]);
  check(S, "só quem aceitou entra no ranking público", (await shown(B.users[1])) === 1);

  check(S, "galeria vem só de quem aceitou", (await countOf(B.users[1], "select * from public.get_public_awards($1)", [A.ids[1]])) === 1);
  check(S, "galeria de quem não aceitou vem vazia", (await countOf(B.users[1], "select * from public.get_public_awards($1)", [A.ids[2]])) === 0);

  const award2 = await aw(A.ids[2], A.group, aMatch, "gol");
  fail(S, "não publica carta de outra pessoa", await attempt(A.users[3], "select public.publish_award($1)", [award]), "42501");
  fail(S, "sem aceite não publica", await attempt(A.users[2], "select public.publish_award($1)", [award2]), "42501");
  pass(S, "dono da carta publica", await attempt(A.users[1], "select public.publish_award($1)", [award]));
  pass(S, "publicar de novo não duplica", await attempt(A.users[1], "select public.publish_award($1)", [award]));
  check(S, "feed mostra 1 post para outra pelada", (await countOf(B.users[1], "select * from public.get_feed(20, null)")) === 1);
  const post = (await db.query("select id from public.feed_posts limit 1")).rows[0].id;
  pass(S, "outra pelada reage", await attempt(B.users[1], "select public.set_reaction($1, 'fire')", [post]));
  fail(S, "emoji fora da lista é recusado", await attempt(B.users[1], "select public.set_reaction($1, 'poop')", [post]), "23514");
  check(S, "reação contada", (await db.query("select count(*)::int c from public.feed_reactions where post_id=$1", [post])).rows[0].c === 1);
  fail(S, "outra pessoa não remove o post", await attempt(B.users[1], "select public.unpublish_post($1)", [post]), "");
  check(S, "post continua lá", (await db.query("select 1 from public.feed_posts where id=$1", [post])).rows.length === 1);

  fail(S, "ninguém lê feed_posts direto", await attempt(B.users[1], "select * from public.feed_posts"), "42501");
  fail(S, "ninguém lê feed_reactions direto", await attempt(B.users[1], "select * from public.feed_reactions"), "42501");
  fail(S, "ninguém lê group_showcase direto", await attempt(B.users[1], "select * from public.group_showcase"), "42501");
  fail(S, "ninguém grava feed_posts direto", await attempt(B.users[1], "insert into public.feed_posts (award_id, group_id, member_id, author_id) values ($1,$2,$3,$4)", [award2, A.group, A.ids[2], B.users[1]]), "42501");
  fail(S, "jogador não liga listed_at direto", await attempt(A.users[0], "update public.groups set listed_at = null where id=$1", [A.group]), "42501");
  fail(S, "jogador não liga public_profile_at direto", await attempt(A.users[2], "update public.group_members set public_profile_at = now() where id=$1", [A.ids[2]]), "42501");

  // Isolamento continua: de fora ainda não se lê nada privado de A.
  check(S, "de fora continua sem ver o elenco de A", (await countOf(B.users[1], "select 1 from public.group_members where group_id=$1", [A.group])) === 0);
  check(S, "de fora continua sem ver rodadas de A", (await countOf(B.users[1], "select 1 from public.matches where group_id=$1", [A.group])) === 0);

  // Suspensa some da comunidade; reativa volta.
  await db.query("update public.groups set suspended_at = now() where id=$1", [A.group]);
  check(S, "pelada suspensa some da vitrine", (await countOf(B.users[1], "select * from public.get_listed_groups()")) === 0);
  check(S, "pelada suspensa some do feed", (await countOf(B.users[1], "select * from public.get_feed(20, null)")) === 0);
  await db.query("update public.groups set suspended_at = null where id=$1", [A.group]);
  // Jogador desliga: some do feed e do ranking.
  await db.query("update public.group_members set public_profile_at = null where id = $1", [A.ids[1]]);
  check(S, "quem desligou some do feed", (await countOf(B.users[1], "select * from public.get_feed(20, null)")) === 0);
  check(S, "quem desligou some da galeria", (await countOf(B.users[1], "select * from public.get_public_awards($1)", [A.ids[1]])) === 0);
}

// 10. Corrigir presença e times da rodada aberta (antes das notas abrirem)
{
  const S = "10 lista";
  const call = (who, match, ids, teams, res) => attempt(who, "select public.update_match_roster($1,$2::uuid[],$3::smallint[],$4::boolean[])", [match, ids, teams, res]);
  const mid = (await attempt(A.users[0], "select public.create_match($1,'2027-02-01',$2::uuid[],$3::smallint[],$4::boolean[]) as id", [A.group, A.ids.slice(0, 4), [1, 2, 1, 2], [false, false, false, false]])).rows[0].id;
  const present = async () => (await db.query("select member_id, team, reserve from public.match_attendance where match_id=$1 order by member_id", [mid])).rows;

  fail(S, "jogador comum não edita a lista", await call(A.users[5], mid, A.ids.slice(0, 5), [1, 2, 1, 2, 1], [false, false, false, false, false]), "42501");
  fail(S, "organizador de outra pelada não edita", await call(B.users[0], mid, A.ids.slice(0, 5), [1, 2, 1, 2, 1], [false, false, false, false, false]), "42501");
  pass(S, "organizador adiciona um jogador e muda os times", await call(A.users[0], mid, A.ids.slice(0, 5), [2, 1, 1, 2, 1], [false, false, false, false, true]));
  const rows = await present();
  check(S, "agora são 5 presentes", rows.length === 5);
  check(S, "o 1º mudou para o time Preto", rows.find((r) => r.member_id === A.ids[0])?.team === 2);
  check(S, "o 5º entrou como reserva", rows.find((r) => r.member_id === A.ids[4])?.reserve === true);
  pass(S, "organizador tira dois jogadores", await call(A.users[0], mid, [A.ids[0], A.ids[1], A.ids[2]], [1, 2, 1], [false, false, false]));
  check(S, "sobraram 3", (await present()).length === 3);
  fail(S, "menos de 2 presentes é recusado", await call(A.users[0], mid, [A.ids[0]], [1], [false]), "P0001");
  fail(S, "time inválido é recusado", await call(A.users[0], mid, [A.ids[0], A.ids[1]], [1, 3], [false, false]), "P0001");
  fail(S, "jogador de fora da pelada é recusado", await call(A.users[0], mid, [A.ids[0], B.ids[1]], [1, 2], [false, false]), "P0001");
  fail(S, "jogador repetido é recusado", await call(A.users[0], mid, [A.ids[0], A.ids[0]], [1, 2], [false, false]), "P0001");
  // Gols de quem sai somem; conferência recomeça.
  await db.query("insert into public.match_goals (group_id, match_id, member_id, goals, reported_by) values ($1,$2,$3,2,$3)", [A.group, mid, A.ids[2]]);
  await db.query("update public.match_attendance set goals_checked_at = now() where match_id=$1", [mid]);
  pass(S, "tira quem informou gols", await call(A.users[0], mid, [A.ids[0], A.ids[1]], [1, 2], [false, false]));
  check(S, "os gols dele saíram junto", (await db.query("select 1 from public.match_goals where match_id=$1", [mid])).rows.length === 0);
  check(S, "a conferência dos gols recomeçou", (await db.query("select count(*)::int c from public.match_attendance where match_id=$1 and goals_checked_at is not null", [mid])).rows[0].c === 0);
  // Notas abertas travam a lista.
  await db.query("update public.matches set ratings_unlocked_at = now() where id=$1", [mid]);
  fail(S, "com as notas abertas a lista fica travada (PA012)", await call(A.users[0], mid, [A.ids[0], A.ids[1], A.ids[2]], [1, 2, 1], [false, false, false]), "PA012");
  // Alguém com nota não sai (mesmo se a trava das notas fosse driblada).
  await db.query("update public.matches set ratings_unlocked_at = null where id=$1", [mid]);
  await db.query("insert into public.match_goals (group_id, match_id, member_id, goals, reported_by) select $1, $2, member_id, 0, member_id from public.match_attendance where match_id=$2", [A.group, mid]);
  await db.query("update public.match_attendance set goals_checked_at = now() where match_id=$1", [mid]);
  await db.query("insert into public.evaluations (match_id, evaluator_id, player_id, vel, chu, pas, dri, def, fis) values ($1,$2,$3,7,7,7,7,7,7)", [mid, A.ids[0], A.ids[1]]);
  fail(S, "quem já tem nota não sai (PA012)", await call(A.users[0], mid, [A.ids[0]], [1], [false]), "PA012");
  // Rodada fechada trava.
  await db.query("update public.matches set status='closed' where id=$1", [mid]);
  fail(S, "rodada fechada não aceita edição (PA012)", await call(A.users[0], mid, [A.ids[0], A.ids[1]], [1, 2], [false, false]), "PA012");
}

// 11. Pedido de exclusão da própria conta
{
  const S = "11 exclusão de conta";
  check(S, "sem pedido, a consulta volta vazia", (await attempt(A.users[4], "select public.get_my_deletion_request() as r")).rows[0].r === null);
  pass(S, "jogador pede a exclusão", await attempt(A.users[4], "select public.request_account_deletion()"));
  pass(S, "pedir de novo não duplica", await attempt(A.users[4], "select public.request_account_deletion()"));
  check(S, "um pedido só", (await db.query("select count(*)::int c from public.account_deletion_requests where user_id=$1", [A.users[4]])).rows[0].c === 1);
  check(S, "ele vê a data do próprio pedido", (await attempt(A.users[4], "select public.get_my_deletion_request() as r")).rows[0].r !== null);
  check(S, "outro jogador não vê o pedido dele", (await attempt(A.users[5], "select public.get_my_deletion_request() as r")).rows[0].r === null);
  fail(S, "ninguém lê a tabela direto", await attempt(A.users[5], "select * from public.account_deletion_requests"), "42501");
  fail(S, "ninguém grava a tabela direto", await attempt(A.users[5], "insert into public.account_deletion_requests (user_id) values ($1)", [A.users[6]]), "42501");
  fail(S, "ninguém apaga o pedido dos outros direto", await attempt(A.users[5], "delete from public.account_deletion_requests"), "42501");
  pass(S, "jogador cancela o pedido", await attempt(A.users[4], "select public.cancel_account_deletion()"));
  check(S, "pedido sumiu", (await db.query("select count(*)::int c from public.account_deletion_requests where user_id=$1", [A.users[4]])).rows[0].c === 0);
  await attempt(A.users[4], "select public.request_account_deletion()");
  await db.query("delete from auth.users where id=$1", [A.users[4]]);
  check(S, "apagar a conta leva o pedido junto", (await db.query("select count(*)::int c from public.account_deletion_requests")).rows[0].c === 0);
}

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} verificações passaram`);
if (bad.length) { console.log("FALHARAM:\n" + bad.map((b) => `- [${b.scenario}] ${b.name} ${b.detail}`).join("\n")); process.exit(1); }
