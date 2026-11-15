# AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
# and reviewed by the team. NASA Space Apps Challenge 2026.
"""Descarga de FIRMS los resúmenes anuales por país (MODIS y VIIRS NOAA-20) de una región.

    python descargar.py              región yucatan (México)
    python descargar.py portugal     otra región definida en pipeline/config.py

Fuente: https://firms.modaps.eosdis.nasa.gov/country/  (MODIS desde 2000, VIIRS NOAA-20 desde 2018).
Baja el país completo; el pipeline recorta la región al leer.
"""
import datetime
import sys
import urllib.error
import urllib.request

from pipeline import config as C

BASE = "https://firms.modaps.eosdis.nasa.gov/data/country"
SENSORES = {"modis": 2000, "viirs-jpss1": 2018}      # sensor: primer año


def main():
    clave = sys.argv[1] if len(sys.argv) > 1 else "yucatan"
    C.usar(clave)
    C.DIR_FIRMS.mkdir(parents=True, exist_ok=True)
    for pais in C.REGIONES[clave]["paises"]:
        for sensor, inicio in SENSORES.items():
            for anio in range(inicio, datetime.date.today().year + 1):
                nombre = f"{sensor}_{anio}_{pais}.csv"
                archivo = C.DIR_FIRMS / nombre
                if archivo.exists() and archivo.stat().st_size > 0:
                    print(f"  ya está    {nombre}")
                    continue
                try:
                    pet = urllib.request.Request(f"{BASE}/{sensor}/{anio}/{nombre}", headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(pet, timeout=180) as r:
                        datos = r.read()
                    archivo.write_bytes(datos)
                    print(f"  descargado {nombre} ({len(datos) / 1e6:.1f} MB)")
                except urllib.error.HTTPError as e:
                    print(f"  no existe  {nombre} (HTTP {e.code}); FIRMS aún no publica ese año")
                except Exception as e:  # red caída, tiempo agotado, etc.
                    print(f"  falló      {nombre}: {e}")
    print(f"Listo. Archivos en {C.DIR_FIRMS}. Ahora corran: python ejecutar.py {clave}")


if __name__ == "__main__":
    main()
