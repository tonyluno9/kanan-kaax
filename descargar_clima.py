# AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
# and reviewed by the team. NASA Space Apps Challenge 2026.
"""Descarga el clima diario de NASA POWER para una región (lo usa la capa de riesgo).

    python descargar_clima.py              región yucatan, 2001 al año pasado
    python descargar_clima.py portugal

Fuente: https://power.larc.nasa.gov  (API diaria regional; un parámetro y máximo un año por petición).
Variables: temperatura de superficie máxima, temperatura del aire máxima, lluvia, humedad relativa,
humedad del suelo y viento. Resolución 0.5° x 0.625°. Tarda unos 3 minutos.
"""
import csv
import datetime
import json
import sys
import time
import urllib.request

from pipeline import config as C

PARAMS = ["TS_MAX", "T2M_MAX", "PRECTOTCORR", "RH2M", "GWETTOP", "WS2M"]
API = "https://power.larc.nasa.gov/api/temporal/daily/regional"


def main():
    clave = sys.argv[1] if len(sys.argv) > 1 else "yucatan"
    C.usar(clave)
    C.DIR_CLIMA.mkdir(parents=True, exist_ok=True)
    datos, puntos = {}, None
    ultimo = datetime.date.today().year - 1
    for anio in range(2001, ultimo + 1):
        for p in PARAMS:
            url = (f"{API}?community=AG&format=JSON&parameters={p}&start={anio}0101&end={anio}1231"
                   f"&latitude-min={C.LAT_MIN}&latitude-max={C.LAT_MAX}&longitude-min={C.LON_MIN}&longitude-max={C.LON_MAX}")
            for intento in range(3):
                try:
                    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=120) as r:
                        o = json.load(r)
                    break
                except Exception as e:
                    print(f"  reintento {anio} {p}: {e}")
                    time.sleep(3)
            else:
                raise SystemExit(f"No se pudo descargar {anio} {p}")
            if puntos is None:
                puntos = [(f["geometry"]["coordinates"][1], f["geometry"]["coordinates"][0]) for f in o["features"]]
            for i, f in enumerate(o["features"]):
                for d, v in f["properties"]["parameter"][p].items():
                    datos.setdefault((d, i), {})[p] = v
            time.sleep(0.15)
        print(f"  {anio} listo")
    salida = C.DIR_CLIMA / f"power_diario_{clave}_2001-{ultimo}.csv"
    with open(salida, "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["fecha", "lat", "lon"] + PARAMS)
        for (d, i) in sorted(datos):
            v = datos[(d, i)]
            w.writerow([f"{d[:4]}-{d[4:6]}-{d[6:]}", puntos[i][0], puntos[i][1]] + [v.get(p, "") for p in PARAMS])
    print(f"Listo: {salida}")


if __name__ == "__main__":
    main()
