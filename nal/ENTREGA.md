# NAL v2 · entrega

(AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic) and reviewed by the team.)

Generado por `nal/informe.py`; todas las cifras salen de `nal/resultados/*.json`. Reproducir: `python nal/entrenar.py` y `python nal/verificar.py`.

## 1. Resultados (validación hacia adelante, fuera de muestra)

Cada año de prueba se predijo solo con lo que existía en su fecha de emisión. top3, donde20 y captura10: más es mejor. Error: mediana del error del total anual (menos es mejor). Rango: parte de los años con el total real dentro del rango (meta 80 %).

### Yucatán

| h | modelo | n | top3 | donde20 | captura10 | error mediano | dentro del rango |
|---|---|---|---|---|---|---|---|
| 1 | **v2** (patrón v2, total v2) | 15 | 85.1 % | 49.4 % | 72.1 % | 16.2 % | 93 % |
| 1 | v1 | 15 | 85.1 % | 48.9 % | 71.6 % | 22.2 % | 67 % |
| 1 | persistencia | 15 | 84.1 % | 47.7 % | 67.0 % | 49.7 % | 67 % |
| 1 | climatología | 15 | 85.1 % | 47.1 % | 71.3 % | 24.3 % | 67 % |
| 1 | techo (modelo perfecto) | | 85.9 % | 56.2 % | 80.9 % | 0 % | |
| 2 | **v2** (patrón v2, total v1) | 14 | 84.8 % | 50.0 % | 71.5 % | 19.7 % | 86 % |
| 2 | v1 | 14 | 84.8 % | 48.7 % | 71.0 % | 19.7 % | 64 % |
| 2 | persistencia | 14 | 84.2 % | 47.9 % | 66.6 % | 29.5 % | 64 % |
| 2 | climatología | 14 | 84.8 % | 46.9 % | 70.7 % | 22.5 % | 64 % |
| 2 | techo (modelo perfecto) | | 85.7 % | 56.6 % | 80.7 % | 0 % | |
| 3 | **v2** (patrón v2, total v1) | 13 | 84.7 % | 48.0 % | 70.8 % | 17.1 % | 85 % |
| 3 | v1 | 13 | 84.7 % | 47.4 % | 70.5 % | 17.1 % | 69 % |
| 3 | persistencia | 13 | 84.2 % | 47.8 % | 66.0 % | 48.4 % | 69 % |
| 3 | climatología | 13 | 84.7 % | 45.8 % | 70.4 % | 20.4 % | 69 % |
| 3 | techo (modelo perfecto) | | 85.7 % | 56.4 % | 80.7 % | 0 % | |
| nov | **v2** (patrón v2, total v2) | 15 | 85.1 % | 49.4 % | 72.1 % | 16.2 % | 93 % |
| nov | v1 | 15 | 85.1 % | 48.3 % | 71.4 % | 19.9 % | 60 % |
| nov | persistencia | 15 | 84.1 % | 47.6 % | 67.3 % | 49.5 % | 67 % |
| nov | climatología | 15 | 85.1 % | 46.6 % | 71.0 % | 22.4 % | 60 % |
| nov | techo (modelo perfecto) | | 85.9 % | 56.2 % | 80.9 % | 0 % | |

Total del año, años en que v2 se acercó más que v1 / menos / iguales: 1: 12 / 3 / 0 (prueba de signo p = 0.02); 2: 0 / 0 / 14; 3: 0 / 0 / 13; nov: 11 / 4 / 0 (prueba de signo p = 0.06).
Rango de un solo cuadro (P10-P90 de los escenarios, año completo): contuvo el valor real en 1: 78 %, 2: 78 %, 3: 78 %, nov: 80 % de los cuadros con fuego esperado.

### Portugal

| h | modelo | n | top3 | donde20 | captura10 | error mediano | dentro del rango |
|---|---|---|---|---|---|---|---|
| 1 | **v2** (patrón v1, total v2) | 15 | 54.0 % | 59.5 % | 55.0 % | 51.4 % | 80 % |
| 1 | v1 | 15 | 54.0 % | 59.5 % | 55.0 % | 54.5 % | 53 % |
| 1 | persistencia | 15 | 41.9 % | 50.1 % | 29.4 % | 49.5 % | 53 % |
| 1 | climatología | 15 | 56.5 % | 60.1 % | 54.5 % | 47.2 % | 53 % |
| 1 | techo (modelo perfecto) | | 71.3 % | 80.3 % | 92.0 % | 0 % | |
| 2 | **v2** (patrón v1, total v1) | 14 | 55.5 % | 59.0 % | 55.7 % | 64.1 % | 86 % |
| 2 | v1 | 14 | 55.5 % | 59.0 % | 55.7 % | 64.1 % | 50 % |
| 2 | persistencia | 14 | 45.0 % | 47.6 % | 28.4 % | 53.5 % | 50 % |
| 2 | climatología | 14 | 58.9 % | 59.1 % | 55.7 % | 62.8 % | 50 % |
| 2 | techo (modelo perfecto) | | 71.5 % | 80.1 % | 92.0 % | 0 % | |
| 3 | **v2** (patrón v1, total v2) | 13 | 56.0 % | 59.3 % | 56.2 % | 68.2 % | 77 % |
| 3 | v1 | 13 | 56.0 % | 59.3 % | 56.2 % | 69.7 % | 46 % |
| 3 | persistencia | 13 | 44.6 % | 52.6 % | 31.6 % | 58.0 % | 46 % |
| 3 | climatología | 13 | 59.7 % | 60.1 % | 55.8 % | 77.2 % | 46 % |
| 3 | techo (modelo perfecto) | | 71.6 % | 80.7 % | 92.0 % | 0 % | |
| nov | **v2** (patrón v1, total v2) | 15 | 53.4 % | 59.9 % | 55.0 % | 45.0 % | 80 % |
| nov | v1 | 15 | 53.4 % | 59.9 % | 55.0 % | 55.9 % | 53 % |
| nov | persistencia | 15 | 39.2 % | 52.1 % | 28.5 % | 47.9 % | 53 % |
| nov | climatología | 15 | 56.5 % | 60.0 % | 54.9 % | 47.5 % | 53 % |
| nov | techo (modelo perfecto) | | 71.3 % | 80.3 % | 92.0 % | 0 % | |

Total del año, años en que v2 se acercó más que v1 / menos / iguales: 1: 9 / 6 / 0 (prueba de signo p = 0.30); 2: 0 / 0 / 14; 3: 8 / 5 / 0 (prueba de signo p = 0.29); nov: 12 / 3 / 0 (prueba de signo p = 0.02).
Rango de un solo cuadro (P10-P90 de los escenarios, año completo): contuvo el valor real en 1: 84 %, 2: 84 %, 3: 81 %, nov: 85 % de los cuadros con fuego esperado.

## 2. El modelo que quedó

- **Patrón (cuándo y dónde):** promedio de las 5 mejores climatologías ponderadas, elegidas dentro de cada pliegue con una validación hacia adelante interna. Opciones: vida media 3, 5, 8, 12 años o promedio simple; contar el fuego tal cual o como proporción de cada año; suavizado 3x3 de 0 o 30 %.
- **Cantidad (total del año):** log(total / línea base de v1) explicado por regresiones ridge (intercepto fijo en 0) con 6 conjuntos de predictores y 4 penalizaciones, promediadas con el mismo peso. Sin predictores, el total es el de v1.
- **Rango:** conforme (split conformal) sobre los errores fuera de muestra de los años de entrenamiento, nivel 80 %.
- **Elección por región y horizonte:** cada parte de v2 se usa solo si no empeora a v1 (regla del brief). Resultado:

  - Yucatán: 1 patrón v2, total v2; 2 patrón v2, total v1; 3 patrón v2, total v1; nov patrón v2, total v2.
  - Portugal: 1 patrón v1, total v2; 2 patrón v1, total v1; 3 patrón v1, total v2; nov patrón v1, total v2.

Variables y fuentes (todas disponibles en noviembre del año anterior):

- `oni`: NOAA CPC Oceanic Nino Index, season Aug-Sep-Oct of the issue year. Disponible: early November.
- `lluvia_hum`: NASA POWER PRECTOTCORR, rain Jun-Oct of the issue year (6-point mean, log). Disponible: early November.
- `suelo`: NASA POWER GWETROOT, root-zone soil wetness Aug-Oct of the issue year. Disponible: early November.
- `tmax`: NASA POWER T2M_MAX, mean daily max temperature Jun-Oct of the issue year. Disponible: early November.
- `fuego_prev`: Harmonized MODIS+VIIRS record (this app): last year's fire vs its baseline, log. Disponible: issue date (running year filled with the usual Nov-Dec when issued in November).
- `patron`: Harmonized MODIS+VIIRS record (this app): past fire per square and month. Disponible: issue date.

### Pronóstico emitido con datos hasta 2026-10

| región | año | total esperado | rango 80 % | partes |
|---|---|---|---|---|
| Yucatán | 2027 | 46,459 | 24,327 a 67,695 | patrón v2, total v2 |
| Yucatán | 2028 | 41,932 | 22,810 a 59,707 | patrón v2, total v1 |
| Yucatán | 2029 | 41,932 | 21,503 a 57,678 | patrón v2, total v1 |
| Yucatán | predictores 2027 | ONI ASO 2026 = 2.46; fuego 2026 vs base (log) = -0.2582 | | |
| Portugal | 2027 | 12,414 | 2,425 a 26,763 | patrón v1, total v2 |
| Portugal | 2028 | 10,244 | 2,067 a 23,211 | patrón v1, total v1 |
| Portugal | 2029 | 7,174 | 1,411 a 15,894 | patrón v1, total v2 |
| Portugal | predictores 2027 | ONI ASO 2026 = 2.46; fuego 2026 vs base (log) = -0.1292 | | |

2030 y 2031 repiten 2029 (mismo arreglo en el archivo).

## 3. Qué se probó y no funcionó

- Yucatán 1: solo patrón v2 → top3 85.1 %, donde20 49.4 %; solo total v2 → error 16.2 %; ambos → error 16.2 %; base (patrón v1 + línea base de v1 con rango conforme) → error 22.2 %.
- Yucatán 2: solo patrón v2 → top3 84.8 %, donde20 50.0 %; solo total v2 → error 25.6 %; ambos → error 25.6 %; base (patrón v1 + línea base de v1 con rango conforme) → error 19.7 %.
- Yucatán 3: solo patrón v2 → top3 84.7 %, donde20 48.0 %; solo total v2 → error 23.8 %; ambos → error 23.8 %; base (patrón v1 + línea base de v1 con rango conforme) → error 17.1 %.
- Yucatán nov: solo patrón v2 → top3 85.1 %, donde20 49.4 %; solo total v2 → error 16.2 %; ambos → error 16.2 %; base (patrón v1 + línea base de v1 con rango conforme; en nov la línea base incluye el año en curso) → error 22.2 %.
- Portugal 1: solo patrón v2 → top3 53.2 %, donde20 58.6 %; solo total v2 → error 51.4 %; ambos → error 51.4 %; base (patrón v1 + línea base de v1 con rango conforme) → error 54.5 %.
- Portugal 2: solo patrón v2 → top3 55.4 %, donde20 58.9 %; solo total v2 → error 65.5 %; ambos → error 65.5 %; base (patrón v1 + línea base de v1 con rango conforme) → error 64.1 %.
- Portugal 3: solo patrón v2 → top3 58.2 %, donde20 58.1 %; solo total v2 → error 68.2 %; ambos → error 68.2 %; base (patrón v1 + línea base de v1 con rango conforme) → error 69.7 %.
- Portugal nov: solo patrón v2 → top3 53.1 %, donde20 59.7 %; solo total v2 → error 45.0 %; ambos → error 45.0 %; base (patrón v1 + línea base de v1 con rango conforme; en nov la línea base incluye el año en curso) → error 54.5 %.
- Intercepto libre en la regresión del total: hundía el total (muestras tempranas cortas). Se fijó en 0.
- Elegir una sola familia de predictores y una penalización por pliegue: sobreajusta y a h = 1 en Yucatán subía el error. Se reemplazó por el promedio.
- Elegir un solo patrón (K = 1): inestable en Portugal. Promediar todos (K = 20) tampoco ganó a v1 en Portugal.
- Predictores climáticos a 2 y 3 años: no mejoran el total en ninguna región (se usa el total de v1 con rango calibrado).
- Escenarios con 50 % patrón esperado + 50 % un año pasado: el rango de un solo cuadro cubría solo ~45 %. Se usa el patrón de un año pasado completo.
- Adelanto o retraso de la temporada según la lluvia: no se probó por tiempo (top3 de Yucatán ya está a menos de 1 punto del techo).
- Bitácora completa de decisiones: `nal/BITACORA.md` (unas 12 variantes miradas contra la validación externa).

## 4. Límites

- Con 13 a 15 años de prueba, diferencias de 1 a 2 puntos en top3, donde20 y captura10 no se distinguen del azar.
- La cantidad exacta de un año no se puede saber: casi todo el fuego lo prende la gente. NAL v2 da un rango.
- La mejora del total en Yucatán viene sobre todo de la alternancia: tras un año de poco fuego suele venir uno de más, y al revés.
- ONI y NASA POWER se reprocesan con el tiempo: el pasado se validó con los valores de hoy, no con los publicados en su momento.
- El clima se resume en 6 puntos por región; no es clima por cuadro.
- 2030 y 2031 no tienen información propia: repiten 2029.

## 5. Frases para el video y las diapositivas

**Sí se puede decir:**

- "NAL predice cuándo llega el fuego: probado en 15 años escondidos, los 3 meses que espera con más fuego concentran el 85 % del fuego real en Yucatán (lo máximo posible era 86 %)."
- "En el 20 % del territorio que NAL marca como de más riesgo cae el 49 % del fuego de Yucatán."
- "Con el fuego del año anterior, El Niño y el clima de la NASA, el error del total del año en Yucatán bajó de 20 % a 16 % (mediana de 15 años de prueba; v2 se acercó más en 11 de 15 años)."
- "El rango de NAL v2 contiene el total real en 93 % de los años (v1: 60 %; meta: 80 %)."
- "Para 2027 NAL espera en Yucatán unos 46,000 fuegos vistos por satélite, entre 24,000 y 68,000."

**No se puede decir:**

- "NAL predice los incendios" o "sabe cuántos fuegos habrá": da un rango, y el rango de un solo lugar es mucho más incierto.
- "Precisión del 85 %" sin decir de qué: top3 es la parte del fuego en los 3 meses esperados, no un acierto de incendios.
- "El clima predice el fuego a varios años": a 2 y 3 años no ayudó.
- En Portugal el total del año falla mucho (mediana 45 % con v2, 56 % con v1): no presentarlo como confiable.
- "Inteligencia artificial que predice": son regresiones simples y promedios, probados con honestidad.

## 6. Salida de `python nal/verificar.py`

```
== 1. NAL v1 reproduced (Node running web/js/nal.js vs the Python harness) ==
[OK  ] yucatan h=1 n=15: max difference 0.0000 points (top3 85.06, donde20 48.86, captura10 71.60, err 22.21, range 67%)
[OK  ] yucatan h=2 n=14: max difference 0.0000 points (top3 84.75, donde20 48.67, captura10 71.04, err 19.66, range 64%)
[OK  ] yucatan h=3 n=13: max difference 0.0000 points (top3 84.73, donde20 47.40, captura10 70.48, err 17.08, range 69%)
[OK  ] portugal h=1 n=15: max difference 0.0000 points (top3 54.00, donde20 59.48, captura10 55.03, err 54.54, range 53%)
[OK  ] portugal h=2 n=14: max difference 0.0000 points (top3 55.51, donde20 59.01, captura10 55.70, err 64.07, range 50%)
[OK  ] portugal h=3 n=13: max difference 0.0000 points (top3 56.01, donde20 59.33, captura10 56.23, err 69.65, range 46%)

== 2. No leak ==
[OK  ] yucatan h=1: 15 folds, every view, fire month and predictor date <= issue date (Y-h, or Oct of Y-1) 
[OK  ] yucatan h=1: choice of parts recomputed = file (pattern v2, amount v2)
[OK  ] yucatan h=1 canary: data after the issue date replaced by garbage in years [2011, 2018, 2025] -> forecasts identical (max diff 0)
[OK  ] yucatan h=2: 14 folds, every view, fire month and predictor date <= issue date (Y-h, or Oct of Y-1) 
[OK  ] yucatan h=2: choice of parts recomputed = file (pattern v2, amount v1)
[OK  ] yucatan h=2 canary: data after the issue date replaced by garbage in years [2012, 2019, 2025] -> forecasts identical (max diff 0)
[OK  ] yucatan h=3: 13 folds, every view, fire month and predictor date <= issue date (Y-h, or Oct of Y-1) 
[OK  ] yucatan h=3: choice of parts recomputed = file (pattern v2, amount v1)
[OK  ] yucatan h=3 canary: data after the issue date replaced by garbage in years [2013, 2019, 2025] -> forecasts identical (max diff 0)
[OK  ] yucatan h=nov: 15 folds, every view, fire month and predictor date <= issue date (Y-h, or Oct of Y-1) 
[OK  ] yucatan h=nov: choice of parts recomputed = file (pattern v2, amount v2)
[OK  ] yucatan h=nov canary: data after the issue date replaced by garbage in years [2011, 2018, 2025] -> forecasts identical (max diff 0)
[OK  ] yucatan public forecast issued with data up to 2026-10 (last month used is the issue month)
[OK  ] portugal h=1: 15 folds, every view, fire month and predictor date <= issue date (Y-h, or Oct of Y-1) 
[OK  ] portugal h=1: choice of parts recomputed = file (pattern v1, amount v2)
[OK  ] portugal h=1 canary: data after the issue date replaced by garbage in years [2011, 2018, 2025] -> forecasts identical (max diff 0)
[OK  ] portugal h=2: 14 folds, every view, fire month and predictor date <= issue date (Y-h, or Oct of Y-1) 
[OK  ] portugal h=2: choice of parts recomputed = file (pattern v1, amount v1)
[OK  ] portugal h=2 canary: data after the issue date replaced by garbage in years [2012, 2019, 2025] -> forecasts identical (max diff 0)
[OK  ] portugal h=3: 13 folds, every view, fire month and predictor date <= issue date (Y-h, or Oct of Y-1) 
[OK  ] portugal h=3: choice of parts recomputed = file (pattern v1, amount v2)
[OK  ] portugal h=3 canary: data after the issue date replaced by garbage in years [2013, 2019, 2025] -> forecasts identical (max diff 0)
[OK  ] portugal h=nov: 15 folds, every view, fire month and predictor date <= issue date (Y-h, or Oct of Y-1) 
[OK  ] portugal h=nov: choice of parts recomputed = file (pattern v1, amount v2)
[OK  ] portugal h=nov canary: data after the issue date replaced by garbage in years [2011, 2018, 2025] -> forecasts identical (max diff 0)
[OK  ] portugal public forecast issued with data up to 2026-10 (last month used is the issue month)

== 3. Stored validation recomputed from scratch ==
[OK  ] yucatan h=1 v2: 15 years, metrics and rows match the file (max diff 0)
[OK  ] yucatan h=1 v1: 15 years, metrics and rows match the file (max diff 0)
[OK  ] yucatan h=2 v2: 14 years, metrics and rows match the file (max diff 0)
[OK  ] yucatan h=2 v1: 14 years, metrics and rows match the file (max diff 0)
[OK  ] yucatan h=3 v2: 13 years, metrics and rows match the file (max diff 0)
[OK  ] yucatan h=3 v1: 13 years, metrics and rows match the file (max diff 0)
[OK  ] yucatan h=nov v2: 15 years, metrics and rows match the file (max diff 0)
[OK  ] yucatan h=nov v1: 15 years, metrics and rows match the file (max diff 0)
[OK  ] portugal h=1 v2: 15 years, metrics and rows match the file (max diff 0)
[OK  ] portugal h=1 v1: 15 years, metrics and rows match the file (max diff 0)
[OK  ] portugal h=2 v2: 14 years, metrics and rows match the file (max diff 0)
[OK  ] portugal h=2 v1: 14 years, metrics and rows match the file (max diff 0)
[OK  ] portugal h=3 v2: 13 years, metrics and rows match the file (max diff 0)
[OK  ] portugal h=3 v1: 13 years, metrics and rows match the file (max diff 0)
[OK  ] portugal h=nov v2: 15 years, metrics and rows match the file (max diff 0)
[OK  ] portugal h=nov v1: 15 years, metrics and rows match the file (max diff 0)

== 4. Output contract ==
[OK  ] yucatan file size 0.83 MB (< 3 MB)
[OK  ] yucatan loads in Node with global.window = {} and has all keys
[OK  ] yucatan esperado 5 x 384 cells x 12 and escenarios 5 x 20 x 384 cells x 12
[OK  ] yucatan no NaN, no negatives (483840 numbers)
[OK  ] yucatan validacion / referencia_v1 (h = 1, 2, 3, nov), techo and ficha (es, en) complete
[OK  ] yucatan 2030 and 2031 point to the 2029 arrays (no duplicated data)
[OK  ] portugal file size 0.67 MB (< 3 MB)
[OK  ] portugal loads in Node with global.window = {} and has all keys
[OK  ] portugal esperado 5 x 330 cells x 12 and escenarios 5 x 20 x 330 cells x 12
[OK  ] portugal no NaN, no negatives (415800 numbers)
[OK  ] portugal validacion / referencia_v1 (h = 1, 2, 3, nov), techo and ficha (es, en) complete
[OK  ] portugal 2030 and 2031 point to the 2029 arrays (no duplicated data)

== 5. Web review ==
[OK  ] herramientas/revisar_web.py: PASS: 0 failure(s), 0 warning(s)
[OK  ] no change against main in web/data, pipeline, resultados, web/js, web/index.html, web/css

PASS: 0 failure(s)
```
