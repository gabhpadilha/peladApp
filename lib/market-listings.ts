import "server-only";
import { createClient } from "@/lib/supabase/server";

export type MyListingStatus = "active" | "sold" | "cancelled" | "expired";

export type MyListing = {
  id: string;
  skin: string;
  price: number;
  status: MyListingStatus;
  createdAt: string;
  expiresAt: string;
  soldAt: string | null;
  /** Ex.: "Termina em 14h" (só nos ativos). */
  remainingLabel: string | null;
};

function isStatus(value: string): value is MyListingStatus {
  return value === "active" || value === "sold" || value === "cancelled" || value === "expired";
}

/** "Termina em 14h" / "Termina em 35 min" (calculado no servidor, na hora da página). */
export function formatRemaining(expiresAt: string, now: number): string {
  const minutes = Math.max(1, Math.round((new Date(expiresAt).getTime() - now) / 60_000));
  if (minutes < 60) return `Termina em ${minutes} min`;
  return `Termina em ${Math.floor(minutes / 60)}h`;
}

/** Os anúncios do logado na pelada ativa, do mais novo ao mais antigo (a tabela não tem leitura direta). */
export async function getMyListings(groupId: string): Promise<MyListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_listings", { target_group: groupId });
  if (error) throw error;
  const now = Date.now();
  return data.map((row) => {
    const status = isStatus(row.status) ? row.status : "cancelled";
    return {
      id: row.id,
      skin: row.skin,
      price: row.price,
      status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      soldAt: row.sold_at,
      remainingLabel: status === "active" ? formatRemaining(row.expires_at, now) : null,
    };
  });
}
