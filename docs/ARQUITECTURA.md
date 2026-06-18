# Arquitectura do proxecto

Este documento é o punto de entrada técnico. Describe a responsabilidade de cada parte e as regras que evitan que o proxecto se converta nun conxunto de excepcións.

## Visión xeral

```text
Persoa editora
    │
    ▼
Decap CMS ──commit/PR──> GitHub ──build──> Cloudflare Pages
                              │                 │
                              │                 ├── web estática Astro
                              │                 └── Pages Functions /api/*
                              │
Google Drive <──Apps Script───┘
    │
    └── documentos e arquivo fotográfico
```

- **Astro** constrúe HTML estático a partir de compoñentes, JSON e Markdown.
- **Decap CMS** é a interface editorial. Non ten base de datos: escribe no repositorio.
- **GitHub** conserva código, configuración e historial editorial.
- **Cloudflare Pages** executa o build, serve a web e executa as Functions.
- **Google Drive** conserva documentos e fotografías; non é un CMS.
- **KV** conserva solicitudes con datos persoais.
- **R2** pode conservar unha copia de seguridade das fotografías.

## Estrutura de directorios

| Ruta | Responsabilidade |
| --- | --- |
| `content/actualidade/` | Noticias, comunicados, convocatorias, tribunas e crónicas |
| `content/materiais/` | Metadatos e ligazóns Drive dos materiais |
| `content/paxinas/` | Páxinas informativas xenéricas |
| `src/components/` | Bloques reutilizables de interface e comportamento |
| `src/config/` | Adaptadores tipados para configuración global |
| `src/data/` | Datos estruturados e configuración visible |
| `src/layouts/` | Estrutura HTML común |
| `src/lib/` | Lóxica compartida sen interface |
| `src/pages/` | Rutas e composición de páxinas |
| `functions/api/` | Endpoints de Cloudflare Pages |
| `apps-script/` | Integración instalada manualmente en Google |
| `public/` | Ficheiros copiados directamente ao build |
| `scripts/` | Importación e validación de datos |
| `docs/` | Operación, arquitectura e decisións |

## Fontes de verdade

| Información | Fonte única |
| --- | --- |
| Nome, correo, dominio, redes e menús | `src/data/site.json` |
| Textos e bloques da portada | `src/data/home.json` |
| Páxina “A rede” | `src/data/rede.json` |
| Catálogo de centros | `src/data/centros.json` |
| Estado das asembleas | `src/data/asembleas.json` |
| Renomeados visibles de comarcas | `src/data/comarcas-aliases.json` |
| Tipos permitidos de actualidade e materiais | `src/data/content-types.json` |
| Esquemas editoriais | `src/content.config.ts` |
| Formularios de Decap | `public/admin/config.yml` |
| Variables externas | `.dev.vars.example` e Cloudflare |

Non se deben copiar estes valores a compoñentes. `npm run validate` comproba as relacións máis importantes.

## Modelo de contidos

### Actualidade

Un ficheiro Markdown por publicación. O esquema inclúe título, data, tipo, resumo, imaxe, destacado e datos opcionais de evento.

### Materiais

Un ficheiro Markdown por material. O documento vive en Drive; Git conserva título, descrición, etiquetas e `driveUrl`.

### Páxinas

As páxinas informativas ordinarias usan `content/paxinas/` e a ruta xenérica `src/pages/[...slug].astro`. Un ficheiro `contacto.md` xera `/contacto/`; `proxecto/historia.md` xera `/proxecto/historia/`.

As páxinas con comportamento propio —mapa, formularios ou arquivos filtrables— si deben ter un compoñente específico en `src/pages/`.

## Datos territoriais

`centros.json` é o catálogo canónico. `asembleas.json` só contén o subconxunto organizativo e referencia centros por código.

Para cambiar un nome visible de comarca sen reescribir miles de rexistros, engade:

```json
{
  "Nome anterior": "Nome novo"
}
```

a `src/data/comarcas-aliases.json`. Para unha actualización oficial completa, importa de novo o CSV co script e revisa os GeoJSON.

`scripts/archive/` contén procesos históricos só para trazabilidade. Non forman parte da operación normal.

## Fronteiras deliberadas

- Os contidos editoriais non viven en compoñentes.
- Os documentos non viven en Git.
- As solicitudes non viven no CMS.
- Drive non decide que se publica.
- O código non contén credenciais.
- Decap e Astro comparten campos, pero cada un cumpre unha función distinta: formulario editorial e validación de build.

## Comprobación automática

`npm run check:all` executa:

1. coherencia de JSON, Decap, navegación, centros e asembleas;
2. validación de esquemas e build Astro;
3. TypeScript das Cloudflare Functions.

O CI repite as comprobacións e bloquea vulnerabilidades altas ou críticas.
