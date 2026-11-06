-- Rodada fechada vira definitiva (decisão do dono do app em 2026-11-06): o organizador só exclui rodada ABERTA
-- (criada errada). Excluir uma fechada some com notas, cartas e XP de todos (ex.: quem virou Bola Murcha apagaria a
-- rodada) e reabre vaga no limite semanal do plano. Rodada fechada só o admin da plataforma exclui, pelo painel
-- (chave secreta, que ignora esta policy).

drop policy "matches: organizador apaga" on public.matches;

create policy "matches: organizador apaga rodada aberta"
  on public.matches for delete to authenticated
  using (status = 'open' and public.is_group_organizer(group_id));
