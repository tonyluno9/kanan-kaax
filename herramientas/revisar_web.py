#!/usr/bin/env python3
# Burn Calendar (NASA Space Apps Challenge 2026) - quick automated check of the web app.
# AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
# and reviewed by the team.
#
# Runs only the checks that catch real breakage after a visual redesign:
#   1. Data and pipeline untouched since the base git tag (numbers must not change).
#   2. Local CSS/JS files referenced by web/index.html exist.
#   3. Every element id the JavaScript looks up still exists (in the HTML or created by JS).
#   4. Required features and credits are still there (fallback map, search rate limit, viridis ramp...).
#   5. JavaScript syntax (needs Node; skipped if Node is not installed).
#   6. Only allowed external hosts; page weight; file count to publish; emojis left in the UI.
#
# Usage (from the quemas folder):   python herramientas/revisar_web.py [--base base-rediseno]
# Exit code 0 = no FAIL, 1 = at least one FAIL.

import argparse, os, re, shutil, subprocess, sys, tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
WEB = RAIZ / "web"
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

resultados = []
def rep(nivel, msg):
    resultados.append((nivel, msg))

def leer(p):
    return Path(p).read_text(encoding="utf-8", errors="replace")

def git(*args):
    try:
        r = subprocess.run(["git", *args], cwd=RAIZ, capture_output=True, text=True, timeout=60)
        return r.returncode, r.stdout.strip(), r.stderr.strip()
    except Exception as e:  # git missing
        return 99, "", str(e)

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="base-rediseno", help="git tag or commit taken before the redesign")
a = ap.parse_args()

# ---------- 1. data and pipeline untouched ----------
PROTEGIDO = ["web/data", "pipeline", "ejecutar.py", "descargar.py", "descargar_2026.py", "descargar_clima.py", "resultados"]
c, out, err = git("rev-parse", "--verify", a.base)
if c != 0:
    rep("WARN", f"git base '{a.base}' not found: data check skipped (create it with: git tag {a.base})")
else:
    c, out, err = git("diff", "--name-only", a.base, "--", *PROTEGIDO)
    c2, out2, _ = git("ls-files", "--others", "--exclude-standard", "--", *PROTEGIDO)
    cambios = [x for x in (out + "\n" + out2).splitlines() if x.strip()]
    if cambios:
        rep("FAIL", "data/pipeline changed since base (numbers must not change): " + ", ".join(cambios[:12]))
    else:
        rep("OK", "web/data, pipeline and results unchanged since " + a.base)

# ---------- 2. referenced local files ----------
idx = WEB / "index.html"
if not idx.exists():
    rep("FAIL", "web/index.html is missing"); html = ""
else:
    html = leer(idx)
html_sin_js = re.sub(r"(<script[^>]*>)[\s\S]*?(</script>)", r"\1\2", html)
refs = re.findall(r'<(?:script|link|img)\b[^>]*?(?:src|href)="([^"#?]+)', html_sin_js)
locales = [r for r in refs if not re.match(r"^(https?:)?//|^data:|^mailto:", r) and not r.endswith(".html")]
faltan = [r for r in locales if not (WEB / r).exists()]
if faltan:
    rep("FAIL", "files referenced by index.html do not exist: " + ", ".join(faltan))
else:
    rep("OK", f"{len(locales)} local files referenced by index.html exist")

js_files = sorted((WEB / "js").glob("*.js")) if (WEB / "js").exists() else []
css_files = sorted((WEB / "css").glob("*.css")) if (WEB / "css").exists() else []
inline_js = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)</script>", html)
codigo = "\n".join(inline_js + [leer(f) for f in js_files])
estilos = "\n".join(re.findall(r"<style[^>]*>([\s\S]*?)</style>", html) + [leer(f) for f in css_files])
todo = html + "\n" + codigo + "\n" + estilos

# ---------- 3. element ids ----------
usados = set(re.findall(r'\$\(\s*"([\w-]+)"\s*\)', codigo))
usados |= set(re.findall(r'getElementById\(\s*"([\w-]+)"\s*\)', codigo))
usados |= set(re.findall(r'querySelector(?:All)?\(\s*"#([\w-]+)', codigo))
definidos = set(re.findall(r'\bid\s*=\s*\\?["\']([\w-]+)', html + codigo))
definidos |= set(re.findall(r'\.id\s*=\s*"([\w-]+)"', codigo))
definidos |= set(re.findall(r'L\.map\(\s*"([\w-]+)"', codigo))
faltan_id = sorted(i for i in usados - definidos if not i.startswith("tab-"))
faltan_tab = sorted(i for i in usados - definidos if i.startswith("tab-"))
if faltan_id:
    rep("FAIL", "ids used by the JavaScript but not found in the HTML or JS: " + ", ".join(faltan_id))
else:
    rep("OK", f"all {len(usados)} element ids used by the JavaScript exist")
if faltan_tab:
    rep("WARN", "tab ids built dynamically, check by hand: " + ", ".join(faltan_tab))

# ---------- 4. features and credits that must stay ----------
DEBE = {
    "AI disclosure (in a header comment or footer)": r"AI disclosure|generated with the assistance of an AI",
    "NASA GIBS credit": r"NASA GIBS",
    "OpenStreetMap credit": r"OpenStreetMap",
    "Esri label credit": r"Esri",
    "Leaflet map": r"L\.map\(",
    "offline SVG fallback map": r"crearSvg|svgmapa",
    "Nominatim search": r"nominatim\.openstreetmap\.org",
    "Nominatim rate limit (1 request per second)": r"esperarTurno|1100",
    "bilingual texts t(es, en)": r"function t\(",
    "region/lang URL params": r"URLSearchParams",
    "viridis ramp start #440154": r"#440154",
    "viridis ramp end #fde725": r"#fde725",
    "data loaded from data/regiones.js": r"data/regiones\.js",
    "team credit La Com": r"La Com",
}
for nombre, patron in DEBE.items():
    if re.search(patron, todo, re.I):
        rep("OK", nombre)
    else:
        rep("FAIL", "missing: " + nombre)

# ---------- 5. JavaScript syntax ----------
node = shutil.which("node")
if not node:
    rep("WARN", "Node not installed: JavaScript syntax check skipped (open the page and look at the console)")
else:
    piezas = [(f.name, leer(f)) for f in js_files] + [(f"inline #{i+1}", s) for i, s in enumerate(inline_js) if s.strip()]
    malos = []
    for nombre, src in piezas:
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as tf:
            tf.write(src); tmp = tf.name
        r = subprocess.run([node, "--check", tmp], capture_output=True, text=True)
        os.unlink(tmp)
        if r.returncode != 0:
            linea = next((l for l in r.stderr.splitlines() if "Error" in l), r.stderr[:200])
            malos.append(f"{nombre}: {linea}")
    if malos:
        rep("FAIL", "JavaScript syntax errors: " + " | ".join(malos))
    else:
        rep("OK", f"JavaScript syntax OK ({len(piezas)} scripts)")

# ---------- 6. hosts, weight, files to publish, emojis ----------
PERMITIDOS = {"fonts.googleapis.com", "fonts.gstatic.com", "unpkg.com", "gibs.earthdata.nasa.gov",
              "tile.openstreetmap.org", "server.arcgisonline.com", "nominatim.openstreetmap.org"}
cargas = re.findall(r'(?:src|href)="(https?://[^"]+)"', html)
cargas += re.findall(r'url\(\s*["\']?(https?://[^"\')]+)', estilos) + re.findall(r'@import\s+["\'](https?://[^"\']+)', estilos)
cargas += re.findall(r'"(https?://[^"\s]+?)(?:\{|")', codigo)
hosts = {re.sub(r"^https?://([^/]+).*", r"\1", u) for u in cargas}
hosts = {h.replace("{s}.", "") for h in hosts}
raros = sorted(h for h in hosts if h not in PERMITIDOS and not h.endswith(("nasa.gov", "openstreetmap.org", "github.com", "github.io", "protectedplanet.net", "spaceappschallenge.org", "w3.org")))
if raros:
    rep("WARN", "external hosts not in the allowed list (check they are needed and credited): " + ", ".join(raros))
else:
    rep("OK", "only allowed external hosts")

peso = idx.stat().st_size + sum(f.stat().st_size for f in js_files + css_files) if idx.exists() else 0
rep("WARN" if peso > 450_000 else "OK", f"app code weight {peso/1024:.0f} KB (index.html + web/css + web/js; data not counted)")

c, out, _ = git("ls-files")
if c == 0 and out:
    n = len(out.splitlines())
    rep("INFO", f"{n} files tracked by git (GitHub web upload takes 100 at a time; git push has no such limit)")

emojis = re.findall(r"[\U0001F300-\U0001FAFF☀-⛿✀-➿]", html + codigo)
rep("INFO", f"{len(emojis)} emoji characters left in the UI code" + (" (" + "".join(sorted(set(emojis)))[:30] + ")" if emojis else ""))

# ---------- report ----------
orden = {"FAIL": 0, "WARN": 1, "OK": 2, "INFO": 3}
for nivel, msg in sorted(resultados, key=lambda x: orden[x[0]]):
    print(f"[{nivel:4}] {msg}")
fallas = sum(1 for n, _ in resultados if n == "FAIL")
print(f"\n{'FAIL' if fallas else 'PASS'}: {fallas} failure(s), {sum(1 for n, _ in resultados if n == 'WARN')} warning(s)")
sys.exit(1 if fallas else 0)
