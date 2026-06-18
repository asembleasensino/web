# Fluxo editorial

## Publicar actualidade

1. Entra en `https://asembleasensino.gal/admin/` con GitHub.
2. Abre **Actualidade → Nova Actualidade**.
3. Completa título, data, tipo, resumo e corpo.
4. Engade imaxe de cabeceira só se é necesaria.
5. Para unha convocatoria, completa tamén data/hora e lugar do evento.
6. Usa **Destacar** se debe ter prioridade editorial.
7. Garda. O elemento entra no fluxo editorial como borrador.
8. Pásao a revisión e finalmente a **Ready/Published**.
9. Cloudflare reconstrúe a web. A publicación aparecerá no arquivo, na súa URL individual e, segundo a data, na portada.

As convocatorias futuras aparecen automaticamente en “Próximas convocatorias”. Cando pasa a data deixan de aparecer nesa sección, pero seguen no arquivo.

## Publicar un material de Drive

1. Sube o documento á unidade compartida de Google Drive.
2. Organízao na carpeta correspondente.
3. En **Compartir**, configura acceso de lectura para calquera persoa coa ligazón.
4. Copia unha ligazón `https://drive.google.com/...`.
5. En Decap abre **Materiais → Novo Material**.
6. Completa título, data, tipo, resumo, etiquetas e descrición.
7. Pega a ligazón no campo **Ligazón pública de Google Drive**.
8. Publica polo fluxo editorial.
9. Abre a páxina pública e comproba a descarga nun navegador sen sesión de Google.

Os documentos non se soben ao repositorio. O CMS almacena só metadatos e a ligazón pública.

## Actualizar páxinas e asembleas

- **Páxinas e configuración → A rede** modifica textos, grupos e normas.
- **Páxinas e configuración → Asembleas** modifica o estado e contacto público dos centros.

Ao publicar, Decap crea o cambio en GitHub e Cloudflare desprega unha nova versión.

## Fotografías de Martes en loita

As fotografías entran polo formulario público e gárdanse:

- en Drive mediante Apps Script;
- opcionalmente nunha copia privada de R2.

Estas fotografías non se publican automaticamente. Deben revisarse os dereitos e seleccionar manualmente as que se vaian usar como imaxes editoriais.

## Xestionar solicitudes

1. Entra en `/xestion/solicitudes.html` a través de Cloudflare Access.
2. Contacta coa persoa solicitante.
3. Marca a solicitude como **en contacto**, **resolta** ou **arquivada**.
4. Se se valida unha nova asemblea, publícaa en Decap dentro de **Páxinas e configuración → Asembleas**.

## Incidencias

- Se Cloudflare falla, o contido segue gardado en GitHub e o despregue pode repetirse.
- Se unha ligazón de Drive non abre en incógnito, corrixe os permisos; non publiques outra copia.
- Se o CMS non permite entrar, comproba o OAuth, os permisos de escritura en GitHub e as variables de Cloudflare.
- Se un contido publicado non aparece, revisa `draft`, o estado editorial e o log do build.
