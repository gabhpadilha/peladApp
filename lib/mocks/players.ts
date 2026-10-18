import type { GoalkeeperProfile, OutfieldProfile, PlayerProfile } from "@/types/player";

/**
 * Elenco genérico para testar UI/UX enquanto o cadastro real não existe.
 * `skill` (0–99, na ordem dos atributos da carta) só serve para gerar notas
 * plausíveis em `evaluations.ts`; o OVR exibido sai sempre das avaliações.
 */
type MockSkill = [number, number, number, number, number, number];

function outfield(
  id: string,
  nickname: string,
  fullName: string,
  position: OutfieldProfile["position"],
): OutfieldProfile {
  return { id, nickname, fullName, role: "outfield", position, photo: null };
}

function goalkeeper(id: string, nickname: string, fullName: string): GoalkeeperProfile {
  return { id, nickname, fullName, role: "goalkeeper", position: "GOL", photo: null };
}

export const MOCK_PROFILES: PlayerProfile[] = [
  goalkeeper("gk-1", "Paredão", "Marcos Vinícius"),
  goalkeeper("gk-2", "Gato", "Rafael Souza"),
  outfield("p-01", "Magrão", "Anderson Lima", "PIV"),
  outfield("p-02", "Falcão", "Bruno Henrique", "ALA"),
  outfield("p-03", "Tico", "Thiago Costa", "ALA"),
  outfield("p-04", "Muralha", "Diego Ferreira", "FIX"),
  outfield("p-05", "Juninho", "José Carlos Júnior", "ALA"),
  outfield("p-06", "Baiano", "Lucas Oliveira", "PIV"),
  outfield("p-07", "Careca", "Fábio Martins", "FIX"),
  outfield("p-08", "Neguinho", "Wesley Santos", "ALA"),
  outfield("p-09", "Alemão", "Guilherme Schmidt", "FIX"),
  outfield("p-10", "Zé", "José Antônio", "PIV"),
  outfield("p-11", "Dudu", "Eduardo Pereira", "ALA"),
  outfield("p-12", "Tiozão", "Roberto Almeida", "FIX"),
];

export const MOCK_SKILLS: Record<string, MockSkill> = {
  "gk-1": [86, 80, 84, 78, 75, 70],
  "gk-2": [72, 70, 66, 64, 62, 58],
  "p-01": [78, 92, 84, 86, 60, 88],
  "p-02": [90, 84, 86, 91, 55, 70],
  "p-03": [88, 74, 80, 84, 52, 66],
  "p-04": [65, 60, 76, 62, 88, 84],
  "p-05": [82, 70, 74, 78, 50, 62],
  "p-06": [64, 78, 68, 70, 54, 80],
  "p-07": [60, 58, 70, 56, 80, 76],
  "p-08": [80, 62, 64, 72, 48, 58],
  "p-09": [55, 54, 62, 50, 74, 70],
  "p-10": [52, 64, 56, 54, 48, 68],
  "p-11": [70, 50, 54, 60, 42, 50],
  "p-12": [40, 52, 60, 44, 66, 54],
};

/** Jogador "logado" até existir autenticação. */
export const MOCK_CURRENT_USER_ID = "p-03";
