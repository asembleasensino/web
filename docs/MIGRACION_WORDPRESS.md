# Migración e substitución de WordPress

## Inventario que hai que exportar

- novas, comunicados, crónicas, tribunas e convocatorias;
- título, data, autor se se conserva, resumo, corpo e imaxe destacada;
- páxinas institucionais que sigan vixentes;
- documentos e materiais descargables;
- fotografías e galerías con dereitos de publicación;
- categorías, etiquetas e URL pública de cada entrada;
- redireccións ou URLs con tráfico relevante;
- metadatos SEO que se queira conservar.

## Procedemento recomendado

1. Exporta WordPress en XML e crea unha copia completa de ficheiros e base de datos.
2. Xera un inventario CSV con URL antiga, tipo, data, título e URL nova prevista.
3. Limpa contido obsoleto e duplicado antes de importalo.
4. Converte as publicacións a Markdown:
   - actualidade en `content/actualidade/`;
   - materiais en `content/materiais/`;
   - nomes de ficheiro estables e sen caracteres problemáticos.
5. Sube documentos a unha unidade compartida de Google Drive.
6. Substitúe os enlaces de WordPress pola ligazón pública de Drive no campo `driveUrl`.
7. Copia só as imaxes editoriais necesarias a `public/uploads/`; o arquivo fotográfico permanece en Drive.
8. Executa `npm run check:all`.
9. Revisa manualmente títulos, táboas, listas, ligazóns e imaxes.

Non se debe importar automaticamente HTML arbitrario de WordPress sen revisalo: shortcodes, galerías, formularios e bloques de plugins non teñen equivalencia directa.

## Redireccións

Antes do cambio, prepara unha táboa unívoca:

```text
/2026/04/unha-noticia/  /actualidade/unha-noticia/  301
/recursos/documento/    /materiais/documento/       301
```

As regras finais poden gardarse en `public/_redirects` cando o inventario real estea aprobado. Non se inclúen regras ficticias no repositorio porque unha redirección incorrecta pode eliminar tráfico ou romper URLs válidas.

## Cambio de DNS

Sete días antes:

1. Baixa o TTL dos rexistros web a 300 segundos.
2. Non cambies MX, SPF, DKIM nin DMARC.
3. Conxela publicacións en WordPress ou establece unha hora de corte.
4. Fai unha última exportación e migra os cambios finais.

O día do cambio:

1. Confirma que staging e o último build son correctos.
2. Asocia o dominio raíz a Cloudflare Pages.
3. Actualiza unicamente os rexistros A/AAAA/CNAME da web segundo indique Cloudflare.
4. Verifica desde redes e dispositivos diferentes.
5. Mantén WordPress sen cambios e accesible só ao equipo durante o período de garantía.

## Rollback

Conserva por escrito os valores DNS anteriores.

Se aparece un fallo crítico:

1. Restaura os rexistros web anteriores.
2. Purga a caché DNS/Cloudflare se procede.
3. Reactiva WordPress para publicación.
4. Comunica a volta temporal ao equipo editorial.
5. Corrixe o problema en staging e repite a checklist.

Cloudflare Pages tamén permite volver a promover un despregue anterior se o problema está nun commit recente e non na arquitectura ou nos datos.

## Criterio para apagar WordPress

Non se elimina WordPress ata cumprir:

- todos os contidos prioritarios migrados;
- redireccións verificadas;
- dúas persoas capaces de publicar en Decap;
- formularios probados en produción;
- copias de seguridade comprobadas;
- polo menos dúas semanas sen necesidade de rollback.
