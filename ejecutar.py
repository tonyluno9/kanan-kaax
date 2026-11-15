# AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
# and reviewed by the team. NASA Space Apps Challenge 2026.
"""Corre todo el pipeline y deja lista la página web.

    python ejecutar.py                  todas las regiones que tengan CSV en datos/firms/<clave>/
    python ejecutar.py yucatan          solo esa región
    python ejecutar.py --prueba         genera datos sintéticos (Yucatán) y corre con ellos
"""
import sys

from pipeline import anomalias, areas, armonizar, config as C, exportar, extra, preparar, riesgo


def correr(clave, prueba=False):
    C.usar(clave)
    print(f"=== {C.REGION} ===")
    if prueba:
        from pipeline import datos_prueba
        print("0. Generando datos sintéticos de prueba")
        datos_prueba.generar()
        C.DIR_FIRMS = datos_prueba.DIR_PRUEBA
    print("1. Leyendo y contando detecciones")
    conteos, det = preparar.preparar()
    print("2. Armonizando MODIS y VIIRS")
    res, validacion = armonizar.armonizar(conteos)
    print("3. Buscando anomalías")
    alertas = anomalias.buscar(res)
    print("4. Riesgo térmico")
    r = None if prueba else riesgo.calcular(det, res)
    peso = armonizar.pesos_detecciones(det, res, validacion["viirs_usado"])
    print("5. Fuego en áreas protegidas")
    ap = None if prueba else areas.calcular(det, peso, res)
    print("6. Exportando para la web")
    exportar.exportar(res, validacion, alertas, sintetico=prueba, riesgo=r, areas=ap)
    exportar.exportar_puntos(det)
    exportar.exportar_semanal(det, peso)
    if not prueba:
        print("7. Calendario oficial y tipo de fuego")
        extra.exportar(extra.calcular(det, peso, validacion["viirs_usado"]))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    prueba = "--prueba" in sys.argv
    claves = ["yucatan"] if prueba else (args or list(C.REGIONES))
    hechas = []
    for clave in claves:
        C.usar(clave)
        if not prueba and not any(C.DIR_FIRMS.glob("*.csv")):
            print(f"(sin datos para {clave}: no hay CSV en {C.DIR_FIRMS})")
            continue
        correr(clave, prueba)
        hechas.append(clave)
    # El selector de la página lista todas las regiones que ya tienen archivo
    listas = [k for k in C.REGIONES if (C.DIR_WEB / f"{k}.js").exists()]
    exportar.exportar_indice(listas)
    print("Listo. Abran web/index.html en el navegador." if hechas else "No se procesó ninguna región.")


if __name__ == "__main__":
    main()
