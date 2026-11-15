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
5. Modelo v2, primer intento (`TOP_K = 1`, elegir una sola familia de predictores por pliegue, intercepto libre):
   el patrón mejoró un poco en Yucatán; el total empeoró a h = 2 y el intercepto libre hundía el total
   (estimado con muestras tempranas muy cortas). Decisión: intercepto fijo en 0, así "sin predictores" = total de v1.
6. Elegir UNA familia y UNA penalización dentro de cada pliegue sobreajusta (con 6 a 20 muestras elige α chico).
   Se probó además α en {30, 100, 300}. Decisión: promediar con peso igual todas las familias y α en {3, 10, 30, 100}
   (fue la primera variante de promedio probada; no se siguió buscando para no ajustar a los años de prueba).
7. Patrón: elegir la mejor configuración interna (K = 1) era inestable en Portugal. Probé K = 5 (promedio de las 5
   mejores) y K = 20 (todas, sin elegir). Me quedo con K = 5. Total de variantes probadas mirando la validación
   externa: unas 12 (anotadas aquí); por eso las mejoras pequeñas se reportan como "no distinguibles de cero".
8. Regla final por región y horizonte (la del prompt): el patrón v2 solo si top3 y donde20 no empeoran frente al
   patrón de v1; el total v2 solo si baja el error mediano. Si no, se usa la parte de v1. El rango siempre es el
   conforme (cubre más cerca del 80 % que v1).
9. Pronóstico público: emitido con datos hasta 2026-10. 2027 usa la validación "nov"; 2028 la de h = 2; 2029 la de
   h = 3; 2030 y 2031 apuntan a 2029.
