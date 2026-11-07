import type { APIRoute } from "astro";
import { getSearchIndex } from "../lib/content";

// Índice estático do buscador do sitio (ver SiteSearch.astro): xérase UNHA
// vez en cada build, non en cada visita -- por iso pode vivir coma
// ficheiro JSON simple en vez de coma función de servidor.
export const prerender = true;

export const GET: APIRoute = async () => {
  const index = await getSearchIndex();
  return new Response(JSON.stringify(index), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
