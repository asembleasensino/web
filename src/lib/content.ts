import { getCollection, type CollectionEntry } from "astro:content";

export type ActualidadeEntry = CollectionEntry<"actualidade">;
export type MaterialEntry = CollectionEntry<"materiais">;
export type HemerotecaEntry = CollectionEntry<"hemeroteca">;

const newestFirst = <T extends { data: { date: Date } }>(a: T, b: T) =>
  b.data.date.getTime() - a.data.date.getTime();

export async function getActualidade() {
  return (await getCollection("actualidade", ({ data }) => !data.draft)).sort(newestFirst);
}

/**
 * As Convocatorias teñen o seu propio espazo en /axenda e por iso se
 * excluyen da grade normal de /actualidade (ver getActualidadeSenConvocatorias).
 * A fonte de verdade é o booleano "convocatoria" (non o texto de "type",
 * que é libre e só unha etiqueta visual -- ver content.config.ts).
 * Usamos eventDate cando existe (é a data/hora real do evento); se non,
 * caemos en "date" (a data de publicación da entrada) para non deixar
 * fóra unha convocatoria mal cuberta no CMS.
 */
export async function getConvocatorias() {
  const entries = await getCollection("actualidade", ({ data }) => !data.draft && data.convocatoria);
  return entries.sort((a, b) => (a.data.eventDate ?? a.data.date).getTime() - (b.data.eventDate ?? b.data.date).getTime());
}

export function dataDaConvocatoria(entry: ActualidadeEntry) {
  return entry.data.eventDate ?? entry.data.date;
}

/**
 * Para saber se unha convocatoria segue a ser "próxima": un evento de
 * varios días (eventDateEnd) segue a contar coma próximo mentres non remate
 * o último día, aínda que xa comezase (ex. unha folga do día 2 ao 6, debe
 * seguir en "próximas" o día 4).
 */
export function dataFinDaConvocatoria(entry: ActualidadeEntry) {
  return entry.data.eventDateEnd ?? dataDaConvocatoria(entry);
}

/**
 * Para a pestana "Actualidade" de /actualidade -- sen Convocatorias (teñen
 * /axenda) nin Hemeroteca (colección propia, ver getHemeroteca), coa
 * excepción das convocatorias marcadas con "tamenEnActualidade" (ver
 * content.config.ts): esas si aparecen aquí, ademais de en /axenda.
 */
export async function getActualidadeSenConvocatorias() {
  return (await getActualidade()).filter((entry) => !entry.data.convocatoria || entry.data.tamenEnActualidade);
}

/**
 * Amosa un intre ("26 de setembro de 2026, 10:30") ou un rango, segundo o
 * que haxa: sen eventDateEnd (ou igual a eventDate) é un só intre; co
 * mesmo día pero hora distinta amosa "26 de setembro de 2026, 10:30–13:00";
 * en días distintos amosa "16–20 de novembro de 2026" (ou engadindo o mes/ano
 * de inicio se cambia respecto ao de fin).
 */
export function formatRangoEvento(inicio: Date, fin?: Date): string {
  if (!fin || fin.getTime() === inicio.getTime()) {
    return formatDate(inicio, { hour: "2-digit", minute: "2-digit" });
  }
  const mesmoDia = inicio.toDateString() === fin.toDateString();
  if (mesmoDia) {
    const horaInicio = new Intl.DateTimeFormat("gl-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(inicio);
    const horaFin = new Intl.DateTimeFormat("gl-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }).format(fin);
    return `${formatDate(inicio)}, ${horaInicio}–${horaFin}`;
  }
  const mesmoMes = inicio.getUTCMonth() === fin.getUTCMonth() && inicio.getUTCFullYear() === fin.getUTCFullYear();
  const diaInicio = new Intl.DateTimeFormat("gl-ES", { day: "2-digit", timeZone: "Europe/Madrid" }).format(inicio);
  if (mesmoMes) {
    return `${diaInicio}–${formatDate(fin)}`;
  }
  return `${formatDate(inicio)} – ${formatDate(fin)}`;
}

/** Igual que formatRangoEvento pero compacto, para a tarxeta pequena do badge de data en /axenda: "16–20" + mes, ou só o día. */
export function formatDiaBadge(inicio: Date, fin?: Date): { dia: string; mes: string } {
  const mes = new Intl.DateTimeFormat("gl-ES", { month: "short", timeZone: "Europe/Madrid" }).format(inicio);
  const diaInicio = new Intl.DateTimeFormat("gl-ES", { day: "2-digit", timeZone: "Europe/Madrid" }).format(inicio);
  if (!fin || inicio.toDateString() === fin.toDateString()) {
    return { dia: diaInicio, mes };
  }
  const diaFin = new Intl.DateTimeFormat("gl-ES", { day: "2-digit", timeZone: "Europe/Madrid" }).format(fin);
  return { dia: `${diaInicio}–${diaFin}`, mes };
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

export type HemerotecaItem = {
  url: string;
  date: Date;
  title: string;
  image?: string;
  medio: string;
};

function dominioDe(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function resolverUrlImaxe(image: string | undefined, baseUrl: string) {
  if (!image) return undefined;
  try {
    return new URL(image, baseUrl).toString();
  } catch {
    return undefined;
  }
}

/**
 * Le as etiquetas Open Graph (og:title/og:image/og:site_name) da propia
 * noticia -- o mesmo mecanismo que usan WhatsApp/Twitter para a vista previa
 * dunha ligazón. Se a petición falla, tarda demais ou o medio non ten esas
 * etiquetas, devolve {} en vez de lanzar un erro: UNHA noticia con problemas
 * nunca debe romper o despregue enteiro (ver getHemeroteca).
 */
async function obterMetadatosOg(url: string): Promise<{ title?: string; image?: string; medio?: string }> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AAEPWebBot/1.0; +https://asembleasensino.gal)" },
    });
    if (!response.ok) return {};
    const html = await response.text();
    const buscarMeta = (propiedade: string) => {
      const patrons = [
        new RegExp(`<meta[^>]+property=["']${propiedade}["'][^>]+content=["']([^"']*)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${propiedade}["']`, "i"),
      ];
      for (const patron of patrons) {
        const match = html.match(patron);
        if (match) return match[1];
      }
      return undefined;
    };
    return {
      title: buscarMeta("og:title"),
      image: resolverUrlImaxe(buscarMeta("og:image"), url),
      medio: buscarMeta("og:site_name"),
    };
  } catch {
    return {};
  }
}

/**
 * Colección deliberadamente mínima (só a URL é obrigatoria -- ver
 * content.config.ts): título, imaxe e medio recóllense ao construír a web
 * lendo as etiquetas Open Graph da propia noticia. Os campos de respaldo do
 * CMS (title/image/medio) teñen prioridade se se enchen á man; se non, e a
 * detección automática falla, cáese no dominio da URL (ex. "xornal21.com")
 * para que sempre haxa algo que amosar, sen bloquear o despregue.
 */
export async function getHemeroteca(): Promise<HemerotecaItem[]> {
  // getCollection() lanza un erro se a colección non ten NINGÚN ficheiro
  // (en vez de devolver unha lista baleira) -- e isto é o estado normal
  // ao principio, antes de que se engada a primeira noticia en Decap.
  let collectionEntries: Awaited<ReturnType<typeof getCollection<"hemeroteca">>>;
  try {
    collectionEntries = await getCollection("hemeroteca", ({ data }) => !data.draft);
  } catch {
    return [];
  }
  const entries = collectionEntries.sort(newestFirst);
  return Promise.all(
    entries.map(async (entry) => {
      const faltaAlgo = !entry.data.title || !entry.data.medio || !entry.data.image;
      const og = faltaAlgo ? await obterMetadatosOg(entry.data.url) : {};
      return {
        url: entry.data.url,
        date: entry.data.date,
        title: entry.data.title || og.title || dominioDe(entry.data.url),
        image: entry.data.image || og.image,
        medio: entry.data.medio || og.medio || dominioDe(entry.data.url),
      };
    }),
  );
}

export type SearchResult = {
  title: string;
  url: string;
  type: string;
  summary?: string;
};

/**
 * Páxinas que non veñen dunha colección de contido (índices fixos,
 * âncoras da portada...) pero que si ten sentido que o buscador atope.
 * Mantéñense aquí, á man: se se engade algunha páxina nova deste tipo,
 * só hai que sumar unha liña.
 */
const PAXINAS_FIXAS_NO_BUSCADOR: SearchResult[] = [
  { title: "Mapa da rede", url: "/#mapa", type: "PÁXINA", summary: "Atopa a túa asemblea territorial no mapa." },
  { title: "A rede", url: "/a-rede/", type: "PÁXINA", summary: "Como se organiza e se coordina a rede de asembleas abertas." },
  { title: "Actualidade", url: "/actualidade/", type: "PÁXINA", summary: "Novas, crónicas e hemeroteca de prensa das asembleas." },
  { title: "Axenda", url: "/axenda/", type: "PÁXINA", summary: "Próximas convocatorias e mobilizacións." },
  { title: "Materiais", url: "/materiais/", type: "PÁXINA", summary: "Recursos descargables: decálogos, kits, modelos de acta, cartaces..." },
  { title: "Martes en loita", url: "/martes-en-loita/", type: "PÁXINA", summary: "Arquivo colectivo das accións semanais nos centros." },
  { title: "Activa o teu centro", url: "/#participa", type: "PÁXINA", summary: "Como comezar unha asemblea aberta no teu centro." },
];

/**
 * Índice completo para o buscador do sitio (ver SiteSearch.astro e
 * buscar-index.json.ts): todo o contido que ten unha URL propia e un
 * título polo que alguén o buscaría. Deliberadamente NON inclúe a
 * hemeroteca de prensa (son ligazóns externas, xa visibles na súa propia
 * pestana de /actualidade) nin as "próximas convocatorias" por separado
 * das entradas de actualidade (unha convocatoria xa aparece aquí una soa
 * vez, etiquetada "AXENDA").
 */
export async function getSearchIndex(): Promise<SearchResult[]> {
  const [actualidade, materiais, paxinas] = await Promise.all([
    getActualidade(),
    getMateriais(),
    getCollection("paxinas", ({ data }) => !data.draft),
  ]);

  const actualidadeItems: SearchResult[] = actualidade.map((entry) => ({
    title: entry.data.title.trim(),
    url: actualidadeUrl(entry),
    type: entry.data.convocatoria ? "AXENDA" : "ACTUALIDADE",
    summary: entry.data.summary,
  }));

  const materiaisItems: SearchResult[] = materiais.map((entry) => ({
    title: entry.data.title.trim(),
    url: materialUrl(entry),
    type: "MATERIAIS",
    summary: entry.data.summary,
  }));

  const paxinasItems: SearchResult[] = paxinas.map((entry) => ({
    title: entry.data.title.trim(),
    url: `/${entrySlug(entry)}/`,
    type: "PÁXINA",
    summary: entry.data.summary,
  }));

  return [...PAXINAS_FIXAS_NO_BUSCADOR, ...actualidadeItems, ...materiaisItems, ...paxinasItems];
}
