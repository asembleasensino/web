# Administración da web

## Contidos

O panel editorial está en `/admin` e emprega Decap CMS. Non é WordPress: os cambios gárdanse no repositorio GitHub e Cloudflare publica automaticamente unha nova versión.

Desde o panel pódense editar:

- novas, comunicados, convocatorias, tribunas e crónicas;
- materiais e ficheiros;
- a páxina “A rede”, grupos de WhatsApp e normas;
- a listaxe reducida de asembleas activas ou en creación.

O modo editorial crea un borrador para revisión antes de publicar.

## Persoas administradoras

Cada persoa precisa:

1. unha conta GitHub;
2. acceso de escritura ao repositorio;
3. autorización no sistema OAuth configurado para Decap CMS.

Entra en `https://dominio.gal/admin`, inicia sesión con GitHub e escolle a colección que queres editar.

## Solicitudes de novas asembleas

O formulario garda a solicitude en Cloudflare KV co estado `pendente_validacion`. A lista privada está en `/xestion/solicitudes.html` e debe protexerse con Cloudflare Access.

Tamén pode enviar unha notificación a `info@asembleasensino.gal` mediante Resend. Configura:

- `RESEND_API_KEY`;
- `SOLICITUDES_FROM_EMAIL`, por exemplo `Web AAEP <web@asembleasensino.gal>`;
- opcionalmente `SOLICITUDES_TO_EMAIL` se o destino non é `info@asembleasensino.gal`.

O dominio remitente debe estar verificado en Resend. Se o correo falla, a solicitude segue gardada en KV.

Tras comprobar os datos:

1. abre “Asembleas” no CMS;
2. engade o código, nome e concello indicados;
3. escolle `En creación` ou `Activa`;
4. publica o cambio.

Só entón aparece no mapa. Un envío público nunca activa un punto automaticamente.

## Martes en loita

Configura:

- `MARTES_MEDIA`: bucket R2 opcional para conservar unha copia;
- `GOOGLE_APPS_SCRIPT_URL`: URL da aplicación web de Apps Script;
- `GOOGLE_APPS_SCRIPT_SECRET`: segredo compartido co script;
- instala `apps-script/MartesEnLoita.gs` e configura como carpeta raíz `accions/martes_loita/imaxes/imaxes`.

O script valida que a data sexa martes, crea ou reutiliza a carpeta `AAAA-MM-DD` e garda dentro a fotografía como `Centro-Concello.ext`. Se xa existe, engade un número ao nome.

## Configuración pendente antes de publicar

- configurar OAuth de GitHub para Decap;
- crear e vincular o KV `SOLICITUDES`;
- establecer `ADMIN_EMAILS` como lista de correos separados por comas;
- configurar Resend para as notificacións por correo;
- protexer `/xestion/*` con Cloudflare Access;
- configurar R2 e o webhook de Google Drive.
