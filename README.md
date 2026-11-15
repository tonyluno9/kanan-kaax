# Burn Calendar: a harmonized MODIS + VIIRS burning activity record

NASA Space Apps Challenge 2026. Challenge: **Harmonization of MODIS and VIIRS Hot Spots**.

Burn Calendar merges 25 years of satellite hot spots from two sensors into a single consistent record, shows it as a web calendar, flags anomalies with a plain-language explanation, and estimates weekly fire risk. Regions included: the Yucatán Peninsula (main case) and Portugal with western Spain (to show the method works elsewhere without code changes).

**Team La Com** (Mérida, Yucatán, Mexico): Angel Antonio Perez Reyes, Gabriel Chi Vidal, Alan Flores Denegri, Alessandro Novelo Diaz and Daniel Esquivel Gomez.

**Live app:** [link to the hosted app] · **Demo:** [link to the 7-slide demo]

## How it answers the challenge

| The challenge asks for | Where it is in Burn Calendar |
|---|---|
| Harmonize MODIS and VIIRS so the sensor of origin no longer matters | One "VIIRS-equivalent" series, 2000 to November 2026. Five methods compared on held-out years; error drops from 73.2 % to 10.0 % (section 5). A switch shows the unharmonized record and its false record year. |
| A burning activity calendar from the early 2000s to the present | Year-by-month calendar with an accessible color ramp (viridis), for the whole region or any selected area (section 2). |
| Select a region and a date range | Rectangle, free polygon, single cell, latitude/longitude box, and a year range (section 1). |
| Which periods of the year see more fire (critical periods) | The area's critical period is computed and highlighted in red in the calendar; a one-paragraph briefing states it (section 3). |
| Which years had more burning activity; how the current month compares with the historical median | Most active month and year, latest month against its median, any year against all others (section 3). |
| Anomalies against multi-year averages | Out-of-place, out-of-season and out-of-scale alerts, each explained in one sentence (section 4). |
| Download analytics and visualizations; a CSV of the hot spots found in a search | Monthly CSV, per-cell CSV, individual hot spots CSV, calendar image (PNG) and a printable area report (PDF). |
| Wildfires and agricultural burns | Each VIIRS fire event is classified as a small one-day burn (typical of agricultural burning), intermediate, or a large or long fire (typical of wildfire) (section 11). |
| Help early warning staff, responders, scientists and land managers | Weekly risk maps (section 6), fire inside protected areas (section 7), an alert checked against independent satellite imagery (section 8), season replay (section 9). |

## Who it is for

- **Fire brigades and early warning staff:** see when the critical period starts in their area, whether this season is above normal, and which cells are most at risk next week.
- **Protected area managers:** rank their areas by how unusual the latest year was and open each area's own calendar.
- **Researchers:** download a consistent 25-year series instead of two records that cannot be compared.

## What is new

- **Alerts are checked, not only raised.** A flagged event (June 2024, northern Quintana Roo) is verified with an independent NASA product (OPERA vegetation loss) and before/after imagery: 82.5 % of its hot spots fall on lost vegetation, against 11.3 % of random points.
- **It checks fire against the law.** The official burn calendar of each place (Yucatán's burning season; Portugal's summer burning ban) is compared with 25 years of harmonized fire. In Portugal, 98 % of the hot spots from large fires fall inside the ban, against 29 % for small one-day burns.
- **Burn or wildfire?** Hot spots are grouped into fire events and classified by size and duration, so a manager can tell planned burning from fires that got out of hand.
- **You can listen to it.** The calendar can be played as sound: one note per month, higher and louder with more fire.
- **It shows why harmonization matters.** Unharmonized, 2024 looks like Yucatán's record year; harmonized, it ranks 3rd of 25 and 2003 is first.
- **Plain language for people who decide.** Every alert and every selected area gets a sentence that explains it.
- **Honest negative results.** We tested whether heat anomalies anticipate fire week by week; they do not, and the app says so.

## Open the app

The app is a static web page: `web/index.html`. Serve the `quemas` folder with any web server (for example `python -m http.server 8000` and open http://localhost:8000/web/index.html) or use the hosted GitHub Pages link. The map tiles and the address search need an internet connection; without one, the app falls back to a simple built-in map and everything else keeps working.

**Main app (`web/index.html`)**, built for people who decide, not for analysts:

- A full-screen map with three backgrounds: NASA satellite (Blue Marble), the daily VIIRS image of any date (NASA GIBS), and streets (OpenStreetMap).
- An address search box: type a town, an address or coordinates, and the map flies there.
- Click anywhere on the map to see the answer for that spot, for its surroundings (about 125 km) or for the whole region.
- Three plain-language answers first: *When does it burn the most here?*, *How is 2026 going?* and *Anything unusual?*
- Shortcuts to places worth seeing, such as the June 2024 fire at Yum Balam.
- Replay any season week by week on the map.
- Tabs with the details: calendar (click a month to paint it on the map, listen to it as sound, download CSV or image), years compared, alerts, official burn calendar and burn-or-wildfire, weekly risk, protected areas, the event checked from space (before/after slider), and how well the harmonization works.

**Technical view (`web/tecnico.html`)**, the full analyst page: select an area with a rectangle, a polygon, a cell or coordinates, read its briefing, print a one-area report (PDF), and see every chart on one page.

Use the region selector to switch between the Yucatán Peninsula and Portugal, and the language button to switch between English and Spanish.

## Recompute

Python 3.10 or later.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python ejecutar.py              # all regions that have data
python ejecutar.py yucatan      # one region
python ejecutar.py --prueba     # synthetic test data (the page shows a yellow warning)
```

## Repository map

File and folder names are in Spanish; this table explains each one.

| Path | What it does |
|---|---|
| `ejecutar.py` | Runs the whole pipeline |
| `descargar.py` | Downloads FIRMS hot spots by country |
| `descargar_clima.py` | Downloads daily climate from NASA POWER |
| `descargar_2026.py` | Downloads the current year through the FIRMS area API (needs a MAP_KEY) |
| `pipeline/config.py` | Regions, cell size and thresholds |
| `pipeline/preparar.py` | Reads the CSV files, filters, and counts by cell and month |
| `pipeline/armonizar.py` | Converts MODIS to "VIIRS-equivalent" and validates |
| `pipeline/anomalias.py` | Out-of-place, out-of-season and out-of-scale fire |
| `pipeline/riesgo.py` | Weekly risk and the climate-fire relationship |
| `pipeline/areas.py` | Fire inside protected areas (WDPA boundaries) |
| `pipeline/extra.py` | Official burn calendar against satellites; fire events (burn or wildfire) |
| `pipeline/exportar.py` | Writes the files in `web/data/` |
| `pipeline/datos_prueba.py` | Synthetic data for testing without real data |
| `herramientas/generar_geo.js` | Builds the outline and land mask of a region |
| `web/index.html` | The web application (map, search, plain-language answers) |
| `web/tecnico.html` | Technical view of the app, for analysts |
| `resultados/` | Validation output of the latest run with real data |
| `docs/submission.md` | Project submission text, demo outline and references |

## Data

| Data | Source | Folder |
|---|---|---|
| MODIS hot spots (2000 to November 2026) and VIIRS NOAA-20 hot spots (2018 to November 2026) | NASA FIRMS: yearly country summaries to 2025; 2026 through the FIRMS area API (standard processing to July/August, near real time after) | `datos/firms/<region>/` |
| Daily climate, 2001-2025 | NASA POWER, regional daily API | `datos/clima/<region>/` |
| Protected area boundaries | WDPA (UNEP-WCMC and IUCN), October 2026, national terrestrial or coastal designations of at least 100 km² of land | `datos/areas/` |
| Before/after imagery and vegetation loss | NASA GIBS: HLS S30 (Harmonized Landsat Sentinel-2, from ESA Copernicus Sentinel-2 data) and OPERA L3 DIST-ALERT-HLS | `web/data/evidencia/` |

Raw data files are not stored in the repository because of their size. Get them with the `descargar*.py` scripts.

Notes on FIRMS (checked on November 13, 2026):

- The country page does not include the current year. For 2026, use `descargar_2026.py` with a free MAP_KEY.
- VIIRS Suomi NPP stopped delivering data on November 2, 2026. Continuity is with NOAA-20 and NOAA-21.
- If CSV files from more than one VIIRS satellite are present, the pipeline uses only one, so the same fire is not counted twice.

## How it works

1. **Read and count.** Low-confidence detections and non-vegetation sources are dropped. The region is split into 0.25° cells and detections are counted by cell and month.
2. **Harmonize.** The MODIS-to-VIIRS relationship is learned from the months when both sensors observed. Five methods are tested and the one with the lowest held-out error is used.
3. **Critical period and anomalies.** The critical period is the run of consecutive months in which each month holds more than its average share (1/12) of the area's detections. For each cell and month, "normal" is computed from all other years, and three kinds of alert are raised for the last 36 months.
4. **Risk.** For each cell and week, the probability of fire is estimated from what was known the week before.
5. **Protected areas.** Each hot spot carries its harmonized weight (1 for a VIIRS detection; the cell's harmonized value divided by its MODIS count for a MODIS-only month), so any subset of points, such as those inside a protected area or in one week, adds up on the same scale.
6. **Official calendar and fire events.** Hot spots inside the official zone (Yucatán state; mainland Portugal) are compared with the official burning window. VIIRS detections less than 1 km and at most 1 day apart are joined into events; an event is small (up to 3 detections in one day), large or long (30 detections or more, or 4 days or more) or intermediate.
7. **Export.** Everything is written to `web/data/` and the page only displays it.

## Results with real data (November 14, 2026)

### Harmonization

| Region | Chosen method | Median monthly error | R² | Uncorrected MODIS |
|---|---|---|---|---|
| Yucatán Peninsula | One factor per calendar month | 10.0 % | 0.986 | 73.2 % |
| Portugal and western Spain | One factor per calendar month | 19.3 % | 0.96 | 64.0 % |

Validation: one full year is held out, the model is trained on the others and predicts the held-out year; this is repeated for every year.

- In Yucatán, VIIRS sees 3 to 6 times more detections than MODIS; the ratio is lowest in April-May and highest in October-November.
- Before July 2002 only MODIS Terra existed; for those months the error rises to about 20 %.

### What the data show

- **Yucatán:** April and May hold 76 % of all detections over 2001-2025 (72 % in the VIIRS years 2018-2025); the critical period, March to May, holds 87 %. Most active years: 2003, 2011 and 2024. June 2024 is the most anomalous recent month (7,900 detections against a median near 1,600).
- **Portugal:** the critical period is July to October (75 % of all detections). The most active years in the series are 2005, 2003 and 2017, which match its worst known fire seasons. The detector flags August 2025 and September 2024.

### Weekly risk (Yucatán, tested on 2023-2025)

| Model | AUC | Detections inside the top 10 % risk |
|---|---|---|
| Calendar only | 0.889 | 64.7 % |
| Calendar + fire in the previous week (used) | 0.898 | 75.8 % |
| The above + weekly heat and dryness | 0.895 | 75.8 % |

- Weekly weather at 55 km does not improve the local forecast.
- A "heat pocket" alone does not anticipate fire: 25.4 % of cases with fire against 25.6 % without a heat anomaly.
- Climate does explain how strong each season is: over 25 years, the correlation between March-June fire and March-May soil wetness is -0.88; with air humidity, -0.86; with surface temperature, +0.60.
- Forecasting the season from February-March data barely works: correlation of 0.14 on held-out years.

### Fire in protected areas

- Yucatán: 28 protected areas with fire. In 2025, 12.9 % of the region's fire fell inside a protected area (median across years 9.8 %).
- Portugal and western Spain: 33 areas; 18.3 % in 2025 (median 11.2 %). Several areas had their worst year on record in 2025.

### Ground check of an alert (Yucatán)

- The detector flagged June 2024 in northern Quintana Roo (260 detections in a cell whose June median is 0). The event ran from May 13 to June 11, 2024, with 587 VIIRS detections, 88 of them inside the Yum Balam protected area.
- Before (April 20) and after (July 9) HLS imagery shows the burn scars.
- 82.5 % of the event's detections fall exactly on a 30-m pixel that OPERA DIST-ALERT marks as vegetation loss, against 11.3 % of random land points in the same area. Allowing half a VIIRS pixel (about 190 m), 99.7 % against 46.2 %.

### Official burn calendar against satellites

- **Yucatán state:** the official 2026 burn calendar allows agricultural burning from 1 March to 31 May (four zones with shorter windows). Over 2001-2025, 8.4 % of the state's harmonized fire happened outside that season; the share rose from 6.5 % (2001-2010) to 12.6 % (2016-2025), and reached **20.2 % in 2026** (through November 14), the highest share in 26 years. The 2026 season is applied to every year as a reference.
- **Mainland Portugal:** burning is banned during the critical period, 1 July to 30 September. Over 2001-2025, 70 % of the fire happened during the ban. With VIIRS (2018-2026), 98 % of the detections from large fires fall inside it, against 29 % of those from small one-day burns: small burns follow the rule, wildfires do not.

### Agricultural burn or wildfire (VIIRS, 2018-2026)

- **Yucatán Peninsula:** 51 % of detections come from small one-day burns, 35 % from intermediate events and 14 % from large or long fires (1,804 events). The June 2024 Yum Balam event is classified as large.
- **Portugal and western Spain:** 20 % small burns, 20 % intermediate, 59 % large or long fires (257 events).
- This is an estimate based on size and duration; a hot spot does not tell what caused the fire.

## Known limits

- Only 102 months overlap between MODIS and VIIRS NOAA-20.
- The harmonization error is for the regional total; it is larger for a single cell.
- Anomaly thresholds are provisional (`MIN_DETECCIONES` in `config.py`).
- Climate comes from a reanalysis model at about 55 km, not from 1-km thermal imagery.
- The official calendar comparison uses one window per zone (the 2026 Yucatán season, the standard Portuguese critical period) for every year; real windows vary by zone and year.
- The record runs to November 14, 2026; August to November 2026 come from FIRMS near-real-time data, which can still change slightly.

## Add another region

1. Add the region in `pipeline/config.py` (name, bounding box, countries).
2. Build its map: `npm install world-atlas topojson-client`, then `node herramientas/generar_geo.js <key> <lon_min> <lat_min> <lon_max> <lat_max> 0.25`.
3. `python descargar.py <key>` and `python ejecutar.py <key>`.

## Credits and AI disclosure

- Data: NASA FIRMS (MODIS and VIIRS NOAA-20, standard processing), NASA POWER, and NASA GIBS (HLS S30 and OPERA DIST-ALERT-HLS).
- Partner data: Copernicus Sentinel-2 (ESA), through the HLS S30 product.
- Protected areas: UNEP-WCMC and IUCN (2026), Protected Planet: The World Database on Protected Areas (WDPA), October 2026, Cambridge, UK. www.protectedplanet.net
- Official burn calendars: Yucatán's Calendario Oficial de Quemas 2026 (Comité Estatal del Programa de Prevención y Combate de Incendios Agrícolas y Forestales) and Law on Prevention and Combat of Agricultural and Forest Fires of the State of Yucatán; Portugal's critical period (Lei n.º 76/2017, Decreto-Lei n.º 82/2021).
- Outlines: Natural Earth, through the `world-atlas` package, and Natural Earth admin-1 for the outline of Yucatán state. Libraries: pandas, numpy, Leaflet.
- Maps in the app: NASA GIBS (Blue Marble shaded relief and daily VIIRS NOAA-20 true color), © OpenStreetMap contributors (street map and Nominatim address search), place labels © Esri.
- **AI disclosure:** the code in this repository was generated with the assistance of an AI tool (Claude, by Anthropic), which was also used to draft documentation. Each code file carries this notice in its header. The team reviewed and ran the code and is responsible for the results.
