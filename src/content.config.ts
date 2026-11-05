import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const actualidade = defineCollection({
  loader: glob({ base: "./content/actualidade", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    type: z.string().min(1),
    // Obrigatorio para Nova/Comunicado/Tribuna/Crónica (cabeceira, buscadores,
    // tarxetas). Para unha Convocatoria pode deixarse baleiro -- xa ten o seu
    // propio bloque de data/lugar/territorio en /axenda e na ficha, así que
    // un resumo adicional é opcional. scripts/validate-project.mjs esixe que
    // estea cuberto cando convocatoria=false.
    summary: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional()),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    featured: z.boolean().default(false),
    // O widget de data "Data do evento" (eventDate) é opcional, pero o
    // compoñente de Decap CMS garda "" (cadea baleira) cando non se toca,
    // en vez de omitir a clave. z.coerce.date() falla ao converter "" --
    // .optional() só acepta a AUSENCIA do valor, non un valor baleiro que
    // falla ao converterse -- e isto rompía a build (ver "desglose" máis
    // arriba para o mesmo problema noutro campo). Tratamos "" coma ausencia
    // de valor.
    eventDate: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.date().optional()),
    // Para eventos que duran máis dun intre (varios días, coma unha folga
    // de varias xornadas, ou só varias horas o mesmo día): data e hora de
    // fin, opcional. Se non se enche, o evento é un só momento (coma antes).
    eventDateEnd: z.preprocess((value) => (value === "" ? undefined : value), z.coerce.date().optional()),
    eventLocation: z.string().optional(),
    // A FONTE DE VERDADE de se unha entrada é unha convocatoria (aparece en
    // /axenda, usa territorio/eventDate e, por defecto, exclúese da grade
    // de /actualidade -- ver tamenEnActualidade máis abaixo para a
    // excepción) é ESTE booleano, non o campo "type". "type" segue sendo
    // texto libre (deliberado, ver máis abaixo) e por iso un erro de
    // escritura nel xa non rompe nada -- antes "Convocatoria" tiña que
    // estar escrito exacto.
    convocatoria: z.preprocess((value) => (value === "" ? undefined : value), z.boolean().default(false)),
    // Só ten sentido cando convocatoria=true: fai que esta convocatoria
    // apareza TAMÉN na grade de /actualidade (ademais de en /axenda, onde
    // xa aparece sempre). Pensado para unha convocatoria con entidade
    // propia de dabondo (ex. unha consulta/votación) como para merecer un
    // sitio en Actualidade e non só en Axenda. Se queda sen marcar (o
    // normal), o comportamento é o de sempre: só en /axenda.
    tamenEnActualidade: z.preprocess((value) => (value === "" ? undefined : value), z.boolean().default(false)),
    // Só ten sentido cando convocatoria=true: o territorio (un dos nomes
    // reais de src/data/territorios.json, ou "Nacional"/"Outro") ao que
    // pertence, para que apareza en /axenda filtrada por ese territorio e
    // coa mesma cor có mapa. É un "select" en Decap (non texto libre coma
    // "type"), así que non debería chegar escrito distinto -- pero
    // tratamos "" coma ausencia de valor polo mesmo motivo que eventDate.
    territorio: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional()),
    draft: z.boolean().default(false),
  }),
});

// Unha ligazón a prensa/mobilizacións externas, non contido propio de AAEP.
// Deliberadamente mínima (só a URL é obrigatoria): título, imaxe e medio
// recóllense ao construír a web lendo as etiquetas Open Graph da propia
// noticia (ver getHemeroteca en src/lib/content.ts), e só fan falla aquí
// coma respaldo se a detección automática falla ou se quere cambiar.
const hemeroteca = defineCollection({
  loader: glob({ base: "./content/hemeroteca", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    url: z.url(),
    date: z.coerce.date(),
    title: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional()),
    image: z.string().optional(),
    medio: z.preprocess((value) => (value === "" ? undefined : value), z.string().optional()),
    draft: z.boolean().default(false),
  }),
});

// Un "desglose" describe un reparto de horas por categorías (por exemplo,
// unha xornada laboral docente: horas lectivas, non lectivas, etc.). É
// unha lista, non campos fixos, para que cada etapa (infantil/primaria,
// secundaria/FP...) poida ter un número distinto de categorías e de
// funcións en cada unha, sen tocar código, só datos.
const desgloseSchema = z.object({
  totalHoras: z.number(),
  totalNota: z.string().optional(),
  categorias: z.array(z.object({
    nome: z.string(),
    horas: z.number(),
    presenza: z.boolean(),
    funcions: z.array(z.string()).default([]),
  })).min(1),
  reglaPractica: z.string().optional(),
  notas: z.array(z.object({
    titulo: z.string(),
    texto: z.string(),
  })).default([]),
});

const materiais = defineCollection({
  loader: glob({ base: "./content/materiais", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    type: z.string().min(1),
    grupo: z.string().optional(),
    summary: z.string(),
    // Para materiais que non son unha ficha+PDF nin encaixan no "desglose"
    // xenérico (por exemplo, unha ferramenta interactiva feita a medida):
    // se se indica, a tarxeta e a busca en /materiais/ enlazan aquí en vez
    // de xerar a páxina xenérica desta colección.
    href: z.string().optional(),
    // Decap garda "" (cadea baleira) cando este campo opcional non se
    // toca, en vez de omitir a clave -- e z.url() rexeita "" coma URL
    // non válida, o que rompe o build (mesmo problema xa visto con
    // eventDate/eventDateEnd/summary). Tratamos "" coma ausencia de valor.
    driveUrl: z.preprocess((value) => (value === "" ? undefined : value), z.url().optional()),
    // Para un ficheiro descargábel aloxado na propia web (PDF, DOCX...), a
    // diferenza de driveUrl que é sempre unha ligazón externa a Drive.
    ficheiro: z.string().optional(),
    fonteTitulo: z.string().optional(),
    fonteUrl: z.preprocess((value) => (value === "" ? undefined : value), z.url().optional()),
    // O widget "object" de Decap CMS non impide gardar esta sección a
    // medias (por exemplo, só "Total de horas" cuberto, sen ningunha
    // "Categoría") cando se toca sen chegar a completala -- típico nun
    // material que xa ten a súa propia páxina (`href`) e non necesita
    // desglose ningún. Tratamos ese caso coma se non houbese desglose, en
    // vez de facer fallar toda a build por un dato incompleto e non usado.
    desglose: z.preprocess((value) => {
      const categorias = (value as { categorias?: unknown } | null | undefined)?.categorias;
      if (value && typeof value === "object" && !(Array.isArray(categorias) && categorias.length > 0)) {
        return undefined;
      }
      return value;
    }, desgloseSchema.optional()),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const paxinas = defineCollection({
  loader: glob({ base: "./content/paxinas", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { actualidade, hemeroteca, materiais, paxinas };
