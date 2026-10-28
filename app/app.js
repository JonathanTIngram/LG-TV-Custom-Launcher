/*
 * Clean Home — an ad-free app launcher for LG webOS TVs.
 *
 * Lists installed apps/inputs straight from the TV's application manager and
 * launches them directly, so you never pass through LG's home screen banners.
 * Written in ES5 so it runs on older webOS versions (Chromium 38+).
 */
(function () {
  'use strict';

  var SELF_ID = 'com.adfree.launcher';
  var STORE_KEY = 'cleanhome.v1';

  // LG promo/content-store surfaces. Hidden by default; unhide them in edit mode.
  var DEFAULT_HIDDEN = [
    SELF_ID,
    'com.webos.app.lgchannels',
    'com.webos.app.discovery'
  ];

  // Used only when the TV refuses to list launch points (some firmware
  // restricts that call for non-system apps). Hide any you don't have.
  var FALLBACK_APPS = [
    { id: 'com.webos.app.livetv', title: 'Live TV' },
    { id: 'com.webos.app.hdmi1', title: 'HDMI 1' },
    { id: 'com.webos.app.hdmi2', title: 'HDMI 2' },
    { id: 'com.webos.app.hdmi3', title: 'HDMI 3' },
    { id: 'com.webos.app.hdmi4', title: 'HDMI 4' },
    { id: 'youtube.leanback.v4', title: 'YouTube' },
    { id: 'netflix', title: 'Netflix' },
    { id: 'amazon', title: 'Prime Video' },
    { id: 'com.disney.disneyplus-prod', title: 'Disney+' },
    { id: 'hulu', title: 'Hulu' },
    // App id isn't documented; each is tried in turn and the one that works is remembered.
    { id: 'com.hbo.hbomax', title: 'HBO Max', alt: ['com.wbd.stream', 'com.hbo.max', 'hbomax', 'max'] },
    { id: 'com.apple.appletv', title: 'Apple TV' },
    { id: 'spotify-beehive', title: 'Spotify' },
    { id: 'cdp-30', title: 'Plex' },
    { id: 'com.webos.app.browser', title: 'Web Browser' },
    { id: 'com.palm.app.settings', title: 'Settings' }
  ];

  var KEY = {
    LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13,
    BACK: 461, ESC: 27, RED: 403, GREEN: 404, CH_UP: 33, CH_DOWN: 34, E: 69, T: 84
  };

  var gridEl = document.getElementById('grid');
  var modeEl = document.getElementById('mode');
  var hintEl = document.getElementById('hint');
  var clockEl = document.getElementById('clock');
  var toastEl = document.getElementById('toast');
  var editBtn = document.getElementById('editBtn');

  var apps = [];        // [{ key, id, title, icon, bg, params }]
  var visible = [];     // apps currently rendered, in display order
  var focus = 0;
  var editing = false;
  var prefs = loadPrefs();

  // ---- Luna service bus -------------------------------------------------

  var liveBridges = []; // keep bridges referenced until they answer

  function luna(uri, params, done) {
    if (typeof PalmServiceBridge === 'undefined') {
      done({ returnValue: false, errorText: 'Not running on webOS' });
      return;
    }
    var bridge = new PalmServiceBridge();
    liveBridges.push(bridge);
    bridge.onservicecallback = function (msg) {
      liveBridges.splice(liveBridges.indexOf(bridge), 1);
      var res;
      try { res = JSON.parse(msg); } catch (e) { res = { returnValue: false, errorText: 'Bad response' }; }
      done(res);
    };
    bridge.call(uri, JSON.stringify(params || {}));
  }

  // ---- Preferences (order + hidden), stored on the TV -------------------

  function loadPrefs() {
    var p = null;
    try { p = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { /* ignore */ }
    if (!p || !p.hidden) {
      p = { order: [], hidden: {} };
      DEFAULT_HIDDEN.forEach(function (id) { p.hidden[id] = true; });
    }
    return p;
  }

  function savePrefs() {
    prefs.order = apps.map(function (a) { return a.key; });
    try { localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
  }

  // ---- Loading apps -----------------------------------------------------

  function loadApps() {
    luna('luna://com.webos.applicationManager/listLaunchPoints', {}, function (res) {
      var list;
      if (res.returnValue && res.launchPoints && res.launchPoints.length) {
        list = res.launchPoints.map(function (lp) {
          return {
            key: lp.launchPointId || lp.id,
            id: lp.id,
            title: lp.title || lp.id,
            icon: lp.largeIcon || lp.icon || '',
            bg: lp.bgColor || '',
            params: lp.params || {}
          };
        });
      } else {
        list = FALLBACK_APPS.map(function (a) {
          return { key: a.id, id: a.id, alt: a.alt || [], title: a.title, icon: '', bg: '', params: {} };
        });
      }
      apps = applyOrder(list);
      render();
    });
  }

  function applyOrder(list) {
    var byKey = {};
    list.forEach(function (a) { byKey[a.key] = a; });
    var ordered = [];
    prefs.order.forEach(function (k) {
      if (byKey[k]) { ordered.push(byKey[k]); delete byKey[k]; }
    });
    // Newly installed apps go at the end, in the TV's own order.
    list.forEach(function (a) { if (byKey[a.key]) ordered.push(a); });
    return ordered;
  }

  function isHidden(app) {
    return !!(prefs.hidden[app.key] || prefs.hidden[app.id]);
  }

  // ---- Rendering --------------------------------------------------------

  function render() {
    var focusedKey = visible[focus] && visible[focus].key;
    visible = editing ? apps.slice() : apps.filter(function (a) { return !isHidden(a); });

    gridEl.innerHTML = '';
    visible.forEach(function (app, i) {
      gridEl.appendChild(makeTile(app, i));
    });

    var idx = -1;
    for (var i = 0; i < visible.length; i++) {
      if (visible[i].key === focusedKey) { idx = i; break; }
    }
    setFocus(idx >= 0 ? idx : Math.min(focus, visible.length - 1));

    modeEl.textContent = editing ? 'Editing' : '';
    editBtn.textContent = editing ? 'Done' : 'Edit';
    hintEl.textContent = editing
      ? 'OK: hide / show   ·   CH+ / CH−: move   ·   RED or BACK: done'
      : 'OK: open   ·   RED: edit   ·   GREEN: new colors';
  }

  // White line drawings for TV system apps (24x24 viewBox).
  var GLYPHS = {
    tv: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    input: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 11h10M8 14h8"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    gear: '<circle cx="12" cy="12" r="3.5"/><circle cx="12" cy="12" r="7.5" stroke-width="4" stroke-dasharray="3 2.9"/>'
  };

  function findBrand(app) {
    var title = app.title.toLowerCase().replace(/^\s+|\s+$/g, '');
    for (var b = 0; b < BRANDS.length; b++) {
      var brand = BRANDS[b];
      if ((brand.ids && brand.ids.indexOf(app.id) >= 0) ||
          (brand.prefix && app.id.indexOf(brand.prefix) === 0) ||
          brand.titles.indexOf(title) >= 0) {
        return brand;
      }
    }
    return null;
  }

  function wordmark(text) {
    var el = document.createElement('div');
    el.className = 'wordmark';
    el.textContent = text;
    return el;
  }

  function makeTile(app, i) {
    var brand = findBrand(app) || {};
    var tile = document.createElement('div');
    tile.className = 'tile' + (isHidden(app) ? ' hidden' : '');

    var card = document.createElement('div');
    card.className = 'card';
    if (brand.glyph) card.className += ' system'; // colored by the theme
    else card.style.background = brand.bg || app.bg || colorFor(app.title);
    tile.appendChild(card);

    var src = brand.icon ? 'icons/' + brand.icon + '.png' : app.icon;
    if (brand.glyph) {
      card.innerHTML = '<svg class="glyph" viewBox="0 0 24 24">' + GLYPHS[brand.glyph] + '</svg>';
    } else if (src) {
      var img = document.createElement('img');
      img.className = 'logo';
      img.src = src;
      img.onerror = function () { card.replaceChild(wordmark(brand.wordmark || app.title), img); };
      card.appendChild(img);
    } else {
      card.appendChild(wordmark(brand.wordmark || app.title));
    }

    var label = document.createElement('div');
    label.className = 'label';
    label.textContent = app.title;
    tile.appendChild(label);

    tile.addEventListener('mouseover', function () { setFocus(i); });
    tile.addEventListener('click', function () { setFocus(i); activate(); });
    return tile;
  }

  function colorFor(text) {
    var h = 0;
    for (var i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
    return 'hsl(' + h + ', 40%, 30%)';
  }

  function setFocus(i) {
    var tiles = gridEl.children;
    if (!tiles.length) { focus = 0; return; }
    focus = Math.max(0, Math.min(i, tiles.length - 1));
    for (var t = 0; t < tiles.length; t++) {
      tiles[t].className = tiles[t].className.replace(' focused', '');
    }
    var el = tiles[focus];
    el.className += ' focused';

    // Keep the focused tile on screen.
    var top = el.offsetTop - gridEl.offsetTop;
    if (top < gridEl.scrollTop) gridEl.scrollTop = top - 12;
    else if (top + el.offsetHeight > gridEl.scrollTop + gridEl.clientHeight) {
      gridEl.scrollTop = top + el.offsetHeight - gridEl.clientHeight + 24;
    }
  }

  function columns() {
    var tiles = gridEl.children;
    var n = 1;
    while (n < tiles.length && tiles[n].offsetTop === tiles[0].offsetTop) n++;
    return n;
  }

  // ---- Actions ----------------------------------------------------------

  function activate() {
    var app = visible[focus];
    if (!app) return;
    if (editing) {
      prefs.hidden[app.key] = !isHidden(app);
      if (app.key !== app.id) delete prefs.hidden[app.id];
      savePrefs();
      render();
      return;
    }
    prefs.resolved = prefs.resolved || {};
    var known = prefs.resolved[app.key];
    var ids = known ? [known] : [app.id].concat(app.alt || []);
    launchFirst(app, ids, 0);
  }

  // Try each candidate id until one launches; remember the winner.
  function launchFirst(app, ids, n) {
    luna('luna://com.webos.applicationManager/launch', { id: ids[n], params: app.params }, function (res) {
      if (res.returnValue) {
        if (ids.length > 1) {
          prefs.resolved[app.key] = ids[n];
          savePrefs();
        }
      } else if (n + 1 < ids.length) {
        launchFirst(app, ids, n + 1);
      } else {
        toast('Could not open ' + app.title + (res.errorText ? ': ' + res.errorText : ''));
      }
    });
  }

  function move(delta) {
    var app = visible[focus];
    var from = apps.indexOf(app);
    var to = from + delta;
    if (!app || to < 0 || to >= apps.length) return;
    apps.splice(from, 1);
    apps.splice(to, 0, app);
    savePrefs();
    render();
  }

  function toggleEdit() {
    editing = !editing;
    render();
  }

  var toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.className = 'show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = ''; }, 3000);
  }

  // ---- Input ------------------------------------------------------------

  document.addEventListener('keydown', function (e) {
    var cols = columns();
    switch (e.keyCode) {
      case KEY.LEFT: setFocus(focus - 1); break;
      case KEY.RIGHT: setFocus(focus + 1); break;
      case KEY.UP: if (focus - cols >= 0) setFocus(focus - cols); break;
      case KEY.DOWN: setFocus(Math.min(focus + cols, visible.length - 1)); break;
      case KEY.ENTER: activate(); break;
      case KEY.RED:
      case KEY.E: toggleEdit(); break;
      case KEY.GREEN:
      case KEY.T: Theme.shuffle(); break;
      case KEY.CH_UP: if (editing) move(-1); break;
      case KEY.CH_DOWN: if (editing) move(1); break;
      case KEY.BACK:
      case KEY.ESC: if (editing) toggleEdit(); break;
      default: return;
    }
    e.preventDefault();
  });

  editBtn.addEventListener('click', toggleEdit);

  // Reopening the launcher (e.g. via Quick Access) counts as a launch: new colors.
  document.addEventListener('webOSRelaunch', function () {
    Theme.shuffle();
    loadApps();
  });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) loadApps();
  });

  // ---- Clock ------------------------------------------------------------

  function tick() {
    var d = new Date();
    var h = d.getHours();
    var m = d.getMinutes();
    clockEl.textContent = (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + (h < 12 ? ' AM' : ' PM');
  }
  tick();
  setInterval(tick, 15000);

  Theme.shuffle();
  loadApps();
})();
