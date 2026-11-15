# AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
# and reviewed by the team. NASA Space Apps Challenge 2026.
"""Paso 4. Riesgo térmico: ¿ayudan el calor y la sequedad a anticipar el fuego de la semana siguiente?

Datos:
  - Clima diario de NASA POWER (datos/clima/<clave>/*.csv): temperatura de superficie máxima,
    temperatura del aire máxima, lluvia, humedad relativa, humedad del suelo y viento.
    Resolución: 0.5° x 0.625° (unos 55 x 65 km). Cada celda toma el punto POWER más cercano.
  - Detecciones VIIRS por celda y semana (objetivo) y MODIS (calendario histórico de fuego).

Para cada celda y cada semana se estima la probabilidad de que haya al menos una detección,
usando solo información disponible hasta la semana anterior. Se comparan tres modelos:
  A. calendario:  solo la costumbre histórica de esa celda en esa época del año
  B. + fuego reciente: además, si hubo fuego la semana anterior en la celda y sus vecinas
  C. + clima: además, anomalía térmica, lluvia, racha seca, humedad y viento
Se entrena con las semanas hasta 2022 y se prueba con 2023 en adelante.

Importante: el calor no enciende el fuego (casi siempre lo inicia una persona). Lo que estas
variables indican es qué tan lista está la vegetación para arder.
"""
import datetime

import numpy as np
import pandas as pd

from . import config as C

EPOCA = datetime.date(2001, 1, 1)
PARAMS = ["TS_MAX", "T2M_MAX", "PRECTOTCORR", "RH2M", "GWETTOP", "WS2M"]
ULTIMO_ANIO_ENTRENAMIENTO = 2022
NOMBRES = {
    "clima_fuego": "Costumbre histórica de fuego en esa época",
    "fuego_previo": "Fuego la semana anterior en la celda",
    "fuego_vecinos": "Fuego la semana anterior en celdas vecinas",
    "z_ts": "Anomalía térmica de la semana (superficie más caliente de lo normal)",
    "z_ts4": "Anomalía térmica de las últimas 4 semanas",
    "z_suelo": "Suelo más húmedo de lo normal (últimas 6 semanas)",
    "z_hr": "Aire más húmedo de lo normal (últimas 4 semanas)",
    "z_lluvia": "Más lluvia de lo normal (últimas 8 semanas)",
    "ts": "Temperatura de superficie máxima",
    "lluvia30": "Lluvia de los últimos 28 días",
    "racha_seca": "Días seguidos sin lluvia",
    "humedad": "Humedad relativa del aire",
    "suelo": "Humedad del suelo",
    "viento": "Viento",
}


def _auc(y, p):
    orden = np.argsort(p, kind="mergesort")
    rangos = np.empty(len(p))
    rangos[orden] = np.arange(1, len(p) + 1)
    # empates: rango promedio
    ps = p[orden]
    i = 0
    while i < len(ps):
        j = i
        while j + 1 < len(ps) and ps[j + 1] == ps[i]:
            j += 1
        if j > i:
            rangos[orden[i:j + 1]] = (i + j + 2) / 2
        i = j + 1
    n1 = y.sum()
    n0 = len(y) - n1
    return float((rangos[y == 1].sum() - n1 * (n1 + 1) / 2) / (n1 * n0)) if n1 and n0 else float("nan")


class Logistica:
    """Regresión logística con numpy (variables estandarizadas, un poco de regularización)."""

    def ajustar(self, X, y, iteraciones=50, ridge=1.0):
        self.mu, self.sd = X.mean(0), X.std(0) + 1e-9
        Z = np.column_stack([np.ones(len(X)), (X - self.mu) / self.sd])
        b = np.zeros(Z.shape[1])
        R = ridge * np.eye(Z.shape[1])
        R[0, 0] = 0
        for _ in range(iteraciones):
            p = 1 / (1 + np.exp(-np.clip(Z @ b, -30, 30)))
            w = np.clip(p * (1 - p), 1e-6, None)
            nuevo = np.linalg.solve((Z.T * w) @ Z + R, (Z.T * w) @ (Z @ b + (y - p) / w))
            if np.max(np.abs(nuevo - b)) < 1e-7:
                b = nuevo
                break
            b = nuevo
        self.b = b
        return self

    def predecir(self, X):
        Z = np.column_stack([np.ones(len(X)), (X - self.mu) / self.sd])
        return 1 / (1 + np.exp(-np.clip(Z @ self.b, -30, 30)))


def _clima_semanal():
    archivos = sorted(C.DIR_CLIMA.glob("*.csv")) if C.DIR_CLIMA.exists() else []
    if not archivos:
        return None
    cl = pd.concat([pd.read_csv(a) for a in archivos], ignore_index=True)
    cl["dia"] = (pd.to_datetime(cl["fecha"]) - pd.Timestamp(EPOCA)).dt.days
    cl = cl[cl["dia"] >= 0]
    puntos = cl[["lat", "lon"]].drop_duplicates().sort_values(["lat", "lon"]).reset_index(drop=True)
    puntos["p"] = np.arange(len(puntos))
    cl = cl.merge(puntos, on=["lat", "lon"])
    D, P = int(cl["dia"].max()) + 1, len(puntos)
    diario = {}
    for k in PARAMS:
        m = np.full((D, P), np.nan)
        m[cl["dia"].values, cl["p"].values] = cl[k].replace(-999, np.nan).values
        diario[k] = m
    W = D // 7
    sem = {k: v[:W * 7].reshape(W, 7, P) for k, v in diario.items()}
    lluvia = np.nan_to_num(diario["PRECTOTCORR"][:W * 7])
    # racha seca: días seguidos con menos de 1 mm, medida al final de cada semana
    racha = np.zeros_like(lluvia)
    for d in range(1, lluvia.shape[0]):
        racha[d] = np.where(lluvia[d] < 1.0, racha[d - 1] + 1, 0)
    lluvia_sem = lluvia.reshape(W, 7, P).sum(1)
    lluvia30 = np.zeros_like(lluvia_sem)
    for w in range(W):
        lluvia30[w] = lluvia_sem[max(0, w - 3):w + 1].sum(0)
    return {
        "puntos": puntos, "W": W, "diario": diario,
        "ts": np.nanmean(sem["TS_MAX"], 1), "t2m": np.nanmean(sem["T2M_MAX"], 1),
        "lluvia30": lluvia30, "racha_seca": racha.reshape(W, 7, P)[:, -1, :],
        "humedad": np.nanmean(sem["RH2M"], 1), "suelo": np.nanmean(sem["GWETTOP"], 1),
        "viento": np.nanmean(sem["WS2M"], 1),
    }


def _temporadas(clima, cerca, tierra, res):
    """Año por año: ¿qué tan seca y caliente fue la temporada y cuánto fuego hubo?

    Usa la serie armonizada (25 años), que es justo para lo que sirve armonizar.
    """
    H, meses = res["H"], res["meses"]
    am = np.array([a for a, _ in meses])
    mm = np.array([m for _, m in meses])
    dias = clima["diario"]["GWETTOP"].shape[0]
    fechas = pd.date_range(pd.Timestamp(EPOCA), periods=dias, freq="D")
    pts = cerca[tierra]
    reg = pd.DataFrame({k: np.nanmean(clima["diario"][k][:, pts], 1) for k in ("GWETTOP", "TS_MAX", "RH2M")}, index=fechas)
    filas = []
    for y in sorted(set(am)):
        if (am == y).sum() < 12 or y < fechas[0].year or y > fechas[-1].year:
            continue
        def media(col, m0, m1):
            return float(reg.loc[f"{y}-{m0:02d}-01":pd.Timestamp(year=y, month=m1, day=1) + pd.offsets.MonthEnd(0), col].mean())
        filas.append({
            "anio": int(y),
            "fuego": round(float(H[(am == y) & np.isin(mm, [3, 4, 5, 6])].sum())),
            "fuego_abr_jun": round(float(H[(am == y) & np.isin(mm, [4, 5, 6])].sum())),
            "suelo": round(media("GWETTOP", 3, 5), 3), "ts": round(media("TS_MAX", 3, 5), 2),
            "humedad": round(media("RH2M", 3, 5), 1),
            "suelo_previo": round(media("GWETTOP", 2, 3), 3), "humedad_previa": round(media("RH2M", 2, 3), 1),
        })
    if len(filas) < 8:
        return None
    t = pd.DataFrame(filas)
    lf = np.log(t["fuego"].clip(lower=1))
    corr = {k: round(float(np.corrcoef(t[k], lf)[0, 1]), 2) for k in ("suelo", "ts", "humedad", "suelo_previo", "humedad_previa")}
    # Pronóstico de temporada con lo que se sabe a fin de marzo, dejando un año fuera cada vez
    y_ = np.log(t["fuego_abr_jun"].clip(lower=1)).values
    X = np.column_stack([np.ones(len(t)), t["suelo_previo"], t["humedad_previa"]])
    pred = np.zeros(len(t))
    for i in range(len(t)):
        e = np.arange(len(t)) != i
        b = np.linalg.lstsq(X[e], y_[e], rcond=None)[0]
        pred[i] = X[i] @ b
    med = np.median(y_)
    for f, pz in zip(filas, pred):
        f["pronostico_abr_jun"] = round(float(np.exp(pz)))
    return {
        "anios": filas, "correlaciones": corr,
        "pronostico": {
            "variables": "humedad del suelo y humedad del aire de febrero y marzo",
            "objetivo": "detecciones de abril a junio",
            "corr_anio_apartado": round(float(np.corrcoef(pred, y_)[0, 1]), 2),
            "acierto_arriba_abajo_mediana_pct": round(float(((pred > med) == (y_ > med)).mean()) * 100),
        },
    }


def _semana_inicio(w):
    return EPOCA + datetime.timedelta(days=7 * int(w))


def calcular(det, res=None):
    clima = _clima_semanal()
    if clima is None:
        print(f"  (sin datos de clima en {C.DIR_CLIMA}; se omite el riesgo térmico)")
        return None
    NC, W = C.NX * C.NY, clima["W"]
    tierra = np.array(C.geo()["tierra"], bool)
    inicio = np.array([_semana_inicio(w) for w in range(W)])
    anio = np.array([d.year for d in inicio])
    sda = np.array([min(51, (d.timetuple().tm_yday - 1) // 7) for d in inicio])      # semana del año

    # --- fuego por celda y semana ---
    fecha = pd.to_datetime(det["acq_date"])
    w_det = ((fecha - pd.Timestamp(EPOCA)).dt.days // 7).values
    ok = (w_det >= 0) & (w_det < W)
    viirs_nombre = det.loc[det["sensor"].str.startswith("viirs"), "sensor"].value_counts().idxmax()
    es_v = (det["sensor"] == viirs_nombre).values & ok
    es_m = det["sensor"].str.startswith("modis").values & ok
    V = np.zeros((W, NC))
    M = np.zeros((W, NC))
    np.add.at(V, (w_det[es_v], det["celda"].values[es_v]), 1)
    np.add.at(M, (w_det[es_m], det["celda"].values[es_m]), 1)
    hay_v = V.sum(1) > 0
    w0 = int(np.argmax(hay_v)) + 2                     # primera semana completa con VIIRS y una previa
    entren = (np.arange(W) >= w0) & (anio <= ULTIMO_ANIO_ENTRENAMIENTO)
    prueba = (np.arange(W) >= w0) & (anio > ULTIMO_ANIO_ENTRENAMIENTO)
    if entren.sum() < 100 or prueba.sum() < 20:
        print("  (no hay suficientes semanas con VIIRS para entrenar y probar; se omite)")
        return None

    # --- calendario histórico de fuego: MODIS, años de entrenamiento, suavizado ±1 semana ---
    base = (anio >= 2003) & (anio <= ULTIMO_ANIO_ENTRENAMIENTO)
    cal = np.zeros((52, NC))
    for s in range(52):
        cal[s] = M[base & (sda == s)].mean(0)
    cal = (np.roll(cal, 1, 0) + cal + np.roll(cal, -1, 0)) / 3
    clima_fuego = np.log1p(cal)

    # --- clima: punto POWER más cercano a cada celda, y anomalías respecto a lo normal ---
    jj, ii = np.divmod(np.arange(NC), C.NX)
    lon_c = C.LON_MIN + (ii + 0.5) * C.MALLA
    lat_c = C.LAT_MIN + (jj + 0.5) * C.MALLA
    pts = clima["puntos"]
    cerca = np.argmin((lat_c[:, None] - pts["lat"].values[None, :]) ** 2 +
                      (lon_c[:, None] - pts["lon"].values[None, :]) ** 2, 1)
    normal = (anio <= ULTIMO_ANIO_ENTRENAMIENTO)
    ts = clima["ts"]
    med, des = np.zeros((52, ts.shape[1])), np.ones((52, ts.shape[1]))
    for s in range(52):
        vecinas = np.isin(sda, [(s - 1) % 52, s, (s + 1) % 52]) & normal
        med[s], des[s] = np.nanmean(ts[vecinas], 0), np.nanstd(ts[vecinas], 0) + 1e-6
    z_ts = (ts - med[sda]) / des[sda]

    def anomalia(m, semanas=4):
        """Anomalía estandarizada del promedio de las últimas N semanas respecto a lo normal de esa época."""
        acum = np.zeros_like(m)
        for w in range(W):
            acum[w] = np.nanmean(m[max(0, w - semanas + 1):w + 1], 0)
        me, de = np.zeros((52, m.shape[1])), np.ones((52, m.shape[1]))
        for s_ in range(52):
            v_ = np.isin(sda, [(s_ - 1) % 52, s_, (s_ + 1) % 52]) & normal
            me[s_], de[s_] = np.nanmean(acum[v_], 0), np.nanstd(acum[v_], 0) + 1e-6
        return (acum - me[sda]) / de[sda]

    z_suelo = anomalia(clima["suelo"], 6)
    z_hr = anomalia(clima["humedad"], 4)
    z_ts4 = anomalia(ts, 4)
    z_lluvia = anomalia(np.log1p(clima["lluvia30"]), 2)

    def a_celdas(m):
        return m[:, cerca]

    # --- variables: todo con un retraso de una semana ---
    def previo(m):
        r = np.zeros_like(m)
        r[1:] = m[:-1]
        return r

    Vg = V.reshape(W, C.NY, C.NX)
    vec = np.zeros_like(Vg)
    for dj in (-1, 0, 1):
        for di in (-1, 0, 1):
            if dj or di:
                d = np.roll(np.roll(Vg, dj, 1), di, 2)
                if dj == 1: d[:, 0, :] = 0
                if dj == -1: d[:, -1, :] = 0
                if di == 1: d[:, :, 0] = 0
                if di == -1: d[:, :, -1] = 0
                vec += d
    variables = {
        "clima_fuego": clima_fuego[sda],
        "fuego_previo": previo(np.log1p(V)),
        "fuego_vecinos": previo(np.log1p(vec.reshape(W, NC))),
        "z_ts": previo(a_celdas(z_ts)),
        "z_ts4": previo(a_celdas(z_ts4)),
        "z_suelo": previo(a_celdas(z_suelo)),
        "z_hr": previo(a_celdas(z_hr)),
        "z_lluvia": previo(a_celdas(z_lluvia)),
        "ts": previo(a_celdas(ts)),
        "lluvia30": previo(a_celdas(np.log1p(clima["lluvia30"]))),
        "racha_seca": previo(a_celdas(clima["racha_seca"])),
        "humedad": previo(a_celdas(clima["humedad"])),
        "suelo": previo(a_celdas(clima["suelo"])),
        "viento": previo(a_celdas(clima["viento"])),
    }
    y = (V >= 1).astype(float)

    def tabla(nombres, semanas):
        X = np.column_stack([variables[n][semanas][:, tierra].ravel() for n in nombres])
        return X, y[semanas][:, tierra].ravel()

    clima_cols = ["z_ts", "z_ts4", "z_suelo", "z_hr", "z_lluvia", "racha_seca", "viento"]
    grupos = {
        "calendario": ["clima_fuego"],
        "fuego_reciente": ["clima_fuego", "fuego_previo", "fuego_vecinos"],
        "con_clima": ["clima_fuego", "fuego_previo", "fuego_vecinos"] + clima_cols,
        "calendario_y_clima": ["clima_fuego"] + clima_cols,
    }
    conteo_prueba = V[prueba][:, tierra].ravel()
    sin_fuego_previo = variables["fuego_previo"][prueba][:, tierra].ravel() == 0
    metricas, modelos, pred = {}, {}, {}
    for nombre, cols in grupos.items():
        Xe, ye = tabla(cols, entren)
        Xp, yp = tabla(cols, prueba)
        bueno = np.isfinite(Xe).all(1)
        mod = Logistica().ajustar(Xe[bueno], ye[bueno])
        p = mod.predecir(np.nan_to_num(Xp))
        top = p >= np.quantile(p, 0.9)
        metricas[nombre] = {
            "auc": round(_auc(yp, p), 3),
            "auc_sin_fuego_previo": round(_auc(yp[sin_fuego_previo], p[sin_fuego_previo]), 3),
            "captura_top10": round(float(conteo_prueba[top].sum() / conteo_prueba.sum()) * 100, 1),
        }
        modelos[nombre], pred[nombre] = mod, p

    # --- ¿una "bolsa de calor" anticipa fuego? (solo celdas sin fuego la semana anterior, en temporada) ---
    z = variables["z_ts"][prueba][:, tierra].ravel()
    cf = variables["clima_fuego"][prueba][:, tierra].ravel()
    yp = y[prueba][:, tierra].ravel()
    temporada = sin_fuego_previo & (cf >= np.quantile(cf, 0.5))
    bolsa = temporada & (z >= 1.0)
    normalito = temporada & (z < 1.0)
    bolsas = {
        "definicion": "Semana con la superficie al menos 1 desviación estándar más caliente de lo normal, "
                      "en celdas sin fuego esa semana y en la mitad del año-zona con más costumbre de fuego.",
        "casos_con_bolsa": int(bolsa.sum()), "casos_sin_bolsa": int(normalito.sum()),
        "pct_fuego_con_bolsa": round(float(yp[bolsa].mean()) * 100, 1) if bolsa.sum() else None,
        "pct_fuego_sin_bolsa": round(float(yp[normalito].mean()) * 100, 1) if normalito.sum() else None,
    }

    # El mapa de riesgo usa el modelo más simple entre los que mejor funcionan
    final = modelos["fuego_reciente"]
    cols = grupos["fuego_reciente"]
    temporadas = _temporadas(clima, cerca, tierra, res) if res is not None else None
    sem_p = np.nonzero(prueba)[0]
    riesgo_mapa = np.zeros((len(sem_p), NC))
    riesgo_mapa[:, tierra] = pred["fuego_reciente"].reshape(len(sem_p), -1)
    calor = np.nan_to_num(variables["z_ts"][prueba])
    salida = {
        "fuente": "NASA POWER (clima diario, 0.5° x 0.625°) y FIRMS " + viirs_nombre.replace("viirs_", "VIIRS ").upper(),
        "entrenamiento": f"semanas de {inicio[np.argmax(entren)].year} a {ULTIMO_ANIO_ENTRENAMIENTO}",
        "prueba": f"semanas de {ULTIMO_ANIO_ENTRENAMIENTO + 1} a {int(anio[prueba].max())}",
        "anios_entrenamiento": [int(inicio[np.argmax(entren)].year), ULTIMO_ANIO_ENTRENAMIENTO],
        "anios_prueba": [ULTIMO_ANIO_ENTRENAMIENTO + 1, int(anio[prueba].max())],
        "viirs": viirs_nombre.replace("viirs_", "").upper(),
        "anios_entrenamiento": [int(inicio[np.argmax(entren)].year), ULTIMO_ANIO_ENTRENAMIENTO],
        "anios_prueba": [ULTIMO_ANIO_ENTRENAMIENTO + 1, int(anio[prueba].max())],
        "viirs": viirs_nombre.replace("viirs_", "").upper(),
        "semanas": [inicio[w].isoformat() for w in sem_p],
        "metricas": metricas,
        "bolsas": bolsas,
        "temporadas": temporadas,
        "pesos": [{"variable": NOMBRES[c], "peso": round(float(b), 2)} for c, b in zip(cols, final.b[1:])],
        "riesgo": [[int(round(v * 100)) for v in fila] for fila in riesgo_mapa],
        "calor": [[int(round(v * 10)) for v in fila] for fila in calor],
        "fuego": [[int(v) for v in fila] for fila in V[prueba]],
    }
    print(f"  Prueba en {salida['prueba']} ({int(prueba.sum())} semanas, {int(tierra.sum())} celdas):")
    for k, m in metricas.items():
        print(f"    {k:20s} AUC={m['auc']}  AUC sin fuego previo={m['auc_sin_fuego_previo']}  "
              f"detecciones en el 10% de mayor riesgo={m['captura_top10']}%")
    print(f"    Con bolsa de calor arde el {bolsas['pct_fuego_con_bolsa']}% de los casos; sin ella, el {bolsas['pct_fuego_sin_bolsa']}%")
    if temporadas:
        c, pr = temporadas["correlaciones"], temporadas["pronostico"]
        print(f"    Por temporada ({len(temporadas['anios'])} años): correlación del fuego con humedad del suelo={c['suelo']}, "
              f"con temperatura de superficie={c['ts']}, con humedad del aire={c['humedad']}")
        print(f"    Pronóstico con datos de feb-mar (año apartado): correlación={pr['corr_anio_apartado']}, "
              f"acierta arriba/abajo de la mediana en {pr['acierto_arriba_abajo_mediana_pct']}% de los años")
    return salida
