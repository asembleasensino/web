# Contribuír ao proxecto

## Antes de empezar

1. Le `docs/ARQUITECTURA.md`.
2. Le `docs/MANTEMENTO.md`.
3. Usa Node 22 (`nvm use` se empregas nvm).
4. Instala con `npm ci`.

## Fluxo de traballo

1. Crea unha rama desde `main`.
2. Fai cambios pequenos e cunha finalidade clara.
3. Executa:

```sh
npm run check:all
npm run audit:ci
```

4. Revisa a web con `npm run dev`.
5. Actualiza a documentación cando cambie unha ruta, dato, integración ou proceso.
6. Abre unha pull request e usa o preview de Cloudflare.

## Regras de arquitectura

- Non escribas navegación, dominio, correo ou identidade directamente nun compoñente: usa `src/data/site.json`.
- Non introduzas contidos editoriais en arrays dentro de `.astro`: usa Decap e as coleccións.
- Non subas documentos pesados ao repositorio: usa Google Drive.
- Non dupliques o catálogo de centros: actualiza `src/data/centros.json` co importador.
- Non inclúas segredos, exportacións de KV ou datos persoais.
- Unha nova configuración visible debe ter un lugar claro en `src/data/` e, se é editorial, un formulario en Decap.
- Un cambio estrutural debe actualizar `docs/ARQUITECTURA.md` ou `docs/DECISIONS.md`.

## Criterio de aceptación

Un cambio está rematado cando compila, está documentado, non introduce datos duplicados e pode ser entendido por outra persoa lendo a pull request e os documentos afectados.
