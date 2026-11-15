"""
NAL v2 · train, validate and export.   Usage (from the quemas folder):  python nal/entrenar.py
AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic) and reviewed by the team.

1. Walk-forward validation (h = 1, 2, 3 and 'nov' = issued in November with data to October), with NAL v1,
   climatology and persistence as references and the ceiling of each metric.
2. For every region and horizon, each part of v2 (pattern, amount) is kept only if it does not do worse than v1
   (rule of the brief: first top3 and donde20, then the median error of the total). Otherwise v1's part is used.
3. Forecast issued with data up to 2026-10 for 2027-2029 (2030-2031 point to 2029), with scenarios, and the
   output files web/nal/<region>.js plus nal/resultados/<region>.json. Seeds are fixed; no network needed.
"""
import datetime as dt
import json
import math
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import modelo as Mo  # noqa: E402
import nucleo as N  # noqa: E402

HORIZONTES = [1, 2, 3, "nov"]
EMISION = N.mid(2026, 10)                       # last month of data of the public forecast
ANIOS_SALIDA = [2027, 2028, 2029, 2030, 2031]
LEAD = {2027: "nov", 2028: 2, 2029: 3}          # horizon whose validation backs each forecast year
S = 20                                          # scenarios per year
MEZCLA = 0.5                                    # scenario = expected pattern blended with a past year's pattern
SALIDA_WEB = os.path.join(N.RAIZ, "web", "nal")
SALIDA_RES = os.path.join(N.AQUI, "resultados")


def semilla(*xs):
    """Fixed seed from the labels (Python's hash() changes between runs, so it is not used)."""
    return int(sum((i + 1) * sum(map(ord, str(x))) for i, x in enumerate(xs)))


def escenarios(F, tierra, rng):
    """S plausible years: total from the spread of past forecast errors, pattern half expected, half a past year."""
    res = np.sort(F["res"])
    q = np.quantile(res, (np.arange(S) + 0.5) / S)
    rng.shuffle(q)
    H = F["H"]
    ys = sorted(H)
    elegidos = [ys[i % len(ys)] for i in rng.permutation(max(S, len(ys)))[:S]]
    out = []
    for s in range(S):
        A = H[elegidos[s]]
        t = A[tierra].sum()
        sh = np.zeros_like(F["P"])
        if t > 0:
            sh[tierra] = A[tierra] / t
        out.append(F["total"] * math.exp(q[s]) * ((1 - MEZCLA) * F["P"] + MEZCLA * sh))
    return np.stack(out)


def cobertura_cuadros(esc, real, tierra, E):
    """Share of land squares (with some expected fire) whose real yearly fire fell inside the scenario P10-P90."""
    anual = esc[:, tierra].sum(2)
    lo, hi = np.quantile(anual, 0.1, axis=0), np.quantile(anual, 0.9, axis=0)
    r = real[tierra].sum(1)
    m = E[tierra].sum(1) >= 1.0
    return float(np.mean((r[m] >= lo[m]) & (r[m] <= hi[m])))


def correr(R, h):
    """Every fold of one horizon: the four combinations of parts, plus the leak audit."""
    folds = []
    for y in N.anios_prueba(R, h):
        N.REGISTRO_VISTAS = []
        corte = N.corte_de(y, h)
        V = R.vista(corte)
        p = Mo.partes(V, h)
        auditoria = {"anio": y, "corte": N.txt_mid(corte), "ultimo_dato_max": N.txt_mid(max(u for _, u in N.REGISTRO_VISTAS)),
                     "vistas": len(N.REGISTRO_VISTAS), "corte_vistas_max": N.txt_mid(max(c for c, _ in N.REGISTRO_VISTAS)),
                     "oni_usado": N.txt_mid(N.mid(Mo.anio_clima(V), 10)), "clima_hasta": N.txt_mid(int(V.clima.index.max()))}
        N.REGISTRO_VISTAS = None
        folds.append({"anio": y, "p": p, "real": R.real(y), "audit": auditoria})
    return folds


def resumen(R, folds, h, usar_patron, usar_cantidad, con_escenarios=False):
    filas = []
    for f in folds:
        F = Mo.armar(f["p"], usar_patron, usar_cantidad)
        x = N.puntuar(F["E"], F["bajo"], F["alto"], f["real"], R.tierra, F["ant"])
        x["anio"] = f["anio"]
        if con_escenarios:
            esc = escenarios(F, R.tierra, np.random.default_rng(semilla(R.clave, h, f["anio"])))
            x["dentroCuadro"] = cobertura_cuadros(esc, f["real"], R.tierra, F["E"])
            tot = esc[:, R.tierra].sum((1, 2))
            x["dentroEscenarios"] = bool(np.quantile(tot, 0.1) <= x["real"] <= np.quantile(tot, 0.9))
        filas.append(x)
    out = N.resumir(filas, h)
    if con_escenarios:
        out["dentroRangoCuadro"] = float(np.mean([f["dentroCuadro"] for f in filas]))
        out["dentroEscenarios"] = float(np.mean([f["dentroEscenarios"] for f in filas]))
    return out


def decidir(c):
    """Brief's rule. Pattern v2 only if top3 and donde20 are not worse; amount v2 only if the median error is lower."""
    a, b = c["v2_patron"], c["base"]
    patron = a["top3"] >= b["top3"] - 1e-9 and a["donde20"] >= b["donde20"] - 1e-9
    cantidad = c["v2_cantidad"]["errMediano"] < b["errMediano"] - 1e-9
    return patron, cantidad


def r4(x):
    if isinstance(x, float):
        return round(x, 4)
    if isinstance(x, dict):
        return {k: r4(v) for k, v in x.items()}
    if isinstance(x, list):
        return [r4(v) for v in x]
    if isinstance(x, (np.floating,)):
        return round(float(x), 4)
    if isinstance(x, (np.bool_,)):
        return bool(x)
    return x


CLAVES = ["n", "anios", "top3", "donde20", "captura10", "errMediano", "errPersistencia", "errClimatologia", "dentroRango", "cuandoR"]
CLAVES_FILA = ["anio", "real", "esperado", "bajo", "alto", "dentro", "top3", "donde20", "captura10"]


def contrato(v, clim):
    o = {k: v[k] for k in CLAVES if k in v}
    o["errClimatologia"] = clim["errMediano"]
    for k in ("dentroRangoCuadro", "dentroEscenarios"):
        if k in v:
            o[k] = v[k]
    o["filas"] = [{k: f[k] for k in CLAVES_FILA} for f in v["filas"]]
    return r4(o)


def matriz_js(A):
    return [[(int(v) if v == int(v) else v) for v in fila] for fila in np.round(np.maximum(A, 0), 1).tolist()]


def ficha(clave, dec, val, ref, tch):
    v, r = val["nov"], ref["nov"]
    pct = lambda x: "%.0f %%" % (100 * x)
    usa_c = dec["nov"][1]
    es = {
        "que_usa": ("Aprende del registro de fuego de 2001 a 2026 (MODIS y VIIRS armonizados): en qué cuadros y meses suele haber fuego, "
                    "dando más peso a los años recientes. " +
                    ("Para la cantidad del año también usa el fuego del año anterior, El Niño (índice ONI de NOAA) y la lluvia, la humedad del suelo "
                     "y el calor de NASA POWER de la temporada anterior." if usa_c else
                     "Para la cantidad del año se queda con el promedio de los años pasados: el clima no mejoró la predicción aquí.")),
        "como_se_probo": ("Se escondió cada año de prueba y se predijo solo con lo que existía en noviembre del año anterior. "
                          "Así se hizo con %d años. El modelo acertó %s del fuego en sus 3 meses de más fuego; el máximo posible era %s. "
                          "El total del año falló en una mediana de %s (el modelo anterior: %s). "
                          "El rango contuvo el total real en %s de los años." % (
                              v["n"], pct(v["top3"]), pct(tch["top3"]), pct(v["errMediano"]), pct(r["errMediano"]), pct(v["dentroRango"]))),
        "limites": ("Dice bien cuándo y dónde suele haber fuego. La cantidad exacta de un año no se puede saber: casi todos los fuegos los "
                    "prende la gente. Para 2030 y 2031 se repite el pronóstico de 2029: no hay datos que digan más. "
                    "El rango de un solo cuadro es más incierto que el de toda la región."),
    }
    en = {
        "que_usa": ("It learns from the 2001-2026 fire record (harmonized MODIS and VIIRS): which squares and months usually burn, "
                    "with more weight on recent years. " +
                    ("For the amount of the year it also uses last year's fire, El Nino (NOAA ONI index) and NASA POWER rain, soil "
                     "wetness and heat of the season before." if usa_c else
                     "For the amount of the year it keeps the average of past years: climate did not improve the forecast here.")),
        "como_se_probo": ("Each test year was hidden and forecast only with what existed in November of the year before. "
                          "This was done for %d years. The 3 months it expected the most fire in held %s of the fire; the best possible was %s. "
                          "The yearly total was off by a median %s (previous model: %s). "
                          "The range held the real total in %s of the years." % (
                              v["n"], pct(v["top3"]), pct(tch["top3"]), pct(v["errMediano"]), pct(r["errMediano"]), pct(v["dentroRango"]))),
        "limites": ("It says well when and where fire usually happens. The exact amount of one year cannot be known: most fires are "
                    "started by people. 2030 and 2031 repeat the 2029 forecast: there is no data that says more. "
                    "The range of a single square is less certain than the range of the whole region."),
    }
    return {"es": es, "en": en}


def main():
    t0 = time.time()
    os.makedirs(SALIDA_WEB, exist_ok=True)
    os.makedirs(SALIDA_RES, exist_ok=True)
    tabla = {}
    for clave in N.REGIONES:
        R = N.Region(clave)
        val, ref, refs, dec, comb, aud, tch = {}, {}, {}, {}, {}, {}, {}
        for h in HORIZONTES:
            k = str(h)
            folds = correr(R, h)
            aud[k] = [f["audit"] for f in folds]
            c = {"v2": resumen(R, folds, h, True, True), "v2_patron": resumen(R, folds, h, True, False),
                 "v2_cantidad": resumen(R, folds, h, False, True), "base": resumen(R, folds, h, False, False)}
            dec[k] = decidir(c)
            val_h = resumen(R, folds, h, dec[k][0], dec[k][1], con_escenarios=True)
            clim = N.validar(R, N.climatologia, h)
            v1 = N.validar(R, N.v1, h)
            pers = N.validar(R, N.persistencia, h)
            val[k] = contrato(val_h, clim)
            ref[k] = contrato(v1, clim)
            refs[k] = {"climatologia": contrato(clim, clim), "persistencia": contrato(pers, clim)}
            comb[k] = {n: r4({q: x[q] for q in ("top3", "donde20", "captura10", "errMediano", "dentroRango", "cuandoR")}) for n, x in c.items()}
            tch[k] = r4(N.techo_region(R, h))
            print("%-8s h=%-3s v2 top3 %.1f donde20 %.1f cap10 %.1f err %.1f rango %.0f | v1 %.1f %.1f %.1f %.1f %.0f | parts %s  (%.0fs)" % (
                clave, k, *(100 * val[k][q] for q in ("top3", "donde20", "captura10", "errMediano", "dentroRango")),
                *(100 * ref[k][q] for q in ("top3", "donde20", "captura10", "errMediano", "dentroRango")),
                ("pattern v2" if dec[k][0] else "pattern v1") + ", " + ("amount v2" if dec[k][1] else "amount v1"), time.time() - t0))
        # ---------------------------------------------------------------- the public forecast
        N.REGISTRO_VISTAS = []
        V = R.vista(EMISION)
        esperado, escen, info = {}, {}, {}
        for y, h in LEAD.items():
            p = Mo.partes(V, h)
            up, uc = dec[str(h)]
            F = Mo.armar(p, up, uc)
            esperado[str(y)] = F["E"]
            escen[str(y)] = escenarios(F, R.tierra, np.random.default_rng(semilla(clave, "salida", y)))
            info[str(y)] = {"total": float(F["total"]), "bajo": float(F["bajo"]), "alto": float(F["alto"]), "lead": str(h),
                            "patron_v2": up, "cantidad_v2": uc, "predictores": {a: (None if b != b else round(float(b), 4)) for a, b in p["x"].items()},
                            "base": float(p["base"]), "zhat": float(p["C2"]["zhat"])}
        aud["salida"] = {"corte": N.txt_mid(EMISION), "ultimo_dato_max": N.txt_mid(max(u for _, u in N.REGISTRO_VISTAS))}
        N.REGISTRO_VISTAS = None
        partes_txt = lambda k: ("pattern " + ("v2" if dec[k][0] else "v1") + " + amount " + ("v2" if dec[k][1] else "v1"))
        d = {
            "version": "2.0", "generado": dt.date.today().isoformat(),
            "modelo": ("NAL v2. Pattern (when+where): average of the 5 best weighted climatologies chosen by nested walk-forward "
                       "(half-life, per-year normalisation, 3x3 smoothing). Amount: average of ridge regressions of log(total/baseline) on "
                       "last year's fire, ONI (Aug-Oct) and NASA POWER rain, soil wetness and heat (Jun-Oct). Split-conformal 80%% range. "
                       "2027 = %s; 2028 = %s; 2029 = %s." % (partes_txt("nov"), partes_txt("2"), partes_txt("3"))),
            "emitido_con_datos_hasta": N.txt_mid(EMISION),
            "anios": ANIOS_SALIDA,
            "validacion": val, "referencia_v1": ref, "techo": tch["nov"],
            "variables": Mo.VARIABLES,
            "ficha": ficha(clave, dec, val, ref, tch["nov"]),
            "resumen_pronostico": r4(info),
        }
        js = ["/*", "  NAL v2 forecast for %s. Generated by nal/entrenar.py on %s. Do not edit by hand." % (clave, d["generado"]),
              "  AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic) and reviewed by the team.",
              "  esperado[year][cell][month]: expected fire (VIIRS-equivalent detections), cells in the order of QUEMAS.serie.",
              "  escenarios[year][s][cell][month]: %d plausible years; sum any cells and take P10/P90 of the sums." % S,
              "  2030 and 2031 point to the 2029 arrays (no predictor reaches that far).", "*/",
              "window.NAL_V2 = window.NAL_V2 || {};"]
        d2 = dict(d)
        d2["esperado"] = {y: matriz_js(A) for y, A in esperado.items()}
        d2["escenarios"] = {y: [matriz_js(A) for A in E] for y, E in escen.items()}
        js.append('window.NAL_V2["%s"] = %s;' % (clave, json.dumps(d2, ensure_ascii=False, separators=(",", ":"))))
        js.append('(function (d) { d.esperado["2030"] = d.esperado["2031"] = d.esperado["2029"]; '
                  'd.escenarios["2030"] = d.escenarios["2031"] = d.escenarios["2029"]; })(window.NAL_V2["%s"]);' % clave)
        with open(os.path.join(SALIDA_WEB, clave + ".js"), "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(js) + "\n")
        res = {"region": clave, "decision": {k: {"patron_v2": a, "cantidad_v2": b} for k, (a, b) in dec.items()},
               "combinaciones": comb, "referencias": refs, "techo": tch, "auditoria": aud, "pronostico": r4(info),
               "validacion": val, "referencia_v1": ref}
        with open(os.path.join(SALIDA_RES, clave + ".json"), "w", encoding="utf-8") as f:
            json.dump(res, f, ensure_ascii=False, indent=1)
        tabla[clave] = res
        print("%-8s forecast 2027 total %.0f (%.0f - %.0f); file %.2f MB" % (
            clave, info["2027"]["total"], info["2027"]["bajo"], info["2027"]["alto"], os.path.getsize(os.path.join(SALIDA_WEB, clave + ".js")) / 1e6))
    print("done in %.0f s" % (time.time() - t0))


if __name__ == "__main__":
    main()
