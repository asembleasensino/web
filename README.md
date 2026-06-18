# Asembleas Abertas do Ensino Público

Web de produción en Astro, TypeScript e Tailwind CSS para a rede AAEP.

Arquitectura:

- Astro xera o frontend estático.
- Decap CMS edita contidos Markdown gardados en GitHub.
- Google Drive almacena documentos e o arquivo fotográfico.
- Cloudflare Pages desprega a web e executa as APIs.

## Desenvolvemento

```sh
nvm use
npm ci
npm run dev
```

Antes de abrir unha pull request:

```sh
npm run check:all
npm run audit:ci
```

## Datos

- `public/data/concellos.geojson`: capa territorial dos 313 concellos.
- `public/data/comarcas.geojson`: capa territorial das 54 comarcas.
- `src/data/centros.json`: capa organizativa dos centros e o estado de cada asemblea.

Para actualizar o catálogo de centros desde un CSV:

```sh
npm run import:centros -- /ruta/ao/ficheiro.csv
```

O importador recoñece variantes habituais dos campos código, nome, concello, comarca, provincia, latitude, longitude e tipo. O catálogo territorial non contén estados organizativos; estes viven separadamente en `src/data/asembleas.json`.

## Cloudflare Pages

- Comando de build: `npm run build`
- Directorio de saída: `dist`
- Función `POST /api/solicitudes`: pode gardar en KV mediante o binding `SOLICITUDES`.
- Función `POST /api/martes-en-loita`: valida que a data sexa martes, pode gardar copia en R2 e envía a fotografía ao Apps Script mediante `GOOGLE_APPS_SCRIPT_URL`.
- Script instalable en `apps-script/MartesEnLoita.gs` para gardar directamente en `imaxes/imaxes/AAAA-MM-DD`.
- Guía completa: `docs/DESPREGE_CLOUDFLARE.md`.

## Decap CMS

O panel vive en `/admin` e apunta ao repositorio `asembleasensino/web`. O OAuth execútase nas Pages Functions `/api/auth` e `/api/callback`.

Os administradores poden editar desde o CMS:

- actualidade;
- materiais;
- textos, grupos de WhatsApp e normas da páxina “A rede”;
- estado e contacto público das asembleas.

Actualidade e materiais aliméntanse das coleccións de `content/`. Os materiais gardan en Git só os metadatos e a ligazón ao documento de Drive.

## Operación e migración

- `docs/ARQUITECTURA.md`: visión técnica, directorios e fontes de verdade.
- `docs/MANTEMENTO.md`: onde cambiar cada dato e como ampliar o proxecto.
- `docs/INCORPORACION.md`: itinerario para unha persoa nova.
- `docs/DECISIONS.md`: decisións e límites deliberados.
- `docs/INTEGRACIONS.md`: Decap, Drive, Cloudflare, Resend e GitHub.
- `docs/FLUXO_EDITORIAL.md`: publicación para persoas non técnicas.
- `docs/DESPREGE_CLOUDFLARE.md`: infraestrutura e variables.
- `docs/MIGRACION_WORDPRESS.md`: inventario, DNS e rollback.
- `docs/RISCOS_PRODUCION.md`: bloqueos e riscos que aínda requiren decisións externas.

Para contribuír, consulta tamén `CONTRIBUTING.md`.

## Seguridade

Antes de publicar ou configurar credenciais, consulta `docs/SEGURIDADE_REPOSITORIO.md`. Os valores reais de Cloudflare, Resend, Google e OAuth nunca deben gardarse no repositorio.
