import { getCollection, type CollectionEntry } from "astro:content";

export type ActualidadeEntry = CollectionEntry<"actualidade">;
export type MaterialEntry = CollectionEntry<"materiais">;

const newestFirst = <T extends { data: { date: Date } }>(a: T, b: T) =>
  b.data.date.getTime() - a.data.date.getTime();

/**
 * O campo "type" é texto libre en Decap (deliberado: permite crear categorías
 * novas sen tocar código, ver scripts/validate-project.mjs). Como contrapartida,
 * unha entrada escrita como "convocatoria" ou "Convocatoria " (con espazo) non
 * coincidiría cunha comparación exacta e desaparecería en silencio de calquera
 * filtro. isType() compara ignorando maiúsculas/minúsculas e espazos sobrantes
 * para que ese tipo de erro editorial non rompa a funcionalidade.
 */
export function isType(value: string, expected: string) {
  return value.trim().toLocaleLowerCase("gl") === expected.trim().toLocaleLowerCase("gl");
}

export async function getActualidade() {
  return (await getCollection("actualidade", ({ data }) => !data.draft)).sort(newestFirst);
}

export async function getMateriais() {
  return (await getCollection("materiais", ({ data }) => !data.draft)).sort((a, b) => {
    if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
    return newestFirst(a, b);
  });
}

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("gl-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
    ...options,
  }).format(date);
}

export function entrySlug(entry: { id: string }) {
  return entry.id.replace(/\.(md|mdx)$/i, "");
}

export function actualidadeUrl(entry: ActualidadeEntry) {
  return `/actualidade/${entrySlug(entry)}/`;
}

export function materialUrl(entry: MaterialEntry) {
  return `/materiais/${entrySlug(entry)}/`;
}
