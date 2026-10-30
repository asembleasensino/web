import territoriosData from "./territorios.json";

export type Territorio = {
  nome: string;
  aliases?: string[];
  concellos: string[];
};

export const territorios: Territorio[] = territoriosData.territorios;

// Normaliza un nome de concello para poder cruzalo entre fontes que o
// escriben de xeito distinto: "A Coruña" (centros.json, forma natural) fronte
// a "Coruña, A" (concellos.geojson, forma catastral, co artigo ao final).
// Sen acentos nin maiúsculas para que a comparación sexa robusta.
export function normalizarConcello(nome: string): string {
  const sinAcentos = nome
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  const partido = sinAcentos.match(/^(a|o|as|os)\s+(.+)$/);
  if (partido) return `${partido[2]}, ${partido[1]}`;
  return sinAcentos;
}

const territorioPorConcelloNormalizado = new Map<string, string>();
for (const territorio of territorios) {
  for (const concello of territorio.concellos) {
    territorioPorConcelloNormalizado.set(normalizarConcello(concello), territorio.nome);
  }
}

export function territorioDoConcello(concello: string): string | undefined {
  return territorioPorConcelloNormalizado.get(normalizarConcello(concello));
}
