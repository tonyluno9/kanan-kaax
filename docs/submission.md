# Project submission text

Everything on the project page and in linked materials must be in English. All figures below come from the run with real data on November 14, 2026. Replace the text in [brackets].

## Project Name

Burn Calendar

## High-Level Project Summary

Satellites have recorded fire hot spots for 25 years, but the record is split between MODIS, which is reaching the end of its life, and VIIRS, which sees 3 to 6 times more detections for the same fires. Burn Calendar harmonizes both into a single record from 2000 to November 2026 and puts it in a web application built around a satellite map with an address search. A user types a town or clicks the map and first gets three plain answers (when it burns most, how this year is going, anything unusual), then its burning activity calendar with its critical period highlighted, a one-paragraph briefing, the comparison of the latest month against the historical median, anomaly alerts explained in plain language, a weekly risk map, and downloads (CSV, calendar image, printable report). The record is updated to November 2026. On held-out years, harmonization lowers the median monthly error from 73.2 % (uncorrected MODIS) to 10.0 % in the Yucatán Peninsula. It compares the official burn calendar of each place with what the satellites saw, and tells small agricultural burns from large wildfires. We also checked one alert against independent NASA imagery: 82.5 % of its hot spots fall on vegetation that was lost, against 11.3 % of random points. The same code, unchanged, also runs for Portugal and recovers its worst known fire years. With one consistent record, fire managers can tell whether the current season is normal or exceptional.

## Link to Project Demo

[Public link to the 7-slide deck or the 30-second video]

## Link to Final Project

[Public link to the repository and to the hosted web app]

## Detailed Project Description

**How it answers the challenge**

| The challenge asks for | Burn Calendar |
|---|---|
| Harmonize MODIS and VIIRS so the sensor of origin no longer matters | One VIIRS-equivalent series, 2000 to November 2026, validated on held-out years (10.0 % error against 73.2 % uncorrected) |
| A burning activity calendar from the early 2000s, with accessible color ramps | Year-by-month calendar, viridis ramp, for any area |
| Select a region and a date range | Rectangle, polygon, cell or coordinates, and a year range |
| Which periods of the year see more fire | Critical period computed for the selected area and highlighted in the calendar |
| Which years were most active; the current month against the historical median | Summary cards, cumulative chart and rank of any year |
| Anomalies against multi-year averages | Three kinds of alert, each explained in a sentence |
| Download analytics and visualizations; a CSV of hot spots found in a search | Monthly, per-cell and hot spot CSV files, calendar image (PNG), printable area report (PDF) |

**What it does**

- Opens with four key findings; each one jumps to its evidence.
- Builds one harmonized hot spot series (VIIRS-equivalent detections) per 0.25° cell and month, from November 2000 to November 2026.
- Shows a year-by-month burning calendar for any area the user selects with a rectangle, a free polygon or coordinates, with an accessible color ramp.
- Lets the user switch to the unharmonized record to see the artificial jump caused by the sensor change: unharmonized, 2024 looks like the record year in Yucatán; harmonized, it ranks 3rd of 25 and 2003 is first.
- Tracks any year against all others with a cumulative chart, its rank and its distance from the median year.
- Computes the critical period of the selected area (the consecutive months that each hold more than their average share of fire) and highlights it in the calendar.
- Writes a one-paragraph briefing for the selected area: critical period, most active years, how the latest year ranks, and the latest anomaly.
- Compares the latest month with the historical median and reports the most active month and year.
- Includes a short "How to read this tool" guide and switches between English and Spanish.
- Flags three kinds of anomaly in the last 36 months (out of place, out of season, out of scale), each with a sentence that explains why.
- Estimates, for every cell and week, the probability of fire using only information from the previous week.
- Relates each fire season to climate using the 25-year harmonized series.
- Downloads the monthly calendar, the per-cell series, and the individual hot spots of the search as CSV, the calendar as an image, and a printable area report.
- Ranks every protected area (WDPA boundaries) by how far its latest year exceeded its median, with its own calendar and map.
- Shows a ground check of a flagged alert: before/after Sentinel-2-based imagery (HLS) and NASA's OPERA vegetation-loss product, with the event's hot spots overlaid.
- Replays any season week by week, with the year-to-date curve against the median year.
- Compares each place's official burn calendar with the harmonized fire record: Yucatán's burning season (1 March to 31 May) and Portugal's summer burning ban (1 July to 30 September).
- Groups VIIRS hot spots into fire events and classifies them as small one-day burns (typical of agricultural burning), intermediate, or large or long fires (typical of wildfires), with a list of the largest fires in the selected area.
- Plays the calendar as sound, one note per month, so the fire season can be heard as well as seen.

**How it works**

1. FIRMS hot spots are filtered (low-confidence detections and non-vegetation sources are removed) and counted by cell and month for each sensor.
2. The MODIS-to-VIIRS relationship is learned from the 102 months when both sensors observed. Five methods are compared by holding out one full year at a time; the method with the lowest error is used (one conversion factor per calendar month for Yucatán).
3. For each cell and calendar month, "normal" is computed from all other years, and recent months are checked against it.
4. A logistic model estimates weekly fire probability from the historical calendar and the fire detected the week before. It was trained on 2018-2022 and tested on 2023-2025.
5. Results are exported to static files; the web page needs no server.

**Results**

- Harmonization, Yucatán Peninsula: median monthly error 10.0 %, R² 0.986, against 73.2 % for uncorrected MODIS. Portugal and western Spain: 19.3 % against 64.0 %.
- In Yucatán the critical period is March to May, which holds 87 % of all detections over 2001-2025 (April and May alone, 76 %). In Portugal it is July to October (75 %). The most active years were 2003, 2011 and 2024. June 2024 stands out: 7,900 detections against a median near 1,600.
- In Portugal the three most active years of the harmonized series are 2005, 2003 and 2017, which match its worst known fire seasons.
- Weekly risk: the 10 % of cell-weeks with the highest estimated risk holds 75.8 % of the detections (64.7 % using the calendar alone).
- Ground check: the alert for June 2024 in northern Quintana Roo was real. 82.5 % of the event's 587 VIIRS detections fall on 30-m pixels that OPERA DIST-ALERT marks as vegetation loss, against 11.3 % of random land points; 88 of the detections fell inside the Yum Balam protected area.
- In 2025, 12.9 % of the Yucatán region's fire fell inside protected areas (median across years 9.8 %).
- Official calendar: in Yucatán state, 8.4 % of the fire of 2001-2025 happened outside the official burning season, rising from 6.5 % (2001-2010) to 12.6 % (2016-2025) and reaching 20.2 % in 2026 (through November 14), the highest share in 26 years. In mainland Portugal, 70 % happened during the summer burning ban; with VIIRS, 98 % of large-fire detections fall inside the ban against 29 % for small one-day burns.
- Type of fire (VIIRS, 2018-2026): in the Yucatán Peninsula 51 % of detections come from small one-day burns and 14 % from large or long fires (1,804 events); in Portugal and western Spain, 20 % and 60 %.
- We tested whether heat anomalies anticipate fire. Week by week they do not: fire followed in 25.4 % of cases with a heat anomaly and in 25.6 % without one. Season by season, climate matters: over 25 years the correlation between seasonal fire and soil wetness is -0.88.

**Limits**

- Only 102 months overlap between MODIS and VIIRS NOAA-20, and the reported error is for the regional total; single cells have larger errors.
- Climate data come from a reanalysis at about 55 km, not from 1-km thermal imagery.
- Anomaly thresholds and the event size rules are provisional; the official calendar comparison uses one window per zone for every year; the record runs to November 14, 2026, and August to November 2026 come from near-real-time data.

**Benefits and goals**

Early warning staff, fire brigades, land managers and researchers get the fire history of their area in one consistent unit, can see when the present departs from it, and know where to look first.

- A brigade chief can see when the critical period starts in their area and whether this season is running above normal.
- A protected area manager can rank their areas by how unusual the latest year was, and download a one-page report.
- A researcher can download a consistent 25-year series instead of two records that cannot be compared.

**What is new**

- Alerts are checked, not only raised: one flagged event was verified with an independent NASA vegetation-loss product.
- The app shows why harmonization matters: unharmonized, 2024 looks like Yucatán's record year; harmonized, it ranks 3rd of 25.
- Plain-language explanations for every alert and every selected area.
- Fire is checked against the law: in Portugal, 98 % of the hot spots from large fires fall inside the summer burning ban, against 29 % for small one-day burns.
- Fire events are classified as agricultural burns or wildfires, a distinction the challenge mentions and raw hot spots do not make.
- The calendar can be heard, not only seen.
- Negative results are reported: heat anomalies do not anticipate fire week by week. The method uses only global open data, so any region can be added by changing a configuration file.

**Tools**

Python (pandas, numpy), HTML, CSS and JavaScript with SVG (no framework, no server), Node.js for the map outlines.

## Use of Super Intelligence (SI)

Write this truthfully; the draft below reflects how the AI tool was used in this project. Adjust it to what your team actually did.

"Yes. We used a large language model (Claude, by Anthropic) throughout the project. The core of the solution comes from the challenge statement (harmonize the two sensors and build a burning calendar), and our advisor suggested adding fire risk, thermal variation and anomaly detection. Claude proposed the two study regions, the protected-area and imagery checks, the comparison with official burn calendars, the burn-or-wildfire classification and the sound version of the calendar, generated the code of the data pipeline and the web application, ran the analysis on NASA data, and drafted the documentation, this text and the demo slides. [Describe what the team did itself, for example: chose the challenge; discussed the approach with our advisor; reviewed the code and the results; tested the app; checked the June 2024 event ourselves in NASA Worldview; decided what to keep or change; prepared and delivered the pitch.] AI use is stated in the header of every code file, in the README and in the footer of the web application. No AI-generated images, video or audio are used: the satellite images come from NASA GIBS."

## NASA Data

- **NASA FIRMS (Fire Information for Resource Management System):** MODIS (Terra and Aqua) active fire hot spots, 2000 to November 2026, and VIIRS NOAA-20 active fire hot spots, 2018 to November 2026: yearly country summaries for Mexico, Portugal and Spain (standard processing) to 2025, and the FIRMS area API for 2026 (standard processing to July/August, near real time after). https://firms.modaps.eosdis.nasa.gov/country/
- **NASA GIBS / Worldview:** HLS S30 Nadir BRDF-Adjusted Reflectance (Harmonized Landsat Sentinel-2) for before/after imagery, and OPERA L3 DIST-ALERT-HLS (vegetation disturbance) to check an alert. https://worldview.earthdata.nasa.gov/
- **NASA POWER (Prediction of Worldwide Energy Resources):** daily regional data, 2001-2025: maximum earth skin temperature (TS_MAX), maximum 2-m temperature (T2M_MAX), corrected precipitation (PRECTOTCORR), relative humidity (RH2M), surface soil wetness (GWETTOP) and wind speed (WS2M). https://power.larc.nasa.gov/

## Space Agency Partner Data and Other References

- Natural Earth country outlines, through the `world-atlas` npm package (public domain).
- `topojson-client` (used once to build the outlines).
- pandas and numpy (Python libraries).
- Claude (Anthropic), AI tool used as described above.
- NASA Space Apps Challenge 2026, challenge statement "Harmonization of MODIS and VIIRS Hot Spots".

- **Official burn calendars:** Yucatán's Calendario Oficial de Quemas 2026 (Comité Estatal del Programa de Prevención y Combate de Incendios Agrícolas y Forestales) and the Law on Prevention and Combat of Agricultural and Forest Fires of the State of Yucatán; Portugal's critical period for rural fires (Lei n.º 76/2017; Decreto-Lei n.º 82/2021).
- **Natural Earth admin-1** outline of Yucatán state (public domain).
- **ESA Copernicus Sentinel-2:** surface reflectance through NASA's HLS S30 product (before/after imagery).
- **Protected areas:** UNEP-WCMC and IUCN (2026), Protected Planet: The World Database on Protected Areas (WDPA), October 2026, Cambridge, UK. www.protectedplanet.net

## Demo option A: 7 slides (the limit includes the title and intro slides)

| # | Slide | Content |
|---|---|---|
| 1 | Title | Burn Calendar. 25 years of satellite fire in one consistent record. Challenge, team name, members, Mérida. Burn-scar image (NASA HLS). |
| 2 | The problem | Two sensors, two stories: chart of yearly detections, raw against harmonized. Raw, 2024 looks like the record year; harmonized, 2003 is the record and 2024 ranks 3rd of 25. |
| 3 | The solution | App screenshot: key findings, map, calendar with the critical period (March to May, 87 % of detections). Any area; CSV, image and PDF downloads; the calendar can be played as sound. |
| 4 | Does it work? | Held-out years: 73.2 % error uncorrected, 10.0 % harmonized (best of 5 methods, R² 0.986). Validation chart. |
| 5 | An alert, verified from space | June 2024, northern Quintana Roo: 260 detections where the June median is 0; before/after HLS imagery and OPERA vegetation loss; 82.5 % of 587 hot spots on lost vegetation against 11.3 % at random; 88 inside Yum Balam. |
| 6 | Does fire follow the rules? | Weekly fire against Yucatán's official burning season and Portugal's summer burning ban. 98 % of large-fire hot spots in Portugal fall inside the ban (30 % of small burns); fire outside Yucatán's season rose from 6.5 % to 12.6 %; 51 % of Yucatán's VIIRS hot spots come from small one-day burns. |
| 7 | Ready for brigades, anywhere | Weekly risk maps (top 10 % risk holds 76 % of detections). Same code finds Portugal's worst years 2005, 2003, 2017. NASA FIRMS, POWER, GIBS. What comes next. Links. |

## Demo option B: 30-second video (hard limit)

Spanish narration is allowed only with English subtitles.

| Time | Narration | On screen |
|---|---|---|
| 0:00 | "We are La Com." | Title card |
| 0:02 | "Satellites have watched fire for 25 years, but the record is split between two sensors that cannot be compared." | MODIS and VIIRS lines that do not match |
| 0:08 | "Burn Calendar harmonizes them into one record." | Calendar and map |
| 0:13 | "Tested on held-out years, the error drops from 73 % to 9 %." | Validation chart |
| 0:18 | "It flags what is not normal, like June 2024 in Yucatán, and estimates where fire is most likely each week." | Anomaly list, risk maps |
| 0:25 | "Built on NASA FIRMS and NASA POWER, it works anywhere on Earth." | Switch to Portugal |

## Before you submit

- [ ] All team members (six at most) appear on the Members tab and are registered at the same Local Event.
- [ ] Every required field is filled in, in English.
- [ ] The demo link and the project link open in a private browser window with no login.
- [ ] The demo has at most 7 slides or lasts at most 30 seconds.
- [ ] No images or video of persons under 18.
- [ ] Both checkboxes are ticked and "Submit for Judging" is clicked before Sunday, November 15, 11:59 p.m. local time.
