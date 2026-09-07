import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const actualidade = defineCollection({
  loader: glob({ base: "./content/actualidade", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    type: z.string().min(1),
    summary: z.string(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    featured: z.boolean().default(false),
    eventDate: z.coerce.date().optional(),
    eventLocation: z.string().optional(),
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
    tags: z.array(z.string()).default([]),
    // Para materiais que non son unha ficha+PDF nin encaixan no "desglose"
    // xenérico (por exemplo, unha ferramenta interactiva feita a medida):
    // se se indica, a tarxeta e a busca en /materiais/ enlazan aquí en vez
    // de xerar a páxina xenérica desta colección.
    href: z.string().optional(),
    driveUrl: z.url().optional(),
    fonteTitulo: z.string().optional(),
    fonteUrl: z.url().optional(),
    desglose: desgloseSchema.optional(),
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

export const collections = { actualidade, materiais, paxinas };
