/*
  Kanan Ka'ax (Burn Calendar · Calendario de quemas) · team La Com · NASA Space Apps Challenge 2026
  Challenge: Harmonization of MODIS and VIIRS Hot Spots.
  AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
  and reviewed by the team. Data: NASA FIRMS, NASA POWER, NASA GIBS. Map tiles: NASA GIBS, OpenStreetMap; labels: Esri.
*/
(function () {
  "use strict";
  // =====================================================================
  //  Basics
  // =====================================================================
  var EN = window.IDIOMA !== "es";
  function t(es, en) { return EN ? en : es; }
  function $(id) { return document.getElementById(id); }
  var Q = window.QUEMAS;
  if (!Q) { document.body.innerHTML = "<p style='padding:24px'>" + t("Faltan los datos en web/data/. Corran python ejecutar.py.", "Data files are missing in web/data/. Run python ejecutar.py.") + "</p>"; return; }
  var M = Q.meta, NX = M.nx, NY = M.ny, G = M.malla, NC = NX * NY, T = Q.meses.length;
  var LON0 = M.bbox[0], LAT0 = M.bbox[1], LON1 = M.bbox[2], LAT1 = M.bbox[3];
  var ANIO = Q.meses.map(function (s) { return +s.slice(0, 4); });
  var MES = Q.meses.map(function (s) { return +s.slice(5, 7); });
  var NOM = EN ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] : ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  var NOML = EN ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var LOC = EN ? "en-US" : "es-MX";
  var VIR = ["#440154", "#482878", "#3e4989", "#31688e", "#26828e", "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"];
  var NOMBRE_REGION = EN ? (M.region_en || M.region) : M.region;
  var anios = []; ANIO.forEach(function (a) { if (anios.indexOf(a) < 0) anios.push(a); });
  var ultimo = T - 1; while (ultimo > 0 && Q.parcial[ultimo]) ultimo--;
  var completo = {};
  (function () { var c = {}; for (var k = 0; k < T; k++) if (!Q.parcial[k]) c[ANIO[k]] = (c[ANIO[k]] || 0) + 1; anios.forEach(function (a) { completo[a] = c[a] === 12; }); })();
  var aniosComp = anios.filter(function (a) { return completo[a]; });
  function fmt(v) { return v >= 100 ? Math.round(v).toLocaleString(LOC) : (Math.round(v * 10) / 10).toLocaleString(LOC); }
  function mesAnio(m, a) { return EN ? NOML[m - 1] + " " + a : NOML[m - 1] + " de " + a; }
  function esc(x) { return String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function mediana(v) { if (!v.length) return 0; var s = v.slice().sort(function (a, b) { return a - b; }), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
  // Presentation helpers: icons, reduced motion, count-up numbers
  var I = window.ico || function () { return ""; };
  var QUIETO = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var MOVIL = function () { return innerWidth < 700; };
  var TACTIL = !!(window.matchMedia && matchMedia("(hover: none), (pointer: coarse)").matches); // phones and tablets: say "tap", hide keyboard hints
  // <span data-cuenta="value" data-dec="0|1">final text</span> counts from 0 to value, then restores the exact final text.
  function contar(root, ms) {
    if (!root) return;
    [].forEach.call(root.querySelectorAll("[data-cuenta]"), function (el) {
      var fin = el.textContent, v = +el.getAttribute("data-cuenta"), dec = +(el.getAttribute("data-dec") || 0);
      if (QUIETO || !(v > 0) || !isFinite(v)) return;
      var t0 = performance.now(), dur = ms || 900;
      (function paso(now) {
        var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3), x = v * e;
        el.textContent = p < 1 ? (dec ? (Math.round(x * 10) / 10).toLocaleString(LOC, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : Math.round(x).toLocaleString(LOC)) : fin;
        if (p < 1) requestAnimationFrame(paso);
      })(t0);
    });
  }
  function cuenta(v, txt, dec) { return '<span class="num" data-cuenta="' + v + '"' + (dec ? ' data-dec="1"' : "") + ">" + txt + "</span>"; }
  function color(f) {
    if (!(f > 0)) return "#141B2E";
    var x = Math.min(1, Math.max(0, f)) * (VIR.length - 1), i = Math.floor(x), k = x - i;
    if (i >= VIR.length - 1) return VIR[VIR.length - 1];
    var a = VIR[i], b = VIR[i + 1], r = [1, 3, 5].map(function (p) {
      var u = parseInt(a.substr(p, 2), 16), v = parseInt(b.substr(p, 2), 16);
      return Math.round(u + (v - u) * k).toString(16).padStart(2, "0");
    });
    return "#" + r.join("");
  }
  // Cells read as data tiles. Every land square is visible: little fire is a clear purple (never see-through, so it does not
  // look like "nothing happened") and the opacity rises gently with the value (0.62 → 0.9). x is the share of the maximum (0–1).
  function opacidad(x) { return 0.62 + 0.28 * Math.min(1, Math.max(0, x || 0)); }
  var MORADO_MIN = 0.1; // lowest point of the viridis ramp used on the map: a purple that reads on the dark satellite
  // One cell as a tile: inset ~0.8 px per side (a 1–2 px gap between neighbours) with slightly rounded corners.
  function tesela(x, y, w, h) {
    var g = Math.min(0.8, w * 0.08, h * 0.08); x += g; y += g; w -= 2 * g; h -= 2 * g;
    var r = Math.max(0, Math.min(3, w * 0.14, h * 0.14)), f = function (n) { return n.toFixed(1); };
    if (w <= 0 || h <= 0) return "M0 0";
    return "M" + f(x + r) + " " + f(y) + "H" + f(x + w - r) + "A" + f(r) + " " + f(r) + " 0 0 1 " + f(x + w) + " " + f(y + r) + "V" + f(y + h - r) +
      "A" + f(r) + " " + f(r) + " 0 0 1 " + f(x + w - r) + " " + f(y + h) + "H" + f(x + r) + "A" + f(r) + " " + f(r) + " 0 0 1 " + f(x) + " " + f(y + h - r) +
      "V" + f(y + r) + "A" + f(r) + " " + f(r) + " 0 0 1 " + f(x + r) + " " + f(y) + "Z";
  }
  function colorPng(f) { return f > 0 ? color(f) : "#eceff3"; } // the PNG download keeps its white background
  function textoSobre(f) { return f > 0.55 ? "#14213D" : "#ffffff"; }
  function centro(c) { var j = Math.floor(c / NX), i = c % NX; return [LON0 + (i + 0.5) * G, LAT0 + (j + 0.5) * G]; }
  function celdaEn(lat, lon) {
    if (lon < LON0 || lon >= LON1 || lat < LAT0 || lat >= LAT1) return -1;
    return Math.floor((lat - LAT0) / G) * NX + Math.floor((lon - LON0) / G);
  }
  var TOTAL = []; (function () { for (var c = 0; c < NC; c++) { var s = 0, v = Q.serie[c]; for (var k = 0; k < T; k++) s += v[k]; TOTAL.push(s); } })();
  function conDatos(c) { return Q.tierra[c] || TOTAL[c] > 0; }
  // Tooltip that follows the pointer (charts)
  var TIP = $("tip");
  function tip(ev, html) { if (!html) { TIP.style.display = "none"; return; } TIP.innerHTML = html; TIP.style.display = "block";
    var x = ev.clientX + 14, y = ev.clientY + 14; if (x + 250 > innerWidth) x = ev.clientX - 250; if (y + 80 > innerHeight) y = ev.clientY - 70; TIP.style.left = x + "px"; TIP.style.top = y + "px"; }
  function conTip(el) {
    el.addEventListener("mousemove", function (ev) { var d = ev.target.closest ? ev.target.closest("[data-tip]") : null; tip(ev, d ? d.getAttribute("data-tip") : null); });
    el.addEventListener("mouseleave", function () { tip(null, null); });
    // Touch: a tap shows the number for a few seconds
    var tt = null;
    el.addEventListener("pointerup", function (ev) { if (ev.pointerType === "mouse") return; var d = ev.target.closest ? ev.target.closest("[data-tip]") : null; if (!d) return;
      tip(ev, d.getAttribute("data-tip")); clearTimeout(tt); tt = setTimeout(function () { tip(null, null); }, 3500); });
  }

  // =====================================================================
  //  State
  // =====================================================================
  var estado = {
    sel: { tipo: "region", celdas: null, area: null, nombre: NOMBRE_REGION, lat: null, lon: null, c: -1 },
    escala: 1,           // 0 = one cell, 1 = surroundings (5x5 cells), 2 = whole region
    crudo: false,
    mapa: { tipo: "promedio" }, // promedio | mes | semana | riesgo
    tab: "cal"
  };
  function celdasSel() {
    if (estado.sel.tipo === "region") { var a = []; for (var c = 0; c < NC; c++) a.push(c); return a; }
    return estado.sel.celdas;
  }
  function serieSel() {
    if (estado.sel.tipo === "area" && !estado.crudo) return estado.sel.area.serie.slice();
    var F = estado.crudo && Q.crudo ? Q.crudo : Q.serie, s = new Array(T).fill(0);
    celdasSel().forEach(function (c) { var v = F[c]; for (var k = 0; k < T; k++) s[k] += v[k]; });
    return s;
  }
  function alrededor(c, r) {
    var j0 = Math.floor(c / NX), i0 = c % NX, out = [];
    for (var j = j0 - r; j <= j0 + r; j++) for (var i = i0 - r; i <= i0 + r; i++) {
      if (i < 0 || j < 0 || i >= NX || j >= NY) continue; var cc = j * NX + i; if (conDatos(cc)) out.push(cc);
    }
    return out.length ? out : [c];
  }

  // =====================================================================
  //  Static texts
  // =====================================================================
  document.documentElement.lang = EN ? "en" : "es";
  // Official name: Kanan Ka'ax (Yucatec Maya, "guardian of the forest"); "Burn Calendar" stays as the descriptor.
  document.title = "Kanan Ka'ax · " + NOMBRE_REGION;
  $("titulo").textContent = "Kanan Ka'ax";
  $("titulo").setAttribute("title", t("Kanan Ka'ax: «guardián del monte» en maya", "Kanan Ka'ax: “guardian of the forest” in Yucatec Maya"));
  $("subtitulo").textContent = t("Calendario de quemas desde el espacio", "Burn calendar from space");
  $("logo").innerHTML = '<img src="img/kanan-kaax-icono.svg?v=1" alt="" width="38" height="38">'; // team logo (vector), on its ivory tile
  $("lupa").innerHTML = I("search", 18);
  $("btnIr").innerHTML = I("arrow", 18);
  $("kbdK").textContent = /Mac|iPhone|iPad/.test(navigator.platform || "") ? "⌘ K" : "Ctrl K";
  $("q").placeholder = MOVIL() ? t("Busca tu pueblo", "Find your town") : t("Busca tu pueblo o ciudad (ej. Tizimín)", "Search your town or city (e.g. Tizimín)");
  // Language switch shows both options, the current one highlighted: "ES · EN"
  $("btnIdioma").innerHTML = I("globe", 16) + '<span class="idi' + (EN ? "" : " on") + '" lang="es">ES</span><span class="idi-sep" aria-hidden="true">·</span><span class="idi' + (EN ? " on" : "") + '" lang="en">EN</span>';
  $("btnIdioma").setAttribute("aria-label", EN ? "Cambiar a español" : "Switch to English");
  $("kResp").textContent = t("Lo más importante", "The short answer");
  $("lFecha").textContent = t("Fecha de la foto", "Photo date");
  $("lugarPin").innerHTML = I("pin", 20);
  $("modoX").innerHTML = I("x", 14);
  $("cerrarBienv").innerHTML = I("x", 18);
  $("play").innerHTML = I("play", 20);
  $("repKick").textContent = t("Reproducir", "Play");
  $("pie").innerHTML = '<div class="pie-marca"><img src="img/kanan-kaax-icono.svg?v=1" alt="" width="20" height="20">' + "Kanan Ka'ax · La Com · NASA Space Apps 2026</div>" + t("Datos: NASA FIRMS (MODIS y VIIRS NOAA-20), NASA POWER y NASA GIBS. Mapas: NASA GIBS (Blue Marble, VIIRS), © OpenStreetMap, etiquetas © Esri. Búsqueda: OpenStreetMap Nominatim. ",
    "Data: NASA FIRMS (MODIS and VIIRS NOAA-20), NASA POWER and NASA GIBS. Maps: NASA GIBS (Blue Marble, VIIRS), © OpenStreetMap, labels © Esri. Search: OpenStreetMap Nominatim. ") +
    t("Áreas protegidas: WDPA (Protected Planet). Imágenes de la prueba: NASA HLS y OPERA. ", "Protected areas: WDPA (Protected Planet). Evidence imagery: NASA HLS and OPERA. ") +
    t("Equipo La Com (Mérida): Angel Antonio Perez Reyes, Gabriel Chi Vidal, Alan Flores Denegri, Alessandro Novelo Diaz y Daniel Esquivel Gomez. ", "Team La Com (Mérida): Angel Antonio Perez Reyes, Gabriel Chi Vidal, Alan Flores Denegri, Alessandro Novelo Diaz and Daniel Esquivel Gomez. ") +
    t("Declaración de IA: el código se generó con ayuda de una herramienta de IA (Claude) y fue revisado por el equipo La Com. ", "AI disclosure: the code was generated with the assistance of an AI tool (Claude) and reviewed by team La Com.");
  $("modo").insertAdjacentHTML("afterend", '<div class="flot pista-mapa" id="pistaMapa" role="note">' + I("pin", 16) + (TACTIL ? t("Toca el mapa o busca tu pueblo", "Tap the map or search your town") : t("Haz clic en el mapa o busca tu pueblo", "Click the map or search your town")) + "</div>");
  if (M.sintetico) $("avisoSint").innerHTML = '<div class="aviso">' + t("DATOS SINTÉTICOS DE PRUEBA: no son observaciones reales.", "SYNTHETIC TEST DATA: not real observations.") + "</div>";
  $("btnIdioma").addEventListener("click", function () { location.search = "?region=" + M.clave + "&lang=" + (EN ? "es" : "en"); });
  (function () {
    var R = window.REGIONES || [{ clave: M.clave, nombre: M.region, nombre_en: M.region_en }], s = $("selRegion");
    s.innerHTML = R.map(function (r) { return '<option value="' + r.clave + '"' + (r.clave === M.clave ? " selected" : "") + ">" + esc(EN ? (r.nombre_en || r.nombre) : r.nombre) + "</option>"; }).join("");
    s.addEventListener("change", function () { location.search = "?region=" + s.value + "&lang=" + (EN ? "en" : "es"); });
  })();

  // =====================================================================
  //  Map: Leaflet with NASA GIBS / CARTO tiles, or a simple SVG map if Leaflet could not load
  // =====================================================================
  var MAPA = null;
  var BASES = {
    sat: { nombre: t("Satélite", "Satellite") },
    dia: { nombre: t("Foto del día", "Photo of the day") },
    calles: { nombre: t("Calles", "Streets") }
  };
  function crearLeaflet() {
    var L = window.L;
    var map = L.map("mapa", { zoomControl: true, preferCanvas: true, minZoom: 2, maxZoom: 13, worldCopyJump: false, attributionControl: true, zoomSnap: 0.25 });
    map.zoomControl.setPosition("topright");
    var gibs = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/";
    var capas = {
      sat: L.tileLayer(gibs + "BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg", { maxNativeZoom: 8, maxZoom: 13, attribution: "NASA GIBS · Blue Marble" }),
      dia: L.tileLayer(gibs + "VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/{time}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg", { maxNativeZoom: 9, maxZoom: 13, time: "2024-05-25", attribution: "NASA GIBS · VIIRS NOAA-20" }),
      calles: L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" })
    };
    var etiquetas = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 13, pane: "overlayPane", attribution: "Labels © Esri" });
    var base = null;
    function ponerBase(k) {
      if (base) map.removeLayer(base); base = capas[k]; base.addTo(map); base.bringToBack();
      if (k === "calles") map.removeLayer(etiquetas); else if (!map.hasLayer(etiquetas)) etiquetas.addTo(map);
      $("fechaBox").style.display = k === "dia" ? "block" : "none";
      [].forEach.call(document.querySelectorAll("#capas button"), function (b) { var on = b.getAttribute("data-k") === k; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    }
    map.createPane("celdas"); map.getPane("celdas").style.zIndex = 420;
    map.createPane("contornos"); map.getPane("contornos").style.zIndex = 430; map.getPane("contornos").style.pointerEvents = "none";
    map.createPane("etiq"); map.getPane("etiq").style.zIndex = 440; map.getPane("etiq").style.pointerEvents = "none";
    etiquetas.options.pane = "etiq";
    // Cells use the SVG renderer (a few hundred rectangles), so hover, colour changes and the entrance wave are CSS transitions.
    // Hot-spot points (up to 20,000) stay on canvas.
    var rects = {}, ren = L.canvas({ padding: 0.3 }), renCeldas = L.svg({ padding: 0.3, pane: "celdas" });
    // A rectangle drawn as a tile (see tesela): same geometry and events as L.rectangle, only the outline differs.
    var Celda = L.Rectangle.extend({ _updatePath: function () {
      var pr = this._parts && this._parts[0], rr = this._renderer;
      if (!pr || pr.length < 3 || !rr._setPath) return L.Rectangle.prototype._updatePath.call(this);
      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      pr.forEach(function (q) { if (q.x < x0) x0 = q.x; if (q.x > x1) x1 = q.x; if (q.y < y0) y0 = q.y; if (q.y > y1) y1 = q.y; });
      rr._setPath(this, tesela(x0, y0, x1 - x0, y1 - y0));
    } });
    for (var c = 0; c < NC; c++) {
      if (!conDatos(c)) continue;
      var j = Math.floor(c / NX), i = c % NX;
      rects[c] = new Celda([[LAT0 + j * G, LON0 + i * G], [LAT0 + (j + 1) * G, LON0 + (i + 1) * G]],
        { pane: "celdas", renderer: renCeldas, stroke: false, fillOpacity: 0, interactive: true, className: "celda" });
      (function (cc) {
        rects[cc].bindTooltip(function () { return textoCelda(cc); }, { sticky: true, className: "celda", direction: "top", opacity: 1, offset: [0, -8] });
        rects[cc].on("mouseover", function () { rects[cc].bringToFront(); });
      })(c);
      rects[c].addTo(map);
    }
    if (!QUIETO) map.getPane("celdas").classList.add("celdas-ocultas");
    // Land rings used to draw: the study-area outline (Q.costa) plus, when present, the extra outlines around it
    // (js/contornos.js), so the map does not end in a straight cut where the data outline was clipped.
    var TIERRA = []; (Q.costa || []).forEach(function (p) { p.anillos.forEach(function (r) { TIERRA.push(r); }); });
    ((window.CONTORNOS_EXTRA || {})[M.clave] || []).forEach(function (r) { TIERRA.push(r); });
    // Coastline clip: the squares follow the shape of the land exactly (Natural Earth 1:10m outline in Q.costa),
    // so coastal squares are cut by the shoreline instead of spilling into the sea. Pure presentation: values are unchanged.
    // Runs when the map is ready: before the first setView Leaflet has not created the cells' SVG container yet.
    map.whenReady(function () {
      var anillos = TIERRA;
      if (!anillos.length || !renCeldas._container) return;
      var NS = "http://www.w3.org/2000/svg", defs = document.createElementNS(NS, "defs"), cp = document.createElementNS(NS, "clipPath"), cpath = document.createElementNS(NS, "path");
      cp.setAttribute("id", "clipTierra"); cp.setAttribute("clipPathUnits", "userSpaceOnUse"); cpath.setAttribute("clip-rule", "nonzero");
      cp.appendChild(cpath); defs.appendChild(cp); renCeldas._container.insertBefore(defs, renCeldas._container.firstChild);
      renCeldas._rootGroup.setAttribute("clip-path", "url(#clipTierra)");
      var origen = null;
      function recortar() {
        var o = map.getPixelOrigin(), z = map.getZoom(), clave = z + ":" + o.x + ":" + o.y; if (clave === origen) return; origen = clave;
        cpath.setAttribute("d", anillos.map(function (r) {
          return "M" + r.map(function (q) { var pt = map.latLngToLayerPoint([q[1], q[0]]); return pt.x.toFixed(1) + " " + pt.y.toFixed(1); }).join("L") + "Z";
        }).join(""));
      }
      recortar(); map.on("zoomend viewreset resize", recortar); renCeldas.on("update", recortar);
    });
    var selCapa = null, zonaCapa = null, areasCapa = null, imgCapa = null, ptsCapa = null, marca = null;
    function anillosLL(an) { return an.map(function (r) { return r.map(function (q) { return [q[1], q[0]]; }); }); }
    // Map framing keeps the sheet's space free: padding on the sheet side (right on desktop, bottom on mobile).
    function relleno() {
      if (MOVIL()) return { paddingTopLeft: [24, 80], paddingBottomRight: [24, 200] };
      var w = document.body.classList.contains("panel-oculto") ? 0 : ($("panel").offsetWidth || 420);
      return { paddingTopLeft: [40, 100], paddingBottomRight: [w + 48, 130] };
    }
    function desplazado(lat, lon, z) { // centre so that (lat, lon) sits in the middle of the free map area
      var r = relleno(), dx = (r.paddingBottomRight[0] - r.paddingTopLeft[0]) / 2, dy = (r.paddingBottomRight[1] - r.paddingTopLeft[1]) / 2;
      return map.unproject(map.project([lat, lon], z).add([dx, dy]), z);
    }
    // ---------- Heat map (thermal style) ----------
    // The grid values are interpolated into a smooth field, coloured with the same viridis ramp, softened and clipped to the
    // land outline, then shown as one image under the (now invisible) squares, which keep the tooltips and clicks.
    // Pure presentation: the values are the same ones the squares showed.
    map.createPane("termico"); map.getPane("termico").style.zIndex = 415; map.getPane("termico").style.pointerEvents = "none";
    var termico = null, TW = 820;
    // The heat image covers the whole land on screen (Yucatán Peninsula and its neighbours), not only the study box.
    // Inside the box the colours are the data; outside it they only continue the nearest edge, muted (illustrative).
    var EXT = [LON0, LAT0, LON1, LAT1];
    TIERRA.forEach(function (r) { r.forEach(function (q) {
      if (q[0] < EXT[0]) EXT[0] = q[0]; if (q[1] < EXT[1]) EXT[1] = q[1]; if (q[0] > EXT[2]) EXT[2] = q[0]; if (q[1] > EXT[3]) EXT[3] = q[1]; }); });
    // Which sides of that box are a straight cut of the outline (two or more points exactly on it) and which are natural
    // coast: only the cut sides get the soft fade. Order: west, south, east, north.
    var CORTE = [0, 0, 0, 0];
    TIERRA.forEach(function (r) { r.forEach(function (q) {
      if (Math.abs(q[0] - EXT[0]) < 1e-4) CORTE[0]++; if (Math.abs(q[1] - EXT[1]) < 1e-4) CORTE[1]++; if (Math.abs(q[0] - EXT[2]) < 1e-4) CORTE[2]++; if (Math.abs(q[1] - EXT[3]) < 1e-4) CORTE[3]++; }); });
    CORTE = CORTE.map(function (n) { return n >= 2; });
    TW = Math.max(820, Math.min(1200, Math.round((EXT[2] - EXT[0]) / G * 20))); // keep ~20 px per square on wider regions
    function mercY(lat) { var r = lat * Math.PI / 180; return Math.log(Math.tan(Math.PI / 4 + r / 2)); }
    var MY0 = mercY(EXT[1]), MY1 = mercY(EXT[3]), TH = Math.max(40, Math.round(TW * (MY1 - MY0) / ((EXT[2] - EXT[0]) * Math.PI / 180)));
    var filaF = new Float32Array(TH), colF = new Float32Array(TW), fuera = new Float32Array(TW * TH), yy, xx;
    var latF = new Float32Array(TH), lonF = new Float32Array(TW);
    for (yy = 0; yy < TH; yy++) { var myy = MY1 - (yy + 0.5) / TH * (MY1 - MY0); latF[yy] = (2 * Math.atan(Math.exp(myy)) - Math.PI / 2) * 180 / Math.PI; filaF[yy] = (latF[yy] - LAT0) / G - 0.5; }
    for (xx = 0; xx < TW; xx++) { lonF[xx] = EXT[0] + (xx + 0.5) / TW * (EXT[2] - EXT[0]); colF[xx] = (lonF[xx] - LON0) / G - 0.5; }
    // how far outside the study box each pixel is (0 inside, 1 at ~5 squares or more): drives the "illustrative" muting
    for (yy = 0; yy < TH; yy++) for (xx = 0; xx < TW; xx++) {
      var dx = Math.max(0, LON0 - lonF[xx], lonF[xx] - LON1), dy = Math.max(0, LAT0 - latF[yy], latF[yy] - LAT1);
      fuera[yy * TW + xx] = Math.min(1, Math.sqrt(dx * dx + dy * dy) / (10 * G)); }
    var mascara = document.createElement("canvas"); mascara.width = TW; mascara.height = TH;
    (function () { var mx = mascara.getContext("2d"); mx.fillStyle = "#000"; mx.beginPath();
      TIERRA.forEach(function (r) { r.forEach(function (q, i) {
        var x = (q[0] - EXT[0]) / (EXT[2] - EXT[0]) * TW, y = (MY1 - mercY(q[1])) / (MY1 - MY0) * TH; if (i) mx.lineTo(x, y); else mx.moveTo(x, y); }); mx.closePath(); });
      mx.fill("nonzero");
      // soft fade at the outer edges of the image (where the land outline is cut), never a hard straight line
      var fd = document.createElement("canvas"); fd.width = TW; fd.height = TH; var fx = fd.getContext("2d"), fi = fx.createImageData(TW, TH), F = Math.round(TW * 0.07);
      for (var y = 0; y < TH; y++) for (var x = 0; x < TW; x++) { var a = Math.min(1, CORTE[0] ? (x + 0.5) / F : 1, CORTE[2] ? (TW - x - 0.5) / F : 1, CORTE[3] ? (y + 0.5) / F : 1, CORTE[1] ? (TH - y - 0.5) / F : 1); fi.data[(y * TW + x) * 4 + 3] = Math.round(255 * a * a * (3 - 2 * a)); }
      fx.putImageData(fi, 0, 0); mx.globalCompositeOperation = "destination-in"; mx.drawImage(fd, 0, 0); mx.globalCompositeOperation = "source-over"; })();
    var LUT = []; for (var li = 0; li < 256; li++) { var hx = color(MORADO_MIN + (1 - MORADO_MIN) * li / 255); LUT.push([parseInt(hx.substr(1, 2), 16), parseInt(hx.substr(3, 2), 16), parseInt(hx.substr(5, 2), 16)]); }
    var lienzoA = document.createElement("canvas"), lienzoB = document.createElement("canvas"); lienzoA.width = lienzoB.width = TW; lienzoA.height = lienzoB.height = TH;
    var TERMICO_OK = !!(TIERRA.length && lienzoA.getContext);
    function pintarTermico(valores, normDe) {
      var f = new Float32Array(NC), ok = new Uint8Array(NC), c2, it;
      for (c2 = 0; c2 < NC; c2++) if (rects[c2]) { var nv = normDe(valores[c2]); f[c2] = nv > 1 ? 1 : (nv > 0 ? nv : 0); ok[c2] = 1; }
      // fill the sea squares next to the coast with their land neighbours, so the coastline has no dark fringe
      for (it = 0; it < 3; it++) { var nf = f.slice(), nok = ok.slice();
        for (c2 = 0; c2 < NC; c2++) { if (ok[c2]) continue; var j = Math.floor(c2 / NX), i = c2 % NX, s = 0, n = 0;
          for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) { var jj = j + dj, ii = i + di; if (jj < 0 || jj >= NY || ii < 0 || ii >= NX) continue; var k2 = jj * NX + ii; if (ok[k2]) { s += f[k2]; n++; } }
          if (n) { nf[c2] = s / n; nok[c2] = 1; } }
        f = nf; ok = nok; }
      var MEDIA = 0, nm = 0; for (c2 in rects) { MEDIA += f[c2]; nm++; } MEDIA = nm ? MEDIA / nm : 0;
      function val(j, i) { j = j < 0 ? 0 : (j >= NY ? NY - 1 : j); i = i < 0 ? 0 : (i >= NX ? NX - 1 : i); return f[j * NX + i]; }
      var ax = lienzoA.getContext("2d"), img = ax.createImageData(TW, TH), d = img.data;
      for (var y = 0; y < TH; y++) { var rf = filaF[y], j0 = Math.floor(rf), ty = rf - j0;
        for (var x = 0; x < TW; x++) { var cf = colF[x], i0 = Math.floor(cf), tx = cf - i0;
          var v = (val(j0, i0) * (1 - tx) + val(j0, i0 + 1) * tx) * (1 - ty) + (val(j0 + 1, i0) * (1 - tx) + val(j0 + 1, i0 + 1) * tx) * ty;
          var m = fuera[y * TW + x]; if (m > 0) v = v * (1 - m) + MEDIA * m; // outside: fade from the edge towards the regional average (no stripes)
          var o = (y * TW + x) * 4, cl = LUT[Math.round(v * 255)], al = opacidad(v);
          if (m > 0) { // outside the study box: same hue, pulled towards a quiet night purple and a bit more see-through
            var k = 0.2 * m, gr = (cl[0] + cl[1] + cl[2]) / 3;
            d[o] = Math.round((cl[0] * 0.8 + gr * 0.2) * (1 - k) + 46 * k); d[o + 1] = Math.round((cl[1] * 0.8 + gr * 0.2) * (1 - k) + 38 * k); d[o + 2] = Math.round((cl[2] * 0.8 + gr * 0.2) * (1 - k) + 92 * k);
            d[o + 3] = Math.round(255 * al * (1 - 0.12 * m));
          } else { d[o] = cl[0]; d[o + 1] = cl[1]; d[o + 2] = cl[2]; d[o + 3] = Math.round(255 * al); } } }
      ax.putImageData(img, 0, 0);
      var bx = lienzoB.getContext("2d"); bx.clearRect(0, 0, TW, TH); bx.filter = "blur(3px)"; bx.drawImage(lienzoA, 0, 0); bx.filter = "none";
      bx.globalCompositeOperation = "destination-in"; bx.drawImage(mascara, 0, 0); bx.globalCompositeOperation = "source-over";
      var url = lienzoB.toDataURL("image/png");
      if (!termico) termico = L.imageOverlay(url, [[EXT[1], EXT[0]], [EXT[3], EXT[2]]], { pane: "termico", interactive: false, className: "termico" }).addTo(map);
      else termico.setUrl(url);
    }
    // ---------- Squares view: lines that group neighbouring squares with similar fire ----------
    // Four groups on the same scale as the colours (little · medium · high · very high). A line is drawn only on the edge
    // between two land squares of different groups, so each group reads as one shape. Clipped to the coast like the squares.
    var zonasCapa = null, VISTA = TERMICO_OK ? "calor" : "cuadros";
    function grupo(x) { return x < 0.25 ? 0 : x < 0.5 ? 1 : x < 0.75 ? 2 : 3; }
    function dibujarZonas(valores, normDe) {
      if (zonasCapa) { map.removeLayer(zonasCapa); zonasCapa = null; }
      if (!normDe) return;
      var gr = {}, segs = [], c4;
      for (c4 in rects) gr[c4] = grupo(normDe(valores[c4]));
      for (c4 in rects) {
        var cn = +c4, j = Math.floor(cn / NX), i = cn % NX, y0 = LAT0 + j * G, x0 = LON0 + i * G;
        if (i + 1 < NX && rects[cn + 1] && gr[cn + 1] !== gr[cn]) segs.push([[y0, x0 + G], [y0 + G, x0 + G]]);   // east edge
        if (j + 1 < NY && rects[cn + NX] && gr[cn + NX] !== gr[cn]) segs.push([[y0 + G, x0], [y0 + G, x0 + G]]); // north edge
      }
      if (segs.length) zonasCapa = L.polyline(segs, { pane: "celdas", renderer: renCeldas, color: "#F4F1EA", weight: 1.8, opacity: 0.85, lineCap: "square", interactive: false, className: "zona-borde" }).addTo(map);
    }
    // ---------- Squares view outside the study area (illustrative) ----------
    // Same 0.25° lattice, on the land around the region (Tabasco, Chiapas, Petén, Belize...), so the squares view also
    // fills the screen like the heat map. Their colour only continues the nearest edge, muted, and they hold no data:
    // no tooltip, no click (a click there still says the place is outside the study area).
    var fantasmas = [], fantasmasCapa = L.layerGroup();
    (function () {
      var an = TIERRA;
      if (!an.length) return;
      var i0 = Math.floor((EXT[0] - LON0) / G), i1 = Math.ceil((EXT[2] - LON0) / G), j0 = Math.floor((EXT[1] - LAT0) / G), j1 = Math.ceil((EXT[3] - LAT0) / G);
      for (var jj = j0; jj < j1; jj++) for (var ii = i0; ii < i1; ii++) {
        if (ii >= 0 && ii < NX && jj >= 0 && jj < NY) continue; // inside the study grid: real squares only
        var x0 = LON0 + ii * G, y0 = LAT0 + jj * G, h = G / 2, tierra = false;
        [[x0 + h, y0 + h], [x0 + .1 * G, y0 + .1 * G], [x0 + .9 * G, y0 + .1 * G], [x0 + .1 * G, y0 + .9 * G], [x0 + .9 * G, y0 + .9 * G]].forEach(function (q) { if (!tierra && dentroAnillos(q[0], q[1], an)) tierra = true; });
        if (!tierra) continue;
        var dx = Math.max(0, -ii - 0.5, ii + 0.5 - NX), dy = Math.max(0, -jj - 0.5, jj + 0.5 - NY);
        // m: how far from the study grid (blends to the regional average within ~4 squares: no stripes);
        // e: fade towards the outer edge of the drawn area (no hard straight end)
        var e = Math.min(1, Math.min(CORTE[0] ? x0 + h - EXT[0] : 99, CORTE[2] ? EXT[2] - x0 - h : 99, CORTE[1] ? y0 + h - EXT[1] : 99, CORTE[3] ? EXT[3] - y0 - h : 99) / (3 * G));
        fantasmas.push({ j: jj, i: ii, m: Math.min(1, Math.sqrt(dx * dx + dy * dy) / 4), e: Math.max(0, e),
          r: new Celda([[y0, x0], [y0 + G, x0 + G]], { pane: "celdas", renderer: renCeldas, stroke: false, fillOpacity: 0, interactive: false, className: "celda celda-fantasma" }).addTo(fantasmasCapa) });
      }
    })();
    function apagado(hex, m) { // same muting as the heat map outside the study area
      var c = [1, 3, 5].map(function (k) { return parseInt(hex.substr(k, 2), 16); }), gr = (c[0] + c[1] + c[2]) / 3, k = 0.2 * m, base = [46, 38, 92];
      return "#" + c.map(function (v, n) { return Math.round((v * 0.8 + gr * 0.2) * (1 - k) + base[n] * k).toString(16).padStart(2, "0"); }).join("");
    }
    function pintarFantasmas(valores, normDe) {
      if (!fantasmas.length) return;
      if (!map.hasLayer(fantasmasCapa)) fantasmasCapa.addTo(map);
      var f = new Float32Array(NC), ok = new Uint8Array(NC), c5, media = 0, n5 = 0;
      for (c5 in rects) { var nv = normDe(valores[c5]); f[c5] = nv > 1 ? 1 : (nv > 0 ? nv : 0); ok[c5] = 1; media += f[c5]; n5++; }
      media = n5 ? media / n5 : 0;
      function borde(j, i) { // nearest real square to (j, i) along the edge of the grid
        j = j < 0 ? 0 : (j >= NY ? NY - 1 : j); i = i < 0 ? 0 : (i >= NX ? NX - 1 : i);
        for (var r = 0; r < 4; r++) for (var dj = -r; dj <= r; dj++) for (var di = -r; di <= r; di++) {
          var jj = j + dj, ii = i + di; if (jj < 0 || jj >= NY || ii < 0 || ii >= NX) continue; var k = jj * NX + ii; if (ok[k]) return f[k]; }
        return media;
      }
      fantasmas.forEach(function (g) {
        var v = borde(g.j, g.i) * (1 - g.m) + media * g.m;
        g.r.setStyle({ fillColor: apagado(color(MORADO_MIN + (1 - MORADO_MIN) * v), g.m), fillOpacity: opacidad(v) * (1 - 0.12 * g.m) * g.e * g.e * (3 - 2 * g.e) });
      });
    }
    var api = {
      tipo: "leaflet",
      pintar: function (valores, colorDe, opacDe, normDe) {
        if (normDe && TERMICO_OK && VISTA === "calor") {
          pintarTermico(valores, normDe);
          if (termico) termico.setOpacity(1);
          if (map.hasLayer(fantasmasCapa)) map.removeLayer(fantasmasCapa);
          dibujarZonas(null, null);
          map.getPane("celdas").classList.add("modo-termico");
          for (var c3 in rects) rects[c3].setStyle({ fillColor: "#000", fillOpacity: 0 });
          return;
        }
        if (termico) termico.setOpacity(0);
        map.getPane("celdas").classList.remove("modo-termico");
        for (var cc in rects) { var v = valores[cc]; var f = colorDe(v); rects[cc].setStyle({ fillColor: f || "#000", fillOpacity: f ? opacDe(v) : 0 }); }
        if (normDe) pintarFantasmas(valores, normDe);
        dibujarZonas(valores, normDe);
      },
      // keep what is on screen centred in the free area when the right panel is hidden or shown
      desplazar: function (dx) { map.panBy([dx, 0], { animate: !QUIETO, duration: 0.6 }); },
      // "calor" (smooth heat map) or "cuadros" (squares + lines around zones with similar fire)
      vista: function (v) { if (v) VISTA = TERMICO_OK ? v : "cuadros"; return VISTA; },
      seleccion: function (cs, anillos) {
        if (selCapa) map.removeLayer(selCapa); selCapa = null;
        if (anillos) selCapa = L.polygon(anillosLL(anillos), { pane: "contornos", color: "#FF6B2C", weight: 2.5, fill: false });
        else if (cs && cs.length) {
          var b = cajaDe(cs); selCapa = L.rectangle([[b[1], b[0]], [b[3], b[2]]], { pane: "contornos", color: "#FF6B2C", weight: 2.5, fill: true, fillColor: "#FF6B2C", fillOpacity: 0.06, dashArray: "6 5" });
        }
        if (selCapa) selCapa.addTo(map);
      },
      marcar: function (lat, lon) { if (marca) map.removeLayer(marca); marca = null; if (lat === null) return;
        marca = L.marker([lat, lon], { pane: "contornos", interactive: false, keyboard: false, icon: L.divIcon({ className: "pulso", html: "<i></i>", iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(map); },
      irA: function (lat, lon, z) { z = z || Math.max(map.getZoom(), 8); map.flyTo(desplazado(lat, lon, z), z, { duration: QUIETO ? 0 : 1.1, easeLinearity: 0.2, animate: !QUIETO }); },
      encuadrar: function (b) { var o = relleno(); o.duration = QUIETO ? 0 : 1; o.animate = !QUIETO; map.flyToBounds([[b[1], b[0]], [b[3], b[2]]], o); },
      zona: function (anillos) { if (zonaCapa) map.removeLayer(zonaCapa); zonaCapa = null;
        if (anillos) zonaCapa = L.polygon(anillosLL(anillos), { pane: "contornos", color: "#5AA9FF", weight: 2, fill: true, fillColor: "#5AA9FF", fillOpacity: 0.06, dashArray: "8 6" }).addTo(map); },
      areas: function (lista, marcada) { if (areasCapa) map.removeLayer(areasCapa); areasCapa = null; if (!lista) return;
        areasCapa = L.layerGroup(lista.map(function (a) { return L.polygon(anillosLL(a.anillos),
          { pane: "contornos", color: a.id === marcada ? "#FF6B2C" : "#F4F1EA", opacity: a.id === marcada ? 1 : 0.7, weight: a.id === marcada ? 2.5 : 1.2, dashArray: a.id === marcada ? "" : "4 3", fill: a.id === marcada, fillColor: "#FF6B2C", fillOpacity: 0.08 }); })).addTo(map); },
      imagen: function (src, b, puntos) { if (imgCapa) map.removeLayer(imgCapa); if (ptsCapa) map.removeLayer(ptsCapa); imgCapa = ptsCapa = null; if (!src) return;
        imgCapa = L.imageOverlay(src, [[b[1], b[0]], [b[3], b[2]]], { pane: "contornos", opacity: 1 }).addTo(map);
        if (puntos) ptsCapa = L.layerGroup(puntos.map(function (q) { return L.circleMarker([q[1], q[0]], { pane: "contornos", renderer: ren, radius: 3, color: "#fff", weight: 0.8, fillColor: "#FF6B2C", fillOpacity: 1 }); })).addTo(map); },
      puntos: function (lista) { if (ptsCapa) map.removeLayer(ptsCapa); ptsCapa = null; if (!lista) return;
        ptsCapa = L.layerGroup(lista.map(function (q) { return L.circleMarker([q[0], q[1]], { pane: "contornos", renderer: ren, radius: 2.4, color: "#FFD9A0", weight: 0.5, fillColor: "#FF6B2C", fillOpacity: 0.9 }); })).addTo(map); },
      alClic: function (fn) { map.on("click", function (e) { fn(e.latlng.lat, e.latlng.lng); }); },
      base: ponerBase,
      fecha: function (d) { capas.dia.options.time = d; capas.dia.redraw(); },
      // Entrance: the map opens already framed on the region, with the cells visible (no fly-in animation).
      entrada: function (listo) {
        map.fitBounds([[LAT0, LON0], [LAT1, LON1]], relleno());
        map.getPane("celdas").classList.remove("celdas-ocultas");
        listo();
      }
    };
    map.fitBounds([[LAT0, LON0], [LAT1, LON1]], relleno());
    ponerBase("sat");
    [].forEach.call(document.querySelectorAll("#mapa .flot"), function (el) { L.DomEvent.disableClickPropagation(el); L.DomEvent.disableScrollPropagation(el); });
    // The map container can change size after fonts and layout settle (or on rotation): keep Leaflet in sync.
    if (window.ResizeObserver) new ResizeObserver(function () { map.invalidateSize(false); }).observe($("mapa"));
    window.addEventListener("load", function () { setTimeout(function () { map.invalidateSize(false); }, 50); });
    return api;
  }
  // Fallback when Leaflet (or the internet) is not available: a plain SVG map of the grid and coastline.
  function crearSvg() {
    var cont = $("mapa"), PAD = 0.4, KX = Math.cos((LAT0 + LAT1) / 2 * Math.PI / 180), S = 100;
    var VW = (LON1 - LON0 + 2 * PAD) * KX * S, VH = (LAT1 - LAT0 + 2 * PAD) * S;
    function px(lon) { return (lon - LON0 + PAD) * KX * S; } function py(lat) { return (LAT1 + PAD - lat) * S; }
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.id = "svgmapa"; svg.setAttribute("viewBox", "0 0 " + VW + " " + VH); svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    cont.insertBefore(svg, cont.firstChild); cont.style.background = "#0A0F1C";
    var costa = (Q.costa || []).map(function (p) { return p.anillos.map(function (r) { return '<path d="M' + r.map(function (q) { return px(q[0]).toFixed(1) + " " + py(q[1]).toFixed(1); }).join("L") + 'Z" fill="#18213A" stroke="#3a4766" stroke-width="1.2"/>'; }).join(""); }).join("");
    var capas = { celdas: "", sel: "", zona: "", areas: "", marca: "", img: "" };
    function dibujar() { svg.innerHTML = costa + capas.celdas + capas.img + capas.zona + capas.areas + capas.sel + capas.marca; }
    function anillo(r) { return "M" + r.map(function (q) { return px(q[0]).toFixed(1) + " " + py(q[1]).toFixed(1); }).join("L") + "Z"; }
    var api = {
      tipo: "svg",
      pintar: function (valores, colorDe, opacDe) {
        var h = [];
        for (var c = 0; c < NC; c++) { if (!conDatos(c)) continue; var v = valores[c], f = colorDe(v); var j = Math.floor(c / NX), i = c % NX;
          // no fire: a see-through tile (still hoverable for the tooltip), the coast shows through
          h.push('<path data-c="' + c + '" d="' + tesela(px(LON0 + i * G), py(LAT0 + (j + 1) * G), G * KX * S, G * S) + '" fill="' + (f || "transparent") + '" fill-opacity="' + (f ? opacDe(v).toFixed(2) : 0) + '"/>'); }
        capas.celdas = h.join(""); dibujar();
      },
      seleccion: function (cs, anillos) { capas.sel = "";
        if (anillos) capas.sel = anillos.map(function (r) { return '<path d="' + anillo(r) + '" fill="none" stroke="#FF6B2C" stroke-width="3"/>'; }).join("");
        else if (cs && cs.length) { var b = cajaDe(cs); capas.sel = '<rect x="' + px(b[0]) + '" y="' + py(b[3]) + '" width="' + (px(b[2]) - px(b[0])) + '" height="' + (py(b[1]) - py(b[3])) + '" fill="none" stroke="#FF6B2C" stroke-width="3" stroke-dasharray="6 4"/>'; }
        dibujar(); },
      marcar: function (lat, lon) { capas.marca = lat === null ? "" : '<circle cx="' + px(lon) + '" cy="' + py(lat) + '" r="7" fill="#FF6B2C" stroke="#fff" stroke-width="3"/>'; dibujar(); },
      irA: function () {}, encuadrar: function () {},
      zona: function (an) { capas.zona = an ? an.map(function (r) { return '<path d="' + anillo(r) + '" fill="none" stroke="#5AA9FF" stroke-width="2.5" stroke-dasharray="8 6"/>'; }).join("") : ""; dibujar(); },
      areas: function (lista, marcada) { capas.areas = lista ? lista.map(function (a) { return a.anillos.map(function (r) { return '<path d="' + anillo(r) + '" fill="none" stroke="' + (a.id === marcada ? "#FF6B2C" : "#8A94AA") + '" stroke-width="' + (a.id === marcada ? 3 : 1.2) + '" stroke-dasharray="' + (a.id === marcada ? "" : "4 3") + '"/>'; }).join(""); }).join("") : ""; dibujar(); },
      imagen: function (src, b) { capas.img = src ? '<image href="' + src + '" x="' + px(b[0]) + '" y="' + py(b[3]) + '" width="' + (px(b[2]) - px(b[0])) + '" height="' + (py(b[1]) - py(b[3])) + '" preserveAspectRatio="none"/>' : ""; dibujar(); },
      puntos: function () {},
      alClic: function (fn) { svg.addEventListener("click", function (ev) { var r = svg.getBoundingClientRect(), sc = Math.min(r.width / VW, r.height / VH), ox = (r.width - VW * sc) / 2, oy = (r.height - VH * sc) / 2;
        var x = (ev.clientX - r.left - ox) / sc, y = (ev.clientY - r.top - oy) / sc; fn(LAT1 + PAD - y / S, x / (KX * S) + LON0 - PAD); }); },
      base: function () {}, fecha: function () {}
    };
    svg.addEventListener("mousemove", function (ev) { var d = ev.target.getAttribute && ev.target.getAttribute("data-c"); tip(ev, d ? textoCelda(+d) : null); });
    svg.addEventListener("mouseleave", function () { tip(null, null); });
    $("capas").style.display = "none";
    return api;
  }
  function cajaDe(cs) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    cs.forEach(function (c) { var j = Math.floor(c / NX), i = c % NX; x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); });
    return [LON0 + x0 * G, LAT0 + y0 * G, LON0 + (x1 + 1) * G, LAT0 + (y1 + 1) * G];
  }

  // ---------- Plain language (presentation only: the exact figure stays in a tooltip or in the details) ----------
  var NSPAN = ANIO[T - 1] - ANIO[0];          // years covered by the record (Nov 2000 to today), from the data
  // A big number said simply: "unos 32 mil" / "about 32 thousand", "1.1 millones" / "1.1 million"
  function partes(v) {
    v = Math.round(v || 0);
    if (v >= 1e6) { var m = Math.round(v / 1e5) / 10; return [m, t(m === 1 ? "millón" : "millones", "million"), 1]; }
    if (v >= 10000) return [Math.round(v / 1000), t("mil", "thousand"), 0];
    if (v >= 1000) return [Math.round(v / 100) / 10, t("mil", "thousand"), 1];
    if (v >= 100) return [Math.round(v / 10) * 10, "", 0];
    return [v, "", 0];
  }
  function aprox(v) {
    var p = partes(v), n = p[0].toLocaleString(LOC) + (p[1] ? " " + p[1] : "");
    return (Math.round(v) >= 100 && Math.round(v) < 1e6 ? t("unos ", "about ") : "") + n;
  }
  // The rounded number, with the exact one on hover / long press
  function aproxT(v) { return '<span class="aprox" title="' + esc(fmt(v)) + '">' + aprox(v) + "</span>"; }
  // "this" against "normal", in words: "un tercio menos", "el doble"...
  function enPalabras(r) {
    if (r === null || !isFinite(r)) return "";
    if (r < 1) { var p = 1 - r;
      return p < 0.1 ? t("casi lo mismo", "about the same") : p < 0.2 ? t("un poco menos", "a little less") : p < 0.29 ? t("una cuarta parte menos", "a quarter less")
        : p < 0.42 ? t("un tercio menos", "a third less") : p < 0.62 ? t("como la mitad", "about half") : p < 0.85 ? t("mucho menos", "much less") : t("casi nada", "almost none"); }
    var q = r - 1;
    return q < 0.1 ? t("casi lo mismo", "about the same") : q < 0.2 ? t("un poco más", "a little more") : q < 0.42 ? t("un tercio más", "a third more")
      : q < 0.7 ? t("la mitad más", "half as much again") : r < 1.75 ? t("mucho más", "much more") : r < 2.5 ? t("el doble", "twice as much")
      : r < 3.5 ? t("el triple", "three times as much") : Math.round(r) + t(" veces más", " times as much");
  }
  // "Aquí" for a place, "En <name>" for the region or a reserve
  function enDonde() { var s = estado.sel; return s.tipo === "region" ? t("En ", "In ") + NOMBRE_REGION : s.tipo === "area" ? t("En ", "In ") + nombreA(s.area) : t("Aquí", "Here"); }
  // Data texts (alerts) use technical words: say them the everyday way
  function llano(x) {
    return EN ? String(x).replace(/VIIRS-equivalent detections/g, "fires seen by satellite").replace(/detections/g, "fires seen").replace(/detection/g, "fire seen").replace(/typical/g, "normal")
      : String(x).replace(/detecciones/g, "fuegos vistos").replace(/detección/g, "fuego visto").replace(/año típico/g, "año normal").replace(/típic([oa])/g, "normal");
  }
  // Each chart starts with its conclusion in bold, and a folded "How to read this?"
  function conclusion(txt) { return '<p class="conclusion">' + txt + "</p>"; }
  function comoLeer(html) { return '<details class="leer"><summary>' + t("¿Cómo leer esto?", "How to read this?") + "</summary><p>" + html + "</p></details>"; }
  function nomPeriodo(pc, mayus) {
    var x = pc.n === 1 ? t("en ", "in ") + NOML[pc.ini] : t("de ", "from ") + NOML[pc.ini] + t(" a ", " to ") + NOML[pc.fin];
    if (mayus && EN && pc.n !== 1) x = NOML[pc.ini] + " to " + NOML[pc.fin];
    return mayus ? x.charAt(0).toUpperCase() + x.slice(1) : x;
  }

  // Values painted on the map for the current map mode
  var VALORES = new Array(NC).fill(0), MAXV = 1;
  function textoCelda(c) {
    var q = centro(c), m = estado.mapa, v = VALORES[c] || 0, k, val, u;
    if (m.tipo === "riesgo") { k = t("Posibilidad de fuego", "Chance of fire"); val = Math.round(v) + "%"; u = ""; }
    else if (m.tipo === "nal") { k = t("NAL espera", "NAL expects") + (m.mes !== null ? " · " + NOML[m.mes] : ""); val = fmt(v); u = m.mes !== null ? t(" fuegos en ese mes", " fires in that month") : t(" fuegos en un año", " fires in a year"); }
    else if (m.tipo === "mes") { k = mesAnio(MES[m.k], ANIO[m.k]); val = fmt(v); u = t(" fuegos vistos por satélite ese mes", " fires seen by satellite that month"); }
    else if (m.tipo === "semana") { k = t("Una semana", "One week"); val = fmt(v); u = t(" fuegos vistos por satélite esa semana", " fires seen by satellite that week"); }
    else { k = t("Un año normal", "A normal year"); val = fmt(v); u = t(" fuegos vistos por satélite en un año (promedio)", " fires seen by satellite in a year (average)"); }
    return '<span class="tt-k">' + esc(k) + '</span><span class="tt-v">' + val + "</span>" + (u ? "<span>" + esc(u.trim()) + "</span>" : "") +
      '<span class="tt-c">' + t("Zona de 27 km · ", "27 km area · ") + q[1].toFixed(2) + "°, " + q[0].toFixed(2) + "°</span>";
  }
  function pintarMapa() {
    if (!MAPA) return;
    var m = estado.mapa, F = estado.crudo && Q.crudo ? Q.crudo : Q.serie, c, k;
    VALORES = new Array(NC).fill(0);
    if (m.tipo === "mes") { for (c = 0; c < NC; c++) VALORES[c] = F[c][m.k]; }
    else if (m.tipo === "semana") { VALORES = m.valores; }
    else if (m.tipo === "riesgo") { VALORES = m.valores; }
    else if (m.tipo === "nal") { VALORES = m.valores; }
    else { var n = Math.max(1, aniosComp.length); for (c = 0; c < NC; c++) { var s = 0; for (k = 0; k < T; k++) if (completo[ANIO[k]]) s += F[c][k]; VALORES[c] = s / n; } }
    MAXV = 1; for (c = 0; c < NC; c++) if (VALORES[c] > MAXV) MAXV = VALORES[c];
    var normRiesgo = function (v) { return Math.max(0, (v || 0) / 100); }, normFuego = function (v) { return Math.sqrt(Math.max(0, v || 0) / MAXV); };
    if (m.tipo === "riesgo") MAPA.pintar(VALORES, function (v) { return color(MORADO_MIN + (1 - MORADO_MIN) * normRiesgo(v)); }, function (v) { return opacidad(v / 100); }, normRiesgo);
    else MAPA.pintar(VALORES, function (v) { return color(MORADO_MIN + (1 - MORADO_MIN) * normFuego(v)); }, function (v) { return opacidad(v / MAXV); }, normFuego); // no fire = purple, not empty
    leyenda();
    var mt = $("modo");
    if (m.tipo === "promedio") mt.style.display = "none";
    else { mt.style.display = "block"; $("modoTxt").textContent = m.tipo === "mes" ? t("Viendo: ", "Showing: ") + mesAnio(MES[m.k], ANIO[m.k]) : m.tipo === "nal" ? t("Viendo: predicción de NAL", "Showing: NAL forecast") : m.tipo === "riesgo" ? t("Viendo: posibilidad de fuego", "Showing: chance of fire") : t("Viendo: una semana", "Showing: one week"); }
  }
  function leyenda() {
    var m = estado.mapa, tit = m.tipo === "nal" ? t("Fuego que espera NAL", "Fire NAL expects") + (m.mes !== null ? " · " + NOML[m.mes] : "") : m.tipo === "riesgo" ? t("Posibilidad de fuego", "Chance of fire") : m.tipo === "mes" ? t("Fuego en ", "Fire in ") + mesAnio(MES[m.k], ANIO[m.k])
      : m.tipo === "semana" ? t("Fuego en esa semana", "Fire that week") : t("Fuego en un año normal", "Fire in a normal year");
    var max = m.tipo === "riesgo" ? "100%" : fmt(MAXV), rie = m.tipo === "riesgo";
    $("leyenda").setAttribute("title", t("Máximo en el mapa: ", "Map maximum: ") + max);
    $("leyenda").classList.toggle("plegada", LEY_PLEGADA);
    if (LEY_PLEGADA) {
      $("leyenda").innerHTML = '<button type="button" class="ley-abrir" data-ley="abrir" aria-expanded="false" title="' + t("Mostrar la leyenda", "Show the legend") + '">' +
        '<i class="rampa"></i><span>' + t("Leyenda", "Legend") + "</span>" + I("chevron", 14) + "</button>";
      return;
    }
    $("leyenda").innerHTML = '<button type="button" class="ley-cerrar" data-ley="cerrar" aria-expanded="true" aria-label="' + t("Ocultar la leyenda", "Hide the legend") + '" title="' + t("Ocultar", "Hide") + '">' + I("chevron", 16) + "</button>" +
      "<b>" + tit + "</b>" + (estado.crudo ? ' <span class="semaforo" style="--c:var(--warn)">' + t("datos sin corregir", "uncorrected data") + "</span>" : "") +
      '<div class="ley-fila"><span>' + (rie ? t("Poca", "Low") : t("Poco fuego", "Little fire")) + '</span><div class="rampa"></div><span>' + (rie ? t("Mucha", "High") : t("Mucho fuego", "Lots of fire")) + "</span></div>" +
      '<div class="nota-ley">' + (vistaMapa() === "cuadros" ? t("Cada cuadro = zona de 27 km. Las líneas encierran zonas con fuego parecido.", "Each square = a 27 km area. Lines group areas with similar fire.")
        : t("Mapa de calor con datos de satélite de la NASA. Fuera de la zona de estudio el color es solo ilustrativo.", "Heat map from NASA satellite data. Outside the study area the colour is illustrative only.")) + "</div>" +
      (MAPA && MAPA.vista && MAPA.vista() !== null && MAPA.tipo === "leaflet" ? '<div class="vista-sw" role="group" aria-label="' + t("Ver el mapa como", "Show the map as") + '">' +
        '<span>' + t("Ver como", "Show as") + "</span>" +
        '<button type="button" data-vista="calor" class="' + (vistaMapa() === "calor" ? "on" : "") + '" aria-pressed="' + (vistaMapa() === "calor") + '">' + t("Mapa de calor", "Heat map") + "</button>" +
        '<button type="button" data-vista="cuadros" class="' + (vistaMapa() === "cuadros" ? "on" : "") + '" aria-pressed="' + (vistaMapa() === "cuadros") + '">' + t("Cuadros", "Squares") + "</button></div>" : "");
  }
  function vistaMapa() { return MAPA && MAPA.vista ? MAPA.vista() : "cuadros"; }
  var LEY_PLEGADA = false; // legend panel: shown or hidden (only the small "Legend" pill stays)
  $("leyenda").addEventListener("click", function (ev) {
    var tg = ev.target.closest ? ev.target.closest("[data-ley]") : null;
    if (tg) { ev.stopPropagation(); var abrir = tg.getAttribute("data-ley") === "abrir";
      setTimeout(function () { LEY_PLEGADA = !abrir; leyenda(); var nb = document.querySelector("#leyenda [data-ley]"); if (nb) nb.focus({ preventScroll: true }); }, 0); return; }
    var b = ev.target.closest ? ev.target.closest("[data-vista]") : null; if (!b || !MAPA || !MAPA.vista) return;
    // keep the click away from the map (otherwise it would also select the spot under the legend), and redraw after
    // the event has finished: the legend is rebuilt by pintarMapa and the button would be detached mid-event
    ev.stopPropagation(); var v = b.getAttribute("data-vista");
    setTimeout(function () { MAPA.vista(v); pintarMapa(); var nb = document.querySelector('.vista-sw [data-vista="' + v + '"]'); if (nb) nb.focus({ preventScroll: true }); }, 0);
  });
  $("modoX").addEventListener("click", function () { pararReplay(); if (SEM) { $("repSem").value = 0; pista($("repSem")); etiquetaReproducir(); } estado.mapa = { tipo: "promedio" }; marcarCalendario(); pintarMapa(); });

  // =====================================================================
  //  Selection
  // =====================================================================
  var ESCALAS = [[0, t("Solo aquí (27 km)", "Just here (27 km)")], [2, t("Alrededores (125 km)", "Surroundings (125 km)")], [9, t("Toda la región", "Whole region")]];
  function seleccionarPunto(lat, lon, nombre, sinGeo) {
    var c = celdaEn(lat, lon);
    if (c < 0) { avisoFuera(lat, lon); return; }
    if (estado.escala === 2) estado.escala = 1;
    estado.sel = { tipo: "punto", celdas: null, area: null, nombre: nombre || null, lat: lat, lon: lon, c: c };
    aplicarEscala();
    if (MAPA) { MAPA.marcar(lat, lon); }
    if (!nombre && !sinGeo) geoInverso(lat, lon);
  }
  function aplicarEscala() {
    var s = estado.sel;
    if (s.tipo === "punto" || (s.tipo === "region" && s.c >= 0)) {
      if (estado.escala === 2) { s.tipo = "region"; s.celdas = null; }
      else { s.tipo = "punto"; s.celdas = alrededor(s.c, estado.escala === 0 ? 0 : 2); }
    }
    if (MAPA) MAPA.seleccion(s.tipo === "region" ? null : s.celdas, s.tipo === "area" ? s.area.anillos : null);
    actualizar();
  }
  function seleccionarArea(a) {
    var cs = []; for (var c = 0; c < NC; c++) { var q = centro(c); if (dentroAnillos(q[0], q[1], a.anillos)) cs.push(c); }
    if (!cs.length) { var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; a.anillos.forEach(function (r) { r.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }); }); var cc = celdaEn((y0 + y1) / 2, (x0 + x1) / 2); if (cc >= 0) cs = [cc]; }
    estado.sel = { tipo: "area", celdas: cs, area: a, nombre: nombreA(a), lat: null, lon: null, c: cs[0] };
    if (MAPA) { MAPA.marcar(null); MAPA.seleccion(null, a.anillos); MAPA.areas(Q.areas ? Q.areas.areas : null, a.id); MAPA.encuadrar(cajaAnillos(a.anillos)); }
    actualizar();
  }
  function cajaAnillos(an) { var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; an.forEach(function (r) { r.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }); }); return [x0, y0, x1, y1]; }
  function dentroAnillos(x, y, an) { var dentro = false; an.forEach(function (P) { for (var i = 0, j = P.length - 1; i < P.length; j = i++) { if (((P[i][1] > y) !== (P[j][1] > y)) && (x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0])) dentro = !dentro; } }); return dentro; }
  function seleccionarRegion() {
    estado.sel = { tipo: "region", celdas: null, area: null, nombre: NOMBRE_REGION, lat: null, lon: null, c: -1 }; estado.escala = 1;
    if (MAPA) { MAPA.marcar(null); MAPA.seleccion(null); MAPA.encuadrar(M.bbox); }
    actualizar();
  }
  function nombreA(a) { return EN ? (a.nombre_en || a.nombre) : a.nombre; }
  function dibujarEscala() {
    var s = estado.sel, h = "";
    if (s.tipo === "punto" || (s.tipo === "region" && s.c >= 0)) {
      h = ESCALAS.map(function (e, i) { return '<button data-e="' + i + '" aria-pressed="' + (estado.escala === i) + '" class="' + (estado.escala === i ? "on" : "") + '">' + e[1] + "</button>"; }).join("");
    } else if (s.tipo === "area") h = '<button class="on" aria-pressed="true">' + I("shield", 14) + t("Reserva natural", "Nature reserve") + '</button><button data-reg="1">' + t("Ver toda la región", "Whole region") + "</button>";
    else h = '<span class="hint">' + (TACTIL ? t("Busca tu pueblo o toca el mapa para ver un lugar.", "Search your town or tap the map to see one place.") : t("Busca tu pueblo o haz clic en el mapa para ver un lugar.", "Search your town or click the map to see one place.")) + "</span>";
    $("escala").innerHTML = h;
  }
  $("escala").addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("button") : null; if (!b) return;
    if (b.getAttribute("data-reg")) { seleccionarRegion(); return; }
    var e = b.getAttribute("data-e"); if (e === null) return;
    estado.escala = +e; aplicarEscala();
  });

  // =====================================================================
  //  Search (OpenStreetMap Nominatim) and reverse geocoding
  // =====================================================================
  var ultimaPeticion = 0, cacheGeo = {};
  function esperarTurno() { var ahora = Date.now(), espera = Math.max(0, ultimaPeticion + 1100 - ahora); ultimaPeticion = ahora + espera; return new Promise(function (r) { setTimeout(r, espera); }); }
  function nominatim(url) {
    if (cacheGeo[url]) return Promise.resolve(cacheGeo[url]);
    return esperarTurno().then(function () { return fetch(url + "&accept-language=" + (EN ? "en" : "es")); })
      .then(function (r) { return r.json(); }).then(function (j) { cacheGeo[url] = j; return j; });
  }
  var RES = $("resultados");
  function mostrarResultados(html) { RES.innerHTML = html; RES.style.display = html ? "block" : "none"; }
  $("formBuscar").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var q = $("q").value.trim(); if (!q) return;
    var m = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) { mostrarResultados(""); cerrarBienvenida(); var lat = +m[1], lon = +m[2]; if (MAPA) MAPA.irA(lat, lon, 9); seleccionarPunto(lat, lon); return; }
    mostrarResultados('<div class="nota">' + t("Buscando…", "Searching…") + "</div>");
    var vb = [LON0, LAT1, LON1, LAT0].join(",");
    nominatim("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=0&viewbox=" + vb + "&q=" + encodeURIComponent(q))
      .then(function (L) {
        if (!L.length) { mostrarResultados('<div class="nota">' + t("No encontré ese lugar. Prueba con el nombre de un pueblo o escribe coordenadas (lat, lon).", "Place not found. Try a town name, or type coordinates (lat, lon).") + "</div>"); return; }
        var peso = function (r) { var at = r.addresstype || r.type || ""; return /^(city|town|village|hamlet|suburb|neighbourhood|quarter)$/.test(at) ? 0 : (r.category === "boundary" || at === "municipality" || at === "county") ? 2 : 1; };
        L = L.map(function (r, i) { r._i = i; return r; }).sort(function (a, b) { return peso(a) - peso(b) || a._i - b._i; });
        mostrarResultados(L.map(function (r, i) {
          var dentro = celdaEn(+r.lat, +r.lon) >= 0;
          return '<button type="button" role="option" data-i="' + i + '" data-dentro="' + (dentro ? 1 : 0) + '" data-lat="' + r.lat + '" data-lon="' + r.lon + '" data-n="' + esc(r.name || r.display_name.split(",")[0]) + '">' + I(dentro ? "pin" : "globe", 16) + "<span>" + esc(r.display_name) + (dentro ? "" : ' <span class="fuera">· ' + t("fuera de la región", "outside the region") + "</span>") + "</span></button>";
        }).join("") + '<div class="pie-res solo-teclado"><span><kbd>↑↓</kbd>' + t("elegir", "move") + "</span><span><kbd>Enter</kbd>" + t("ir", "go") + "</span><span><kbd>Esc</kbd>" + t("cerrar", "close") + "</span></div>");
      })
      .catch(function () { mostrarResultados('<div class="nota">' + t("La búsqueda necesita internet. También puedes escribir coordenadas: 21.1, -88.1", "Search needs internet. You can also type coordinates: 21.1, -88.1") + "</div>"); });
  });
  RES.addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("button[data-lat]") : null; if (!b) return;
    var lat = +b.getAttribute("data-lat"), lon = +b.getAttribute("data-lon"), n = b.getAttribute("data-n");
    mostrarResultados(""); $("q").blur(); cerrarBienvenida();
    if (celdaEn(lat, lon) < 0) { avisoFuera(lat, lon); return; }
    if (MAPA) MAPA.irA(lat, lon, 9);
    seleccionarPunto(lat, lon, n);
  });
  document.addEventListener("click", function (ev) { if (!ev.target.closest || !ev.target.closest(".search")) mostrarResultados(""); });
  // Command-bar behaviour: Ctrl/Cmd+K or "/" focuses the search; arrows move through results; Esc closes.
  // (Still no search-as-you-type: Nominatim is only called when the form is submitted.)
  document.addEventListener("keydown", function (ev) {
    var tag = (ev.target.tagName || "").toLowerCase(), escribe = tag === "input" || tag === "select" || tag === "textarea";
    if ((ev.key === "k" || ev.key === "K") && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); $("q").focus(); $("q").select(); return; }
    if (ev.key === "/" && !escribe) { ev.preventDefault(); $("q").focus(); return; }
  });
  $("formBuscar").addEventListener("keydown", function (ev) {
    var bs = [].slice.call(RES.querySelectorAll("button[data-lat]")); if (!bs.length && ev.key !== "Escape") return;
    var i = bs.indexOf(document.activeElement);
    if (ev.key === "ArrowDown") { ev.preventDefault(); bs[Math.min(bs.length - 1, i + 1)].focus(); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); if (i <= 0) $("q").focus(); else bs[i - 1].focus(); }
    else if (ev.key === "Escape") { mostrarResultados(""); $("q").blur(); }
  });
  function avisoFuera(lat, lon) { setTimeout(function () { avisoFuera2(lat, lon); }, 0); }
  function avisoFuera2(lat, lon) {
    var otra = (window.REGIONES || []).filter(function (r) { return r.clave !== M.clave; });
    mostrarResultados('<div class="nota">' + t("Ese lugar está fuera de ", "That place is outside ") + esc(NOMBRE_REGION) + t(". Por ahora la herramienta cubre la Península de Yucatán y Portugal con el oeste de España; el mismo código sirve para cualquier región.", ". For now the tool covers the Yucatán Peninsula and Portugal with western Spain; the same code works for any region.") +
      (otra.length ? ' <button type="button" class="link" data-otra="' + otra[0].clave + '">' + t("Ir a ", "Go to ") + esc(EN ? (otra[0].nombre_en || otra[0].nombre) : otra[0].nombre) + "</button>" : "") + "</div>");
  }
  RES.addEventListener("click", function (ev) { var o = ev.target.getAttribute && ev.target.getAttribute("data-otra"); if (o) location.search = "?region=" + o + "&lang=" + (EN ? "en" : "es"); });
  var geoTimer = null;
  function geoInverso(lat, lon) {
    clearTimeout(geoTimer);
    geoTimer = setTimeout(function () {
      var url = "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=" + lat.toFixed(3) + "&lon=" + lon.toFixed(3);
      nominatim(url).then(function (r) {
        if (estado.sel.lat !== lat) return;
        var a = r && r.address, n = a ? (a.city || a.town || a.village || a.municipality || a.county || a.state) : null;
        if (n) { estado.sel.nombre = t("Cerca de ", "Near ") + n + (a.state && a.state !== n ? ", " + a.state : ""); dibujarLugar(); }
      }).catch(function () {});
    }, 700);
  }

  // =====================================================================
  //  Answers ("In 10 seconds")
  // =====================================================================
  function periodoCritico(s) {
    var tot = new Array(12).fill(0), suma = 0, k, i;
    for (k = 0; k < T; k++) if (completo[ANIO[k]]) { tot[MES[k] - 1] += s[k]; suma += s[k]; }
    if (!(suma > 0)) return null;
    var arriba = tot.map(function (v) { return v / suma > 1 / 12; });
    if (arriba.every(Boolean) || !arriba.some(Boolean)) return { meses: [], tot: tot, suma: suma };
    var mejor = null;
    for (i = 0; i < 12; i++) { if (!arriba[i] || arriba[(i + 11) % 12]) continue; var n = 0, sm = 0; while (n < 12 && arriba[(i + n) % 12]) { sm += tot[(i + n) % 12]; n++; } if (!mejor || sm > mejor.suma) mejor = { ini: i, n: n, suma: sm }; }
    var meses = []; for (i = 0; i < mejor.n; i++) meses.push((mejor.ini + i) % 12);
    return { meses: meses, n: mejor.n, ini: mejor.ini, fin: (mejor.ini + mejor.n - 1) % 12, pct: Math.round(mejor.suma / suma * 100), tot: tot, suma: suma };
  }
  function comoVaElAnio(s) {
    var a = ANIO[ultimo], m = MES[ultimo], ytd = 0, k;
    var anioActual = !completo[a];
    var lim = anioActual ? m : 12, ref = anioActual ? a : a;
    for (k = 0; k < T; k++) if (ANIO[k] === ref && MES[k] <= lim) ytd += s[k];
    var otros = aniosComp.filter(function (y) { return y !== ref; }).map(function (y) { var v = 0; for (var k2 = 0; k2 < T; k2++) if (ANIO[k2] === y && MES[k2] <= lim) v += s[k2]; return { y: y, v: v }; });
    var med = mediana(otros.map(function (o) { return o.v; })), lugar = 1 + otros.filter(function (o) { return o.v > ytd; }).length;
    return { anio: ref, hasta: lim, ytd: ytd, med: med, ratio: med > 0 ? ytd / med : null, lugar: lugar, n: otros.length + 1 };
  }
  function anomaliasSel() {
    var en = {}; celdasSel().forEach(function (c) { en[c] = 1; });
    return Q.anomalias.filter(function (a) { return en[a.celda]; }).sort(function (a, b) { return a.mes < b.mes ? 1 : (a.mes > b.mes ? -1 : 0); });
  }
  var ETQ = { fuera_de_lugar: t("Fuego donde casi nunca hay", "Fire where there almost never is"), fuera_de_temporada: t("Fuego en un mes que suele estar tranquilo", "Fire in a month that is usually quiet"), fuera_de_escala: t("Mucho más fuego de lo normal", "Far more fire than normal") };
  var EXPL = { fuera_de_lugar: t("hubo fuego donde casi nunca hay", "there was fire where there almost never is"), fuera_de_temporada: t("hubo fuego en un mes que suele estar tranquilo", "there was fire in a month that is usually quiet"), fuera_de_escala: t("hubo mucho más fuego de lo normal", "there was far more fire than normal") };
  function dibujarLugar() {
    var s = estado.sel;
    var nom = s.tipo === "region" ? NOMBRE_REGION : (s.nombre || (s.lat !== null ? s.lat.toFixed(2) + ", " + s.lon.toFixed(2) : NOMBRE_REGION)), h2 = $("lugarNom");
    if (h2.textContent !== nom) { h2.textContent = nom; h2.classList.remove("cambia"); void h2.offsetWidth; h2.classList.add("cambia"); }
    $("lugarKick").textContent = s.tipo === "region" ? t("Región", "Region") : s.tipo === "area" ? t("Reserva natural", "Nature reserve") : t("Lugar elegido", "Chosen place");
    if (s.tipo !== "region") document.body.classList.add("ya-eligio"); // the map hint goes away once a place is chosen
    $("lugarPin").innerHTML = I(s.tipo === "region" ? "globe" : s.tipo === "area" ? "shield" : "pin", 20);
    var sub;
    if (s.tipo === "region") sub = t("Fotos de satélite de ", "Satellite photos from ") + mesAnio(MES[0], ANIO[0]) + t(" a ", " to ") + mesAnio(MES[T - 1], ANIO[T - 1]);
    else if (s.tipo === "area") sub = (EN && s.area.desig_en && s.area.desig_en !== "Not Reported" ? s.area.desig_en : s.area.desig) + " · " + fmt(s.area.km2) + " km²";
    else sub = estado.escala === 0 ? t("Una zona de 27 km", "A 27 km area") : t("Una zona de unos 125 km a la redonda", "An area about 125 km across");
    $("lugarSub").textContent = sub;
    dibujarEscala();
  }
  function dibujarRespuestas() {
    var s = serieSel(), pc = periodoCritico(s), h;
    // 1. When is there most fire? A 12-month strip with the fire months lit (colour + letter, never colour alone)
    if (!pc) h = '<div class="q">' + I("flame", 18) + t("¿Cuándo hay más fuego aquí?", "When is there most fire here?") + '</div><div class="a">' + t("Casi nunca hay", "Almost never") + '</div><div class="d">' + t("Los satélites casi no han visto fuego en esta zona.", "Satellites have seen almost no fire in this area.") + "</div>";
    else {
      var mx = Math.max.apply(null, pc.tot) || 1;
      var nomP = pc.meses.length ? nomPeriodo(pc, true) : t("Todo el año", "All year round");
      h = '<div class="q">' + I("flame", 18) + t("¿Cuándo hay más fuego aquí?", "When is there most fire here?") + '</div><div class="a">' + nomP + "</div>" +
        '<div class="d">' + (pc.meses.length ? t("En esos meses ocurren ", "Those months have ") + "<b>" + cuenta(pc.pct, pc.pct) + t(" de cada 100", " out of every 100") + "</b>" + t(" fuegos del año.", " fires of the year.") : t("No hay una temporada marcada.", "There is no clear season.")) + "</div>" +
        '<div class="mini" data-tipctx="1">' + pc.tot.map(function (v, i) { return '<div class="' + (pc.meses.indexOf(i) >= 0 ? "cr" : "") + '" style="--i:' + i + ";height:" + Math.max(3, Math.round(v / mx * 100)) + '%" data-tip="' + esc(NOML[i] + ": " + Math.round(v / pc.suma * 100) + t(" de cada 100 fuegos del año", " out of every 100 fires of the year")) + '"></div>'; }).join("") + "</div>" +
        '<div class="minilab">' + NOM.map(function (n, i) { return '<span class="' + (pc.meses.indexOf(i) >= 0 ? "cr" : "") + '">' + n.slice(0, 1) + "</span>"; }).join("") + "</div>";
    }
    $("r1").innerHTML = h;
    // 2. How is this year going? Dot + word + colour, then one sentence with rounded numbers
    var y = comoVaElAnio(s), col, est;
    if (y.ratio === null) { col = "var(--text-3)"; est = t("Sin con qué comparar", "Nothing to compare with"); }
    else if (y.ratio < 0.75) { col = "var(--ok)"; est = t("Mejor que lo normal", "Better than normal"); }
    else if (y.ratio <= 1.25) { col = "var(--info)"; est = t("Como lo normal", "About normal"); }
    else if (y.ratio <= 2) { col = "var(--warn)"; est = t("Peor que lo normal", "Worse than normal"); }
    else { col = "var(--bad)"; est = t("Mucho peor que lo normal", "Much worse than normal"); }
    var parcial = y.hasta < 12, pal = enPalabras(y.ratio);
    var frase = (parcial ? t("De enero a ", "January to ") + NOML[y.hasta - 1] + ": " : t("En todo ", "All of ") + y.anio + ": ") + "<b>" + aproxT(y.ytd) + "</b>" + t(" fuegos vistos por satélite, contra ", " fires seen by satellite, against ") + "<b>" + aproxT(y.med) + "</b>" + t(" en un año normal", " in a normal year") + (pal ? ": " + pal + "." : ".");
    var tranq = y.lugar > y.n * 0.66, fuerte = y.lugar <= Math.max(2, Math.round(y.n * 0.2));
    if (y.ratio !== null && (tranq || fuerte)) frase += ' <span title="' + esc(t("Lugar ", "Rank ") + y.lugar + t(" de ", " of ") + y.n + t(" (1 = el de más fuego)", " (1 = the most fire)")) + '">' + (tranq ? t("Es de los años más tranquilos.", "It is one of the quietest years.") : t("Es de los años con más fuego.", "It is one of the years with the most fire.")) + "</span>";
    $("r2").style.setProperty("--c", col);
    $("r2").innerHTML = '<div class="q">' + I("calendar", 18) + (parcial ? t("¿Cómo va este año?", "How is this year going?") : t("¿Cómo fue ", "How was ") + y.anio + "?") + "</div>" +
      '<div class="a estado"><i class="punto" aria-hidden="true"></i>' + est + '</div><div class="d">' + frase + "</div>";
    // 3. Did anything unusual happen? The latest one in words + "See where"
    var al = anomaliasSel(), u = al[0];
    if (!u) $("r3").innerHTML = '<div class="q">' + I("alert", 18) + t("¿Pasó algo raro?", "Did anything unusual happen?") + '</div><div class="a">' + t("No, todo normal", "No, all normal") + '</div><div class="d">' + t("Nada fuera de lo normal en los últimos 3 años.", "Nothing out of the ordinary in the last 3 years.") + "</div>";
    else {
      var mu = +u.mes.slice(5), yu = +u.mes.slice(0, 4), cuando = yu === ANIO[ultimo] ? NOML[mu - 1] : mesAnio(mu, yu);
      $("r3").innerHTML = '<div class="q">' + I("alert", 18) + t("¿Pasó algo raro?", "Did anything unusual happen?") + '</div><div class="a">' + t("Sí: en ", "Yes: in ") + cuando + " " + EXPL[u.tipo] + "</div>" +
        '<div class="d">' + (al.length > 1 ? t("Y ", "And ") + (al.length - 1) + (al.length === 2 ? t(" cosa más fuera de lo normal", " more unusual thing") : t(" cosas más fuera de lo normal", " more unusual things")) + t(" en los últimos 3 años.", " in the last 3 years.") : "") + "</div>" +
        '<div class="fila acciones-r"><button class="boton prim" data-donde="1">' + I("pin", 16) + t("Ver dónde", "See where") + '</button><button class="link" data-ir="alertas">' + t("Ver la lista", "See the list") + I("arrow", 14) + "</button></div>";
    }
    // Staggered entrance and counting numbers each time the place changes
    ["r1", "r2", "r3"].forEach(function (id) { var el = $(id); el.classList.remove("entra"); void el.offsetWidth; el.classList.add("entra"); contar(el); });
  }
  $("r3").addEventListener("click", function (ev) { if (ev.target.closest && ev.target.closest("[data-ir]")) abrirTab("alertas", true); });
  // "See where": fly to the latest unusual fire and paint that month (the same as tapping it in the list)
  $("r3").addEventListener("click", function (ev) {
    if (!ev.target.closest || !ev.target.closest("[data-donde]")) return;
    var u = anomaliasSel()[0]; if (!u) return;
    if (MAPA) { MAPA.irA(u.lat, u.lon, 9); MAPA.marcar(u.lat, u.lon); }
    var k = Q.meses.indexOf(u.mes); if (k >= 0) { pararReplay(); estado.mapa = { tipo: "mes", k: k }; marcarCalendario(); pintarMapa(); }
    abrirHoja(0);
  });
  conTip($("r1"));

  // =====================================================================
  //  Tabs
  // =====================================================================
  var TABS = [["cal", t("Mes por mes", "Month by month")], ["anios", t("Año por año", "Year by year")], ["alertas", t("Lo fuera de lo normal", "What was unusual")], ["reglas", t("¿Se respeta la ley?", "Is the law followed?")],
    ["tipo", t("¿Quema o incendio?", "Farm burn or wildfire?")], ["riesgo", t("Próxima semana", "Next week")], ["nal", t("Próximos años · NAL", "Coming years · NAL")], ["areas", t("Reservas naturales", "Nature reserves")], ["prueba", t("Comprobado con fotos de satélite", "Checked with satellite photos")], ["como", t("¿Es confiable?", "Can I trust it?")]];
  $("tabs").innerHTML = TABS.map(function (x) { return '<button role="tab" id="tb-' + x[0] + '" aria-controls="tab-' + x[0] + '" tabindex="-1" data-t="' + x[0] + '">' + x[1] + "</button>"; }).join("") + '<span class="tabs-ind" id="tabsInd" aria-hidden="true"></span>';
  $("tabs").addEventListener("click", function (ev) { var b = ev.target.closest ? ev.target.closest("button") : null; if (b) abrirTab(b.getAttribute("data-t")); });
  // Keyboard: left/right arrows (and Home/End) move between tabs
  $("tabs").addEventListener("keydown", function (ev) {
    var i = TABS.map(function (x) { return x[0]; }).indexOf(estado.tab), n = TABS.length, j = null;
    if (ev.key === "ArrowRight") j = (i + 1) % n; else if (ev.key === "ArrowLeft") j = (i - 1 + n) % n; else if (ev.key === "Home") j = 0; else if (ev.key === "End") j = n - 1;
    if (j === null) return; ev.preventDefault(); abrirTab(TABS[j][0]); $("tb-" + TABS[j][0]).focus();
  });
  // Sliding indicator under the active tab
  function moverIndicador() { var b = document.querySelector("#tabs button.on"), ind = $("tabsInd"); if (!b || !ind) return; ind.style.left = b.offsetLeft + 6 + "px"; ind.style.width = Math.max(0, b.offsetWidth - 12) + "px"; }
  window.addEventListener("resize", moverIndicador);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moverIndicador);
  function abrirTab(k, scroll) {
    estado.tab = k;
    [].forEach.call(document.querySelectorAll("#tabs button"), function (b) { var on = b.getAttribute("data-t") === k; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1;
      if (on) { var tb = $("tabs"); tb.scrollTo({ left: b.offsetLeft - tb.clientWidth / 2 + b.clientWidth / 2, behavior: "smooth" }); } });
    [].forEach.call(document.querySelectorAll(".tab"), function (s) { s.classList.toggle("on", s.id === "tab-" + k); });
    if (MAPA) { MAPA.zona(null); MAPA.imagen(null); if (k !== "areas" && estado.sel.tipo !== "area") MAPA.areas(null); if (k !== "cal") MAPA.puntos(null); }
    if (k !== "riesgo" && estado.mapa.tipo === "riesgo") { estado.mapa = { tipo: "promedio" }; pintarMapa(); }
    if (k !== "nal" && estado.mapa.tipo === "nal") { estado.mapa = { tipo: "promedio" }; pintarMapa(); }
    var f = { cal: tabCalendario, anios: tabAnios, alertas: tabAlertas, reglas: tabReglas, tipo: tabReglas, riesgo: tabRiesgo, nal: tabNal, areas: tabAreas, prueba: tabPrueba, como: tabComo }[k];
    if (f) f();
    moverIndicador();
    if (scroll) { abrirHoja(2); var ps = $("panelScroll"); ps.scrollTo({ top: $("anclaTabs").offsetTop, behavior: QUIETO ? "auto" : "smooth" }); }
  }

  // ---------- Calendar ----------
  var son = null;
  function tabCalendario() {
    var s = serieSel(), pc = periodoCritico(s), cr = pc ? pc.meses : [];
    var vis = s.filter(function (v, k) { return true; }), orden = vis.slice().sort(function (a, b) { return a - b; }), tope = orden[Math.floor(orden.length * 0.99)] || 1;
    var conc = !pc ? enDonde() + t(", los satélites casi no han visto fuego.", ", satellites have seen almost no fire.")
      : !pc.meses.length ? enDonde() + t(", hay fuego todo el año, sin una temporada marcada.", ", there is fire all year round, with no clear season.")
      : enDonde() + (pc.pct >= 75 ? t(", casi todo el fuego es ", ", almost all the fire is ") : t(", la mayor parte del fuego es ", ", most of the fire is ")) + nomPeriodo(pc) + ".";
    var h = ['<div class="tarjeta"><h3>' + t("El fuego, mes por mes", "Fire, month by month") + "</h3>", conclusion(conc),
      '<div class="cal" id="calGrid"><div></div>' + NOM.map(function (n, i) { return '<div class="h' + (cr.indexOf(i) >= 0 ? " cr" : "") + '">' + n + "</div>"; }).join("")];
    for (var y = anios.length - 1; y >= 0; y--) {
      var a = anios[y], fila = anios.length - 1 - y; h.push('<div class="y" style="--r:' + fila + '">' + a + "</div>");
      for (var m = 1; m <= 12; m++) {
        var k = Q.meses.indexOf(a + "-" + (m < 10 ? "0" : "") + m);
        if (k < 0) { h.push('<div class="c vacio"></div>'); continue; }
        var v = s[k], f = tope > 0 ? Math.sqrt(Math.min(1, v / tope)) : 0;
        h.push('<div class="c' + (Q.origen[k] !== "viirs" ? " conv" : "") + (estado.mapa.tipo === "mes" && estado.mapa.k === k ? " sel" : "") + '" data-k="' + k + '" style="--r:' + fila + ";background:" + color(f) + '" data-tip="' +
          esc("<b>" + mesAnio(m, a) + "</b><br>" + fmt(v) + t(" fuegos vistos por satélite", " fires seen by satellite") + (Q.origen[k] !== "viirs" ? "<br>" + t("calculado con un satélite anterior", "worked out from an earlier satellite") : "") + (Q.parcial[k] ? "<br>" + t("mes todavía sin terminar", "month not finished yet") : "")) + '"></div>');
      }
    }
    h.push("</div>");
    h.push('<div class="rampa-ley">' + t("Poco fuego", "Little fire") + '<i style="background:linear-gradient(90deg,' + VIR.join(",") + ')"></i>' + t("Mucho fuego", "Lots of fire") + ' <span style="width:12px"></span><span class="cr-mark"></span> ' + t("Meses con más fuego", "Months with most fire") + "</div>");
    h.push(comoLeer(t("Cada fila es un año y cada cuadro es un mes. Mientras más claro el color, más fuego. ", "Each row is a year and each square is a month. The lighter the colour, the more fire. ") +
      (TACTIL ? t("Toca un cuadro para ver cuántos fuegos se vieron y para pintar ese mes en el mapa. ", "Tap a square to see how many fires were seen and to paint that month on the map. ") : t("Pasa el cursor sobre un cuadro para ver cuántos fuegos se vieron; haz clic para pintar ese mes en el mapa. ", "Hover over a square to see how many fires were seen; click to paint that month on the map. ")) +
      t("Un incendio grande se ve muchas veces desde el espacio, por eso cuenta varias veces. Los cuadros con rayitas son años viejos, calculados con un satélite anterior.", "A big fire is seen many times from space, so it counts several times. Striped squares are older years, worked out from an earlier satellite.")));
    h.push('<div class="fila" style="margin-top:12px"><label class="toggle"><input type="checkbox" id="chkCrudo"' + (estado.crudo ? " checked" : "") + "> " + t("Ver los datos sin corregir", "See the uncorrected data") + "</label></div>");
    if (estado.crudo) h.push('<div class="aviso" style="margin-top:8px">' + t("Así se vería si juntáramos los satélites sin corregir: el salto de 2018 no es más fuego, es un satélite nuevo que ve más.", "This is how it would look if we put the satellites together without correcting: the jump in 2018 is not more fire, it is a new satellite that sees more.") + "</div>");
    h.push('<div class="fila" style="margin-top:14px"><button class="boton prim btn-son' + (son ? " on" : "") + '" id="btnSon">' + textoSon() + '</button><span id="sonTxt" class="sonido-txt" aria-live="polite"></span></div>');
    h.push('<details><summary>' + t("Descargar", "Download") + '</summary><div class="fila" style="margin-top:8px"><button class="boton" id="dlCsv">' + I("download", 16) + t("Calendario en tabla", "Calendar as a table") + '</button><button class="boton" id="dlPng">' + I("image", 16) + t("Calendario en imagen", "Calendar as a picture") + '</button><button class="boton" id="dlPts">' + I("download", 16) + t("Descargar los datos", "Download the data") + '</button><span id="dlTxt" class="mono" style="font-size:13px;color:var(--text-3)"></span></div></details>');
    h.push('<details><summary>' + t("Ver en el mapa cada fuego de un año", "See every fire of one year on the map") + '</summary><div class="fila" style="margin-top:8px"><select id="ptsAnio" class="boton" aria-label="' + t("Año", "Year") + '">' + anios.slice().reverse().map(function (a) { return "<option>" + a + "</option>"; }).join("") + '</select><button class="boton" id="ptsVer">' + I("target", 16) + t("Mostrar", "Show") + '</button><span id="ptsTxt" class="mono" style="font-size:13px;color:var(--text-3)"></span></div></details></div>');
    $("tab-cal").innerHTML = h.join("");
    conTip($("calGrid"));
    $("calGrid").addEventListener("click", function (ev) { var d = ev.target.closest ? ev.target.closest(".c[data-k]") : null; if (!d) return;
      var k = +d.getAttribute("data-k"); pararReplay(); estado.mapa = { tipo: "mes", k: k }; marcarCalendario(); pintarMapa(); });
    $("chkCrudo").addEventListener("change", function () { estado.crudo = this.checked; actualizar(); });
    $("btnSon").addEventListener("click", alternarSonido);
    $("dlCsv").addEventListener("click", bajarCsv); $("dlPng").addEventListener("click", bajarPng); $("dlPts").addEventListener("click", bajarPuntos);
    $("ptsVer").addEventListener("click", verPuntos);
  }
  function marcarCalendario() { [].forEach.call(document.querySelectorAll("#calGrid .c.sel"), function (d) { d.classList.remove("sel"); });
    if (estado.mapa.tipo === "mes") { var d = document.querySelector('#calGrid .c[data-k="' + estado.mapa.k + '"]'); if (d) d.classList.add("sel"); } }
  function alternarSonido() {
    if (son) { pararSon(); return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var ctx = new AC(), s = serieSel(), ks = []; for (var k = 0; k < T; k++) ks.push(k);
    var mx = 1; ks.forEach(function (i) { if (s[i] > mx) mx = s[i]; });
    var dt = 0.07, t0 = ctx.currentTime + 0.15;
    ks.forEach(function (i, n) { var f = Math.sqrt(Math.max(0, s[i]) / mx); if (!(f > 0.02)) return;
      var o = ctx.createOscillator(), g = ctx.createGain(), at = t0 + n * dt; o.type = "triangle"; o.frequency.value = 196 * Math.pow(2, 3 * f);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.04 + 0.22 * f, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + dt * 0.95);
      o.connect(g); g.connect(ctx.destination); o.start(at); o.stop(at + dt); });
    son = { ctx: ctx, ultimo: null }; $("btnSon").innerHTML = textoSon(); $("btnSon").classList.add("on");
    son.timer = setInterval(function () { var n = Math.floor((ctx.currentTime - t0) / dt); if (n >= ks.length) { pararSon(); return; } if (n < 0) return;
      var d = document.querySelector('#calGrid .c[data-k="' + ks[n] + '"]'); if (son.ultimo && son.ultimo !== d) son.ultimo.classList.remove("son"); if (d) { d.classList.add("son"); son.ultimo = d; }
      var tx = $("sonTxt"); if (tx) tx.textContent = mesAnio(MES[ks[n]], ANIO[ks[n]]) + ": " + fmt(s[ks[n]]); }, 30);
  }
  function pararSon() { if (!son) return; clearInterval(son.timer); try { son.ctx.close(); } catch (e) {} [].forEach.call(document.querySelectorAll("#calGrid .c.son"), function (d) { d.classList.remove("son"); }); son = null;
    var b = $("btnSon"); if (b) { b.innerHTML = textoSon(); b.classList.remove("on"); } var tx = $("sonTxt"); if (tx) tx.textContent = ""; }
  function textoSon() { return son ? I("stop", 16) + t("Detener", "Stop") : I("wave", 16) + t("Escuchar " + NSPAN + " años de fuego", "Listen to " + NSPAN + " years of fire"); }
  // downloads
  function bajarBlob(nombre, b) { var u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 1500); }
  function descZona() { var s = estado.sel; return s.tipo === "region" ? NOMBRE_REGION : ($("lugarNom").textContent + (s.tipo !== "area" ? " (" + s.celdas.length + t(" cuadros", " squares") + ")" : "")); }
  function bajarCsv() {
    var s = serieSel(), f = ["# " + descZona(), "month,year,month_number," + (estado.crudo ? "raw_detections" : "harmonized_detections") + ",source,incomplete_month"];
    for (var k = 0; k < T; k++) f.push([Q.meses[k], ANIO[k], MES[k], s[k].toFixed(1), Q.origen[k], Q.parcial[k] ? 1 : 0].join(","));
    bajarBlob("burn_calendar_" + M.clave + ".csv", new Blob(["﻿" + f.join("\n")], { type: "text/csv;charset=utf-8" }));
  }
  function bajarPng() {
    var s = serieSel(), filas = anios.slice().reverse(), orden = s.slice().sort(function (a, b) { return a - b; }), tope = orden[Math.floor(orden.length * 0.99)] || 1, pc = periodoCritico(s), cr = pc ? pc.meses : [];
    var cw = 58, ch = 22, L = 60, Tp = 78, W = L + 12 * cw + 90, H = Tp + filas.length * ch + 40, k;
    var g = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" font-family="Arial, Helvetica, sans-serif"><rect width="100%" height="100%" fill="#ffffff"/>',
      '<text x="' + L + '" y="28" font-size="18" font-weight="700" fill="#14213D">' + esc("Kanan Ka'ax · " + t("Calendario de quemas", "Burn calendar") + " · " + descZona()) + "</text>",
      '<text x="' + L + '" y="48" font-size="12" fill="#6b7486">' + esc((EN ? (M.unidad_en || M.unidad) : M.unidad) + (estado.crudo ? t(" · SIN ARMONIZAR", " · UNHARMONIZED") : "")) + "</text>"];
    NOM.forEach(function (m, i) { var c = cr.indexOf(i) >= 0; if (c) g.push('<rect x="' + (L + i * cw + 3) + '" y="' + (Tp - 19) + '" width="' + (cw - 6) + '" height="16" rx="3" fill="#e8692e"/>');
      g.push('<text x="' + (L + i * cw + cw / 2) + '" y="' + (Tp - 7) + '" font-size="11" text-anchor="middle" fill="' + (c ? "#fff" : "#6b7486") + '">' + esc(m) + "</text>"); });
    filas.forEach(function (a, r) { var y = Tp + r * ch, tot = 0; g.push('<text x="' + (L - 8) + '" y="' + (y + 15) + '" font-size="11" text-anchor="end" font-weight="700" fill="#14213D">' + a + "</text>");
      for (var m = 1; m <= 12; m++) { k = Q.meses.indexOf(a + "-" + (m < 10 ? "0" : "") + m); if (k < 0) continue; var v = s[k], f = Math.sqrt(Math.min(1, v / tope)); tot += v;
        g.push('<rect x="' + (L + (m - 1) * cw + 1) + '" y="' + (y + 1) + '" width="' + (cw - 2) + '" height="' + (ch - 2) + '" fill="' + colorPng(f) + '"/><text x="' + (L + (m - 1) * cw + cw / 2) + '" y="' + (y + 15) + '" font-size="10" text-anchor="middle" fill="' + textoSobre(f) + '">' + (v >= 1 ? Math.round(v) : (v > 0 ? "&lt;1" : "0")) + "</text>"); }
      g.push('<text x="' + (L + 12 * cw + 45) + '" y="' + (y + 15) + '" font-size="11" text-anchor="middle" font-weight="700" fill="#14213D">' + Math.round(tot).toLocaleString(LOC) + "</text>"); });
    g.push('<text x="' + L + '" y="' + (Tp + filas.length * ch + 22) + '" font-size="10" fill="#6b7486">' + esc(t("Fuente: satélites de la NASA (FIRMS), datos corregidos. Meses en naranja: los de más fuego.", "Source: NASA satellites (FIRMS), corrected data. Orange months: those with the most fire.")) + "</text></svg>");
    var svg = g.join(""), img = new Image(), base = "burn_calendar_" + M.clave;
    function comoSvg() { bajarBlob(base + ".svg", new Blob([svg], { type: "image/svg+xml" })); }
    img.onload = function () { try { var cv = document.createElement("canvas"); cv.width = W * 2; cv.height = H * 2; var cx = cv.getContext("2d"); cx.scale(2, 2); cx.drawImage(img, 0, 0); cv.toBlob(function (b) { if (b) bajarBlob(base + ".png", b); else comoSvg(); }, "image/png"); } catch (e) { comoSvg(); } };
    img.onerror = comoSvg; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  var puntosCache = {}, puntosEspera = {};
  window.PUNTOS_LISTO = function (clave, anio, texto) { puntosCache[anio] = texto; if (puntosEspera[anio]) puntosEspera[anio](); };
  function cargarAnio(anio, listo) { if (puntosCache[anio] !== undefined) { listo(); return; } puntosEspera[anio] = listo;
    var sc = document.createElement("script"); sc.src = "data/puntos/" + M.clave + "_" + anio + ".js"; sc.onerror = function () { puntosCache[anio] = ""; listo(); }; document.head.appendChild(sc); }
  function bajarPuntos() {
    var en = {}; celdasSel().forEach(function (c) { en[c] = 1; }); var filas = ["latitude,longitude,acq_date,acq_time_utc,satellite,confidence,frp_mw,daynight"], i = 0;
    (function sig() { if (i >= anios.length) { $("dlTxt").textContent = (filas.length - 1).toLocaleString(LOC) + t(" fuegos vistos", " fires seen"); bajarBlob("hot_spots_" + M.clave + ".csv", new Blob([filas.join("\n")], { type: "text/csv" })); return; }
      $("dlTxt").textContent = t("Preparando ", "Preparing ") + anios[i] + "…";
      cargarAnio(anios[i], function () { (puntosCache[anios[i]] || "").split("\n").forEach(function (f) { if (!f) return; var k = f.lastIndexOf(","); if (en[f.slice(k + 1)]) filas.push(f.slice(0, k)); }); i++; sig(); }); })();
  }
  function verPuntos() {
    var a = +$("ptsAnio").value, en = {}; celdasSel().forEach(function (c) { en[c] = 1; });
    $("ptsTxt").textContent = t("Cargando…", "Loading…");
    cargarAnio(a, function () { var L = [], n = 0; (puntosCache[a] || "").split("\n").forEach(function (f) { if (!f) return; var p = f.split(","); if (!en[p[p.length - 1]]) return; n++; if (L.length < 20000) L.push([+p[0], +p[1]]); });
      if (MAPA) MAPA.puntos(L); $("ptsTxt").textContent = n.toLocaleString(LOC) + t(" fuegos vistos en ", " fires seen in ") + a + (n > L.length ? t(" (se muestran 20,000)", " (showing 20,000)") : "") + (MAPA && MAPA.tipo === "svg" ? t(" · el mapa simple no los dibuja", " · the simple map does not draw them") : ""); });
  }

  // ---------- Years ----------
  function tabAnios() {
    var s = serieSel(), tot = {}, k; anios.forEach(function (a) { tot[a] = 0; }); for (k = 0; k < T; k++) tot[ANIO[k]] += s[k];
    var lista = anios.filter(function (a) { return completo[a] || a === ANIO[T - 1]; }), comp = lista.filter(function (a) { return completo[a]; });
    var med = mediana(comp.map(function (a) { return tot[a]; })), mx = Math.max.apply(null, lista.map(function (a) { return tot[a]; }).concat([1]));
    var top = comp.slice().sort(function (a, b) { return tot[b] - tot[a]; }).slice(0, 3);
    var W = 400, H = 220, L = 44, B = 26, Tp = 12, bw = (W - L - 6) / lista.length;
    function Y(v) { return H - B - (H - B - Tp) * v / mx; }
    var g = ['<svg viewBox="0 0 ' + W + " " + H + '" class="ch" style="width:100%;height:auto" id="barAnios">'];
    for (var e = 0; e <= 4; e++) { var yy = Y(mx * e / 4); g.push('<line x1="' + L + '" x2="' + (W - 4) + '" y1="' + yy + '" y2="' + yy + '" class="ch-grid"/><text x="' + (L - 4) + '" y="' + (yy + 3) + '" font-size="9" text-anchor="end" fill="#6b7486">' + fmt(mx * e / 4) + "</text>"); }
    g.push('<line x1="' + L + '" x2="' + (W - 4) + '" y1="' + Y(med) + '" y2="' + Y(med) + '" class="ch-ref"/><text class="ch-ref-t" x="' + (L + 4) + '" y="' + (Y(med) - 4) + '" font-size="9" fill="#F4F1EA">' + t("año normal", "normal year") + "</text>");
    lista.forEach(function (a, i) { var v = tot[a], parcial = !completo[a], esTop = top.indexOf(a) >= 0;
      g.push('<rect class="ch-bar" style="--i:' + i + '" x="' + (L + i * bw + 1) + '" y="' + Y(v) + '" width="' + Math.max(1, bw - 2) + '" height="' + (H - B - Y(v)) + '" rx="2" fill="' + (parcial ? "#7a3a1f" : esTop ? "#FF6B2C" : "#31688e") + '" data-tip="' +
        esc("<b>" + a + (parcial ? t(" (hasta ", " (through ") + NOML[MES[T - 1] - 1] + ")" : "") + "</b><br>" + fmt(v) + t(" fuegos vistos por satélite", " fires seen by satellite") + (med > 0 ? "<br>" + enPalabras(v / med) + t(" que un año normal", " compared with a normal year") : "")) + '"/>');
      if (a % 5 === 0) g.push('<text x="' + (L + i * bw + bw / 2) + '" y="' + (H - 10) + '" font-size="9" text-anchor="middle" fill="#6b7486">' + a + "</text>"); });
    g.push("</svg>");
    var h = '<div class="tarjeta"><h3>' + t("¿Qué años tuvieron más fuego?", "Which years had the most fire?") + "</h3>" + conclusion(top.length ? enDonde() + t(", el año con más fuego fue ", ", the year with the most fire was ") + top[0] + "." : enDonde() + t(", casi no hay fuego.", ", there is almost no fire.")) + g.join("") +
      comoLeer(t("Cada barra es un año: mientras más alta, más fuego. Las 3 naranjas son los años con más fuego (", "Each bar is a year: the taller, the more fire. The 3 orange ones are the years with the most fire (") + top.join(", ") + t("). La línea punteada es un año normal. ", "). The dashed line is a normal year. ") + (TACTIL ? t("Toca una barra para ver el número.", "Tap a bar to see the number.") : t("Pasa el cursor sobre una barra para ver el número.", "Hover over a bar to see the number."))) +
      '<label class="toggle" style="margin-top:8px"><input type="checkbox" id="chkCrudo2"' + (estado.crudo ? " checked" : "") + "> " + t("Ver los datos sin corregir", "See the uncorrected data") + "</label>";
    if (Q.crudo && estado.sel.tipo !== "area") {
      var r = new Array(T).fill(0); celdasSel().forEach(function (c) { var v = Q.crudo[c]; for (var k2 = 0; k2 < T; k2++) r[k2] += v[k2]; });
      var tr = {}; comp.forEach(function (a) { tr[a] = 0; }); for (k = 0; k < T; k++) if (tr[ANIO[k]] !== undefined) tr[ANIO[k]] += r[k];
      var hReal = comp.slice().sort(function (a, b) { return tot[b] - tot[a]; }), rec = comp.slice().sort(function (a, b) { return tr[b] - tr[a]; })[0];
      var lugar = hReal.indexOf(rec) + 1;
      if (!estado.crudo && lugar > 1) h += '<div class="aviso" style="margin-top:10px">' + t("Si no corrigiéramos los datos, ", "If we did not correct the data, ") + "<b>" + rec + "</b>" + t(" parecería el año con más fuego. En realidad está en el lugar ", " would look like the year with the most fire. It is really number ") + "<b>" + lugar + "</b>" + t(" de ", " of ") + comp.length + t(". Por eso hay que corregirlos.", ". That is why they need correcting.") + "</div>";
    }
    h += "</div>" + tarjetaAcumulado(s);
    $("tab-anios").innerHTML = h; conTip($("barAnios"));
    $("chkCrudo2").addEventListener("change", function () { estado.crudo = this.checked; actualizar(); });
    var sa = $("anioCmp"); if (sa) sa.addEventListener("change", function () { $("acumBox").innerHTML = graficaAcumulado(serieSel(), +sa.value); conTip($("acumBox")); });
    conTip($("acumBox"));
  }
  function tarjetaAcumulado(s) {
    var ult = ANIO[T - 1];
    return '<div class="tarjeta"><h3>' + t("Compara un año con los demás", "Compare one year with the others") + "</h3>" +
      '<select id="anioCmp" class="boton" aria-label="' + t("Año", "Year") + '">' + anios.slice().reverse().filter(function (a) { return a >= anios[1]; }).map(function (a) { return "<option" + (a === ult ? " selected" : "") + ">" + a + "</option>"; }).join("") + '</select><div id="acumBox" style="margin-top:8px">' + graficaAcumulado(s, ult) + "</div>" + comoLeer(t("La línea naranja es el año elegido y va sumando el fuego mes a mes. La punteada es un año normal. Las grises son los demás años.", "The orange line is the chosen year, adding up the fire month by month. The dashed one is a normal year. The grey ones are the other years.")) + "</div>";
  }
  function graficaAcumulado(s, sel) {
    var acum = {}, mx = 1;
    anios.forEach(function (a) { var c = [], tot = 0, n = 0; for (var m = 1; m <= 12; m++) { var k = Q.meses.indexOf(a + "-" + (m < 10 ? "0" : "") + m); if (k < 0 || k > ultimo) { c.push(null); continue; } tot += s[k]; n++; c.push(tot); } if (n) { acum[a] = c; if (tot > mx) mx = tot; } });
    var W = 400, H = 210, L = 44, B = 22, Tp = 10;
    function X(m) { return L + (W - L - 30) * m / 11; } function Y(v) { return H - B - (H - B - Tp) * v / mx; }
    function linea(c, col, w, dash, op) { var d = "", ini = true; c.forEach(function (v, m) { if (v === null) { return; } d += (ini ? "M" : "L") + X(m).toFixed(1) + " " + Y(v).toFixed(1); ini = false; }); return d ? '<path class="' + (dash ? 'ch-fade"' : 'ch-line" pathLength="1"') + (w > 3 ? ' style="--d:250ms"' : "") + ' d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + ' stroke-opacity="' + (op || 1) + '" stroke-linecap="round" stroke-linejoin="round"/>' : ""; }
    var g = ['<svg viewBox="0 0 ' + W + " " + H + '" class="ch" style="width:100%;height:auto">'];
    for (var e = 0; e <= 4; e++) { var yy = Y(mx * e / 4); g.push('<line x1="' + L + '" x2="' + (W - 30) + '" y1="' + yy + '" y2="' + yy + '" class="ch-grid"/><text x="' + (L - 4) + '" y="' + (yy + 3) + '" font-size="9" text-anchor="end" fill="#6b7486">' + fmt(mx * e / 4) + "</text>"); }
    for (var m = 0; m < 12; m += 2) g.push('<text x="' + X(m) + '" y="' + (H - 6) + '" font-size="9" text-anchor="middle" fill="#6b7486">' + NOM[m] + "</text>");
    aniosComp.forEach(function (a) { if (a !== sel && acum[a]) g.push(linea(acum[a], "#5b6680", 1, "", 0.5)); });
    var med = []; for (m = 0; m < 12; m++) med.push(mediana(aniosComp.filter(function (a) { return a !== sel && acum[a]; }).map(function (a) { return acum[a][m]; })));
    g.push(linea(med, "#F4F1EA", 2, "5 4")); if (acum[sel]) g.push(linea(acum[sel], "#FF6B2C", 3.5));
    for (m = 0; m < 12; m++) { var v = acum[sel] ? acum[sel][m] : null; g.push('<rect x="' + (X(m) - 14) + '" y="' + Tp + '" width="28" height="' + (H - B - Tp) + '" fill="transparent" data-tip="' + esc("<b>" + NOML[m] + "</b><br>" + sel + ": " + (v === null ? "—" : fmt(v)) + "<br>" + t("Año normal: ", "Normal year: ") + fmt(med[m])) + '"/>'); }
    g.push("</svg>");
    // Conclusion for the chosen year: where it stands at its last month with data against a normal year
    var ultM = -1; if (acum[sel]) acum[sel].forEach(function (v, i) { if (v !== null) ultM = i; });
    var cc = "";
    if (ultM >= 0 && med[ultM] > 0) { var r = acum[sel][ultM] / med[ultM];
      cc = sel + (r < 0.9 ? t(" va por debajo de un año normal: ", " is below a normal year: ") : r > 1.1 ? t(" va por encima de un año normal: ", " is above a normal year: ") : t(" va igual que un año normal.", " is in line with a normal year.")) + (r < 0.9 || r > 1.1 ? enPalabras(r) + t(" fuego.", " fire.") : "");
      if (ultM === 11) cc = cc.replace(t(" va ", " is "), t(" fue ", " was ")); }
    return (cc ? conclusion(cc) : "") + g.join("");
  }

  // ---------- Alerts ----------
  function tabAlertas() {
    var al = anomaliasSel(), filtro = estado.filtroAl || "";
    var L = al.filter(function (a) { return !filtro || a.tipo === filtro; });
    var cuenta = {}; al.forEach(function (a) { cuenta[a.tipo] = (cuenta[a.tipo] || 0) + 1; });
    var h = '<div class="tarjeta"><h3>' + t("Lo fuera de lo normal", "What was unusual") + "</h3>" +
      conclusion(al.length ? enDonde() + t(" hubo ", " there were ") + al.length + (al.length === 1 ? t(" cosa fuera de lo normal", " unusual thing") : t(" cosas fuera de lo normal", " unusual things")) + t(" en los últimos 3 años.", " in the last 3 years.") : enDonde() + t(" no pasó nada fuera de lo normal en los últimos 3 años.", " nothing unusual happened in the last 3 years.")) +
      comoLeer(t("La herramienta aprende qué es normal en cada lugar y cada mes, y avisa cuando algo no cuadra. No dice la causa. Toca una para verla en el mapa.", "The tool learns what is normal for each place and month, and points out what does not fit. It does not say the cause. Tap one to see it on the map.")) +
      '<div class="fila" style="margin-bottom:10px"><button class="boton' + (!filtro ? " prim" : "") + '" data-f="">' + t("Todas", "All") + " (" + al.length + ")</button>" + Object.keys(ETQ).map(function (k) { return '<button class="boton' + (filtro === k ? " prim" : "") + '" data-f="' + k + '">' + ETQ[k] + " (" + (cuenta[k] || 0) + ")</button>"; }).join("") + "</div>" +
      (L.length ? L.slice(0, 60).map(function (a, n) {
        return '<div class="item" style="--i:' + Math.min(n, 12) + '" data-c="' + a.celda + '" data-mes="' + a.mes + '" data-lat="' + a.lat + '" data-lon="' + a.lon + '"><div class="t"><span class="etq">' + ETQ[a.tipo] + "</span>" + (verificada(a) ? '<span class="etq v">' + I("check", 11) + t("comprobada con fotos", "checked with photos") + "</span>" : "") + mesAnio(+a.mes.slice(5), a.mes.slice(0, 4)) + "</div><div>" + esc(llano(EN ? (a.text || a.texto) : a.texto)) + "</div></div>";
      }).join("") : '<p class="lead">' + t("Nada fuera de lo normal en esta zona.", "Nothing unusual in this area.") + "</p>") + "</div>";
    $("tab-alertas").innerHTML = h;
    $("tab-alertas").onclick = function (ev) {
      var f = ev.target.getAttribute && ev.target.getAttribute("data-f"); if (f !== null && f !== undefined && ev.target.classList.contains("boton")) { estado.filtroAl = f; tabAlertas(); return; }
      var d = ev.target.closest ? ev.target.closest(".item") : null; if (!d) return;
      var lat = +d.getAttribute("data-lat"), lon = +d.getAttribute("data-lon"), c = +d.getAttribute("data-c");
      if (MAPA) { MAPA.irA(lat, lon, 9); MAPA.marcar(lat, lon); }
      var k = Q.meses.indexOf(d.getAttribute("data-mes"));
      if (k >= 0) { estado.mapa = { tipo: "mes", k: k }; pintarMapa(); }
    };
  }
  function verificada(a) { var E = Q.evidencia; if (!E) return false; var b = E.bbox, m0 = E.fechas_fuego[0].slice(0, 7), m1 = E.fechas_fuego[1].slice(0, 7);
    return a.lon >= b[0] - G / 2 && a.lon <= b[2] + G / 2 && a.lat >= b[1] - G / 2 && a.lat <= b[3] + G / 2 && a.mes >= m0 && a.mes <= m1; }

  // ---------- Rules (official calendar) & fire type ----------
  var EX = null;
  window.EXTRA_LISTO = function (clave, d) { EX = d; if (estado.tab === "reglas" || estado.tab === "tipo") tabReglas(); };
  (function () { var sc = document.createElement("script"); sc.src = "data/extra/" + M.clave + ".js"; document.head.appendChild(sc); })();
  function fechaCorta(mmdd) { var m = +mmdd.slice(0, 2), d = +mmdd.slice(3, 5); return EN ? NOML[m - 1] + " " + d : d + " de " + NOML[m - 1]; }
  function tabReglas() {
    if (!EX) { $("tab-reglas").innerHTML = $("tab-tipo").innerHTML = '<div class="tarjeta"><p class="lead">' + t("Cargando…", "Loading…") + "</p></div>"; return; }
    var h = "", hT = "", O = EX.oficial;
    if (O) {
      var permitido = O.tipo === "permitido", P = O.por_anio, ys = Object.keys(P).map(Number).filter(function (a) { return a >= 2001; }).sort(function (a, b) { return a - b; });
      function noPerm(a) { var v = P[a]; return permitido ? v.total - v.dentro : v.dentro; }
      var ua = ys[ys.length - 1], vua = noPerm(ua) / P[ua].total, lugar = 1 + ys.filter(function (a) { return a !== ua && noPerm(a) / P[a].total > vua; }).length;
      var W = 400, H = 170, L = 34, B = 22, Tp = 10, mx = 0; ys.forEach(function (a) { mx = Math.max(mx, noPerm(a) / P[a].total); }); mx = Math.max(0.1, Math.ceil(mx * 10) / 10);
      var bw = (W - L - 4) / ys.length; function Y(v) { return H - B - (H - B - Tp) * v / mx; }
      var g = ['<svg viewBox="0 0 ' + W + " " + H + '" class="ch" style="width:100%;height:auto" id="barReglas">'];
      for (var e = 0; e <= 2; e++) { var yy = Y(mx * e / 2); g.push('<line x1="' + L + '" x2="' + (W - 4) + '" y1="' + yy + '" y2="' + yy + '" class="ch-grid"/><text x="' + (L - 4) + '" y="' + (yy + 3) + '" font-size="9" text-anchor="end" fill="#6b7486">' + Math.round(mx * e / 2 * 100) + "%</text>"); }
      ys.forEach(function (a, i) { var v = noPerm(a) / P[a].total; g.push('<rect class="ch-bar" style="--i:' + i + '" x="' + (L + i * bw + 1) + '" y="' + Y(v) + '" width="' + Math.max(1, bw - 2) + '" height="' + (H - B - Y(v)) + '" rx="2" fill="' + (a === ua ? "#FF6B2C" : "#3a4766") + '" data-tip="' + esc("<b>" + a + "</b><br>" + Math.round(v * 100) + t(" de cada 100 fuegos cuando no se permite quemar", " out of every 100 fires when burning is not allowed")) + '"/>');
        if (a % 5 === 0) g.push('<text x="' + (L + i * bw + bw / 2) + '" y="' + (H - 7) + '" font-size="9" text-anchor="middle" fill="#6b7486">' + a + "</text>"); });
      g.push("</svg>");
      var de100 = Math.round(vua * 100);
      h += '<div class="tarjeta"><h3>' + t("¿Se respeta el calendario oficial de quemas?", "Is the official burning calendar followed?") + "</h3>" +
        conclusion(lugar === 1 ? t("En ", "In ") + ua + t(" se quemó fuera de lo permitido más que nunca: ", " there was more burning outside the allowed dates than ever: ") + de100 + t(" de cada 100 fuegos.", " out of every 100 fires.")
          : t("En ", "In ") + ua + ", " + de100 + t(" de cada 100 fuegos fueron cuando la ley no permite quemar.", " out of every 100 fires happened when the law does not allow burning.")) +
        '<p class="lead">' + (permitido ? t("En ", "In ") + "<b>" + esc(EN ? O.zona_en : O.zona) + "</b>" + t(" la ley permite quemar del ", " the law allows burning from ") + fechaCorta(O.inicio) + t(" al ", " to ") + fechaCorta(O.fin) + "."
          : t("En ", "In ") + "<b>" + esc(EN ? O.zona_en : O.zona) + "</b>" + t(" está prohibido quemar del ", " burning is banned from ") + fechaCorta(O.inicio) + t(" al ", " to ") + fechaCorta(O.fin) + ".") + "</p>" +
        '<div class="grandes">' + Math.round(vua * 1000) / 10 + "%</div><p class=\"lead\" style=\"margin-top:4px\">" + t("del fuego de ", "of the fire in ") + ua + t(" fue cuando no se permite quemar", " happened when burning is not allowed") +
        (lugar === 1 ? " — <b>" + t("lo más alto en ", "the highest in ") + ys.length + t(" años", " years") + "</b>." : ".") + "</p>" + g.join("") +
        comoLeer(t("Cada barra es un año: qué parte del fuego fue en fechas en que la ley no permite quemar. La naranja es el último año.", "Each bar is a year: how much of the fire happened on dates when the law does not allow burning. The orange one is the latest year.")) +
        '<button class="boton" id="verZona" style="margin-top:8px">' + t("Ver la zona en el mapa", "Show the zone on the map") + "</button>" +
        "<details><summary>" + t("Fuente y límites", "Source and limits") + "</summary><p>" + esc(O.fuente) + " " + esc(EN ? O.nota_en : O.nota) + "</p></details></div>";
    }
    var E = EX.eventos;
    if (E) {
      var en = {}; celdasSel().forEach(function (c) { en[c] = 1; }); var tot = [0, 0, 0], A = E.celda_mes;
      for (var i = 0; i < A.length; i += 5) if (en[A[i]]) for (var c = 0; c < 3; c++) tot[c] += A[i + 2 + c];
      var suma = tot[0] + tot[1] + tot[2], grandes = E.grandes.filter(function (x) { return en[x[5]]; });
      var CL = [["#6ece58", t("Quemas pequeñas de un día", "Small one-day burns"), t("como las del campo o las controladas", "like farm or controlled burns")], ["#31688e", t("Medianas", "Medium"), ""], ["#7b4fc4", t("Incendios grandes o largos", "Big or long fires"), t("como los incendios de monte", "like wildfires")]];
      var ang = 0, R = 52, cx = 60, cy = 60, arcs = "";
      tot.forEach(function (v, k) { if (!suma || !v) return; var a0 = ang, a1 = ang + v / suma * Math.PI * 2; ang = a1; var large = a1 - a0 > Math.PI ? 1 : 0;
        var p = (a1 - a0 >= Math.PI * 2 - 1e-6) ? '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="' + CL[k][0] + '"/>' : '<path d="M' + cx + " " + cy + "L" + (cx + R * Math.sin(a0)) + " " + (cy - R * Math.cos(a0)) + "A" + R + " " + R + " 0 " + large + " 1 " + (cx + R * Math.sin(a1)) + " " + (cy - R * Math.cos(a1)) + 'Z" fill="' + CL[k][0] + '"/>';
        arcs += p.replace("/>", ' class="ch-slice" style="animation-delay:' + k * 120 + 'ms" data-tip="' + esc("<b>" + CL[k][1] + "</b><br>" + Math.round(v / suma * 100) + "%") + '"/>'); });
      var kmx = tot.indexOf(Math.max.apply(null, tot));
      hT += '<div class="tarjeta"><h3>' + t("¿Quema del campo o incendio?", "Farm burn or wildfire?") + "</h3>" +
        (suma ? conclusion(enDonde() + t(", la mayor parte del fuego (", ", most of the fire (") + Math.round(tot[kmx] / suma * 100) + t(" de cada 100) son ", " out of every 100) is ") + CL[kmx][1].toLowerCase() + ".") : "") + (suma ? '<div class="fila" style="align-items:center;flex-wrap:nowrap"><svg viewBox="0 0 120 120" width="128" height="128" id="dona" class="ch" style="flex:none">' + arcs + '<circle cx="60" cy="60" r="30" fill="#0E1424"/></svg><div>' +
        CL.map(function (q, k) { return '<div class="leyenda-dona"><i style="background:' + q[0] + '"></i><b>' + Math.round(tot[k] / suma * 100) + "%</b> " + q[1] + (q[2] ? "<small>" + q[2] + "</small>" : "") + "</div>"; }).join("") + "</div></div>"
        : '<p class="lead">' + t("Los satélites no vieron fuego en esta zona.", "Satellites saw no fire in this area.") + "</p>") +
        (grandes.length ? '<p class="lead" style="margin-top:8px"><b>' + grandes.length.toLocaleString(LOC) + "</b>" + t(" incendios grandes o largos desde 2018. Los más grandes (toca uno para verlo):", " big or long fires since 2018. The biggest (tap one to see it):") + "</p>" +
          grandes.slice(0, 8).map(function (x) { return '<div class="item" data-lat="' + x[3] + '" data-lon="' + x[4] + '" style="border-left-color:#6b3fa0"><span class="t">' + x[0] + (x[1] !== x[0] ? " → " + x[1] : "") + "</span> · " + x[2].toLocaleString(LOC) + t(" fuegos vistos", " fires seen") + "</div>"; }).join("") : "") +
        comoLeer(t("Juntamos los fuegos que el satélite vio a menos de 1 km y con no más de 1 día de diferencia: eso es un solo evento. Pequeño: hasta 3 en un solo día. Grande o largo: 30 o más, o que dura 4 días o más. Es una estimación: el satélite no ve la causa. En Portugal, donde quemar está prohibido en verano, 98 de cada 100 incendios grandes caen en ese periodo y la mayoría de las quemas pequeñas, fuera.",
          "We group the fires the satellite saw less than 1 km and at most 1 day apart: that is one event. Small: up to 3 in a single day. Big or long: 30 or more, or lasting 4 days or more. It is an estimate: the satellite cannot see the cause. In Portugal, where burning is banned in summer, 98 out of every 100 big fires fall in that period and most small burns fall outside it.")) + "</div>";
    }
    $("tab-reglas").innerHTML = h || '<div class="tarjeta"><p class="lead">' + t("Esta región no tiene un calendario oficial de quemas.", "This region has no official burning calendar.") + "</p></div>";
    $("tab-tipo").innerHTML = hT || '<div class="tarjeta"><p class="lead">' + t("Sin datos del tipo de fuego para esta región.", "No fire-type data for this region.") + "</p></div>";
    if ($("barReglas")) conTip($("barReglas")); if ($("dona")) conTip($("dona"));
    var vz = $("verZona"); if (vz) vz.addEventListener("click", function () { if (MAPA) { MAPA.zona(O.anillos); MAPA.encuadrar(cajaAnillos(O.anillos)); } });
    $("tab-tipo").onclick = function (ev) { var d = ev.target.closest ? ev.target.closest(".item[data-lat]") : null; if (!d || !MAPA) return; var lat = +d.getAttribute("data-lat"), lon = +d.getAttribute("data-lon"); MAPA.irA(lat, lon, 10); MAPA.marcar(lat, lon); };
  }

  // ---------- Weekly risk ----------
  function tabRiesgo() {
    var R = Q.riesgo;
    if (!R) { $("tab-riesgo").innerHTML = '<div class="tarjeta"><p class="lead">' + t("Esta región todavía no tiene datos de clima para el riesgo semanal.", "This region does not have climate data for the weekly risk yet.") + "</p></div>"; return; }
    var mejor = 0, mv = -1; R.fuego.forEach(function (f, w) { var s = 0; f.forEach(function (v) { s += v; }); if (s > mv) { mv = s; mejor = w; } });
    var w = estado.semRiesgo !== undefined ? estado.semRiesgo : mejor, m = R.metricas;
    $("tab-riesgo").innerHTML = '<div class="tarjeta"><h3>' + t("¿Dónde poner atención la próxima semana?", "Where to watch next week?") + "</h3>" +
      conclusion(t("En el mapa, los cuadros de color más fuerte son donde es más probable que haya fuego.", "On the map, the squares with the strongest colour are where fire is most likely.")) +
      comoLeer(t("Para cada zona y cada semana calculamos qué tan probable era el fuego, solo con lo que se sabía la semana anterior. Mueve la barra para cambiar de semana y compara con el fuego que de verdad hubo.", "For each area and each week we worked out how likely fire was, using only what was known the week before. Move the slider to change the week and compare with the fire that really happened.")) +
      '<input type="range" id="semR" min="0" max="' + (R.semanas.length - 1) + '" value="' + w + '" style="width:100%"><div class="fila" style="justify-content:space-between"><b id="semRtxt"></b><button class="link" id="semMax">' + t("Ir a la semana con más fuego", "Go to the week with the most fire") + "</button></div>" +
      '<div class="fila" style="margin-top:8px"><button class="boton prim" id="vRiesgo">' + t("Posibilidad de fuego", "Chance of fire") + '</button><button class="boton" id="vFuego">' + t("Fuego que hubo", "Fire that happened") + '</button></div><p class="lead" id="semRnota" style="margin-top:8px"></p>' +
      '<div class="stats"><div class="stat"><div class="n">' + Math.round(m.fuego_reciente.captura_top10) + '</div><div class="l">' + t("de cada 100 fuegos cayeron en las zonas que marcamos como más riesgosas (probado con 2023 a 2025)", "out of every 100 fires fell in the areas we marked as riskiest (tested on 2023 to 2025)") + "</div></div></div>" +
      "<details><summary>" + t("Lo que aprendimos (también lo que no funcionó)", "What we learned (including what did not work)") + "</summary><ul><li>" + t("Solo con el calendario de cada lugar ya se acierta bastante: ", "The calendar of each place alone already gets a lot right: ") + Math.round(m.calendario.captura_top10) + t(" de cada 100.", " out of every 100.") + "</li><li>" + t("Cuando la tierra está seca en primavera, la temporada de fuego suele ser más fuerte.", "When the soil is dry in spring, the fire season tends to be stronger.") + "</li><li>" + t("El clima semanal a 55 km no mejora el pronóstico local.", "Weekly weather at 55 km does not improve the local forecast.") + "</li><li>" + t("Una ola de calor sola no anticipa el fuego: ", "A heat wave alone does not anticipate fire: ") + R.bolsas.pct_fuego_con_bolsa + "% vs " + R.bolsas.pct_fuego_sin_bolsa + "%.</li><li>" + t("Casi todos los fuegos los inicia una persona; la sequedad decide cuánto crecen.", "Almost all fires are started by people; dryness decides how much they grow.") + "</li></ul></details></div>";
    var vista = estado.vistaR || "riesgo";
    function poner() { var ww = +$("semR").value; estado.semRiesgo = ww; var d = new Date(R.semanas[ww] + "T12:00:00");
      $("semRtxt").textContent = EN ? "Week of " + NOML[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear() : "Semana del " + d.getDate() + " de " + NOML[d.getMonth()] + " de " + d.getFullYear();
      var f = R.fuego[ww], tot = 0; f.forEach(function (v) { tot += v; });
      var orden = []; for (var c = 0; c < NC; c++) if (Q.tierra[c]) orden.push(c); orden.sort(function (a, b) { return R.riesgo[ww][b] - R.riesgo[ww][a]; });
      var n = Math.max(1, Math.round(orden.length * 0.2)), dentro = 0; for (var k = 0; k < n; k++) dentro += f[orden[k]];
      $("semRnota").textContent = tot > 0 ? t("Esa semana se vieron ", "That week ") + aprox(tot) + t(" fuegos; ", " fires were seen; ") + Math.round(dentro / tot * 100) + t(" de cada 100 cayeron en las zonas marcadas como más riesgosas.", " out of every 100 fell in the areas marked as riskiest.") : t("Esa semana no se vio fuego.", "No fire was seen that week.");
      if (vista === "riesgo") estado.mapa = { tipo: "riesgo", valores: R.riesgo[ww].slice() }; else estado.mapa = { tipo: "semana", valores: f.slice() };
      $("vRiesgo").className = "boton" + (vista === "riesgo" ? " prim" : ""); $("vFuego").className = "boton" + (vista !== "riesgo" ? " prim" : "");
      pararReplay(); pintarMapa(); pista($("semR")); }
    $("semR").addEventListener("input", poner);
    $("semMax").addEventListener("click", function () { $("semR").value = mejor; poner(); });
    $("vRiesgo").addEventListener("click", function () { vista = estado.vistaR = "riesgo"; poner(); });
    $("vFuego").addEventListener("click", function () { vista = estado.vistaR = "fuego"; poner(); });
    poner();
  }

  // ---------- NAL: forecast for the coming years ----------
  // The engine lives in js/nal.js. Every score shown here is computed live from the data file (walk-forward test).
  var NALM = null;
  function nal() { if (NALM === null) NALM = window.NAL ? window.NAL.crear(Q) : false; return NALM; }
  function listaMeses(ms) { var n = ms.map(function (m) { return NOML[m]; }); return n.length < 2 ? n.join("") : n.slice(0, -1).join(", ") + t(" y ", " and ") + n[n.length - 1]; }
  function tabNal() {
    var N = nal(), el = $("tab-nal");
    if (!N || N.anios.length <= N.minEntreno) { el.innerHTML = '<div class="tarjeta"><p class="lead">' + t("Esta región todavía no tiene suficientes años de datos para predecir.", "This region does not have enough years of data to forecast yet.") + "</p></div>"; return; }
    var Y0 = ANIO[T - 1] + 1, a1 = estado.nalDe || Y0, a2 = Math.max(a1, estado.nalA || a1), nA = a2 - a1 + 1, per = nA === 1 ? "" + a1 : a1 + "–" + a2;
    var cs = celdasSel(), p = N.predecir(cs), h = Math.max(1, a2 - N.ultimo), v = N.validar(h);
    while (v.n < 5 && h > 1) v = N.validar(--h);
    var mS = estado.nalMes === undefined ? null : estado.nalMes;
    var ord = p.mes.map(function (x, m) { return [x, m]; }).sort(function (a, b) { return b[0] - a[0]; });
    var top = ord.slice(0, 3).map(function (x) { return x[1]; }).sort(function (a, b) { return a - b; }), pico = ord[0][1];
    function opciones(sel, min) { var o = ""; for (var y = Math.max(Y0, min); y <= Y0 + 4; y++) o += '<option value="' + y + '"' + (y === sel ? " selected" : "") + ">" + y + "</option>"; return o; }
    var W = 400, H = 210, L = 44, B = 24, Tp = 12, bw = (W - L - 6) / 12, mx = 1, i;
    for (i = 0; i < 12; i++) mx = Math.max(mx, p.alto[i], p.mes[i]);
    function Y(x) { return H - B - (H - B - Tp) * x / mx; }
    var g = ['<svg viewBox="0 0 ' + W + " " + H + '" class="ch" style="width:100%;height:auto" id="barNal">'];
    for (var e = 0; e <= 4; e++) { var yy = Y(mx * e / 4); g.push('<line x1="' + L + '" x2="' + (W - 4) + '" y1="' + yy + '" y2="' + yy + '" class="ch-grid"/><text x="' + (L - 4) + '" y="' + (yy + 3) + '" font-size="9" text-anchor="end" fill="#6b7486">' + fmt(mx * e / 4) + "</text>"); }
    for (i = 0; i < 12; i++) {
      var cx = L + i * bw + bw / 2, esTop = top.indexOf(i) >= 0 && p.total >= 1;
      g.push('<rect class="ch-bar" style="--i:' + i + '" data-m="' + i + '" x="' + (L + i * bw + 2) + '" y="' + Y(p.mes[i]) + '" width="' + Math.max(1, bw - 4) + '" height="' + (H - B - Y(p.mes[i])) + '" rx="2" fill="' + (esTop ? "#FF6B2C" : "#31688e") + '"' + (mS === i ? ' stroke="#F4F1EA" stroke-width="1.5"' : "") + ' data-tip="' +
        esc("<b>" + NOML[i] + "</b><br>" + t("NAL espera ", "NAL expects ") + fmt(p.mes[i]) + t(" fuegos", " fires") + "<br>" + t("En años pasados: entre ", "In past years: between ") + fmt(p.bajo[i]) + t(" y ", " and ") + fmt(p.alto[i])) + '"/>');
      g.push('<path d="M' + cx + " " + Y(p.alto[i]) + "V" + Y(p.bajo[i]) + "M" + (cx - 3) + " " + Y(p.alto[i]) + "h6M" + (cx - 3) + " " + Y(p.bajo[i]) + 'h6" stroke="#F4F1EA" stroke-width="1" opacity=".75" fill="none" pointer-events="none"/>');
      g.push('<text x="' + cx + '" y="' + (H - 9) + '" font-size="9" text-anchor="middle" fill="#6b7486">' + NOM[i] + "</text>");
    }
    g.push("</svg>");
    var pct = Math.round(v.top3 * 100), mejor = v.errMediano < v.errPersistencia;
    var frase = p.total < 1 ? enDonde() + t(", NAL casi no espera fuego: el satélite casi no ha visto fuego aquí.", ", NAL expects almost no fire: the satellite has seen almost no fire here.")
      : enDonde() + t(", NAL espera que en ", ", NAL expects that in ") + per + t(" el fuego llegue sobre todo en ", " fire will come mostly in ") + listaMeses(top) + t(", con lo más fuerte en ", ", peaking in ") + NOML[pico] + ".";
    var hh = '<div class="tarjeta"><h3>' + t("¿Cuándo y dónde viene el fuego? Lo dice NAL", "When and where is fire coming? Ask NAL") + "</h3>" +
      '<div class="fila nal-anios"><label>' + t("Del año ", "From ") + '<select id="nalDe">' + opciones(a1, Y0) + "</select></label><label>" + t("al año ", "to ") + '<select id="nalA">' + opciones(a2, a1) + "</select></label></div>" +
      conclusion(frase) +
      '<div class="nal-acierto"><div class="grandes">' + pct + '%</div><div class="l"><b>' + t("Acierto de NAL.", "NAL hit rate.") + "</b> " + t("De cada 100 fuegos, ", "Out of every 100 fires, ") + pct + t(" cayeron en los 3 meses que NAL señaló. Probado con ", " fell in the 3 months NAL pointed to. Tested on ") + v.n + t(" años que NAL no había visto.", " years NAL had not seen.") + "</div></div>" +
      g.join("") +
      '<p class="lead nal-mapa">' + (mS === null ? t("El mapa muestra dónde espera NAL el fuego en un año. ", "The map shows where NAL expects fire in a year. ") + (TACTIL ? t("Toca", "Tap") : t("Haz clic en", "Click")) + t(" un mes de la gráfica para ver solo ese mes.", " a month in the chart to see only that month.")
        : t("El mapa muestra solo ", "The map shows only ") + NOML[mS] + '. <button class="link" id="nalTodo">' + t("Ver todo el año", "See the whole year") + "</button>") + "</p>" +
      comoLeer(t("Cada barra es un mes: mientras más alta, más fuego espera NAL. Las 3 naranjas son los meses de más fuego. La rayita blanca marca entre cuánto y cuánto fuego hubo ese mes en años pasados.", "Each bar is a month: the taller, the more fire NAL expects. The 3 orange ones are the months with the most fire. The white line marks the range of fire seen that month in past years.")) +
      '<div class="stats"><div class="stat"><div class="n">' + aproxT(p.total) + '</div><div class="l">' + t("fuegos espera NAL aquí en un año. En años pasados hubo entre ", "fires NAL expects here in a year. Past years had between ") + aprox(p.totalBajo) + t(" y ", " and ") + aprox(p.totalAlto) + "." + (nA > 1 ? t(" En los ", " Over the ") + nA + t(" años: ", " years: ") + aprox(p.total * nA) + "." : "") + "</div></div>" +
      '<div class="stat"><div class="n">' + Math.round(v.donde20 * 100) + '</div><div class="l">' + t("de cada 100 fuegos cayeron en la quinta parte de las zonas que NAL marcó con el color más fuerte", "out of every 100 fires fell in the fifth of the areas NAL marked with the strongest colour") + "</div></div></div>" +
      "<details><summary>" + t("Cómo funciona NAL y qué no puede decir", "How NAL works and what it cannot say") + "</summary><ul>" +
      "<li>" + t("NAL aprende de ", "NAL learns from ") + N.anios.length + t(" años de datos ya corregidos (", " years of corrected data (") + N.anios[0] + t(" a ", " to ") + N.ultimo + t("). Para cada zona de 27 km y cada mes mira cuánto fuego hubo. Los años recientes pesan más.", "). For each 27 km area and each month it looks at how much fire there was. Recent years weigh more.") + "</li>" +
      "<li>" + t("Para probarlo le escondimos un año, le pedimos predecirlo solo con los años anteriores y comparamos con lo que pasó. Así con ", "To test it we hid a year, asked NAL to forecast it using only the years before, and compared with what happened. We did this for ") + v.n + t(" años en toda la región", " years across the whole region") + (h > 1 ? t(", prediciendo con ", ", forecasting ") + h + t(" años de anticipación.", " years ahead.") : ".") + "</li>" +
      "<li>" + (mejor ? t("En la cantidad de fuego del año se equivoca cerca de ", "On the amount of fire in a year it is off by about ") + Math.round(v.errMediano * 100) + t("%. Decir «será igual que el año pasado» se equivoca ", "%. Saying \"it will be like last year\" is off by ") + Math.round(v.errPersistencia * 100) + "%."
        : t("En la cantidad de fuego del año, aquí NAL todavía no es mejor que decir «será igual que el año pasado» (", "On the amount of fire in a year, here NAL is not yet better than saying \"it will be like last year\" (") + Math.round(v.errMediano * 100) + t("% contra ", "% versus ") + Math.round(v.errPersistencia * 100) + t("%). Aquí sirve para el cuándo y el dónde, no para el cuánto.", "%). Here it is useful for when and where, not for how much.")) + "</li>" +
      "<li>" + t("En ", "In ") + Math.round(v.dentroRango * 100) + t(" de cada 100 años probados, el fuego real quedó dentro del rango que NAL dio.", " out of every 100 tested years, the real fire fell inside the range NAL gave.") + "</li>" +
      "<li>" + t("NAL no puede decir el fuego exacto de un año: la mayoría de los fuegos los enciende la gente y el clima de ese año también cuenta. Todavía no usa el pronóstico del clima, así que espera lo mismo para cada año que elijas.", "NAL cannot tell the exact fire of a year: people start most fires and that year's weather matters too. It does not use the weather forecast yet, so it expects the same for every year you pick.") + "</li></ul></details></div>";
    el.innerHTML = hh; conTip($("barNal"));
    $("nalDe").addEventListener("change", function () { estado.nalDe = +this.value; if ((estado.nalA || 0) < estado.nalDe) estado.nalA = estado.nalDe; tabNal(); });
    $("nalA").addEventListener("change", function () { estado.nalA = +this.value; tabNal(); });
    $("barNal").addEventListener("click", function (ev) { var b = ev.target.closest ? ev.target.closest("[data-m]") : null; if (!b) return; var m = +b.getAttribute("data-m"); estado.nalMes = estado.nalMes === m ? undefined : m; tabNal(); });
    var bt = $("nalTodo"); if (bt) bt.addEventListener("click", function () { estado.nalMes = undefined; tabNal(); });
    estado.mapa = { tipo: "nal", valores: N.mapa(undefined, mS), mes: mS, per: per }; pararReplay(); pintarMapa();
  }

  // ---------- Protected areas ----------
  function tabAreas() {
    var AP = Q.areas;
    if (!AP || !AP.areas.length) { $("tab-areas").innerHTML = '<div class="tarjeta"><p class="lead">' + t("Sin áreas protegidas en esta región.", "No protected areas in this region.") + "</p></div>"; return; }
    var L = AP.areas.slice().sort(function (a, b) { return (b.ultimo - b.mediana_anual) - (a.ultimo - a.mediana_anual); });
    var pc = AP.pct_dentro, ys = Object.keys(pc).map(Number).sort(), uy = ys[ys.length - 1];
    $("tab-areas").innerHTML = '<div class="tarjeta"><h3>' + t("Fuego en reservas naturales", "Fire in nature reserves") + "</h3>" +
      conclusion(t("En ", "In ") + uy + ", " + Math.round(pc[uy]) + t(" de cada 100 fuegos de la región fueron dentro de una reserva natural.", " out of every 100 fires in the region were inside a nature reserve.")) +
      comoLeer(t("Están ordenadas de la que más se salió de lo normal a la que menos, según su último año. Rojo: mucho más fuego de lo normal; amarillo: más de lo normal; azul: normal. Toca una para verla.", "They are sorted from the one that departed most from normal to the least, by their latest year. Red: far more fire than normal; yellow: more than normal; blue: normal. Tap one to see it.")) +
      L.map(function (a) { var v = a.veces; return '<div class="item" data-a="' + a.id + '" style="border-left-color:' + (v !== null && v >= 2 ? "var(--bad)" : v !== null && v >= 1.25 ? "var(--warn)" : "var(--info)") + '"><div class="t">' + esc(nombreA(a)) + "</div><div title=\"" + esc(fmt(a.ultimo) + t(" · lugar ", " · rank ") + a.lugar + "/" + a.anios) + "\">" + a.ultimo_anio + ": " + aprox(a.ultimo) + t(" fuegos vistos", " fires seen") + (v !== null ? " · <b>" + (v >= 1.75 ? fmt(v) + t(" veces lo normal", " times normal") : enPalabras(v) + t(" que lo normal", " than normal")) + "</b>" : "") + "</div></div>"; }).join("") + "</div>";
    if (MAPA) MAPA.areas(AP.areas, estado.sel.tipo === "area" ? estado.sel.area.id : null);
    $("tab-areas").onclick = function (ev) { var d = ev.target.closest ? ev.target.closest(".item[data-a]") : null; if (!d) return; var id = +d.getAttribute("data-a"); var a = AP.areas.filter(function (x) { return x.id === id; })[0]; if (a) { seleccionarArea(a); document.querySelector(".panel").scrollTo({ top: 0, behavior: "smooth" }); } };
  }

  // ---------- Verified from space ----------
  function tabPrueba() {
    var E = Q.evidencia;
    if (!E) { $("tab-prueba").innerHTML = '<div class="tarjeta"><p class="lead">' + t("La comprobación con fotos de satélite está hecha para la Península de Yucatán (junio de 2024).", "The check with satellite photos was done for the Yucatán Peninsula (June 2024).") + ' <a href="?region=yucatan&lang=' + (EN ? "en" : "es") + '">' + t("Ver en Yucatán", "See it in Yucatán") + "</a></p></div>"; return; }
    var P = E.prueba, im = E.imagenes, b = E.bbox, Wv = 1000, Hv = Math.round(Wv * (b[3] - b[1]) / (b[2] - b[0]));
    function ex(l) { return (l - b[0]) / (b[2] - b[0]) * Wv; } function ey(l) { return (b[3] - l) / (b[3] - b[1]) * Hv; }
    var pts = '<svg viewBox="0 0 ' + Wv + " " + Hv + '" preserveAspectRatio="none" style="pointer-events:none" id="ptsEv">' + E.puntos.map(function (q) { return '<circle cx="' + ex(q[0]).toFixed(1) + '" cy="' + ey(q[1]).toFixed(1) + '" r="4" fill="#ff5a1f" stroke="#fff" stroke-width="1"/>'; }).join("") + "</svg>";
    $("tab-prueba").innerHTML = '<div class="tarjeta"><h3>' + t("Junio de 2024: lo comprobamos con fotos de satélite", "June 2024: we checked it with satellite photos") + "</h3>" +
      conclusion(t("Las fotos lo confirman: ", "The photos confirm it: ") + Math.round(P.pixel_exacto.evento) + t(" de cada 100 fuegos vistos cayeron sobre monte que se perdió, contra ", " out of every 100 fires seen fell on vegetation that was lost, against ") + Math.round(P.pixel_exacto.azar) + t(" si fuera al azar.", " if it were random.")) +
      '<p class="lead">' + t("La herramienta avisó de fuego en un mes que suele estar tranquilo, en el norte de Quintana Roo, junto a Yum Balam. ¿Era real? Desliza la barra para comparar la foto de antes y la de después.", "The tool warned of fire in a month that is usually quiet, in northern Quintana Roo, next to Yum Balam. Was it real? Slide the bar to compare the photo from before and the one from after.") + "</p>" +
      '<div class="compara" id="cmp" style="aspect-ratio:' + (Wv / Hv).toFixed(3) + '"><img src="' + im[1].src + '" alt="' + esc(EN ? im[1].en : im[1].es) + '"><img class="antes" id="cmpAntes" src="' + im[0].src + '" alt="' + esc(EN ? im[0].en : im[0].es) + '">' + pts +
      '<span class="eti" style="left:8px">' + t("Antes · ", "Before · ") + im[0].fecha + '</span><span class="eti" style="right:8px">' + t("Después · ", "After · ") + im[1].fecha + '</span><div class="barra" id="cmpBarra"></div><div class="asa" id="cmpAsa">' + I("swap", 20) + '</div><input type="range" id="cmpR" min="0" max="100" value="50" aria-label="Before/after"></div>' +
      '<div class="fila" style="margin-top:8px"><label class="toggle"><input type="checkbox" id="chkPts" checked> ' + t("Mostrar los fuegos vistos", "Show the fires seen") + '</label><button class="boton" id="evMapa">' + t("Ver sobre el mapa", "Show on the map") + "</button></div>" +
      '<div class="stats" style="margin-top:10px"><div class="stat"><div class="n">' + P.pixel_exacto.evento + '%</div><div class="l">' + t("de los fuegos vistos cayeron sobre monte que se perdió", "of the fires seen fell on vegetation that was lost") + '</div></div><div class="stat"><div class="n">' + P.pixel_exacto.azar + '%</div><div class="l">' + t("si los puntos cayeran al azar en la misma zona", "if the points fell at random in the same area") + '</div></div><div class="stat"><div class="n">' + E.n_detecciones + '</div><div class="l">' + t("fuegos vistos en ese incendio", "fires seen in that blaze") + '</div></div><div class="stat"><div class="n">' + E.dentro_area + '</div><div class="l">' + t("dentro de la reserva Yum Balam", "inside the Yum Balam reserve") + "</div></div></div>" +
      "<details><summary>" + t("Ver también dónde se perdió el monte", "Also see where vegetation was lost") + '</summary><img src="' + im[2].src + '" alt="' + esc(EN ? im[2].en : im[2].es) + '" style="width:100%;border-radius:10px;margin-top:8px"><p>' + esc(EN ? im[2].layer : im[2].capa) + "</p></details>" +
      "<details><summary>" + t("¿De dónde salen las fotos?", "Where do the photos come from?") + "</summary><p>" + esc(EN ? E.source : E.fuente) + "</p></details></div>";
    function ponerCmp(v) { $("cmpAntes").style.clipPath = "inset(0 " + (100 - v) + "% 0 0)"; $("cmpBarra").style.left = v + "%"; $("cmpAsa").style.left = v + "%"; }
    $("cmpR").addEventListener("input", function () { $("cmp").classList.remove("demo"); ponerCmp(this.value); });
    // One short automatic demonstration the first time the tab opens, so people see it is a slider.
    if (!estado.demoHecha && !QUIETO) {
      estado.demoHecha = true; var cmp = $("cmp"), pasos = [78, 24, 50], n = 0;
      cmp.classList.add("demo");
      setTimeout(function sig() { if (n >= pasos.length || !cmp.classList.contains("demo") || !document.body.contains(cmp)) { cmp.classList.remove("demo"); return; }
        var v = pasos[n++]; $("cmpR").value = v; ponerCmp(v); setTimeout(sig, 800); }, 600);
    }
    $("chkPts").addEventListener("change", function () { $("ptsEv").style.display = this.checked ? "" : "none"; });
    $("evMapa").addEventListener("click", function () { if (!MAPA) return; MAPA.imagen(im[1].src, b, E.puntos); MAPA.encuadrar(b); });
  }

  // ---------- Does it work? ----------
  function tabComo() {
    var V = Q.validacion, r = V.resultados, m = r[V.metodo_elegido], c = r.modis_crudo, S2 = V.serie, W = 400, H = 190, L = 44, B = 22, Tp = 26, mx = 1;
    S2.forEach(function (d) { mx = Math.max(mx, d.viirs_real, d.armonizado); });
    function X(i) { return L + (W - L - 6) * i / Math.max(1, S2.length - 1); } function Y(v) { return H - B - (H - B - Tp) * v / mx; }
    function linea(k, col, dash, w) { return '<path class="' + (dash ? 'ch-fade"' : 'ch-line" pathLength="1"') + ' d="M' + S2.map(function (d, i) { return X(i).toFixed(1) + " " + Y(d[k]).toFixed(1); }).join("L") + '" fill="none" stroke="' + col + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : "") + "/>"; }
    var g = ['<svg viewBox="0 0 ' + W + " " + H + '" class="ch" style="width:100%;height:auto">'];
    S2.forEach(function (d, i) { if (d.mes.slice(5) === "01") g.push('<text x="' + X(i) + '" y="' + (H - 6) + '" font-size="9" text-anchor="middle" fill="#6b7486">' + d.mes.slice(0, 4) + "</text>"); });
    g.push(linea("modis_crudo", "#5b6680", "2 3", 1.5), linea("viirs_real", "#F4F1EA", "", 2.2), linea("armonizado", "#FF6B2C", "6 3", 2));
    g.push('<g font-size="9" fill="#F4F1EA"><line x1="' + L + '" x2="' + (L + 18) + '" y1="10" y2="10" stroke="#F4F1EA" stroke-width="2.2"/><text x="' + (L + 22) + '" y="13">' + t("VIIRS real", "Actual VIIRS") + '</text><line x1="' + (L + 100) + '" x2="' + (L + 118) + '" y1="10" y2="10" stroke="#FF6B2C" stroke-width="2" stroke-dasharray="6 3"/><text x="' + (L + 122) + '" y="13">' + t("Estimado desde MODIS", "Estimated from MODIS") + '</text><line x1="' + (L + 250) + '" x2="' + (L + 268) + '" y1="10" y2="10" stroke="#5b6680" stroke-width="1.5" stroke-dasharray="2 3"/><text x="' + (L + 272) + '" y="13">' + t("MODIS sin corregir", "Uncorrected MODIS") + "</text></g></svg>");
    $("tab-como").innerHTML = '<div class="tarjeta"><h3>' + t("¿Es confiable?", "Can I trust it?") + "</h3>" +
      conclusion(t("Sí: al corregir los datos, el error baja de ", "Yes: correcting the data brings the error down from ") + c.error_pct_mediano_mensual.toFixed(1) + "%" + t(" a ", " to ") + m.error_pct_mediano_mensual.toFixed(1) + "%" + t(" al mes.", " per month.")) +
      '<p class="lead">' + t("Los satélites MODIS (desde 2000) y VIIRS NOAA-20 (desde 2018) no ven el fuego igual; los armonizamos a la escala de VIIRS. Para probarlo, escondimos un año completo de VIIRS, lo estimamos solo con MODIS y lo comparamos con el dato real. Repetimos con cada año.", "The MODIS (since 2000) and VIIRS NOAA-20 (since 2018) satellites do not see fire the same way; we harmonized them to the VIIRS scale. To test it, we hid one full year of VIIRS, estimated it from MODIS alone and compared it with the real data. We repeated this for every year.") + "</p>" +
      '<div class="stats"><div class="stat"><div class="n apagado">' + c.error_pct_mediano_mensual.toFixed(1) + '%</div><div class="l">' + t("error sin armonizar", "error without harmonization") + '</div></div><div class="stat"><div class="n">' + m.error_pct_mediano_mensual.toFixed(1) + '%</div><div class="l">' + t("error con nuestro método (de 5 probados)", "error with our method (best of 5)") + "</div></div></div>" + g.join("") +
      "<details><summary>" + t("Detalles y límites", "Details and limits") + "</summary><ul><li>" + t("Error mediano mensual del total de la región; en un solo cuadro es mayor.", "Median monthly error for the regional total; it is larger for a single square.") + "</li><li>R² " + m.r2_mensual_region + t(" · meses en común: ", " · months in common: ") + V.meses_comunes + "</li><li>" + t("De agosto a noviembre de 2026 los datos son casi en tiempo real y pueden cambiar un poco.", "August to November 2026 are near-real-time data and may change slightly.") + "</li>" + (Q.riesgo ? "<li>" + t("Correlación entre suelo seco en primavera y la fuerza de la temporada (25 años): ", "Correlation between dry spring soil and season strength (25 years): ") + Q.riesgo.temporadas.correlaciones.suelo + "</li>" : "") + "<li>" + t("Más detalle en la vista técnica.", "More detail in the technical view.") + "</li></ul></details></div>";
  }

  // =====================================================================
  //  Season replay (timeline on the map)
  // =====================================================================
  var SEM = null, repTimer = null, cacheSem = {};
  window.SEMANAL_LISTO = function (clave, datos) { SEM = datos; iniciarReplay(); };
  (function () { var sc = document.createElement("script"); sc.src = "data/semanal/" + M.clave + ".js"; sc.onerror = function () { $("tiempo").style.display = "none"; }; document.head.appendChild(sc); })();
  function semanasDe(y) { var a = SEM[y] || [], w = []; for (var i = 0; i < 52; i++) w.push({}); for (var k = 0; k < a.length; k += 3) w[a[k]][a[k + 1]] = a[k + 2] / 10; return w; }
  function iniciarReplay() {
    var ys = Object.keys(SEM).map(Number).sort(function (a, b) { return b - a; });
    $("repAnio").innerHTML = ys.map(function (y) { return "<option>" + y + "</option>"; }).join("");
    $("repAnio").value = ys.indexOf(2024) >= 0 ? 2024 : ys[0];
    etiquetaReproducir();
    // Month marks under the week track (week w starts on Jan 1 + 7w)
    $("repMeses").innerHTML = NOM.map(function (n, m) { var dia = (Date.UTC(2001, m, 1) - Date.UTC(2001, 0, 1)) / 864e5; return '<span style="left:' + (Math.min(51, dia / 7) / 51 * 100).toFixed(2) + '%">' + n.slice(0, 1) + "</span>"; }).join("");
    pista($("repSem"));
    $("repAnio").addEventListener("change", function () { pararReplay(); $("repSem").value = 0; pista($("repSem")); etiquetaReproducir(); });
    $("repSem").addEventListener("input", function () { pararReplay(); cuadro(); });
    $("play").addEventListener("click", function () { if (repTimer) pararReplay(); else reproducir(); });
  }
  // Label at rest: says which year will play (it changes with the year selector)
  function etiquetaReproducir() {
    var y = $("repAnio").value || "";
    $("repTxt").textContent = t("Ver el fuego de " + y + " mes a mes", "Watch " + y + "\u2019s fire, month by month");
  }
  function cuadro() {
    var y = +$("repAnio").value, s = +$("repSem").value, W = cacheSem[y] || (cacheSem[y] = semanasDe(y)), v = new Array(NC).fill(0), tot = 0;
    for (var c in W[s]) { v[c] = W[s][c]; tot += W[s][c]; }
    var d0 = new Date(Date.UTC(y, 0, 1 + 7 * s));
    $("repTxt").innerHTML = esc(EN ? NOM[d0.getUTCMonth()] + " " + d0.getUTCDate() + ", " + y : d0.getUTCDate() + " " + NOM[d0.getUTCMonth()] + " " + y) + "<small>" + aprox(tot) + t(" fuegos vistos", " fires seen") + "</small>";
    pista($("repSem"));
    estado.mapa = { tipo: "semana", valores: v }; pintarMapa();
  }
  function reproducir() {
    var sl = $("repSem"); if (+sl.value >= 51) sl.value = 0; $("play").innerHTML = I("pause", 20); $("play").classList.add("on"); $("play").setAttribute("aria-label", t("Pausa", "Pause")); cuadro();
    repTimer = setInterval(function () { if (+sl.value >= 51) { pararReplay(); return; } sl.value = +sl.value + 1; cuadro(); }, 260);
  }
  function pararReplay() { if (repTimer) { clearInterval(repTimer); repTimer = null; } var p = $("play"); if (p) { p.innerHTML = I("play", 20); p.classList.remove("on"); p.setAttribute("aria-label", t("Reproducir", "Play")); } }
  // Space bar = play / pause (when the focus is not on a control that uses the space bar itself)
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== " " || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    var el = ev.target, tag = (el.tagName || "").toLowerCase();
    if (/^(input|select|textarea|button|a|summary|label)$/.test(tag) || el.isContentEditable || (el.getAttribute && el.getAttribute("role"))) return;
    if (!SEM || $("tiempo").style.display === "none") return;
    ev.preventDefault(); if (repTimer) pararReplay(); else reproducir();
  });

  // =====================================================================
  //  Welcome card and shortcuts
  // =====================================================================
  var ATAJOS = M.clave === "yucatan" ? [
    { n: "Yum Balam 2024", lat: 21.33, lon: -87.07, prueba: true, prim: true }, { n: "Mérida", lat: 20.97, lon: -89.62 }, { n: "Calakmul", lat: 18.37, lon: -89.6 }, { n: "Sian Ka'an", lat: 19.6, lon: -87.6 }, { n: "Tizimín", lat: 21.14, lon: -88.15 }
  ] : [{ n: "Pedrógão Grande", lat: 39.92, lon: -8.15, prim: true }, { n: "Monchique", lat: 37.32, lon: -8.55 }, { n: "Coimbra", lat: 40.2, lon: -8.42 }, { n: "Porto", lat: 41.15, lon: -8.61 }];
  // Hero: every figure is computed from window.QUEMAS (nothing typed by hand).
  var TOTDET = 0; TOTAL.forEach(function (v) { TOTDET += v; });
  $("bKick").textContent = "NASA Space Apps 2026";
  // Short map key inside the hero, so the squares read as data even while the hero is open (it never overlaps it).
  // (the map key is no longer shown inside the welcome card)
  $("bTit").innerHTML = t(NSPAN + " años de fuego, <em>vistos desde el espacio</em>", NSPAN + " years of fire, <em>seen from space</em>");
  $("bTxt").textContent = t("Mira cuándo y cuánto se quema cualquier lugar del mapa, con " + NSPAN + " años de fotos de satélite de la NASA.",
    "See when and how much any place on the map burns, with " + NSPAN + " years of NASA satellite photos.");
  // Welcome: title, one sentence and a single Continue button that hides it.
  // It is moved to <body> so it covers the whole screen, centred, above the bar and the panel.
  document.body.appendChild($("bienvenida"));
  $("bCifras").innerHTML = "";
  $("bPista").innerHTML = "";
  $("atajos").innerHTML = '<button class="atajo continuar" data-accion="continuar">' + t("Continuar", "Continue") + I("arrow", 20) + "</button>";
  function cerrarBienvenida() { $("bienvenida").style.display = "none"; document.body.classList.remove("con-heroe"); }
  // No welcome screen: the app opens straight on the map (the markup stays, hidden, in case it is wanted again).
  cerrarBienvenida();
  setTimeout(function () { var c = document.querySelector("#atajos .continuar"); if (c && $("bienvenida").style.display !== "none") c.focus({ preventScroll: true }); }, 50);
  $("cerrarBienv").addEventListener("click", cerrarBienvenida);
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && $("bienvenida").style.display !== "none" && document.activeElement !== $("q")) cerrarBienvenida(); });
  $("atajos").addEventListener("click", function (ev) {
    var b = ev.target.closest ? ev.target.closest("button") : null; if (!b) return; cerrarBienvenida();
    if (b.getAttribute("data-accion") === "continuar") return;
    if (b.getAttribute("data-accion") === "buscar") { $("q").focus(); return; }
    var i = +b.getAttribute("data-i"); if (i < 0) { seleccionarRegion(); return; }
    var a = ATAJOS[i]; if (MAPA) MAPA.irA(a.lat, a.lon, 9); estado.escala = 1; seleccionarPunto(a.lat, a.lon, a.n, true); abrirHoja(1);
    if (a.prueba) abrirTab("prueba");
  });

  // =====================================================================
  //  Refresh everything that depends on the selection
  // =====================================================================
  function actualizar() {
    pararSon(); dibujarLugar(); dibujarRespuestas();
    if (MAPA) pintarMapa();
    abrirTab(estado.tab);
  }

  // =====================================================================
  //  Sheet: on mobile the panel is a bottom sheet with 3 heights (peek, half, full), draggable
  // =====================================================================
  var HOJA = 0;
  function alturas() { var vh = innerHeight, pk = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--peek")) || 236; return [pk, Math.round(vh * 0.6), Math.round(vh * 0.92)]; } // peek height comes from --peek (app.css)
  function ponerOff(off) { $("panel").style.setProperty("--sheet-off", off + "px"); $("panelScroll").style.paddingBottom = off + "px"; }
  function abrirHoja(n) { if (!MOVIL()) return; HOJA = n; var h = alturas(); ponerOff(h[2] - h[n]); $("panel").setAttribute("data-hoja", n); }
  (function () {
    var y0 = null, off0 = 0, movio = false, id = null, ultY = 0, ultT = 0, vel = 0;
    function offActual() { var h = alturas(); return h[2] - h[HOJA]; }
    function bajo(ev) { if (!MOVIL() || (ev.button !== undefined && ev.button !== 0)) return; y0 = ev.clientY; off0 = offActual(); movio = false; id = ev.pointerId; ultY = ev.clientY; ultT = performance.now(); vel = 0; }
    function mueve(ev) {
      if (y0 === null || ev.pointerId !== id) return;
      var dy = ev.clientY - y0, h = alturas();
      if (!movio && Math.abs(dy) < 6) return;
      if (!movio) { movio = true; $("panel").classList.add("arrastrando"); try { ev.currentTarget.setPointerCapture(id); } catch (e) {} }
      var now = performance.now(); vel = (ev.clientY - ultY) / Math.max(1, now - ultT); ultY = ev.clientY; ultT = now;
      ponerOff(Math.max(0, Math.min(h[2] - h[0], off0 + dy)));
    }
    function sube(ev) {
      if (y0 === null) return; var h = alturas();
      if (movio) {
        var off = Math.max(0, Math.min(h[2] - h[0], off0 + ev.clientY - y0)), alto = h[2] - off, n = 0, best = 1e9;
        if (Math.abs(vel) > 0.6) n = vel < 0 ? Math.min(2, HOJA + 1) : Math.max(0, HOJA - 1);
        else h.forEach(function (v, i) { if (Math.abs(v - alto) < best) { best = Math.abs(v - alto); n = i; } });
        $("panel").classList.remove("arrastrando"); abrirHoja(n);
      } else if (ev.currentTarget === $("agarradera")) abrirHoja((HOJA + 1) % 3);
      y0 = null;
    }
    [$("agarradera"), document.querySelector(".panel-cab")].forEach(function (el) {
      el.addEventListener("pointerdown", bajo); el.addEventListener("pointermove", mueve); el.addEventListener("pointerup", sube); el.addEventListener("pointercancel", sube);
    });
    $("agarradera").addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); abrirHoja((HOJA + 1) % 3); } });
    window.addEventListener("resize", function () { if (MOVIL()) abrirHoja(HOJA); else { $("panel").style.removeProperty("--sheet-off"); $("panelScroll").style.paddingBottom = ""; } });
    if (MOVIL()) abrirHoja(0);
  })();
  // Range inputs show their progress in ember
  function pista(el) { if (!el) return; var a = +el.min || 0, b = +el.max || 100; el.style.setProperty("--p", ((+el.value - a) / (b - a || 1) * 100) + "%"); }
  document.addEventListener("input", function (ev) { if (ev.target.type === "range") pista(ev.target); });

  // ---------- start ----------
  try { MAPA = window.L ? crearLeaflet() : crearSvg(); } catch (e) { console.error(e); $("mapa").innerHTML = ""; MAPA = crearSvg(); }
  if (MAPA.tipo === "leaflet") {
    var ICB = { sat: "satellite", dia: "image", calles: "streets" };
    $("capas").innerHTML = Object.keys(BASES).map(function (k) { return '<button data-k="' + k + '" aria-pressed="' + (k === "sat") + '" title="' + esc(BASES[k].nombre) + '" class="' + (k === "sat" ? "on" : "") + '">' + I(ICB[k], 16) + "<span>" + BASES[k].nombre + "</span></button>"; }).join("");
    $("capas").addEventListener("click", function (ev) { var b = ev.target.closest ? ev.target.closest("button") : null; if (b) MAPA.base(b.getAttribute("data-k")); });
    $("fecha").value = "2024-05-25"; $("fecha").max = new Date().toISOString().slice(0, 10); $("fecha").min = "2018-01-01";
    $("fecha").addEventListener("change", function () { if (this.value) MAPA.fecha(this.value); });
  }
  MAPA.alClic(function (lat, lon) { cerrarBienvenida(); seleccionarPunto(lat, lon); });
  actualizar();
  // Cinematic entrance; the bar, sheet and dock fade in when the camera arrives (or at once if skipped / reduced motion).
  // Right panel: hide / show on desktop, so the map can fill the screen (handy when presenting).
  (function () {
    var cab = document.querySelector("#panel .panel-cab"); if (!cab) return;
    cab.insertAdjacentHTML("afterbegin", '<button type="button" class="panel-ocultar" id="panelOcultar" aria-controls="panel" aria-expanded="true" aria-label="' + t("Ocultar el panel", "Hide the panel") + '" title="' + t("Ocultar el panel", "Hide the panel") + '">' + I("chevron", 16) + "</button>");
    document.body.insertAdjacentHTML("beforeend", '<button type="button" class="panel-mostrar" id="panelMostrar" aria-controls="panel" aria-expanded="false">' + I("chevron", 16) + "<span>" + t("Mostrar el panel", "Show the panel") + "</span></button>");
    function ponerPanel(oculto) {
      var w = $("panel").offsetWidth || 0;
      document.body.classList.toggle("panel-oculto", oculto);
      if (MAPA && MAPA.desplazar && w) MAPA.desplazar(oculto ? -w / 2 : w / 2);
      $("panelOcultar").setAttribute("aria-expanded", String(!oculto)); $("panelMostrar").setAttribute("aria-expanded", String(!oculto));
      setTimeout(function () { (oculto ? $("panelMostrar") : $("panelOcultar")).focus({ preventScroll: true }); }, 50);
    }
    $("panelOcultar").addEventListener("click", function () { ponerPanel(true); });
    $("panelMostrar").addEventListener("click", function () { ponerPanel(false); });
  })();
  function listo() { document.body.classList.remove("entrando"); setTimeout(moverIndicador, 320); }
  if (MAPA.entrada) MAPA.entrada(listo); else listo();
})();
