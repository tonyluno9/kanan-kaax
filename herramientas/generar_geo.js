// AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
// and reviewed by the team. NASA Space Apps Challenge 2026.
// Genera el contorno de costa y la máscara de tierra de una región.
//   npm install world-atlas topojson-client
//   node herramientas/generar_geo.js yucatan -92.5 17.75 -86.5 21.75 0.25
// Escribe pipeline/geo/<clave>.json. Fuente: Natural Earth (paquete world-atlas).
const fs = require("fs"), path = require("path"), topo = require("topojson-client");
const [clave, x0, y0, x1, y1, g] = process.argv.slice(2).map((v, i) => (i ? +v : v));
const w = JSON.parse(fs.readFileSync(require.resolve("world-atlas/countries-10m.json")));
const fc = topo.feature(w, w.objects.countries);
const pad = 0.8, V = { x0: x0 - pad, x1: x1 + pad, y0: y0 - pad, y1: y1 + pad }, W = { x0: x0 - 4, x1: x1 + 4, y0: y0 - 4, y1: y1 + 4 };
const costa = [], polys = [];
for (const f of fc.features) {
  const geo = f.geometry; if (!geo) continue;
  const ps = geo.type === "Polygon" ? [geo.coordinates] : geo.coordinates, keep = [];
  for (const p of ps) {
    const ring = p[0];
    if (!ring.some(([x, y]) => x >= V.x0 && x <= V.x1 && y >= V.y0 && y <= V.y1)) continue;
    const r = ring.filter(([x, y]) => x >= W.x0 && x <= W.x1 && y >= W.y0 && y <= W.y1).map(([x, y]) => [+x.toFixed(3), +y.toFixed(3)]);
    if (r.length > 3) { keep.push(r); polys.push(ring); }
  }
  if (keep.length) costa.push({ nombre: f.properties.name, anillos: keep });
}
function dentro(x, y, ring) { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1]; if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c; } return c; }
const nx = Math.round((x1 - x0) / g), ny = Math.round((y1 - y0) / g), tierra = [];
for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let n = 0; for (const dx of [0.2, 0.5, 0.8]) for (const dy of [0.2, 0.5, 0.8]) if (polys.some(r => dentro(x0 + (i + dx) * g, y0 + (j + dy) * g, r))) n++; tierra.push(n >= 2 ? 1 : 0); }
const out = path.join(__dirname, "..", "pipeline", "geo", clave + ".json");
fs.writeFileSync(out, JSON.stringify({ nx, ny, tierra, costa }));
console.log(clave, "celdas de tierra:", tierra.reduce((a, b) => a + b, 0), "de", nx * ny, "|", costa.map(c => c.nombre).join(", "));
