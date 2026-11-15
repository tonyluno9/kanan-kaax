"""
NAL v2 · download of public predictors (no API key needed).
AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic) and reviewed by the team.

Sources
- NASA POWER daily point API (https://power.larc.nasa.gov): rain (PRECTOTCORR), root-zone soil wetness (GWETROOT),
  daily max temperature (T2M_MAX) and relative humidity (RH2M), for 6 land points per region. Aggregated to months.
- NOAA CPC Oceanic Nino Index (https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt).

Run once: python nal/descargar_predictores.py   (writes nal/datos/*.csv; entrenar.py only reads those files)
"""
import datetime as dt
import io
import json
import os
import time
import urllib.request

import pandas as pd

AQUI = os.path.dirname(os.path.abspath(__file__))
DATOS = os.path.join(AQUI, "datos")
PUNTOS = {  # land points spread over each region (lon, lat)
    "yucatan": [(-90.5, 20.5), (-89.0, 20.8), (-88.0, 20.5), (-90.0, 19.0), (-89.0, 18.5), (-91.5, 18.3)],
    "portugal": [(-8.4, 41.6), (-7.3, 41.5), (-8.0, 40.2), (-7.0, 39.8), (-8.2, 38.4), (-7.2, 38.0)],
}
PARAM = "PRECTOTCORR,GWETROOT,T2M_MAX,RH2M"
FIN = "20261031"


def bajar(url, intentos=4):
    for i in range(intentos):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "nal-v2-research-script"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except Exception as e:  # network hiccup: wait and retry
            print("  retry", i + 1, e)
            time.sleep(5 * (i + 1))
    raise RuntimeError("download failed: " + url)


def power(region):
    filas = []
    for (lon, lat) in PUNTOS[region]:
        url = ("https://power.larc.nasa.gov/api/temporal/daily/point?parameters=" + PARAM +
               "&community=AG&longitude=%s&latitude=%s&start=20010101&end=%s&format=JSON" % (lon, lat, FIN))
        print(region, lon, lat)
        d = json.loads(bajar(url))["properties"]["parameter"]
        df = pd.DataFrame(d)
        df.index = pd.to_datetime(df.index, format="%Y%m%d")
        df = df.where(df > -900)  # -999 = missing
        m = pd.DataFrame({
            "PRECTOTCORR_mm": df["PRECTOTCORR"].resample("MS").sum(min_count=20),
            "GWETROOT": df["GWETROOT"].resample("MS").mean(),
            "T2M_MAX": df["T2M_MAX"].resample("MS").mean(),
            "RH2M": df["RH2M"].resample("MS").mean(),
            "dias": df["PRECTOTCORR"].resample("MS").count(),
        })
        m["lon"], m["lat"] = lon, lat
        filas.append(m)
        time.sleep(1.5)
    out = pd.concat(filas).reset_index(names="mes")
    out["mes"] = out["mes"].dt.strftime("%Y-%m")
    out.to_csv(os.path.join(DATOS, "power_mensual_%s.csv" % region), index=False, float_format="%.3f")


def oni():
    txt = bajar("https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt").decode()
    df = pd.read_csv(io.StringIO(txt), sep=r"\s+")
    df.columns = ["temporada", "anio", "total", "anom"]
    df.to_csv(os.path.join(DATOS, "oni.csv"), index=False)


if __name__ == "__main__":
    os.makedirs(DATOS, exist_ok=True)
    oni()
    for r in PUNTOS:
        power(r)
    with open(os.path.join(DATOS, "FUENTES.md"), "w", encoding="utf-8") as f:
        f.write("# Predictor sources (downloaded %s)\n\n" % dt.date.today().isoformat())
        f.write("- `power_mensual_<region>.csv`: NASA POWER daily point API, community AG, parameters %s, "
                "1 Jan 2001 to %s, aggregated to calendar months (rain summed, others averaged). "
                "https://power.larc.nasa.gov/api/temporal/daily/point\n" % (PARAM, FIN))
        f.write("- `oni.csv`: NOAA CPC Oceanic Nino Index (3-month running mean of ERSSTv5 Nino 3.4 anomalies). "
                "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt\n")
    print("ok")
