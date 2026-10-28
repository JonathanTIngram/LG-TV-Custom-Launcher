/*
 * Random color theme, picked from the named colors in colors.js.
 *
 * A random primary is chosen, then a color-harmony scheme gives the hues for
 * the secondary and tertiary; each is the closest named color to that hue with
 * similar saturation and lightness. The background is a deep named color in
 * the primary's hue.
 */
var Theme = (function () {
  'use strict';

  // Hue offsets (degrees) for primary, secondary, tertiary.
  var SCHEMES = {
    'analogous': [0, 30, 60],
    'complementary': [0, 180, 30],
    'split-complementary': [0, 150, 210],
    'triadic': [0, 120, 240],
    'square': [0, 90, 180]
  };

  function toHsl(hex) {
    var r = parseInt(hex.substr(0, 2), 16) / 255;
    var g = parseInt(hex.substr(2, 2), 16) / 255;
    var b = parseInt(hex.substr(4, 2), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2, h = 0, s = 0, d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }

  function prepare(list) {
    return list.map(function (c) {
      var hsl = toHsl(c[1]);
      return { name: c[0], hex: '#' + c[1], h: hsl.h, s: hsl.s, l: hsl.l };
    });
  }

  function hueDist(a, b) {
    var d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  // Closest color to the target, chosen at random from the best few for variety.
  function nearest(list, hue, s, l, exclude) {
    var scored = [];
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (exclude.indexOf(c) >= 0) continue;
      scored.push({ c: c, d: hueDist(c.h, hue) / 30 + Math.abs(c.s - s) + Math.abs(c.l - l) * 2 });
    }
    scored.sort(function (a, b) { return a.d - b.d; });
    return pick(scored.slice(0, 6)).c;
  }

  function rgba(hex, a) {
    return 'rgba(' + parseInt(hex.substr(1, 2), 16) + ',' + parseInt(hex.substr(3, 2), 16) + ',' +
      parseInt(hex.substr(5, 2), 16) + ',' + a + ')';
  }

  // Blend two #rrggbb colors; t = 0 gives a, 1 gives b.
  function mix(a, b, t) {
    var out = '#';
    for (var i = 1; i < 7; i += 2) {
      var v = Math.round(parseInt(a.substr(i, 2), 16) * (1 - t) + parseInt(b.substr(i, 2), 16) * t);
      out += (v < 16 ? '0' : '') + v.toString(16);
    }
    return out;
  }

  var accents, darks;

  function random() {
    if (typeof COLOR_ACCENTS === 'undefined') return null;
    accents = accents || prepare(COLOR_ACCENTS);
    darks = darks || prepare(COLOR_DARKS);

    var names = Object.keys(SCHEMES);
    var scheme = pick(names);
    var offsets = SCHEMES[scheme];
    var primary = pick(accents);
    var picked = [primary];
    for (var i = 1; i < offsets.length; i++) {
      picked.push(nearest(accents, (primary.h + offsets[i]) % 360, primary.s, primary.l, picked));
    }
    return {
      scheme: scheme,
      primary: picked[0],
      secondary: picked[1],
      tertiary: picked[2],
      background: nearest(darks, primary.h, 0.4, 0.09, [])
    };
  }

  function apply(t) {
    var el = document.getElementById('theme-style');
    if (!el) {
      el = document.createElement('style');
      el.id = 'theme-style';
      document.head.appendChild(el);
    }
    var p = t.primary.hex, s = t.secondary.hex, x = t.tertiary.hex, bg = t.background.hex;
    el.textContent =
      'html, body { background: ' + bg + '; background-image: radial-gradient(ellipse at 15% 0%, ' +
        rgba(p, 0.2) + ' 0%, ' + rgba(bg, 0) + ' 55%), radial-gradient(ellipse at 100% 100%, ' +
        rgba(s, 0.12) + ' 0%, ' + rgba(bg, 0) + ' 50%); }\n' +
      '#clock { color: ' + mix(s, '#ffffff', 0.35) + '; }\n' +
      '#mode { color: ' + x + '; }\n' +
      '.card.system { background: ' + mix(bg, s, 0.2) + '; }\n' +
      '.tile.focused .card { box-shadow: 0 0 0 5px ' + p + ', 0 14px 36px ' + rgba(p, 0.45) + '; }\n' +
      '.tile.focused .label { color: ' + mix(p, '#ffffff', 0.4) + '; }\n' +
      '.tile.hidden::after { background: ' + x + '; }\n' +
      '#editBtn { border-color: ' + rgba(s, 0.6) + '; }\n' +
      '.swatch.p { background: ' + p + '; } .swatch.s { background: ' + s + '; } .swatch.t { background: ' + x + '; }\n';

    var label = document.getElementById('themeName');
    if (label) {
      label.textContent = t.primary.name + ' · ' + t.secondary.name + ' · ' + t.tertiary.name +
        '  (' + t.scheme + ')';
    }
  }

  return {
    shuffle: function () {
      var t = random();
      if (t) apply(t);
      return t;
    }
  };
})();
