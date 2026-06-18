# Asembleas Abertas do Ensino Público

Base web en Astro, TypeScript e Tailwind CSS para a rede AAEP.

## Desenvolvemento

```sh
npm install
npm run dev
```

## Datos

- `public/data/concellos.geojson`: capa territorial dos 313 concellos.
- `public/data/comarcas.geojson`: capa territorial das 54 comarcas.
- `src/data/centros.json`: capa organizativa dos centros e o estado de cada asemblea.

Os datos actuais de centros son unha mostra de desenvolvemento. Para substituílos polo CSV real:

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

## Decap CMS

O panel vive en `/admin` e apunta ao repositorio `asembleasensino/web`. Antes de publicar hai que configurar a autenticación OAuth de GitHub para Decap CMS.

Os administradores poden editar desde o CMS:

- actualidade;
- materiais;
- textos, grupos de WhatsApp e normas da páxina “A rede”;
- estado e contacto público das asembleas.

## Seguridade

Antes de publicar ou configurar credenciais, consulta `docs/SEGURIDADE_REPOSITORIO.md`. Os valores reais de Cloudflare, Resend, Google e OAuth nunca deben gardarse no repositorio.
