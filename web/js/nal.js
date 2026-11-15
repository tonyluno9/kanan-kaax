/*
  Kanan Ka'ax (Burn Calendar) · team La Com · NASA Space Apps Challenge 2026
  AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic) and reviewed by the team.

  NAL: the forecast model of Kanan Ka'ax ("nal" is maize in Yucatec Maya: the milpa is burned to plant it).
  It learns, for every 0.25° square and calendar month, how much fire to expect from the harmonized record
  (full years only), giving more weight to recent years, and it reports a range from the spread of past years.
  It is tested honestly: each year is predicted using only the years before it (walk-forward), and the scores
  shown in the app are computed here, in the browser, from the same data file. Nothing is typed by hand.

  What it can say: WHEN the fire comes (strong), WHERE (strong) and roughly HOW MUCH (a range).
  What it cannot say: the exact fire of a given year. Most fires are started by people.
*/
(function (root) {
  "use strict";
  var VIDA_MEDIA = 8;   // years: a year 8 years older weighs half as much
  var MIN_ENTRENO = 10; // a year is only tested when at least 10 earlier years exist

  function cuantil(v, q) { // v sorted ascending
    if (!v.length) return 0; var p = (v.length - 1) * q, a = Math.floor(p), b = Math.ceil(p); return v[a] + (v[b] - v[a]) * (p - a);
  }
  function pearson(a, b) {
    var n = a.length, ma = 0, mb = 0, i; for (i = 0; i < n; i++) { ma += a[i]; mb += b[i]; } ma /= n; mb /= n;
    var sab = 0, saa = 0, sbb = 0; for (i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - mb); saa += (a[i] - ma) * (a[i] - ma); sbb += (b[i] - mb) * (b[i] - mb); }
    return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : 0;
  }
  function mediana(v) { var s = v.slice().sort(function (a, b) { return a - b; }); return cuantil(s, 0.5); }

  function crear(Q) {
    var NC = Q.serie.length, T = Q.meses.length, k, c;
    var anioDe = Q.meses.map(function (s) { return +s.slice(0, 4); }), mesDe = Q.meses.map(function (s) { return +s.slice(5, 7) - 1; });
    // full years: 12 months present and none flagged as partial
    var cuenta = {}; for (k = 0; k < T; k++) { if (Q.parcial && Q.parcial[k]) continue; cuenta[anioDe[k]] = (cuenta[anioDe[k]] || 0) + 1; }
    var ANIOS = Object.keys(cuenta).map(Number).filter(function (y) { return cuenta[y] === 12; }).sort(function (a, b) { return a - b; });
    var idx = {}; for (k = 0; k < T; k++) { (idx[anioDe[k]] = idx[anioDe[k]] || [])[mesDe[k]] = k; }
    var ULTIMO = ANIOS[ANIOS.length - 1];
    var tierra = []; for (c = 0; c < NC; c++) { var s = 0; for (k = 0; k < T; k++) s += Q.serie[c][k]; if ((Q.tierra && Q.tierra[c]) || s > 0) tierra.push(c); }

    function pesos(anios, hasta) { return anios.map(function (y) { return Math.pow(0.5, (hasta - y) / VIDA_MEDIA); }); }
    function entreno(hasta) { return ANIOS.filter(function (y) { return y <= hasta; }); }

    // Expected fire per month for a set of squares, learned from the years up to `hasta`.
    // Returns { mes: [12 expected], bajo: [12 P10], alto: [12 P90], total, totalBajo, totalAlto, anios: n }
    function predecir(celdas, hasta) {
      var ys = entreno(hasta === undefined ? ULTIMO : hasta), w = pesos(ys, ys[ys.length - 1]), sw = 0, i, m;
      for (i = 0; i < w.length; i++) sw += w[i];
      var porAnio = ys.map(function (y) { var v = new Array(12).fill(0); for (var m2 = 0; m2 < 12; m2++) { var kk = idx[y][m2]; for (var j = 0; j < celdas.length; j++) v[m2] += Q.serie[celdas[j]][kk]; } return v; });
      var mes = new Array(12).fill(0), bajo = [], alto = [];
      for (m = 0; m < 12; m++) { var col = []; for (i = 0; i < ys.length; i++) { mes[m] += porAnio[i][m] * w[i] / sw; col.push(porAnio[i][m]); } col.sort(function (a, b) { return a - b; }); bajo.push(cuantil(col, 0.1)); alto.push(cuantil(col, 0.9)); }
      var tot = porAnio.map(function (v) { return v.reduce(function (a, b) { return a + b; }, 0); }).sort(function (a, b) { return a - b; });
      return { mes: mes, bajo: bajo, alto: alto, total: mes.reduce(function (a, b) { return a + b; }, 0), totalBajo: cuantil(tot, 0.1), totalAlto: cuantil(tot, 0.9), anios: ys.length };
    }
    // Expected yearly fire of every square (for the map), or of one month when `mes` (0-11) is given.
    function mapa(hasta, mes) {
      var ys = entreno(hasta === undefined ? ULTIMO : hasta), w = pesos(ys, ys[ys.length - 1]), sw = 0, i; for (i = 0; i < w.length; i++) sw += w[i];
      var out = new Array(NC).fill(0);
      for (var j = 0; j < tierra.length; j++) { var cc = tierra[j], s2 = 0; for (i = 0; i < ys.length; i++) { var a = 0; if (mes === undefined || mes === null) { for (var m = 0; m < 12; m++) a += Q.serie[cc][idx[ys[i]][m]]; } else a = Q.serie[cc][idx[ys[i]][mes]]; s2 += a * w[i] / sw; } out[cc] = s2; }
      return out;
    }
    function real(celdas, y) { var v = new Array(12).fill(0); for (var m = 0; m < 12; m++) { var kk = idx[y][m]; for (var j = 0; j < celdas.length; j++) v[m] += Q.serie[celdas[j]][kk]; } return v; }

    // Walk-forward test: every year with enough history is predicted from the years before it, `h` years ahead.
    function validar(h) {
      h = h || 1; var filas = [];
      ANIOS.forEach(function (y) {
        var hasta = y - h, ys = entreno(hasta); if (ys.length < MIN_ENTRENO) return;
        var p = predecir(tierra, hasta), r = real(tierra, y), tot = r.reduce(function (a, b) { return a + b; }, 0); if (!(tot > 0)) return;
        // WHEN: the three months NAL expects the most fire in
        var orden = p.mes.map(function (v, m) { return [v, m]; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 3).map(function (x) { return x[1]; });
        var top3 = orden.reduce(function (a, m) { return a + r[m]; }, 0) / tot;
        // WHERE: the fifth of the squares NAL expects the most fire in
        var esp = mapa(hasta), act = tierra.map(function (c2) { var s3 = 0; for (var m = 0; m < 12; m++) s3 += Q.serie[c2][idx[y][m]]; return s3; });
        var ord = tierra.map(function (c2, i2) { return [esp[c2], i2]; }).sort(function (a, b) { return b[0] - a[0]; });
        var n20 = Math.max(1, Math.round(tierra.length * 0.2)), d20 = 0; for (var i3 = 0; i3 < n20; i3++) d20 += act[ord[i3][1]];
        // WHEN + WHERE: the tenth of all square-months NAL expects the most fire in
        var cm = []; var ys2 = entreno(hasta), w = pesos(ys2, ys2[ys2.length - 1]), sw = 0, q; for (q = 0; q < w.length; q++) sw += w[q];
        tierra.forEach(function (c2) { for (var m = 0; m < 12; m++) { var e = 0; for (q = 0; q < ys2.length; q++) e += Q.serie[c2][idx[ys2[q]][m]] * w[q] / sw; cm.push([e, Q.serie[c2][idx[y][m]]]); } });
        cm.sort(function (a, b) { return b[0] - a[0]; }); var n10 = Math.round(cm.length * 0.1), d10 = 0; for (q = 0; q < n10; q++) d10 += cm[q][1];
        // baseline for the amount: "next year will be like the last one I saw"
        var ant = real(tierra, ys[ys.length - 1]).reduce(function (a, b) { return a + b; }, 0);
        filas.push({ anio: y, real: tot, esperado: p.total, bajo: p.totalBajo, alto: p.totalAlto, dentro: tot >= p.totalBajo && tot <= p.totalAlto,
          cuandoR: pearson(p.mes, r), top3: top3, donde20: d20 / tot, captura10: d10 / tot, err: Math.abs(p.total - tot) / tot, errPersist: Math.abs(ant - tot) / tot });
      });
      var med = function (k2) { return mediana(filas.map(function (f) { return f[k2]; })); }, prom = function (k2) { return filas.reduce(function (a, f) { return a + f[k2]; }, 0) / (filas.length || 1); };
      return { h: h, n: filas.length, anios: filas.map(function (f) { return f.anio; }), filas: filas,
        cuandoR: prom("cuandoR"), top3: prom("top3"), donde20: prom("donde20"), captura10: prom("captura10"),
        errMediano: med("err"), errPersistencia: med("errPersist"), dentroRango: filas.filter(function (f) { return f.dentro; }).length / (filas.length || 1) };
    }
    return { anios: ANIOS, ultimo: ULTIMO, tierra: tierra, predecir: predecir, mapa: mapa, real: real, validar: validar, vidaMedia: VIDA_MEDIA, minEntreno: MIN_ENTRENO };
  }
  root.NAL = { crear: crear };
})(typeof window !== "undefined" ? window : globalThis);
