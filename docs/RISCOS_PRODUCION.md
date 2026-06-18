# Riscos residuais antes de produción

O código está preparado para staging, pero estes puntos dependen de decisións, credenciais ou comprobacións externas:

1. **Contido baleiro:** `content/actualidade` e `content/materiais` non conteñen aínda a migración real. Astro avisa de coleccións baleiras, aínda que o build remata correctamente.
2. **Privacidade e aviso legal:** faltan textos aprobados pola organización, identidade da responsable, prazo de conservación, dereitos e contacto de protección de datos.
3. **Spam e abuso:** débese configurar rate limiting. Turnstile segue sendo recomendable se o volume de abuso o require.
4. **OAuth de Decap:** o alcance GitHub `repo` non pode limitarse desde Decap a un único repositorio. Cómpre minimizar permisos e protexer `/admin/*` con Access.
5. **Credenciais externas:** OAuth, KV, Resend, Drive, R2 e Access só poden verificarse no proxecto Cloudflare real.
6. **Google Drive:** hai que usar unha unidade compartida propiedade da organización, non a conta persoal dunha editora. Deben revisarse periodicamente permisos e ligazóns públicas.
7. **Copias de seguridade:** falta aprobar e automatizar exportacións de KV, R2, Drive e GitHub.
8. **Monitorización:** faltan alertas sobre erros 5xx, fallos de Functions, builds fallidos e indispoñibilidade do webhook de Drive.
9. **Redireccións:** non se poden crear ata completar o inventario de URLs de WordPress.
10. **Validación final:** cómpre facer QA en staging con navegadores, móbiles, lectores de pantalla e persoas editoras reais.
11. **Dependencia CDN do CMS:** Decap cárgase desde unpkg cunha versión fixada. Para reducir dependencia externa pódese copiar a distribución ao repositorio nunha fase posterior.
12. **Auditoría npm:** a auditoría actual non presenta vulnerabilidades altas nin críticas. Permanecen avisos baixos/moderados transitivos de ferramentas de desenvolvemento (`esbuild` e o servidor YAML de Astro); as correccións propostas por npm implican baixar versións maiores e non se aplicaron á forza.

Ningún destes puntos require redeseñar a web. Os puntos 1, 2, 3, 5, 7, 8, 9 e 10 deben pecharse antes do cambio definitivo de DNS.
