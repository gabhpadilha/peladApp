import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCardSkin, isCardSkinKey, type CardSkinKey } from "@/types/card-skin";

export type MyListingStatus = "active" | "sold" | "cancelled" | "expired";

export type MyListing = {
  id: string;
  purchaseId: string;
  skin: string;
  price: number;
  status: MyListingStatus;
  createdAt: string;
  expiresAt: string;
  soldAt: string | null;
  /** Ex.: "Termina em 14h" (só nos ativos). */
  remainingLabel: string | null;
  /** Ex.: "Comprada por Bigode · Pelada do Bairro · 9 de nov." (só nos vendidos). */
  soldLabel: string | null;
};

/** Um anúncio no ar no Mercado. De quem vende, só o apelido e a pelada. */
export type MarketListing = {
  id: string;
  skin: CardSkinKey;
  name: string;
  price: number;
  seller: string;
  group: string;
  createdAt: string;
  remainingLabel: string;
  isMine: boolean;
};

function isStatus(value: string): value is MyListingStatus {
  return value === "active" || value === "sold" || value === "cancelled" || value === "expired";
}

const dayFormatter = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "America/Sao_Paulo" });

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
    const buyer = [row.buyer_nickname, row.buyer_group].filter(Boolean).join(" · ");
    return {
      id: row.id,
      purchaseId: row.purchase_id,
      skin: row.skin,
      price: row.price,
      status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      soldAt: row.sold_at,
      remainingLabel: status === "active" ? formatRemaining(row.expires_at, now) : null,
      soldLabel:
        status === "sold" && row.sold_at
          ? `${buyer ? `Comprada por ${buyer}` : "Vendida"} · ${dayFormatter.format(new Date(row.sold_at))}`
          : null,
    };
  });
}

/** Os anúncios no ar de todas as peladas, do mais novo ao mais antigo (até 200). */
export async function getMarketListings(groupId: string): Promise<MarketListing[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_market_listings", { target_group: groupId });
  if (error) throw error;
  const now = Date.now();
  const listings: MarketListing[] = [];
  for (const row of data) {
    // Skin que o app ainda não conhece (versão antiga aberta) fica de fora em vez de quebrar a lista.
    if (!isCardSkinKey(row.skin)) continue;
    listings.push({
      id: row.id,
      skin: row.skin,
      name: getCardSkin(row.skin).name,
      price: row.price,
      seller: row.seller_nickname,
      group: row.seller_group,
      createdAt: row.created_at,
      remainingLabel: formatRemaining(row.expires_at, now),
      isMine: row.is_mine,
    });
  }
  return listings;
}
