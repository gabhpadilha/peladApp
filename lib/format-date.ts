/** Datas `AAAA-MM-DD` são dias de calendário: formatar em UTC evita voltar um dia. */
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const weekdayDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" });

function toDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** Ex.: "17 de out." */
export function formatShortDate(date: string): string {
  return shortDateFormatter.format(toDate(date));
}

/** Ex.: "outubro" */
export function formatMonth(date: string): string {
  return monthFormatter.format(toDate(date));
}

/** Ex.: "sáb., 17 de out." */
export function formatWeekdayDate(date: string): string {
  return weekdayDateFormatter.format(toDate(date));
}
