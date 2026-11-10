import type { PostgrestError } from "@supabase/supabase-js";

/**
 * O Supabase devolve no máximo 1000 linhas por consulta (`max_rows`) e corta o resto SEM erro. Leituras que crescem com as rodadas
 * (notas, envios, gols) usam esta função: busca em páginas de 1000 e junta tudo, na mesma ordem. Sem ela, a partir de ~1000 linhas
 * o OVR, o ranking, o XP e os prêmios seriam calculados com parte dos dados.
 * `fetchPage` precisa ter uma ordem estável (`.order(...)`), senão uma linha pode repetir ou faltar entre as páginas.
 */
export const FETCH_PAGE_SIZE = 1000;

type PageResult<Row> = { data: Row[] | null; error: PostgrestError | null };

export async function fetchAllRows<Row>(fetchPage: (from: number, to: number) => PromiseLike<PageResult<Row>>): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += FETCH_PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + FETCH_PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    // Página curta = acabou (o limite do servidor é o mesmo tamanho da página).
    if (data.length < FETCH_PAGE_SIZE) break;
  }
  return rows;
}
