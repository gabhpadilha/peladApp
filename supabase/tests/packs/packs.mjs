// Pacotes de skins: faixas, sorteio lacrado, abertura, repetida, mínimo, interruptor e proteção contra azar.
// Roda no PGlite com todas as migrations; não toca no banco real. Uso: REPO=$(pwd) node supabase/tests/packs/packs.mjs
import { world, check, results } from "../goals-flow/lib.mjs";
const W = await world();
const { db, attempt } = W;
const fail = (s, name, r, code) => check(s, name, !r.ok && (!code || r.code === code), r.ok ? "ACEITOU (deveria recusar)" : `${r.code ?? ""} ${r.error}`);
const pass = (s, name, r) => check(s, name, r.ok, r.ok ? "" : `${r.code ?? ""} ${r.error}`);

// Conjunto de dezembro/2026 (12 designs: 1 lendária, 2 épicas, 4 raras, 5 comuns) e de um mês sem conjunto (janeiro/2027 não tem).
const SET = [
  ["lend-1", "lendaria"], ["epic-1", "epica"], ["epic-2", "epica"],
  ["rara-1", "rara"], ["rara-2", "rara"], ["rara-3", "rara"], ["rara-4", "rara"],
  ["comum-1", "comum"], ["comum-2", "comum"], ["comum-3", "comum"], ["comum-4", "comum"], ["comum-5", "comum"],
];
const addSet = (month) => db.query(`insert into public.pack_sets (month, skin, design, rarity) values ${SET.map(([skin, r]) => `('${month}','${skin}','${skin}','${r}')`).join(",")}`);
await addSet("2026-12");

/** Cria uma pelada de `count` jogadores, rodada em `date`, e dá nota a todos por todos (base fracionária = ranking sem empate). */
async function round(label, count, { date = "2026-12-10", base, enabled = true } = {}) {
  const w = await W.scenario(label, { count, organizers: 1, positions: Array(count).fill("FIX") });
  await db.query("update public.matches set played_on = $2, ratings_unlocked_at = now() where id = $1", [w.match, date]);
  if (enabled) await db.query("update public.groups set packs_enabled = true where id = $1", [w.group]);
  const scores = base ?? w.ids.map((_, p) => 3 + p * 0.3); // p maior = nota maior
  // Média de cada jogador = base: parte dos avaliadores dá o teto e o resto o piso, na proporção da fração (ranking sem empate acidental).
  const rows = [];
  for (let p = 0; p < count; p++) {
    const lo = Math.floor(scores[p]);
    const frac = scores[p] - lo;
    const others = [...Array(count).keys()].filter((e) => e !== p);
    const ceilCount = Math.round(frac * others.length);
    others.forEach((e, i) => {
      const v = Math.min(10, Math.max(1, i < ceilCount ? lo + 1 : lo));
      rows.push(`('${w.match}','${w.ids[e]}','${w.ids[p]}',${v},${v},${v},${v},${v},${v})`);
    });
  }
  await db.query(`insert into public.evaluations (match_id, evaluator_id, player_id, vel, chu, pas, dri, def, fis) values ${rows.join(",")}`);
  return w;
}
const closeRound = (w) => attempt(w.users[0], "select public.close_match($1,'default') as n", [w.match]);
const packsOf = async (w) => (await db.query("select p.*, gm.user_id from public.packs p join public.group_members gm on gm.id = p.member_id where p.match_id = $1 order by p.created_at", [w.match])).rows;

// 1. Interruptor e mínimo
{
  const S = "1 interruptor";
  const off = await round("OFF", 10, { enabled: false });
  pass(S, "fecha normalmente com pacotes desligados", await closeRound(off));
  check(S, "pelada desligada não gera pacote", (await packsOf(off)).length === 0);

  const small = await round("PEQ", 9);
  pass(S, "fecha rodada com 9 presentes", await closeRound(small));
  check(S, "abaixo do mínimo (10) não gera pacote", (await packsOf(small)).length === 0);

  const jan = await round("JAN", 10, { date: "2027-01-14" });
  pass(S, "fecha rodada de mês sem conjunto", await closeRound(jan));
  check(S, "sem conjunto do mês não gera pacote", (await packsOf(jan)).length === 0);

  const min8 = await round("MIN8", 9);
  await db.query("update public.groups set pack_min_players = 8 where id = $1", [min8.group]);
  pass(S, "fecha com mínimo 8 e 9 presentes", await closeRound(min8));
  check(S, "mínimo é parâmetro por pelada", (await packsOf(min8)).length === 9);

  const player = await round("PLAYER", 10, { enabled: false });
  fail(S, "jogador não liga packs_enabled", await attempt(player.users[1], "update public.groups set packs_enabled = true where id = $1", [player.group]), "42501");
  fail(S, "jogador não lê a tabela de pacotes", await attempt(player.users[1], "select * from public.packs"), "42501");
  fail(S, "jogador não lê o conjunto do mês", await attempt(player.users[1], "select * from public.pack_sets"), "42501");
}

// 2. Faixas com 10 jogadores
const R10 = await round("R10", 10);
{
  const S = "2 faixas";
  pass(S, "fecha rodada com pacotes ligados", await closeRound(R10));
  const packs = await packsOf(R10);
  check(S, "1 pacote por jogador presente", packs.length === 10);
  const tierOf = (p) => packs.find((x) => x.member_id === R10.ids[p])?.tier;
  check(S, "1º (nota mais alta) = A", tierOf(9) === "A");
  check(S, "2º e 3º = B", tierOf(8) === "B" && tierOf(7) === "B");
  check(S, "30% de baixo = D (3 jogadores)", [0, 1, 2].every((p) => tierOf(p) === "D"));
  check(S, "meio = C", [3, 4, 5, 6].every((p) => tierOf(p) === "C"));
  check(S, "pacote guarda o mês da rodada", packs.every((p) => p.month === "2026-12"));
  check(S, "chance real gravada (soma 100)", packs.every((p) => Math.abs(Object.values(p.odds).reduce((a, b) => a + Number(b), 0) - 100) < 0.5));
  check(S, "o pacote do 1º tem mais chance de lendária que o do último", Number(packs.find((x) => x.tier === "A").odds.lendaria) > Number(packs.find((x) => x.tier === "D").odds.lendaria));
  check(S, "a skin sorteada é do conjunto do mês", packs.every((p) => SET.some(([skin]) => skin === p.skin)));
}

// 3. Empate: dois no topo
{
  const S = "3 empate";
  const base = [3, 3.3, 3.6, 3.9, 4.2, 4.5, 4.8, 5.1, 6, 6];
  const tie = await round("TIE", 10, { base });
  pass(S, "fecha rodada com empate no topo", await closeRound(tie));
  const packs = await packsOf(tie);
  const tierOf = (p) => packs.find((x) => x.member_id === tie.ids[p])?.tier;
  check(S, "os dois empatados em 1º ficam na faixa A", tierOf(8) === "A" && tierOf(9) === "A");
  check(S, "o próximo (3º lugar) vira B", tierOf(7) === "B");
}

// 3b. A faixa segue os PONTOS da rodada (nota + prêmios + 10 por gol), não só a nota
{
  const S = "3b pontos";
  const pts = await round("PTS", 10);
  // O jogador 0 (nota mais baixa) fez 9 gols confirmados: +90 pontos o colocam em 2º, atrás de quem leva o Melhor Jogador e os outros prêmios.
  await db.query("insert into public.match_goals (group_id, match_id, member_id, goals, reported_by) values ($1,$2,$3,9,$3)", [pts.group, pts.match, pts.ids[0]]);
  for (const voter of [1, 2, 3]) {
    await db.query("insert into public.match_goal_confirmations (group_id, match_id, member_id, voter_id, confirmed) values ($1,$2,$3,$4,true)", [pts.group, pts.match, pts.ids[0], pts.ids[voter]]);
  }
  pass(S, "fecha rodada com gols confirmados", await closeRound(pts));
  const packs = await packsOf(pts);
  const tierOf = (p) => packs.find((x) => x.member_id === pts.ids[p])?.tier;
  check(S, "quem fez 9 gols (menor nota, seria D) sobe para B pelos pontos, atrás do dono dos prêmios", tierOf(0) === "B" && tierOf(9) === "A", `faixas ${tierOf(0)} e ${tierOf(9)}`);
}

// 4. Sigilo e abertura
{
  const S = "4 sigilo e abertura";
  const u = R10.users[9]; // o 1º colocado
  const mine = await attempt(u, "select * from public.get_my_packs()");
  check(S, "get_my_packs devolve o pacote do jogador", mine.ok && mine.rows.length === 1);
  check(S, "a skin lacrada não aparece antes de abrir", mine.rows[0].skin === null && mine.rows[0].rarity === null);
  check(S, "mas a chance real aparece", mine.rows[0].odds !== null && mine.rows[0].tier === "A");
  check(S, "contador de pacotes fechados = 1", (await attempt(u, "select public.count_my_unopened_packs() as n")).rows[0].n === 1);
  const other = await attempt(R10.users[3], "select * from public.get_my_packs()");
  check(S, "outro jogador só vê o próprio pacote", other.rows.length === 1 && other.rows[0].pack_id !== mine.rows[0].pack_id);

  const packId = mine.rows[0].pack_id;
  fail(S, "outro jogador não abre o pacote alheio", await attempt(R10.users[3], "select * from public.open_pack($1)", [packId]), "42501");
  const sealed = (await db.query("select skin from public.packs where id = $1", [packId])).rows[0].skin;
  const opened = await attempt(u, "select * from public.open_pack($1)", [packId]);
  pass(S, "o dono abre o pacote", opened);
  check(S, "abrir revela a skin sorteada no fechamento", opened.rows[0].skin === sealed && opened.rows[0].was_duplicate === false && opened.rows[0].coins_awarded === 0);
  check(S, "a skin entra na coleção (origem pacote, preço 0)", (await db.query("select count(*)::int c from public.card_skin_purchases where member_id = $1 and skin = $2 and source = 'pack' and price = 0", [R10.ids[9], sealed])).rows[0].c === 1);
  const again = await attempt(u, "select * from public.open_pack($1)", [packId]);
  check(S, "abrir de novo devolve o mesmo e não duplica", again.ok && again.rows[0].skin === sealed && (await db.query("select count(*)::int c from public.card_skin_purchases where member_id = $1 and skin = $2", [R10.ids[9], sealed])).rows[0].c === 1);
  check(S, "contador volta a 0", (await attempt(u, "select public.count_my_unopened_packs() as n")).rows[0].n === 0);
  const afterOpen = await attempt(u, "select * from public.get_my_packs()");
  check(S, "depois de aberto, a skin aparece na lista", afterOpen.rows[0].skin === sealed);

  // Repetida: o jogador 8 já tem a skin do pacote dele (posse prévia); desde 2026-11-14 ela vira cópia extra, sem moedas na hora.
  const p8 = (await db.query("select id, skin, rarity from public.packs where member_id = $1 and match_id = $2", [R10.ids[8], R10.match])).rows[0];
  await db.query("insert into public.card_skin_purchases (group_id, member_id, skin, price, source) values ($1,$2,$3,0,'pack')", [R10.group, R10.ids[8], p8.skin]);
  const dup = await attempt(R10.users[8], "select * from public.open_pack($1)", [p8.id]);
  check(S, "repetida vira cópia extra, sem moedas na hora", dup.ok && dup.rows[0].was_duplicate === true && dup.rows[0].coins_awarded === 0);
  const spares = (await db.query("select count(*)::int c from public.card_skin_purchases where member_id = $1 and skin = $2 and is_spare and transferred_at is null", [R10.ids[8], p8.skin])).rows[0].c;
  check(S, "a cópia extra fica guardada (is_spare)", spares === 1);
}

// 5. Exclusão de rodada fechada: lacrados somem, revelados continuam
{
  const S = "5 exclusão";
  const w = await round("DEL", 10);
  await closeRound(w);
  const first = (await db.query("select id from public.packs where member_id = $1", [w.ids[9]])).rows[0].id;
  await attempt(w.users[9], "select * from public.open_pack($1)", [first]);
  const skin = (await db.query("select skin from public.packs where id = $1", [first])).rows[0].skin;
  await db.query("delete from public.matches where id = $1", [w.match]);
  check(S, "pacotes da rodada excluída somem", (await db.query("select count(*)::int c from public.packs where match_id = $1", [w.match])).rows[0].c === 0);
  check(S, "a skin já revelada continua com o jogador", (await db.query("select count(*)::int c from public.card_skin_purchases where member_id = $1 and skin = $2", [w.ids[9], skin])).rows[0].c === 1);
}

// 6. Garantia de fim de mês (boost desligado para isolar a regra)
{
  const S = "6 garantia";
  await db.query("update public.pack_config set value = 1 where key = 'boost_max'");
  await addSet("2026-11");
  const w = await round("GAR", 12, { date: "2026-11-28" });
  await db.query("update public.groups set packs_enabled = true where id = $1", [w.group]);
  pass(S, "fecha rodada dos últimos 7 dias do mês", await closeRound(w));
  const packs = await packsOf(w);
  check(S, "gerou 12 pacotes", packs.length === 12);
  check(S, "a garantia forçou designs que faltavam (teto 30% = 4)", packs.filter((p) => p.was_forced).length === 4);
  check(S, "a lendária entrou entre os forçados", packs.some((p) => p.was_forced && p.rarity === "lendaria"));
  check(S, "as duas épicas e uma rara entraram", packs.filter((p) => p.was_forced && p.rarity === "epica").length === 2 && packs.some((p) => p.was_forced && p.rarity === "rara"));
  await db.query("update public.pack_config set value = 20 where key = 'boost_max'");
}

// 7. Estatística: o sorteio do banco bate com a simulação (12 jogadores, 4 rodadas por mês, 250 meses)
{
  const S = "7 estatística";
  const A = await W.scenario("STAT", { count: 12, organizers: 1, positions: Array(12).fill("FIX") });
  await db.query("update public.groups set packs_enabled = true where id = $1", [A.group]);
  // Ranking de teste fixo (o ranking de verdade já foi testado acima): faixas pela posição na lista.
  await db.query(`create or replace function public.pack_round_ranking(target_match uuid)
    returns table (member_id uuid, round_rank integer, tier text) language sql stable as $$
      select a.member_id, (row_number() over (order by a.member_id))::int,
        case when row_number() over (order by a.member_id) = 1 then 'A'
             when row_number() over (order by a.member_id) <= 3 then 'B'
             when row_number() over (order by a.member_id) > 8 then 'D' else 'C' end
      from public.match_attendance a where a.match_id = target_match $$`);
  const months = [];
  for (let y = 2030; y <= 2054; y++) for (let m = 1; m <= 12; m++) months.push(`${y}-${String(m).padStart(2, "0")}`);
  const sample = months.slice(0, 250);
  await db.query(`insert into public.pack_sets (month, skin, design, rarity) select m, s.skin, s.skin, s.rarity from unnest($1::text[]) m cross join (values ${SET.map(([skin, r]) => `('${skin}','${r}')`).join(",")}) as s(skin, rarity)`, [sample]);
  let round = 100;
  for (const month of sample) for (const day of [3, 10, 17, 24]) {
    round += 1;
    const id = (await db.query("insert into public.matches (group_id, round, played_on, status, created_by, closed_at) values ($1,$2,$3,'closed',$4,now()) returning id", [A.group, round, `${month}-${String(day).padStart(2, "0")}`, A.users[0]])).rows[0].id;
    await db.query("insert into public.match_attendance (group_id, match_id, member_id, team) select $1, $2, m, 1 from unnest($3::uuid[]) m", [A.group, id, A.ids]);
    await db.query("select public.draw_round_packs($1)", [id]);
  }
  const perMonth = (await db.query(`select p.month, count(distinct p.skin) filter (where true) as skins,
      bool_or(p.skin = 'lend-1') as leg, count(distinct p.skin) = 12 as all_ok, count(*) filter (where p.skin = 'lend-1') as leg_packs, count(*) as packs
    from public.packs p where p.group_id = $1 group by p.month`, [A.group])).rows;
  const n = perMonth.length;
  const legPct = (100 * perMonth.filter((r) => r.leg).length) / n;
  const allPct = (100 * perMonth.filter((r) => r.all_ok).length) / n;
  const legShare = (100 * perMonth.reduce((s, r) => s + Number(r.leg_packs), 0)) / perMonth.reduce((s, r) => s + Number(r.packs), 0);
  console.log(`   (${n} meses) lendária saiu em ${legPct.toFixed(1)}% · todos os designs em ${allPct.toFixed(1)}% · lendária por pacote ${legShare.toFixed(2)}%`);
  check(S, "250 meses simulados", n === 250);
  check(S, "a lendária saiu em pelo menos 97% dos meses (simulação: 99,7%)", legPct >= 97);
  check(S, "todos os designs saíram em pelo menos 95% dos meses (simulação: 99,7%)", allPct >= 95);
  check(S, "chance real da lendária por pacote entre 2,5% e 4,5% (simulação: 3,3%)", legShare >= 2.5 && legShare <= 4.5);
}

const bad = results.filter((r) => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} verificações passaram`);
if (bad.length) { console.log("FALHARAM:\n" + bad.map((b) => `- [${b.scenario}] ${b.name} ${b.detail}`).join("\n")); process.exit(1); }
