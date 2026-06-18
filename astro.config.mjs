import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import site from "./src/data/site.json" with { type: "json" };

export default defineConfig({
  site: site.siteUrl,
  integrations: [sitemap()],
});
