/**
 * Eventos da Loja (cartas de evento à venda), separados do tema sazonal dos prêmios
 * (`lib/card-themes.ts`). Em dezembro de 2026 os prêmios vestem o Natal e a Loja vende o
 * evento "Destino" ao mesmo tempo (decisão do dono do app em 2026-11-05). As chaves
 * `halloween` e `temporal` são as mesmas dos temas, para as cartas antigas não mudarem.
 * Evento novo: entre aqui, em `CARD_SKINS` (`event.theme` = a chave) e em `EVENT_ICONS` (`shop-content.tsx`).
 */
export const SHOP_EVENTS = [
  { key: "halloween", label: "Halloween", startMonthDay: "10-01", endMonthDay: "10-30" },
  { key: "temporal", label: "Toró", startMonthDay: "10-31", endMonthDay: "11-30" },
  { key: "destino", label: "Destino", startMonthDay: "12-01", endMonthDay: "12-31" },
] as const;

export type ShopEventKey = (typeof SHOP_EVENTS)[number]["key"];

export type CurrentShopEvent = {
  /** `null` fora de qualquer evento. */
  key: ShopEventKey | null;
  label: string | null;
  /** Último dia do evento, `AAAA-MM-DD`. */
  endDate: string | null;
  /** Dias até o fim, sem contar hoje (0 = último dia). */
  daysLeft: number | null;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** Evento da Loja no dia `today` (`AAAA-MM-DD`, horário de Brasília). */
export function getCurrentShopEvent(today: string): CurrentShopEvent {
  const monthDay = today.slice(5, 10);
  const event = SHOP_EVENTS.find((candidate) => monthDay >= candidate.startMonthDay && monthDay <= candidate.endMonthDay);
  if (!event) return { key: null, label: null, endDate: null, daysLeft: null };
  const endDate = `${today.slice(0, 4)}-${event.endMonthDay}`;
  const daysLeft = Math.round((new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / DAY_IN_MS);
  return { key: event.key, label: event.label, endDate, daysLeft };
}
