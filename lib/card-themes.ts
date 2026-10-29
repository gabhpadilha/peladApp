/**
 * Temas sazonais das cartas especiais. O tema vem da data do jogo e fica
 * gravado na carta quando ela é ganha (não muda depois).
 * Para criar um tema: adicione aqui, crie os tokens `--award-<prêmio>-<tema>-*`
 * em app/globals.css e as classes em components/player-card.tsx.
 */
export const CARD_THEMES = [
  { key: "halloween", label: "Halloween", startMonthDay: "10-01", endMonthDay: "10-31" },
] as const;

export type CardThemeKey = "default" | (typeof CARD_THEMES)[number]["key"];

export const CARD_THEME_LABELS: Record<CardThemeKey, string> = {
  default: "Clássica",
  ...Object.fromEntries(CARD_THEMES.map((theme) => [theme.key, theme.label])),
} as Record<CardThemeKey, string>;

/** Tema sazonal de um jogo (`AAAA-MM-DD`); fora de qualquer período, "default". */
export function getThemeForDate(date: string): CardThemeKey {
  const monthDay = date.slice(5, 10);
  const theme = CARD_THEMES.find(
    (candidate) => monthDay >= candidate.startMonthDay && monthDay <= candidate.endMonthDay,
  );
  return theme?.key ?? "default";
}

export type CurrentCardEvent = {
  theme: CardThemeKey;
  /** Último dia do evento, `AAAA-MM-DD` (só com tema sazonal). */
  endDate: string | null;
  /** Dias até o fim, sem contar hoje (0 = último dia). */
  daysLeft: number | null;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** Evento das cartas especiais no dia `today` (`AAAA-MM-DD`, horário de Brasília). */
export function getCurrentCardEvent(today: string): CurrentCardEvent {
  const themeKey = getThemeForDate(today);
  const theme = CARD_THEMES.find((candidate) => candidate.key === themeKey);
  if (!theme) return { theme: "default", endDate: null, daysLeft: null };

  const endDate = `${today.slice(0, 4)}-${theme.endMonthDay}`;
  const daysLeft = Math.round(
    (new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / DAY_IN_MS,
  );
  return { theme: themeKey, endDate, daysLeft };
}

/** Converte o texto gravado no banco num tema conhecido (desconhecido → "default"). */
export function parseCardTheme(value: string): CardThemeKey {
  return CARD_THEMES.some((theme) => theme.key === value) ? (value as CardThemeKey) : "default";
}
