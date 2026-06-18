# Incorporación dunha nova persoa desenvolvedora

## Primeira hora

1. Le `README.md`.
2. Le `ARQUITECTURA.md`.
3. Le `DECISIONS.md`.
4. Executa:

```sh
nvm use
npm ci
npm run check:all
npm run dev
```

5. Percorre `/`, `/actualidade/`, `/materiais/`, `/a-rede/`, `/martes-en-loita/` e `/admin/`.

## Primeiro día

- Identifica as fontes de verdade da táboa de arquitectura.
- Crea localmente unha noticia, un material e unha páxina Markdown.
- Comproba como se xeran as rutas.
- Revisa as dúas Functions públicas e o panel de solicitudes.
- Le as guías de Cloudflare, Drive e seguridade.
- Comprende que `dist/`, `.astro/` e `node_modules/` son xerados.

## Accesos necesarios para operar

- GitHub: lectura para desenvolver; escritura para editar/publicar.
- Cloudflare: Pages, KV, R2, Access e logs.
- Google Workspace: unidade compartida e Apps Script.
- Resend: dominio e logs de correo.
- DNS: acceso limitado ás persoas responsables do corte.

Non todas as persoas desenvolvedoras precisan todos os accesos.

## Diagnóstico habitual

| Síntoma | Primeiro lugar que revisar |
| --- | --- |
| O contido non aparece | estado de Decap, `draft`, build de Cloudflare |
| O build falla por contido | esquema en `src/content.config.ts` |
| O CMS non inicia sesión | OAuth, permisos GitHub, `/api/auth` |
| Un material non abre | permisos públicos da ligazón Drive |
| Unha solicitude falla | binding KV e logs de Function |
| Unha foto falla | Apps Script, segredo, Drive e R2 |
| O menú non cambia | `site.json`, build e caché |
| Unha asemblea non aparece | código do centro e `asembleas.json` |

## Antes de asumir que “hai que refacer”

1. Executa `npm run validate`.
2. Localiza a fonte de verdade en `ARQUITECTURA.md`.
3. Revisa o historial Git da área.
4. Comproba se o problema é unha credencial externa.
5. Le os riscos residuais.

O proxecto favorece ficheiros simples, builds reproducibles e servizos substituíbles. Un problema nun provedor non implica refacer o frontend nin o modelo editorial.
