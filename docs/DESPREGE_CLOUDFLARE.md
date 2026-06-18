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

### KV obrigatorio

1. Crea un namespace KV, por exemplo `aaep-solicitudes`.
2. No proxecto Pages: **Settings → Bindings → Add → KV namespace**.
3. Nome exacto do binding: `SOLICITUDES`.
4. Asóciao en produción e previews se se van probar formularios.

Sen este binding, `POST /api/solicitudes` responde `503` e non acepta datos.

### R2 recomendado

1. Crea un bucket privado, por exemplo `aaep-martes-media`.
2. Engade un binding R2 chamado `MARTES_MEDIA`.
3. Define unha política de retención e copia de seguridade.

R2 é unha copia de seguridade operativa das fotografías; Google Drive segue sendo o arquivo de traballo.

## 3. Variables e segredos

Configura en **Settings → Variables and Secrets**:

| Nome | Tipo | Obrigatorio | Uso |
| --- | --- | --- | --- |
| `ADMIN_EMAILS` | variable | si | Correos autorizados, separados por comas |
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

## 5. Resend

1. Verifica `asembleasensino.gal` en Resend.
2. Engade os rexistros DNS DKIM/SPF que indique Resend sen modificar os MX existentes.
3. Configura `RESEND_API_KEY`.
4. Usa un remitente como `Web AAEP <web@asembleasensino.gal>`.
5. Envía unha solicitude de proba e comproba KV e correo.

Un fallo de correo non perde a solicitude: queda gardada en KV e rexístrase o erro.

## 6. Cloudflare Access

Protexe a aplicación `https://asembleasensino.gal/xestion/*`:

1. Zero Trust → Access → Applications → Add self-hosted application.
2. Dominio: `asembleasensino.gal`; path: `/xestion/*`.
3. Política Allow limitada aos correos administradores.
4. Conserva a mesma lista en `ADMIN_EMAILS`.

O endpoint GET comproba ademais a cabeceira `Cf-Access-Authenticated-User-Email`. Non se debe protexer `/api/solicitudes` completo porque o POST é público.

Recoméndase crear unha segunda aplicación Access para `/admin/*`, limitada ás persoas editoras. O callback `/api/callback` debe quedar fóra desa regra para completar OAuth.

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
