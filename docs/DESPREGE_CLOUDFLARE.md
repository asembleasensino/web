# Despregue en Cloudflare Pages

Esta guía deixa a web estática de Astro e as Pages Functions no mesmo proxecto de Cloudflare.

## 1. Crear o proxecto

1. En Cloudflare, abre **Workers & Pages → Create → Pages → Connect to Git**.
2. Conecta o repositorio `asembleasensino/web`.
3. Configura:
   - rama de produción: `main`;
   - comando de build: `npm run build`;
   - directorio de saída: `dist`;
   - versión de Node: `22`.
4. Activa os despregues de preview para ramas.

Cloudflare detecta automaticamente o directorio raíz `functions/`. O ficheiro `wrangler.jsonc` documenta o nome, a data de compatibilidade e a saída, pero os bindings e segredos deben configurarse no panel.

## 2. Crear almacenamento

### Bindings de KV/R2: xestiónanse en `wrangler.jsonc`, non no panel

Cloudflare pode xestionar os bindings deste proxecto a través do ficheiro `wrangler.jsonc` do repositorio en vez de na pantalla **Settings → Bindings** (se o panel amosa o aviso "Bindings for this project are being managed through wrangler.toml", é este o caso). Cando é así:

1. Crea o namespace/bucket coma sempre, pero dende as seccións xerais da conta (**KV** e **R2** no menú principal de Cloudflare), non dentro do proxecto de Pages.
2. Copia o ID que che dá (nos namespaces KV; un bucket R2 non ten ID, abonda co nome).
3. Engade a entrada correspondente en `wrangler.jsonc`, por exemplo:

   ```jsonc
   "kv_namespaces": [
     { "binding": "SOLICITUDES", "id": "<id-do-namespace>" },
     { "binding": "CENSO_REFERENDO", "id": "<id-do-namespace>" }
   ]
   ```
4. Fai commit e push do cambio a `main`; Cloudflare recolle os bindings novos no seguinte despregue.

### KV obrigatorio

Namespace KV `aaep-solicitudes`, binding exacto `SOLICITUDES`. Sen el, `POST /api/solicitudes` responde `503` e non acepta datos.

### R2 opcional

Bucket R2 `aaep-martes-media`, binding `MARTES_MEDIA`, para gardar unha copia de respaldo das fotografías de "Martes en loita" ademais de Drive. O plan gratuíto de Cloudflare inclúe R2 con límites; se non se quere activar (por exemplo, por evitar calquera paso que pida datos de facturación), pódese omitir sen problema: a Function funciona igual só con Drive, simplemente sen copia de respaldo.

### KV do censo do referendo

Namespace KV `aaep-censo-referendo`, binding exacto `CENSO_REFERENDO`. Sen el, `POST /api/referendo-censo` responde `503` e a páxina `/referendo/` non pode gardar inscricións. A páxina `/xestion/censo-referendo.html` (protexida por Cloudflare Access, ver punto 6) permite consultar e exportar en CSV as persoas inscritas.

## 3. Variables e segredos

Configura en **Settings → Variables and Secrets**:

| Nome | Tipo | Obrigatorio | Uso |
| --- | --- | --- | --- |
| `XESTION_PASSWORD` | secret | si | Contrasinal compartido para entrar en `/xestion/*` |
| `GITHUB_CLIENT_ID` | variable/secret | si | OAuth de Decap CMS |
| `GITHUB_CLIENT_SECRET` | secret | si | OAuth de Decap CMS |
| `RESEND_API_KEY` | secret | recomendado | Notificación de solicitudes |
| `SOLICITUDES_FROM_EMAIL` | variable | recomendado | Remitente verificado en Resend |
| `SOLICITUDES_TO_EMAIL` | variable | non | Destino; por defecto `info@asembleasensino.gal` |
| `GOOGLE_APPS_SCRIPT_URL` | secret | si para Drive | Web app de Apps Script |
| `GOOGLE_APPS_SCRIPT_SECRET` | secret | si para Drive | Segredo compartido co webhook |

Non gardar valores reais no repositorio. `.dev.vars.example` serve como inventario local.

## 4. OAuth de GitHub para Decap

1. En GitHub abre **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Homepage URL: `https://asembleasensino.gal`.
3. Authorization callback URL: `https://asembleasensino.gal/api/callback`.
4. Copia Client ID e Client Secret a Cloudflare.
5. Dá acceso de escritura ao repositorio a cada persoa editora.
6. Desprega e proba `https://asembleasensino.gal/admin/`.

O intermediario OAuth vive en `functions/api/auth.ts` e `functions/api/callback.ts`. Valida o parámetro `state` mediante cookie segura e non persiste tokens.

Para staging en `*.pages.dev`, crea preferentemente unha OAuth App separada:

- Homepage URL: `https://web-5ng.pages.dev`.
- Authorization callback URL: `https://web-5ng.pages.dev/api/callback`.
- Usa o seu `GITHUB_CLIENT_ID` e `GITHUB_CLIENT_SECRET` no ambiente de Cloudflare onde estás probando.

O panel `/admin/` sobrescribe en tempo de execución o `base_url` de Decap co dominio actual. Polo tanto, se entras en `https://web-5ng.pages.dev/admin/`, o popup debe abrir `https://web-5ng.pages.dev/api/auth`; cando a web pase a `https://asembleasensino.gal/admin/`, abrirá `https://asembleasensino.gal/api/auth`.

## 5. Resend

1. Verifica `asembleasensino.gal` en Resend.
2. Engade os rexistros DNS DKIM/SPF que indique Resend sen modificar os MX existentes.
3. Configura `RESEND_API_KEY`.
4. Usa un remitente como `Web AAEP <web@asembleasensino.gal>`.
5. Envía unha solicitude de proba e comproba KV e correo.

Un fallo de correo non perde a solicitude: queda gardada en KV e rexístrase o erro.

## 6. Acceso a /xestion/

Cloudflare Access esixe ter un método de pago rexistrado mesmo no plan gratuíto, así que este proxecto non o usa para `/xestion/*`. En troques, a protección real vive nos propios endpoints da API (non nas páxinas estáticas, que non conteñen datos por si mesmas):

1. Configura o segredo `XESTION_PASSWORD` en Cloudflare (ver punto 3).
2. Os endpoints `GET`/`PATCH` de `/api/solicitudes` e `GET` de `/api/referendo-censo` esixen ese contrasinal na cabeceira `Authorization` (autenticación HTTP básica); sen el, ou con outro distinto, responden `401`. Non se debe protexer `/api/solicitudes` completo porque o `POST` é público.
3. As páxinas `public/xestion/solicitudes.html` e `public/xestion/censo-referendo.html` piden ese contrasinal cun `prompt()` de JavaScript a primeira vez, gárdano en `sessionStorage` (só nesa pestana, mentres estea aberta) e engádeno como cabeceira `Authorization` en cada petición. Non se depende de que o navegador reenvíe só a autenticación HTTP nativa, xa que ese comportamento non é fiable en todos os navegadores.

`/admin/*` (Decap CMS) segue usando OAuth de GitHub, sen relación con isto.

Antes de abrir os formularios ao público, crea regras de rate limiting para `POST /api/solicitudes` e `POST /api/martes-en-loita`. Se aparece spam sostido, o seguinte paso é engadir Cloudflare Turnstile; non se activa por defecto para non introducir outra credencial e dependencia sen unha decisión operativa.

## 7. Dominio

Engade primeiro un dominio de staging, por exemplo `nova.asembleasensino.gal`. Cando se aprobe:

1. Pages → Custom domains → `asembleasensino.gal`.
2. Engade tamén `www.asembleasensino.gal`.
3. Configura unha redirección canónica de `www` ao dominio raíz en Cloudflare.
4. Verifica HTTPS, sitemap, formularios e CMS.

## 8. Verificación mínima

```sh
npm ci
npm run check:all
```

En staging:

- login en `/admin/`;
- publicación e retirada dunha noticia de proba;
- material con ligazón pública de Drive;
- solicitude gardada en KV;
- correo de Resend;
- fotografía presente en Drive e R2;
- acceso denegado a `/xestion/` para unha conta non autorizada.
