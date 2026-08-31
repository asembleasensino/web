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

const materiais = defineCollection({
  loader: glob({ base: "./content/materiais", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    type: z.string().min(1),
    summary: z.string(),
    tags: z.array(z.string()).default([]),
    driveUrl: z.url(),
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
