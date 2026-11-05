import { world, check, results } from "./lib.mjs";
const W = await world();
const { db } = W;
const fail = (s, name, r, code) => check(s, name, !r.ok && (!code || r.code === code), r.ok ? "ACEITOU (deveria recusar)" : `${r.code ?? ""} ${r.error}`);
const pass = (s, name, r) => check(s, name, r.ok, r.ok ? "" : `${r.code ?? ""} ${r.error}`);
async function reportAll(w, goals = {}) { for (let i = 0; i < w.ids.length; i++) await W.report(w, i, i, goals[i] ?? 0); }
async function finishAll(w, except = []) { for (let i = 0; i < w.ids.length; i++) if (!except.includes(i)) await W.finish(w, i); }
const unlockedAt = async (w) => (await db.query("select ratings_unlocked_at from public.matches where id=$1", [w.match])).rows[0].ratings_unlocked_at;

// 1. Fluxo fechado em duas etapas
{
  const S = "1 duas etapas";
  const w = await W.scenario("T1", { count: 8 });
  fail(S, "conferir antes de todos informarem é recusado", await W.finish(w, 0));
  await reportAll(w, { 3: 4 });
  check(S, "todos informaram, mas as notas AINDA estão fechadas (falta conferir)", (await W.ratingsOpen(w)) === false);
  fail(S, "nota nessa hora é recusada (PA006)", await W.rateAll(w, 1), "PA006");
  await W.confirm(w, 0, 3, true); await W.confirm(w, 1, 3, true); await W.confirm(w, 2, 3, false);
  for (let i = 0; i < 7; i++) await W.finish(w, i);
  check(S, "com 7 de 8 conferidos continua fechado", (await W.ratingsOpen(w)) === false);
  fail(S, "nota com 1 faltando conferir é recusada", await W.rateAll(w, 1), "PA006");
  pass(S, "o último conclui", await W.finish(w, 7));
  check(S, "etapa fecha: notas abertas", (await W.ratingsOpen(w)) === true);
  check(S, "abertura fica gravada (não trava de novo)", (await unlockedAt(w)) !== null);
  pass(S, "notas entram", await W.rateAll(w, 1));
  pass(S, "concluir de novo é inofensivo", await W.finish(w, 0));
}
// 2. Número reprovado: corrige durante a etapa dos gols
{
  const S = "2 correção na etapa dos gols";
  const w = await W.scenario("T2", { count: 8 });
  await reportAll(w, { 3: 9 });
  for (const v of [0, 1, 2, 4]) await W.confirm(w, v, 3, false);
  await W.finish(w, 0); await W.finish(w, 1); await W.finish(w, 2);
  pass(S, "o jogador reprovado corrige (9 → 2) com as notas ainda fechadas", await W.report(w, 3, 3, 2));
  const st = await W.state(w, 3);
  check(S, "confirmações e 'não' zeram", st.goals === 2 && st.yes_count === 0 && st.no_count === 0, JSON.stringify(st));
  const stillChecked = (await db.query("select count(*)::int c from public.match_attendance where match_id=$1 and goals_checked_at is not null", [w.match])).rows[0].c;
  check(S, "quem já tinha conferido volta a precisar conferir (ninguém passa com o número velho)", stillChecked === 0, `${stillChecked} ainda conferidos`);
  for (const v of [0, 1, 2]) await W.confirm(w, v, 3, true);
  await finishAll(w);
  check(S, "todos reconferem e a etapa fecha", (await W.ratingsOpen(w)) === true);
  const g = await W.state(w, 3);
  check(S, "gols confirmados com 3 sim", g.yes_count === 3 && g.goals === 2);
}
// 3. Depois que as notas abrem
{
  const S = "3 depois que as notas abrem";
  const w = await W.scenario("T3", { count: 8 });
  await reportAll(w, { 3: 2 });
  for (const v of [0, 1, 2]) await W.confirm(w, v, 3, true);
  await finishAll(w);
  fail(S, "o jogador NÃO corrige os próprios gols depois (PA007)", await W.report(w, 3, 3, 6), "PA007");
  check(S, "número e confirmações intactos", (await W.state(w, 3)).goals === 2 && (await W.state(w, 3)).yes_count === 3);
  pass(S, "mesmo número (sem mudar) é aceito", await W.report(w, 3, 3, 2));
  pass(S, "organizador corrige (3 → 5)", await W.report(w, 0, 3, 5));
  check(S, "organizador corrigiu: confirmações zeram", (await W.state(w, 3)).yes_count === 0);
  check(S, "as notas NÃO fecham de novo por causa da correção", (await W.ratingsOpen(w)) === true);
  pass(S, "quem ainda não enviou nota continua conseguindo enviar", await W.rateAll(w, 5));
  pass(S, "e dá para reconfirmar o número novo", await W.confirm(w, 1, 3, true));
  pass(S, "quem nunca tinha informado informa pela primeira vez depois", await (async () => { await db.query("delete from public.match_goals where member_id=$1", [w.ids[7]]); return W.report(w, 7, 7, 1); })());
}
// 4. Organizador informa por quem está sem celular
{
  const S = "4 sem celular";
  const w = await W.scenario("T4", { count: 6 });
  for (let i = 0; i < 5; i++) await W.report(w, i, i, 0);
  pass(S, "organizador informa pelo jogador 5 (sem celular)", await W.report(w, 0, 5, 2));
  const checked5 = (await db.query("select goals_checked_at from public.match_attendance where match_id=$1 and member_id=$2", [w.match, w.ids[5]])).rows[0].goals_checked_at;
  check(S, "a conferência dele já conta como feita (não trava os outros)", checked5 !== null);
  await finishAll(w, [5]);
  check(S, "etapa fecha sem o jogador 5 tocar em nada", (await W.ratingsOpen(w)) === true);
  pass(S, "e os colegas ainda podem confirmar os 2 gols dele", await W.confirm(w, 1, 5, true));
}
// 5. Alguém não conclui: organizador libera
{
  const S = "5 alguém não conclui";
  const w = await W.scenario("T5", { count: 7 });
  await reportAll(w);
  await finishAll(w, [6]);
  check(S, "1 sem concluir trava", (await W.ratingsOpen(w)) === false);
  fail(S, "jogador comum não libera", await W.unlock(w, 2), "42501");
  pass(S, "organizador libera", await W.unlock(w, 0));
  pass(S, "notas entram", await W.rateAll(w, 1));
  pass(S, "quem não concluiu ainda pode concluir (inofensivo)", await W.finish(w, 6));
}
// 6. Confirmar com o número que o colega viu
{
  const S = "6 número visto";
  const w = await W.scenario("T6", { count: 8 });
  await reportAll(w, { 3: 2 });
  pass(S, "confirma com o número certo", await W.confirmExp(w, 0, 3, true, 2));
  await W.report(w, 3, 3, 9);
  fail(S, "tela velha ('2 gols') confirmando 9 é recusada (PA008)", await W.confirmExp(w, 1, 3, true, 2), "PA008");
  pass(S, "chamada antiga sem número continua funcionando (compatível)", await W.confirm(w, 2, 3, true));
  pass(S, "com o número novo vale", await W.confirmExp(w, 1, 3, true, 9));
  check(S, "contagem = 2 sim (o voto velho sumiu na correção)", (await W.state(w, 3)).yes_count === 2);
}
// 7. Negativas nunca travam
{
  const S = "7 negativas";
  const w = await W.scenario("T7", { count: 8 });
  await reportAll(w, { 2: 15 });
  for (const v of [0, 1, 3, 4, 5, 6, 7]) await W.confirm(w, v, 2, false);
  await finishAll(w);
  check(S, "7 'não' no mesmo jogador e as notas abrem do mesmo jeito", (await W.ratingsOpen(w)) === true);
  for (let i = 0; i < 8; i++) await W.rateAll(w, i);
  pass(S, "fecha a rodada", await W.close(w, 0));
  check(S, "gols reprovados não viram Goleador", (await W.awards(w, "goleador")).length === 0);
}
// 8. Modelo aleatório do fluxo novo
{
  const S = "8 aleatório";
  let rr = 12345; const rnd = () => ((rr = (rr * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); const pick = (n) => Math.floor(rnd() * n);
  let diverge = 0, stuck = 0, closeFail = 0, goleadorOk = 0;
  const N = 60;
  for (let r = 0; r < N; r++) {
    const count = 5 + pick(6);
    const w = await W.scenario(`T8-${r}`, { count });
    const goals = new Map(), by = new Map(), votes = new Map(), checked = new Set();
    let unlocked = false;
    const open = () => unlocked || (goals.size === count && checked.size === count);
    const seal = () => { if (open()) unlocked = true; };
    const steps = 30 + pick(60);
    for (let s = 0; s < steps; s++) {
      const kind = pick(12), actor = pick(count), target = pick(count);
      if (kind <= 2) {
        const g = pick(5) === 0 ? pick(18) - 1 : pick(6);
        const res = await W.report(w, actor, target, g);
        const prev = goals.get(target);
        const valid = g >= 0 && g <= 15 && (actor === target || actor === 0);
        const wasOpen = open();
        const blocked = prev !== undefined && prev !== g && actor === target && actor !== 0 && wasOpen;
        const allowed = valid && !blocked;
        if (res.ok !== allowed) { diverge++; console.log("  div report", { actor, target, g, prev, wasOpen, res: res.error }); }
        if (res.ok) {
          const changed = prev !== g;
          goals.set(target, g); by.set(target, actor);
          if (changed) { votes.set(target, new Map()); if (prev !== undefined && !wasOpen) { checked.clear(); } }
          if (actor !== target) checked.add(target);
          seal();
        }
      } else if (kind <= 5) {
        const yes = pick(4) !== 0;
        const exp = pick(3) === 0 ? pick(6) : null;
        const res = await W.confirmExp(w, actor, target, yes, exp);
        const g = goals.get(target);
        const allowed = actor !== target && g !== undefined && g > 0 && by.get(target) !== actor && (exp === null || exp === g);
        if (res.ok !== allowed) { diverge++; console.log("  div confirm", { actor, target, g, exp, by: by.get(target), res: res.error }); }
        if (res.ok) { if (!votes.has(target)) votes.set(target, new Map()); votes.get(target).set(actor, yes); }
      } else if (kind <= 8) {
        const res = await W.finish(w, actor);
        const allowed = goals.size === count;
        if (res.ok !== allowed) { diverge++; console.log("  div finish", { actor, size: goals.size, res: res.error }); }
        if (res.ok) { checked.add(actor); seal(); }
      } else if (kind === 9 && pick(5) === 0) {
        const res = await W.unlock(w, actor);
        if (res.ok !== (actor === 0)) { diverge++; console.log("  div unlock", { actor }); }
        if (res.ok) unlocked = true;
      }
    }
    const realOpen = await W.ratingsOpen(w);
    if (realOpen !== open()) { diverge++; console.log("  div ratings_open", { realOpen, model: open() }); }
    const un = await W.unlock(w, 0); if (!un.ok) stuck++;
    for (let i = 0; i < count; i++) { const res = await W.rateAll(w, i); void res; }
    const cl = await W.close(w, 0);
    if (!cl.ok) { closeFail++; continue; }
    const conf = [...goals.entries()].filter(([t, g]) => g > 0 && [...(votes.get(t)?.values() ?? [])].filter(Boolean).length >= 3);
    const max = Math.max(0, ...conf.map(([, g]) => g));
    const exp = conf.filter(([, g]) => g === max).map(([t]) => w.ids[t]).sort();
    const got = (await W.awards(w, "goleador")).map((x) => x.member_id).sort();
    if (JSON.stringify(exp) === JSON.stringify(got)) goleadorOk++; else console.log("  Goleador divergente", exp.length, got.length);
  }
  check(S, `${N} rodadas: banco = modelo (informar, conferir, confirmar, liberar)`, diverge === 0, `${diverge} divergências`);
  check(S, "organizador sempre consegue seguir (liberar)", stuck === 0, `${stuck}`);
  check(S, "todas as rodadas fecharam", closeFail === 0, `${closeFail}`);
  check(S, "Goleador = modelo", goleadorOk === N - closeFail, `${goleadorOk}/${N - closeFail}`);
}
const bad = results.filter((r) => !r.ok);
console.log(`\nTOTAL ${results.length} verificações, ${bad.length} FALHAS`);
for (const b of bad) console.log("  ✗", b.scenario, "|", b.name, "|", b.detail);
