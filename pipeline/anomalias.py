# AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
# and reviewed by the team. NASA Space Apps Challenge 2026.
"""Paso 3. Busca anomalías en la serie armonizada.

Para cada celda se calcula qué es "normal" con todos los demás años y se marcan
tres tipos de alerta en los meses recientes:
  - fuera_de_lugar:     fuego en una celda que casi nunca arde
  - fuera_de_temporada: fuego en un mes en que esa celda no suele arder
  - fuera_de_escala:    mucho más fuego del habitual para esa celda y ese mes
"""
import numpy as np

from . import config as C

MONTH = ["", "January", "February", "March", "April", "May", "June", "July",
         "August", "September", "October", "November", "December"]
NOMBRE_MES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
              "agosto", "septiembre", "octubre", "noviembre", "diciembre"]


def _centro(c):
    j, i = divmod(c, C.NX)
    return (round(C.LAT_MIN + (j + 0.5) * C.MALLA, 3), round(C.LON_MIN + (i + 0.5) * C.MALLA, 3))


def buscar(res):
    H, meses, parcial = res["H"], res["meses"], res["parcial"]
    T, NC = H.shape
    anios = np.array([a for a, _ in meses])
    mda = np.array([m for _, m in meses])
    completos = [a for a in sorted(set(anios)) if (anios == a).sum() == 12]
    revisar = [t for t in range(T) if not parcial[t]][-C.MESES_A_REVISAR:]
    alertas = []
    for t in revisar:
        a, m = meses[t]
        mismos = (mda == m) & (anios != a) & ~parcial
        otros_anios = [y for y in completos if y != a]
        if mismos.sum() < 5 or len(otros_anios) < 5:
            continue
        hist = H[mismos]                                   # [años, celdas] mismo mes, otros años
        anual = np.array([H[anios == y].sum(0) for y in otros_anios])
        med_mes = np.median(hist, 0)
        p90_mes = np.percentile(hist, 90, 0)
        med_anual = np.median(anual, 0)
        prom_anual = anual.mean(0)
        parte_mes = np.divide(hist.mean(0), prom_anual, out=np.zeros(NC), where=prom_anual > 0)
        for c in np.nonzero(H[t] >= C.MIN_DETECCIONES)[0]:
            x = float(H[t, c])
            tipo = None
            if med_anual[c] <= 2:
                tipo = "fuera_de_lugar"
                texto = (f"Esta zona casi nunca arde: en un año típico tiene {med_anual[c]:.0f} detecciones. "
                         f"En {NOMBRE_MES[m]} de {a} tuvo {x:.0f}.")
                text = (f"This area almost never burns: a typical year has {med_anual[c]:.0f} detections. "
                        f"In {MONTH[m]} {a} it had {x:.0f}.")
            elif med_mes[c] == 0 and parte_mes[c] < 0.02 and x >= 3 * p90_mes[c]:
                tipo = "fuera_de_temporada"
                texto = (f"En {NOMBRE_MES[m]} esta zona normalmente no arde (mediana histórica 0). "
                         f"En {NOMBRE_MES[m]} de {a} tuvo {x:.0f} detecciones.")
                text = (f"This area does not normally burn in {MONTH[m]} (historical median 0). "
                        f"In {MONTH[m]} {a} it had {x:.0f} detections.")
            elif x >= 2.5 * max(p90_mes[c], 4.0):
                tipo = "fuera_de_escala"
                texto = (f"{x:.0f} detecciones en {NOMBRE_MES[m]} de {a}; la mediana histórica de ese mes "
                         f"es {med_mes[c]:.0f} y 9 de cada 10 años no pasa de {p90_mes[c]:.0f}.")
                text = (f"{x:.0f} detections in {MONTH[m]} {a}; the historical median for that month "
                        f"is {med_mes[c]:.0f} and 9 out of 10 years stay at or below {p90_mes[c]:.0f}.")
            if tipo:
                lat, lon = _centro(int(c))
                alertas.append({
                    "tipo": tipo, "mes": f"{a}-{m:02d}", "celda": int(c), "lat": lat, "lon": lon,
                    "valor": round(x, 1), "mediana": round(float(med_mes[c]), 1),
                    "veces": round(x / max(float(med_mes[c]), 1.0), 1), "texto": texto, "text": text,
                    "p90": round(float(p90_mes[c]), 1), "anual": round(float(med_anual[c]), 1),
                })
    alertas.sort(key=lambda d: (-d["veces"], d["mes"]))
    print(f"  {len(alertas)} anomalías en los últimos {len(revisar)} meses: " +
          ", ".join(f"{k}={sum(1 for d in alertas if d['tipo'] == k)}"
                    for k in ("fuera_de_lugar", "fuera_de_temporada", "fuera_de_escala")))
    return alertas[:400]
