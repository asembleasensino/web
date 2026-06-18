# Manual de mantemento

## Mapa rápido: onde cambio cada cousa?

| Quero cambiar… | Lugar |
| --- | --- |
| Nome, correo ou Instagram | Decap → Identidade, contacto e navegación |
| Dominio principal | `src/data/site.json` e infraestrutura, seguindo “Cambiar o dominio” |
| Menú principal ou pé | Decap → Identidade, contacto e navegación |
| Textos da portada | Decap → Portada |
| Grupos, WhatsApp e normas | Decap → A rede |
| Asembleas activas ou en creación | Decap → Asembleas |
| Noticias e eventos | Decap → Actualidade |
| Materiais | Drive + Decap → Materiais |
| Unha páxina informativa nova | Decap → Páxinas; despois engadir a ligazón ao menú se procede |
| Nome visible dunha comarca | `src/data/comarcas-aliases.json` |
| Catálogo oficial de centros | `npm run import:centros -- ficheiro.csv` |
| Variables ou servizos | Cloudflare e `.dev.vars.example` |

## Engadir unha páxina

Para unha páxina editorial:

1. Crea a páxina en Decap.
2. Publica.
3. Engade a URL á navegación desde a configuración se debe aparecer no menú.

Só crea un `.astro` novo se a páxina necesita datos, interacción ou unha estrutura que non encaixa na páxina xenérica.

## Engadir unha sección á navegación

Edita `headerNavigation` ou `footerNavigation` en Decap. Cada elemento ten:

- `label`: texto visible;
- `href`: URL interna ou externa;
- `primary`: presentación como chamada principal no menú superior.

Non edites `BaseLayout.astro` para engadir unha ligazón.

## Engadir un novo tipo dentro dunha colección

Exemplo: un novo tipo de Actualidade.

1. Engade o valor a `src/data/content-types.json`.
2. Engade a mesma opción en `public/admin/config.yml`.
3. Revisa se portada, filtros ou etiquetas precisan un tratamento específico.
4. Actualiza a documentación editorial.
5. Executa `npm run check:all`.

Astro valida o dato no build; Decap limita o que pode escoller a persoa editora. `npm run validate` comproba que ambas listas coinciden.

## Engadir unha colección nova

1. Crea `content/nome/`.
2. Define o esquema en `src/content.config.ts`.
3. Engade a colección a Decap.
4. Crea helpers en `src/lib/` se hai consultas repetidas.
5. Crea as rutas de listado e detalle.
6. Documenta propietario, campos, URL e política de publicación.
7. Amplía `scripts/validate-project.mjs`.

## Engadir un formulario

1. Crea un compoñente en `src/components/`.
2. Crea unha Function en `functions/api/`.
3. Valida sempre no servidor, aínda que exista validación no navegador.
4. Define explicitamente onde se almacena o envío.
5. Non devolvas éxito se non se gardou.
6. Engade rate limiting/Turnstile segundo risco.
7. Documenta datos persoais, conservación, acceso e borrado.
8. Engade variables a `.dev.vars.example` e á guía Cloudflare.

## Cambiar o dominio

O dominio canónico nace de `src/data/site.json` e Astro úsao para sitemap e URLs canónicas. Decap necesita ademais o mesmo valor no seu YAML; `npm run validate` falla se diverxen.

Tamén hai que actualizar OAuth, Cloudflare, Resend, DNS e documentación operativa.

## Actualizar dependencias

Dependabot abre propostas mensuais. Para cada actualización:

1. revisa changelog e cambios incompatibles;
2. executa `npm ci`;
3. executa `npm run check:all`;
4. proba o CMS, non só a web pública;
5. comproba previews de Cloudflare;
6. evita `npm audit fix --force` sen revisar os cambios maiores.

## Copias e recuperación

- GitHub: código e contidos.
- Drive: documentos e fotografías.
- R2: respaldo fotográfico.
- KV: solicitudes; require exportación periódica.
- WordPress: conservar durante a xanela de rollback da migración.

As copias deben pertencer a contas da organización e ter polo menos dúas persoas administradoras.
