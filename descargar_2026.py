# AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
# and reviewed by the team. NASA Space Apps Challenge 2026.
"""Descarga las detecciones del año en curso con la API de área de FIRMS (necesita MAP_KEY).

    python descargar_2026.py TU_MAP_KEY              región yucatan
    python descargar_2026.py TU_MAP_KEY portugal

La MAP_KEY es gratuita: se pide con un correo en https://firms.modaps.eosdis.nasa.gov/api/map_key/
La API entrega máximo 5 días por petición, así que el script avanza de 5 en 5 días desde el 1 de enero.
Baja por separado los datos definitivos (SP) y los casi en tiempo real (NRT); FIRMS publica SP con unos meses de retraso.
Documentación: https://firms.modaps.eosdis.nasa.gov/api/area/
"""
import datetime
import sys
import time
import urllib.request

from pipeline import config as C

API = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
FUENTES = {"modis": ("MODIS_SP", "MODIS_NRT"), "viirs-jpss1": ("VIIRS_NOAA20_SP", "VIIRS_NOAA20_NRT")}


def pedir(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=120) as r:
        return r.read().decode("utf-8", "replace").strip().splitlines()


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    llave = sys.argv[1]
    clave = sys.argv[2] if len(sys.argv) > 2 else "yucatan"
    C.usar(clave)
    C.DIR_FIRMS.mkdir(parents=True, exist_ok=True)
    hoy = datetime.date.today()
    area = f"{C.LON_MIN},{C.LAT_MIN},{C.LON_MAX},{C.LAT_MAX}"
    # Los datos definitivos (SP) y los casi en tiempo real (NRT) tienen columnas distintas
    # (NRT no trae "type"), así que se guardan en archivos separados.
    for sensor, fuentes in FUENTES.items():
        for fuente in fuentes:
            cabecera, filas = None, []
            dia = datetime.date(hoy.year, 1, 1)
            while dia <= hoy:
                lineas = pedir(f"{API}/{llave}/{fuente}/{area}/5/{dia.isoformat()}")
                if lineas and "latitude" in lineas[0]:
                    cabecera = cabecera or lineas[0]
                    filas += [x for x in lineas[1:] if x.strip()]
                elif lineas:
                    print(f"  aviso {fuente} {dia}: {lineas[0][:120]}")
                dia += datetime.timedelta(days=5)
                time.sleep(0.2)
            tipo = "nrt" if fuente.endswith("NRT") else "sp"
            if cabecera and filas:
                salida = C.DIR_FIRMS / f"{sensor}_{clave}_{hoy.year}_{tipo}.csv"
                salida.write_text(cabecera + "\n" + "\n".join(filas) + "\n")
                print(f"  {salida.name}: {len(filas):,} detecciones")
            else:
                print(f"  sin datos para {fuente}")
    print(f"Listo. Ahora corran: python ejecutar.py {clave}")


if __name__ == "__main__":
    main()
