# Integracións externas

## Decap CMS

### Que fai

Carga `public/admin/config.yml`, autentica con GitHub e crea commits ou ramas editoriais. Os contidos publicados quedan en `content/` ou `src/data/`.

### Pezas

- UI: `public/admin/index.html`;
- formulario e coleccións: `public/admin/config.yml`;
- OAuth: `functions/api/auth.ts` e `callback.ts`;
- validación real de contido: `src/content.config.ts`.

Decap non substitúe a validación de Astro. Se os seus campos cambian, hai que actualizar tamén o esquema.

## Google Drive

### Documentos

1. O ficheiro pertence á unidade compartida da organización.
2. A persoa editora crea unha ligazón pública de lectura.
3. Decap garda a ligazón no campo `driveUrl`.
4. Astro mostra a páxina do material e enlaza a Drive.

Non hai API, conta de servizo nin consulta dinámica para materiais.

### Fotografías

1. O navegador envía a imaxe a `/api/martes-en-loita`.
2. A Function valida formato, tamaño, data e autorización.
3. Garda unha copia opcional en R2.
4. Envía a imaxe ao webhook de Apps Script.
5. Apps Script crea a carpeta por data e o ficheiro en Drive.

Se Drive non está configurado, a API non acepta envíos. R2 é respaldo, non substituto editorial.

## Cloudflare

- Pages serve `dist/`.
- Functions executa `functions/api/*`.
- KV conserva solicitudes.
- R2 conserva respaldo fotográfico.
- Access restrinxe administración.
- DNS e custom domains realizan o corte desde WordPress.

Os bindings non se escriben en código porque teñen IDs distintos por conta e ambiente. Os seus nomes si son contrato estable e están documentados.

## Resend

Só notifica solicitudes. A verdade primaria é KV. Un fallo de Resend non perde a solicitude e queda rexistrado nos logs.

## GitHub

Cumpre catro funcións:

- control de versións;
- backend editorial de Decap;
- CI;
- disparador dos builds de Cloudflare.

Debe haber protección de rama e revisión para cambios de código. O fluxo editorial de Decap pode publicar segundo os permisos acordados pola organización.
