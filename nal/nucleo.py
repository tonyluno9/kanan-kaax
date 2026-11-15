"""
NAL v2 · core: data loading, leak-proof data views, the exact walk-forward metrics of web/js/nal.js,
the reference models (NAL v1, climatology, persistence) and the ceiling of each metric.
AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic) and reviewed by the team.

Leak-proofing: every model only ever receives a `Vista` (view) built for one issue date. The view holds the fire
record and the predictors truncated at that date, so information from later months cannot be reached by construction.
Each view records the last month it contains; verificar.py checks it fold by fold.
"""
import json
import math
import os

import numpy as np
import pandas as pd

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
REGIONES = ["yucatan", "portugal"]
MIN_ENTRENO = 10   # same as web/js/nal.js
VIDA_MEDIA_V1 = 8  # same as web/js/nal.js


def mid(y, m):
    """Month id: y*12 + (m-1), m in 1..12."""
    return y * 12 + (m - 1)


def txt_mid(i):
    return "%04d-%02d" % (i // 12, i % 12 + 1)


def js_round(x):
    """Math.round of JavaScript (halves go up)."""
    return int(math.floor(x + 0.5))


def cuantil(v, q):
    """Linear-interpolation quantile, identical to cuantil() in nal.js (v sorted ascending)."""
    if len(v) == 0:
        return 0.0
    p = (len(v) - 1) * q
    a, b = int(math.floor(p)), int(math.ceil(p))
    return v[a] + (v[b] - v[a]) * (p - a)


def pearson(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    da, db = a - a.mean(), b - b.mean()
    saa, sbb = (da * da).sum(), (db * db).sum()
    return float((da * db).sum() / math.sqrt(saa * sbb)) if saa > 0 and sbb > 0 else 0.0


# ----------------------------------------------------------------------------------------------- data
class Region:
    """Everything known about one region, up to today. Models never touch this directly: they get a Vista."""

    def __init__(self, clave):
        self.clave = clave
        with open(os.path.join(RAIZ, "web", "data", clave + ".js"), encoding="utf-8") as f:
            s = f.read()
        s = s[s.index("{"): s.rindex("}") + 1]
        Q = json.loads(s)
        self.meta = Q["meta"]
        self.nx, self.ny = Q["meta"]["nx"], Q["meta"]["ny"]
        self.serie = np.array(Q["serie"], float)  # NC x T
        self.NC, self.T = self.serie.shape
        self.meses = Q["meses"]
        self.mid = np.array([mid(int(s[:4]), int(s[5:7])) for s in self.meses])
        self.parcial = np.array(Q.get("parcial") or [False] * self.T, bool)
        self.tierra_flag = np.array(Q.get("tierra") or [0] * self.NC, bool)
        # squares scored by the metrics: same rule as nal.js (land, or fire at ANY date). Models never use it:
        # they use Vista.mascara, built only from the land flag and the fire up to the issue date.
        self.tierra = np.where(self.tierra_flag | (self.serie.sum(1) > 0))[0]
        # full years (12 months, none partial) -> NC x 12 matrices
        self.anio = {}
        for y in sorted(set(int(s[:4]) for s in self.meses)):
            ks = [np.where(self.mid == mid(y, m))[0] for m in range(1, 13)]
            if all(len(k) == 1 for k in ks) and not any(self.parcial[k[0]] for k in ks):
                self.anio[y] = self.serie[:, [k[0] for k in ks]]
        self.anios = sorted(self.anio)
        # predictors
        p = pd.read_csv(os.path.join(AQUI, "datos", "power_mensual_%s.csv" % clave))
        self.clima = p.groupby("mes")[["PRECTOTCORR_mm", "GWETROOT", "T2M_MAX", "RH2M"]].mean()
        self.clima.index = [mid(int(s[:4]), int(s[5:7])) for s in self.clima.index]
        o = pd.read_csv(os.path.join(AQUI, "datos", "oni.csv"))
        orden = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"]
        # a season is indexed by its LAST month (DJF of 2001 ends in Feb 2001; NDJ of 2001 ends in Jan 2002)
        fin = [mid(int(a), orden.index(t) + 2) if t != "NDJ" else mid(int(a) + 1, 1) for t, a in zip(o.temporada, o.anio)]
        self.oni = pd.Series(o.anom.values, index=fin)

    def vista(self, corte):
        """Data view at an issue date: everything up to and including month id `corte`."""
        return Vista(self, corte)

    def real(self, y):
        return self.anio[y]


REGISTRO_VISTAS = None  # when a list, every view created appends (corte, ultimo_dato): used by the leak audit


class Vista:
    """What existed at the end of month `corte`. Built from a Region or from a later Vista (a view can only be
    narrowed, never widened). Fire months flagged partial are dropped."""

    def __init__(self, F, corte):
        assert corte <= getattr(F, "corte", corte), "a view cannot see past its source"
        self.clave, self.nx, self.ny, self.NC, self.tierra_flag = F.clave, F.nx, F.ny, F.NC, F.tierra_flag
        self.corte = corte
        keep = (F.mid <= corte) & ~F.parcial
        self.serie, self.mid, self.parcial = F.serie[:, keep], F.mid[keep], F.parcial[keep]
        self.mascara = np.where(self.tierra_flag | (self.serie.sum(1) > 0))[0]  # land known at the issue date
        self.tierra = self.mascara
        self.anio = {}
        for y in sorted(set(int(i) // 12 for i in self.mid)):
            ks = [np.where(self.mid == mid(y, m))[0] for m in range(1, 13)]
            if all(len(k) == 1 for k in ks):
                self.anio[y] = self.serie[:, [k[0] for k in ks]]
        self.anios = sorted(self.anio)
        y0 = corte // 12
        self.parcial_anio = y0 if (corte % 12) != 11 else None
        self.parcial_meses = {}
        if self.parcial_anio is not None:
            for m in range(1, 13):
                k = np.where(self.mid == mid(y0, m))[0]
                if len(k) == 1:
                    self.parcial_meses[m] = self.serie[:, k[0]]
        self.clima = F.clima[F.clima.index <= corte]
        self.oni = F.oni[F.oni.index <= corte]
        usados = list(self.mid) + list(self.clima.index) + list(self.oni.index)
        self.ultimo_dato = int(max(usados))  # checked by verificar.py: never after `corte`
        if REGISTRO_VISTAS is not None:
            REGISTRO_VISTAS.append((self.corte, self.ultimo_dato))

    def sub(self, corte):
        return Vista(self, corte)


# ----------------------------------------------------------------------------------------------- metrics
def puntuar(E, bajo, alto, real, tierra, ant_total):
    """Scores of one forecast with the exact definitions of validar() in web/js/nal.js.
    E: NC x 12 expected fire, real: NC x 12 actual fire, ant_total: last year seen (persistence)."""
    Et, Rt = E[tierra], real[tierra]
    pmes, r = Et.sum(0), Rt.sum(0)
    tot = r.sum()
    orden = np.argsort(-pmes, kind="stable")[:3]  # stable, like Array.sort in V8
    top3 = r[orden].sum() / tot
    esp, act = Et.sum(1), Rt.sum(1)
    ord_c = np.argsort(-esp, kind="stable")
    n20 = max(1, js_round(len(tierra) * 0.2))
    d20 = act[ord_c[:n20]].sum() / tot
    e_cm, a_cm = Et.reshape(-1), Rt.reshape(-1)
    ord_cm = np.argsort(-e_cm, kind="stable")
    n10 = js_round(len(e_cm) * 0.1)
    d10 = a_cm[ord_cm[:n10]].sum() / tot
    total = float(pmes.sum())
    return {"real": float(tot), "esperado": total, "bajo": float(bajo), "alto": float(alto),
            "dentro": bool(bajo <= tot <= alto), "cuandoR": pearson(pmes, r), "top3": float(top3),
            "donde20": float(d20), "captura10": float(d10), "err": abs(total - tot) / tot,
            "errPersist": abs(ant_total - tot) / tot}


def techo(real, tierra):
    """What a perfect forecast would score: the real top months, squares and square-months."""
    R = real[tierra]
    tot = R.sum()
    m = np.sort(R.sum(0))[::-1]
    c = np.sort(R.sum(1))[::-1]
    cm = np.sort(R.reshape(-1))[::-1]
    return {"top3": m[:3].sum() / tot, "donde20": c[:max(1, js_round(len(tierra) * 0.2))].sum() / tot,
            "captura10": cm[:js_round(len(cm) * 0.1)].sum() / tot}


def resumir(filas, h):
    med = lambda k: float(np.median([f[k] for f in filas]))
    prom = lambda k: float(np.mean([f[k] for f in filas]))
    return {"h": h, "n": len(filas), "anios": [f["anio"] for f in filas],
            "top3": prom("top3"), "donde20": prom("donde20"), "captura10": prom("captura10"), "cuandoR": prom("cuandoR"),
            "errMediano": med("err"), "errPersistencia": med("errPersist"),
            "dentroRango": float(np.mean([f["dentro"] for f in filas])), "filas": filas}


# ----------------------------------------------------------------------------------------------- issue dates
def corte_de(y, h):
    """Issue date (last month of data) to forecast year y. h = 1, 2, 3: full years up to y-h (as nal.js).
    h = 'nov': issued in November of y-1, with data up to October of y-1 (how the 2027 forecast is really made)."""
    return mid(y - 1, 10) if h == "nov" else mid(y - h, 12)


def anios_prueba(R, h):
    """Same test years as nal.js: at least MIN_ENTRENO full years of training. For 'nov' the running year counts."""
    lag = 1 if h == "nov" else h
    return [y for y in R.anios if len([a for a in R.anios if a <= y - lag]) >= MIN_ENTRENO]


def historia(V, vida_relleno=VIDA_MEDIA_V1):
    """Years usable at the view: full years, plus the running year when at least 9 months exist, its missing
    months filled with the weighted mean of the same months in earlier years. Returns ({year: NC x 12}, pseudo_year)."""
    H = dict(V.anio)
    y0 = V.parcial_anio
    if y0 is not None and len(V.parcial_meses) >= 9 and V.anios:
        w = np.array([0.5 ** ((V.anios[-1] - a) / vida_relleno) for a in V.anios])
        media = np.tensordot(w / w.sum(), np.stack([V.anio[a] for a in V.anios]), 1)
        M = media.copy()
        for m, v in V.parcial_meses.items():
            M[:, m - 1] = v
        H[y0] = M
        return H, y0
    return H, None


# ----------------------------------------------------------------------------------------------- references
def v1(V, y):
    """NAL v1 exactly as web/js/nal.js (weighted mean, half-life 8 years, P10-P90 of past totals). Full years only."""
    ys = V.anios
    w = np.array([0.5 ** ((ys[-1] - a) / VIDA_MEDIA_V1) for a in ys])
    A = np.stack([V.anio[a] for a in ys])
    E = np.tensordot(w / w.sum(), A, 1)
    tots = sorted(float(V.anio[a][V.tierra].sum()) for a in ys)
    return {"E": E, "bajo": cuantil(tots, 0.1), "alto": cuantil(tots, 0.9), "ant": V.anio[ys[-1]][V.tierra].sum()}


def climatologia(V, y):
    """Plain average of all past full years; range P10-P90 of past totals."""
    ys = V.anios
    E = np.mean([V.anio[a] for a in ys], 0)
    tots = sorted(float(V.anio[a][V.tierra].sum()) for a in ys)
    return {"E": E, "bajo": cuantil(tots, 0.1), "alto": cuantil(tots, 0.9), "ant": V.anio[ys[-1]][V.tierra].sum()}


def persistencia(V, y):
    """'Next year will be like the last one I saw' (the running year, filled, when issued in November)."""
    H, _ = historia(V)
    u = max(H)
    tots = sorted(float(H[a][V.tierra].sum()) for a in H)
    return {"E": H[u].copy(), "bajo": cuantil(tots, 0.1), "alto": cuantil(tots, 0.9), "ant": H[u][V.tierra].sum()}


def validar(R, modelo, h, registro=None):
    """Walk-forward test: every test year is forecast from a view cut at its own issue date."""
    filas = []
    for y in anios_prueba(R, h):
        V = R.vista(corte_de(y, h))
        if registro is not None:
            registro.append({"region": R.clave, "h": str(h), "anio": y, "corte": txt_mid(V.corte), "ultimo_dato": txt_mid(V.ultimo_dato)})
        p = modelo(V, y)
        H, _ = historia(V)
        ant = p.get("ant", H[max(H)][V.tierra].sum())
        f = puntuar(p["E"], p["bajo"], p["alto"], R.real(y), R.tierra, ant)
        f["anio"] = y
        filas.append(f)
    return resumir(filas, h)


def techo_region(R, h):
    t = [techo(R.real(y), R.tierra) for y in anios_prueba(R, h)]
    return {k: float(np.mean([x[k] for x in t])) for k in ("top3", "donde20", "captura10")}
