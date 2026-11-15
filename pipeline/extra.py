# AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
# and reviewed by the team. NASA Space Apps Challenge 2026.
"""Paso 7. Dos análisis extra que se exportan a web/data/extra/<clave>.js.

1. Calendario oficial contra satélite. Cada región tiene una ventana oficial de quemas
   (config.CALENDARIO_OFICIAL): en Yucatán, la temporada en que la ley permite quemas
   agrícolas; en Portugal, el período crítico en que las quemas están prohibidas.
   Se cuenta qué parte del fuego armonizado dentro de esa zona cae dentro o fuera de la ventana.

2. ¿Quema agrícola o incendio? Las detecciones del satélite VIIRS usado se agrupan en
   eventos: dos detecciones son del mismo evento si están a menos de 1 km y a no más de
   1 día de distancia. Cada evento se clasifica por tamaño y duración (umbrales en config):
   pequeño y de un día (típico de quemas agrícolas o controladas), grande o largo (típico de
   incendios forestales) o intermedio. Es una estimación: un punto de calor no dice la causa.
"""
import json

import numpy as np
import pandas as pd

from . import config as C


def _dentro_poligono(lon, lat, anillos):
    """Regla par-impar con varios anillos (sirve para islas)."""
    dentro = np.zeros(len(lon), bool)
    for r in anillos:
        P = np.asarray(r, float)
        x0, y0 = P[:, 0], P[:, 1]
        x1, y1 = np.roll(x0, -1), np.roll(y0, -1)
        for a, b, c, d in zip(x0, y0, x1, y1):
            if b == d:
                continue
            cruza = (b > lat) != (d > lat)
            xc = (c - a) * (lat - b) / (d - b) + a
            dentro ^= cruza & (lon < xc)
    return dentro


def _doy(mmdd, anio=2001):
    return pd.Timestamp(f"{anio}-{mmdd}").dayofyear


def calendario_oficial(det, peso):
    cfg = C.CALENDARIO_OFICIAL.get(C.CLAVE)
    if not cfg:
        return None
    zona = json.loads((C.RAIZ / "pipeline" / "geo" / cfg["zona"]).read_text())
    lon, lat = det["longitude"].values.astype(float), det["latitude"].values.astype(float)
    en_zona = _dentro_poligono(lon, lat, zona["anillos"])
    fecha = pd.to_datetime(det["acq_date"].astype(str))
    doy = fecha.dt.dayofyear.values
    # Ventana por día del año, corrigiendo años bisiestos con mes-día
    md = fecha.dt.month.values * 100 + fecha.dt.day.values
    ini = int(cfg["inicio"].replace("-", "")); fin = int(cfg["fin"].replace("-", ""))
    en_ventana = (md >= ini) & (md <= fin)
    w = peso * en_zona
    anio = det["anio"].values
    por_anio = {}
    for a in range(int(anio.min()), int(anio.max()) + 1):
        m = anio == a
        tot = float(w[m].sum())
        if tot <= 0:
            continue
        por_anio[a] = {"dentro": round(float(w[m & en_ventana].sum()), 1), "total": round(tot, 1)}
    # Promedio por semana del año (solo años completos de la serie), para la gráfica
    sem = np.minimum((doy - 1) // 7, 51)
    completos = [a for a in por_anio if 2001 <= a <= int(anio.max())]
    ok = np.isin(anio, completos)
    semanas = np.bincount(sem[ok], weights=w[ok], minlength=52)[:52] / max(1, len(completos))
    total = sum(v["total"] for v in por_anio.values())
    dentro = sum(v["dentro"] for v in por_anio.values())
    print(f"  Calendario oficial ({zona['nombre']}): {dentro / total * 100:.1f}% del fuego dentro de la ventana")
    return {
        "tipo": cfg["tipo"], "inicio": cfg["inicio"], "fin": cfg["fin"],
        "zona": zona["nombre"], "zona_en": zona["nombre_en"], "anillos": zona["anillos"],
        "fuente": cfg["fuente"], "nota": cfg["nota"], "nota_en": cfg["nota_en"],
        "sem_ini": int((_doy(cfg["inicio"]) - 1) // 7), "sem_fin": int(min(51, (_doy(cfg["fin"]) - 1) // 7)),
        "por_anio": por_anio, "semanas": [round(float(v), 1) for v in semanas],
        "pct_dentro": round(dentro / total * 100, 1), "anios": completos,
    }, en_zona, en_ventana


class _Uniones:
    def __init__(self, n):
        self.p = np.arange(n)

    def raiz(self, i):
        p = self.p
        while p[i] != i:
            p[i] = p[p[i]]
            i = p[i]
        return i

    def unir(self, a, b):
        ra, rb = self.raiz(a), self.raiz(b)
        if ra != rb:
            self.p[max(ra, rb)] = min(ra, rb)


def eventos(det, viirs_usado):
    v = det[det["sensor"].astype(str) == viirs_usado].reset_index(drop=True)
    if v.empty:
        return None, None
    dia = pd.to_datetime(v["acq_date"].astype(str)).values.astype("datetime64[D]").astype(int)
    lat, lon = v["latitude"].values.astype(float), v["longitude"].values.astype(float)
    kx = np.cos(np.radians(lat.mean()))
    paso = 0.01                                   # cubeta de ~1.1 km
    gx = np.floor(lon * kx / paso).astype(int)
    gy = np.floor(lat / paso).astype(int)
    cubetas = {}
    for i, k in enumerate(zip(dia, gx, gy)):
        cubetas.setdefault(k, []).append(i)
    U = _Uniones(len(v))
    lim2 = (C.EVENTO_DIST_KM / 111.0) ** 2
    for (d, x, y), idx in cubetas.items():
        for dd in (0, -1):
            for ox in (-1, 0, 1):
                for oy in (-1, 0, 1):
                    otros = cubetas.get((d + dd, x + ox, y + oy))
                    if not otros:
                        continue
                    for i in idx:
                        for j in otros:
                            if j >= i and dd == 0:
                                continue
                            if ((lon[i] - lon[j]) * kx) ** 2 + (lat[i] - lat[j]) ** 2 <= lim2:
                                U.unir(i, j)
    ev = np.array([U.raiz(i) for i in range(len(v))])
    df = pd.DataFrame({"ev": ev, "dia": dia, "lat": lat, "lon": lon, "celda": v["celda"].values,
                       "anio": v["anio"].values, "mes": v["mes"].values})
    g = df.groupby("ev").agg(n=("dia", "size"), d0=("dia", "min"), d1=("dia", "max"),
                             lat=("lat", "mean"), lon=("lon", "mean"))
    g["dur"] = g["d1"] - g["d0"] + 1
    clase = np.where((g["n"] >= C.EVENTO_GRANDE_N) | (g["dur"] >= C.EVENTO_GRANDE_DIAS), 2,
                     np.where((g["n"] <= C.EVENTO_PEQ_N) & (g["dur"] == 1), 0, 1))
    g["clase"] = clase
    df["clase"] = g["clase"].reindex(df["ev"]).values
    resumen = {k: {"eventos": int((g["clase"] == i).sum()), "detecciones": int(g.loc[g["clase"] == i, "n"].sum())}
               for i, k in enumerate(["pequeno", "intermedio", "grande"])}
    print("  Eventos:", {k: v_["eventos"] for k, v_ in resumen.items()}, "detecciones:", {k: v_["detecciones"] for k, v_ in resumen.items()})
    # Por celda y mes: detecciones de cada clase (lista plana: celda, "AAAA-MM", peq, inter, grande)
    t = df.groupby(["celda", "anio", "mes", "clase"]).size().unstack(fill_value=0)
    for c in (0, 1, 2):
        if c not in t.columns:
            t[c] = 0
    plano = []
    for (celda, a, m), fila in t.iterrows():
        plano += [int(celda), f"{int(a)}-{int(m):02d}", int(fila[0]), int(fila[1]), int(fila[2])]
    # Eventos más grandes, para la lista de la página
    top = g[g["clase"] == 2].sort_values("n", ascending=False)
    base = np.datetime64("1970-01-01")
    lista = []
    for _, e in top.iterrows():
        i = int(np.floor((e["lon"] - C.LON_MIN) / C.MALLA)); j = int(np.floor((e["lat"] - C.LAT_MIN) / C.MALLA))
        lista.append([str(base + int(e["d0"])), str(base + int(e["d1"])), int(e["n"]), round(float(e["lat"]), 3),
                      round(float(e["lon"]), 3), int(min(max(j, 0), C.NY - 1) * C.NX + min(max(i, 0), C.NX - 1))])
    reglas = {"dist_km": C.EVENTO_DIST_KM, "peq_n": C.EVENTO_PEQ_N, "grande_n": C.EVENTO_GRANDE_N, "grande_dias": C.EVENTO_GRANDE_DIAS}
    return {"sensor": viirs_usado, "reglas": reglas, "resumen": resumen, "celda_mes": plano, "grandes": lista}, df


def calcular(det, peso, viirs_usado):
    out = {}
    ev, df_ev = eventos(det, viirs_usado)
    if ev:
        out["eventos"] = ev
    r = calendario_oficial(det, peso)
    if r:
        cal, en_zona, en_ventana = r
        # Cruce de las dos ideas: detecciones VIIRS en la zona, por clase, dentro y fuera de la ventana
        if ev:
            v = (det["sensor"].astype(str) == viirs_usado).values
            clases = df_ev["clase"].values
            z, vent = en_zona[v], en_ventana[v]
            cruce = {}
            for i, k in enumerate(["pequeno", "intermedio", "grande"]):
                m = (clases == i) & z
                cruce[k] = {"dentro": int((m & vent).sum()), "fuera": int((m & ~vent).sum())}
            cal["cruce_clases"] = cruce
        out["oficial"] = cal
    return out


def exportar(datos):
    carpeta = C.DIR_WEB / "extra"
    carpeta.mkdir(parents=True, exist_ok=True)
    texto = json.dumps(datos, separators=(",", ":"), ensure_ascii=False)
    (carpeta / f"{C.CLAVE}.js").write_text("window.EXTRA_LISTO(" + json.dumps(C.CLAVE) + "," + texto + ");\n", encoding="utf-8")
    print(f"  web/data/extra/{C.CLAVE}.js ({len(texto.encode()) / 1024:.0f} KB)")
