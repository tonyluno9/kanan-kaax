# AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
# and reviewed by the team. NASA Space Apps Challenge 2026.
"""Genera datos SINTÉTICOS con el mismo formato de los CSV de FIRMS.

Sirven solo para probar que el pipeline y la web funcionan antes de tener los
datos reales. NO son observaciones: no los usen en la entrega ni en el pitch.

Se simulan fuegos con temporada (pico en abril-mayo), zonas que arden más y
menos, años buenos y malos, y dos sensores que ven distinto: VIIRS detecta más
fuegos pequeños y da más píxeles por fuego que MODIS.
"""
import calendar
import json

import numpy as np
import pandas as pd

from . import config as C

DIR_PRUEBA = C.RAIZ / "datos" / "prueba"
ULTIMO = (2026, 10)


def generar(semilla=7):
    rng = np.random.default_rng(semilla)
    NC = C.NX * C.NY
    tierra = np.array(C.geo()["tierra"], float)
    jj, ii = np.divmod(np.arange(NC), C.NX)
    lon = C.LON_MIN + (ii + 0.5) * C.MALLA
    lat = C.LAT_MIN + (jj + 0.5) * C.MALLA
    base = rng.gamma(1.2, 1.0, NC) * tierra
    base *= 1 + 1.5 * np.exp(-((lon + 89.6) ** 2 + (lat - 19.3) ** 2) / 1.5)   # centro-sur arde más
    base[(lon < -90.5) & (lat < 18.75)] *= 0.01                                # zona húmeda: casi nunca
    base *= 9000 / base.sum()
    temporada = np.array([.02, .05, .16, .30, .27, .08, .02, .01, .01, .01, .02, .05])
    fuegos_chicos = np.array([1, 1, .9, .6, .6, .9, 1, 1, 1, 1, 1, 1])        # abril-mayo: quemas pequeñas
    factor_anio = {a: float(np.exp(rng.normal(0, .3))) for a in range(2000, 2027)}
    factor_anio[2024] = 1.9
    factor_anio[2009] = 1.5
    extra = {  # anomalías sembradas a propósito para probar el detector
        (2026, 3): (-91.1, 18.2, 25),     # zona húmeda donde casi nunca hay fuego
        (2025, 9): (-89.1, 20.9, 20),     # fuego en plena temporada de lluvias
    }
    filas = {"modis": {}, "viirs": {}}
    for a in range(2000, ULTIMO[0] + 1):
        for m in range(1, 13):
            if (a, m) < (2000, 11) or (a, m) > ULTIMO:
                continue
            lam = base * temporada[m - 1] * factor_anio[a]
            n = rng.poisson(lam)
            if (a, m) in extra:
                x, y, k = extra[(a, m)]
                c = int((y - C.LAT_MIN) // C.MALLA) * C.NX + int((x - C.LON_MIN) // C.MALLA)
                n[c] += k
            celda = np.repeat(np.arange(NC), n)
            ne = len(celda)
            if ne == 0:
                continue
            tam = rng.lognormal(0, .9, ne) * fuegos_chicos[m - 1]
            flon = C.LON_MIN + (celda % C.NX + rng.random(ne)) * C.MALLA
            flat = C.LAT_MIN + (celda // C.NX + rng.random(ne)) * C.MALLA
            dia = rng.integers(1, calendar.monthrange(a, m)[1] + 1, ne)
            for sensor, p_det, pix in (("viirs", 1 - np.exp(-3 * tam), 3 * tam),
                                       ("modis", 1 - np.exp(-.5 * tam ** 1.5), .5 * tam)):
                if sensor == "viirs" and (a, m) < (2012, 2):
                    continue
                visto = rng.random(ne) < p_det
                k = np.where(visto, 1 + rng.poisson(pix), 0)
                idx = np.repeat(np.arange(ne), k)
                nn = len(idx)
                if nn == 0:
                    continue
                paso = 0.004 if sensor == "viirs" else 0.01
                d = pd.DataFrame({
                    "latitude": np.round(flat[idx] + rng.normal(0, paso, nn), 5),
                    "longitude": np.round(flon[idx] + rng.normal(0, paso, nn), 5),
                    "acq_date": [f"{a}-{m:02d}-{x:02d}" for x in dia[idx]],
                    "acq_time": rng.integers(0, 2359, nn),
                    "frp": np.round(rng.lognormal(1.5, 1, nn), 1),
                    "daynight": "D", "type": 0, "scan": 1.0, "track": 1.0, "version": "sim",
                })
                if sensor == "modis":
                    d["satellite"] = np.where(rng.random(nn) < .4, "Terra", "Aqua")
                    if (a, m) < C.AQUA_INICIO:
                        d = d[d["satellite"] == "Terra"]
                    d["instrument"] = "MODIS"
                    d["confidence"] = rng.integers(0, 101, len(d))
                    d.loc[d["confidence"] < 30, "confidence"] = np.where(
                        rng.random((d["confidence"] < 30).sum()) < .25, 15, 60)
                    d["brightness"] = 320.0
                    d["bright_t31"] = 295.0
                else:
                    d["satellite"] = "N"
                    d["instrument"] = "VIIRS"
                    d["confidence"] = rng.choice(["l", "n", "h"], nn, p=[.08, .8, .12])
                    d["bright_ti4"] = 330.0
                    d["bright_ti5"] = 295.0
                filas[sensor].setdefault(a, []).append(d)
    DIR_PRUEBA.mkdir(parents=True, exist_ok=True)
    for viejo in DIR_PRUEBA.glob("*.csv"):
        viejo.unlink()
    total = 0
    for sensor, pref in (("modis", "modis"), ("viirs", "viirs-snpp")):
        for a, partes in filas[sensor].items():
            d = pd.concat(partes, ignore_index=True)
            d.to_csv(DIR_PRUEBA / f"{pref}_{a}_SINTETICO.csv", index=False)
            total += len(d)
    print(f"  Datos sintéticos: {total:,} detecciones simuladas en {DIR_PRUEBA}")
