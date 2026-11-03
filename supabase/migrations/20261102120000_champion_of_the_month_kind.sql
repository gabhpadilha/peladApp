-- Campeão do Mês (2026-11-02): carta nova para quem vence o ranking de pontos do mês. Valor novo do
-- enum numa migration própria (não pode ser usado na mesma transação em que é criado).
alter type public.award_kind add value if not exists 'campeao_do_mes';
