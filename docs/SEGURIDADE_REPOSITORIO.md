# Auditoría de seguridade do repositorio

Data da revisión: 18 de xuño de 2026.

## Non publicar

- `.env*` e `.dev.vars*`, agás os ficheiros de exemplo sen valores.
- `.wrangler/`, configuración local de Wrangler e estado dos emuladores.
- `busqueda.csv`: fonte reproducible con enderezos e teléfonos dos centros.
- `centros-galiza.gsheet`: atallo de Google con correo da conta e ID interno da folla.
- chaves privadas, certificados, tokens OAuth e ficheiros de contas de servizo.
- exportacións de solicitudes, correos, listaxes de persoas administradoras ou copias de KV/R2.

## Segredos que deben vivir en Cloudflare

- `RESEND_API_KEY`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`
- `GOOGLE_APPS_SCRIPT_SECRET`
- `GOOGLE_APPS_SCRIPT_URL`
- `ADMIN_EMAILS`
- `SOLICITUDES_FROM_EMAIL`
- `SOLICITUDES_TO_EMAIL`

Os bindings `SOLICITUDES` e `MARTES_MEDIA` configúranse no proxecto Cloudflare. Non se gardan credenciais no código.

`SOLICITUDES` é obrigatorio: a API devolve `503` se non pode garantir o gardado. O envío de fotografías tamén devolve erro se non hai Drive nin R2 configurados, e só confirma a recepción cando polo menos un destino conservou a imaxe.

## GitHub e Decap CMS

`public/admin/config.yml` pode incluír o nome público do repositorio e a rama. Nunca debe incluír:

- GitHub personal access tokens;
- client secrets OAuth;
- claves privadas;
- tokens de despregamento.

Un OAuth client ID pode ser público, pero o seu client secret debe quedar no provedor OAuth ou nun segredo de Cloudflare.

As Functions OAuth usan unha cookie `HttpOnly`, `Secure` e `SameSite=Lax` para validar o parámetro `state`. Os tokens de GitHub entréganse directamente á ventá de Decap e non se gardan no servidor.

O backend GitHub clásico de Decap precisa alcance `repo`. Isto dá ao token acceso aos repositorios aos que xa teña acceso cada persoa editora, non só a este proxecto. Deben empregarse contas de organización con mínimos permisos, protexer `/admin/*` con Cloudflare Access e revogar inmediatamente o OAuth dunha persoa que deixe o equipo.

Os formularios públicos precisan rate limiting en Cloudflare. A protección anti-spam avanzada con Turnstile queda como decisión previa ao lanzamento segundo o nivel de exposición.

KV non aplica por si só unha política de conservación. A organización debe aprobar un prazo para arquivar ou eliminar solicitudes con datos persoais e executar revisións periódicas.

## Google Drive e Apps Script

`apps-script/MartesEnLoita.gs` non contén IDs nin segredos reais. A ID da carpeta e o segredo gárdanse en Script Properties mediante `setupMartesEnLoita()`.

A URL despregada do Apps Script debe tratarse como configuración sensible e gardarse en Cloudflare.

## Datos publicados deliberadamente

- `src/data/centros.json`: código, nome, concello, comarca, provincia, coordenadas e tipo dos centros. Non inclúe teléfonos nin enderezos.
- `src/data/asembleas.json`: lista pública de centros con asemblea. O campo `contacto` só debe conter un enderezo expresamente público.
- `src/data/rede.json`: as ligazóns de WhatsApp que se introduzan aquí publicaranse na web e no repositorio. Non usar invitacións privadas.
- `public/images/martes/*.webp`: fotografías con persoas identificables. Debe existir autorización ou unha base lexítima para a súa publicación. As copias WebP non conservan metadatos EXIF detectables nesta revisión.

## Antes de facer público o repositorio

1. Comprobar o historial Git, non só o estado actual.
2. Executar unha ferramenta como `gitleaks` ou GitHub secret scanning.
3. Verificar que `git status --ignored` mostra as fontes privadas como ignoradas.
4. Se algún segredo chegou a un commit, revogalo e rotalo; borralo do historial non é suficiente.
