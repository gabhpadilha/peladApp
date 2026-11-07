import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Pacotes de skins guardados do logado, para o pontinho da Loja (deduplicado por requisição; em erro, 0 para nunca travar o menu). */
export const getUnopenedPackCount = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("count_my_unopened_packs");
  if (error) {
    console.error("getUnopenedPackCount: contagem falhou", error);
    return 0;
  }
  return data;
});
