import { getCollection, type CollectionEntry } from "astro:content";

export type ActualidadeEntry = CollectionEntry<"actualidade">;
export type MaterialEntry = CollectionEntry<"materiais">;

const newestFirst = <T extends { data: { date: Date } }>(a: T, b: T) =>
  b.data.date.getTime() - a.data.date.getTime();

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
