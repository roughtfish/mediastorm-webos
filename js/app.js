// The app: screens (sign-in, profiles, home, search, film, series and
// person pages, the release picker) and everything they show.
//
// Sections, in order (search for "---------- name"):
//   - saved state
//   - helpers
//   - background tint
//   - images
//   - normalising titles from different endpoints
//   - versions and updates
//   - sign in
//   - profiles
//   - home
//   - title pages
//   - cast, people and collections
//   - a show's IDs
//   - watched films
//   - ratings
//   - watchlist
//   - trailers
//   - release picker
//   - search
//   - recent searches
//   - start

(function () {
  'use strict';

  var STORE = 'mediastorm-tv';
  var cfg = window.MS_CONFIG || {};
  var view = document.getElementById('view');
  var toastEl = document.getElementById('toast');

  // ---------- saved state ----------
  var saved = load();
  function load() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(saved)); } catch (e) { /* session only */ } }
  if (!saved.clientId) {
    saved.clientId = 'webos-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    save();
  }

  var profiles = [];
  var profile = null;
  var homeData = null;        // { rows: [...] } cached between screens
  var homeStale = false;      // shown from cache: refresh in the background
  var homeRefreshing = false;
  function homeCacheKey() { return STORE + '-home-' + (profile && profile.id); }
  function readHomeCache() {
    try { var c = JSON.parse(localStorage.getItem(homeCacheKey())); return c && c.rows ? c : null; } catch (e) { return null; }
  }
  function writeHomeCache(data) {
    try { localStorage.setItem(homeCacheKey(), JSON.stringify({ rows: data.rows, at: Date.now() })); } catch (e) { /* full: skip */ }
  }
  // AI picks row: mediastorm asks its AI provider afresh on every request, so the
  // app keeps the answer for a few hours rather than asking on every home refresh.
  // It's fetched behind the home screen, never holding the other rows up.
  var AI_ROW_TTL = 6 * 3600 * 1000, AI_ROW_RETRY = 2 * 60 * 1000;   // retry soon if a request was dropped
  var aiFetching = {};
  function aiCacheKey(id) { return STORE + '-ai-' + id; }
  function readAiCache(id) {
    try {
      var c = JSON.parse(localStorage.getItem(aiCacheKey(id)));
      if (!c || !Array.isArray(c.items)) return null;
      return Date.now() - c.at < (c.items.length ? AI_ROW_TTL : AI_ROW_RETRY) ? c : null;
    } catch (e) { return null; }
  }
  function readAiCacheAny(id) {   // even if out of date, to keep showing something while refreshing
    try { var c = JSON.parse(localStorage.getItem(aiCacheKey(id))); return c && Array.isArray(c.items) ? c : null; } catch (e) { return null; }
  }
  function fetchAiRow(id) {
    if (aiFetching[id]) return;
    aiFetching[id] = true;
    Api.aiRecommendations(id).then(function (r) {
      var items = ((r && r.items) || []).map(function (t) { return t && t.title ? fromTitle(t.title) : null; })
        .filter(Boolean).slice(0, 30);
      try { localStorage.setItem(aiCacheKey(id), JSON.stringify({ items: items, at: Date.now() })); } catch (e) { /* full: skip */ }
      if (items.length && profile && profile.id === id) {
        homeStale = true;
        // If a refresh is already running it may have missed the new row, so go again shortly after.
        if (homeRefreshing) setTimeout(function () { if (profile && profile.id === id) refreshHomeInBackground(); }, 3000);
        else refreshHomeInBackground();
      }
    }, function () {
      // Not set up, dropped, or the AI didn't answer: try again in a couple of minutes, not on every refresh.
      try { localStorage.setItem(aiCacheKey(id), JSON.stringify({ items: [], at: Date.now() })); } catch (e) { /* full: skip */ }
    }).then(function () { aiFetching[id] = false; });
  }
  // New episodes and Coming soon: from mediastorm's calendar (shows on your
  // watchlist or in your history), fetched behind the home screen and kept for
  // three hours.
  var CAL_TTL = 3 * 3600 * 1000, CAL_RETRY = 10 * 60 * 1000, calFetching = {};
  function calKey(id) { return STORE + '-cal-' + id; }
  function readCal(id, any) {
    try {
      var c = JSON.parse(localStorage.getItem(calKey(id)));
      if (!c || !Array.isArray(c.items)) return null;
      return any || Date.now() - c.at < (c.items.length ? CAL_TTL : CAL_RETRY) ? c : null;
    } catch (e) { return null; }
  }
  function fetchCalendar(id) {
    if (calFetching[id]) return;
    calFetching[id] = true;
    Api.calendar(id, 14, 7).then(function (r) {
      var items = ((r && r.items) || []).filter(function (it) {
        return it && (it.source === 'watchlist' || it.source === 'history') && it.airDate;
      });
      try { localStorage.setItem(calKey(id), JSON.stringify({ items: items, at: Date.now() })); } catch (e) { /* full */ }
      if (items.length && profile && profile.id === id) {
        homeStale = true;
        if (homeRefreshing) setTimeout(function () { if (profile && profile.id === id) refreshHomeInBackground(); }, 3000);
        else refreshHomeInBackground();
      }
    }, function () {
      try { localStorage.setItem(calKey(id), JSON.stringify({ items: [], at: Date.now() })); } catch (e) { /* full */ }
    }).then(function () { calFetching[id] = false; });
  }
  function localDate(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function dayLabel(iso) {
    var today = new Date(), d = new Date(iso + 'T12:00:00');
    var diff = Math.round((new Date(iso + 'T12:00:00') - new Date(localDate(today) + 'T12:00:00')) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === -1) return 'Yesterday';
    if (diff === 1) return 'Tomorrow';
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return days[d.getDay()] + ' ' + d.getDate() + ' ' + months[d.getMonth()] + (d.getFullYear() !== today.getFullYear() ? ' ' + d.getFullYear() : '');
  }
  function fromCalendar(it) {
    var x = it.externalIds || {}, movie = it.mediaType === 'movie';
    var id = movie ? (x.tmdb ? 'tmdb:movie:' + x.tmdb : x.tvdb ? 'tvdb:movie:' + x.tvdb : '')
                   : (x.tvdb ? 'tvdb:series:' + x.tvdb : x.tmdb ? 'tmdb:tv:' + x.tmdb : '');
    return {
      key: 'cal:' + id + ':' + (it.seasonNumber || 0) + ':' + (it.episodeNumber || 0),
      kind: movie ? 'movie' : 'series', titleId: id, name: it.title, year: it.year, overview: it.overview || '',
      poster: it.posterUrl || it.textPosterUrl, backdrop: it.backdropUrl || (it.backdropUrls && it.backdropUrls[0]) || it.posterUrl,
      imdb: x.imdb || '', tmdb: x.tmdb || '', tvdb: x.tvdb || '',
      next: movie ? null : { season: it.seasonNumber, episode: it.episodeNumber, title: it.episodeTitle || '' },
      note: dayLabel(it.airDate), focusEp: movie ? null : { season: it.seasonNumber, episode: it.episodeNumber }
    };
  }
  // Watchlist shows always count; shows from your watch history count only
  // while they're in Continue watching, so a show you've removed from there
  // (or dropped long ago) stops appearing.
  function calendarRows(id, following) {
    var cal = readCal(id, true);
    if (!cal || !cal.items.length) return [];
    var follow = {};
    (following || []).forEach(function (f) {
      if (f.titleId) follow['id:' + f.titleId] = true;
      if (f.tvdb) follow['tvdb:' + f.tvdb] = true;
      if (f.tmdb) follow['tmdb:' + f.tmdb] = true;
      if (f.imdb) follow['imdb:' + f.imdb] = true;
    });
    var followed = function (it, item) {
      if (it.source === 'watchlist') return true;
      var x = it.externalIds || {};
      return !!(follow['id:' + item.titleId] || (x.tvdb && follow['tvdb:' + x.tvdb]) ||
                (x.tmdb && follow['tmdb:' + x.tmdb]) || (x.imdb && follow['imdb:' + x.imdb]));
    };
    var today = localDate(new Date()), seen = {};
    var usable = cal.items.map(function (it) { return { it: it, item: fromCalendar(it) }; })
      .filter(function (x) { return x.item.titleId && followed(x.it, x.item); });
    var fresh = usable.filter(function (x) { return x.it.mediaType !== 'movie' && x.it.airDate <= today; })
      .sort(function (a, b) { return a.it.airDate < b.it.airDate ? 1 : -1; })
      .filter(function (x) { if (seen[x.item.titleId]) return false; return (seen[x.item.titleId] = true); })   // one card per show
      .map(function (x) { return x.item; });
    var later = usable.filter(function (x) { return x.it.airDate > today; })
      .sort(function (a, b) { return a.it.airDate < b.it.airDate ? -1 : 1; })
      .map(function (x) { return x.item; }).slice(0, 20);
    var rows = [];
    if (fresh.length) rows.push({ title: 'New episodes', wide: true, items: fresh.slice(0, 20) });
    if (later.length) rows.push({ title: 'Coming soon', wide: true, items: later });
    return rows;
  }

  var lastHomeKey = null;     // card to refocus when coming back home

  // ---------- helpers ----------
  var esc = Util.esc;
  // A card's fallback text when there's no image: starts from the title's
  // own beginning and trails off with an ellipsis if it's too long for the
  // card, rather than a block simply centred and clipped, which for a very
  // long title cuts off both the start and the end with no indication.
  function fallbackSpan(name, extra) {
    return '<span class="card-fallback"><b>' + esc(name) + (extra || '') + '</b></span>';
  }
  function toast(text, kind) {
    toastEl.textContent = text;
    toastEl.className = 'on ' + (kind || '');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.className = ''; }, 7000);
  }
  // The full text of a description, in a box over the page. Up and Down scroll
  // it, and Back or OK closes it.
  function textBox(title, text) {
    var back = document.activeElement, prevBack = Nav.currentBack ? Nav.currentBack() : null;
    var box = document.createElement('div');
    box.id = 'confirm';
    box.className = 'textbox';
    box.innerHTML = '<div class="box"><h2>' + esc(title) + '</h2><div class="textbox-body">' + esc(text) + '</div>' +
      '<div class="actions"><button class="btn primary" data-focus id="textbox-close">Close</button>' +
      '<span class="muted textbox-hint">Up and down to scroll</span></div></div>';
    document.body.appendChild(box);
    var body = box.querySelector('.textbox-body');
    if (body.scrollHeight <= body.clientHeight + 2) box.querySelector('.textbox-hint').textContent = '';
    Nav.setScope(box);
    function onKey(e) {
      if (e.keyCode === 38 || e.keyCode === 40) {
        e.preventDefault(); e.stopImmediatePropagation();
        body.scrollTop += (e.keyCode === 40 ? 1 : -1) * Math.round(body.clientHeight * 0.6);
      }
    }
    document.addEventListener('keydown', onKey, true);
    function close() {
      document.removeEventListener('keydown', onKey, true);
      if (box.parentNode) box.parentNode.removeChild(box);
      Nav.setScope(view);
      Nav.onBack(prevBack);
      if (back && document.body.contains(back)) Nav.focus(back); else Nav.first();
    }
    Nav.onBack(close);
    box.querySelector('#textbox-close').addEventListener('click', close);
    Nav.focus(box.querySelector('#textbox-close'));
  }
  // Puts a More button after a description that's been cut short, or removes it
  // if the text now fits. getText gives the full text when it's pressed.
  function moreTag(el, title, getText) {
    if (!el) return;
    var tag = el.nextElementSibling && el.nextElementSibling.classList.contains('more-tag') ? el.nextElementSibling : null;
    var cut = el.scrollHeight > el.clientHeight + 2;
    if (!cut) { if (tag) tag.parentNode.removeChild(tag); return; }
    if (!tag) {
      tag = document.createElement('button');
      tag.className = 'more-tag'; tag.setAttribute('data-focus', ''); tag.textContent = 'More';
      el.parentNode.insertBefore(tag, el.nextSibling);
    }
    tag.onclick = function () { textBox(title, getText()); };
  }

  // A message box with a few choices; Back closes it. choices: [{ label, fn }],
  // the first one selected. A Close choice is added at the end.
  function choiceBox(title, text, choices) {
    var back = document.activeElement, prevBack = Nav.currentBack ? Nav.currentBack() : null;
    var box = document.createElement('div');
    box.id = 'confirm';
    box.innerHTML = '<div class="box"><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p><div class="actions">' +
      choices.map(function (c, i) { return '<button class="btn' + (i === 0 ? ' primary' : '') + '" data-focus data-c="' + i + '">' + esc(c.label) + '</button>'; }).join('') +
      '<button class="btn" data-focus id="confirm-no">Close</button></div></div>';
    document.body.appendChild(box);
    Nav.setScope(box);
    function close() {
      if (box.parentNode) box.parentNode.removeChild(box);
      Nav.setScope(view);
      Nav.onBack(prevBack);
      if (back && document.body.contains(back)) Nav.focus(back); else Nav.first();
    }
    Nav.onBack(close);
    box.querySelector('#confirm-no').addEventListener('click', close);
    box.querySelectorAll('[data-c]').forEach(function (b) {
      b.addEventListener('click', function () { close(); choices[+b.getAttribute('data-c')].fn(); });
    });
    Nav.focus(box.querySelector('[data-c]') || box.querySelector('#confirm-no'));
  }

  // When something won't play: say so in a box over the page, with a way to
  // pick a release by hand. Specials are often named by title or date rather
  // than S00Exx, so for those the search tries those too.
  function showPlayError(item, ep, message) {
    var label = ep ? (ep.season === 0 ? 'this special' : 'S' + ep.season + ' E' + ep.episode) : item.name;
    var special = ep && ep.season === 0;
    var text = message;
    if (special && /no results|no .*releases?|couldn't find/i.test(message || '')) {
      text = 'mediastorm searched for it as S0 E' + ep.episode + ' and found nothing. Specials are often released under their name or air date instead, so a search by those may find it.';
    }
    choiceBox('Couldn\'t play ' + label, text, [{
      label: special ? 'Search by name and date' : 'Choose release',
      fn: function () {
        var keep = titleReturn;
        renderPicker(item, ep, function () { titleReturn = keep; renderTitle(item, null, ep); });
      }
    }]);
  }

  // A small yes/no box over the current screen. Back or Cancel closes it.
  function confirmBox(title, text, yesLabel, onYes) {
    var back = document.activeElement, prevBack = Nav.currentBack ? Nav.currentBack() : null;
    var box = document.createElement('div');
    box.id = 'confirm';
    box.innerHTML = '<div class="box"><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p><div class="actions">' +
      '<button class="btn primary" data-focus id="confirm-yes">' + esc(yesLabel) + '</button>' +
      '<button class="btn" data-focus id="confirm-no">Cancel</button></div></div>';
    document.body.appendChild(box);
    Nav.setScope(box);
    function close() {
      if (box.parentNode) box.parentNode.removeChild(box);
      Nav.setScope(view);
      Nav.onBack(prevBack);
      if (back && document.body.contains(back)) Nav.focus(back); else Nav.first();
    }
    Nav.onBack(close);
    box.querySelector('#confirm-no').addEventListener('click', close);
    box.querySelector('#confirm-yes').addEventListener('click', function () { close(); onYes(); });
    Nav.focus(box.querySelector('#confirm-yes'));
  }

  // Continue watching: removing a title asks mediastorm to hide it from the row
  // (until you watch it again), then takes it out of the home screen straight away.
  function inContinue(item) {
    var row = homeData && homeData.rows && homeData.rows.filter(function (r) { return r.wide; })[0];
    return !!(row && row.items.some(function (i) { return i.titleId === item.titleId; }));
  }
  function askRemoveContinue(item, after) {
    confirmBox('Remove from Continue watching?', item.name + ' will no longer show in the row. Watching it again brings it back.',
      'Remove', async function () {
        try { await Api.hideContinue(profile.id, item.titleId); }
        catch (e) { toast('Couldn\'t remove it: ' + e.message, 'warn'); return; }
        if (homeData && homeData.rows) {
          homeData.rows = homeData.rows.map(function (r) {
            return r.wide ? Object.assign({}, r, { items: r.items.filter(function (i) { return i.titleId !== item.titleId; }) }) : r;
          }).filter(function (r) { return r.items.length; });
          writeHomeCache(homeData);
        }
        toast('Removed ' + item.name + ' from Continue watching.');
        if (after) after();
      });
  }

  function fmtTime(sec) {
    sec = Math.floor(sec || 0);
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60);
    return h ? h + 'h ' + m + 'm' : m + 'm';
  }
  // ---------- background tint ----------
  // A subtle wash of the title's own colour behind the home screen and title
  // pages: a tiny copy of the backdrop is averaged (leaving out near-black,
  // near-white and grey pixels), then darkened and softened so text stays
  // easy to read. If an image can't be read, the usual colour stays.
  var BASE = [24, 32, 45], tintSeq = 0, tintCache = {};
  function setTintRgb(c) {
    var st = document.documentElement.style;
    st.setProperty('--tr', c[0]); st.setProperty('--tg', c[1]); st.setProperty('--tb', c[2]);
  }
  function clearTint() { tintSeq++; setTintRgb(BASE); }
  function tintFromImage(img) {
    var w = 24, h = 14, cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var cx = cv.getContext('2d');
    cx.drawImage(img, 0, 0, w, h);
    var d = cx.getImageData(0, 0, w, h).data, R = 0, G = 0, B = 0, W = 0;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
      if (l < 0.08 || l > 0.92) continue;
      var sat = mx === mn ? 0 : (mx - mn) / (1 - Math.abs(2 * l - 1));
      var wt = 0.05 + sat * sat;   // colourful pixels count for more than grey ones
      R += r * wt; G += g * wt; B += b * wt; W += wt;
    }
    if (!W) return BASE;
    R /= W; G /= W; B /= W;
    // to HSL, then a dark, soft version of it
    var mx2 = Math.max(R, G, B), mn2 = Math.min(R, G, B), hue = 0, s2 = 0, l2 = (mx2 + mn2) / 2;
    if (mx2 !== mn2) {
      var dd = mx2 - mn2;
      s2 = dd / (1 - Math.abs(2 * l2 - 1));
      hue = mx2 === R ? ((G - B) / dd) % 6 : mx2 === G ? (B - R) / dd + 2 : (R - G) / dd + 4;
      hue *= 60; if (hue < 0) hue += 360;
    }
    s2 = Math.min(s2, 0.55) * 0.8; var L = 0.15;
    var C = (1 - Math.abs(2 * L - 1)) * s2, X = C * (1 - Math.abs((hue / 60) % 2 - 1)), m = L - C / 2, rgb;
    if (hue < 60) rgb = [C, X, 0]; else if (hue < 120) rgb = [X, C, 0]; else if (hue < 180) rgb = [0, C, X];
    else if (hue < 240) rgb = [0, X, C]; else if (hue < 300) rgb = [X, 0, C]; else rgb = [C, 0, X];
    // blend with the usual colour, so it's a tint rather than a repaint
    return rgb.map(function (v, k) { return Math.round(((v + m) * 255) * 0.6 + BASE[k] * 0.4); });
  }
  function setTint(url) {
    var my = ++tintSeq;
    if (!url) { setTintRgb(BASE); return; }
    var small = tmdbSize(url, 'w300');
    if (tintCache[small]) { setTintRgb(tintCache[small]); return; }
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      var c = BASE;
      try { c = tintFromImage(img); } catch (e) { c = BASE; }   // the image's server didn't allow reading it
      tintCache[small] = c;
      if (my === tintSeq) setTintRgb(c);
    };
    img.onerror = function () { tintCache[small] = BASE; if (my === tintSeq) setTintRgb(BASE); };
    img.src = small;
  }

  function show(html, scopeClass) {
    ignoreHeldOK();
    if (scopeClass !== 'screen-home' && scopeClass !== 'screen-title') clearTint();
    view.className = scopeClass || '';
    view.innerHTML = html;
    Nav.setScope(view);
  }

  // ---------- images ----------
  // mediastorm asks TMDB for large images (w780 posters, original backdrops
  // and episode stills). Cards are much smaller, so the app asks TMDB for a
  // size that fits instead. Anything that isn't a TMDB image is left alone,
  // and if TMDB refuses the smaller size the original is loaded instead.
  function tmdbSize(url, size) {
    return url ? String(url).replace(/(\/\/image\.tmdb\.org\/t\/p\/)(w\d+|original)(\/)/, '$1' + size + '$3') : url;
  }
  window.msImgFail = function (el) {
    var full = el.getAttribute('data-full');
    if (full && el.getAttribute('src') !== full) el.setAttribute('src', full);
    else el.remove();
  };
  function imgTag(url, size, lazy) {
    var small = tmdbSize(url, size);
    return '<img src="' + esc(small) + '"' + (small !== url ? ' data-full="' + esc(url) + '"' : '') + ' alt=""' +
      (lazy ? ' loading="lazy" decoding="async"' : '') + ' onerror="msImgFail(this)">';
  }

  // Holding OK on a Continue watching card offers to remove it; a normal press
  // opens it as before. Runs before the usual key handling, home screen only.
  // TVs report a held button differently: some repeat the key-down, some send a
  // stream of down/up pairs. So a release only counts as a short press if no new
  // key-down follows within a moment; key-downs that keep coming for 0.7 s are a hold.
  var HOLD_MS = 700, GAP_MS = 250;
  var hold = null, homeItems = [];   // { card, start, holdTimer, gapTimer }
  // After the box opens, OK presses from the same hold are ignored until the
  // button has been let go, so a held button can't press Remove by itself.
  var swallowOK = false, swallowTimer = null;
  // OK still held when a press opens a new screen (or starts playback) would
  // otherwise carry on into it, repeating there: pressing whatever's selected
  // on the new screen. So those leftover presses are ignored until it's let go.
  var okDown = false;
  document.addEventListener('keydown', function (e) { if (e.keyCode === 13) okDown = true; }, true);
  document.addEventListener('keyup', function (e) { if (e.keyCode === 13) okDown = false; }, true);
  function ignoreHeldOK() { if (okDown || hold) swallowUntilQuiet(); }
  function swallowUntilQuiet() {
    swallowOK = true;
    clearTimeout(swallowTimer);
    swallowTimer = setTimeout(function () { swallowOK = false; }, 400);
  }
  function endHold() {
    if (!hold) return null;
    clearTimeout(hold.holdTimer); clearTimeout(hold.gapTimer);
    hold.card.classList.remove('holding');
    var h = hold; hold = null;
    return h;
  }
  // What holding OK on a card does: Continue watching cards offer removal,
  // episode cards offer marking watched. Anything else just opens as normal.
  function holdActionFor(a) {
    if (!a || !(a.classList.contains('card') || a.classList.contains('recent'))) return null;
    if (view.className === 'screen-home' && a.classList.contains('wide')) {
      var item = homeItems[+a.getAttribute('data-i')];
      if (!item || String(item.key).indexOf('cw:') !== 0) return null;
      return function () { askRemoveContinue(item, function () { renderHome(); }); };
    }
    if (view.classList.contains('screen-title') && a.classList.contains('ep') && a.onhold) return a.onhold;
    if (view.className === 'screen-search' && a.classList.contains('recent') && a.onhold) return a.onhold;
    return null;
  }
  function holdFired() {
    var h = endHold();
    if (!h) return;
    var act = holdActionFor(h.card);
    if (!act) return;
    swallowUntilQuiet();
    act();
  }
  document.addEventListener('keydown', function (e) {
    if (e.keyCode === 13 && swallowOK) { e.preventDefault(); e.stopImmediatePropagation(); swallowUntilQuiet(); return; }
    if (e.keyCode !== 13 || Player.active || document.getElementById('confirm') || document.getElementById('trailer')) return;
    var a = document.activeElement;
    if (!holdActionFor(a)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (hold && hold.card === a) {                  // still being held
      clearTimeout(hold.gapTimer);
      if (Date.now() - hold.start >= HOLD_MS) holdFired();
      return;
    }
    endHold();
    hold = { card: a, start: Date.now() };
    a.classList.add('holding');
    hold.holdTimer = setTimeout(holdFired, HOLD_MS);
  }, true);
  document.addEventListener('keyup', function (e) {
    if (e.keyCode === 13 && swallowOK) { e.preventDefault(); e.stopImmediatePropagation(); swallowUntilQuiet(); return; }
    if (e.keyCode !== 13 || !hold) return;
    e.preventDefault(); e.stopImmediatePropagation();
    clearTimeout(hold.gapTimer);
    hold.gapTimer = setTimeout(function () {        // no new key-down: it was a short press
      var h = endHold();
      if (h && document.body.contains(h.card)) h.card.click();
    }, GAP_MS);
  }, true);

  // ---------- normalising titles from different endpoints ----------
  function ext(map, key) { return map && map[key] ? String(map[key]) : ''; }

  // Some apps store a title with the episode tacked on, like
  // "Ted Lasso • S04E02 – Curiouser and Curiouser!". The show's name is the
  // part before that.
  function cleanName(n) {
    return String(n || '').replace(/\s*[•·|–—-]\s*S\d{1,2}\s*E\d{1,3}\b.*$/i, '').trim() || String(n || '');
  }
  function fromContinue(it) {
    var isMovie = /:movie:/.test(it.seriesId || '') || (!it.nextEpisode && !(it.lastWatched && it.lastWatched.episodeNumber > 0));
    var next = null;
    if (!isMovie) {
      var ep = it.nextEpisode || it.lastWatched;
      if (ep && ep.episodeNumber > 0) next = { season: ep.seasonNumber, episode: ep.episodeNumber, title: ep.title || '' };
    }
    return {
      key: 'cw:' + it.seriesId, kind: isMovie ? 'movie' : 'series', titleId: it.seriesId,
      name: cleanName(it.seriesTitle), year: it.year, overview: it.overview || (it.lastWatched && it.lastWatched.overview) || '',
      poster: it.posterUrl, backdrop: it.backdropUrl || (it.backdropUrls && it.backdropUrls[0]) || it.posterUrl,
      imdb: ext(it.externalIds, 'imdb'), tmdb: ext(it.externalIds, 'tmdb'), tvdb: ext(it.externalIds, 'tvdb'),
      next: next, percent: isMovie ? (it.resumePercent || it.percentWatched || 0) : (it.resumePercent || 0),
      // So clicking the card lands straight on this episode, the same as a
      // New episodes card, instead of just opening the series page.
      focusEp: next ? { season: next.season, episode: next.episode } : null
    };
  }
  function fromWatchlist(it) {
    return {
      key: 'wl:' + it.id, kind: it.mediaType === 'movie' ? 'movie' : 'series', titleId: it.id,
      name: cleanName(it.name), year: it.year, overview: it.overview || '', poster: it.posterUrl,
      backdrop: it.backdropUrl || (it.backdropUrls && it.backdropUrls[0]) || it.posterUrl,
      imdb: ext(it.externalIds, 'imdb'), tmdb: ext(it.externalIds, 'tmdb'), tvdb: ext(it.externalIds, 'tvdb')
    };
  }
  function fromTitle(t) {
    return {
      key: 'tt:' + t.id, kind: t.mediaType === 'movie' ? 'movie' : 'series', titleId: t.id,
      name: t.name, year: t.year, overview: t.overview || '',
      poster: t.poster && t.poster.url, backdrop: (t.backdrop && t.backdrop.url) || (t.poster && t.poster.url),
      imdb: t.imdbId || '', tmdb: t.tmdbId ? String(t.tmdbId) : '', tvdb: t.tvdbId ? String(t.tvdbId) : ''
    };
  }
  // Turns a release-style file name into something readable, for library
  // items (local folders, Plex and the like) that have no proper title of
  // their own: "Supercars.2026.Round11.Bathurst.1000.Race.TNTSports4.1080p.x264.English"
  // becomes "Supercars 2026 · Round 11 · Bathurst 1000 · Race".
  var CLEAN_DROP = ['web','webdl','web-dl','webrip','hdtv','hdtvrip','bluray','dvdrip','1080p','720p','2160p','480p','4k',
    'x264','x265','h264','h265','hevc','avc','av1','xvid','aac','ac3','dts','atmos',
    'dd','dd2','dd5','ddp','ddp2','ddp5',   // Dolby Digital / Plus, the ".1"/".0" after them is handled separately
    'english','multi','dual','subs','proper','repack','real'];
  // UK/common sports channel idents that turn up mid-filename, e.g.
  // "TNTSports4", "SkySportsF1" — dropped on sight, unlike a plain "F1".
  var CHANNEL_RE = /^(sky ?sports?|tnt ?sports?|bt ?sport|eurosport|premier ?sports?|dazn|motorsport ?tv|f1 ?tv|racepass|itv\d*|bbc\d*|channel ?4|viaplay)[a-z0-9]*$/i;
  function splitAlphaNum(p) {   // "Round11" -> "Round 11"; "F1" stays as it is
    return p.replace(/^([A-Za-z]+)(\d{2,})$/, '$1 $2');
  }
  function tidyFileName(name) {
    var base = String(name || '').replace(/\.[a-z0-9]{2,4}$/i, '');
    var parts = base.split(/[._]+/).filter(Boolean);
    var kept = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], low = p.toLowerCase(), prevDroppable = i > 0 && (CLEAN_DROP.indexOf(parts[i - 1].toLowerCase()) >= 0 || CHANNEL_RE.test(parts[i - 1]));
      if (CLEAN_DROP.indexOf(low) >= 0) continue;
      if (CHANNEL_RE.test(p)) continue;
      if (/^\d{1,2}$/.test(low) && prevDroppable) continue;   // the "1" in "DDP5.1", and the like
      if (i === parts.length - 1 && /-/.test(p) && !/^\d/.test(p)) continue;   // trailing "-ReleaseGroup"
      kept.push(splitAlphaNum(p).replace(/^[a-z]/, function (c) { return c.toUpperCase(); }));
    }
    return kept.join(' ').replace(/\s+/g, ' ').trim() || base;
  }
  function fromLibraryGroup(g, lib) {
    var it = g && g.items && g.items[0];
    if (!it) return null;
    var label = tidyFileName(it.fileName || g.title);
    return {
      key: 'lib:' + it.id, kind: 'movie', isLibraryItem: true, libraryItemId: it.id, libraryName: lib.name,
      sourceType: lib.sourceType, titleId: 'library:' + it.id, name: label,
      // The raw file name, as the detail line: spaced out so it wraps normally,
      // in case the tidied name above has dropped something worth seeing.
      overview: String(it.fileName || g.title || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[._]+/g, ' ').trim(),
      // Plex/Jellyfin generate their own thumbnail per item, even for content
      // with no title match, so it's safe to use (unlike a TMDB match, which
      // could easily be wrong for something like a sports recording).
      // A plain local folder has no such thumbnail, so there's no point
      // asking mediastorm for one; those get a designed placeholder instead.
      poster: HAS_ARTWORK[lib.sourceType] ? Api.libraryArtworkUrl(it.id, 'poster') : '',
      backdrop: HAS_ARTWORK[lib.sourceType] ? Api.libraryArtworkUrl(it.id, 'backdrop') : ''
    };
  }
  var HAS_ARTWORK = { plex: true, jellyfin: true };
  // A designed stand-in for a library item with no real thumbnail: a muted
  // colour (steady per title, so the same file always looks the same) with a
  // small play glyph, and the title along the bottom like a real poster.
  function strHue(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h % 360;
  }
  function mediaFallback(item, attrs) {
    return '<button class="card poster media-fallback" style="--hue:' + strHue(item.name || '') + '" data-focus ' + attrs + '>' +
      '<svg class="media-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      '<path d="M10 8.3v7.4l6.3-3.7z" fill="currentColor"/></svg>' +
      '<span class="card-label">' + esc(item.name) + '</span></button>';
  }
  // Fetches a library item's real stream path and plays it directly, with no
  // release search: the file is already known. Reuses the normal player (its
  // seeking, subtitles, audio menu, resume and progress reporting), just with
  // one release already picked for it.
  async function playLibraryItem(item, from) {
    var pb = await Api.libraryPlayback(item.libraryItemId).catch(function (e) { return { error: e }; });
    if (pb.error || !pb.streamPath) {
      toast('Couldn\'t get that ready to play: ' + ((pb.error && pb.error.message) || 'no stream found'), 'warn');
      return;
    }
    var name = tidyFileName(pb.fileName || pb.displayName) || item.name;
    Player.start({
      item: { kind: 'movie', name: name, titleId: item.titleId }, episode: null,
      profileId: profile.id, clientId: saved.clientId, resume: true,
      manual: { libraryItem: true, releases: [{ title: name, serviceType: pb.sourceType || item.sourceType, knownPath: pb.streamPath }] },
      onExit: function (message) {
        homeStale = true;
        if (from && document.body.contains(from)) Nav.focus(from); else Nav.first();
        if (message) toast('Couldn\'t play that: ' + message, 'warn');
      }
    });
  }
  function metaLine(item) {
    var bits = [];
    if (item.year) bits.push(item.year);
    bits.push(item.isLibraryItem ? (item.libraryName || 'Library') : item.kind === 'movie' ? 'Film' : 'Series');
    if (item.next) bits.push('Next: S' + item.next.season + ' E' + item.next.episode + (item.next.title ? ', ' + item.next.title : ''));
    return bits.join('   ');
  }

  // ---------- versions and updates ----------
  // The app's version (from its own appinfo.json), the server's, and a daily
  // check for newer releases of both.
  var APP_REPO = 'roughtfish/mediastorm-webos';
  var appVersion = '', serverVersionText = '';
  try {
    fetch('appinfo.json').then(function (r) { return r.json(); }).then(function (a) {
      appVersion = (a && a.version) || '';
      var el = document.getElementById('app-version');
      if (el) el.textContent = versionLine();
    }).catch(function () {});
  } catch (e) { /* no fetch for local files */ }
  function versionLine() {
    return 'mediastorm for webOS' + (appVersion ? ' ' + appVersion : '') + (serverVersionText ? ' · Server: mediastorm ' + serverVersionText : '');
  }
  function versionFooter() { return '<p class="app-version" id="app-version">' + esc(versionLine()) + '</p>'; }
  function loadServerVersion() {
    Api.serverVersion().then(function (v) {
      var ver = v && (v.version || v.Version);
      if (!ver) return;
      serverVersionText = /^v/i.test(ver) ? ver : 'v' + ver;
      var el = document.getElementById('app-version');
      if (el) el.textContent = versionLine();
    }, function () {});
  }
  // 1.10.0 is newer than 1.9.2; a leading "v" and anything after a dash are ignored.
  function newerVersion(a, b) {
    var pa = String(a || '').replace(/^v/i, '').split(/[-+]/)[0].split('.').map(Number);
    var pb = String(b || '').replace(/^v/i, '').split(/[-+]/)[0].split('.').map(Number);
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var x = pa[i] || 0, y = pb[i] || 0;
      if (x !== y) return x > y;
    }
    return false;
  }
  var UPDATE_KEY = STORE + '-updates';
  function checkUpdates() {
    var st = {};
    try { st = JSON.parse(localStorage.getItem(UPDATE_KEY)) || {}; } catch (e) { st = {}; }
    if (st.at && Date.now() - st.at < 24 * 3600 * 1000) return;   // once a day
    st.at = Date.now();
    var notes = [];
    var server = Api.updateStatus().then(function (u) {
      var b = u && u.backend;
      if (!b || !b.updateAvailable || !b.latestVersion) return;
      // mediastorm can flag an update even when the version number is
      // unchanged, if it's a newer build published under the same version;
      // worded plainly here rather than saying "is available" of what you
      // already appear to have. Keyed by build too, so a later same-version
      // rebuild still gets its own notice rather than being silently missed.
      var sameVersion = b.currentVersion && b.currentVersion === b.latestVersion;
      var key = b.latestVersion + (sameVersion && b.latestBuildId ? ':' + b.latestBuildId : '');
      if (st.server === key) return;
      notes.push(sameVersion
        ? 'A newer build of mediastorm ' + b.latestVersion + ' is available. Update it where you installed mediastorm.'
        : 'mediastorm ' + b.latestVersion + ' is available (you have ' + (b.currentVersion || 'an older version') +
          '). Update it where you installed mediastorm.');
      st.server = key;
    }, function () {});
    var app = (appVersion ? fetch('https://api.github.com/repos/' + APP_REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
        .then(function (r) { return r.ok ? r.json() : null; }) : Promise.resolve(null))
      .then(function (rel) {
        var tag = rel && rel.tag_name;
        if (tag && newerVersion(tag, appVersion) && st.app !== tag) {
          notes.push('A new version of this app is available: ' + tag.replace(/^v/i, '') + ' (you have ' + appVersion + ').');
          st.app = tag;
        }
      }, function () {});
    Promise.all([server, app]).then(function () {
      try { localStorage.setItem(UPDATE_KEY, JSON.stringify(st)); } catch (e) { /* full */ }
      if (notes.length) toast(notes.join(' '));
    });
  }

  // ---------- sign in ----------
  function renderSetup(message) {
    Nav.onBack(null);
    show(
      '<div class="center-panel">' +
        '<h1 class="wordmark">mediastorm</h1>' +
        '<p class="lede">Sign in to your mediastorm server.</p>' +
        field('server', 'Server', 'url', saved.server || cfg.server || '') +
        field('username', 'Username', 'text', saved.username || cfg.username || '') +
        field('password', 'Password', 'password', cfg.password || '') +
        '<button class="btn primary" data-focus data-autofocus id="signin">Sign in</button>' +
        (message ? '<p class="error">' + esc(message) + '</p>' : '') +
        versionFooter() +
      '</div>', 'screen-setup');
    loadServerVersion();
    document.getElementById('signin').addEventListener('click', signIn);
    Nav.first();
  }
  function field(key, label, type, value) {
    return '<div class="field" data-focus tabindex="0" data-key="' + key + '"><span>' + esc(label) + '</span>' +
      '<input type="' + type + '" spellcheck="false" autocapitalize="off" value="' + esc(value) + '"></div>';
  }
  function val(key) {
    var el = view.querySelector('.field[data-key="' + key + '"] input');
    return el ? el.value.trim() : '';
  }

  async function signIn() {
    var server = val('server'), username = val('username'), password = view.querySelector('.field[data-key="password"] input').value;
    if (!server || !username || !password) { renderSetup('Enter the server address, username and password.'); return; }
    Api.configure({ server: server, token: '', clientId: saved.clientId });
    try {
      var r = await Api.login(username, password);
      if (!r || !r.token) throw new Error('The server didn\'t return a session.');
      saved.server = server; saved.username = username; saved.token = r.token; save();
      Api.configure({ token: r.token });
      await renderProfiles();
    } catch (e) {
      renderSetup(e.status === 401 ? 'That username and password weren\'t accepted.' : e.message);
    }
  }

  // ---------- profiles ----------
  async function renderProfiles(auto) {
    Nav.onBack(null);
    try { profiles = await Api.profiles() || []; saved.profiles = profiles; save(); }
    catch (e) {
      if (e.status === 401) { saved.token = ''; save(); renderSetup('Your session has ended. Sign in again.'); return; }
      renderSetup(e.message); return;
    }
    if (auto) {
      var last = profiles.filter(function (p) { return p.id === saved.profileId; })[0];
      if (last && !last.pinLength) { chooseProfile(last); return; }
      if (profiles.length === 1 && !profiles[0].pinLength) { chooseProfile(profiles[0]); return; }
    }
    show(
      '<div class="center-panel wide">' +
        '<h1>Who\'s watching?</h1>' +
        '<div class="profile-grid">' + profiles.map(function (p, i) {
          var face = p.iconUrl
            ? '<img src="' + esc(Api.server + '/api/users/' + encodeURIComponent(p.id) + '/icon') + '" alt="">'
            : '<span>' + esc((p.name || '?').charAt(0).toUpperCase()) + '</span>';
          return '<button class="profile" data-focus data-index="' + i + '"' + (p.id === saved.profileId ? ' data-autofocus' : '') + '>' +
            '<div class="face" style="background:' + esc(p.color || '#2B374A') + '">' + face + '</div>' +
            '<div class="name">' + esc(p.name) + (p.pinLength ? ' <small>PIN</small>' : '') + '</div></button>';
        }).join('') + '</div>' +
        '<button class="btn quiet" data-focus id="signout">Sign out of this TV</button>' +
        versionFooter() +
      '</div>', 'screen-profiles');
    loadServerVersion();
    view.querySelectorAll('.profile').forEach(function (b) {
      b.addEventListener('click', function () { chooseProfile(profiles[+b.getAttribute('data-index')]); });
    });
    document.getElementById('signout').addEventListener('click', function () {
      Api.logout().catch(function () {});
      (saved.profiles || []).forEach(function (p) {
        try { localStorage.removeItem(STORE + '-home-' + p.id); localStorage.removeItem(aiCacheKey(p.id)); localStorage.removeItem(calKey(p.id)); } catch (e) { /* ignore */ }
      });
      saved.token = ''; saved.profileId = ''; saved.profiles = []; save();
      detailsCache = {};
      renderSetup();
    });
    Nav.first();
  }

  function chooseProfile(p) {
    if (p.pinLength && p.id !== (profile && profile.id)) { renderPin(p); return; }
    profile = p; saved.profileId = p.id; save();
    homeData = null; lastHomeKey = null;
    renderHome();
  }

  function renderPin(p, message) {
    Nav.onBack(function () { renderProfiles(); });
    show(
      '<div class="center-panel">' +
        '<h1>Enter ' + esc(p.name) + '\'s PIN</h1>' +
        field('pin', 'PIN', 'password', '') +
        '<button class="btn primary" data-focus id="pin-go">Continue</button>' +
        (message ? '<p class="error">' + esc(message) + '</p>' : '') +
      '</div>', 'screen-setup');
    document.getElementById('pin-go').addEventListener('click', async function () {
      try {
        await Api.verifyPin(p.id, val('pin'));
        profile = p; saved.profileId = p.id; save();
        homeData = null; renderHome();
      } catch (e) { renderPin(p, e.status === 401 ? 'That PIN isn\'t right.' : e.message); }
    });
    Nav.first();
  }

  // ---------- home ----------
  async function loadHome() {
    var uid = profile.id;
    var results = await Promise.all([
      Api.continueWatching(uid).catch(function (e) { return { error: e }; }),
      Api.watchlist(uid).catch(function (e) { return { error: e }; }),
      Api.topTen(uid, 'movie').catch(function (e) { return { error: e }; }),
      Api.topTen(uid, 'series').catch(function (e) { return { error: e }; }),
      Api.libraries().catch(function () { return []; })
    ]);
    if (results.every(function (r) { return r && r.error && r.error.status === 401; })) {
      var err = new Error('session'); err.status = 401; throw err;
    }
    var rows = [];
    if (Array.isArray(results[0]) && results[0].length) rows.push({ title: 'Continue watching', wide: true, items: results[0].map(fromContinue) });
    if (!readCal(uid)) fetchCalendar(uid);
    var cal = calendarRows(uid, Array.isArray(results[0]) ? results[0].map(fromContinue) : []);
    if (cal[0] && cal[0].title === 'New episodes') rows.push(cal.shift());
    if (!readAiCache(uid)) fetchAiRow(uid);
    var ai = readAiCacheAny(uid);
    if (ai && ai.items.length) {
      // Split into films and series from the same answer; if either side is
      // too thin to make a proper row, keep them together.
      var films = ai.items.filter(function (i) { return i.kind === 'movie'; });
      var series = ai.items.filter(function (i) { return i.kind !== 'movie'; });
      if (films.length >= 3 && series.length >= 3) {
        rows.push({ title: 'AI picks: films', items: films });
        rows.push({ title: 'AI picks: series', items: series });
      } else rows.push({ title: 'AI picks for you', items: ai.items });
    }
    if (Array.isArray(results[1]) && results[1].length) rows.push({ title: 'Your watchlist', items: results[1].map(fromWatchlist) });
    if (cal.length) rows.push(cal.shift());   // Coming soon, after your watchlist
    // Top 10 today, films and series as separate rows.
    [[results[2], 'Top 10 films today'], [results[3], 'Top 10 series today']].forEach(function (x) {
      var top = x[0] && x[0].items;
      if (Array.isArray(top) && top.length) rows.push({ title: x[1], items: top.map(function (t) { return fromTitle(t.title); }) });
    });
    // A row for each of mediastorm's library sources (local folders, or
    // connected ones like Plex), most recently added first. Only ones that
    // actually have something scanned show a row.
    // "Other"-type local libraries (a plain folder, not matched against TMDB)
    // don't get a lastScanTotal from mediastorm, so lastScanDiscovered is the
    // fallback for whether there's anything to show.
    var libs = (Array.isArray(results[4]) ? results[4] : []).filter(function (l) {
      return l && l.lastScanStatus === 'complete' && (l.lastScanTotal > 0 || l.lastScanDiscovered > 0);
    });
    if (libs.length) {
      var libRows = await Promise.all(libs.map(function (lib) {
        return Api.libraryGroups(lib.id, 20, 0).catch(function () { return null; }).then(function (r) {
          var groups = (r && r.groups) || [];
          var items = groups.map(function (g) { return fromLibraryGroup(g, lib); }).filter(Boolean);
          if (!items.length) return null;
          if (typeof r.total === 'number' && r.total > items.length) {
            items.push({ key: 'lib-more:' + lib.id, kind: 'seeAllLibrary', library: lib, name: 'See all', titleId: '' });
          }
          return { title: lib.name, items: items };
        });
      }));
      libRows.filter(Boolean).forEach(function (row) { rows.push(row); });
    }
    var failed = results.filter(function (r) { return r && r.error; }).length;
    return { rows: rows, failed: failed };
  }

  async function refreshHomeInBackground() {
    if (homeRefreshing) return;
    homeRefreshing = true;
    var forProfile = profile && profile.id;
    try {
      var fresh = await loadHome();
      if (!profile || profile.id !== forProfile) return;
      homeStale = false;
      var changed = JSON.stringify(fresh.rows) !== JSON.stringify(homeData && homeData.rows);
      homeData = fresh;
      writeHomeCache(fresh);
      // Redraw only if something changed and the home screen is still showing;
      // focus returns to the same card.
      if (changed && view.className === 'screen-home' && !Player.active) renderHome();
    } catch (e) {
      if (e.status === 401) { saved.token = ''; save(); renderSetup('Your session has ended. Sign in again.'); }
    } finally { homeRefreshing = false; }
  }

  async function renderHome(refresh) {
    Nav.onBack(function () { if (profiles.length > 1 || (profile && profile.pinLength)) renderProfiles(); });
    setTimeout(checkUpdates, 4000);   // once a day, after the home screen has settled
    ssReset();
    // Show what's saved straight away and refresh behind it.
    if (!homeData && !refresh) {
      var cached = readHomeCache();
      if (cached) { homeData = { rows: cached.rows, failed: 0 }; homeStale = true; }
    }
    if (homeData && homeStale && !refresh) refreshHomeInBackground();
    else if (homeData && !refresh && profile && !readAiCache(profile.id)) fetchAiRow(profile.id);   // coming back home: retry the AI row if due
    if (!homeData || refresh) {
      show('<div class="loading">Loading ' + esc(profile.name) + '\'s home</div>', 'screen-home');
      try { homeData = await loadHome(); homeStale = false; writeHomeCache(homeData); }
      catch (e) {
        if (e.status === 401) { saved.token = ''; save(); renderSetup('Your session has ended. Sign in again.'); return; }
        show('<div class="center-panel"><h1>Couldn\'t load your home screen</h1><p class="lede">' + esc(e.message) + '</p>' +
             '<button class="btn primary" data-focus id="retry">Try again</button></div>', 'screen-setup');
        document.getElementById('retry').addEventListener('click', function () { renderHome(true); });
        Nav.first();
        return;
      }
    }
    var all = [];
    homeItems = all;
    var rowsHtml = homeData.rows.map(function (row) {
      return '<section class="row"><h2>' + esc(row.title) + '</h2><div class="row-track">' +
        row.items.map(function (item) {
          var i = all.push(item) - 1;
          if (item.kind === 'seeAllLibrary') return '<button class="card poster see-all" data-focus data-i="' + i + '" data-key="' + esc(item.key) + '">See all \u2192</button>';
          var img = row.wide ? (item.backdrop || item.poster) : (item.poster || item.backdrop);
          if (item.isLibraryItem && !img) return mediaFallback(item, 'data-i="' + i + '" data-key="' + esc(item.key) + '"' + wkAttr(item));
          var bar = row.wide && item.percent > 1 ? '<i class="bar"><b style="width:' + Math.min(100, item.percent) + '%"></b></i>' : '';
          var label = row.wide
            ? '<span class="card-label">' + esc(item.name) + (item.next ? '<em>S' + item.next.season + ' E' + item.next.episode +
                (item.note ? ' · ' + esc(item.note) : '') + '</em>' : (item.note ? '<em>' + esc(item.note) + '</em>' : '')) + '</span>'
            : '';
          return '<button class="card ' + (row.wide ? 'wide' : 'poster') + '" data-focus data-i="' + i + '" data-key="' + esc(item.key) + '"' + (row.wide ? '' : wkAttr(item)) + '>' +
            (img ? imgTag(img, row.wide ? 'w780' : 'w342', true) : '') +
            fallbackSpan(item.name) + label + bar + '</button>';
        }).join('') + '</div></section>';
    }).join('');

    show(
      '<div id="home"><div id="hero"><div class="hero-art"><img id="hero-a" alt="" decoding="async"><img id="hero-b" alt="" decoding="async"></div>' +
        '<div class="hero-text"><h1 id="hero-title"></h1><p class="meta" id="hero-meta"></p><p class="overview" id="hero-overview"></p></div>' +
        '<div class="home-bar"><button class="btn pill" data-focus id="home-search">Search</button>' +
        '<button class="btn pill" data-focus id="home-genres">Genres</button>' +
        '<button class="btn pill quiet" data-focus id="home-profile">' + esc(profile.name) + '</button></div></div>' +
      '<div id="rows" data-vscroll><div class="rows-layer">' + (rowsHtml ||
        '<div class="empty">Nothing here yet. Add films and series to your watchlist in mediastorm and they\'ll appear here.</div>') + '</div></div></div>',
      'screen-home');
    document.getElementById('home-search').addEventListener('click', function () { searchState.focusKey = null; renderSearch(); });
    document.getElementById('home-genres').addEventListener('click', function () { renderGenres(); });
    document.getElementById('home-profile').addEventListener('click', function () { renderProfiles(); });
    if (homeData.failed) toast('Some rows couldn\'t be loaded. Press Back and pick your profile again to retry.', 'warn');

    var heroTimer = null, heroFront = 'a';
    function setHero(item) {
      if (!document.getElementById('hero-title')) return;   // home was left before the delay ran out
      document.getElementById('hero-title').textContent = item.name;
      document.getElementById('hero-meta').textContent = metaLine(item);
      document.getElementById('hero-overview').textContent = item.overview;
      var full = item.backdrop || item.poster || '';
      setTint(full);
      var src = tmdbSize(full, 'w1280');
      var front = document.getElementById('hero-' + heroFront);
      if (front.getAttribute('src') === src) return;
      var back = document.getElementById('hero-' + (heroFront === 'a' ? 'b' : 'a'));
      back.onload = function () { back.className = 'on'; front.className = ''; heroFront = heroFront === 'a' ? 'b' : 'a'; };
      back.onerror = function () {
        if (back.getAttribute('src') !== full) back.src = full;   // TMDB refused the smaller size
        else front.className = '';
      };
      if (src) back.src = src; else front.className = '';
    }
    document.getElementById('home').addEventListener('focusin', function (e) {
      var card = e.target.closest('.card');
      if (!card) return;
      var item = all[+card.getAttribute('data-i')];
      lastHomeKey = item.key;
      clearTimeout(heroTimer);
      // Long enough that passing through rows doesn't load a backdrop per card.
      heroTimer = setTimeout(function () {
        setHero(item);
        if (item.kind !== 'movie') seriesDetailsCached(item);
      }, 350);
    });
    view.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('click', function () {
        var it = all[+c.getAttribute('data-i')];
        if (it.isLibraryItem) playLibraryItem(it, c);
        else if (it.kind === 'seeAllLibrary') renderLibraryPage(it.library);
        else if (it.focusEp) { titleReturn = null; renderTitle(it, null, it.focusEp); }
        else openTitle(it, null);
      });
    });

    var again = lastHomeKey && view.querySelector('.card[data-key="' + (window.CSS && CSS.escape ? CSS.escape(lastHomeKey) : lastHomeKey) + '"]');
    if (again) Nav.focus(again); else Nav.focus(view.querySelector('#rows .card') || view.querySelector('[data-focus]'));
    paintWatchedPosters(view.querySelector('#rows'));
  }

  // ---------- title pages ----------
  function renderTitle(item, message, focusEpisode) {
    if (item.kind === 'movie') renderMovie(item, message);
    else renderSeries(item, message, focusEpisode);
  }

  // A Home button at the top of film, series and person pages, so a long trail
  // of actors and titles is one Up-and-OK from the home screen.
  var HOME_PILL = '<button class="btn pill quiet go-home" data-focus id="go-home">Home</button>';
  view.addEventListener('click', function (e) {
    if (e.target && e.target.id === 'go-home') { titleReturn = null; renderHome(); }
  });

  function titleShell(item, message, extra) {
    setTint(item.backdrop || item.poster || '');
    return HOME_PILL + '<div class="title-art">' + (item.backdrop ? '<img src="' + esc(item.backdrop) + '" alt="" onerror="this.remove()">' : '') + '</div>' +
      '<div class="title-body' + (extra ? ' compact' : ' film') + '">' +
        '<h1>' + esc(item.name) + '</h1>' +
        '<div class="meta-row"><p class="meta" id="title-meta">' + esc(metaLine(item)) + '</p>' +
          '<span class="ratings" id="title-ratings"></span></div>' +
        '<p class="overview">' + esc(item.overview) + '</p>' +
        '<div class="actions" id="actions"><button class="btn primary" data-focus data-autofocus id="play-main">Play</button></div>' +
        (message ? '<p class="error">' + esc(message) + '</p>' : '') +
      '</div>' + (extra || '');
  }

  // The film or series page stays in place behind the player. When you stop,
  // it's shown again as it was and only the watch details are updated, a
  // moment later, instead of the whole page being rebuilt while the TV is
  // still releasing the video.
  var livePage = null;          // { item, node, restore(message, playedEpisode, from) }
  var RESTORE_REFRESH_MS = 1500;
  function setPageMessage(message) {
    var body = view.querySelector('.title-body');
    if (!body) return;
    var old = body.querySelector(':scope > p.error');
    if (old) old.parentNode.removeChild(old);
    if (message) {
      var p = document.createElement('p'); p.className = 'error'; p.textContent = message;
      var actions = document.getElementById('actions');
      if (actions && actions.nextSibling) body.insertBefore(p, actions.nextSibling); else body.appendChild(p);
    }
  }

  // ---------- cast, people and collections ----------
  // Film and series details carry the top-billed cast (and, for films, the
  // collection a film belongs to). They're kept for the session.
  var titleDetailsCache = {};
  function titleDetailsCached(item) {
    if (item.kind !== 'movie') {
      return seriesDetailsCached(item).then(function (d) { return d && !d.error ? (d.title || null) : null; });
    }
    var key = 'movie|' + item.titleId;
    if (!titleDetailsCache[key]) {
      titleDetailsCache[key] = Api.movieDetails(item, profile.id).then(function (d) { return (d && (d.title || d)) || null; })
        .catch(function () { delete titleDetailsCache[key]; return null; });
    }
    return titleDetailsCache[key];
  }
  function castOf(title) {
    var list = (title && title.credits && title.credits.cast) || [];
    return list.filter(function (c) { return c && c.id && c.name; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); }).slice(0, 20)
      .map(function (c) { return { id: c.id, name: c.name, character: c.character || '', photo: c.profileUrl || '' }; });
  }
  function personCard(p, i) {
    return '<button class="card person" data-focus data-p="' + i + '">' +
      (p.photo ? imgTag(p.photo, 'w185', true) : '') +
      fallbackSpan(p.name) +
      '<span class="card-label">' + esc(p.name) + (p.character ? '<em>' + esc(p.character) + '</em>' : '') + '</span></button>';
  }
  // ---------- a show's IDs ----------
  // mediastorm can file a show's history under its TVDB or TMDB ID depending on
  // where it was played from, and doesn't always link the two. So the app
  // fills in every ID it knows from the show's details, and looks its watch
  // history up under each until one has it.
  function fillIds(item, title) {
    if (!item || !title) return;
    if (!item.tvdb && title.tvdbId) item.tvdb = String(title.tvdbId);
    if (!item.tmdb && title.tmdbId) item.tmdb = String(title.tmdbId);
    if (!item.imdb && title.imdbId) item.imdb = title.imdbId;
    if (title.id && title.id !== item.titleId) item.altIds = (item.altIds || []).concat([title.id]);
  }
  var seriesIdsFor = Util.showIds;
  async function watchStateFor(item) {
    var first = null;
    for (var i = 0, ids = seriesIdsFor(item); i < ids.length; i++) {
      var st = await Api.seriesWatchState(profile.id, ids[i]).catch(function () { return null; });
      if (st && st.watchedEpisodes && Object.keys(st.watchedEpisodes).length) return st;
      if (st && !first) first = st;
    }
    return first;
  }

  // ---------- watched films ----------
  // A ✓ on film posters you've watched, from mediastorm's watched list
  // (fetched once and kept for a couple of minutes).
  var watchedSet = null, watchedAt = 0, watchedP = null;
  function filmKeys(item) {
    if (!item || item.kind !== 'movie') return '';
    var k = [];
    if (item.titleId) k.push('movie:' + item.titleId);
    if (item.tmdb) k.push('movie:tmdb:movie:' + item.tmdb, 'movie:tmdb:' + item.tmdb);
    if (item.imdb) k.push('movie:imdb:' + item.imdb, 'movie:' + item.imdb);
    if (item.tvdb) k.push('movie:tvdb:movie:' + item.tvdb);
    var m = String(item.titleId || '').match(/^tmdb:movie:(\d+)$/);
    if (m && !item.tmdb) k.push('movie:tmdb:' + m[1]);
    return k.join('|').toLowerCase();
  }
  function watchedKeysNow() {
    if (watchedSet && Date.now() - watchedAt < 120000) return Promise.resolve(watchedSet);
    if (watchedP) return watchedP;
    watchedP = Api.watchedKeys(profile.id).then(function (r) {
      var set = {};
      if (r && Array.isArray(r.watched)) r.watched.forEach(function (k) { set[String(k).toLowerCase()] = true; });
      else if (Array.isArray(r)) r.forEach(function (it) {   // older servers: the full list
        if (!it || !it.watched || it.mediaType !== 'movie') return;
        set[('movie:' + it.itemId).toLowerCase()] = true;
        var x = it.externalIds || {};
        if (x.tmdb) set['movie:tmdb:movie:' + x.tmdb] = true;
        if (x.imdb) set[('movie:imdb:' + x.imdb).toLowerCase()] = true;
      });
      watchedSet = set; watchedAt = Date.now(); watchedP = null;
      return set;
    }, function () { watchedP = null; return watchedSet || {}; });
    return watchedP;
  }
  function freshWatchedKeys() { watchedSet = null; return watchedKeysNow(); }
  function filmWatched(set, keys) {
    return !!keys && keys.split('|').some(function (k) { return set[k]; });
  }
  // Adds the ✓ to every film poster in el that's been watched.
  function paintWatchedPosters(el) {
    if (!el || !el.querySelector('[data-wk]')) return;
    watchedKeysNow().then(function (set) {
      el.querySelectorAll('[data-wk]').forEach(function (c) {
        var on = filmWatched(set, c.getAttribute('data-wk')), tick = c.querySelector('i.seen');
        if (on && !tick) { tick = document.createElement('i'); tick.className = 'seen'; tick.textContent = '✓'; c.appendChild(tick); }
        else if (!on && tick) tick.parentNode.removeChild(tick);
      });
    });
  }
  function wkAttr(item) { var k = filmKeys(item); return k ? ' data-wk="' + esc(k) + '"' : ''; }

  function posterCard(item, i) {
    if (item.kind === 'seeAllLibrary') return '<button class="card poster see-all" data-focus data-t="' + i + '">See all →</button>';
    if (item.isLibraryItem && !item.poster) return mediaFallback(item, 'data-t="' + i + '"' + wkAttr(item));
    return '<button class="card poster" data-focus data-t="' + i + '"' + wkAttr(item) + '>' +
      (item.poster ? imgTag(item.poster, 'w342', true) : '') +
      fallbackSpan(item.name, item.year ? ' (' + item.year + ')' : '') + '</button>';
  }

  // ---------- ratings ----------
  // Scores from IMDb, Rotten Tomatoes, Metacritic and Letterboxd (through
  // MDBList, when it's set up in mediastorm), with the age rating, runtime and
  // genres, on the same line as the year.
  function ratingsHtml(title) {
    if (!title) return '';
    var by = {};
    (title.ratings || []).forEach(function (r) { if (r && r.source && r.value > 0) by[String(r.source).toLowerCase()] = r; });
    function icon(name) { return '<img src="' + esc(Api.staticUrl('rating_icons/' + name + '.png')) + '" alt="" onerror="this.remove()">'; }
    function pct(r) { return Math.round(r.max && r.max !== 100 ? r.value / r.max * 100 : r.value) + '%'; }
    function score(r, scale) { var v = r.max && r.max !== scale ? r.value / r.max * scale : r.value; return scale === 100 ? String(Math.round(v)) : v.toFixed(1); }
    var out = [];
    if (by.imdb) out.push(['imdb', score(by.imdb, 10), 'IMDb']);
    if (by.tomatoes) out.push([pct(by.tomatoes).replace('%', '') >= 60 ? 'rt_critics' : 'rt_rotten', pct(by.tomatoes), 'Rotten Tomatoes']);
    if (by.audience) out.push(['rt_audience', pct(by.audience), 'Audience']);
    if (by.metacritic) out.push(['metacritic', score(by.metacritic, 100), 'Metacritic']);
    if (by.letterboxd) out.push(['letterboxd', score(by.letterboxd, 5), 'Letterboxd']);
    if (!out.length && by.tmdb) out.push(['tmdb', score(by.tmdb, 10), 'TMDB']);
    var html = out.map(function (o) { return '<span class="rating" title="' + esc(o[2]) + '">' + icon(o[0]) + esc(o[1]) + '</span>'; }).join('');
    var extra = [];
    if (title.certification) extra.push('<span class="cert">' + esc(title.certification) + '</span>');
    if (title.runtimeMinutes > 0) extra.push(esc(Math.floor(title.runtimeMinutes / 60) ? Math.floor(title.runtimeMinutes / 60) + 'h ' + (title.runtimeMinutes % 60) + 'm' : title.runtimeMinutes + 'm'));
    if (title.genres && title.genres.length) extra.push(esc(title.genres.slice(0, 2).join(', ')));
    return html + (extra.length ? '<span class="rating-extra">' + extra.join('<i>·</i>') + '</span>' : '');
  }
  function addRatings(title) {
    var el = document.getElementById('title-ratings');
    if (el) el.innerHTML = ratingsHtml(title);
  }

  // ---------- watchlist ----------
  // + Watchlist on film and series pages. The list is the profile's own in
  // mediastorm, so it's the same one your other apps show.
  var wlCache = null;   // { at, list }
  function watchlistNow(fresh) {
    if (!fresh && wlCache && Date.now() - wlCache.at < 60000) return Promise.resolve(wlCache.list);
    return Api.watchlist(profile.id).then(function (l) { wlCache = { at: Date.now(), list: Array.isArray(l) ? l : [] }; return wlCache.list; },
      function () { return (wlCache && wlCache.list) || []; });
  }
  function wlEntryFor(item, list) {
    return list.filter(function (w) {
      if (!w) return false;
      if (w.id === item.titleId) return true;
      var x = w.externalIds || {};
      if ((w.mediaType === 'movie') !== (item.kind === 'movie')) return false;
      return (item.tvdb && x.tvdb === String(item.tvdb)) || (item.tmdb && x.tmdb === String(item.tmdb)) || (item.imdb && x.imdb === item.imdb);
    })[0] || null;
  }
  async function addWatchlistButton(item, title) {
    var actions = document.getElementById('actions');
    if (!actions || actions.querySelector('.wl-btn')) return;
    var b = document.createElement('button');
    b.className = 'btn wl-btn'; b.setAttribute('data-focus', ''); b.textContent = '+ Watchlist';
    var after = actions.querySelector('.trailer-btn') || actions.querySelector('.btn:not(.primary):not(.quiet)');
    actions.insertBefore(b, after ? after.nextSibling : null);
    var entry = wlEntryFor(item, await watchlistNow());
    var goodName = (title && title.name) || cleanName(item.name);
    if (entry && entry.name && entry.name !== goodName && cleanName(entry.name) !== entry.name) {
      var fixed = {}; for (var f in entry) fixed[f] = entry[f];
      fixed.name = goodName;
      Api.addToWatchlist(profile.id, fixed).then(function () { entry = fixed; wlCache = null; homeStale = true; }, function () {});
    }
    function draw() { b.textContent = entry ? '✓ On watchlist' : '+ Watchlist'; b.classList.toggle('on', !!entry); }
    draw();
    var busy = false;
    b.addEventListener('click', async function () {
      if (busy) return;
      busy = true;
      var mt = item.kind === 'movie' ? 'movie' : 'series';
      try {
        if (entry) {
          await Api.removeFromWatchlist(profile.id, entry.mediaType || mt, entry.id || item.titleId);
          entry = null;
          toast('Removed ' + item.name + ' from your watchlist.');
        } else {
          var t = title || {}, x = {};
          if (item.imdb) x.imdb = String(item.imdb);
          if (item.tmdb) x.tmdb = String(item.tmdb);
          if (item.tvdb) x.tvdb = String(item.tvdb);
          var body = { id: item.titleId, mediaType: mt, name: (title && title.name) || cleanName(item.name), year: +item.year || 0, overview: item.overview || '',
                       posterUrl: item.poster || '', backdropUrl: item.backdrop || '', externalIds: x,
                       genres: t.genres || [], runtimeMinutes: t.runtimeMinutes || 0 };
          var saved2 = await Api.addToWatchlist(profile.id, body);
          entry = (saved2 && saved2.id) ? saved2 : body;
          toast('Added ' + item.name + ' to your watchlist.');
        }
        wlCache = null;
        homeStale = true;
        draw();
      } catch (e) { toast('Couldn\'t change your watchlist: ' + e.message, 'warn'); }
      busy = false;
    });
  }

  // ---------- trailers ----------
  // mediastorm lists trailers (mostly YouTube) with each title. They play in
  // YouTube's embedded player inside the app; if YouTube refuses that, they
  // open in the TV's YouTube app instead.
  function trailerKey(title) {
    var list = [];
    if (title && title.primaryTrailer) list.push(title.primaryTrailer);
    list = list.concat((title && title.trailers) || []);
    var yt = list.filter(function (t) { return t && /youtube/i.test((t.site || '') + ' ' + (t.url || '')); });
    yt.sort(function (a, b) {
      var score = function (t) { return (/trailer/i.test(t.type || t.name || '') ? 2 : 0) + (t.official ? 1 : 0); };
      return score(b) - score(a);
    });
    var t = yt[0];
    if (!t) return null;
    if (t.key && /^[\w-]{6,}$/.test(t.key)) return t.key;
    var m = String(t.url || t.embedUrl || '').match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
    return m ? m[1] : null;
  }
  async function addTrailerButton(item, title) {
    var key = trailerKey(title), actions = document.getElementById('actions');
    if (!actions || actions.querySelector('.trailer-btn')) return;
    if (!key) {   // usually not in the details: ask mediastorm for the trailers themselves
      var t = await Api.trailers(item, profile.id).catch(function () { return null; });
      key = trailerKey(t);
      if (!key || !document.body.contains(actions) || actions.querySelector('.trailer-btn')) return;
    }
    var b = document.createElement('button');
    b.className = 'btn trailer-btn'; b.setAttribute('data-focus', ''); b.textContent = 'Trailer';
    b.addEventListener('click', function () { playTrailer(item, key); });
    var choose = actions.querySelector('.btn:not(.primary):not(.quiet)');
    actions.insertBefore(b, choose ? choose.nextSibling : null);
  }

  var ytBridge = null;   // kept so the call isn't dropped before it answers
  function openInYouTubeApp(item, key) {
    function failed(why) {
      choiceBox('Couldn\'t play the trailer', 'YouTube wouldn\'t play it here, and the TV\'s YouTube app couldn\'t be opened' +
        (why ? ' (' + why + ')' : '') + '. Is the YouTube app installed?', []);
    }
    if (typeof PalmServiceBridge === 'undefined') { failed('not running on a webOS TV'); return; }
    try {
      ytBridge = new PalmServiceBridge();
      ytBridge.onservicecallback = function (msg) {
        var r = {}; try { r = JSON.parse(msg); } catch (e) { /* ignore */ }
        if (r.returnValue === false) failed(r.errorText || 'refused');
      };
      ytBridge.call('luna://com.webos.applicationManager/launch',
        JSON.stringify({ id: 'youtube.leanback.v4', params: { contentTarget: 'v=' + key } }));
      toast('Opening the trailer in YouTube. Back or the home bar brings you back here.');
    } catch (e) { failed(e.message); }
  }

  // YouTube only plays embedded videos on pages from a real website (otherwise
  // "Error 153"), and the app runs from the TV itself. So trailers play inside
  // a small page hosted on GitHub Pages (docs/trailer.html in the repo), shown
  // full-screen here. If that fails, the trailer opens in the TV's YouTube app.
  // No default here on purpose: a build with no trailerPage set just offers
  // the YouTube app instead of trying to embed, rather than quietly relying
  // on someone else's GitHub Pages hosting without them having chosen to.
  var TRAILER_PAGE = (cfg && cfg.trailerPage) || '';
  function playTrailer(item, key) {
    // No trailer page configured: the same "leaving the app is your call"
    // offer as a failed embed gets, rather than building a broken one with
    // nowhere to point it.
    if (!TRAILER_PAGE) {
      choiceBox('This trailer won\'t play here', 'It can be opened in the TV\'s YouTube app instead. ' +
        'Back or the home bar brings you back here afterwards.', [
        { label: 'Open in YouTube', fn: function () { openInYouTubeApp(item, key); } }
      ]);
      return;
    }
    var back = document.activeElement, prevBack = Nav.currentBack ? Nav.currentBack() : null;
    var box = document.createElement('div');
    box.id = 'trailer';
    box.innerHTML = '<iframe allow="autoplay; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" ' +
      'src="' + esc(TRAILER_PAGE + (TRAILER_PAGE.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(key)) + '"></iframe>' +
      '<div class="trailer-keep" tabindex="0" data-focus></div>' +
      '<div class="trailer-hint">' + esc(item.name) + ' · trailer. OK pauses, Back closes</div>';
    document.body.appendChild(box);
    var frame = box.querySelector('iframe'), keep = box.querySelector('.trailer-keep');
    Nav.setScope(box);
    keep.focus();
    var playing = false, done = false, lastHeard = Date.now();
    function send(cmd, extra) {
      var m = { ms: 'trailer', cmd: cmd };
      for (var k in extra || {}) m[k] = extra[k];
      try { frame.contentWindow.postMessage(m, '*'); } catch (e) { /* not ready */ }
    }
    function onMessage(e) {
      var d = e.data;
      if (!d || d.ms !== 'trailer' || done || e.source !== frame.contentWindow) return;
      lastHeard = Date.now();   // any word from the page counts as "it's doing something"
      if (d.event === 'playing') playing = true;
      else if (d.event === 'ended') close();
      else if (d.event === 'error') fallback();
    }
    window.addEventListener('message', onMessage);
    // A pre-roll ad can run a while before the trailer itself starts, and
    // doesn't always trigger the same "now playing" signal the trailer does,
    // so a single short timer can give up mid-ad. This instead waits for a
    // stretch of true silence from the page — any message at all, including
    // through an ad, pushes the deadline back — and only falls back once
    // nothing's been heard for a while.
    var watchdog = setInterval(function () {
      if (playing) { clearInterval(watchdog); return; }
      if (Date.now() - lastHeard > 25000) { clearInterval(watchdog); fallback(); }
    }, 1000);
    var refocus = setInterval(function () { if (document.activeElement !== keep) keep.focus(); }, 400);   // keep the remote's keys here
    function onKey(e) {
      var k = e.keyCode;
      e.preventDefault(); e.stopImmediatePropagation();
      if (k === 461 || k === 27 || k === 8) close();
      else if (k === 13 || k === 415 || k === 19 || k === 10252) send('toggle');
      else if (k === 37 || k === 412) send('seekBy', { by: -10 });
      else if (k === 39 || k === 417) send('seekBy', { by: 10 });
    }
    document.addEventListener('keydown', onKey, true);
    function close() {
      if (done) return;
      done = true;
      clearInterval(watchdog); clearInterval(refocus);
      window.removeEventListener('message', onMessage);
      document.removeEventListener('keydown', onKey, true);
      if (box.parentNode) box.parentNode.removeChild(box);
      Nav.setScope(view);
      Nav.onBack(prevBack);
      if (back && document.body.contains(back)) Nav.focus(back); else Nav.first();
    }
    // Leaving the app is the user's call: ask first.
    function fallback() {
      if (done) return;
      close();
      choiceBox('This trailer won\'t play here', 'It can be opened in the TV\'s YouTube app instead. ' +
        'Back or the home bar brings you back here afterwards.', [
        { label: 'Open in YouTube', fn: function () { openInYouTubeApp(item, key); } }
      ]);
    }
  }

  // Adds the Cast row (and In this collection, for films) below the fold of a
  // film or series page. Moving down into it slides the page up.
  async function addTitleExtras(item, details) {
    var title = details || await titleDetailsCached(item);
    var main = document.getElementById('play-main');
    if (!main || !document.body.contains(main)) return;
    if (title && title.name && title.name !== item.name) {
      item.name = title.name;
      var h1 = view.querySelector('.title-body h1');
      if (h1) h1.textContent = title.name;
    }
    addRatings(title);
    addTrailerButton(item, title);
    addWatchlistButton(item, title);
    var cast = castOf(title);
    var others = [];
    if (item.kind === 'movie' && title && title.collection && title.collection.id) {
      var col = await Api.collectionDetails(title.collection.id, profile.id).catch(function () { return null; });
      if (!document.body.contains(main)) return;
      others = ((col && col.movies) || []).map(fromTitle).filter(function (m) { return m.titleId !== item.titleId; });
      others.colName = (col && col.name) || title.collection.name || 'this collection';
    }
    var tmdbId = (title && title.tmdbId) || item.tmdb;
    var similar = [];
    if (tmdbId) {
      var sim = await Api.similar(item.kind === 'movie' ? 'movie' : 'series', tmdbId, profile.id).catch(function () { return null; });
      if (!document.body.contains(main)) return;
      var seenSim = {};
      similar = ((Array.isArray(sim) ? sim : (sim && (sim.titles || sim.items || sim.results))) || [])
        .map(function (t) { return t && t.title && !t.id ? t.title : t; })
        .filter(function (t) { return t && t.id && t.id !== item.titleId && !seenSim[t.id] && (seenSim[t.id] = true); })
        .map(fromTitle).slice(0, 20);
    }
    if (!cast.length && !others.length && !similar.length) return;
    // Films have room for the rows on screen, under the Play buttons; series
    // keep them below the fold, past the episodes.
    var film = item.kind === 'movie';
    var html = '<div class="title-extras' + (film ? ' film' : '') + '" data-vscroll><div class="rows-layer">' +
      (cast.length ? '<section class="row"><h2>Cast</h2><div class="row-track">' + cast.map(personCard).join('') + '</div></section>' : '') +
      (others.length ? '<section class="row"><h2>' + esc('In ' + others.colName) + '</h2><div class="row-track">' + others.map(posterCard).join('') + '</div></section>' : '') +
      (similar.length ? '<section class="row"><h2>More like this</h2><div class="row-track">' +
        similar.map(function (t, i) { return posterCard(t, 'm' + i); }).join('') + '</div></section>' : '') +
      '</div></div>';
    view.insertAdjacentHTML('beforeend', html + (film ? '' :
      '<div class="extras-hint">▼ ' + (cast.length ? 'Cast and more' : others.length ? esc('More in ' + others.colName) : 'More like this') + '</div>'));
    var box = view.querySelector('.title-extras');
    paintWatchedPosters(box);
    if (film) {   // start just under the buttons, however tall the title and text are
      var ROW_H = 330, a = document.getElementById('actions').getBoundingClientRect();
      if (a.bottom + 24 + ROW_H > window.innerHeight) {
        // A long title or text: shrink them so a whole row of cast still fits.
        var body = view.querySelector('.title-body');
        body.classList.add('tight');
        moreTag(body.querySelector('.overview'), item.name, function () { return item.overview; });
        a = document.getElementById('actions').getBoundingClientRect();
      }
      box.style.top = Math.round(a.bottom + 24) + 'px';
    }
    var keep = titleReturn;
    function backHere() { titleReturn = keep; renderTitle(item); }
    box.querySelectorAll('[data-p]').forEach(function (b) {
      b.addEventListener('click', function () { openPerson(cast[+b.getAttribute('data-p')], backHere); });
    });
    box.querySelectorAll('[data-t]').forEach(function (b) {
      var k = b.getAttribute('data-t');
      b.addEventListener('click', function () { openTitle(k.charAt(0) === 'm' ? similar[+k.slice(1)] : others[+k], backHere); });
    });
  }
  // The page slides up while focus is in the extras, and back when it leaves.
  view.addEventListener('focusin', function (e) {
    if (!view.classList.contains('screen-title')) { view.classList.remove('extras-on'); return; }
    view.classList.toggle('extras-on', !!(e.target.closest && e.target.closest('.title-extras:not(.film)')));
    view.scrollTop = 0; document.documentElement.scrollTop = 0; document.body.scrollTop = 0;
  });

  // A person's page: photo, a short bio, and what else they've been in, as
  // rows of films and series. Back returns to wherever they were opened from.
  var personCache = {};
  async function openPerson(p, back) {
    Nav.onBack(function () { if (back) back(); else renderHome(); });
    show(HOME_PILL + '<div class="person-head"><div class="person-photo">' + (p.photo ? imgTag(p.photo, 'w342', false) : '') + '</div>' +
      '<div><h1>' + esc(p.name) + '</h1><p class="meta" id="person-meta">' + esc(p.character ? 'Plays ' + p.character : '') + '</p>' +
      '<p class="bio" id="person-bio"></p></div></div>' +
      '<div id="person-rows" data-vscroll><div class="rows-layer"><p class="muted" style="margin-left:var(--pad)">Loading</p></div></div>', 'screen-person');
    Nav.focus(document.getElementById('go-home'));
    var key = String(p.id);
    if (!personCache[key]) personCache[key] = Api.personDetails(p.id, profile.id).catch(function (e) { delete personCache[key]; return { error: e }; });
    var d = await personCache[key];
    var layer = view.querySelector('#person-rows .rows-layer');
    if (!layer) return;   // left the page while loading
    if (!d || d.error) {
      Nav.focus(document.getElementById('go-home'));
      layer.innerHTML = '<p class="error" style="margin-left:var(--pad)">Couldn\'t load ' + esc(p.name) + '\'s films and series.</p>';
      return;
    }
    var info = d.person || {};
    var bits = [];
    if (info.knownFor) bits.push(info.knownFor === 'Acting' ? 'Actor' : info.knownFor);
    if (info.birthday) bits.push('Born ' + info.birthday.slice(0, 4) + (info.placeOfBirth ? ', ' + info.placeOfBirth : ''));
    document.getElementById('person-meta').textContent = bits.join(' · ') || (p.character ? 'Plays ' + p.character : '');
    document.getElementById('person-bio').textContent = info.biography || '';
    var seen = {}, all = (d.filmography || []).filter(function (t) {
      if (!t || !t.id || t.mediaType === 'person' || seen[t.id]) return false;
      return (seen[t.id] = true);
    }).map(fromTitle);
    var films = all.filter(function (t) { return t.kind === 'movie'; }).slice(0, 30);
    var series = all.filter(function (t) { return t.kind !== 'movie'; }).slice(0, 30);
    var list = [];
    function row(name, items) {
      if (!items.length) return '';
      var start = list.length;
      list = list.concat(items);
      return '<section class="row"><h2>' + esc(name) + '</h2><div class="row-track">' +
        items.map(function (it, i) { return posterCard(it, start + i); }).join('') + '</div></section>';
    }
    layer.innerHTML = (row('Films', films) + row('Series', series)) ||
      '<p class="muted" style="margin-left:var(--pad)">Nothing else listed for ' + esc(p.name) + '.</p>';
    paintWatchedPosters(layer);
    function backToPerson() { openPerson(p, back); }
    layer.querySelectorAll('[data-t]').forEach(function (b) {
      b.addEventListener('click', function () { openTitle(list[+b.getAttribute('data-t')], backToPerson); });
    });
    var firstCard = layer.querySelector('[data-t]');
    if (firstCard) Nav.focus(firstCard); else Nav.focus(document.getElementById('go-home'));
  }

  // Remove from Continue watching is an option in the ⋯ menu (a separate
  // button made the row run off the screen).
  function continueChoice(item, afterRemove) {
    if (!inContinue(item)) return [];
    return [{ label: 'Remove from Continue watching', fn: function () { askRemoveContinue(item, afterRemove || function () {}); } }];
  }


  async function renderMovie(item, message) {
    Nav.onBack(function () { goBackFromTitle(); });
    show(titleShell(item, message), 'screen-title');
    moreTag(view.querySelector('.title-body .overview'), item.name, function () { return item.overview; });
    var actions = document.getElementById('actions');
    var main = document.getElementById('play-main');
    main.addEventListener('click', function () { play(item, { resume: true }); });
    var choose = pickerButton(function () { renderPicker(item, null, function () { renderMovie(item); }); });
    actions.appendChild(choose);
    addTitleExtras(item);
    Nav.first();
    var over = null;
    async function applyProgress() {
      var p = await Api.getProgress(profile.id, 'movie', item.titleId).catch(function () { return null; });
      if (!document.body.contains(main)) return;
      var hadFocus = document.activeElement;
      if (p && p.position > 30 && p.percentWatched < 95) {
        main.textContent = 'Resume from ' + fmtTime(p.position);
        if (!over) {
          over = document.createElement('button');
          over.className = 'btn'; over.setAttribute('data-focus', ''); over.textContent = 'Play from the start';
          over.addEventListener('click', function () { play(item, { resume: false, startAt: 0 }); });
          actions.insertBefore(over, choose);
        }
      } else {
        main.textContent = 'Play';
        if (over) {
          if (hadFocus === over) Nav.focus(main);
          over.parentNode.removeChild(over); over = null;
        }
      }
    }
    livePage = {
      item: item, node: main,
      restore: function (message, played, from) {
        setPageMessage(message);
        Nav.focus(from && document.body.contains(from) ? from : main);
        setTimeout(applyProgress, RESTORE_REFRESH_MS);
      }
    };
    function showFilmWatched(on) {
      var row = view.querySelector('.meta-row'), tag = row && row.querySelector('.watched-tag');
      if (!row) return;
      if (on && !tag) { tag = document.createElement('span'); tag.className = 'watched-tag'; tag.textContent = '✓ Watched'; row.insertBefore(tag, row.firstChild); }
      else if (!on && tag) tag.parentNode.removeChild(tag);
    }
    watchedKeysNow().then(function (set) { if (document.body.contains(main)) showFilmWatched(filmWatched(set, filmKeys(item))); });
    var filmMore = document.createElement('button');
    filmMore.className = 'btn more-btn'; filmMore.setAttribute('data-focus', ''); filmMore.textContent = '⋯';
    filmMore.setAttribute('aria-label', 'More');
    actions.appendChild(filmMore);
    filmMore.addEventListener('click', async function () {
      var w = await Api.watchedItem(profile.id, 'movie', item.titleId).catch(function () { return null; });
      var isW = !!(w && (w.watched === true || (w.item && w.item.watched === true))) ||
                filmWatched(await watchedKeysNow(), filmKeys(item));
      choiceBox(item.name, 'Your other mediastorm apps will see this too.', [{
        label: isW ? 'Mark as unwatched' : 'Mark as watched',
        fn: async function () {
          var x = {};
          if (item.imdb) x.imdb = String(item.imdb);
          if (item.tmdb) x.tmdb = String(item.tmdb);
          if (item.tvdb) x.tvdb = String(item.tvdb);
          try {
            await Api.markWatched(profile.id, { mediaType: 'movie', itemId: item.titleId, name: item.name, year: +item.year || 0, watched: !isW, externalIds: x });
            homeStale = true;
            watchedSet = null;   // fetch it fresh next time
            showFilmWatched(!isW);
            toast((isW ? 'Unmarked ' : 'Marked ') + item.name + (isW ? '.' : ' as watched.'));
            applyProgress();
          } catch (e) { toast('Couldn\'t change that: ' + e.message, 'warn'); }
        }
      }].concat(continueChoice(item)));
    });
    applyProgress();
  }

  // Series: seasons along one row, that season's episodes along the next.
  // Moving along the seasons switches the episodes; the focused episode's
  // description shows underneath.
  async function renderSeries(item, message, focusEpisode) {
    Nav.onBack(function () { goBackFromTitle(); });
    show(titleShell(item, message,
      '<div class="series-browse">' +
        '<div class="row-track seasons" id="seasons" data-down="#episodes .card"><span class="muted">Loading episodes</span></div>' +
        '<div class="row-track episodes" id="episodes" data-up=".tab.current"></div>' +
        '<p class="ep-overview" id="ep-overview"></p>' +
      '</div>'), 'screen-title');
    moreTag(view.querySelector('.title-body .overview'), item.name, function () { return item.overview; });
    var main = document.getElementById('play-main');
    main.textContent = item.next ? 'Play S' + item.next.season + ' E' + item.next.episode + (item.next.title ? ': ' + item.next.title : '') : 'Play next episode';
    main.addEventListener('click', function () {
      var n = item.next, e = n && findEp(n.season, n.episode);
      if (e && !aired(e)) { notOutYet(e); return; }
      play(item, { resume: true, episode: item.next });
    });
    // Choose release acts on the episode you last rested on, or the next one.
    var pickFor = item.next || null;
    var choose = pickerButton(function () {
      var ep = pickFor || item.next;
      if (!ep) { toast('Pick an episode first, then choose a release for it.'); return; }
      renderPicker(item, ep, function () { renderSeries(item, null, ep); });
    });
    document.getElementById('actions').appendChild(choose);
    function labelChoose() { choose.textContent = pickFor ? 'Choose release: S' + pickFor.season + ' E' + pickFor.episode : 'Choose release'; }
    labelChoose();
    Nav.first();

    // Details come from memory if this series was opened (or rested on) before;
    // watch history arrives separately and fills in the badges when it lands.
    var watchP = Promise.all([
      watchStateFor(item),
      Api.progressList(profile.id).catch(function () { return []; }),
      freshWatchedKeys()
    ]);
    var details = await seriesDetailsCached(item);
    if (!document.body.contains(main)) return;   // left the page while loading
    if (details && !details.error) { fillIds(item, details.title); addTitleExtras(item, details.title || null); }
    if (!details || details.error || !details.seasons) {
      document.getElementById('seasons').innerHTML = '<span class="muted">Couldn\'t load the episode list.</span>';
      return;
    }

    var watched = {}, partial = {};
    var seasons = details.seasons.filter(function (se) { return se.episodes && se.episodes.length; })
      .sort(function (a, b) { return (a.number === 0) - (b.number === 0) || a.number - b.number; });
    if (!seasons.length) { document.getElementById('seasons').innerHTML = '<span class="muted">No episodes listed yet.</span>'; return; }

    function seasonFor(target) {
      return seasons.filter(function (se) { return target && se.number === target.season; })[0] ||
        seasons.filter(function (se) { return details.preferredSeason != null && se.number === details.preferredSeason; })[0] ||
        seasons.filter(function (se) { return se.number > 0; })[0] || seasons[0];
    }
    var startSeason = seasonFor(focusEpisode || item.next);

    var seasonsEl = document.getElementById('seasons');
    seasonsEl.innerHTML = seasons.map(function (se, i) {
      return '<button class="tab" data-focus data-season="' + i + '">' + esc(se.number === 0 ? 'Specials' : 'Season ' + se.number) + '</button>';
    }).join('');

    var shownSeason = -1, seasonTimer = null;
    function showSeason(idx, force) {
      if (idx === shownSeason && !force) return;
      var focusedEp = force ? document.activeElement && document.activeElement.getAttribute('data-ep') : null;
      var keepScroll = force ? document.getElementById('episodes').scrollLeft : 0;
      shownSeason = idx;
      seasonsEl.querySelectorAll('.tab').forEach(function (t, i) { t.classList.toggle('current', i === idx); });
      var se = seasons[idx];
      document.getElementById('episodes').innerHTML = se.episodes.map(function (ep, i) {
        var key = ep.seasonNumber + ':' + ep.episodeNumber;
        var img = ep.image && ep.image.url;
        var pct = partial[key];
        var out = aired(ep);
        return '<button class="card ep' + (out ? '' : ' unaired') + '" data-focus data-ep="' + i + '">' +
          (img ? imgTag(img, 'w500', true) : '') +
          fallbackSpan('E' + ep.episodeNumber) +
          (watched[key] ? '<i class="seen">Watched</i>' : '') +
          '<span class="card-label"><em class="num">E' + ep.episodeNumber + '</em>' +
            (out ? esc(ep.name || 'Episode ' + ep.episodeNumber) : esc('Airs ' + dayLabel(String(ep.airedDate).slice(0, 10)))) + '</span>' +
          (pct ? '<i class="bar"><b style="width:' + Math.min(100, pct) + '%"></b></i>' : '') +
          '</button>';
      }).join('');
      var epsEl = document.getElementById('episodes');
      epsEl.scrollLeft = keepScroll;
      epsEl.querySelectorAll('.card').forEach(function (c) {
        c.addEventListener('click', function () {
          var ep = se.episodes[+c.getAttribute('data-ep')];
          if (!aired(ep)) { notOutYet(ep); return; }
          play(item, { resume: true, episode: { season: ep.seasonNumber, episode: ep.episodeNumber, title: ep.name || '', aired: (ep.airedDate || '').slice(0, 10) } });
        });
        c.onhold = function () { episodeMenu(se, se.episodes[+c.getAttribute('data-ep')]); };
      });
      if (focusedEp != null) { var again = epsEl.querySelector('[data-ep="' + focusedEp + '"]'); if (again) again.focus({ preventScroll: true }); }
    }

    // Marking watched: hold OK on an episode, or More on the page for the season.
    function epUpdate(ep, isWatched) {
      var x = {};
      if (item.imdb) x.imdb = String(item.imdb);
      if (item.tmdb) x.tmdb = String(item.tmdb);
      if (item.tvdb) x.tvdb = String(item.tvdb);
      return { mediaType: 'episode', seriesId: item.titleId, seriesName: item.name, seasonNumber: ep.seasonNumber,
               episodeNumber: ep.episodeNumber, name: ep.name || '', watched: isWatched, externalIds: x };
    }
    // The episode after the last one watched (specials aside), if it's out.
    function nextFromWatched() {
      var all = [];
      seasons.forEach(function (se) { if (se.number > 0) all = all.concat(se.episodes); });
      var last = -1;
      all.forEach(function (ep, i) { if (watched[ep.seasonNumber + ':' + ep.episodeNumber]) last = i; });
      if (last < 0) return null;
      var n = all[last + 1];
      var today = localDate(new Date());
      if (!n || (n.airedDate && String(n.airedDate).slice(0, 10) > today)) return null;
      return { season: n.seasonNumber, episode: n.episodeNumber, title: n.name || '' };
    }
    function refreshWatch() {
      homeStale = true;
      return Promise.all([
        watchStateFor(item),
        Api.progressList(profile.id).catch(function () { return []; }),
      freshWatchedKeys()
      ]).then(function (w) { applyWatch(w, true); });
    }
    // Episodes that haven't aired yet can't be marked watched. Ones with no
    // date at all (common on older shows) are treated as out.
    function findEp(season, episode) {
      for (var i = 0; i < seasons.length; i++) {
        if (seasons[i].number !== season) continue;
        for (var j = 0; j < seasons[i].episodes.length; j++) if (seasons[i].episodes[j].episodeNumber === episode) return seasons[i].episodes[j];
      }
      return null;
    }
    function epLabel(ep) { return (ep.seasonNumber === 0 ? 'Special ' : 'S' + ep.seasonNumber + ' ') + 'E' + ep.episodeNumber; }
    // An episode that isn't out yet: say when it's due, rather than searching for releases.
    function notOutYet(ep) {
      var when = ep.airedDate ? dayLabel(String(ep.airedDate).slice(0, 10)) : '';
      var epObj = { season: ep.seasonNumber, episode: ep.episodeNumber, title: ep.name || '', aired: String(ep.airedDate || '').slice(0, 10) };
      choiceBox('Not out yet', epLabel(ep) + (ep.name ? ', ' + ep.name + ',' : '') + ' airs ' + (when || 'soon') + '.', [{
        label: 'Search anyway',
        fn: function () { var keep = titleReturn; renderPicker(item, epObj, function () { titleReturn = keep; renderTitle(item, null, epObj); }); }
      }]);
    }
    function aired(ep) {
      var d = String(ep && ep.airedDate || '').slice(0, 10);
      return !d || d <= localDate(new Date());
    }
    async function markEpisodes(eps, isWatched, what) {
      if (isWatched) eps = eps.filter(aired);
      if (!eps.length) { toast('Those episodes haven\'t aired yet.'); return; }
      try {
        if (eps.length === 1) await Api.markWatched(profile.id, epUpdate(eps[0], isWatched));
        else {
          var ups = eps.map(function (ep) { return epUpdate(ep, isWatched); });
          for (var i = 0; i < ups.length; i += 50) await Api.markWatchedBulk(profile.id, ups.slice(i, i + 50));
        }
        eps.forEach(function (ep) { var k = ep.seasonNumber + ':' + ep.episodeNumber; if (isWatched) { watched[k] = true; delete partial[k]; } else delete watched[k]; });
        paintWatch();
        toast((isWatched ? 'Marked ' : 'Unmarked ') + what + (isWatched ? ' as watched.' : '.'));
        refreshWatch();
      } catch (e) { toast('Couldn\'t change that: ' + e.message, 'warn'); }
    }
    function seasonName(se) { return se.number === 0 ? 'the specials' : 'Season ' + se.number; }
    function episodeMenu(se, ep) {
      if (!ep) return;
      var key = ep.seasonNumber + ':' + ep.episodeNumber, isW = !!watched[key];
      if (!aired(ep) && !isW) {
        choiceBox((ep.seasonNumber === 0 ? 'Special ' : 'S' + ep.seasonNumber + ' ') + 'E' + ep.episodeNumber + (ep.name ? ': ' + ep.name : ''),
          'This episode hasn\'t aired yet' + (ep.airedDate ? ': it\'s out ' + dayLabel(String(ep.airedDate).slice(0, 10)) : '') + '.', []);
        return;
      }
      var label = (ep.seasonNumber === 0 ? 'Special ' : 'S' + ep.seasonNumber + ' ') + 'E' + ep.episodeNumber + (ep.name ? ': ' + ep.name : '');
      // Watched up to here: this episode, the ones before it, and every earlier
      // season (specials aside, unless this is one).
      var idx = se.episodes.indexOf(ep), before = [];
      if (se.number > 0) seasons.forEach(function (o) { if (o.number > 0 && o.number < se.number) before = before.concat(o.episodes); });
      before = before.concat(se.episodes.slice(0, idx + 1)).filter(aired);
      var earlierSeasons = before.length > idx + 1;
      // Unwatched from here: this episode, the rest of its season, and every
      // later season (specials aside, unless this is one); only those marked.
      var after = se.episodes.slice(idx);
      if (se.number > 0) seasons.forEach(function (o) { if (o.number > se.number) after = after.concat(o.episodes); });
      after = after.filter(function (e) { return watched[e.seasonNumber + ':' + e.episodeNumber]; });
      var choices = [{ label: isW ? 'Mark as unwatched' : 'Mark as watched', fn: function () { markEpisodes([ep], !isW, label); } }];
      if (isW && after.length > 1) choices.push({ label: 'Unwatched from here', fn: function () { markEpisodes(after, false, after.length + ' episodes, from ' + label); } });
      if (!isW && (idx > 0 || earlierSeasons)) choices.push({ label: 'Watched up to here', fn: function () { markEpisodes(before, true, before.length + ' episodes, up to ' + label + ','); } });
      var seasonAllW = se.episodes.filter(aired).every(function (e) { return watched[e.seasonNumber + ':' + e.episodeNumber]; });
      choices.push({ label: 'Mark ' + seasonName(se) + (seasonAllW ? ' unwatched' : ' watched'),
                     fn: function () { markEpisodes(se.episodes, !seasonAllW, seasonName(se)); } });
      choiceBox(label, 'Your other mediastorm apps will see this too.', choices);
    }
    function seasonMenu() {
      var se = seasons[shownSeason];
      if (!se) return;
      var allW = se.episodes.filter(aired).every(function (ep) { return watched[ep.seasonNumber + ':' + ep.episodeNumber]; });
      choiceBox(item.name, 'Hold OK on an episode to mark just that one.', [
        { label: (allW ? 'Mark ' + seasonName(se) + ' unwatched' : 'Mark ' + seasonName(se) + ' watched'),
          fn: function () { markEpisodes(se.episodes, !allW, seasonName(se)); } }
      ].concat(continueChoice(item)));
    }
    // Down from the buttons goes to the season you're looking at, not just the nearest tab.
    document.getElementById('actions').setAttribute('data-down', '.tab.current');
    var moreBtn = document.createElement('button');
    moreBtn.className = 'btn more-btn'; moreBtn.setAttribute('data-focus', ''); moreBtn.textContent = '⋯';
    moreBtn.setAttribute('aria-label', 'More');
    moreBtn.addEventListener('click', seasonMenu);
    document.getElementById('actions').appendChild(moreBtn);

    // Updates the Watched badges and progress bars on the cards already shown,
    // without redrawing them (and their thumbnails).
    function paintWatch() {
      var se = seasons[shownSeason];
      if (!se) return;
      document.getElementById('episodes').querySelectorAll('.card.ep').forEach(function (c) {
        var ep = se.episodes[+c.getAttribute('data-ep')];
        if (!ep) return;
        var key = ep.seasonNumber + ':' + ep.episodeNumber;
        var seen = c.querySelector('i.seen');
        if (watched[key] && !seen) {
          seen = document.createElement('i'); seen.className = 'seen'; seen.textContent = 'Watched';
          c.insertBefore(seen, c.querySelector('.card-label'));
        } else if (!watched[key] && seen) seen.parentNode.removeChild(seen);
        var bar = c.querySelector('i.bar'), pct = partial[key];
        if (pct) {
          if (!bar) { bar = document.createElement('i'); bar.className = 'bar'; bar.appendChild(document.createElement('b')); c.appendChild(bar); }
          bar.firstChild.style.width = Math.min(100, pct) + '%';
        } else if (bar) bar.parentNode.removeChild(bar);
      });
    }
    function cardFor(ep) {
      if (!ep) return null;
      var idx = -1;
      seasons.forEach(function (se, i) { if (se.number === ep.season) idx = i; });
      if (idx < 0) return null;
      if (idx !== shownSeason) showSeason(idx);
      var epIdx = -1;
      seasons[idx].episodes.forEach(function (e, i) { if (e.episodeNumber === ep.episode) epIdx = i; });
      return document.getElementById('episodes').querySelector('[data-ep="' + epIdx + '"]');
    }

    var browse = view.querySelector('.series-browse');
    browse.addEventListener('focusin', function (e) {
      var tab = e.target.closest('.tab');
      if (tab) {
        clearTimeout(seasonTimer);
        seasonTimer = setTimeout(function () { showSeason(+tab.getAttribute('data-season')); }, 180);
        return;
      }
      var card = e.target.closest('.card.ep');
      if (card) {
        var ep = seasons[shownSeason].episodes[+card.getAttribute('data-ep')];
        pickFor = { season: ep.seasonNumber, episode: ep.episodeNumber, title: ep.name || '', aired: (ep.airedDate || '').slice(0, 10) };
        labelChoose();
        var bits = [];
        if (ep.airedDate) {
          var d = new Date(ep.airedDate.slice(0, 10) + 'T12:00:00Z');
          bits.push(isNaN(d) ? ep.airedDate.slice(0, 10) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
        }
        if (ep.runtimeMinutes) bits.push(ep.runtimeMinutes + ' min');
        var el = document.getElementById('ep-overview');
        el.innerHTML = (bits.length ? '<span class="muted">' + esc(bits.join(', ')) + '</span><br>' : '') + esc(ep.overview || '');
        var epName = 'S' + ep.seasonNumber + ' E' + ep.episodeNumber + (ep.name ? ': ' + ep.name : ''), epText = ep.overview || '';
        moreTag(el, epName, function () { return epText; });
      }
    });

    showSeason(seasons.indexOf(startSeason));
    if (focusEpisode) {
      var epIdx = -1;
      startSeason.episodes.forEach(function (ep, i) { if (ep.episodeNumber === focusEpisode.episode) epIdx = i; });
      var card = document.getElementById('episodes').querySelector('[data-ep="' + epIdx + '"]');
      if (card) Nav.focus(card);
    }

    livePage = {
      item: item, node: main,
      restore: function (message, played, from) {
        setPageMessage(message);
        var target = played ? cardFor(played) : null;
        Nav.focus(target || (from && document.body.contains(from) ? from : main));
        setTimeout(function () {
          if (!document.body.contains(main)) return;
          Promise.all([
            watchStateFor(item),
            Api.progressList(profile.id).catch(function () { return []; }),
      freshWatchedKeys()
          ]).then(function (w) { applyWatch(w, true); });
        }, RESTORE_REFRESH_MS);
      }
    };

    var firstWatch = await watchP;
    applyWatch(firstWatch, false);
    // The details may have brought more IDs for the show; if nothing was found
    // under the ones known at first, look again with all of them.
    var fw = firstWatch && firstWatch[0];
    if (!(fw && fw.watchedEpisodes && Object.keys(fw.watchedEpisodes).length) && seriesIdsFor(item).length > 1 && document.body.contains(main)) {
      var w2 = await Promise.all([watchStateFor(item), Promise.resolve(firstWatch[1]), Promise.resolve(firstWatch[2])]);
      var f2 = w2[0];
      if (f2 && f2.watchedEpisodes && Object.keys(f2.watchedEpisodes).length) applyWatch(w2, false);
    }

    // Watch history: mark watched and part-watched episodes, and update the
    // Play button to the real next episode.
    function applyWatch(w, again) {
    if (!document.body.contains(main)) return;
    watched = {}; partial = {};
    var watch = w[0], progressAll = w[1] || [], keys = w[2] || null;
    if (watch && watch.watchedEpisodes) {
      Object.keys(watch.watchedEpisodes).forEach(function (k) {
        var e = watch.watchedEpisodes[k];
        if (e && e.episodeNumber > 0) watched[e.seasonNumber + ':' + e.episodeNumber] = true;
      });
    }
    // Also mediastorm's plain watched list, which lists every watched episode
    // under each of its IDs: this catches episodes its per-show summary misses.
    if (keys) {
      var bases = seriesIdsFor(item).map(function (id) { return 'episode:' + String(id).toLowerCase() + ':'; });
      seasons.forEach(function (se) {
        se.episodes.forEach(function (ep) {
          var tail = 's' + Util.pad2(ep.seasonNumber) + 'e' + Util.pad2(ep.episodeNumber);
          if (bases.some(function (b) { return keys[b + tail]; })) watched[ep.seasonNumber + ':' + ep.episodeNumber] = true;
        });
      });
    }
    // mediastorm stores episode IDs in lower case ("…:s01e04"), so match either way.
    var prefixes = seriesIdsFor(item).map(function (id) { return String(id).toLowerCase() + ':s'; });
    var resumeAt = {};
    (Array.isArray(progressAll) ? progressAll : []).forEach(function (p) {
      var pid = String(p.itemId || '').toLowerCase();
      if (p.mediaType !== 'episode' || !prefixes.some(function (px) { return pid.indexOf(px) === 0; })) return;
      var m = /:s(\d+)e(\d+)$/.exec(pid);
      if (m && p.percentWatched > 1 && p.percentWatched < 95) {
        partial[(+m[1]) + ':' + (+m[2])] = p.percentWatched;
        if (p.position > 30) resumeAt[(+m[1]) + ':' + (+m[2])] = p.position;
      }
    });
    var next = (watch && watch.nextEpisode && watch.nextEpisode.episodeNumber > 0)
      ? { season: watch.nextEpisode.seasonNumber, episode: watch.nextEpisode.episodeNumber, title: watch.nextEpisode.title || '' }
      : nextFromWatched() || item.next;
    if (next) {
      item.next = next;
      var at = resumeAt[next.season + ':' + next.episode], nextEp = findEp(next.season, next.episode);
      main.textContent = nextEp && !aired(nextEp) && nextEp.airedDate
        ? 'S' + next.season + ' E' + next.episode + ' airs ' + dayLabel(String(nextEp.airedDate).slice(0, 10))
        : (at ? 'Resume S' + next.season + ' E' + next.episode + ' from ' + fmtTime(at)
              : 'Play S' + next.season + ' E' + next.episode + (next.title ? ': ' + next.title : ''));
      document.getElementById('title-meta').textContent = metaLine(item);
      if ((again || !focusEpisode) && document.activeElement === main) { pickFor = next; labelChoose(); }
    }
    // On first opening, if you haven't moved yet, open the season with the next episode in it.
    var untouched = !again && document.activeElement === main && !focusEpisode;
    var nextIdx = seasons.indexOf(seasonFor(next));
    if (untouched && nextIdx !== shownSeason) showSeason(nextIdx);
    else paintWatch();
    }
  }

  // Series details rarely change, so they're kept for the session and can be
  // fetched ahead of time while you rest on a series on the home screen.
  var detailsCache = {};
  function seriesDetailsCached(item) {
    var key = item.titleId;
    if (!detailsCache[key]) {
      detailsCache[key] = Api.seriesDetails(item, profile.id).catch(function (e) {
        delete detailsCache[key];
        return { error: e };
      });
    }
    return detailsCache[key];
  }

  // The episode after this one, from the series' episode list: carries on
  // into the next season, and skips specials and episodes not aired yet.
  async function nextEpisodeAfter(item, ep) {
    if (!ep || !(ep.season > 0)) return null;
    var details = await seriesDetailsCached(item);
    if (!details || details.error || !details.seasons) return null;
    var today = new Date().toISOString().slice(0, 10);
    var list = [];
    details.seasons.filter(function (se) { return se.number > 0 && se.episodes; })
      .sort(function (a, b) { return a.number - b.number; })
      .forEach(function (se) {
        se.episodes.slice().sort(function (a, b) { return a.episodeNumber - b.episodeNumber; })
          .forEach(function (e) { list.push({ season: e.seasonNumber || se.number, episode: e.episodeNumber, title: e.name || '', aired: e.airedDate }); });
      });
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.season > ep.season || (e.season === ep.season && e.episode > ep.episode)) {
        if (e.aired && e.aired.slice(0, 10) > today) return null;
        return { season: e.season, episode: e.episode, title: e.title };
      }
    }
    return null;
  }

  // Back from a title returns to wherever it was opened from.
  var titleReturn = null;
  function goBackFromTitle() {
    var back = titleReturn; titleReturn = null;
    if (back) back(); else renderHome();
  }
  function openTitle(item, from) {
    titleReturn = from || null;
    renderTitle(item);
  }

  function play(item, opts) {
    ignoreHeldOK();
    var keepReturn = titleReturn;
    var from = document.activeElement;
    Player.start({
      item: item, episode: opts.episode || null, profileId: profile.id, clientId: saved.clientId,
      resume: opts.resume, startAt: opts.startAt, manual: opts.manual || null,
      nextEpisode: item.kind === 'movie' ? null : function (ep) { return nextEpisodeAfter(item, ep); },
      cast: function () { return titleDetailsCached(item).then(castOf); },
      onPerson: function (person, played) {   // picked from the cast while paused: progress is already saved
        homeStale = true;
        openPerson(person, function () { titleReturn = keepReturn; renderTitle(item, null, played && played.episode); });
      },
      onExit: function (message, played) {
        homeStale = true;   // watch history changed: refresh quietly next time home shows
        titleReturn = keepReturn;
        var page = livePage;
        if (page && page.item === item && document.body.contains(page.node) && view.classList.contains('screen-title')) {
          Nav.onBack(function () { goBackFromTitle(); });
          page.restore(null, played && played.episode, from);
        } else renderTitle(item, null, played && played.episode);
        if (message) showPlayError(item, (played && played.episode) || opts.episode || null, message);
      }
    });
  }


  // ---------- release picker ----------
  function pickerButton(onClick) {
    var b = document.createElement('button');
    b.className = 'btn'; b.setAttribute('data-focus', ''); b.textContent = 'Choose release';
    b.addEventListener('click', onClick);
    return b;
  }

  // Release names carry most of what matters; this turns the common tags into
  // plain labels.
  function has(name, re) { return new RegExp('(^|[^a-z0-9])(' + re + ')([^a-z0-9]|$)', 'i').test(name); }
  function describeRelease(r) {
    var n = String(r.title || ''), attrs = r.attributes || {};
    var main = [], extra = [];
    var res = has(n, '2160p|4k|uhd') ? '4K' : has(n, '1080p') ? '1080p' : has(n, '720p') ? '720p' : has(n, '576p|480p|sd') ? 'SD' : (attrs.resolution || '');
    if (res) main.push(res);
    var source = has(n, 'remux') ? 'Remux' : has(n, 'web-?dl') ? 'WEB-DL' : has(n, 'web-?rip') ? 'WEBRip' :
      has(n, 'blu-?ray|bdrip|brrip') ? 'Blu-ray' : has(n, 'web') ? 'WEB' : has(n, 'hdtv') ? 'HDTV' : '';
    if (source) main.push(source);
    if (has(n, 'dv|dovi|dolby[ .]?vision') || attrs.hasDV === 'true') main.push('Dolby Vision');
    if (has(n, 'hdr10\\+|hdr10p|hdr10plus')) main.push('HDR10+');
    else if (has(n, 'hdr10|hdr')) main.push('HDR');
    else if (has(n, 'hlg')) main.push('HLG');
    var codec = has(n, 'x265|h\\.?265|hevc') ? 'HEVC' : has(n, 'x264|h\\.?264|avc') ? 'H.264' : has(n, 'av1') ? 'AV1' : '';
    if (codec) extra.push(codec);
    // Audio tags are often glued to the channel count (DDP5.1, AAC2.0), so these
    // only need a non-letter in front.
    var tag = function (re) { return new RegExp('(^|[^a-z])(' + re + ')', 'i').test(n); };
    var audio = tag('truehd') ? 'TrueHD' : tag('dts-?hd[ .]?ma') ? 'DTS-HD MA' : tag('dts[-:]?x(?![a-z])') ? 'DTS:X' :
      tag('ddp|dd\\+|e-?ac-?3') ? 'Dolby Digital Plus' : tag('dd(?=[0-9 .]|$)|ac-?3') ? 'Dolby Digital' : tag('dts') ? 'DTS' :
      tag('aac') ? 'AAC' : tag('flac') ? 'FLAC' : tag('opus') ? 'Opus' : '';
    var ch = (/(^|[^0-9])([257]\.[01])([^0-9]|$)/.exec(n) || [])[2];
    if (audio) extra.push(audio + (ch ? ' ' + ch : '') + (has(n, 'atmos') ? ' Atmos' : ''));
    var langs = [];
    if (has(n, 'multi')) langs.push('Multi-language');
    if (has(n, 'dual')) langs.push('Dual audio');
    [['french|truefrench|vff|vfq|vf2', 'French'], ['german|ger', 'German'], ['ita|italian', 'Italian'],
     ['spa|spanish|castellano|latino', 'Spanish'], ['nordic', 'Nordic'], ['hindi', 'Hindi'], ['jpn|japanese', 'Japanese'],
     ['kor|korean', 'Korean'], ['rus|russian', 'Russian'], ['pol|polish', 'Polish'], ['dutch|nl', 'Dutch']]
      .forEach(function (l) { if (has(n, l[0])) langs.push(l[1]); });
    if (!langs.length && attrs.languages) langs.push(attrs.languages);
    var group = (/-([A-Za-z0-9]+)(\.(mkv|mp4))?$/.exec(n) || [])[1] || '';
    var debrid = /debrid/i.test(r.serviceType || '');
    return {
      main: main, extra: extra, langs: langs, group: group, debrid: debrid,
      service: debrid ? debridName(attrs.provider || attrs.debridProvider) : 'Usenet',
      size: r.sizeBytes ? (r.sizeBytes / 1073741824).toFixed(1) + ' GB' : ''
    };
  }

  // Debrid releases often don't say which service will provide them until
  // they're resolved; mediastorm then uses whichever has it first.
  function debridName(provider) {
    var p = String(provider || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!p) return 'Debrid';
    return { torbox: 'TorBox', realdebrid: 'Real-Debrid', rd: 'Real-Debrid', alldebrid: 'AllDebrid',
             premiumize: 'Premiumize', debridlink: 'Debrid-Link' }[p] || provider;
  }

  var plainReason = Util.plainReason;
  var scoresSupported = null;   // whether this server has the scored search
  // A short "why it ranks here" from mediastorm's scoring breakdown.
  function rankingWhy(r) {
    var b = (r && r.scoreBreakdown) || [];
    var good = b.filter(function (x) { return x && x.points > 0 && (x.reason || x.criterion); })
      .sort(function (p, q) { return q.points - p.points; }).slice(0, 3)
      .map(function (x) {
        var t = plainReason(x.reason || x.criterion).replace(/^matches preferred terms\s*/i, '').replace(/\s*\(weight \d+\)$/, '');
        return t.length > 44 ? t.slice(0, 42) + '…' : t;
      });
    return good.join(' · ');
  }
  async function renderPicker(item, episode, back) {
    Nav.onBack(back);
    var heading = esc(item.name) + (episode ? '<span>S' + episode.season + ' E' + episode.episode + (episode.title ? ', ' + esc(episode.title) : '') + '</span>' : '');
    show('<div class="picker"><h1>' + heading + '</h1>' +
      '<p class="lede" id="picker-status">Searching your indexers</p>' +
      '<div class="picker-list" id="picker-list"></div></div>', 'screen-picker');

    var pad2 = Util.pad2;
    var query = item.name + (episode ? ' S' + pad2(episode.season) + 'E' + pad2(episode.episode) : '');
    // Specials (season 0) are often named by title or air date, so search those too.
    var special = episode && episode.season === 0, keyWords = [], dateKey = '', part = null;
    var queries = [{ q: query, ids: true }];
    if (special) {
      var t = String(episode.title || '').trim();
      part = (t.match(/\((\d+)\)\s*$/) || [])[1] || null;
      var bare = t.replace(/\s*\((\d+)\)\s*$/, '');
      // Words that pick out this special's releases: in its title, not the show's name.
      var nameWords = item.name.toLowerCase().split(/[^a-z0-9]+/);
      var COMMON = ['the', 'and', 'of', 'a', 'in', 'on', 'to', 'part', 'special', 'murder', 'episode'];
      keyWords = bare.toLowerCase().split(/[^a-z0-9]+/).filter(function (w) {
        return w.length > 2 && COMMON.indexOf(w) < 0 && nameWords.indexOf(w) < 0;
      });
      if (/^\d{4}-\d{2}-\d{2}$/.test(episode.aired || '')) dateKey = episode.aired;
      // Best guesses first. The special's own words, like an indexer search for
      // "rikki neave", find it however its releases are numbered (All 4 called
      // that one S04E01); with the show's name in the query, mediastorm
      // recognises the series and searches all of it instead.
      queries = [];
      if (keyWords.length) {
        if (part) queries.push({ q: keyWords.join(' ') + ' Part ' + part });
        queries.push({ q: keyWords.join(' ') });
      }
      queries.push({ q: query, ids: true });
      if (bare) {
        queries.push({ q: item.name + ' ' + bare });
        if (part) queries.push({ q: item.name + ' ' + bare + ' S01E' + pad2(+part) });   // listed as its own show
      }
      if (dateKey) queries.push({ q: item.name + ' ' + dateKey.replace(/-/g, '.') });
      document.getElementById('picker-status').textContent = 'Searching for this special by name, number and air date';
    }

    // For a special, keep only releases that name it or its air date (and the
    // right part of a two-parter); the rest are usually other episodes.
    var d1 = dateKey.replace(/-/g, '.'), d2 = dateKey.replace(/-/g, ' ');
    function matches(r) {
      var n = String(r.title || '').toLowerCase(), flat = ' ' + n.replace(/[^a-z0-9]+/g, ' ') + ' ';
      if (part) { var m = flat.match(/ part (\d+) /); if (m && +m[1] !== +part) return false; }
      if (dateKey && (n.indexOf(d1) >= 0 || flat.indexOf(' ' + d2 + ' ') >= 0 || n.indexOf(dateKey) >= 0)) return true;
      return keyWords.length > 0 && keyWords.every(function (w) { return flat.indexOf(' ' + w + ' ') >= 0; });
    }
    var filterSpecial = special && (keyWords.length || dateKey);

    // Searches go two at a time, and stop once a special has been found, so
    // indexers aren't hit with a burst (they slow down or refuse when they are).
    var list = [], seenRel = {}, failed = null, firstError = null, scoresOk = scoresSupported;
    function add(res) {
      (Array.isArray(res) ? res : (res && res.results) || []).forEach(function (r) {
        var k = r.guid || r.link || r.downloadUrl || r.title;
        if (k && seenRel[k]) return;
        if (k) seenRel[k] = true;
        list.push(r);
      });
    }
    for (var qi = 0; qi < queries.length; qi += 2) {
      var batch = queries.slice(qi, qi + 2);
      var got = await Promise.all(batch.map(function (q) {
        var o = { query: q.q, mediaType: item.kind === 'movie' ? 'movie' : 'series', userId: profile.id,
          clientId: saved.clientId, imdbId: q.ids ? item.imdb : null, titleId: q.ids ? item.titleId : null, year: q.ids ? item.year : null };
        var go = q.ids && scoresOk !== false
          ? Api.scoredReleases(o).then(function (res) { scoresOk = true; return res; },
              function (e) { if (e && (e.status === 404 || e.status === 405 || e.status === 403)) { scoresOk = false; return Api.releases(o); } throw e; })
          : Api.releases(o);
        return go.catch(function (e) { firstError = firstError || e; return []; });
      }));
      if (view.className !== 'screen-picker') return;   // went back while searching
      got.forEach(add);
      if (!filterSpecial || list.some(matches)) break;
    }
    if (scoresOk !== null) scoresSupported = scoresOk;
    if (!list.length && firstError) failed = firstError;
    var picker = document.getElementById('picker-list');
    function searchAgainButton() {
      var again = document.createElement('button');
      again.className = 'btn primary'; again.setAttribute('data-focus', ''); again.textContent = 'Search again';
      again.addEventListener('click', function () { renderPicker(item, episode, back); });
      picker.appendChild(again);
      return again;
    }
    if (failed) {
      document.getElementById('picker-status').textContent = 'The search failed: ' + failed.message;
      Nav.focus(searchAgainButton());
      return;
    }
    if (special) query = 'this special';
    var others = [];
    if (filterSpecial) {
      others = list.filter(function (r) { return !matches(r); });
      list = list.filter(matches);
    }

    // mediastorm's own ranking order, which already reflects your Usenet versus
    // debrid priority. Releases its filters would skip go last.
    function rank(r) { return r.filterStatus === 'filtered' ? 1 : 0; }
    var ordered = list.map(function (r, i) { return { r: r, i: i }; })
      .sort(function (a, b) { return rank(a.r) - rank(b.r) || a.i - b.i; })
      .map(function (x) { return x.r; });
    if (!ordered.length) {
      document.getElementById('picker-status').textContent = others.length
        ? 'No releases name this special or its air date. The ' + others.length + ' found are other episodes of the series.'
        : 'No releases found for ' + query + '. Indexers sometimes miss a search, so it\'s worth trying again.';
      var again = searchAgainButton();
      if (others.length) {
        var showAll = document.createElement('button');
        showAll.className = 'btn'; showAll.setAttribute('data-focus', ''); showAll.textContent = 'Show them anyway';
        showAll.addEventListener('click', function () {
          picker.innerHTML = '';
          drawList(others.map(function (r, i) { return { r: r, i: i }; })
            .sort(function (x, y) { return rank(x.r) - rank(y.r) || x.i - y.i; }).map(function (x) { return x.r; }));
        });
        picker.appendChild(showAll);
      }
      Nav.focus(again);
      return;
    }
    drawList(ordered);
    function drawList(ordered) {
      var passed = ordered.filter(function (r) { return r.filterStatus !== 'filtered'; }).length;
      document.getElementById('picker-status').textContent = ordered.length + (ordered.length === 1 ? ' release' : ' releases') +
        (passed < ordered.length ? ', ' + (ordered.length - passed) + ' of them filtered out by your mediastorm settings' : '') + '.';

      var box = document.getElementById('picker-list');
      box.innerHTML = ordered.map(function (r, i) {
        var d = describeRelease(r);
        var filtered = r.filterStatus === 'filtered';
        var tags = d.main.map(function (t) { return '<b>' + esc(t) + '</b>'; }).join('');
        var meta = [d.service, d.size].concat(d.extra, d.langs, d.group ? [d.group] : []).filter(Boolean)
          .map(function (t) { return '<i>' + esc(t) + '</i>'; }).join('');
        return '<button class="release' + (filtered ? ' filtered' : '') + (d.debrid ? ' debrid' : '') + '" data-focus data-r="' + i + '">' +
          '<span class="tags">' + (tags || '<b>Unknown quality</b>') + '</span>' +
          '<span class="meta-tags">' + meta + '</span>' +
          (filtered ? '<span class="why">Filtered: ' + esc(r.filterReason || 'excluded by your settings') + '</span>'
                    : (rankingWhy(r) ? '<span class="why good">Ranked for: ' + esc(rankingWhy(r)) + '</span>' : '')) +
          '<span class="name">' + esc(r.title || '') + '</span></button>';
      }).join('');
      box.querySelectorAll('.release').forEach(function (b) {
        b.addEventListener('click', function () {
          var chosen = ordered[+b.getAttribute('data-r')];
          // If your pick fails, the app falls back to the next releases mediastorm would use.
          var rest = ordered.filter(function (r) { return r !== chosen && r.filterStatus !== 'filtered'; });
          titleReturn = titleReturn || null;
          play(item, { resume: true, episode: episode, manual: { releases: [chosen].concat(rest) } });
        });
      });
      Nav.focus(box.querySelector('.release'));
    }
  }

  // ---------- screensaver ----------
  // After the home screen sits idle for a while, a full-screen backdrop
  // slideshow takes over, panning slowly and crossfading, the way Apple TV's
  // own screensaver does — nothing functional, just a bit of delight. Any
  // key press ends it and returns to the home screen exactly as it was.
  var SS_IDLE_MS = 90000, SS_HOLD_MS = 9000, SS_FADE_MS = 1800;
  var ssTimer = null, ssOn = false;
  function ssReset() {
    clearTimeout(ssTimer);
    ssTimer = setTimeout(ssMaybeStart, SS_IDLE_MS);
  }
  function ssBusy() {
    return ssOn || view.className !== 'screen-home' || document.getElementById('player').className === 'on' ||
      !!document.getElementById('confirm') || !!document.getElementById('trailer');
  }
  function ssPictures() {
    var seen = {}, out = [];
    ((homeData && homeData.rows) || []).forEach(function (row) {
      row.items.forEach(function (it) {
        // A poster (tall) rather than a backdrop (wide) always ends up
        // cropped in tight to fill the screen. Every card already falls back
        // to the poster when there's no real backdrop (for the hero panel
        // elsewhere), so that fallback has to be detected and skipped here,
        // not just a missing field.
        var img = it.backdrop && it.backdrop !== it.poster ? it.backdrop : '';
        if (img && it.key && !seen[it.key]) { seen[it.key] = true; out.push(img); }
      });
    });
    for (var i = out.length - 1; i > 0; i--) {   // a light shuffle, so it's not the same order every time
      var j = Math.floor(Math.random() * (i + 1)), t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }
  function ssMaybeStart() {
    if (ssBusy()) { ssReset(); return; }   // not the right moment: just check again later
    var pics = ssPictures();
    if (pics.length < 2) { ssReset(); return; }
    ssStart(pics);
  }
  function ssStart(pics) {
    ssOn = true;
    var el = document.createElement('div');
    el.id = 'screensaver';
    el.innerHTML = '<div class="ss-pic" id="ss-a"></div><div class="ss-pic" id="ss-b"></div>';
    document.body.appendChild(el);
    var idx = -1, front = 'a', advance = null;
    function show() {
      idx++;
      var back = front === 'a' ? 'b' : 'a';
      var layer = document.getElementById('ss-' + back);
      if (!layer) return;
      layer.style.transition = 'none';
      layer.style.opacity = '0';
      layer.style.transform = 'scale(1) translate(0%, 0%)';
      layer.style.backgroundImage = 'url("' + tmdbSize(pics[idx % pics.length], 'original') + '")';
      void layer.offsetWidth;   // force the above to apply before transitioning back in
      var dx = (Math.random() * 5 - 2.5).toFixed(1), dy = (Math.random() * 3 - 1.5).toFixed(1);
      layer.style.transition = 'opacity ' + SS_FADE_MS + 'ms ease, transform ' + (SS_HOLD_MS + SS_FADE_MS) + 'ms linear';
      layer.style.opacity = '1';
      layer.style.transform = 'scale(1.08) translate(' + dx + '%, ' + dy + '%)';
      layer.style.zIndex = '2';
      document.getElementById('ss-' + front).style.zIndex = '1';
      front = back;
    }
    show();
    advance = setInterval(show, SS_HOLD_MS);
    function dismiss(e) {
      e.preventDefault(); e.stopImmediatePropagation();
      clearInterval(advance);
      document.removeEventListener('keydown', dismiss, true);
      if (el.parentNode) el.parentNode.removeChild(el);
      ssOn = false;
      ssReset();
    }
    document.addEventListener('keydown', dismiss, true);
  }
  document.addEventListener('keydown', ssReset, true);   // any key anywhere pushes the idle clock back

  // ---------- genres ----------
  // TMDB's genres (films and series use slightly different lists), and a page
  // of popular titles for each, loading more as you scroll.
  var FILM_GENRES = [[28, 'Action'], [12, 'Adventure'], [16, 'Animation'], [35, 'Comedy'], [80, 'Crime'], [99, 'Documentary'],
    [18, 'Drama'], [10751, 'Family'], [14, 'Fantasy'], [36, 'History'], [27, 'Horror'], [10402, 'Music'], [9648, 'Mystery'],
    [10749, 'Romance'], [878, 'Science Fiction'], [53, 'Thriller'], [10752, 'War'], [37, 'Western']];
  var SERIES_GENRES = [[10759, 'Action & Adventure'], [16, 'Animation'], [35, 'Comedy'], [80, 'Crime'], [99, 'Documentary'],
    [18, 'Drama'], [10751, 'Family'], [10762, 'Kids'], [9648, 'Mystery'], [10764, 'Reality'], [10765, 'Sci-Fi & Fantasy'],
    [10766, 'Soap'], [10767, 'Talk'], [10768, 'War & Politics'], [37, 'Western']];
  var genreFocus = null;   // the tile to return to
  function renderGenres() {
    Nav.onBack(function () { renderHome(); });
    function tiles(list, type) {
      return list.map(function (g) {
        return '<button class="chip genre" data-focus data-gt="' + type + '" data-gid="' + g[0] + '">' + esc(g[1]) + '</button>';
      }).join('');
    }
    show(HOME_PILL + '<div class="genres-page"><h1>Genres</h1>' +
      '<div class="suggest"><h3>Films</h3>' + tiles(FILM_GENRES, 'movie') + '</div>' +
      '<div class="suggest"><h3>Series</h3>' + tiles(SERIES_GENRES, 'series') + '</div></div>', 'screen-genres');
    view.querySelectorAll('[data-gid]').forEach(function (b) {
      b.addEventListener('click', function () {
        var type = b.getAttribute('data-gt'), id = +b.getAttribute('data-gid');
        genreFocus = type + ':' + id;
        renderGenre(type, id, b.textContent);
      });
    });
    var back = genreFocus && view.querySelector('[data-gt="' + genreFocus.split(':')[0] + '"][data-gid="' + genreFocus.split(':')[1] + '"]');
    Nav.focus(back || view.querySelector('[data-gid]'));
  }
  var GENRE_PAGE = 42;   // six rows of seven
  async function renderGenre(type, id, name, state) {
    state = state || { items: [], total: null, loading: false, focus: 0 };
    Nav.onBack(function () { renderGenres(); });
    // Like the home screen: the focused title's backdrop, name, year and
    // description across the top, the posters below.
    show(HOME_PILL + '<div class="genre-label">' + esc(name) + ' <span>' + (type === 'movie' ? 'films' : 'series') + '</span></div>' +
      '<div id="hero" class="genre-hero"><div class="hero-art"><img id="hero-a" alt="" decoding="async"><img id="hero-b" alt="" decoding="async"></div>' +
      '<div class="hero-text"><h1 id="hero-title"></h1><p class="meta" id="hero-meta"></p><p class="overview" id="hero-overview"></p></div></div>' +
      '<div class="genre-page"><div class="genre-grid" id="genre-grid"></div><p class="muted" id="genre-status"></p></div>', 'screen-genre');
    var grid = document.getElementById('genre-grid'), status = document.getElementById('genre-status');
    var front = 'a', heroWait = null;
    function hero(it) {
      if (!document.getElementById('hero-title')) return;
      document.getElementById('hero-title').textContent = it.name;
      document.getElementById('hero-meta').textContent = metaLine(it);
      document.getElementById('hero-overview').textContent = it.overview || '';
      var full = it.backdrop || it.poster || '';
      setTint(full);
      var src = tmdbSize(full, 'w1280'), f = document.getElementById('hero-' + front), bk = document.getElementById('hero-' + (front === 'a' ? 'b' : 'a'));
      if (!src) { f.className = ''; return; }
      if (f.getAttribute('src') === src) return;
      bk.onload = function () { bk.className = 'on'; f.className = ''; front = front === 'a' ? 'b' : 'a'; };
      bk.onerror = function () { if (bk.getAttribute('src') !== full) bk.src = full; else f.className = ''; };
      bk.src = src;
    }
    grid.addEventListener('focusin', function (e) {
      var c = e.target.closest('[data-t]');
      if (!c) return;
      var it = state.items[+c.getAttribute('data-t')];
      if (!it) return;
      document.getElementById('hero-title').textContent = it.name;   // the name straight away
      clearTimeout(heroWait);
      heroWait = setTimeout(function () { hero(it); }, 300);          // the backdrop once you settle
    });
    function draw(from) {
      var html = state.items.slice(from).map(function (it, k) { return posterCard(it, from + k); }).join('');
      grid.insertAdjacentHTML('beforeend', html);
      grid.querySelectorAll('[data-t]').forEach(function (c) {
        if (c._wired) return;
        c._wired = true;
        var i = +c.getAttribute('data-t');
        c.addEventListener('click', function () {
          state.focus = i;
          openTitle(state.items[i], function () { renderGenre(type, id, name, state); });
        });
        // Nearing the end of what's loaded: fetch the next page.
        c.addEventListener('focus', function () { if (i >= state.items.length - 14) more(); });
      });
      paintWatchedPosters(grid);
    }
    async function more() {
      if (state.loading || (state.total != null && state.items.length >= state.total)) return;
      state.loading = true;
      if (!state.items.length) status.textContent = 'Loading';
      var r = await Api.discoverGenre(type, id, GENRE_PAGE, state.items.length, profile.id).catch(function (e) { return { error: e }; });
      state.loading = false;
      if (!document.body.contains(grid)) return;   // left the page
      if (!r || r.error) { if (!state.items.length) status.textContent = 'Couldn\'t load ' + name + ': ' + ((r && r.error && r.error.message) || 'no reply'); return; }
      var seen = {};
      state.items.forEach(function (it) { seen[it.titleId] = true; });
      var got = (r.items || []).map(function (x) { return x && x.title ? fromTitle(x.title) : null; })
        .filter(function (it) { return it && !seen[it.titleId] && (seen[it.titleId] = true); });
      state.total = typeof r.total === 'number' ? r.total : (got.length ? null : state.items.length);
      if (!got.length) state.total = state.items.length;   // nothing new: stop asking
      var from = state.items.length;
      state.items = state.items.concat(got);
      status.textContent = state.items.length ? '' : 'Nothing in ' + name + ' right now.';
      draw(from);
      if (from === 0) Nav.focus(grid.querySelector('[data-t]'));
    }
    if (state.items.length) {
      draw(0);
      var again = grid.querySelector('[data-t="' + state.focus + '"]');
      Nav.focus(again || grid.querySelector('[data-t]'));
    } else await more();
  }

  // ---------- a library's full list ----------
  // Reached from "See all" on a home row that's showing only the newest 20.
  var LIB_PAGE = 42;
  async function renderLibraryPage(lib, state) {
    state = state || { items: [], total: null, loading: false, focus: 0 };
    Nav.onBack(function () { renderHome(); });
    show(HOME_PILL + '<div class="genre-label">' + esc(lib.name) + '</div>' +
      '<div id="hero" class="genre-hero"><div class="hero-art"><img id="hero-a" alt="" decoding="async"><img id="hero-b" alt="" decoding="async"></div>' +
      '<div class="hero-text"><h1 id="hero-title"></h1><p class="meta" id="hero-meta"></p><p class="overview" id="hero-overview"></p></div></div>' +
      '<div class="genre-page"><div class="genre-grid" id="genre-grid"></div><p class="muted" id="genre-status"></p></div>', 'screen-genre');
    var grid = document.getElementById('genre-grid'), status = document.getElementById('genre-status');
    var front = 'a', heroWait = null;
    function hero(it) {
      if (!document.getElementById('hero-title')) return;
      document.getElementById('hero-title').textContent = it.name;
      document.getElementById('hero-meta').textContent = metaLine(it);
      document.getElementById('hero-overview').textContent = it.overview || '';
      var full = it.backdrop || it.poster || '';
      setTint(full);
      var f = document.getElementById('hero-' + front), bk = document.getElementById('hero-' + (front === 'a' ? 'b' : 'a'));
      if (!full) { f.className = ''; return; }
      if (f.getAttribute('src') === full) return;
      bk.onload = function () { bk.className = 'on'; f.className = ''; front = front === 'a' ? 'b' : 'a'; };
      bk.onerror = function () { f.className = ''; };
      bk.src = full;
    }
    grid.addEventListener('focusin', function (e) {
      var c = e.target.closest('[data-t]');
      if (!c) return;
      var it = state.items[+c.getAttribute('data-t')];
      if (!it) return;
      document.getElementById('hero-title').textContent = it.name;
      clearTimeout(heroWait);
      heroWait = setTimeout(function () { hero(it); }, 300);
    });
    function draw(from) {
      var html = state.items.slice(from).map(function (it, k) { return posterCard(it, from + k); }).join('');
      grid.insertAdjacentHTML('beforeend', html);
      grid.querySelectorAll('[data-t]').forEach(function (c) {
        if (c._wired) return;
        c._wired = true;
        var i = +c.getAttribute('data-t');
        c.addEventListener('click', function () {
          state.focus = i;
          playLibraryItem(state.items[i], c);
        });
        c.addEventListener('focus', function () { if (i >= state.items.length - 14) more(); });
      });
      paintWatchedPosters(grid);
    }
    async function more() {
      if (state.loading || (state.total != null && state.items.length >= state.total)) return;
      state.loading = true;
      if (!state.items.length) status.textContent = 'Loading';
      var r = await Api.libraryGroups(lib.id, LIB_PAGE, state.items.length).catch(function (e) { return { error: e }; });
      state.loading = false;
      if (!document.body.contains(grid)) return;
      if (!r || r.error) { if (!state.items.length) status.textContent = 'Couldn\'t load ' + lib.name + ': ' + ((r && r.error && r.error.message) || 'no reply'); return; }
      var seen = {};
      state.items.forEach(function (it) { seen[it.libraryItemId] = true; });
      var got = ((r.groups || []).map(function (g) { return fromLibraryGroup(g, lib); }))
        .filter(function (it) { return it && !seen[it.libraryItemId] && (seen[it.libraryItemId] = true); });
      state.total = typeof r.total === 'number' ? r.total : (got.length ? null : state.items.length);
      if (!got.length) state.total = state.items.length;
      var from = state.items.length;
      state.items = state.items.concat(got);
      status.textContent = state.items.length ? '' : 'Nothing in ' + lib.name + ' yet.';
      draw(from);
      if (from === 0) Nav.focus(grid.querySelector('[data-t]'));
    }
    if (state.items.length) { draw(0); Nav.focus(grid.querySelector('[data-t="' + state.focus + '"]') || grid.querySelector('[data-t]')); }
    else await more();
  }

  // ---------- search ----------
  // Typing searches titles as before. Ask AI sends the same text to the AI set
  // up in mediastorm as a description instead ("slow-burn sci-fi like Arrival"),
  // and the suggestions offer common asks in one press. Speak listens through
  // the remote (or, where that's unavailable, opens LG's keyboard and its
  // microphone key): what's said is searched as a title, and goes to the AI
  // only if no title matches.
  var searchState = { query: '', results: [], focusKey: null, mode: 'title', aiQuery: '', status: '' };
  var KEYS = 'abcdefghijklmnopqrstuvwxyz1234567890'.split('');
  var aiCache = {};
  var keyboardClosed = null;
  var srBroken = false;   // speech recognition failed this session: use the keyboard
  var listening = null;   // { rec, finish } while Speak is listening
  // cancel = true drops what was heard (Back, leaving); false keeps it (Speak again).
  function stopListening(cancel) {
    if (!listening) return;
    var l = listening;
    try { if (cancel) l.rec.abort(); else l.rec.stop(); } catch (e) { /* already ended */ }
    if (cancel) l.finish();
  }

  function suggestions() {
    var list = [];
    var cw = homeData && homeData.rows && homeData.rows.filter(function (r) { return r.wide; })[0];
    var last = cw && cw.items[0];
    if (last) list.push('More like ' + last.name);
    return list.concat(['Feel-good comedies', 'Mind-bending sci-fi', 'Short series to binge in a weekend',
      'Hidden gems from the last few years', 'Gripping crime dramas', 'Something the whole family can watch']);
  }

  function renderSearch() {
    function leaveSearch() { stopListening(true); document.removeEventListener('keydown', typeKey); renderHome(); }
    Nav.onBack(leaveSearch);
    show(
      '<div class="search">' +
        '<div class="search-left">' +
          '<div class="search-query" id="search-query"></div>' +
          // Speak and Ask AI sit on top, so voice search is OK and talk.
          '<div class="keys">' +
            '<div class="key half voice" data-focus tabindex="0" id="speak"><span id="speak-label">Speak</span>' +
              '<input type="text" id="speak-input" autocomplete="off" spellcheck="false" aria-label="Describe what you want to watch"></div>' +
            '<button class="key half ai" data-focus id="ask-ai">Ask AI</button>' +
            KEYS.map(function (k) {
              return '<button class="key" data-focus data-k="' + k + '">' + k.toUpperCase() + '</button>';
            }).join('') +
            '<button class="key wide" data-focus data-k=" ">Space</button>' +
            '<button class="key wide" data-focus data-k="del">Delete</button>' +
            '<button class="key wide" data-focus data-k="clear">Clear</button>' +
          '</div>' +
        '</div>' +
        '<div class="search-right"><p class="search-caption" id="search-caption"></p>' +
        '<div class="search-results" id="search-results"></div></div>' +
      '</div>', 'screen-search');
    view.querySelectorAll('.key[data-k]').forEach(function (b) {
      b.addEventListener('click', function () { edit(b.getAttribute('data-k')); });
    });
    document.getElementById('ask-ai').addEventListener('click', function () {
      var q = searchState.query.trim();
      if (q.length < 3) { setStatus('Type or pick a description first, then press Ask AI.'); return; }
      runAI(q);
    });
    // Speak: OK opens LG's keyboard on a real text field; its microphone key can
    // dictate. Dictation drops a whole phrase in at once, so when that happens
    // the app waits a moment for it to finish, closes the keyboard itself and
    // sends it to the AI; no Enter needed. Typing on LG's keyboard still works:
    // Enter, or closing the keyboard, sends what's there.
    var speak = document.getElementById('speak'), speakInput = document.getElementById('speak-input');
    var lastVal = '', sent = '', dictTimer = null;
    function submitSpeak() {
      clearTimeout(dictTimer);
      if (document.activeElement !== speakInput) return;
      var v = speakInput.value.trim();
      speakInput.blur();                      // closes LG's keyboard
      Nav.focus(speak);
      if (!v || v === sent) return;
      sent = v;
      searchSpoken(v);
    }
    // What you say is treated like typing: a title search. If no title matches,
    // it was probably a description, so it goes to the AI instead. Ask AI
    // sends the same words to the AI on purpose.
    function searchSpoken(v) {
      searchState.remember = true;   // a whole spoken phrase: worth keeping if it finds something
      searchState.query = v.slice(0, 200);
      searchState.mode = 'title';
      searchState.status = '';
      drawQuery();
      clearTimeout(searchTimer);
      runSearch(searchState.query.trim(), true);
    }
    function openKeyboard() {
      speakInput.style.pointerEvents = '';
      sent = ''; lastVal = speakInput.value = '';   // a spoken request starts fresh
      speakInput.focus();
    }

    // Speak listens directly through the remote's microphone where the TV's web
    // engine offers speech recognition (webOS 25 does); otherwise, or if it
    // fails, it falls back to LG's keyboard and its microphone key.
    var SR = !srBroken && (window.SpeechRecognition || window.webkitSpeechRecognition);
    var label = document.getElementById('speak-label');
    if (SR) speakInput.style.pointerEvents = 'none';   // a pointer click listens rather than opening the keyboard
    function setListening(on) {
      listening = on ? listening : null;
      speak.classList.toggle('listening', !!on);
      label.textContent = on ? 'Listening… talk now' : 'Speak';
      Nav.onBack(on ? function () { stopListening(true); } : leaveSearch);
    }
    function listen() {
      var rec, heard = '', done = false;
      try { rec = new SR(); } catch (e) { srBroken = true; openKeyboard(); return; }
      rec.lang = (navigator.language || 'en-GB');
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      function finish() {
        if (done) return;
        done = true;
        setListening(false);
        var v = heard.trim();
        if (v) searchSpoken(v);
        else setStatus('Didn\'t catch that. Press Speak and try again.');
      }
      rec.onresult = function (e) {
        var t = '', final = false;
        for (var i = 0; i < e.results.length; i++) { t += e.results[i][0].transcript; final = e.results[i].isFinal; }
        heard = t;
        searchState.query = t.slice(0, 200); searchState.mode = 'title'; drawQuery();   // words appear as you say them
        if (final) { try { rec.stop(); } catch (x) { /* ended */ } finish(); }
      };
      rec.onerror = function (e) {
        if (done) return;
        if (/not-allowed|service-not-allowed|network|audio-capture|language-not-supported/.test(e.error)) {
          done = true; setListening(false);
          srBroken = true; speakInput.style.pointerEvents = '';
          toast('Voice search isn\'t working directly here, so Speak opens LG\'s keyboard instead. Use its microphone key.', 'warn');
          openKeyboard();
        } else if (e.error === 'aborted') { done = true; setListening(false); }
        else finish();   // no-speech and the like: use whatever was heard
      };
      rec.onend = finish;
      var before = searchState.query;
      listening = { rec: rec, finish: function () {   // cancelled: put back what was there
        done = true; setListening(false);
        searchState.query = before; drawQuery();
      } };
      setListening(true);
      setStatus('');
      try { rec.start(); } catch (e) { done = true; setListening(false); srBroken = true; openKeyboard(); }
    }
    speak.addEventListener('click', function () {
      if (listening) { stopListening(false); return; }   // pressing again stops and searches what was heard
      if (SR && !srBroken) listen(); else openKeyboard();
    });
    speakInput.addEventListener('input', function () {
      var v = speakInput.value;
      clearTimeout(dictTimer);
      if (v.trim() && v.length - lastVal.length >= 3) dictTimer = setTimeout(submitSpeak, 1200);
      lastVal = v;
    });
    speakInput.addEventListener('change', submitSpeak);
    speakInput.addEventListener('keydown', function (e) {
      if (e.keyCode === 13) { e.preventDefault(); e.stopPropagation(); submitSpeak(); }   // don't let OK press Speak again
    });
    // webOS reports when its keyboard closes; one listener, replaced on each visit.
    if (keyboardClosed) document.removeEventListener('keyboardStateChange', keyboardClosed);
    keyboardClosed = function (e) {
      if (e && e.detail && e.detail.visibility === false && speakInput.value.trim()) submitSpeak();
    };
    document.addEventListener('keyboardStateChange', keyboardClosed);
    document.removeEventListener('keydown', typeKey);
    document.addEventListener('keydown', typeKey);
    drawQuery();
    drawResults();
    var again = searchState.focusKey && view.querySelector('.card[data-key="' + (window.CSS && CSS.escape ? CSS.escape(searchState.focusKey) : searchState.focusKey) + '"]');
    if (again) Nav.focus(again); else Nav.focus(document.getElementById('speak'));
  }

  // The remote's number keys (and a USB keyboard, if one's plugged in) type directly.
  function typeKey(e) {
    if (view.className !== 'screen-search' || Player.active) return;
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    var k = e.keyCode;
    if (k >= 48 && k <= 57) edit(String.fromCharCode(k));
    else if (k >= 96 && k <= 105) edit(String(k - 96));
    else if (k >= 65 && k <= 90 && !e.ctrlKey && !e.metaKey) edit(String.fromCharCode(k).toLowerCase());
    else if (k === 32) { e.preventDefault(); edit(' '); }   // a keyboard's Space types rather than pressing the focused key
  }

  var searchTimer = null, searchSeq = 0;
  function edit(k) {
    // Typing after an AI search (or a recent one) starts a new search, rather
    // than adding letters to the end of the last one.
    if (searchState.mode === 'ai' && k !== 'del' && k !== 'clear') searchState.query = '';
    if (k === 'del') searchState.query = searchState.query.slice(0, -1);
    else if (k === 'clear') searchState.query = '';
    else if (searchState.query.length < 200) searchState.query += k;
    // Typing goes back to a title search; Ask AI is a deliberate press.
    searchState.mode = 'title';
    searchState.status = '';
    drawQuery();
    clearTimeout(searchTimer);
    searchSeq++;
    var q = searchState.query.trim();
    if (q.length < 2) { searchState.results = []; drawResults(); return; }
    searchTimer = setTimeout(function () { runSearch(q); }, 450);
  }
  function drawQuery() {
    var el = document.getElementById('search-query');
    if (!el) return;
    var tag = searchState.mode === 'ai' ? '<em class="ai-tag">AI</em>' : '';
    // Long descriptions shrink, and only the end you're typing stays in view.
    var q = searchState.query;
    el.classList.toggle('long', q.length > 22);
    var shown = q.length > 46 ? '…' + q.slice(-45) : q;
    el.innerHTML = tag + (q ? esc(shown) + '<i class="caret"></i>'
      : '<span class="muted">Title or description</span><i class="caret"></i>');
  }
  function setStatus(text) {
    searchState.status = text;
    var c = document.getElementById('search-caption');
    if (c) c.textContent = text;
  }

  async function runSearch(q, aiIfNone) {
    var seq = ++searchSeq;
    var box = document.getElementById('search-results');
    if (box && !searchState.results.length) box.innerHTML = '<p class="muted">Searching</p>';
    var res;
    try { res = await Api.search(q, profile.id); }
    catch (e) { if (seq === searchSeq && box) box.innerHTML = '<p class="error">' + esc(e.message) + '</p>'; return; }
    if (seq !== searchSeq) return;   // a newer search has started
    searchState.results = (res || []).filter(function (r) { return r.title && r.title.mediaType !== 'person'; })
      .map(function (r) { return fromTitle(r.title); });
    if (aiIfNone && !searchState.results.length && q.length >= 3) { runAI(q, true); return; }
    drawResults();
  }

  async function runAI(q, noTitles) {
    clearTimeout(searchTimer);
    searchState.remember = true;
    searchState.fellBack = !!noTitles;   // asked because no title matched what was said
    var seq = ++searchSeq;
    searchState.mode = 'ai';
    searchState.aiQuery = q;
    searchState.results = [];
    drawQuery();
    var key = profile.id + '|' + q.toLowerCase();
    var box = document.getElementById('search-results');
    if (!aiCache[key]) {
      if (box) box.innerHTML = '<p class="muted asking">' + (noTitles ? 'No titles called that, so asking AI for "' : 'Asking AI for "') + esc(q) + '"</p>';
      setStatus('');
    }
    var res;
    try { res = aiCache[key] || await Api.aiSearch(q, profile.id); }
    catch (e) {
      if (seq !== searchSeq) return;
      var m = String(e.message || '');
      if (box) box.innerHTML = '<p class="error">' + esc(/not configured/i.test(m)
        ? 'AI search isn\'t set up in mediastorm yet. Choose an AI provider under Movie & Show Information in the admin panel.'
        : 'The AI search didn\'t work: ' + m) + '</p>';
      return;
    }
    if (seq !== searchSeq) return;
    aiCache[key] = res;
    var items = (res && res.items) || [];
    searchState.results = items.filter(function (it) { return it.title && it.title.mediaType !== 'person'; })
      .map(function (it) { return fromTitle(it.title); });
    drawResults();
  }

  // ---------- recent searches ----------
  // The last six searches that found something, per profile, kept on this TV.
  // Spoken and AI searches are saved when their results arrive; typed title
  // searches when you open one of the results (so half-typed words aren't).
  function recentKey() { return STORE + '-recent-' + (profile && profile.id); }
  function readRecent() {
    try { var l = JSON.parse(localStorage.getItem(recentKey())); return Array.isArray(l) ? l : []; } catch (e) { return []; }
  }
  function writeRecent(l) { try { localStorage.setItem(recentKey(), JSON.stringify(l.slice(0, 6))); } catch (e) { /* full */ } }
  function rememberSearch(q, ai) {
    q = String(q || '').trim();
    if (q.length < 2) return;
    var l = readRecent().filter(function (x) { return x.q.toLowerCase() !== q.toLowerCase(); });
    l.unshift({ q: q, ai: !!ai });
    writeRecent(l);
  }
  function forgetSearch(i) { var l = readRecent(); l.splice(i, 1); writeRecent(l); }
  function rerunSearch(x) {
    searchState.query = x.q;
    searchState.status = '';
    searchState.remember = true;
    if (x.ai) runAI(x.q);
    else { searchState.mode = 'title'; drawQuery(); runSearch(x.q, false); }
  }

  function drawResults() {
    var box = document.getElementById('search-results');
    if (!box) return;
    var q = searchState.query.trim();
    var n = searchState.results.length;
    var caption = searchState.mode === 'ai'
      ? (n ? (searchState.fellBack ? 'No titles matched, so here are AI picks for "' : 'AI picks for "') + searchState.aiQuery + '"' : '')
      : (n ? n + (n === 1 ? ' result' : ' results') : '');
    document.getElementById('search-caption').textContent = searchState.status || caption;
    if (n && searchState.remember) {
      searchState.remember = false;
      rememberSearch(searchState.mode === 'ai' ? searchState.aiQuery : q, searchState.mode === 'ai');
    }
    if (!n) {
      if (searchState.mode === 'ai') { box.innerHTML = '<p class="muted">The AI didn\'t come up with any matches. Try wording it differently.</p>'; return; }
      if (q.length >= 2) { box.innerHTML = '<p class="muted">No films or series found for "' + esc(q) + '". Press Ask AI to describe it instead.</p>'; return; }
      // Nothing typed: your recent searches, then one-press AI asks.
      var recent = readRecent();
      box.innerHTML = (recent.length ? '<div class="suggest recent-row"><h3>Recent</h3>' + recent.map(function (x, i) {
          return '<button class="chip recent" data-focus data-rc="' + i + '">' + (x.ai ? '<i class="ai-mark">✦</i> ' : '') + esc(x.q) + '</button>';
        }).join('') + '<button class="chip quiet" data-focus id="recent-clear">Clear</button></div>' : '') +
        '<div class="suggest"><h3>Ask AI</h3>' + suggestions().map(function (t, i) {
        return '<button class="chip" data-focus data-s="' + i + '">' + esc(t) + '</button>';
      }).join('') + '</div>';
      box.querySelectorAll('[data-rc]').forEach(function (c) {
        var x = recent[+c.getAttribute('data-rc')];
        c.addEventListener('click', function () { rerunSearch(x); });
        c.onhold = function () {   // hold OK: remove it
          forgetSearch(+c.getAttribute('data-rc'));
          toast('Removed "' + x.q + '" from recent searches.');
          drawResults();
          Nav.focus(document.querySelector('#search-results [data-rc]') || document.getElementById('speak'));
        };
      });
      var clr = document.getElementById('recent-clear');
      if (clr) clr.addEventListener('click', function () {
        writeRecent([]); drawResults(); Nav.focus(document.getElementById('speak'));
      });
      var list = suggestions();
      box.querySelectorAll('.chip').forEach(function (c) {
        c.addEventListener('click', function () {
          searchState.query = list[+c.getAttribute('data-s')];
          runAI(searchState.query);
        });
      });
      return;
    }
    box.innerHTML = searchState.results.map(function (item, i) {
      return '<button class="card poster" data-focus data-r="' + i + '" data-key="' + esc(item.key) + '"' + wkAttr(item) + '>' +
        (item.poster ? imgTag(item.poster, 'w342', true) : '') +
        fallbackSpan(item.name, item.year ? ' (' + item.year + ')' : '') + '</button>';
    }).join('');
    paintWatchedPosters(box);
    box.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('focus', function () {
        var item = searchState.results[+c.getAttribute('data-r')];
        document.getElementById('search-caption').textContent =
          item.name + (item.year ? ' (' + item.year + ')' : '') + ', ' + (item.kind === 'movie' ? 'film' : 'series');
      });
      c.addEventListener('click', function () {
        var item = searchState.results[+c.getAttribute('data-r')];
        if (searchState.mode !== 'ai') rememberSearch(searchState.query, false);
        searchState.focusKey = item.key;
        document.removeEventListener('keydown', typeKey);
        openTitle(item, renderSearch);
      });
    });
  }

  // ---------- start ----------
  async function boot() {
    Api.configure({ server: saved.server || cfg.server || '', token: saved.token || '', clientId: saved.clientId });
    if (!saved.token) { renderSetup(); return; }
    // Straight to the last profile's home from what was saved, checking the
    // session and profiles in the background.
    var cachedProfiles = saved.profiles || [];
    var last = cachedProfiles.filter(function (p) { return p.id === saved.profileId; })[0];
    if (last && !last.pinLength && readHomeCacheFor(last.id)) {
      profiles = cachedProfiles;
      profile = last;
      renderHome();
      Api.profiles().then(function (list) {
        profiles = list || []; saved.profiles = profiles; save();
        var still = profiles.filter(function (p) { return p.id === last.id; })[0];
        if (!still || still.pinLength) renderProfiles();
      }).catch(function (e) {
        if (e.status === 401) { saved.token = ''; save(); renderSetup('Your session has ended. Sign in again.'); }
      });
      return;
    }
    await renderProfiles(true);
  }
  function readHomeCacheFor(id) {
    try { return Boolean(localStorage.getItem(STORE + '-home-' + id)); } catch (e) { return false; }
  }
  boot();
})();
