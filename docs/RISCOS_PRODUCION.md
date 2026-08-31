# Riscos residuais antes de produción

O código está preparado para staging, pero estes puntos dependen de decisións, credenciais ou comprobacións externas:

1. **Contido baleiro:** `content/actualidade` e `content/materiais` non conteñen aínda a migración real. Astro avisa de coleccións baleiras, aínda que o build remata correctamente.
2. **Privacidade e aviso legal:** faltan textos aprobados pola organización, identidade da responsable, prazo de conservación, dereitos e contacto de protección de datos.
3. **Spam e abuso:** débese configurar rate limiting. Turnstile segue sendo recomendable se o volume de abuso o require.
4. **OAuth de Decap:** o alcance GitHub `repo` non pode limitarse desde Decap a un único repositorio. Cómpre minimizar permisos e protexer `/admin/*` con Access.
5. **Credenciais externas:** OAuth, KV, Resend, Drive, R2 e Access só poden verificarse no proxecto Cloudflare real.
6. **Google Drive:** hai que usar unha unidade compartida propiedade da organización, non a conta persoal dunha editora. Deben revisarse periodicamente permisos e ligazóns públicas.
7. **Copias de seguridade:** falta aprobar e automatizar exportacións de KV, R2, Drive e GitHub.
8. **Monitorización:** faltan alertas sobre erros 5xx, fallos de Functions, builds fallidos e indispoñibilidade do webhook de Drive.
9. **Redireccións:** non se poden crear ata completar o inventario de URLs de WordPress.
10. **Validación final:** cómpre facer QA en staging con navegadores, móbiles, lectores de pantalla e persoas editoras reais.
11. **Dependencia CDN do CMS:** Decap cárgase desde unpkg cunha versión fixada. Para reducir dependencia externa pódese copiar a distribución ao repositorio nunha fase posterior.
12. **Auditoría npm:** actualizada o 31 de agosto de 2026. `npm run audit:ci` executa agora en `0 vulnerabilidades` sobre unha instalación limpa (`npm ci`). O estado anterior (7 vulnerabilidades altas, incluídos tres avisos de XSS no propio Astro) resolveuse actualizando `astro` de `^6.4.8` a `^7.2.9`. Isto require volver executar esta comprobación en cada actualización maior futura; non asumir que un estado limpo se mantén indefinidamente.
13. **Migración a Astro 7 (resolta 31/08/2026):** a actualización de Astro 6→7 non funcionaba nun primeiro intento: o build fallaba con `rollupOptions.input should not be an html file when building for SSR`. A causa real non era Astro, senón un `"overrides": { "vite": "^7.0.0" }` esquecido en `package.json` desde o commit inicial do proxecto, que forzaba Vite 7 aínda que Astro 7 xa require Vite 8 internamente. Ao eliminar ese override, o build funcionou. Isto deixou ao descuberto un segundo problema: `@tailwindcss/postcss` (o plugin de PostCSS) deixa de resolver `@import "tailwindcss"` correctamente baixo Vite 8 (`ENOENT` ao abrir un ficheiro chamado literalmente `tailwindcss`). Solución aplicada: cambiar á integración oficial recomendada por Tailwind para proxectos Vite/Astro, `@tailwindcss/vite`, engadida como plugin de Vite en `astro.config.mjs`; `postcss.config.mjs` e a dependencia `@tailwindcss/postcss` elimináronse por non ser xa necesarios. Verificouse que o HTML e CSS xerados son equivalentes aos da versión anterior (mesmo número de clases, mesmo contido renderizado do Markdown) antes de dar por boa a migración. Como beneficio adicional, desapareceron os tres avisos de build sobre iconas de Leaflet non resoltas (`layers.png`, `layers-2x.png`, `marker-icon.png`).

Ningún destes puntos require redeseñar a web. Os puntos 1, 2, 3, 5, 7, 8, 9 e 10 deben pecharse antes do cambio definitivo de DNS. Os puntos 12 e 13 xa están pechados; convén repetir `npm run audit:ci` regularmente (por exemplo, en cada PR de Dependabot) para que non volvan quedar desactualizados.
