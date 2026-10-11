// Thin client for the mediastorm backend API. Every call returns parsed JSON
// (or null) and throws an Error carrying .status when the server says no.
var Api = (function () {
  'use strict';

  var server = '';
  var token = '';
  var clientId = '';

  function configure(opts) {
    if (opts.server != null) server = String(opts.server).trim().replace(/\/+$/, '');
    if (opts.token != null) token = opts.token;
    if (opts.clientId != null) clientId = opts.clientId;
  }

  function enc(v) { return encodeURIComponent(v); }

  async function call(method, path, body) {
    var headers = { 'Accept': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    if (clientId) headers['X-Client-ID'] = clientId;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    var res;
    try {
      res = await fetch(server + '/api' + path, {
        method: method, headers: headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      var netErr = new Error('Couldn\'t reach ' + server + '. Check the server address and that the TV is online.');
      netErr.status = 0;
      throw netErr;
    }
    var text = await res.text();
    var data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { /* plain-text reply */ }
    if (!res.ok) {
      var err = new Error((data && (data.error || data.message)) || text.trim() || ('HTTP ' + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  return {
    configure: configure,
    get server() { return server; },
    get token() { return token; },

    login: function (username, password) {
      return call('POST', '/auth/login', { username: username, password: password, rememberMe: true });
    },
    me: function () { return call('GET', '/auth/me'); },
    logout: function () { return call('POST', '/auth/logout'); },

    profiles: function () { return call('GET', '/users'); },
    verifyPin: function (userId, pin) { return call('POST', '/users/' + enc(userId) + '/pin/verify', { pin: pin }); },

    continueWatching: function (userId) { return call('GET', '/users/' + enc(userId) + '/history/continue'); },
    watchlist: function (userId) { return call('GET', '/users/' + enc(userId) + '/watchlist'); },
    addToWatchlist: function (userId, body) { return call('POST', '/users/' + enc(userId) + '/watchlist', body); },
    removeFromWatchlist: function (userId, mediaType, id) {
      return call('DELETE', '/users/' + enc(userId) + '/watchlist/' + enc(mediaType) + '/' + enc(id));
    },
    // New and upcoming episodes (and film releases) for shows you watch or follow.
    calendar: function (userId, days, recentDays) {
      var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* older engine */ }
      return call('GET', '/users/' + enc(userId) + '/calendar?days=' + enc(days) + '&recentDays=' + enc(recentDays) + (tz ? '&tz=' + enc(tz) : ''));
    },
    hideContinue: function (userId, seriesId) {
      return call('POST', '/users/' + enc(userId) + '/history/continue/hide', { seriesId: seriesId });
    },
    topTen: function (userId) { return call('GET', '/discover/top-ten?type=all&userId=' + enc(userId)); },

    search: function (query, userId) {
      return call('GET', '/search?q=' + enc(query) + '&userId=' + enc(userId));
    },
    // Free-text request answered by the AI provider set up in mediastorm,
    // returned as matched titles in the same shape as the Top 10.
    // AI picks from the user's watch history and watchlist (asks mediastorm's AI provider each time).
    aiRecommendations: function (userId) { return call('GET', '/recommendations?userId=' + enc(userId)); },
    aiSearch: function (query, userId) {
      return call('GET', '/recommendations/custom?q=' + enc(query) + '&userId=' + enc(userId));
    },
    seriesDetails: function (item, userId) {
      var q = 'titleId=' + enc(item.titleId) + '&name=' + enc(item.name || '');
      if (item.year) q += '&year=' + enc(item.year);
      if (item.tvdb) q += '&tvdbId=' + enc(item.tvdb);
      if (item.tmdb) q += '&tmdbId=' + enc(item.tmdb);
      if (item.imdb) q += '&imdbId=' + enc(item.imdb);
      return call('GET', '/metadata/series/details?' + q + '&userId=' + enc(userId));
    },
    movieDetails: function (item, userId) {
      var q = 'titleId=' + enc(item.titleId) + '&name=' + enc(item.name || '');
      if (item.year) q += '&year=' + enc(item.year);
      if (item.tmdb) q += '&tmdbId=' + enc(item.tmdb);
      if (item.imdb) q += '&imdbId=' + enc(item.imdb);
      return call('GET', '/metadata/movies/details?' + q + '&userId=' + enc(userId));
    },
    similar: function (type, tmdbId, userId) {
      return call('GET', '/metadata/similar?type=' + enc(type) + '&tmdbId=' + enc(tmdbId) + '&userId=' + enc(userId));
    },
    // Marking watched or unwatched: one update, or several at once.
    markWatched: function (userId, update) { return call('POST', '/users/' + enc(userId) + '/history/watched', update); },
    markWatchedBulk: function (userId, updates) { return call('POST', '/users/' + enc(userId) + '/history/watched/bulk', updates); },
    watchedItem: function (userId, mediaType, id) {
      return call('GET', '/users/' + enc(userId) + '/history/watched/' + enc(mediaType) + '/' + enc(id));
    },
    personDetails: function (id, userId) {
      return call('GET', '/metadata/person?id=' + enc(id) + '&userId=' + enc(userId));
    },
    collectionDetails: function (id, userId) {
      return call('GET', '/metadata/collection?id=' + enc(id) + '&userId=' + enc(userId));
    },
    seriesWatchState: async function (userId, seriesId) {
      try { return await call('GET', '/users/' + enc(userId) + '/history/series/' + enc(seriesId)); }
      catch (e) { if (e.status === 404) return null; throw e; }
    },
    progressList: function (userId) { return call('GET', '/users/' + enc(userId) + '/history/progress'); },

    getProgress: async function (userId, mediaType, itemId) {
      try {
        return await call('GET', '/users/' + enc(userId) + '/history/progress/' + enc(mediaType) + '/' + enc(itemId));
      } catch (e) {
        if (e.status === 404) return null;
        throw e;
      }
    },
    sendProgress: function (userId, payload) {
      return call('POST', '/users/' + enc(userId) + '/history/progress', payload);
    },

    prequeue: function (body) { return call('POST', '/playback/prequeue', body); },
    prequeueStatus: function (id) { return call('GET', '/playback/prequeue/' + enc(id)); },
    adoptMigration: function (id, body) { return call('POST', '/playback/prequeue/' + enc(id) + '/adopt-migration', body); },
    resolve: function (result, profileId) { return call('POST', '/playback/resolve', { result: result, profileId: profileId }); },
    queueStatus: function (queueId) { return call('GET', '/playback/queue/' + enc(queueId)); },
    // Every release mediastorm can find, including ones its filters would skip.
    releases: function (opts) {
      var q = 'q=' + enc(opts.query) + '&mediaType=' + enc(opts.mediaType) + '&limit=50&includeFiltered=true' +
        '&userId=' + enc(opts.userId) + (opts.clientId ? '&clientId=' + enc(opts.clientId) : '') +
        (opts.imdbId ? '&imdbId=' + enc(opts.imdbId) : '') + (opts.titleId ? '&titleId=' + enc(opts.titleId) : '') +
        (opts.year ? '&year=' + enc(opts.year) : '');
      return call('GET', '/indexers/search?' + q);
    },
    // The same search with mediastorm's scoring breakdown for each release.
    // Older servers don't have it; callers fall back to releases().
    scoredReleases: function (opts) {
      var q = 'q=' + enc(opts.query) + '&mediaType=' + enc(opts.mediaType) + '&limit=50' +
        '&userId=' + enc(opts.userId) + (opts.clientId ? '&clientId=' + enc(opts.clientId) : '') +
        (opts.imdbId ? '&imdbId=' + enc(opts.imdbId) : '') + (opts.titleId ? '&titleId=' + enc(opts.titleId) : '') +
        (opts.year ? '&year=' + enc(opts.year) : '');
      return call('GET', '/indexers/search-test?' + q);
    },
    userSettings: function (userId) { return call('GET', '/users/' + enc(userId) + '/settings'); },
    markBad: function (body) { return call('POST', '/playback/bad-streams', body); },

    subtitleTracks: function (path) { return call('GET', '/video/subtitles/tracks?path=' + enc(path)); },
    startSubtitles: function (path, track, startOffset) {
      return call('GET', '/video/subtitles/start?path=' + enc(path) + '&subtitleTrack=' + enc(track) +
        '&startOffset=' + enc(Math.max(0, Math.floor(startOffset || 0))) + '&format=vtt');
    },
    // Subtitle files come back as text, not JSON. subtitleUrl already starts with /api.
    fetchText: async function (absPath) {
      var headers = {};
      if (token) headers.Authorization = 'Bearer ' + token;
      var res = await fetch(server + absPath, { headers: headers, cache: 'no-store' });
      if (!res.ok) { var e = new Error('HTTP ' + res.status); e.status = res.status; throw e; }
      return res.text();
    },

    probe: function (path) { return call('GET', '/video/metadata?path=' + enc(path)); },
    // Where the credits are: IntroDB/SkipDB timings plus the file's chapters.
    skipSegments: function (body) { return call('POST', '/video/segments', body); },
    // Older mediastorm servers only answer GET here, in the intro/recap/outro shape (milliseconds).
    skipSegmentsLegacy: function (q) {
      return call('GET', '/video/segments?imdbId=' + enc(q.imdbId) + '&season=' + enc(q.season) +
                         '&episode=' + enc(q.episode) + '&duration=' + enc(String(Math.round(q.duration))));
    },
    // mediastorm's own credits detection: start it, then check on it.
    detectCredits: function (path, duration) {
      return call('POST', '/video/credits/detect?path=' + enc(path) + '&duration=' + enc(String(Math.round(duration))));
    },
    creditsStatus: function (path) { return call('GET', '/video/credits/status?path=' + enc(path)); },
    directUrl: function (path) { return call('GET', '/video/direct-url?path=' + enc(path)); },

    // The untouched file through the backend. transmux=false matters: without
    // it the backend may remux MKVs and lose the Dolby Vision metadata.
    // meta (optional) names what's playing, so mediastorm's Active Streams
    // panel shows the title, episode and poster rather than "Unknown".
    // mediastorm's own icons (rating logos and the like).
    staticUrl: function (path) { return server + '/api/static/' + path; },
    streamUrl: function (path, profileId, meta) {
      var extra = '';
      Object.keys(meta || {}).forEach(function (k) {
        var v = meta[k];
        if (v !== undefined && v !== null && v !== '') extra += '&' + k + '=' + enc(String(v));
      });
      return server + '/api/video/stream?path=' + enc(path) + '&transmux=false' +
        (profileId ? '&profileId=' + enc(profileId) : '') + extra + '&token=' + enc(token);
    }
  };
})();
