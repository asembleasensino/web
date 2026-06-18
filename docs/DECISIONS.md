# Decisións de arquitectura

## Astro estático

Escolleuse Astro estático porque o contido cambia con frecuencia editorial, non en tempo real. Cada publicación dispara un build. Isto reduce superficie de ataque, custo e dependencia dun servidor permanente.

## Decap CMS sobre Git

Decap permite edición non técnica mantendo historial, revisión e rollback en GitHub. A contrapartida é que as persoas editoras necesitan conta GitHub e que o backend OAuth clásico usa alcance `repo`.

Se no futuro isto deixa de ser aceptable, as coleccións de Astro permiten migrar a outro CMS sen refacer as páxinas.

## Drive para documentos, non para contido

Drive resolve propiedade, colaboración e versións de documentos. Astro conserva só metadatos e ligazóns. Non se consulta Drive durante cada visita e non se constrúe un CMS artesanal con Sheets.

## Cloudflare Pages

Cloudflare concentra hosting estático, Functions, KV, R2, Access, DNS e previews. As Functions usan APIs web estándar para reducir acoplamento.

## Separación centros/asembleas

O catálogo educativo cambia por fontes oficiais. O estado organizativo cambia polo traballo da rede. Mesturalos obrigaría a reimportar ou editar demasiados datos; por iso se unen por código en `src/data/centros.ts`.

## Configuración visible en JSON

Identidade, navegación e textos estruturados viven en JSON editado por Decap. Son versionables, lexibles sen ferramentas especiais e validados no CI.

## Páxinas xenéricas e páxinas especiais

As páxinas informativas usan Markdown e unha ruta xenérica. As páxinas con interacción teñen compoñentes propios. Isto evita tanto a duplicación como un “page builder” excesivamente abstracto.

## O que deliberadamente non se abstraeu

- `public/admin/config.yml` segue sendo explícito: Decap non ofrece unha composición simple de configuración.
- Os estilos están nun único ficheiro pequeno máis clases Tailwind.
- O mapa mantense nun compoñente porque a súa lóxica é cohesiva.
- Cada API mantén validación específica; extraer unha capa xenérica agora ocultaría máis do que simplificaría.

Estas decisións poden revisarse cando haxa repetición real, non por anticipación.
