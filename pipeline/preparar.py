# AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
# and reviewed by the team. NASA Space Apps Challenge 2026.
"""Paso 1. Lee los CSV de FIRMS, filtra la región y cuenta detecciones por celda y mes.

Acepta los CSV de "yearly summary by country" de FIRMS y también los de la
descarga de archivo. Reconoce el sensor por el nombre del archivo (modis / viirs)
o por la columna `instrument`.
"""
import numpy as np
import pandas as pd

from . import config as C

COLUMNAS = ["latitude", "longitude", "acq_date", "acq_time", "satellite", "instrument",
            "confidence", "frp", "type", "daynight"]


def _sensor_de(nombre, df):
    n = nombre.lower()
    if "modis" in n or n.startswith(("mcd", "m6", "m-c6")):
        return "modis"
    if "viirs" in n or "snpp" in n or "j1v" in n or "sv-c2" in n:
        return "viirs"
    if "instrument" in df.columns:
        return "modis" if str(df["instrument"].iloc[0]).upper().startswith("MODIS") else "viirs"
    raise ValueError(f"No reconozco el sensor del archivo {nombre}")


def _limpiar(df, sensor, por_nombre="viirs_snpp"):
    df = df[(df["longitude"] >= C.LON_MIN) & (df["longitude"] < C.LON_MAX) &
            (df["latitude"] >= C.LAT_MIN) & (df["latitude"] < C.LAT_MAX)].copy()
    if df.empty:
        return df
    # type 0 = fuego en vegetación. 1 volcán, 2 fuente fija (industria), 3 mar.
    if "type" in df.columns:
        df = df[df["type"].fillna(0).astype(int) == 0]
    if "confidence" in df.columns:
        if sensor == "modis":
            df = df[pd.to_numeric(df["confidence"], errors="coerce").fillna(100) >= C.MODIS_CONFIANZA_MIN]
        else:
            df = df[~df["confidence"].astype(str).str.lower().isin(C.VIIRS_DESCARTAR)]
    sat = df["satellite"].astype(str).str.strip() if "satellite" in df.columns else pd.Series("", index=df.index)
    if sensor == "modis":
        df["sensor"] = np.where(sat.str.lower().str.startswith("t"), "modis_terra", "modis_aqua")
    else:
        # Se etiqueta cada satélite VIIRS por separado; después se usa uno solo
        # para no contar dos veces el mismo fuego.
        mapa = {"N": "viirs_snpp", "NPP": "viirs_snpp", "SNPP": "viirs_snpp",
                "N20": "viirs_n20", "1": "viirs_n20", "J1": "viirs_n20",
                "N21": "viirs_n21", "2": "viirs_n21", "J2": "viirs_n21"}
        df["sensor"] = sat.str.upper().map(mapa).fillna(por_nombre).values
    fecha = pd.to_datetime(df["acq_date"], errors="coerce")
    df = df[fecha.notna()]
    fecha = fecha[fecha.notna()]
    df["anio"] = fecha.dt.year.values
    df["mes"] = fecha.dt.month.values
    df["dia"] = fecha.dt.day.values
    i = np.floor((df["longitude"].values - C.LON_MIN) / C.MALLA).astype(int).clip(0, C.NX - 1)
    j = np.floor((df["latitude"].values - C.LAT_MIN) / C.MALLA).astype(int).clip(0, C.NY - 1)
    df["celda"] = j * C.NX + i
    for col in ("acq_time", "daynight", "confidence"):
        if col not in df.columns:
            df[col] = ""
    return df[["sensor", "anio", "mes", "dia", "celda", "frp", "latitude", "longitude",
               "acq_date", "acq_time", "confidence", "daynight"]]


def preparar():
    archivos = sorted(p for p in C.DIR_FIRMS.glob("*.csv"))
    if not archivos:
        raise FileNotFoundError(f"No hay CSV en {C.DIR_FIRMS}. Lean el README (sección Datos).")
    partes = []
    for p in archivos:
        cab = pd.read_csv(p, nrows=5)
        sensor = _sensor_de(p.name, cab)
        usar = [c for c in COLUMNAS if c in cab.columns]
        n_ = p.name.lower()
        por_nombre = ("viirs_n20" if any(k in n_ for k in ("jpss1", "noaa20", "noaa-20", "j1v")) else
                      "viirs_n21" if any(k in n_ for k in ("jpss2", "noaa21", "noaa-21", "j2v")) else "viirs_snpp")
        n = 0
        for trozo in pd.read_csv(p, usecols=usar, chunksize=400_000, low_memory=False):
            limpio = _limpiar(trozo, sensor, por_nombre)
            n += len(limpio)
            if len(limpio):
                partes.append(limpio)
        print(f"  {p.name}: {sensor}, {n:,} detecciones en la región")
    det = pd.concat(partes, ignore_index=True)
    det["frp"] = pd.to_numeric(det["frp"], errors="coerce").fillna(0.0)
    g = det.groupby(["sensor", "anio", "mes", "celda"])
    conteos = g.agg(n=("dia", "size"), dias=("dia", "nunique"), frp=("frp", "sum")).reset_index()
    C.DIR_SALIDA.mkdir(parents=True, exist_ok=True)
    conteos.to_csv(C.DIR_SALIDA / "conteos_celda_mes.csv", index=False)
    # Última fecha con datos de cada sensor (para saber si el último mes está completo)
    det["fecha"] = det["anio"] * 10000 + det["mes"] * 100 + det["dia"]
    ultimas = {s: int(v) for s, v in det.groupby("sensor")["fecha"].max().items()}
    import json
    (C.DIR_SALIDA / "fechas.json").write_text(json.dumps(ultimas))
    print(f"  Total: {len(det):,} detecciones -> {len(conteos):,} filas celda-mes")
    det.drop(columns=["fecha"]).to_parquet(C.DIR_SALIDA / "detecciones.parquet") if _hay_parquet() else \
        det.drop(columns=["fecha"]).to_pickle(C.DIR_SALIDA / "detecciones.pkl")
    return conteos, det


def _hay_parquet():
    try:
        import pyarrow  # noqa: F401
        return True
    except ImportError:
        return False


def leer_detecciones():
    """Detecciones ya filtradas (una fila por punto de calor), guardadas por preparar()."""
    p = C.DIR_SALIDA / "detecciones.parquet"
    return pd.read_parquet(p) if p.exists() else pd.read_pickle(C.DIR_SALIDA / "detecciones.pkl")
