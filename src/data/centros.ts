import centrosData from "./centros.json";
import asembleasData from "./asembleas.json";
import comarcaAliases from "./comarcas-aliases.json";
import { territorioDoConcello } from "./territorios";

export type EstadoAsemblea = "activa" | "creacion" | "sen_asemblea";
type AsembleaRecord = {
  codigo: string;
  nome: string;
  concello: string;
  estado: "activa" | "creacion";
  contacto?: string;
};

const asembleasByCode = new Map(
  (asembleasData.asembleas as AsembleaRecord[]).map((asemblea) => [asemblea.codigo, asemblea])
);

const base = centrosData.centros.map((centro) => {
  const asemblea = asembleasByCode.get(centro.codigo);
  return {
    ...centro,
    comarca: (comarcaAliases as Record<string, string>)[centro.comarca] || centro.comarca,
    estado: (asemblea?.estado || "sen_asemblea") as EstadoAsemblea,
    // Territorio (intercentros) real polo que se organiza a asemblea, que
    // non ten por que coincidir coa comarca administrativa -- ver
    // src/data/territorios.json. Un centro sen territorio asignado aínda
    // (porque o seu concello non está en ningún territorio) queda sen este
    // campo por agora -- ver "núcleo" máis abaixo.
    territorio: territorioDoConcello(centro.concello) as string | undefined,
    ...(asemblea?.contacto ? { contacto: asemblea.contacto } : {}),
  };
});

// Núcleo: un concello que a coordinadora aínda non agrupou en ningún
// territorio pero que xa ten exactamente UN centro activo convértese na súa
// propia territorial (co nome do propio concello), para que no mapa se vexa
// xa coma unha zona en marcha e dea a sensación de que outros centros
// veciños se poden unir. Se ese concello chega a ter dous ou máis centros
// activos sen agrupar explicitamente, ou ningún, non se fai esta promoción
// -- queda coma concello solto, á espera de que a coordinadora o asigne.
const activosSenTerritorioPorConcello = new Map<string, number>();
for (const centro of base) {
  if (centro.estado === "activa" && !centro.territorio) {
    activosSenTerritorioPorConcello.set(
      centro.concello,
      (activosSenTerritorioPorConcello.get(centro.concello) ?? 0) + 1
    );
  }
}

export const centros = base.map((centro) => {
  if (centro.territorio || centro.estado !== "activa") return { ...centro, nucleo: false };
  const numActivosNoConcello = activosSenTerritorioPorConcello.get(centro.concello) ?? 0;
  if (numActivosNoConcello !== 1) return { ...centro, nucleo: false };
  return { ...centro, territorio: centro.concello, nucleo: true };
});

export const asembleas = centros.filter((centro) => centro.estado !== "sen_asemblea");
