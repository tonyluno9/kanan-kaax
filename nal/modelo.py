"""
NAL v2 · the model. Two parts, both decided inside each fold with only the data of its issue date (nested walk-forward):
  1. PATTERN (when + where): weighted climatology of past years with a half-life, optional per-year normalisation
     (so one huge year does not dominate the map) and optional spatial smoothing. The setting is chosen by an inner
     walk-forward over the earlier years.
  2. AMOUNT (yearly total): log(total / baseline) explained by a ridge regression on predictors known at the issue
     date (ENSO in autumn, rain of the wet season, soil wetness, heat, last year's fire). Feature set and penalty
     are chosen by an inner walk-forward. The range is a split-conformal interval on the inner out-of-sample errors.
AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic) and reviewed by the team.
"""
import math

import numpy as np

import nucleo as N

# ------------------------------------------------------------------------------------------- candidate settings
VIDAS = [3, 5, 8, 12, 1000]           # half-life in years (1000 = plain average)
NORMAS = ["crudo", "proporcion"]      # average raw counts, or each year's share of its own total
SUAVES = [0.0, 0.3]                   # weight of the 3x3 neighbour mean
FAMILIAS = {                          # predictor sets for the amount
    "ninguna": [],
    "fuego": ["fuego_prev"],
    "enso": ["oni"],
    "fuego_enso": ["fuego_prev", "oni"],
    "clima": ["oni", "lluvia_hum", "suelo"],
    "todo": ["fuego_prev", "oni", "lluvia_hum", "suelo", "tmax"],
}
ALFAS = [3.0, 10.0, 30.0, 100.0]
INTERCEPTO = False
MIN_BASE = 3        # years of history needed before a year can be a training sample for the amount
MIN_INTERNO = 6     # years of history for an inner test of the pattern
TOP_K = 5           # patterns averaged: the k best inner settings
NIVEL = 0.8         # nominal coverage of the range

VARIABLES = [
    {"nombre": "oni", "fuente": "NOAA CPC Oceanic Nino Index, season Aug-Sep-Oct of the issue year", "disponible_en": "early November"},
    {"nombre": "lluvia_hum", "fuente": "NASA POWER PRECTOTCORR, rain Jun-Oct of the issue year (6-point mean, log)", "disponible_en": "early November"},
    {"nombre": "suelo", "fuente": "NASA POWER GWETROOT, root-zone soil wetness Aug-Oct of the issue year", "disponible_en": "early November"},
    {"nombre": "tmax", "fuente": "NASA POWER T2M_MAX, mean daily max temperature Jun-Oct of the issue year", "disponible_en": "early November"},
    {"nombre": "fuego_prev", "fuente": "Harmonized MODIS+VIIRS record (this app): last year's fire vs its baseline, log", "disponible_en": "issue date (running year filled with the usual Nov-Dec when issued in November)"},
    {"nombre": "patron", "fuente": "Harmonized MODIS+VIIRS record (this app): past fire per square and month", "disponible_en": "issue date"},
]


def peso(anios, ultimo, vida):
    return np.array([0.5 ** ((ultimo - a) / vida) for a in anios])


# ------------------------------------------------------------------------------------------- pattern
def vecinos(V):
    """3x3 neighbour mean operator as an index list per cell."""
    out = []
    for c in range(V.NC):
        j, i = divmod(c, V.nx)
        out.append([jj * V.nx + ii for jj in (j - 1, j, j + 1) for ii in (i - 1, i, i + 1) if 0 <= jj < V.ny and 0 <= ii < V.nx])
    return out


_VEC = {}


def patron(H, cfg, V):
    """Expected share of the year's fire per square and month (NC x 12, sums to 1 over land)."""
    vida, norma, suave = cfg
    ys = sorted(H)
    A = np.stack([H[a] for a in ys])
    if norma == "proporcion":
        t = A[:, V.tierra].sum((1, 2))
        A = A / np.where(t > 0, t, 1)[:, None, None]
    w = peso(ys, ys[-1], vida)
    P = np.tensordot(w / w.sum(), A, 1)
    if suave > 0:
        if V.clave not in _VEC:
            _VEC[V.clave] = vecinos(V)
        nb = _VEC[V.clave]
        S = np.stack([P[ix].mean(0) for ix in nb])
        P = (1 - suave) * P + suave * S
    out = np.zeros_like(P)
    out[V.tierra] = P[V.tierra]
    s = out.sum()
    return out / s if s > 0 else out


def puntos_patron(P, real, tierra):
    f = N.puntuar(P, 0, 0, real, tierra, 1.0)
    return (f["top3"] + f["donde20"] + f["captura10"]) / 3


def elegir_patron(V, h):
    """Inner walk-forward over the years before the issue date; returns the best (vida, norma, suave)."""
    cands = [(v, n, s) for v in VIDAS for n in NORMAS for s in SUAVES]
    base = (8, "crudo", 0.0)  # NAL v1's choice: wins ties
    score = {c: [] for c in cands}
    for y in V.anios:
        corte = N.corte_de(y, h)
        if corte > V.corte:
            continue
        W = V.sub(corte)
        H, _ = N.historia(W)
        if len(H) < MIN_INTERNO:
            continue
        for c in cands:
            score[c].append(puntos_patron(patron(H, c, W), V.anio[y], V.tierra))
    if not score[base]:
        return [base]
    media = {c: float(np.mean(v)) for c, v in score.items()}
    orden = sorted(cands, key=lambda c: (-round(media[c], 6), c != base))
    if TOP_K == 1:
        return [orden[0] if media[orden[0]] > media[base] + 1e-9 else base]
    return orden[:TOP_K]


# ------------------------------------------------------------------------------------------- amount
def anio_clima(W):
    """Latest year whose October is inside the view."""
    return W.corte // 12 if W.corte % 12 >= 9 else W.corte // 12 - 1


def rasgos(W):
    """Predictors at a view + the baseline total. All values come from inside the view."""
    H, _ = N.historia(W)
    ys = sorted(H)
    tots = np.array([H[a][W.tierra].sum() for a in ys])
    base = float((peso(ys, ys[-1], N.VIDA_MEDIA_V1) * tots).sum() / peso(ys, ys[-1], N.VIDA_MEDIA_V1).sum())
    a = anio_clima(W)
    C = W.clima

    def media(col, m0, m1, log=False, suma=False):
        ix = [N.mid(a, m) for m in range(m0, m1 + 1)]
        v = C.loc[[i for i in ix if i in C.index], col]
        if len(v) < len(ix):
            return np.nan
        x = v.sum() if suma else v.mean()
        return math.log1p(x) if log else x

    oni_k = N.mid(a, 10)
    x = {
        "oni": float(W.oni.get(oni_k, np.nan)),
        "lluvia_hum": media("PRECTOTCORR_mm", 6, 10, log=True, suma=True),
        "suelo": media("GWETROOT", 8, 10),
        "tmax": media("T2M_MAX", 6, 10),
        "fuego_prev": math.log(max(tots[-1], 1.0) / max(base, 1.0)),
    }
    return x, base, H


def muestras(V, h):
    """Training samples for the amount: every past full year j, described with what existed at ITS issue date."""
    filas = []
    for j in V.anios:
        corte = N.corte_de(j, h)
        if corte > V.corte:
            continue
        W = V.sub(corte)
        H, _ = N.historia(W)
        if len(H) < MIN_BASE:
            continue
        x, base, _ = rasgos(W)
        filas.append((j, x, math.log(max(V.anio[j][V.tierra].sum(), 1.0) / base)))
    return filas


def ajustar(X, z, alfa, libre=None):
    """Ridge on standardised (centred) predictors. The intercept is fixed at 0 unless INTERCEPTO is set, so with no
    predictors the total is the baseline itself (NAL v1). A free intercept, estimated from the short early
    samples, pulled the totals down and hurt (see BITACORA)."""
    libre = INTERCEPTO if libre is None else libre
    zm = z.mean() if libre else 0.0
    if X.shape[1] == 0:
        return lambda Xn: np.full(len(Xn), zm)
    mu, sd = X.mean(0), X.std(0)
    sd = np.where(sd > 0, sd, 1.0)
    Xs = (X - mu) / sd
    b = np.linalg.solve(Xs.T @ Xs + alfa * np.eye(X.shape[1]), Xs.T @ (z - zm))
    return lambda Xn: zm + ((Xn - mu) / sd) @ b


def matriz(filas, fam):
    cols = FAMILIAS[fam]
    X = np.array([[f[1][c] for c in cols] for f in filas], float).reshape(len(filas), len(cols))
    return X


def residuos_internos(filas, fam, alfa, desde=4, combinar=False):
    """Walk-forward inside the training years: each sample predicted from the samples before it.
    combinar=True keeps one error per sample year (rows with a missing predictor predict 0), so errors of
    several predictor sets can be averaged year by year."""
    X, z = matriz(filas, fam), np.array([f[2] for f in filas])
    ok = ~np.isnan(X).any(1)
    r = []
    for i in range(desde, len(z)):
        tr = ok[:i]
        if not ok[i] or tr.sum() < 2:
            if combinar:
                r.append(z[i])
            continue
        g = ajustar(X[:i][tr], z[:i][tr], alfa)
        r.append(z[i] - g(X[i:i + 1])[0])
    return np.array(r)


def elegir_cantidad(filas):
    """Pick ONE (predictor set, penalty) by inner error. Kept for the record: it was tried and over-fitted
    (see BITACORA); the final model averages all of them instead."""
    mejor, mejor_err = ("ninguna", ALFAS[0]), None
    for fam in FAMILIAS:
        for alfa in (ALFAS if FAMILIAS[fam] else [ALFAS[0]]):
            r = residuos_internos(filas, fam, alfa)
            if len(r) < 3:
                continue
            e = float(np.mean(np.abs(r)))
            if mejor_err is None or e < mejor_err - 1e-9:
                mejor, mejor_err = (fam, alfa), e
    return mejor


def intervalo(res, nivel=NIVEL):
    """Split-conformal bounds on log errors. With n errors the bounds are order statistics (n+1)(1-a) style."""
    r = np.sort(res)
    n = len(r)
    a = (1 - nivel) / 2
    klo = int(math.floor((n + 1) * a)) - 1
    khi = int(math.ceil((n + 1) * (1 - a))) - 1
    lo = r[max(klo, 0)]
    hi = r[min(khi, n - 1)]
    if klo < 0:  # too few errors for the requested level: widen by the spread seen
        lo = r[0] - (r[-1] - r[0]) / max(n, 1)
    if khi > n - 1:
        hi = r[-1] + (r[-1] - r[0]) / max(n, 1)
    return lo, hi


# ------------------------------------------------------------------------------------------- the forecast
def cantidad(V, h, filas, x, base, combos):
    """Total and conformal range from an equal-weight average of the given (predictor set, penalty) combos."""
    z = np.array([f[2] for f in filas])
    zs, rs, ins_all = [], [], []
    for fam, alfa in combos:
        X = matriz(filas, fam)
        ok = ~np.isnan(X).any(1)
        g = ajustar(X[ok], z[ok], alfa)
        xn = np.array([[x[c] for c in FAMILIAS[fam]]], float).reshape(1, -1)
        zs.append(float(g(xn)[0]) if not np.isnan(xn).any() else 0.0)
        rs.append(residuos_internos(filas, fam, alfa, combinar=True))
        ins_all.append((z[ok] - g(X[ok])) * math.sqrt((ok.sum() + 1) / max(ok.sum() - X.shape[1] - 1, 1)))
    zhat = float(np.mean(zs))
    # inner out-of-sample errors of the averaged forecast (same years for every combo)
    L = min(len(r) for r in rs)
    res = np.mean([r[-L:] for r in rs], 0) if L else np.array([])
    if len(res) < 8:  # early folds: pad with in-sample errors, inflated for the fitted parameters
        Li = min(len(r) for r in ins_all)
        res = np.concatenate([res, np.mean([r[-Li:] for r in ins_all], 0)])
    lo, hi = intervalo(res)
    return {"total": base * math.exp(zhat), "bajo": base * math.exp(zhat + lo), "alto": base * math.exp(zhat + hi),
            "zhat": zhat, "res": res}


def partes(V, h):
    """Both versions of each part, from one view: pattern v2 / v1 and amount v2 / baseline (v1 total, calibrated range)."""
    H, pseudo = N.historia(V)
    cfgs = elegir_patron(V, h)
    P2 = np.mean([patron(H, c, V) for c in cfgs], 0)
    P1 = patron(dict(V.anio), (8, "crudo", 0.0), V)  # NAL v1's pattern: full years, half-life 8, no smoothing
    x, base, _ = rasgos(V)
    filas = muestras(V, h)
    combos = [(f, a) for f in FAMILIAS for a in (ALFAS if FAMILIAS[f] else [ALFAS[0]])]
    return {"P2": P2, "P1": P1, "C2": cantidad(V, h, filas, x, base, combos),
            "C1": cantidad(V, h, filas, x, base, [("ninguna", ALFAS[0])]),
            "cfgs": cfgs, "x": x, "base": base, "pseudo": pseudo, "H": H, "ant": H[max(H)][V.tierra].sum()}


def armar(p, usar_patron=True, usar_cantidad=True):
    P = p["P2"] if usar_patron else p["P1"]
    C = p["C2"] if usar_cantidad else p["C1"]
    return {"E": P * C["total"], "P": P, "bajo": C["bajo"], "alto": C["alto"], "total": C["total"], "res": C["res"],
            "ant": p["ant"], "H": p["H"]}


def modelo(h, usar_patron=True, usar_cantidad=True):
    return lambda V, y: armar(partes(V, h), usar_patron, usar_cantidad)
