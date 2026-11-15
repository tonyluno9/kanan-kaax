/*
  Burn Calendar (Calendario de quemas) · team La Com · NASA Space Apps Challenge 2026
  Challenge: Harmonization of MODIS and VIIRS Hot Spots.
  AI disclosure: this file was generated with the assistance of an AI tool (Claude, by Anthropic)
  and reviewed by the team. Data: NASA FIRMS, NASA POWER, NASA GIBS. Map tiles: NASA GIBS, OpenStreetMap; labels: Esri.

  Icon set: 24x24 grid, 1.5 stroke, currentColor. window.ico(name, size) returns an inline SVG string.
  No emoji anywhere in the interface: every symbol comes from here.
*/
(function () {
  "use strict";
  var P = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.6 3.6 5.4 3.6 8.5s-1.2 5.9-3.6 8.5c-2.4-2.6-3.6-5.4-3.6-8.5S9.6 6.1 12 3.5z"/>',
    flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.1 0-3.1 2-5 3.4-6.6.3 1.6 1.1 2.7 2.2 3.2C11 8.2 12.4 5.3 14.6 3c.3 2.8 1.6 4.5 2.8 6.1 1 1.4 1.6 3 1.6 4.9 0 4-2.9 7-7 7z"/><path d="M12 21c-1.6 0-2.8-1.2-2.8-2.8 0-1.7 1.5-2.7 2.8-4.3 1.3 1.6 2.8 2.6 2.8 4.3 0 1.6-1.2 2.8-2.8 2.8z"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.3v.2"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke-linejoin="round"/>',
    pause: '<path d="M8 5.5v13M16 5.5v13" stroke-width="3"/>',
    stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/>',
    wave: '<path d="M3 12h2M7 8v8M11 5v14M15 8.5v7M19 10.5v3M21 12h0"/>',
    download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    swap: '<path d="M8 7l-4 5 4 5M16 7l4 5-4 5"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    external: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
    satellite: '<g transform="rotate(-45 12 12)"><rect x="9.5" y="9" width="5" height="6" rx="1"/><rect x="2" y="10" width="6" height="4" rx=".8"/><rect x="16" y="10" width="6" height="4" rx=".8"/><path d="M8 12h1.5M14.5 12H16M12 15v3"/></g>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5.5-5 4 3.5 2.5-2 4 3.5"/>',
    streets: '<path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2z"/><path d="M9 4v14M15 6v14"/>',
    layers: '<path d="M12 4l8.5 4.5L12 13 3.5 8.5z"/><path d="M3.5 12.5L12 17l8.5-4.5M3.5 16.5L12 21l8.5-4.5"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
    shield: '<path d="M12 3.5l7.5 3v5.6c0 4.4-3.1 7.6-7.5 8.9-4.4-1.3-7.5-4.5-7.5-8.9V6.5z"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
    rules: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
    risk: '<path d="M3 17l5-6 4 3 5-7 4 4"/><path d="M3 20.5h18"/>',
    lab: '<path d="M9.5 3.5h5M10.5 3.5v5.2L5 18.3a1.5 1.5 0 0 0 1.3 2.2h11.4a1.5 1.5 0 0 0 1.3-2.2l-5.5-9.6V3.5"/><path d="M7.5 14h9"/>',
    keyboard: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h0M10 10h0M13 10h0M16 10h0M8 14h8"/>'
  };
  // Isotype: a flame cut out of a 3x3 calendar grid (the record is a calendar; fire is what it counts).
  var LOGO = '<svg viewBox="0 0 32 32" width="__S__" height="__S__" aria-hidden="true" focusable="false">' +
    '<defs><linearGradient id="bcG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB347"/><stop offset=".55" stop-color="#FF6B2C"/><stop offset="1" stop-color="#C2361B"/></linearGradient>' +
    '<mask id="bcM"><rect width="32" height="32" fill="#fff"/><path d="M16 27c-4.4 0-7.3-2.9-7.3-6.8 0-3.4 2.2-5.5 3.8-7.3.3 1.8 1.2 3 2.4 3.5.2-3.7 1.8-6.9 4.2-9.4.3 3.1 1.8 5 3.1 6.8 1.1 1.5 1.8 3.3 1.8 5.4 0 4.6-3.3 7.8-8 7.8z" fill="#000"/></mask></defs>' +
    '<g mask="url(#bcM)" fill="url(#bcG)"><rect x="3" y="3" width="7.6" height="7.6" rx="2"/><rect x="12.2" y="3" width="7.6" height="7.6" rx="2"/><rect x="21.4" y="3" width="7.6" height="7.6" rx="2"/>' +
    '<rect x="3" y="12.2" width="7.6" height="7.6" rx="2"/><rect x="12.2" y="12.2" width="7.6" height="7.6" rx="2"/><rect x="21.4" y="12.2" width="7.6" height="7.6" rx="2"/>' +
    '<rect x="3" y="21.4" width="7.6" height="7.6" rx="2"/><rect x="12.2" y="21.4" width="7.6" height="7.6" rx="2"/><rect x="21.4" y="21.4" width="7.6" height="7.6" rx="2"/></g>' +
    '<path d="M16 25.4c-1.7 0-2.9-1.2-2.9-2.9 0-1.8 1.6-2.9 2.9-4.6 1.3 1.7 2.9 2.8 2.9 4.6 0 1.7-1.2 2.9-2.9 2.9z" fill="#FFB347"/></svg>';
  window.ico = function (name, size) {
    var s = size || 18;
    if (name === "logo") return LOGO.replace(/__S__/g, s);
    return '<svg class="ico" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (P[name] || "") + "</svg>";
  };
})();
