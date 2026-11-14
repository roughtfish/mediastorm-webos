var Api = function() {
  "use strict";
  var t = "",
    e = "",
    r = "";

  function n(t) {
    return encodeURIComponent(t)
  }
  async function i(n, i, a) {
    var s, u = {
      Accept: "application/json"
    };
    e && (u.Authorization = "Bearer " + e), r && (u["X-Client-ID"] = r), void 0 !== a && (u["Content-Type"] = "application/json");
    try {
      s = await fetch(t + "/api" + i, {
        method: n,
        headers: u,
        body: void 0 !== a ? JSON.stringify(a) : void 0
      })
    } catch (e) {
      var o = new Error("Couldn't reach " + t + ". Check the server address and that the TV is online.");
      throw o.status = 0, o
    }
    var d = await s.text(),
      c = null;
    try {
      c = d ? JSON.parse(d) : null
    } catch (t) {}
    if (!s.ok) {
      var l = new Error(c && (c.error || c.message) || d.trim() || "HTTP " + s.status);
      throw l.status = s.status, l.data = c, l
    }
    return c
  }
  return {
    configure: function(n) {
      null != n.server && (t = String(n.server).trim().replace(/\/+$/, "")), null != n.token && (e = n.token), null != n.clientId && (r = n.clientId)
    },
    get server() {
      return t
    },
    get token() {
      return e
    },
    login: function(t, e) {
      return i("POST", "/auth/login", {
        username: t,
        password: e,
        rememberMe: !0
      })
    },
    me: function() {
      return i("GET", "/auth/me")
    },
    logout: function() {
      return i("POST", "/auth/logout")
    },
    profiles: function() {
      return i("GET", "/users")
    },
    verifyPin: function(t, e) {
      return i("POST", "/users/" + n(t) + "/pin/verify", {
        pin: e
      })
    },
    continueWatching: function(t) {
      return i("GET", "/users/" + n(t) + "/history/continue")
    },
    watchlist: function(t) {
      return i("GET", "/users/" + n(t) + "/watchlist")
    },
    addToWatchlist: function(t, e) {
      return i("POST", "/users/" + n(t) + "/watchlist", e)
    },
    removeFromWatchlist: function(t, e, r) {
      return i("DELETE", "/users/" + n(t) + "/watchlist/" + n(e) + "/" + n(r))
    },
    calendar: function(t, e, r) {
      var a = "";
      try {
        a = Intl.DateTimeFormat().resolvedOptions().timeZone || ""
      } catch (t) {}
      return i("GET", "/users/" + n(t) + "/calendar?days=" + n(e) + "&recentDays=" + n(r) + (a ? "&tz=" + n(a) : ""))
    },
    hideContinue: function(t, e) {
      return i("POST", "/users/" + n(t) + "/history/continue/hide", {
        seriesId: e
      })
    },
    topTen: function(t, e) {
      return i("GET", "/discover/top-ten?type=" + n(e || "all") + "&userId=" + n(t))
    },
    search: function(t, e) {
      return i("GET", "/search?q=" + n(t) + "&userId=" + n(e))
    },
    aiRecommendations: function(t) {
      return i("GET", "/recommendations?userId=" + n(t))
    },
    aiSearch: function(t, e) {
      return i("GET", "/recommendations/custom?q=" + n(t) + "&userId=" + n(e))
    },
    seriesDetails: function(t, e) {
      var r = "titleId=" + n(t.titleId) + "&name=" + n(t.name || "");
      return t.year && (r += "&year=" + n(t.year)), t.tvdb && (r += "&tvdbId=" + n(t.tvdb)), t.tmdb && (r += "&tmdbId=" + n(t.tmdb)), t.imdb && (r += "&imdbId=" + n(t.imdb)), i("GET", "/metadata/series/details?" + r + "&userId=" + n(e))
    },
    movieDetails: function(t, e) {
      var r = "titleId=" + n(t.titleId) + "&name=" + n(t.name || "");
      return t.year && (r += "&year=" + n(t.year)), t.tmdb && (r += "&tmdbId=" + n(t.tmdb)), t.imdb && (r += "&imdbId=" + n(t.imdb)), i("GET", "/metadata/movies/details?" + r + "&userId=" + n(e))
    },
    trailers: function(t, e) {
      var r = "type=" + ("movie" === t.kind ? "movie" : "series") + "&titleId=" + n(t.titleId) + "&name=" + n(t.name || "");
      return t.year && (r += "&year=" + n(t.year)), t.tmdb && (r += "&tmdbId=" + n(t.tmdb)), t.tvdb && (r += "&tvdbId=" + n(t.tvdb)), t.imdb && (r += "&imdbId=" + n(t.imdb)), i("GET", "/metadata/trailers?" + r + "&userId=" + n(e))
    },
    discoverGenre: function(t, e, r, a, s) {
      return i("GET", "/discover/genre?type=" + n(t) + "&genreId=" + n(e) + "&limit=" + n(r) + "&offset=" + n(a) + "&userId=" + n(s))
    },
    libraries: function() {
      return i("GET", "/library/libraries")
    },
    libraryGroups: function(t, e, r) {
      return i("GET", "/library/libraries/" + n(t) + "/groups?limit=" + n(e) + "&offset=" + n(r) + "&sort=created&dir=desc")
    },
    libraryPlayback: function(t) {
      return i("GET", "/library/items/" + n(t) + "/playback")
    },
    libraryArtworkUrl: function(r, i) {
      return t + "/api/library/items/" + n(r) + "/artwork/" + n(i || "poster") + "?token=" + n(e)
    },
    similar: function(t, e, r) {
      return i("GET", "/metadata/similar?type=" + n(t) + "&tmdbId=" + n(e) + "&userId=" + n(r))
    },
    markWatched: function(t, e) {
      return i("POST", "/users/" + n(t) + "/history/watched", e)
    },
    markWatchedBulk: function(t, e) {
      return i("POST", "/users/" + n(t) + "/history/watched/bulk", e)
    },
    watchedKeys: function(t) {
      return i("GET", "/users/" + n(t) + "/history/watched?fields=status&format=keys")
    },
    watchedItem: function(t, e, r) {
      return i("GET", "/users/" + n(t) + "/history/watched/" + n(e) + "/" + n(r))
    },
    personDetails: function(t, e) {
      return i("GET", "/metadata/person?id=" + n(t) + "&userId=" + n(e))
    },
    collectionDetails: function(t, e) {
      return i("GET", "/metadata/collection?id=" + n(t) + "&userId=" + n(e))
    },
    seriesWatchState: async function(t, e) {
      try {
        return await i("GET", "/users/" + n(t) + "/history/series/" + n(e))
      } catch (t) {
        if (404 === t.status) return null;
        throw t
      }
    },
    progressList: function(t) {
      return i("GET", "/users/" + n(t) + "/history/progress")
    },
    getProgress: async function(t, e, r) {
      try {
        return await i("GET", "/users/" + n(t) + "/history/progress/" + n(e) + "/" + n(r))
      } catch (t) {
        if (404 === t.status) return null;
        throw t
      }
    },
    sendProgress: function(t, e) {
      return i("POST", "/users/" + n(t) + "/history/progress", e)
    },
    prequeue: function(t) {
      return i("POST", "/playback/prequeue", t)
    },
    prequeueStatus: function(t) {
      return i("GET", "/playback/prequeue/" + n(t))
    },
    adoptMigration: function(t, e) {
      return i("POST", "/playback/prequeue/" + n(t) + "/adopt-migration", e)
    },
    resolve: function(t, e) {
      return i("POST", "/playback/resolve", {
        result: t,
        profileId: e
      })
    },
    queueStatus: function(t) {
      return i("GET", "/playback/queue/" + n(t))
    },
    releases: function(t) {
      return i("GET", "/indexers/search?" + ("q=" + n(t.query) + "&mediaType=" + n(t.mediaType) + "&limit=50&includeFiltered=true&userId=" + n(t.userId) + (t.clientId ? "&clientId=" + n(t.clientId) : "") + (t.imdbId ? "&imdbId=" + n(t.imdbId) : "") + (t.titleId ? "&titleId=" + n(t.titleId) : "") + (t.year ? "&year=" + n(t.year) : "")))
    },
    scoredReleases: function(t) {
      return i("GET", "/indexers/search-test?" + ("q=" + n(t.query) + "&mediaType=" + n(t.mediaType) + "&limit=50&userId=" + n(t.userId) + (t.clientId ? "&clientId=" + n(t.clientId) : "") + (t.imdbId ? "&imdbId=" + n(t.imdbId) : "") + (t.titleId ? "&titleId=" + n(t.titleId) : "") + (t.year ? "&year=" + n(t.year) : "")))
    },
    userSettings: function(t) {
      return i("GET", "/users/" + n(t) + "/settings")
    },
    markBad: function(t) {
      return i("POST", "/playback/bad-streams", t)
    },
    subtitleTracks: function(t) {
      return i("GET", "/video/subtitles/tracks?path=" + n(t))
    },
    startSubtitles: function(t, e, r) {
      return i("GET", "/video/subtitles/start?path=" + n(t) + "&subtitleTrack=" + n(e) + "&startOffset=" + n(Math.max(0, Math.floor(r || 0))) + "&format=vtt")
    },
    fetchText: async function(r) {
      var n = {};
      e && (n.Authorization = "Bearer " + e);
      var i = await fetch(t + r, {
        headers: n,
        cache: "no-store"
      });
      if (!i.ok) {
        var a = new Error("HTTP " + i.status);
        throw a.status = i.status, a
      }
      return i.text()
    },
    probe: function(t) {
      return i("GET", "/video/metadata?path=" + n(t))
    },
    skipSegments: function(t) {
      return i("POST", "/video/segments", t)
    },
    skipSegmentsLegacy: function(t) {
      return i("GET", "/video/segments?imdbId=" + n(t.imdbId) + "&season=" + n(t.season) + "&episode=" + n(t.episode) + "&duration=" + n(String(Math.round(t.duration))))
    },
    directUrl: function(t) {
      return i("GET", "/video/direct-url?path=" + n(t))
    },
    serverVersion: function() {
      return i("GET", "/version")
    },
    updateStatus: function() {
      return i("GET", "/updates/status")
    },
    staticUrl: function(e) {
      return t + "/api/static/" + e
    },
    streamUrl: function(r, i, a) {
      var s = "";
      return Object.keys(a || {}).forEach(function(t) {
        var e = a[t];
        null != e && "" !== e && (s += "&" + t + "=" + n(String(e)))
      }), t + "/api/video/stream?path=" + n(r) + "&transmux=false" + (i ? "&profileId=" + n(i) : "") + s + "&token=" + n(e)
    }
  }
}();