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

export const centros = centrosData.centros.map((centro) => {
  const asemblea = asembleasByCode.get(centro.codigo);
  return {
    ...centro,
    comarca: (comarcaAliases as Record<string, string>)[centro.comarca] || centro.comarca,
    estado: (asemblea?.estado || "sen_asemblea") as EstadoAsemblea,
    // Territorio (intercentros) real polo que se organiza a asemblea, que
    // non ten por que coincidir coa comarca administrativa -- ver
    // src/data/territorios.json. Un centro sen territorio asignado aínda
    // (porque o seu concello non está en ningún territorio) queda sen este
    // campo, sen romper nada.
    territorio: territorioDoConcello(centro.concello),
    ...(asemblea?.contacto ? { contacto: asemblea.contacto } : {}),
  };
});

export const asembleas = centros.filter((centro) => centro.estado !== "sen_asemblea");
