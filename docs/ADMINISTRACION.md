# Administración da web

## Contidos

O panel editorial está en `/admin` e emprega Decap CMS. Non é WordPress: os cambios gárdanse no repositorio GitHub e Cloudflare publica automaticamente unha nova versión.

Desde o panel pódense editar e publicar:

- novas, comunicados, convocatorias, tribunas e crónicas;
- materiais e ficheiros;
- páxinas informativas;
- identidade, contacto, navegación e portada;
- tipos de contido usados como criterio editorial;
- a páxina “A rede”, grupos de WhatsApp e normas;
- a listaxe reducida de asembleas activas ou en creación.

O modo editorial crea un borrador para revisión antes de publicar.

As entradas publicadas de actualidade e materiais xeran automaticamente páxinas individuais. A portada toma as últimas publicacións e as convocatorias futuras. Os documentos de materiais almacénanse en Google Drive; no CMS gárdanse a descrición e a ligazón pública.

## Que se modifica en cada lugar

- **Actualidade:** novas, comunicados, convocatorias, crónicas e textos editoriais con páxina propia.
- **Materiais:** recursos ou documentos descargables. O ficheiro vive en Google Drive; aquí gárdase a ficha pública e a ligazón.
- **Páxinas:** novas seccións sinxelas de contido institucional. Despois de crealas, engade a súa ligazón en “Identidade, contacto e navegación” se deben aparecer no menú.
- **Identidade, contacto e navegación:** nome público, dominio canónico, correo, Instagram, menús superior e inferior e mensaxe do pé.
- **Portada:** textos principais, bloque institucional, pasos de participación e bloque da rede.
- **A rede:** texto da páxina da rede, grupos, ligazóns de WhatsApp/arquivo e normas.
- **Asembleas:** só a listaxe resumida de asembleas activas ou en creación que debe aparecer no mapa.
- **Tipos de contido:** lista orientativa de categorías para manter coherencia editorial. Se se crea unha categoría nova nunha noticia ou material, debe engadirse aquí para que o equipo a reutilice.

Evita crear categorías case iguais, por exemplo `Comunicado`, `Comunicados` e `comunicado`. O CMS non bloquea estes casos para non romper publicacións, así que a coherencia depende do criterio editorial.

## Persoas administradoras

Cada persoa precisa:

1. unha conta GitHub;
2. acceso de escritura ao repositorio;
3. autorización no OAuth de GitHub configurado en Cloudflare.

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

## Configuración externa obrigatoria antes de publicar

- crear a OAuth App de GitHub e cargar as credenciais;
- crear e vincular o KV `SOLICITUDES`;
- establecer `ADMIN_EMAILS` como lista de correos separados por comas;
- configurar Resend para as notificacións por correo;
- protexer `/xestion/*` con Cloudflare Access;
- configurar R2 e o webhook de Google Drive.

Consulta `DESPREGE_CLOUDFLARE.md` para o procedemento completo e `FLUXO_EDITORIAL.md` para a guía de uso.
