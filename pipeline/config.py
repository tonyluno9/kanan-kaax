# AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
# and reviewed by the team. NASA Space Apps Challenge 2026.
"""Configuración del proyecto. Aquí se definen las regiones, la malla y los umbrales."""
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DIR_WEB = RAIZ / "web" / "data"            # archivos que lee la página

# Regiones disponibles. Para agregar otra: añadan una entrada, generen su mapa con
# herramientas/generar_geo.js y pongan sus CSV de FIRMS en datos/firms/<clave>/.
# bbox = (lon_min, lat_min, lon_max, lat_max); malla en grados (0.25 son unos 27 km).
REGIONES = {
    "yucatan": {"nombre": "Península de Yucatán", "nombre_en": "Yucatán Peninsula", "bbox": (-92.5, 17.75, -86.5, 21.75), "malla": 0.25,
                "paises": ["Mexico"]},
    "portugal": {"nombre": "Portugal y oeste de España", "nombre_en": "Portugal and western Spain", "bbox": (-9.75, 36.75, -6.0, 42.25), "malla": 0.25,
                 "paises": ["Portugal", "Spain"]},
}

# Filtros de calidad
MODIS_CONFIANZA_MIN = 30                   # MODIS: confianza 0-100; se descarta < 30
VIIRS_DESCARTAR = {"l", "low"}             # VIIRS: se descarta confianza baja

# Fechas de los sensores
VIIRS_INICIO = (2012, 2)                   # primer mes completo de VIIRS S-NPP
AQUA_INICIO = (2002, 7)                    # antes de esta fecha solo hay MODIS Terra

# Anomalías
MESES_A_REVISAR = 36                       # se buscan anomalías en los últimos N meses
MIN_DETECCIONES = 10                       # mínimo de detecciones en la celda-mes para alertar
                                           # (un solo fuego puede dar varios píxeles VIIRS; ajústenlo)

# Calendario oficial de quemas de cada región (pipeline/extra.py).
# tipo "permitido": la ventana en que la ley permite quemar; "prohibido": la ventana en que se prohíbe.
CALENDARIO_OFICIAL = {
    "yucatan": {"zona": "zona_oficial_yucatan.json", "tipo": "permitido", "inicio": "03-01", "fin": "05-31",
                "fuente": "Calendario Oficial de Quemas 2026, Comité Estatal del Programa de Prevención y Combate de Incendios Agrícolas y Forestales de Yucatán (4 zonas, del 1 de marzo al 31 de mayo); Ley de Prevención y Combate de Incendios Agropecuarios y Forestales del Estado de Yucatán.",
                "nota": "Se usa la temporada completa de 2026 (1 de marzo al 31 de mayo) para todos los años como referencia; cada zona tiene una ventana más corta.",
                "nota_en": "The full 2026 season (1 March to 31 May) is used as a reference for every year; each zone has a shorter window."},
    "portugal": {"zona": "zona_oficial_portugal.json", "tipo": "prohibido", "inicio": "07-01", "fin": "09-30",
                 "fuente": "Período crítico do Sistema de Defesa da Floresta contra Incêndios (Lei n.º 76/2017; Decreto-Lei n.º 82/2021): 1 de julho a 30 de setembro, prorrogável.",
                 "nota": "Durante el período crítico las quemas están prohibidas; el gobierno puede ampliarlo en años secos.",
                 "nota_en": "Burning is banned during the critical period; the government can extend it in dry years."},
}

# Eventos de fuego (pipeline/extra.py): detecciones VIIRS a <= 1 km y <= 1 día forman un evento.
EVENTO_DIST_KM = 1.0
EVENTO_PEQ_N = 3            # pequeño: hasta 3 detecciones en un solo día
EVENTO_GRANDE_N = 30        # grande: 30 detecciones o más...
EVENTO_GRANDE_DIAS = 4      # ...o 4 días o más

# Valores de la región activa (los fija usar())
CLAVE = REGION = None
LON_MIN = LAT_MIN = LON_MAX = LAT_MAX = MALLA = None
NX = NY = None
DIR_FIRMS = DIR_SALIDA = DIR_CLIMA = None


def usar(clave):
    """Activa una región: todos los módulos leen sus valores desde aquí."""
    global CLAVE, REGION, LON_MIN, LAT_MIN, LON_MAX, LAT_MAX, MALLA, NX, NY, DIR_FIRMS, DIR_SALIDA, DIR_CLIMA
    r = REGIONES[clave]
    CLAVE, REGION, MALLA = clave, r["nombre"], r["malla"]
    LON_MIN, LAT_MIN, LON_MAX, LAT_MAX = r["bbox"]
    NX = round((LON_MAX - LON_MIN) / MALLA)
    NY = round((LAT_MAX - LAT_MIN) / MALLA)
    DIR_FIRMS = RAIZ / "datos" / "firms" / clave
    DIR_SALIDA = RAIZ / "salida" / clave
    DIR_CLIMA = RAIZ / "datos" / "clima" / clave


def geo():
    """Máscara de tierra y contorno de costa de la región activa (si existen)."""
    import json
    p = RAIZ / "pipeline" / "geo" / f"{CLAVE}.json"
    if p.exists():
        return json.loads(p.read_text())
    return {"tierra": [1] * (NX * NY), "costa": []}


usar("yucatan")
