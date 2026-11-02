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

/**
 * As Convocatorias teñen o seu propio espazo en /axenda e por iso se
 * excluyen da grade normal de /actualidade (ver getActualidadeSenConvocatorias).
 * Usamos eventDate cando existe (é a data/hora real do evento); se non,
 * caemos en "date" (a data de publicación da entrada) para non deixar
 * fóra unha convocatoria mal cuberta no CMS.
 */
export async function getConvocatorias() {
  const entries = await getCollection("actualidade", ({ data }) => !data.draft && isType(data.type, "Convocatoria"));
  return entries.sort((a, b) => (a.data.eventDate ?? a.data.date).getTime() - (b.data.eventDate ?? b.data.date).getTime());
}

export function dataDaConvocatoria(entry: ActualidadeEntry) {
  return entry.data.eventDate ?? entry.data.date;
}

/** Actualidade propia + hemeroteca, para as dúas pestanas de /actualidade -- sen Convocatorias (teñen /axenda). */
export async function getActualidadeSenConvocatorias() {
  return (await getActualidade()).filter((entry) => !isType(entry.data.type, "Convocatoria"));
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

// En galego (coma en castelán) o separador decimal é a coma, non o punto:
// "9,5", non "9.5". toLocaleString("gl-ES") encárgase diso.
export function formatHoras(value: number) {
  return value.toLocaleString("gl-ES", { maximumFractionDigits: 1 });
}

export function entrySlug(entry: { id: string }) {
  return entry.id.replace(/\.(md|mdx)$/i, "");
}

export function actualidadeUrl(entry: ActualidadeEntry) {
  return `/actualidade/${entrySlug(entry)}/`;
}

export function materialUrl(entry: MaterialEntry) {
  // Algúns materiais (ferramentas interactivas feitas a medida, non xerables
  // desde o esquema xenérico) apuntan a unha páxina Astro propia en vez de
  // á páxina xenérica desta colección. Ver `href` en content.config.ts.
  return entry.data.href || `/materiais/${entrySlug(entry)}/`;
}
