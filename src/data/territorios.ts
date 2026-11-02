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
    .replace(/[\u0300-\u036f]/g, "")
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

// Cor por territorio -- xerada, non fixa a man, para que calquera número de
// territorios (incluídos os "núcleo" dun só centro, ver centros.ts) se
// distinga ben sen tocar código cada vez que a coordinadora engade un grupo
// novo. O "ángulo áureo" repartido sobre a roda de cores fai que cores
// veciñas no índice queden sempre ben separadas visualmente.
//
// `universoOrdenado` ten que ser a MESMA lista (mesma orde) en todos os
// sitios onde se chame a esta función, para que cada territorio manteña
// sempre a mesma cor. Por iso o hint do CMS pide engadir territorios novos
// ao FINAL da lista: así os que xa existen non cambian de cor.
const ANGULO_AUREO = 137.507764;

export function corDoTerritorio(nome: string, universoOrdenado: readonly string[]): string {
  const indice = universoOrdenado.indexOf(nome);
  if (indice < 0) return "#355a2c";
  const matiz = (indice * ANGULO_AUREO) % 360;
  return `hsl(${matiz.toFixed(1)}, 42%, 36%)`;
}
