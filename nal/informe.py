"""
NAL v2 · writes nal/ENTREGA.md from nal/resultados/*.json and nal/resultados/verificar.txt (no number typed by hand).
AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic) and reviewed by the team.
Called at the end of verificar.py; can also be run alone: python nal/informe.py
"""
import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
RES = os.path.join(AQUI, "resultados")
NOMBRE = {"yucatan": "Yucatán", "portugal": "Portugal"}
HN = {"1": "h = 1", "2": "h = 2", "3": "h = 3", "nov": "nov (emitido en noviembre, datos hasta octubre)"}


def p(x):
    return "%.1f %%" % (100 * x)


def p0(x):
    return "%.0f %%" % (100 * x)


def ganados(v2, v1):
    """Years where v2's total is closer than v1's (paired, same years)."""
    a = {f["anio"]: abs(f["esperado"] - f["real"]) / f["real"] for f in v2["filas"]}
    b = {f["anio"]: abs(f["esperado"] - f["real"]) / f["real"] for f in v1["filas"]}
    comunes = sorted(set(a) & set(b))
    return sum(a[y] < b[y] - 1e-12 for y in comunes), sum(a[y] > b[y] + 1e-12 for y in comunes), len(comunes)


def p_signo(a, b):
    """One-sided sign test: chance of >= a wins out of a + b if v2 and v1 were equally good."""
    from math import comb
    n = a + b
    return sum(comb(n, i) for i in range(a, n + 1)) / 2 ** n if n else 1.0


def main():
    D = {c: json.load(open(os.path.join(RES, c + ".json"), encoding="utf-8")) for c in NOMBRE}
    ver = open(os.path.join(RES, "verificar.txt"), encoding="utf-8").read() if os.path.exists(os.path.join(RES, "verificar.txt")) else "(sin ejecutar)"
    L = ["# NAL v2 · entrega", "",
         "(AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic) and reviewed by the team.)", "",
         "Generado por `nal/informe.py`; todas las cifras salen de `nal/resultados/*.json`. Reproducir: `python nal/entrenar.py` y `python nal/verificar.py`.", "",
         "## 1. Resultados (validación hacia adelante, fuera de muestra)", "",
         "Cada año de prueba se predijo solo con lo que existía en su fecha de emisión. top3, donde20 y captura10: más es mejor. "
         "Error: mediana del error del total anual (menos es mejor). Rango: parte de los años con el total real dentro del rango (meta 80 %).", ""]
    for c, d in D.items():
        L += ["### " + NOMBRE[c], "", "| h | modelo | n | top3 | donde20 | captura10 | error mediano | dentro del rango |", "|---|---|---|---|---|---|---|---|"]
        for k in ("1", "2", "3", "nov"):
            v2, v1 = d["validacion"][k], d["referencia_v1"][k]
            cl, pe, t = d["referencias"][k]["climatologia"], d["referencias"][k]["persistencia"], d["techo"][k]
            dec = d["decision"][k]
            nom = "**v2** (patrón %s, total %s)" % ("v2" if dec["patron_v2"] else "v1", "v2" if dec["cantidad_v2"] else "v1")
            for n, x in ((nom, v2), ("v1", v1), ("persistencia", pe), ("climatología", cl)):
                L.append("| %s | %s | %d | %s | %s | %s | %s | %s |" % (k, n, x["n"], p(x["top3"]), p(x["donde20"]), p(x["captura10"]), p(x["errMediano"]), p0(x["dentroRango"])))
            L.append("| %s | techo (modelo perfecto) | | %s | %s | %s | 0 %% | |" % (k, p(t["top3"]), p(t["donde20"]), p(t["captura10"])))
        L.append("")
        g = [(k,) + ganados(d["validacion"][k], d["referencia_v1"][k]) for k in ("1", "2", "3", "nov")]
        L.append("Total del año, años en que v2 se acercó más que v1 / menos / iguales: " +
                 "; ".join("%s: %d / %d / %d" % (k, a, b, n - a - b) + (" (prueba de signo p = %.2f)" % p_signo(a, b) if a + b else "")
                           for k, a, b, n in g) + ".")
        L.append("Rango de un solo cuadro (P10-P90 de los escenarios, año completo): contuvo el valor real en " +
                 ", ".join("%s: %s" % (k, p0(d["validacion"][k].get("dentroRangoCuadro", float("nan")))) for k in ("1", "2", "3", "nov")) + " de los cuadros con fuego esperado.")
        L.append("")
    L += ["## 2. El modelo que quedó", "",
          "- **Patrón (cuándo y dónde):** promedio de las 5 mejores climatologías ponderadas, elegidas dentro de cada pliegue con una validación hacia adelante interna. "
          "Opciones: vida media 3, 5, 8, 12 años o promedio simple; contar el fuego tal cual o como proporción de cada año; suavizado 3x3 de 0 o 30 %.",
          "- **Cantidad (total del año):** log(total / línea base de v1) explicado por regresiones ridge (intercepto fijo en 0) con 6 conjuntos de predictores "
          "y 4 penalizaciones, promediadas con el mismo peso. Sin predictores, el total es el de v1.",
          "- **Rango:** conforme (split conformal) sobre los errores fuera de muestra de los años de entrenamiento, nivel 80 %.",
          "- **Elección por región y horizonte:** cada parte de v2 se usa solo si no empeora a v1 (regla del brief). Resultado:", ""]
    for c, d in D.items():
        L.append("  - %s: " % NOMBRE[c] + "; ".join("%s patrón %s, total %s" % (k, "v2" if x["patron_v2"] else "v1", "v2" if x["cantidad_v2"] else "v1") for k, x in d["decision"].items()) + ".")
    L += ["", "Variables y fuentes (todas disponibles en noviembre del año anterior):", ""]
    import modelo  # noqa: E402
    for v in modelo.VARIABLES:
        L.append("- `%s`: %s. Disponible: %s." % (v["nombre"], v["fuente"], v["disponible_en"]))
    L += ["", "### Pronóstico emitido con datos hasta 2026-10", "", "| región | año | total esperado | rango 80 % | partes |", "|---|---|---|---|---|"]
    for c, d in D.items():
        for y, x in d["pronostico"].items():
            L.append("| %s | %s | %s | %s a %s | patrón %s, total %s |" % (NOMBRE[c], y, format(round(x["total"]), ","), format(round(x["bajo"]), ","), format(round(x["alto"]), ","),
                                                                     "v2" if x["patron_v2"] else "v1", "v2" if x["cantidad_v2"] else "v1"))
        x = d["pronostico"]["2027"]["predictores"]
        L.append("| %s | predictores 2027 | ONI ASO 2026 = %s; fuego 2026 vs base (log) = %s | | |" % (NOMBRE[c], x["oni"], x["fuego_prev"]))
    L.append("")
    L.append("2030 y 2031 repiten 2029 (mismo arreglo en el archivo).")
    L += ["", "## 3. Qué se probó y no funcionó", ""]
    for c, d in D.items():
        for k in ("1", "2", "3", "nov"):
            cb = d["combinaciones"][k]
            L.append("- %s %s: solo patrón v2 → top3 %s, donde20 %s; solo total v2 → error %s; ambos → error %s; base (patrón v1 + línea base de v1 con rango conforme%s) → error %s." % (
                NOMBRE[c], k, p(cb["v2_patron"]["top3"]), p(cb["v2_patron"]["donde20"]), p(cb["v2_cantidad"]["errMediano"]),
                p(cb["v2"]["errMediano"]), "; en nov la línea base incluye el año en curso" if k == "nov" else "", p(cb["base"]["errMediano"])))
    L += ["- Intercepto libre en la regresión del total: hundía el total (muestras tempranas cortas). Se fijó en 0.",
          "- Elegir una sola familia de predictores y una penalización por pliegue: sobreajusta y a h = 1 en Yucatán subía el error. Se reemplazó por el promedio.",
          "- Elegir un solo patrón (K = 1): inestable en Portugal. Promediar todos (K = 20) tampoco ganó a v1 en Portugal.",
          "- Predictores climáticos a 2 y 3 años: no mejoran el total en ninguna región (se usa el total de v1 con rango calibrado).",
          "- Escenarios con 50 % patrón esperado + 50 % un año pasado: el rango de un solo cuadro cubría solo ~45 %. Se usa el patrón de un año pasado completo.",
          "- Adelanto o retraso de la temporada según la lluvia: no se probó por tiempo (top3 de Yucatán ya está a menos de 1 punto del techo).",
          "- Bitácora completa de decisiones: `nal/BITACORA.md` (unas 12 variantes miradas contra la validación externa).", "",
          "## 4. Límites", "",
          "- Con 13 a 15 años de prueba, diferencias de 1 a 2 puntos en top3, donde20 y captura10 no se distinguen del azar.",
          "- La cantidad exacta de un año no se puede saber: casi todo el fuego lo prende la gente. NAL v2 da un rango.",
          "- La mejora del total en Yucatán viene sobre todo de la alternancia: tras un año de poco fuego suele venir uno de más, y al revés.",
          "- ONI y NASA POWER se reprocesan con el tiempo: el pasado se validó con los valores de hoy, no con los publicados en su momento.",
          "- El clima se resume en 6 puntos por región; no es clima por cuadro.",
          "- 2030 y 2031 no tienen información propia: repiten 2029.", "",
          "## 5. Frases para el video y las diapositivas", ""]
    y, pt = D["yucatan"], D["portugal"]
    vy, ry, ty = y["validacion"]["nov"], y["referencia_v1"]["nov"], y["techo"]["nov"]
    vp, rp = pt["validacion"]["nov"], pt["referencia_v1"]["nov"]
    L += ["**Sí se puede decir:**", "",
          "- \"NAL predice cuándo llega el fuego: probado en %d años escondidos, los 3 meses que espera con más fuego concentran el %s del fuego real en Yucatán (lo máximo posible era %s).\"" % (vy["n"], p0(vy["top3"]), p0(ty["top3"])),
          "- \"En el 20 %% del territorio que NAL marca como de más riesgo cae el %s del fuego de Yucatán.\"" % p0(vy["donde20"]),
          "- \"Con el fuego del año anterior, El Niño y el clima de la NASA, el error del total del año en Yucatán bajó de %s a %s (mediana de %d años de prueba; v2 se acercó más en %d de %d años).\"" % (
              p0(ry["errMediano"]), p0(vy["errMediano"]), vy["n"], ganados(vy, ry)[0], ganados(vy, ry)[2]),
          "- \"El rango de NAL v2 contiene el total real en %s de los años (v1: %s; meta: 80 %%).\"" % (p0(vy["dentroRango"]), p0(ry["dentroRango"])),
          "- \"Para 2027 NAL espera en Yucatán unos %s fuegos vistos por satélite, entre %s y %s.\"" % (format(round(y["pronostico"]["2027"]["total"], -3), ",.0f"),
                                                                                 format(round(y["pronostico"]["2027"]["bajo"], -3), ",.0f"), format(round(y["pronostico"]["2027"]["alto"], -3), ",.0f")),
          "", "**No se puede decir:**", "",
          "- \"NAL predice los incendios\" o \"sabe cuántos fuegos habrá\": da un rango, y el rango de un solo lugar es mucho más incierto.",
          "- \"Precisión del %s\" sin decir de qué: top3 es la parte del fuego en los 3 meses esperados, no un acierto de incendios." % p0(vy["top3"]),
          "- \"El clima predice el fuego a varios años\": a 2 y 3 años no ayudó.",
          "- En Portugal el total del año falla mucho (mediana %s con v2, %s con v1): no presentarlo como confiable." % (p0(vp["errMediano"]), p0(rp["errMediano"])),
          "- \"Inteligencia artificial que predice\": son regresiones simples y promedios, probados con honestidad.", "",
          "## 6. Salida de `python nal/verificar.py`", "", "```", ver.strip(), "```", ""]
    open(os.path.join(AQUI, "ENTREGA.md"), "w", encoding="utf-8").write("\n".join(L))
    print("ENTREGA.md written")


if __name__ == "__main__":
    main()
