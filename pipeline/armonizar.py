# AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
# and reviewed by the team. NASA Space Apps Challenge 2026.
"""Paso 2. Armoniza MODIS y VIIRS en una sola serie ("equivalente VIIRS") y la valida.

Idea: en los años en que los dos sensores observaron a la vez (2012 en adelante)
se aprende cuántas detecciones VIIRS corresponden a las detecciones MODIS de una
celda en un mes. La relación depende de:
  - el mes del año (en temporada de quemas agrícolas hay más fuegos pequeños
    que MODIS no ve),
  - la zona (según la vegetación, la proporción cambia),
  - cuántas detecciones MODIS hubo.
Con esa relación se convierte el historial anterior a VIIRS.

Modelo: regresión de Poisson (para conteos), ajustada con numpy.
Validación: se deja un año fuera, se entrena con los demás y se predice el año
apartado; se repite con cada año.
"""
import json

import numpy as np
import pandas as pd

from . import config as C

NC = None        # número de celdas de la región activa; lo fija armonizar()


def _cubos(conteos):
    """Convierte la tabla larga en matrices [mes, celda] por sensor."""
    ym = conteos["anio"] * 12 + (conteos["mes"] - 1)
    t0, t1 = int(ym.min()), int(ym.max())
    T = t1 - t0 + 1
    cubos = {}
    for s in sorted(set(conteos["sensor"]) | {"modis_terra", "modis_aqua"}):
        m = np.zeros((T, NC))
        d = conteos[conteos["sensor"] == s]
        np.add.at(m, ((d["anio"] * 12 + d["mes"] - 1 - t0).values, d["celda"].values), d["n"].values)
        cubos[s] = m
    meses = [(k // 12, k % 12 + 1) for k in range(t0, t1 + 1)]
    # Un solo satélite VIIRS: el que tenga más meses con datos (normalmente el registro más largo).
    viirs = {k: v for k, v in cubos.items() if k.startswith("viirs")}
    if not viirs:
        raise ValueError("No hay datos VIIRS. Revisen los CSV de datos/firms/.")
    usado = max(viirs, key=lambda k: (viirs[k].sum(1) > 0).sum())
    cubos["viirs"] = viirs[usado]
    cubos["viirs_usado"] = usado
    return cubos, meses


def _ajustar_poisson(X, y, iteraciones=60, ridge=1e-6):
    b = np.zeros(X.shape[1])
    b[:12] = np.log(y.mean() + 0.1)
    for _ in range(iteraciones):
        eta = np.clip(X @ b, -20, 20)
        mu = np.exp(eta)
        z = eta + (y - mu) / mu
        XtW = X.T * mu
        nuevo = np.linalg.solve(XtW @ X + ridge * np.eye(X.shape[1]), XtW @ z)
        if np.max(np.abs(nuevo - b)) < 1e-8:
            b = nuevo
            break
        b = nuevo
    return b


class Poisson:
    """log(VIIRS esperado) = a[mes] + b*log(1+MODIS) + c*zona"""

    def ajustar(self, M, V, mes_del_anio):
        # zona: qué tanto más ve VIIRS que MODIS en esa celda, con suavizado
        global_ = (V.sum() + 1) / (M.sum() + 1)
        self.zona = np.log((V.sum(0) + 5 * global_) / (M.sum(0) + 5)) - np.log(global_)
        self.b = _ajustar_poisson(self._X(M, mes_del_anio), V.ravel())
        return self

    def _X(self, M, mes_del_anio):
        T = M.shape[0]
        X = np.zeros((T * NC, 14))
        filas = np.arange(T * NC)
        X[filas, np.repeat(np.asarray(mes_del_anio) - 1, NC)] = 1
        X[:, 12] = np.log1p(M).ravel()
        X[:, 13] = np.tile(self.zona, T)
        return X

    def predecir(self, M, mes_del_anio):
        return np.exp(np.clip(self._X(M, mes_del_anio) @ self.b, -20, 20)).reshape(M.shape)


class FactorUnico:
    """Alternativa simple: VIIRS esperado = MODIS x un solo factor. Sirve de comparación."""

    def ajustar(self, M, V, mes_del_anio):
        self.f = V.sum() / max(M.sum(), 1)
        return self

    def predecir(self, M, mes_del_anio):
        return M * self.f


class FactorMes:
    """Un factor distinto para cada mes del año (la proporción cambia con la temporada)."""

    def ajustar(self, M, V, mes_del_anio):
        g = V.sum() / max(M.sum(), 1)
        md = np.asarray(mes_del_anio)
        self.f = np.array([(V[md == m].sum() + 20 * g) / (M[md == m].sum() + 20) for m in range(1, 13)])
        return self

    def predecir(self, M, mes_del_anio):
        return M * self.f[np.asarray(mes_del_anio) - 1][:, None]


class FactorZona:
    """Un factor distinto para cada celda (la proporción cambia con la vegetación)."""

    def ajustar(self, M, V, mes_del_anio):
        g = V.sum() / max(M.sum(), 1)
        self.f = (V.sum(0) + 30 * g) / (M.sum(0) + 30)
        return self

    def predecir(self, M, mes_del_anio):
        return M * self.f[None, :]


class FactorMesZona:
    """Combina el factor por mes y el factor por celda."""

    def ajustar(self, M, V, mes_del_anio):
        g = V.sum() / max(M.sum(), 1)
        self.fm = FactorMes().ajustar(M, V, mes_del_anio).f / g
        self.fz = FactorZona().ajustar(M, V, mes_del_anio).f
        self.k = 1.0
        self.k = V.sum() / max(self.predecir(M, mes_del_anio).sum(), 1)
        return self

    def predecir(self, M, mes_del_anio):
        return self.k * M * self.fz[None, :] * self.fm[np.asarray(mes_del_anio) - 1][:, None]


def _metricas(obs, pred):
    """obs y pred son [mes, celda]. Devuelve métricas regionales y por celda."""
    o, p = obs.sum(1), pred.sum(1)
    ss = ((o - o.mean()) ** 2).sum()
    fuertes = o >= max(50, np.percentile(o, 25))
    return {
        "r2_mensual_region": round(float(1 - ((o - p) ** 2).sum() / ss), 3) if ss > 0 else None,
        "error_pct_mediano_mensual": round(float(np.median(np.abs(p[fuertes] - o[fuertes]) / o[fuertes]) * 100), 1),
        "sesgo_total_pct": round(float((p.sum() / o.sum() - 1) * 100), 1),
        "mae_celda_mes": round(float(np.abs(obs - pred).mean()), 2),
        "corr_celda_mes_log": round(float(np.corrcoef(np.log1p(obs).ravel(), np.log1p(pred).ravel())[0, 1]), 3),
    }


METODOS = {"factor_unico": FactorUnico, "factor_mes": FactorMes, "factor_zona": FactorZona,
           "factor_mes_zona": FactorMesZona, "poisson": Poisson}


def armonizar(conteos=None):
    global NC
    NC = C.NX * C.NY
    if conteos is None:
        conteos = pd.read_csv(C.DIR_SALIDA / "conteos_celda_mes.csv")
    cubos, meses = _cubos(conteos)
    terra, aqua, V = cubos["modis_terra"], cubos["modis_aqua"], cubos["viirs"]
    M = terra + aqua
    T = len(meses)
    mda = np.array([m for _, m in meses])
    anios = np.array([a for a, _ in meses])

    # ¿El último mes está completo? Si no, no se usa para entrenar ni para anomalías.
    parcial = np.zeros(T, bool)
    try:
        fechas = json.loads((C.DIR_SALIDA / "fechas.json").read_text())
        ultima = max(fechas.values())
        if ultima % 100 < 25 and (ultima // 10000, ultima // 100 % 100) == meses[-1]:
            parcial[-1] = True
    except FileNotFoundError:
        pass

    hay_viirs = np.array([(a, m) >= C.VIIRS_INICIO for a, m in meses]) & (V.sum(1) > 0)
    if hay_viirs.any():
        hay_viirs[np.argmax(hay_viirs)] = False     # el primer mes del sensor puede estar incompleto
    hay_modis = M.sum(1) > 0
    hay_aqua = np.array([(a, m) >= C.AQUA_INICIO for a, m in meses])
    comun = hay_viirs & hay_modis & ~parcial
    if comun.sum() < 24:
        raise ValueError("Se necesitan al menos 2 años con MODIS y VIIRS a la vez para armonizar.")

    # ---------- Validación dejando un año fuera ----------
    anios_comunes = sorted(set(anios[comun]))
    pred = {k: np.zeros_like(V) for k in list(METODOS) + ["modis_crudo"]}
    pred_terra = {k: np.zeros_like(V) for k in METODOS}
    for a in anios_comunes:
        ent = comun & (anios != a)
        pru = comun & (anios == a)
        pred["modis_crudo"][pru] = M[pru]
        for k, Clase in METODOS.items():
            pred[k][pru] = Clase().ajustar(M[ent], V[ent], mda[ent]).predecir(M[pru], mda[pru])
            pred_terra[k][pru] = Clase().ajustar(terra[ent], V[ent], mda[ent]).predecir(terra[pru], mda[pru])
    resultados = {k: _metricas(V[comun], p[comun]) for k, p in pred.items()}
    # Se usa el método con menor error en los años apartados.
    elegido = min(METODOS, key=lambda k: (resultados[k]["error_pct_mediano_mensual"], resultados[k]["mae_celda_mes"]))
    resultados["solo_terra"] = _metricas(V[comun], pred_terra[elegido][comun])
    validacion = {
        "metodo": "Se aparta un año completo, se entrena con los demás y se predice el apartado. Se repite con cada año.",
        "anios": [int(a) for a in anios_comunes],
        "viirs_usado": cubos["viirs_usado"],
        "meses_comunes": int(comun.sum()),
        "metodo_elegido": elegido,
        "resultados": resultados,
        "serie": [
            {"mes": f"{a}-{m:02d}", "viirs_real": round(float(V[t].sum()), 1),
             "armonizado": round(float(pred[elegido][t].sum()), 1),
             "modis_crudo": round(float(M[t].sum()), 1)}
            for t, (a, m) in enumerate(meses) if comun[t]
        ],
    }

    # ---------- Modelo final y serie armonizada ----------
    Clase = METODOS[elegido]
    final = Clase().ajustar(M[comun], V[comun], mda[comun])
    final_terra = Clase().ajustar(terra[comun], V[comun], mda[comun])
    H = np.zeros_like(V)
    origen = []
    for t in range(T):
        if hay_viirs[t]:
            H[t] = V[t]
            origen.append("viirs")
        elif hay_modis[t] and hay_aqua[t]:
            H[t] = final.predecir(M[t:t + 1], mda[t:t + 1])[0]
            origen.append("modis_armonizado")
        elif hay_modis[t]:
            H[t] = final_terra.predecir(terra[t:t + 1], mda[t:t + 1])[0]
            origen.append("terra_armonizado")
        else:
            origen.append("sin_datos")
    # Se recorta al primer mes con datos
    ini = next(t for t in range(T) if origen[t] != "sin_datos")
    resultado = {
        "meses": meses[ini:], "origen": origen[ini:], "parcial": parcial[ini:],
        "H": H[ini:], "M": M[ini:], "V": V[ini:],
    }
    np.savez_compressed(C.DIR_SALIDA / "armonizado.npz", H=resultado["H"], M=resultado["M"], V=resultado["V"],
                        meses=np.array(resultado["meses"]), origen=np.array(resultado["origen"]),
                        parcial=resultado["parcial"])
    (C.DIR_SALIDA / "validacion.json").write_text(json.dumps(validacion, indent=1, ensure_ascii=False))
    pd.DataFrame(validacion["serie"]).to_csv(C.DIR_SALIDA / "validacion_serie.csv", index=False)
    print(f"  VIIRS usado: {cubos['viirs_usado']}. Meses en común: {int(comun.sum())}. Método elegido: {elegido}")
    print("  Validación (año apartado), totales mensuales de la región:")
    for k, r in resultados.items():
        print(f"    {k:16s} R2={r['r2_mensual_region']}  error mediano={r['error_pct_mediano_mensual']}%  sesgo={r['sesgo_total_pct']}%  MAE celda={r['mae_celda_mes']}")
    return resultado, validacion


def pesos_detecciones(det, res, viirs_usado):
    """Peso de cada detección en la serie armonizada (equivalente VIIRS).

    - Meses con VIIRS: cada detección del satélite VIIRS usado vale 1; las de MODIS, 0.
    - Meses solo con MODIS: cada detección MODIS vale H/M de su celda y mes, es decir,
      reparte el valor armonizado de la celda entre los puntos MODIS que lo formaron.
    Así cualquier subconjunto de puntos (un área protegida, una semana) suma en la misma escala.
    """
    meses = [tuple(m) for m in res["meses"]]
    idx = {m: i for i, m in enumerate(meses)}
    t = np.array([idx.get((a, m), -1) for a, m in zip(det["anio"].values, det["mes"].values)])
    c = det["celda"].values
    ok = t >= 0
    es_viirs_mes = np.zeros(len(det), bool)
    es_viirs_mes[ok] = np.array([res["origen"][i] == "viirs" for i in t[ok]])
    sensor = det["sensor"].astype(str).to_numpy()
    w = np.zeros(len(det))
    w[ok & es_viirs_mes & (sensor == viirs_usado)] = 1.0
    modis = ok & ~es_viirs_mes & det["sensor"].astype(str).str.startswith("modis").to_numpy()
    H, M = res["H"], res["M"]
    w[modis] = H[t[modis], c[modis]] / np.maximum(M[t[modis], c[modis]], 1)
    return w
