# AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
# and reviewed by the team. NASA Space Apps Challenge 2026.
"""Fuego dentro de áreas protegidas.

Límites: World Database on Protected Areas (WDPA, UNEP-WCMC e IUCN), solo designaciones
nacionales y terrestres o costeras de al menos 100 km² de tierra (datos/areas/wdpa_<clave>.geojson).
Cada punto de calor se asigna a las áreas que lo contienen y se suma con su peso armonizado,
así que la serie de cada área está en la misma escala que el resto de la herramienta.
"""
import json

import numpy as np
from matplotlib.path import Path

from . import config as C

EXCLUIR = ("ZIC", "ZEPA/ZEC")           # duplicados de Natura 2000 en Andalucía


def _poligonos(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon":
        return geom["coordinates"]
    return []


def _leer():
    p = C.RAIZ / "datos" / "areas" / f"wdpa_{C.CLAVE}.geojson"
    if not p.exists():
        return []
    fc = json.loads(p.read_text())
    areas = {}
    for f in fc.get("features", []):
        pr = f["properties"]
        if any(x in (pr.get("desig") or "") for x in EXCLUIR):
            continue
        k = pr["site_id"]
        a = areas.setdefault(k, {"id": int(k), "nombre": pr["name"], "nombre_en": pr.get("name_eng") or pr["name"],
                                 "desig": pr.get("desig") or "", "desig_en": pr.get("desig_eng") or pr.get("desig") or "",
                                 "pais": pr.get("iso3"), "km2": 0.0, "polis": []})
        a["km2"] += float(pr.get("gis_area") or 0) - float(pr.get("gis_m_area") or 0)
        a["polis"] += _poligonos(f["geometry"])
    return list(areas.values())


def _dentro(lon, lat, polis):
    res = np.zeros(len(lon), bool)
    for anillos in polis:
        ext = np.array(anillos[0])
        x0, y0 = ext.min(0)
        x1, y1 = ext.max(0)
        caja = (lon >= x0) & (lon <= x1) & (lat >= y0) & (lat <= y1) & ~res
        if not caja.any():
            continue
        pts = np.column_stack([lon[caja], lat[caja]])
        d = Path(ext).contains_points(pts)
        for hueco in anillos[1:]:
            d &= ~Path(np.array(hueco)).contains_points(pts)
        res[np.nonzero(caja)[0][d]] = True
    return res


def _simplificar(anillo, paso=0.004):
    """Quita vértices muy juntos para que el contorno pese poco en la página."""
    out = [anillo[0]]
    for x, y in anillo[1:]:
        if abs(x - out[-1][0]) + abs(y - out[-1][1]) >= paso:
            out.append([x, y])
    return [[round(x, 3), round(y, 3)] for x, y in out] if len(out) >= 4 else None


def calcular(det, peso, res):
    areas = _leer()
    if not areas:
        print(f"  (sin límites de áreas protegidas para {C.CLAVE}; se omite)")
        return None
    meses = [tuple(m) for m in res["meses"]]
    T = len(meses)
    idx = {m: i for i, m in enumerate(meses)}
    t = np.array([idx.get((a, m), -1) for a, m in zip(det["anio"].values, det["mes"].values)])
    lon, lat = det["longitude"].values, det["latitude"].values
    usar = (peso > 0) & (t >= 0)
    en_alguna = np.zeros(len(det), bool)
    anios = np.array([a for a, _ in meses])
    mda = np.array([m for _, m in meses])
    parcial = np.array(res["parcial"], bool)
    completos = [a for a in sorted(set(anios)) if (anios == a).sum() == 12 and not parcial[anios == a].any()]
    salida = []
    for a in areas:
        d = _dentro(lon, lat, a["polis"]) & usar
        en_alguna |= d
        serie = np.zeros(T)
        np.add.at(serie, t[d], peso[d])
        anual = {y: float(serie[anios == y].sum()) for y in completos}
        ult = completos[-1]
        prev = [anual[y] for y in completos[:-1]]
        med = float(np.median(prev)) if prev else 0.0
        orden = sorted(anual.values(), reverse=True)
        lugar = orden.index(anual[ult]) + 1
        # meses fuera de escala en los últimos 36 meses
        alertas = []
        for i in [k for k in range(T) if not parcial[k]][-C.MESES_A_REVISAR:]:
            m = mda[i]
            hist = serie[(mda == m) & (anios != anios[i]) & ~parcial]
            if len(hist) < 5:
                continue
            p90 = float(np.percentile(hist, 90))
            if serie[i] >= C.MIN_DETECCIONES and serie[i] >= 2.5 * max(p90, 4.0):
                alertas.append({"mes": f"{meses[i][0]}-{meses[i][1]:02d}", "valor": round(float(serie[i]), 1),
                                "mediana": round(float(np.median(hist)), 1), "p90": round(p90, 1)})
        anillos = []
        for polis in a["polis"]:
            s = _simplificar(polis[0])
            if s:
                anillos.append(s)
        salida.append({
            "id": a["id"], "nombre": a["nombre"], "nombre_en": a["nombre_en"], "desig": a["desig"], "desig_en": a["desig_en"],
            "pais": a["pais"], "km2": round(a["km2"]), "anillos": anillos,
            "serie": [round(float(v), 1) for v in serie],
            "ultimo_anio": int(ult), "ultimo": round(anual[ult]), "mediana_anual": round(med),
            "veces": round(anual[ult] / med, 2) if med > 0 else None, "lugar": lugar, "anios": len(completos),
            "por_km2": round(float(np.mean(list(anual.values()))) / max(a["km2"], 1), 2),
            "alertas": alertas,
        })
    salida = [s for s in salida if any(v > 0 for v in s["serie"])]
    salida.sort(key=lambda s: -sum(s["serie"]))
    # parte del fuego de la región que cae dentro de alguna área protegida, por año
    total = np.zeros(T)
    np.add.at(total, t[usar], peso[usar])
    dentro = np.zeros(T)
    np.add.at(dentro, t[en_alguna], peso[en_alguna])
    pct = {int(y): round(float(dentro[anios == y].sum() / max(total[anios == y].sum(), 1) * 100), 1) for y in completos}
    print(f"  {len(salida)} áreas protegidas con fuego; dentro de áreas protegidas: "
          f"{pct[completos[-1]]}% del fuego de {completos[-1]} (mediana {np.median(list(pct.values())):.1f}%)")
    top = sorted([s for s in salida if s["veces"]], key=lambda s: -s["veces"])[:3]
    for s in top:
        print(f"    {s['nombre']}: {s['ultimo']} en {s['ultimo_anio']}, {s['veces']} veces su mediana, lugar {s['lugar']} de {s['anios']}")
    return {"fuente": "WDPA (UNEP-WCMC e IUCN), versión de octubre de 2026", "areas": salida, "pct_dentro": pct}
