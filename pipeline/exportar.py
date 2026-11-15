# AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
# and reviewed by the team. NASA Space Apps Challenge 2026.
"""Paso final. Escribe los archivos que lee la página web (sin servidor)."""
import datetime
import json

import numpy as np

from . import config as C

SAT = {"modis_terra": "Terra", "modis_aqua": "Aqua", "viirs_snpp": "SNPP", "viirs_n20": "NOAA-20", "viirs_n21": "NOAA-21"}


def exportar(res, validacion, alertas, sintetico, riesgo=None, areas=None):
    H = res["H"]
    geo = C.geo()
    es_viirs = np.array([o == "viirs" for o in res["origen"]])
    crudo = np.where(es_viirs[:, None], res["V"], res["M"])
    datos = {
        "meta": {
            "clave": C.CLAVE, "region": C.REGION, "region_en": C.REGIONES[C.CLAVE].get("nombre_en", C.REGION), "region_en": C.REGIONES[C.CLAVE].get("nombre_en", C.REGION),
            "bbox": [C.LON_MIN, C.LAT_MIN, C.LON_MAX, C.LAT_MAX],
            "malla": C.MALLA, "nx": C.NX, "ny": C.NY,
            "sintetico": bool(sintetico),
            "generado": datetime.date.today().isoformat(),
            "unidad": "detecciones equivalentes VIIRS (375 m)", "unidad_en": "VIIRS-equivalent detections (375 m)",
        },
        "meses": [f"{a}-{m:02d}" for a, m in res["meses"]],
        "origen": list(res["origen"]),
        "parcial": [bool(p) for p in res["parcial"]],
        "tierra": geo["tierra"],
        "costa": geo["costa"],
        # serie[celda] = lista de valores por mes (1 decimal)
        "serie": [[round(float(v), 1) for v in H[:, c]] for c in range(H.shape[1])],
        # crudo[celda] = el registro sin armonizar: MODIS tal cual hasta que empieza VIIRS, y VIIRS después
        "crudo": [[round(float(v)) for v in crudo[:, c]] for c in range(H.shape[1])],
        "validacion": validacion,
        "anomalias": alertas,
        "riesgo": riesgo,
        "areas": areas,
        "evidencia": _evidencia(),
    }
    C.DIR_WEB.mkdir(parents=True, exist_ok=True)
    texto = json.dumps(datos, ensure_ascii=False, separators=(",", ":"))
    (C.DIR_WEB / f"{C.CLAVE}.js").write_text("window.QUEMAS=" + texto + ";\n", encoding="utf-8")
    print(f"  web/data/{C.CLAVE}.js ({len(texto) / 1024:.0f} KB), {len(datos['meses'])} meses, {H.shape[1]} celdas")


def _evidencia():
    """Casos comprobados con imágenes (web/data/evidencia/<clave>.json), si existen."""
    p = C.DIR_WEB / "evidencia" / f"{C.CLAVE}.json"
    return json.loads(p.read_text()) if p.exists() else None


def exportar_semanal(det, peso):
    """Detecciones armonizadas por celda y semana, un archivo por región, para la reproducción animada.

    Formato: por año, una lista plana [semana, celda, valor*10, ...] solo con valores distintos de cero.
    """
    fecha = det["acq_date"].astype(str)
    doy = np.array([int(x) for x in __import__("pandas").to_datetime(fecha).dt.dayofyear])
    sem = np.minimum((doy - 1) // 7, 51)
    ok = peso > 0
    anio = det["anio"].values
    out = {}
    import pandas as pd
    df = pd.DataFrame({"a": anio[ok], "s": sem[ok], "c": det["celda"].values[ok], "w": peso[ok]})
    g = df.groupby(["a", "s", "c"])["w"].sum().reset_index()
    for a, d in g.groupby("a"):
        v = np.round(d["w"].values * 10).astype(int)
        keep = v > 0
        trip = np.column_stack([d["s"].values[keep], d["c"].values[keep], v[keep]]).ravel()
        out[int(a)] = [int(x) for x in trip]
    carpeta = C.DIR_WEB / "semanal"
    carpeta.mkdir(parents=True, exist_ok=True)
    texto = json.dumps(out, separators=(",", ":"))
    (carpeta / f"{C.CLAVE}.js").write_text("window.SEMANAL_LISTO(" + json.dumps(C.CLAVE) + "," + texto + ");\n")
    print(f"  web/data/semanal/{C.CLAVE}.js ({len(texto) / 1024:.0f} KB), {len(out)} años")


def exportar_puntos(det):
    """Un archivo por año con las detecciones individuales, para el CSV de la búsqueda."""
    carpeta = C.DIR_WEB / "puntos"
    carpeta.mkdir(parents=True, exist_ok=True)
    for viejo in carpeta.glob(f"{C.CLAVE}_*.js"):
        viejo.unlink()
    total = 0
    for anio, d in det.groupby("anio"):
        filas = [f"{la:.4f},{lo:.4f},{f},{str(t).zfill(4)},{SAT.get(s, s)},{c},{frp:g},{dn},{ce}"
                 for la, lo, f, t, s, c, frp, dn, ce in zip(d["latitude"], d["longitude"], d["acq_date"], d["acq_time"],
                                                            d["sensor"], d["confidence"], d["frp"], d["daynight"], d["celda"])]
        (carpeta / f"{C.CLAVE}_{anio}.js").write_text(
            "window.PUNTOS_LISTO(" + json.dumps(C.CLAVE) + "," + str(int(anio)) + "," + json.dumps("\n".join(filas)) + ");\n")
        total += len(filas)
    print(f"  web/data/puntos/: {total:,} detecciones individuales en {det['anio'].nunique()} archivos")


def exportar_indice(claves):
    """Lista de regiones disponibles para el selector de la página."""
    regiones = [{"clave": k, "nombre": C.REGIONES[k]["nombre"], "nombre_en": C.REGIONES[k].get("nombre_en", C.REGIONES[k]["nombre"])}
                for k in claves]
    (C.DIR_WEB / "regiones.js").write_text("window.REGIONES=" + json.dumps(regiones, ensure_ascii=False) + ";\n", encoding="utf-8")
