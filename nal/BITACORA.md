# NAL v2 · bitácora de decisiones

(AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic) and reviewed by the team.)

Cada decisión, en orden. Fecha: 2026-11-15.

1. Rama `nal-v2` creada desde `main` (el prompt dice `nal-v2`; la rama base se llama `main`, no `master`).
2. Clima: `datos/clima/yucatan` solo trae Yucatán hasta 2025-12. Para tener las dos regiones y los meses de 2026
   (necesarios para el pronóstico real de 2027) bajé NASA POWER (API diaria por punto, sin clave) en 6 puntos de tierra
   por región, 2001-01 a 2026-10, agregado a meses; y el ONI de NOAA CPC. Todo en `nal/datos/` con `FUENTES.md`.
3. Fechas: cada pronóstico recibe una "vista" de los datos cortada en su fecha de emisión (`nucleo.Vista`).
   h = 1, 2, 3 como en nal.js (años completos hasta Y − h). Agregué h = "nov": emitido en noviembre de Y − 1 con datos
   hasta octubre de Y − 1, que es exactamente como se emite el pronóstico público de 2027 (datos hasta 2026-10).
   La estación ONI se fecha por su último mes (ASO = octubre) y solo entra si ese mes es anterior o igual al corte.
4. Fase 0: el arnés en Python reproduce v1 de Yucatán y Portugal con diferencia 0.00 puntos en las 7 métricas y h = 1, 2, 3.
   Redondeos de JavaScript (`Math.round`) y orden estable de `sort` replicados.
