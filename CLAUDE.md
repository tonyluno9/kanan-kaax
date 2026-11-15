# Burn Calendar · instrucciones para Claude Code

NASA Space Apps Challenge 2026 · reto "Harmonization of MODIS and VIIRS Hot Spots" · equipo **La Com** (Mérida).
Entrega: domingo 15 nov 2026, 11:59 pm. **Fase actual: rediseño estético de `web/index.html`.**

## Lee según tu tarea
- Contexto completo + historial: `no_publicar/claude/CONTEXTO_COMPLETO.md`
- Plan del rediseño, brief de diseño y reparto de archivos: `no_publicar/claude/MEGA_PROMPT_REDISENO.md`
- Sistema de diseño (después de la Fase 0, es ley): `.claude/diseno/DISENO.md`
- En un worktree, si `no_publicar/claude/` no está, léelo desde la carpeta principal (`../../../no_publicar/claude/`).

## Reglas que no se rompen
- **Datos y cifras intocables:** `web/data/**`, `pipeline/**`, `resultados/**`, `ejecutar.py`, `descargar*.py`. La página solo muestra lo que exporta el pipeline; ningún número se escribe a mano.
- **Solo cambia la presentación.** No cambies lógica (secciones Basics, State, Selection, Refresh de `web/js/app.js`).
- **Bilingüe:** todo texto visible pasa por `t(es, en)`; inglés por defecto, `?lang=es` en español. Lo publicado (código, README, docs) va en inglés. Al usuario háblale en español, corto y claro.
- **Viridis** (`#440154` → `#fde725`) para los datos. **Brasa** como único acento.
- **Sin build, sin frameworks, sin CDNs nuevos** (solo Google Fonts y Leaflet de unpkg). Debe seguir funcionando servida como archivos estáticos en GitHub Pages.
- **Respaldo sin internet** (`crearSvg`) y atribuciones de NASA GIBS, OpenStreetMap y Esri visibles.
- **Nominatim:** solo al enviar la búsqueda, máximo 1 petición por segundo (`esperarTurno`); prohibido el autocompletado.
- **Declaración de IA** en la cabecera de cada archivo de código nuevo (copia la de `web/index.html`) y en el pie de la app.
- **No borres archivos** del usuario; lo viejo va a `_to_delete/`.
- **Respeta la propiedad de archivos** de tu sesión (tabla A.4 del mega prompt). Si necesitas algo de la otra zona, anótalo; no lo hagas.

## Comandos
- Servir: `python -m http.server 8000` (8001 sesión A, 8002 sesión B) → `http://localhost:<puerto>/web/index.html`
- Revisar (rápido, obligatorio antes de cada commit): `python herramientas/revisar_web.py` → debe decir PASS
- Probar: buscar "Tizimín", clic en el mapa, abrir las 8 pestañas, `?lang=es`, `?region=portugal`; 1440×900, 1920×1080 y 390×844.
- Commits pequeños: `git add -A && git commit -m "<A|B>: <hito>"`
