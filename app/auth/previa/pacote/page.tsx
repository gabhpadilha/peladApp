import { PackLab } from "./pack-lab";

/** SPIKE DESCARTÁVEL (2026-11-07): protótipo da abertura de pacote com raridades. Não vai para o app. */
export default async function Page({ searchParams }: PageProps<"/auth/previa/pacote">) {
  const { r } = await searchParams;
  return <PackLab rarity={typeof r === "string" ? r : "lendaria"} />;
}
