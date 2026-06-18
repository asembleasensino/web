import centrosData from "./centros.json";
import asembleasData from "./asembleas.json";

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
    estado: (asemblea?.estado || "sen_asemblea") as EstadoAsemblea,
    ...(asemblea?.contacto ? { contacto: asemblea.contacto } : {}),
  };
});

export const asembleas = centros.filter((centro) => centro.estado !== "sen_asemblea");
