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
  var lastHomeKey = null;     // card to refocus when coming back home

  // ---------- helpers ----------
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(text, kind) {
    toastEl.textContent = text;
    toastEl.className = 'on ' + (kind || '');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.className = ''; }, 7000);
  }
  function fmtTime(sec) {
    sec = Math.floor(sec || 0);
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60);
    return h ? h + 'h ' + m + 'm' : m + 'm';
  }
  function show(html, scopeClass) {
    view.className = scopeClass || '';
    view.innerHTML = html;
    Nav.setScope(view);
  }

  // ---------- normalising titles from different endpoints ----------
  function ext(map, key) { return map && map[key] ? String(map[key]) : ''; }

  function fromContinue(it) {
    var isMovie = /:movie:/.test(it.seriesId || '') || (!it.nextEpisode && !(it.lastWatched && it.lastWatched.episodeNumber > 0));
    var next = null;
    if (!isMovie) {
      var ep = it.nextEpisode || it.lastWatched;
      if (ep && ep.episodeNumber > 0) next = { season: ep.seasonNumber, episode: ep.episodeNumber, title: ep.title || '' };
    }
    return {
      key: 'cw:' + it.seriesId, kind: isMovie ? 'movie' : 'series', titleId: it.seriesId,
      name: it.seriesTitle, year: it.year, overview: it.overview || (it.lastWatched && it.lastWatched.overview) || '',
      poster: it.posterUrl, backdrop: it.backdropUrl || (it.backdropUrls && it.backdropUrls[0]) || it.posterUrl,
      imdb: ext(it.externalIds, 'imdb'), tmdb: ext(it.externalIds, 'tmdb'), tvdb: ext(it.externalIds, 'tvdb'),
      next: next, percent: isMovie ? (it.resumePercent || it.percentWatched || 0) : (it.resumePercent || 0)
    };
  }
  function fromWatchlist(it) {
    return {
      key: 'wl:' + it.id, kind: it.mediaType === 'movie' ? 'movie' : 'series', titleId: it.id,
      name: it.name, year: it.year, overview: it.overview || '', poster: it.posterUrl,
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
  function metaLine(item) {
    var bits = [];
    if (item.year) bits.push(item.year);
    bits.push(item.kind === 'movie' ? 'Film' : 'Series');
    if (item.next) bits.push('Next: S' + item.next.season + ' E' + item.next.episode + (item.next.title ? ', ' + item.next.title : ''));
    return bits.join('   ');
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
      '</div>', 'screen-setup');
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
      '</div>', 'screen-profiles');
    view.querySelectorAll('.profile').forEach(function (b) {
      b.addEventListener('click', function () { chooseProfile(profiles[+b.getAttribute('data-index')]); });
    });
    document.getElementById('signout').addEventListener('click', function () {
      Api.logout().catch(function () {});
      (saved.profiles || []).forEach(function (p) { try { localStorage.removeItem(STORE + '-home-' + p.id); } catch (e) { /* ignore */ } });
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
      Api.topTen(uid).catch(function (e) { return { error: e }; })
    ]);
    if (results.every(function (r) { return r && r.error && r.error.status === 401; })) {
      var err = new Error('session'); err.status = 401; throw err;
    }
    var rows = [];
    if (Array.isArray(results[0]) && results[0].length) rows.push({ title: 'Continue watching', wide: true, items: results[0].map(fromContinue) });
    if (Array.isArray(results[1]) && results[1].length) rows.push({ title: 'Your watchlist', items: results[1].map(fromWatchlist) });
    var top = results[2] && results[2].items;
    if (Array.isArray(top) && top.length) rows.push({ title: 'Top 10 today', items: top.map(function (t) { return fromTitle(t.title); }) });
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
    // Show what's saved straight away and refresh behind it.
    if (!homeData && !refresh) {
      var cached = readHomeCache();
      if (cached) { homeData = { rows: cached.rows, failed: 0 }; homeStale = true; }
    }
    if (homeData && homeStale && !refresh) refreshHomeInBackground();
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
    var rowsHtml = homeData.rows.map(function (row) {
      return '<section class="row"><h2>' + esc(row.title) + '</h2><div class="row-track">' +
        row.items.map(function (item) {
          var i = all.push(item) - 1;
          var img = row.wide ? (item.backdrop || item.poster) : (item.poster || item.backdrop);
          var bar = row.wide && item.percent > 1 ? '<i class="bar"><b style="width:' + Math.min(100, item.percent) + '%"></b></i>' : '';
          var label = row.wide
            ? '<span class="card-label">' + esc(item.name) + (item.next ? '<em>S' + item.next.season + ' E' + item.next.episode + '</em>' : '') + '</span>'
            : '';
          return '<button class="card ' + (row.wide ? 'wide' : 'poster') + '" data-focus data-i="' + i + '" data-key="' + esc(item.key) + '">' +
            (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : '') +
            '<span class="card-fallback">' + esc(item.name) + '</span>' + label + bar + '</button>';
        }).join('') + '</div></section>';
    }).join('');

    show(
      '<div id="home"><div id="hero"><div class="hero-art"><img id="hero-a" alt="" decoding="async"><img id="hero-b" alt="" decoding="async"></div>' +
        '<div class="hero-text"><h1 id="hero-title"></h1><p class="meta" id="hero-meta"></p><p class="overview" id="hero-overview"></p></div>' +
        '<div class="home-bar"><button class="btn pill" data-focus id="home-search">Search</button>' +
        '<button class="btn pill quiet" data-focus id="home-profile">' + esc(profile.name) + '</button></div></div>' +
      '<div id="rows" data-vscroll><div class="rows-layer">' + (rowsHtml ||
        '<div class="empty">Nothing here yet. Add films and series to your watchlist in mediastorm and they\'ll appear here.</div>') + '</div></div></div>',
      'screen-home');
    document.getElementById('home-search').addEventListener('click', function () { searchState.focusKey = null; renderSearch(); });
    document.getElementById('home-profile').addEventListener('click', function () { renderProfiles(); });
    if (homeData.failed) toast('Some rows couldn\'t be loaded. Press Back and pick your profile again to retry.', 'warn');

    var heroTimer = null, heroFront = 'a';
    function setHero(item) {
      if (!document.getElementById('hero-title')) return;   // home was left before the delay ran out
      document.getElementById('hero-title').textContent = item.name;
      document.getElementById('hero-meta').textContent = metaLine(item);
      document.getElementById('hero-overview').textContent = item.overview;
      var src = item.backdrop || item.poster || '';
      var front = document.getElementById('hero-' + heroFront);
      if (front.getAttribute('src') === src) return;
      var back = document.getElementById('hero-' + (heroFront === 'a' ? 'b' : 'a'));
      back.onload = function () { back.className = 'on'; front.className = ''; heroFront = heroFront === 'a' ? 'b' : 'a'; };
      back.onerror = function () { front.className = ''; };
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
      c.addEventListener('click', function () { openTitle(all[+c.getAttribute('data-i')], null); });
    });

    var again = lastHomeKey && view.querySelector('.card[data-key="' + (window.CSS && CSS.escape ? CSS.escape(lastHomeKey) : lastHomeKey) + '"]');
    if (again) Nav.focus(again); else Nav.focus(view.querySelector('#rows .card') || view.querySelector('[data-focus]'));
  }

  // ---------- title pages ----------
  function renderTitle(item, message, focusEpisode) {
    if (item.kind === 'movie') renderMovie(item, message);
    else renderSeries(item, message, focusEpisode);
  }

  function titleShell(item, message, extra) {
    return '<div class="title-art">' + (item.backdrop ? '<img src="' + esc(item.backdrop) + '" alt="" onerror="this.remove()">' : '') + '</div>' +
      '<div class="title-body' + (extra ? ' compact' : '') + '">' +
        '<h1>' + esc(item.name) + '</h1>' +
        '<p class="meta" id="title-meta">' + esc(metaLine(item)) + '</p>' +
        '<p class="overview">' + esc(item.overview) + '</p>' +
        '<div class="actions" id="actions"><button class="btn primary" data-focus data-autofocus id="play-main">Play</button></div>' +
        (message ? '<p class="error">' + esc(message) + '</p>' : '') +
      '</div>' + (extra || '');
  }

  async function renderMovie(item, message) {
    Nav.onBack(function () { goBackFromTitle(); });
    show(titleShell(item, message), 'screen-title');
    var actions = document.getElementById('actions');
    var main = document.getElementById('play-main');
    main.addEventListener('click', function () { play(item, { resume: true }); });
    var choose = pickerButton(function () { renderPicker(item, null, function () { renderMovie(item); }); });
    actions.appendChild(choose);
    Nav.first();
    var p = await Api.getProgress(profile.id, 'movie', item.titleId).catch(function () { return null; });
    if (p && p.position > 30 && p.percentWatched < 95 && document.body.contains(main)) {
      main.textContent = 'Resume from ' + fmtTime(p.position);
      var over = document.createElement('button');
      over.className = 'btn'; over.setAttribute('data-focus', ''); over.textContent = 'Play from the start';
      over.addEventListener('click', function () { play(item, { resume: false, startAt: 0 }); });
      actions.insertBefore(over, choose);
    }
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
    var main = document.getElementById('play-main');
    main.textContent = item.next ? 'Play S' + item.next.season + ' E' + item.next.episode + (item.next.title ? ': ' + item.next.title : '') : 'Play next episode';
    main.addEventListener('click', function () { play(item, { resume: true, episode: item.next }); });
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
      Api.seriesWatchState(profile.id, item.titleId).catch(function () { return null; }),
      Api.progressList(profile.id).catch(function () { return []; })
    ]);
    var details = await seriesDetailsCached(item);
    if (!document.body.contains(main)) return;   // left the page while loading
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
        return '<button class="card ep" data-focus data-ep="' + i + '">' +
          (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : '') +
          '<span class="card-fallback">' + esc('E' + ep.episodeNumber) + '</span>' +
          (watched[key] ? '<i class="seen">Watched</i>' : '') +
          '<span class="card-label"><em class="num">E' + ep.episodeNumber + '</em>' + esc(ep.name || 'Episode ' + ep.episodeNumber) + '</span>' +
          (pct ? '<i class="bar"><b style="width:' + Math.min(100, pct) + '%"></b></i>' : '') +
          '</button>';
      }).join('');
      var epsEl = document.getElementById('episodes');
      epsEl.scrollLeft = keepScroll;
      epsEl.querySelectorAll('.card').forEach(function (c) {
        c.addEventListener('click', function () {
          var ep = se.episodes[+c.getAttribute('data-ep')];
          play(item, { resume: true, episode: { season: ep.seasonNumber, episode: ep.episodeNumber, title: ep.name || '' } });
        });
      });
      if (focusedEp != null) { var again = epsEl.querySelector('[data-ep="' + focusedEp + '"]'); if (again) again.focus({ preventScroll: true }); }
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
        pickFor = { season: ep.seasonNumber, episode: ep.episodeNumber, title: ep.name || '' };
        labelChoose();
        var bits = [];
        if (ep.airedDate) {
          var d = new Date(ep.airedDate.slice(0, 10) + 'T12:00:00Z');
          bits.push(isNaN(d) ? ep.airedDate.slice(0, 10) : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
        }
        if (ep.runtimeMinutes) bits.push(ep.runtimeMinutes + ' min');
        var el = document.getElementById('ep-overview');
        el.innerHTML = (bits.length ? '<span class="muted">' + esc(bits.join(', ')) + '</span><br>' : '') + esc(ep.overview || '');
      }
    });

    showSeason(seasons.indexOf(startSeason));
    if (focusEpisode) {
      var epIdx = -1;
      startSeason.episodes.forEach(function (ep, i) { if (ep.episodeNumber === focusEpisode.episode) epIdx = i; });
      var card = document.getElementById('episodes').querySelector('[data-ep="' + epIdx + '"]');
      if (card) Nav.focus(card);
    }

    // Watch history: mark watched and part-watched episodes, and update the
    // Play button to the real next episode.
    var w = await watchP;
    if (!document.body.contains(main)) return;
    var watch = w[0], progressAll = w[1] || [];
    if (watch && watch.watchedEpisodes) {
      Object.keys(watch.watchedEpisodes).forEach(function (k) {
        var e = watch.watchedEpisodes[k];
        if (e && e.episodeNumber > 0) watched[e.seasonNumber + ':' + e.episodeNumber] = true;
      });
    }
    var prefix = item.titleId + ':S';
    (Array.isArray(progressAll) ? progressAll : []).forEach(function (p) {
      if (p.mediaType !== 'episode' || String(p.itemId).indexOf(prefix) !== 0) return;
      var m = /:S(\d+)E(\d+)$/.exec(p.itemId);
      if (m && p.percentWatched > 1 && p.percentWatched < 95) partial[(+m[1]) + ':' + (+m[2])] = p.percentWatched;
    });
    var next = (watch && watch.nextEpisode && watch.nextEpisode.episodeNumber > 0)
      ? { season: watch.nextEpisode.seasonNumber, episode: watch.nextEpisode.episodeNumber, title: watch.nextEpisode.title || '' }
      : item.next;
    if (next) {
      item.next = next;
      main.textContent = 'Play S' + next.season + ' E' + next.episode + (next.title ? ': ' + next.title : '');
      document.getElementById('title-meta').textContent = metaLine(item);
      if (!focusEpisode && document.activeElement === main) { pickFor = next; labelChoose(); }
    }
    // If you haven't moved yet, open the season with the next episode in it.
    var untouched = document.activeElement === main && !focusEpisode;
    var nextIdx = seasons.indexOf(seasonFor(next));
    if (untouched && nextIdx !== shownSeason) showSeason(nextIdx);
    else showSeason(shownSeason, true);
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
    var keepReturn = titleReturn;
    Player.start({
      item: item, episode: opts.episode || null, profileId: profile.id, clientId: saved.clientId,
      resume: opts.resume, startAt: opts.startAt, manual: opts.manual || null,
      onExit: function (message, played) {
        homeStale = true;   // watch history changed: refresh quietly next time home shows
        titleReturn = keepReturn;
        renderTitle(item, message, played && played.episode);
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

  async function renderPicker(item, episode, back) {
    Nav.onBack(back);
    var heading = esc(item.name) + (episode ? '<span>S' + episode.season + ' E' + episode.episode + (episode.title ? ', ' + esc(episode.title) : '') + '</span>' : '');
    show('<div class="picker"><h1>' + heading + '</h1>' +
      '<p class="lede" id="picker-status">Searching your indexers</p>' +
      '<div class="picker-list" id="picker-list"></div></div>', 'screen-picker');

    var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
    var query = item.name + (episode ? ' S' + pad2(episode.season) + 'E' + pad2(episode.episode) : '');
    var res;
    try {
      res = await Api.releases({ query: query, mediaType: item.kind === 'movie' ? 'movie' : 'series', userId: profile.id,
        clientId: saved.clientId, imdbId: item.imdb, titleId: item.titleId, year: item.year });
    } catch (e) {
      if (view.className !== 'screen-picker') return;
      document.getElementById('picker-status').textContent = 'The search failed: ' + e.message;
      return;
    }
    if (view.className !== 'screen-picker') return;   // went back while searching
    var list = Array.isArray(res) ? res : (res && res.results) || [];

    // mediastorm's own ranking order, which already reflects your Usenet versus
    // debrid priority. Releases its filters would skip go last.
    function rank(r) { return r.filterStatus === 'filtered' ? 1 : 0; }
    var ordered = list.map(function (r, i) { return { r: r, i: i }; })
      .sort(function (a, b) { return rank(a.r) - rank(b.r) || a.i - b.i; })
      .map(function (x) { return x.r; });
    if (!ordered.length) {
      document.getElementById('picker-status').textContent = 'No releases found for ' + query + '.';
      return;
    }
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
        (filtered ? '<span class="why">Filtered: ' + esc(r.filterReason || 'excluded by your settings') + '</span>' : '') +
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

  // ---------- search ----------
  // Typing searches titles as before. Ask AI sends the same text to the AI set
  // up in mediastorm as a description instead ("slow-burn sci-fi like Arrival"),
  // and the suggestions offer common asks in one press. Speak opens LG's own
  // keyboard, whose microphone key can dictate the request.
  var searchState = { query: '', results: [], focusKey: null, mode: 'title', aiQuery: '', status: '' };
  var KEYS = 'abcdefghijklmnopqrstuvwxyz1234567890'.split('');
  var aiCache = {};

  function suggestions() {
    var list = [];
    var cw = homeData && homeData.rows && homeData.rows.filter(function (r) { return r.wide; })[0];
    var last = cw && cw.items[0];
    if (last) list.push('More like ' + last.name);
    return list.concat(['Feel-good comedies', 'Mind-bending sci-fi', 'Short series to binge in a weekend',
      'Hidden gems from the last few years', 'Gripping crime dramas', 'Something the whole family can watch']);
  }

  function renderSearch() {
    Nav.onBack(function () { document.removeEventListener('keydown', typeKey); renderHome(); });
    show(
      '<div class="search">' +
        '<div class="search-left">' +
          '<div class="search-query" id="search-query"></div>' +
          '<div class="keys">' + KEYS.map(function (k) {
            return '<button class="key" data-focus data-k="' + k + '">' + k.toUpperCase() + '</button>';
          }).join('') +
            '<button class="key wide" data-focus data-k=" ">Space</button>' +
            '<button class="key wide" data-focus data-k="del">Delete</button>' +
            '<button class="key wide" data-focus data-k="clear">Clear</button>' +
            '<button class="key half ai" data-focus id="ask-ai">Ask AI</button>' +
            '<div class="key half voice" data-focus tabindex="0" id="speak">Speak' +
              '<input type="text" id="speak-input" autocomplete="off" spellcheck="false" aria-label="Describe what you want to watch"></div>' +
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
    // dictate. Whatever ends up in the field is sent to the AI.
    var speak = document.getElementById('speak'), speakInput = document.getElementById('speak-input');
    speak.addEventListener('click', function () { speakInput.value = searchState.query; speakInput.focus(); });
    speakInput.addEventListener('change', function () {
      var v = speakInput.value.trim();
      if (!v) return;
      searchState.query = v.slice(0, 200);
      drawQuery();
      runAI(searchState.query);
    });
    document.removeEventListener('keydown', typeKey);
    document.addEventListener('keydown', typeKey);
    drawQuery();
    drawResults();
    var again = searchState.focusKey && view.querySelector('.card[data-key="' + (window.CSS && CSS.escape ? CSS.escape(searchState.focusKey) : searchState.focusKey) + '"]');
    if (again) Nav.focus(again); else Nav.focus(view.querySelector('.key'));
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

  async function runSearch(q) {
    var seq = ++searchSeq;
    var box = document.getElementById('search-results');
    if (box && !searchState.results.length) box.innerHTML = '<p class="muted">Searching</p>';
    var res;
    try { res = await Api.search(q, profile.id); }
    catch (e) { if (seq === searchSeq && box) box.innerHTML = '<p class="error">' + esc(e.message) + '</p>'; return; }
    if (seq !== searchSeq) return;   // a newer search has started
    searchState.results = (res || []).filter(function (r) { return r.title && r.title.mediaType !== 'person'; })
      .map(function (r) { return fromTitle(r.title); });
    drawResults();
  }

  async function runAI(q) {
    clearTimeout(searchTimer);
    var seq = ++searchSeq;
    searchState.mode = 'ai';
    searchState.aiQuery = q;
    searchState.results = [];
    drawQuery();
    var key = profile.id + '|' + q.toLowerCase();
    var box = document.getElementById('search-results');
    if (!aiCache[key]) {
      if (box) box.innerHTML = '<p class="muted asking">Asking AI for "' + esc(q) + '"</p>';
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

  function drawResults() {
    var box = document.getElementById('search-results');
    if (!box) return;
    var q = searchState.query.trim();
    var n = searchState.results.length;
    var caption = searchState.mode === 'ai'
      ? (n ? 'AI picks for "' + searchState.aiQuery + '"' : '')
      : (n ? n + (n === 1 ? ' result' : ' results') : '');
    document.getElementById('search-caption').textContent = searchState.status || caption;
    if (!n) {
      if (searchState.mode === 'ai') { box.innerHTML = '<p class="muted">The AI didn\'t come up with any matches. Try wording it differently.</p>'; return; }
      if (q.length >= 2) { box.innerHTML = '<p class="muted">No films or series found for "' + esc(q) + '". Press Ask AI to describe it instead.</p>'; return; }
      // Nothing typed: offer one-press AI asks.
      box.innerHTML = '<div class="suggest"><h3>Ask AI</h3>' + suggestions().map(function (t, i) {
        return '<button class="chip" data-focus data-s="' + i + '">' + esc(t) + '</button>';
      }).join('') + '</div>';
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
      return '<button class="card poster" data-focus data-r="' + i + '" data-key="' + esc(item.key) + '">' +
        (item.poster ? '<img src="' + esc(item.poster) + '" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : '') +
        '<span class="card-fallback">' + esc(item.name) + (item.year ? ' (' + item.year + ')' : '') + '</span></button>';
    }).join('');
    box.querySelectorAll('.card').forEach(function (c) {
      c.addEventListener('focus', function () {
        var item = searchState.results[+c.getAttribute('data-r')];
        document.getElementById('search-caption').textContent =
          item.name + (item.year ? ' (' + item.year + ')' : '') + ', ' + (item.kind === 'movie' ? 'film' : 'series');
      });
      c.addEventListener('click', function () {
        var item = searchState.results[+c.getAttribute('data-r')];
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
