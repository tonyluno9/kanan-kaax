"""
NAL v2 · final checks.   Usage (from the quemas folder):  python nal/verificar.py
AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic) and reviewed by the team.

1. The Python harness reproduces NAL v1 as computed by web/js/nal.js itself in Node (difference < 0.2 points).
2. No leak: every view used in every fold ends at or before its issue date (Y - h, or October of Y - 1 for 'nov'),
   every predictor date respects it, and a canary test (all data after the issue date replaced by garbage) leaves
   every forecast identical.
3. The validation metrics stored in web/nal/<region>.js are recomputed from scratch and match.
4. Output contract: keys, dimensions NC x 12, no NaN, no negatives, size < 3 MB, loads in Node with global.window = {}.
5. python herramientas/revisar_web.py says PASS.
Writes the log to nal/resultados/verificar.txt and rebuilds nal/ENTREGA.md.
"""
import copy
import io
import json
import os
import subprocess
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import entrenar as E  # noqa: E402
import modelo as Mo  # noqa: E402
import nucleo as N  # noqa: E402

LOG = io.StringIO()
FALLAS = []


def say(*a):
    s = " ".join(str(x) for x in a)
    print(s)
    LOG.write(s + "\n")


def check(ok, msg):
    say(("[OK  ] " if ok else "[FAIL] ") + msg)
    if not ok:
        FALLAS.append(msg)


def node(js):
    r = subprocess.run(["node", "-e", js], cwd=N.RAIZ, capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        raise RuntimeError(r.stderr)
    return r.stdout


def cargar_salida(clave):
    return json.loads(node("global.window = {}; require('./web/nal/%s.js'); process.stdout.write(JSON.stringify(window.NAL_V2['%s']));" % (clave, clave)))


METR = ["top3", "donde20", "captura10", "errMediano", "errPersistencia", "dentroRango", "cuandoR"]


def paso1():
    say("\n== 1. NAL v1 reproduced (Node running web/js/nal.js vs the Python harness) ==")
    for clave in N.REGIONES:
        js = node("global.window = {}; require('./web/data/%s.js'); require('./web/js/nal.js'); var M = window.NAL.crear(window.QUEMAS);"
                  "process.stdout.write(JSON.stringify([1,2,3].map(function (h) { var v = M.validar(h); delete v.filas; return v; })));" % clave)
        R = N.Region(clave)
        for v in json.loads(js):
            p = N.validar(R, N.v1, v["h"])
            dif = max(abs(100 * (p[k] - v[k])) for k in METR)
            check(p["n"] == v["n"] and p["anios"] == v["anios"] and dif < 0.2,
                  "%s h=%d n=%d: max difference %.4f points (top3 %.2f, donde20 %.2f, captura10 %.2f, err %.2f, range %.0f%%)" % (
                      clave, v["h"], v["n"], dif, 100 * v["top3"], 100 * v["donde20"], 100 * v["captura10"], 100 * v["errMediano"], 100 * v["dentroRango"]))


def basura(R, corte, rng):
    """Copy of the region where everything after `corte` is garbage."""
    G = copy.copy(R)
    G.serie = R.serie.copy()
    fut = R.mid > corte
    G.serie[:, fut] = rng.uniform(0, 5000, (R.NC, fut.sum()))
    G.anio = {}
    for y, A in R.anio.items():
        G.anio[y] = G.serie[:, [int(np.where(R.mid == N.mid(y, m))[0][0]) for m in range(1, 13)]]
    G.clima = R.clima.copy()
    G.clima.loc[G.clima.index > corte] = rng.uniform(-100, 100, G.clima.loc[G.clima.index > corte].shape)
    G.oni = R.oni.copy()
    G.oni[G.oni.index > corte] = rng.uniform(-3, 3, (G.oni.index > corte).sum())
    return G


def paso2y3():
    say("\n== 2. No leak ==")
    rng = np.random.default_rng(7)
    recalculado = {}
    for clave in N.REGIONES:
        R = N.Region(clave)
        recalculado[clave] = {}
        out = cargar_salida(clave)
        for h in E.HORIZONTES:
            k = str(h)
            folds = E.correr(R, h)
            malos = []
            for f in folds:
                a, y = f["audit"], f["anio"]
                limite = N.corte_de(y, h)
                limite_regla = N.mid(y - 1, 10) if h == "nov" else N.mid(y - h, 12)
                txt = lambda m: N.txt_mid(m)
                if not (a["corte"] == txt(limite) and limite == limite_regla and limite < N.mid(y, 1)
                        and a["ultimo_dato_max"] <= a["corte"] and a["corte_vistas_max"] <= a["corte"]
                        and a["oni_usado"] <= a["corte"] and a["clima_hasta"] <= a["corte"]):
                    malos.append(y)
            check(not malos, "%s h=%s: %d folds, every view, fire month and predictor date <= issue date (Y-h, or Oct of Y-1) %s" % (
                clave, k, len(folds), malos or ""))
            dec = E.decidir(E.combinaciones(R, folds, h))
            check(tuple(dec) == E.decidir_desde(out, k), "%s h=%s: choice of parts recomputed = file (pattern %s, amount %s)" % (
                clave, k, "v2" if dec[0] else "v1", "v2" if dec[1] else "v1"))
            # canary: garbage after the issue date must not change anything (3 folds per horizon)
            pick = [folds[0], folds[len(folds) // 2], folds[-1]]
            dif = 0.0
            for f in pick:
                corte = N.corte_de(f["anio"], h)
                G = basura(R, corte, rng)
                a = Mo.armar(Mo.partes(G.vista(corte), h), *E.decidir_desde(out, k))
                b = Mo.armar(f["p"], *E.decidir_desde(out, k))
                dif = max(dif, float(np.abs(a["E"] - b["E"]).max()), abs(a["bajo"] - b["bajo"]), abs(a["alto"] - b["alto"]))
            check(dif == 0.0, "%s h=%s canary: data after the issue date replaced by garbage in years %s -> forecasts identical (max diff %g)" % (
                clave, k, [f["anio"] for f in pick], dif))
            up, uc = E.decidir_desde(out, k)
            v = E.resumen(R, folds, h, up, uc, con_escenarios=True)
            clim = N.validar(R, N.climatologia, h)
            recalculado[clave][k] = (E.contrato(v, clim), E.contrato(N.validar(R, N.v1, h), clim))
        rs = out["resumen_pronostico"]
        check(all(N.txt_mid(N.mid(2026, 10)) == out["emitido_con_datos_hasta"] for _ in rs),
              "%s public forecast issued with data up to %s (last month used is the issue month)" % (clave, out["emitido_con_datos_hasta"]))
    say("\n== 3. Stored validation recomputed from scratch ==")
    for clave in N.REGIONES:
        out = cargar_salida(clave)
        for k, (v, r) in recalculado[clave].items():
            for nombre, a, b in (("v2", v, out["validacion"][k]), ("v1", r, out["referencia_v1"][k])):
                dif = max(abs(a[m] - b[m]) for m in METR + ["errClimatologia"])
                difs = max(abs(fa[q] - fb[q]) for fa, fb in zip(a["filas"], b["filas"]) for q in ("real", "esperado", "bajo", "alto", "top3"))
                check(a["n"] == b["n"] and a["anios"] == b["anios"] and dif < 1e-6 and difs < 1e-6 and
                      [f["dentro"] for f in a["filas"]] == [f["dentro"] for f in b["filas"]],
                      "%s h=%s %s: %d years, metrics and rows match the file (max diff %g)" % (clave, k, nombre, a["n"], max(dif, difs)))


def paso4():
    say("\n== 4. Output contract ==")
    for clave in N.REGIONES:
        ruta = os.path.join(N.RAIZ, "web", "nal", clave + ".js")
        R = N.Region(clave)
        mb = os.path.getsize(ruta) / 1e6
        check(mb < 3, "%s file size %.2f MB (< 3 MB)" % (clave, mb))
        d = cargar_salida(clave)
        claves = ["version", "generado", "modelo", "emitido_con_datos_hasta", "anios", "esperado", "escenarios", "validacion",
                  "referencia_v1", "techo", "variables", "ficha"]
        check(all(c in d for c in claves), "%s loads in Node with global.window = {} and has all keys" % clave)
        anios = [str(a) for a in d["anios"]]
        ok_e = all(np.array(d["esperado"][a]).shape == (R.NC, 12) for a in anios)
        esc = {a: np.array(d["escenarios"][a]) for a in anios}
        ok_s = all(x.ndim == 3 and x.shape[1:] == (R.NC, 12) and 15 <= x.shape[0] <= 30 for x in esc.values())
        check(ok_e and ok_s, "%s esperado %s x %d cells x 12 and escenarios %s x %d x %d cells x 12" % (
            clave, len(anios), R.NC, len(anios), esc[anios[0]].shape[0], R.NC))
        todo = np.concatenate([np.array(d["esperado"][a]).ravel() for a in anios] + [x.ravel() for x in esc.values()])
        check(np.isfinite(todo).all() and (todo >= 0).all(), "%s no NaN, no negatives (%d numbers)" % (clave, todo.size))
        check(all(set(d["validacion"][h]) >= set(E.CLAVES + ["filas"]) for h in ("1", "2", "3")) and
              all(set(d["referencia_v1"][h]) >= set(E.CLAVES + ["filas"]) for h in ("1", "2", "3")) and
              set(d["techo"]) == {"top3", "donde20", "captura10"} and
              all(set(d["ficha"][l]) == {"que_usa", "como_se_probo", "limites"} for l in ("es", "en")),
              "%s validacion / referencia_v1 (h = 1, 2, 3, nov), techo and ficha (es, en) complete" % clave)
        ref = node("global.window = {}; require('./web/nal/%s.js'); var d = window.NAL_V2['%s'];"
                   "process.stdout.write(String(d.esperado['2030'] === d.esperado['2029'] && d.escenarios['2031'] === d.escenarios['2029']));" % (clave, clave))
        check(ref == "true", "%s 2030 and 2031 point to the 2029 arrays (no duplicated data)" % clave)


def paso5():
    say("\n== 5. Web review ==")
    r = subprocess.run([sys.executable, os.path.join("herramientas", "revisar_web.py")], cwd=N.RAIZ, capture_output=True, text=True, encoding="utf-8", errors="replace")
    ult = [l for l in r.stdout.splitlines() if l.strip()][-1]
    check(r.returncode == 0 and ult.startswith("PASS"), "herramientas/revisar_web.py: " + ult)
    rr = subprocess.run(["git", "diff", "--stat", "main", "--", "web/data", "pipeline", "resultados", "web/js", "web/index.html", "web/css"],
                        cwd=N.RAIZ, capture_output=True, text=True)
    check(rr.stdout.strip() == "", "no change against main in web/data, pipeline, resultados, web/js, web/index.html, web/css")


if __name__ == "__main__":
    paso1()
    paso2y3()
    paso4()
    paso5()
    say("\n%s: %d failure(s)" % ("PASS" if not FALLAS else "FAIL", len(FALLAS)))
    with open(os.path.join(E.SALIDA_RES, "verificar.txt"), "w", encoding="utf-8") as f:
        f.write(LOG.getvalue())
    import informe  # noqa: E402
    informe.main()
    sys.exit(1 if FALLAS else 0)
