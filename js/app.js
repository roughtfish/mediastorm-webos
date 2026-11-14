! function() {
  "use strict";
  var e = "mediastorm-tv",
    t = window.MS_CONFIG || {},
    n = document.getElementById("view"),
    r = document.getElementById("toast"),
    i = function() {
      try {
        return JSON.parse(localStorage.getItem(e)) || {}
      } catch (e) {
        return {}
      }
    }();

  function a() {
    try {
      localStorage.setItem(e, JSON.stringify(i))
    } catch (e) {}
  }
  i.clientId || (i.clientId = "webos-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8), a());
  var o = [],
    s = null,
    c = null,
    l = !1,
    d = !1;

  function u() {
    return e + "-home-" + (s && s.id)
  }

  function m(e) {
    try {
      localStorage.setItem(u(), JSON.stringify({
        rows: e.rows,
        at: Date.now()
      }))
    } catch (e) {}
  }
  var f = {};

  function p(t) {
    return e + "-ai-" + t
  }

  function v(e) {
    try {
      var t = JSON.parse(localStorage.getItem(p(e)));
      return t && Array.isArray(t.items) && Date.now() - t.at < (t.items.length ? 216e5 : 12e4) ? t : null
    } catch (e) {
      return null
    }
  }

  function h(e) {
    f[e] || (f[e] = !0, Api.aiRecommendations(e).then(function(t) {
      var n = (t && t.items || []).map(function(e) {
        return e && e.title ? re(e.title) : null
      }).filter(Boolean).slice(0, 30);
      try {
        localStorage.setItem(p(e), JSON.stringify({
          items: n,
          at: Date.now()
        }))
      } catch (e) {}
      n.length && s && s.id === e && (l = !0, d ? setTimeout(function() {
        s && s.id === e && Me()
      }, 3e3) : Me())
    }, function() {
      try {
        localStorage.setItem(p(e), JSON.stringify({
          items: [],
          at: Date.now()
        }))
      } catch (e) {}
    }).then(function() {
      f[e] = !1
    }))
  }
  var g = 108e5,
    b = 6e5,
    y = {};

  function w(t) {
    return e + "-cal-" + t
  }

  function k(e, t) {
    try {
      var n = JSON.parse(localStorage.getItem(w(e)));
      return n && Array.isArray(n.items) && (t || Date.now() - n.at < (n.items.length ? g : b)) ? n : null
    } catch (e) {
      return null
    }
  }

  function E(e) {
    return e.getFullYear() + "-" + ("0" + (e.getMonth() + 1)).slice(-2) + "-" + ("0" + e.getDate()).slice(-2)
  }

  function S(e) {
    var t = new Date,
      n = new Date(e + "T12:00:00"),
      r = Math.round((new Date(e + "T12:00:00") - new Date(E(t) + "T12:00:00")) / 864e5);
    if (0 === r) return "Today";
    if (-1 === r) return "Yesterday";
    if (1 === r) return "Tomorrow";
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][n.getDay()] + " " + n.getDate() + " " + ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][n.getMonth()] + (n.getFullYear() !== t.getFullYear() ? " " + n.getFullYear() : "")
  }

  function I(e) {
    var t = e.externalIds || {},
      n = "movie" === e.mediaType,
      r = n ? t.tmdb ? "tmdb:movie:" + t.tmdb : t.tvdb ? "tvdb:movie:" + t.tvdb : "" : t.tvdb ? "tvdb:series:" + t.tvdb : t.tmdb ? "tmdb:tv:" + t.tmdb : "";
    return {
      key: "cal:" + r + ":" + (e.seasonNumber || 0) + ":" + (e.episodeNumber || 0),
      kind: n ? "movie" : "series",
      titleId: r,
      name: e.title,
      year: e.year,
      overview: e.overview || "",
      poster: e.posterUrl || e.textPosterUrl,
      backdrop: e.backdropUrl || e.backdropUrls && e.backdropUrls[0] || e.posterUrl,
      imdb: t.imdb || "",
      tmdb: t.tmdb || "",
      tvdb: t.tvdb || "",
      next: n ? null : {
        season: e.seasonNumber,
        episode: e.episodeNumber,
        title: e.episodeTitle || ""
      },
      note: S(e.airDate),
      focusEp: n ? null : {
        season: e.seasonNumber,
        episode: e.episodeNumber
      }
    }
  }

  function N(e, t) {
    var n = k(e, !0);
    if (!n || !n.items.length) return [];
    var r = {};
    (t || []).forEach(function(e) {
      e.titleId && (r["id:" + e.titleId] = !0), e.tvdb && (r["tvdb:" + e.tvdb] = !0), e.tmdb && (r["tmdb:" + e.tmdb] = !0), e.imdb && (r["imdb:" + e.imdb] = !0)
    });
    var i = E(new Date),
      a = {},
      o = n.items.map(function(e) {
        return {
          it: e,
          item: I(e)
        }
      }).filter(function(e) {
        return e.item.titleId && function(e, t) {
          if ("watchlist" === e.source) return !0;
          var n = e.externalIds || {};
          return !!(r["id:" + t.titleId] || n.tvdb && r["tvdb:" + n.tvdb] || n.tmdb && r["tmdb:" + n.tmdb] || n.imdb && r["imdb:" + n.imdb])
        }(e.it, e.item)
      }),
      s = o.filter(function(e) {
        return "movie" !== e.it.mediaType && e.it.airDate <= i
      }).sort(function(e, t) {
        return e.it.airDate < t.it.airDate ? 1 : -1
      }).filter(function(e) {
        return !a[e.item.titleId] && (a[e.item.titleId] = !0)
      }).map(function(e) {
        return e.item
      }),
      c = o.filter(function(e) {
        return e.it.airDate > i
      }).sort(function(e, t) {
        return e.it.airDate < t.it.airDate ? -1 : 1
      }).map(function(e) {
        return e.item
      }).slice(0, 20),
      l = [];
    return s.length && l.push({
      title: "New episodes",
      wide: !0,
      items: s.slice(0, 20)
    }), c.length && l.push({
      title: "Coming soon",
      wide: !0,
      items: c
    }), l
  }
  var A = null,
    x = Util.esc;

  function L(e, t) {
    return '<span class="card-fallback"><b>' + x(e) + (t || "") + "</b></span>"
  }

  function C(e, t, n) {
    r.textContent = e, r.className = "on " + (t || ""), clearTimeout(r._t), r._t = setTimeout(function() {
      r.className = ""
    }, n || 7e3)
  }

  function B(e, t) {
    G();
    var r = document.activeElement,
      i = Nav.currentBack ? Nav.currentBack() : null,
      a = document.createElement("div");
    a.id = "confirm", a.className = "textbox", a.innerHTML = '<div class="box"><h2>' + x(e) + '</h2><div class="textbox-body">' + x(t) + '</div><div class="actions"><button class="btn primary" data-focus id="textbox-close">Close</button><span class="muted textbox-hint">Up and down to scroll</span></div></div>', document.body.appendChild(a);
    var o = a.querySelector(".textbox-body");

    function s(e) {
      38 !== e.keyCode && 40 !== e.keyCode || (e.preventDefault(), e.stopImmediatePropagation(), o.scrollTop += (40 === e.keyCode ? 1 : -1) * Math.round(.6 * o.clientHeight))
    }

    function c() {
      document.removeEventListener("keydown", s, !0), a.parentNode && a.parentNode.removeChild(a), Nav.setScope(n), Nav.onBack(i), r && document.body.contains(r) ? Nav.focus(r) : Nav.first()
    }
    o.scrollHeight <= o.clientHeight + 2 && (a.querySelector(".textbox-hint").textContent = ""), Nav.setScope(a), document.addEventListener("keydown", s, !0), Nav.onBack(c), a.querySelector("#textbox-close").addEventListener("click", c), Nav.focus(a.querySelector("#textbox-close"))
  }

  function T(e, t, n) {
    if (e) {
      var r = e.nextElementSibling && e.nextElementSibling.classList.contains("more-tag") ? e.nextElementSibling : null;
      e.scrollHeight > e.clientHeight + 2 ? (r || ((r = document.createElement("button")).className = "more-tag", r.setAttribute("data-focus", ""), r.textContent = "More", e.parentNode.insertBefore(r, e.nextSibling)), r.onclick = function() {
        B(t, n())
      }) : r && r.parentNode.removeChild(r)
    }
  }

  function q(e, t, r) {
    var i = document.activeElement,
      a = Nav.currentBack ? Nav.currentBack() : null,
      o = document.createElement("div");

    function s() {
      o.parentNode && o.parentNode.removeChild(o), Nav.setScope(n), Nav.onBack(a), i && document.body.contains(i) ? Nav.focus(i) : Nav.first()
    }
    o.id = "confirm", o.innerHTML = '<div class="box"><h2>' + x(e) + "</h2><p>" + x(t) + '</p><div class="actions">' + r.map(function(e, t) {
      return '<button class="btn' + (0 === t ? " primary" : "") + '" data-focus data-c="' + t + '">' + x(e.label) + "</button>"
    }).join("") + '<button class="btn" data-focus id="confirm-no">Close</button></div></div>', document.body.appendChild(o), Nav.setScope(o), Nav.onBack(s), o.querySelector("#confirm-no").addEventListener("click", s), o.querySelectorAll("[data-c]").forEach(function(e) {
      e.addEventListener("click", function() {
        s(), r[+e.getAttribute("data-c")].fn()
      })
    }), Nav.focus(o.querySelector("[data-c]") || o.querySelector("#confirm-no"))
  }

  function D(e, t) {
    ! function(e, t, r, i) {
      var a = document.activeElement,
        o = Nav.currentBack ? Nav.currentBack() : null,
        s = document.createElement("div");

      function c() {
        s.parentNode && s.parentNode.removeChild(s), Nav.setScope(n), Nav.onBack(o), a && document.body.contains(a) ? Nav.focus(a) : Nav.first()
      }
      s.id = "confirm", s.innerHTML = '<div class="box"><h2>' + x(e) + "</h2><p>" + x(t) + '</p><div class="actions"><button class="btn primary" data-focus id="confirm-yes">' + x(r) + '</button><button class="btn" data-focus id="confirm-no">Cancel</button></div></div>', document.body.appendChild(s), Nav.setScope(s), Nav.onBack(c), s.querySelector("#confirm-no").addEventListener("click", c), s.querySelector("#confirm-yes").addEventListener("click", function() {
        c(), i()
      }), Nav.focus(s.querySelector("#confirm-yes"))
    }("Remove from Continue watching?", e.name + " will no longer show in the row. Watching it again brings it back.", "Remove", async function() {
      try {
        await Api.hideContinue(s.id, e.titleId)
      } catch (e) {
        return void C("Couldn't remove it: " + e.message, "warn")
      }
      c && c.rows && (c.rows = c.rows.map(function(t) {
        return t.wide ? Object.assign({}, t, {
          items: t.items.filter(function(t) {
            return t.titleId !== e.titleId
          })
        }) : t
      }).filter(function(e) {
        return e.items.length
      }), m(c)), C("Removed " + e.name + " from Continue watching."), t && t()
    })
  }

  function M(e) {
    e = Math.floor(e || 0);
    var t = Math.floor(e / 3600),
      n = Math.floor(e % 3600 / 60);
    return t ? t + "h " + n + "m" : n + "m"
  }
  var P = [24, 32, 45],
    j = 0,
    O = {};

  function H(e) {
    var t = document.documentElement.style;
    t.setProperty("--tr", e[0]), t.setProperty("--tg", e[1]), t.setProperty("--tb", e[2])
  }

  function U(e) {
    var t = ++j;
    if (e) {
      var n = F(e, "w300");
      if (O[n]) H(O[n]);
      else {
        var r = new Image;
        r.crossOrigin = "anonymous", r.onload = function() {
          var e = P;
          try {
            e = function(e) {
              var t = document.createElement("canvas");
              t.width = 24, t.height = 14;
              var n = t.getContext("2d");
              n.drawImage(e, 0, 0, 24, 14);
              for (var r = n.getImageData(0, 0, 24, 14).data, i = 0, a = 0, o = 0, s = 0, c = 0; c < r.length; c += 4) {
                var l = r[c] / 255,
                  d = r[c + 1] / 255,
                  u = r[c + 2] / 255,
                  m = Math.max(l, d, u),
                  f = Math.min(l, d, u),
                  p = (m + f) / 2;
                if (!(p < .08 || p > .92)) {
                  var v = m === f ? 0 : (m - f) / (1 - Math.abs(2 * p - 1)),
                    h = .05 + v * v;
                  i += l * h, a += d * h, o += u * h, s += h
                }
              }
              if (!s) return P;
              i /= s, a /= s, o /= s;
              var g = Math.max(i, a, o),
                b = Math.min(i, a, o),
                y = 0,
                w = 0,
                k = (g + b) / 2;
              if (g !== b) {
                var E = g - b;
                w = E / (1 - Math.abs(2 * k - 1)), y = g === i ? (a - o) / E % 6 : g === a ? (o - i) / E + 2 : (i - a) / E + 4, (y *= 60) < 0 && (y += 360)
              }
              w = .8 * Math.min(w, .55);
              var S = (1 - Math.abs(-.7)) * w,
                I = S * (1 - Math.abs(y / 60 % 2 - 1)),
                N = .15 - S / 2;
              return (y < 60 ? [S, I, 0] : y < 120 ? [I, S, 0] : y < 180 ? [0, S, I] : y < 240 ? [0, I, S] : y < 300 ? [I, 0, S] : [S, 0, I]).map(function(e, t) {
                return Math.round(255 * (e + N) * .6 + .4 * P[t])
              })
            }(r)
          } catch (t) {
            e = P
          }
          O[n] = e, t === j && H(e)
        }, r.onerror = function() {
          O[n] = P, t === j && H(P)
        }, r.src = n
      }
    } else H(P)
  }

  function W(e, t) {
    G(), "screen-home" !== t && "screen-title" !== t && (j++, H(P)), n.className = t || "", n.innerHTML = e, Nav.setScope(n)
  }

  function F(e, t) {
    return e ? String(e).replace(/(\/\/image\.tmdb\.org\/t\/p\/)(w\d+|original)(\/)/, "$1" + t + "$3") : e
  }

  function R(e, t, n) {
    var r = F(e, t);
    return '<img src="' + x(r) + '"' + (r !== e ? ' data-full="' + x(e) + '"' : "") + ' alt=""' + (n ? ' loading="lazy" decoding="async"' : "") + ' onerror="msImgFail(this)">'
  }
  window.msImgFail = function(e) {
    var t = e.getAttribute("data-full");
    t && e.getAttribute("src") !== t ? e.setAttribute("src", t) : e.remove()
  };
  var z = null,
    Y = [],
    J = !1,
    V = null,
    $ = !1;

  function G() {
    ($ || z) && K()
  }

  function K() {
    J = !0, clearTimeout(V), V = setTimeout(function() {
      J = !1
    }, 400)
  }

  function _() {
    if (!z) return null;
    clearTimeout(z.holdTimer), clearTimeout(z.gapTimer), z.card.classList.remove("holding");
    var e = z;
    return z = null, e
  }

  function Q(e) {
    if (!e || !e.classList.contains("card") && !e.classList.contains("recent")) return null;
    if ("screen-home" === n.className && e.classList.contains("wide")) {
      var t = Y[+e.getAttribute("data-i")];
      return t && 0 === String(t.key).indexOf("cw:") ? function() {
        D(t, function() {
          Pe()
        })
      } : null
    }
    return n.classList.contains("screen-title") && e.classList.contains("ep") && e.onhold || "screen-search" === n.className && e.classList.contains("recent") && e.onhold ? e.onhold : null
  }

  function Z() {
    var e = _();
    if (e) {
      var t = Q(e.card);
      t && (K(), t())
    }
  }

  function X(e, t) {
    return e && e[t] ? String(e[t]) : ""
  }

  function ee(e) {
    return String(e || "").replace(/\s*[•·|–—-]\s*S\d{1,2}\s*E\d{1,3}\b.*$/i, "").trim() || String(e || "")
  }

  function te(e) {
    var t = /:movie:/.test(e.seriesId || "") || !e.nextEpisode && !(e.lastWatched && e.lastWatched.episodeNumber > 0),
      n = null;
    if (!t) {
      var r = e.nextEpisode || e.lastWatched;
      r && r.episodeNumber > 0 && (n = {
        season: r.seasonNumber,
        episode: r.episodeNumber,
        title: r.title || ""
      })
    }
    return {
      key: "cw:" + e.seriesId,
      kind: t ? "movie" : "series",
      titleId: e.seriesId,
      name: ee(e.seriesTitle),
      year: e.year,
      overview: e.overview || e.lastWatched && e.lastWatched.overview || "",
      poster: e.posterUrl,
      backdrop: e.backdropUrl || e.backdropUrls && e.backdropUrls[0] || e.posterUrl,
      imdb: X(e.externalIds, "imdb"),
      tmdb: X(e.externalIds, "tmdb"),
      tvdb: X(e.externalIds, "tvdb"),
      next: n,
      percent: t ? e.resumePercent || e.percentWatched || 0 : e.resumePercent || 0,
      focusEp: n ? {
        season: n.season,
        episode: n.episode
      } : null
    }
  }

  function ne(e) {
    return {
      key: "wl:" + e.id,
      kind: "movie" === e.mediaType ? "movie" : "series",
      titleId: e.id,
      name: ee(e.name),
      year: e.year,
      overview: e.overview || "",
      poster: e.posterUrl,
      backdrop: e.backdropUrl || e.backdropUrls && e.backdropUrls[0] || e.posterUrl,
      imdb: X(e.externalIds, "imdb"),
      tmdb: X(e.externalIds, "tmdb"),
      tvdb: X(e.externalIds, "tvdb")
    }
  }

  function re(e) {
    return {
      key: "tt:" + e.id,
      kind: "movie" === e.mediaType ? "movie" : "series",
      titleId: e.id,
      name: e.name,
      year: e.year,
      overview: e.overview || "",
      poster: e.poster && e.poster.url,
      backdrop: e.backdrop && e.backdrop.url || e.poster && e.poster.url,
      imdb: e.imdbId || "",
      tmdb: e.tmdbId ? String(e.tmdbId) : "",
      tvdb: e.tvdbId ? String(e.tvdbId) : "",
      releaseDate: e.releaseDate || "",
      lifecycle: e.lifecycleStatus || ""
    }
  }
  document.addEventListener("keydown", function(e) {
    13 === e.keyCode && ($ = !0)
  }, !0), document.addEventListener("keyup", function(e) {
    13 === e.keyCode && ($ = !1)
  }, !0), document.addEventListener("keydown", function(e) {
    if (13 === e.keyCode && J) return e.preventDefault(), e.stopImmediatePropagation(), void K();
    if (!(13 !== e.keyCode || Player.active || document.getElementById("confirm") || document.getElementById("trailer"))) {
      var t = document.activeElement;
      if (Q(t)) {
        if (e.preventDefault(), e.stopImmediatePropagation(), z && z.card === t) return clearTimeout(z.gapTimer), void(Date.now() - z.start >= 700 && Z());
        _(), z = {
          card: t,
          start: Date.now()
        }, t.classList.add("holding"), z.holdTimer = setTimeout(Z, 700)
      }
    }
  }, !0), document.addEventListener("keyup", function(e) {
    if (13 === e.keyCode && J) return e.preventDefault(), e.stopImmediatePropagation(), void K();
    13 === e.keyCode && z && (e.preventDefault(), e.stopImmediatePropagation(), clearTimeout(z.gapTimer), z.gapTimer = setTimeout(function() {
      var e = _();
      e && document.body.contains(e.card) && e.card.click()
    }, 250))
  }, !0);
  var ie = 2;

  function ae(e) {
    var t = [],
      n = [];
    return e.forEach(function(e) {
      (! function(e) {
        if ("series" === e.kind && ("Continuing" === e.lifecycle || "Upcoming" === e.lifecycle)) return !0;
        var t = new Date;
        t.setFullYear(t.getFullYear() - ie);
        var n = e.releaseDate ? new Date(e.releaseDate) : null;
        return n && !isNaN(n) ? n >= t : !!e.year && e.year >= t.getFullYear()
      }(e) ? n : t).push(e)
    }), t.concat(n)
  }
  var oe = ["web", "webdl", "web-dl", "webrip", "hdtv", "hdtvrip", "bluray", "dvdrip", "1080p", "720p", "2160p", "480p", "4k", "x264", "x265", "h264", "h265", "hevc", "avc", "av1", "xvid", "aac", "ac3", "dts", "atmos", "dd", "dd2", "dd5", "ddp", "ddp2", "ddp5", "english", "multi", "dual", "subs", "proper", "repack", "real"],
    se = /^(sky ?sports?|tnt ?sports?|bt ?sport|eurosport|premier ?sports?|dazn|motorsport ?tv|f1 ?tv|racepass|itv\d*|bbc\d*|channel ?4|viaplay)[a-z0-9]*$/i;

  function ce(e) {
    return e.replace(/^([A-Za-z]+)(\d{2,})$/, "$1 $2")
  }

  function le(e) {
    for (var t = String(e || "").replace(/\.[a-z0-9]{2,4}$/i, ""), n = t.split(/[._]+/).filter(Boolean), r = [], i = 0; i < n.length; i++) {
      var a = n[i],
        o = a.toLowerCase(),
        s = i > 0 && (oe.indexOf(n[i - 1].toLowerCase()) >= 0 || se.test(n[i - 1]));
      oe.indexOf(o) >= 0 || (se.test(a) || /^\d{1,2}$/.test(o) && s || i === n.length - 1 && /-/.test(a) && !/^\d/.test(a) || r.push(ce(a).replace(/^[a-z]/, function(e) {
        return e.toUpperCase()
      })))
    }
    return r.join(" ").replace(/\s+/g, " ").trim() || t
  }

  function de(e, t) {
    var n = e && e.items && e.items[0];
    if (!n) return null;
    var r = le(n.fileName || e.title);
    return {
      key: "lib:" + n.id,
      kind: "movie",
      isLibraryItem: !0,
      libraryItemId: n.id,
      libraryName: t.name,
      sourceType: t.sourceType,
      titleId: "library:" + n.id,
      name: r,
      overview: String(n.fileName || e.title || "").replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[._]+/g, " ").trim(),
      poster: ue[t.sourceType] ? Api.libraryArtworkUrl(n.id, "poster") : "",
      backdrop: ue[t.sourceType] ? Api.libraryArtworkUrl(n.id, "backdrop") : ""
    }
  }
  var ue = {
    plex: !0,
    jellyfin: !0
  };
  async function me(e) {
    var t = await Api.libraryGroups(e.id, 20, 0).catch(function() {
        return null
      }),
      n = (t && t.groups || []).map(function(t) {
        return de(t, e)
      }).filter(Boolean);
    return n.length ? ("number" == typeof t.total && t.total > n.length && n.push({
      key: "lib-more:" + e.id,
      kind: "seeAllLibrary",
      library: e,
      name: "See all",
      titleId: ""
    }), {
      title: e.name,
      items: n,
      library: e
    }) : null
  }

  function fe(e, t) {
    return '<button class="card poster media-fallback" style="--hue:' + function(e) {
      for (var t = 0, n = 0; n < e.length; n++) t = 31 * t + e.charCodeAt(n) >>> 0;
      return t % 360
    }(e.name || "") + '" data-focus ' + t + '><svg class="media-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10 8.3v7.4l6.3-3.7z" fill="currentColor"/></svg><span class="card-label">' + x(e.name) + "</span></button>"
  }
  async function pe(e, t) {
    var n = await Api.libraryPlayback(e.libraryItemId).catch(function(e) {
      return {
        error: e
      }
    });
    if (!n.error && n.streamPath) {
      var r = le(n.fileName || n.displayName) || e.name;
      Player.start({
        item: {
          kind: "movie",
          name: r,
          titleId: e.titleId
        },
        episode: null,
        profileId: s.id,
        clientId: i.clientId,
        resume: !0,
        manual: {
          libraryItem: !0,
          releases: [{
            title: r,
            serviceType: n.sourceType || e.sourceType,
            knownPath: n.streamPath
          }]
        },
        onExit: function(e) {
          l = !0, t && document.body.contains(t) ? Nav.focus(t) : Nav.first(), e && C("Couldn't play that: " + e, "warn")
        }
      })
    } else C("Couldn't get that ready to play: " + (n.error && n.error.message || "no stream found"), "warn")
  }

  function ve(e) {
    var t = [];
    return e.year && t.push(e.year), t.push(e.isLibraryItem ? e.libraryName || "Library" : "movie" === e.kind ? "Film" : "Series"), e.next && t.push("Next: S" + e.next.season + " E" + e.next.episode + (e.next.title ? ", " + e.next.title : "")), t.join("   ")
  }
  var he = "roughtfish/mediastorm-webos",
    ge = "",
    be = "";
  try {
    fetch("appinfo.json").then(function(e) {
      return e.json()
    }).then(function(e) {
      ge = e && e.version || "";
      var t = document.getElementById("app-version");
      t && (t.textContent = ye())
    }).catch(function() {})
  } catch (e) {}

  function ye() {
    return "mediastorm for webOS" + (ge ? " " + ge : "") + (be ? " · Server: mediastorm " + be : "")
  }

  function we(e) {
    return e ? '<button class="app-version" id="app-version" data-focus>' + x(ye()) + "</button>" : '<p class="app-version" id="app-version">' + x(ye()) + "</p>"
  }
  var ke = [{
    v: "1.13.0",
    items: ["A trailer page address can be entered on the sign-in screen itself, remembered on that TV from then on, rather than only set at build time."]
  }, {
    v: "1.12.9",
    items: ["Fixed a stall opening a film or series page: the backdrop image now loads at a size suited to the screen, not the full original picture."]
  }, {
    v: "1.12.8",
    items: ["Fixed trailers giving up partway through an ad and offering YouTube instead, even when the trailer itself was about to play fine."]
  }, {
    v: "1.12.4",
    items: ["Fixed very long titles overlapping other text on the home screen, and poster cards losing the start of a long title with no sign anything was cut off."]
  }, {
    v: "1.12.0",
    items: ["A screensaver: leave the home screen idle for a minute and a half, and the background slowly cycles through your watchlist and recent additions."]
  }, {
    v: "1.11.5",
    items: ["Continue watching cards now open straight on the right episode, the same as New episodes cards."]
  }, {
    v: "1.11.0",
    items: ["Library rows: a home screen row for each of mediastorm's own library sources (local folders, Plex, Jellyfin), playing straight through with no release search."]
  }, {
    v: "1.10.0",
    items: ["Genres: film and series genres from the home screen, each with their popular titles."]
  }];

  function Ee() {
    B("What's new", ke.map(function(e) {
      return e.v + "\n" + e.items.join("\n")
    }).join("\n\n"))
  }

  function Se() {
    Api.serverVersion().then(function(e) {
      var t = e && (e.version || e.Version);
      if (t) {
        be = /^v/i.test(t) ? t : "v" + t;
        var n = document.getElementById("app-version");
        n && (n.textContent = ye())
      }
    }, function() {})
  }
  var Ie = e + "-updates";

  function Ne() {
    var e = {};
    try {
      e = JSON.parse(localStorage.getItem(Ie)) || {}
    } catch (t) {
      e = {}
    }
    if (!(e.at && Date.now() - e.at < 864e5)) {
      e.at = Date.now();
      var t = [],
        n = Api.updateStatus().then(function(n) {
          var r = n && n.backend;
          if (r && r.updateAvailable && r.latestVersion) {
            var i = r.currentVersion && r.currentVersion === r.latestVersion,
              a = r.latestVersion + (i && r.latestBuildId ? ":" + r.latestBuildId : "");
            e.server !== a && (t.push(i ? "A newer build of mediastorm " + r.latestVersion + " is available. Update it where you installed mediastorm." : "mediastorm " + r.latestVersion + " is available (you have " + (r.currentVersion || "an older version") + "). Update it where you installed mediastorm."), e.server = a)
          }
        }, function() {}),
        r = (ge ? fetch("https://api.github.com/repos/" + he + "/releases/latest", {
          headers: {
            Accept: "application/vnd.github+json"
          }
        }).then(function(e) {
          return e.ok ? e.json() : null
        }) : Promise.resolve(null)).then(function(n) {
          var r = n && n.tag_name;
          r && function(e, t) {
            for (var n = String(e || "").replace(/^v/i, "").split(/[-+]/)[0].split(".").map(Number), r = String(t || "").replace(/^v/i, "").split(/[-+]/)[0].split(".").map(Number), i = 0; i < Math.max(n.length, r.length); i++) {
              var a = n[i] || 0,
                o = r[i] || 0;
              if (a !== o) return a > o
            }
            return !1
          }(r, ge) && e.app !== r && (t.push("A new version of this app is available: " + r.replace(/^v/i, "") + " (you have " + ge + ")."), e.app = r)
        }, function() {});
      Promise.all([n, r]).then(function() {
        try {
          localStorage.setItem(Ie, JSON.stringify(e))
        } catch (e) {}
        t.length && C(t.join(" "))
      })
    }
  }

  function Ae(e) {
    Nav.onBack(null), W('<div class="center-panel"><h1 class="wordmark">mediastorm</h1><p class="lede">Sign in to your mediastorm server.</p>' + xe("server", "Server", "url", i.server || t.server || "") + xe("username", "Username", "text", i.username || t.username || "") + xe("password", "Password", "password", t.password || "") + xe("trailerPage", "Trailer page (optional)", "url", i.trailerPage || t.trailerPage || "") + '<p class="field-hint">Leave this blank and trailers still work, opening in the TV\'s YouTube app instead of playing in here. See "Trailers" in the README to set one up.</p><button class="btn primary" data-focus data-autofocus id="signin">Sign in</button>' + (e ? '<p class="error">' + x(e) + "</p>" : "") + we() + "</div>", "screen-setup"), Se(), document.getElementById("signin").addEventListener("click", Ce), Nav.first()
  }

  function xe(e, t, n, r) {
    return '<div class="field" data-focus tabindex="0" data-key="' + e + '"><span>' + x(t) + '</span><input type="' + n + '" spellcheck="false" autocapitalize="off" value="' + x(r) + '"></div>'
  }

  function Le(e) {
    var t = n.querySelector('.field[data-key="' + e + '"] input');
    return t ? t.value.trim() : ""
  }
  async function Ce() {
    var e = Le("server"),
      t = Le("username"),
      r = n.querySelector('.field[data-key="password"] input').value,
      o = Le("trailerPage");
    if (e && t && r) {
      Api.configure({
        server: e,
        token: "",
        clientId: i.clientId
      });
      try {
        var s = await Api.login(t, r);
        if (!s || !s.token) throw new Error("The server didn't return a session.");
        i.server = e, i.username = t, i.token = s.token, i.trailerPage = o, a(), Api.configure({
          token: s.token
        }), await Be()
      } catch (e) {
        Ae(401 === e.status ? "That username and password weren't accepted." : e.message)
      }
    } else Ae("Enter the server address, username and password.")
  }
  async function Be(t) {
    Nav.onBack(null);
    try {
      o = await Api.profiles() || [], i.profiles = o, a()
    } catch (e) {
      return 401 === e.status ? (i.token = "", a(), void Ae("Your session has ended. Sign in again.")) : void Ae(e.message)
    }
    if (t) {
      var r = o.filter(function(e) {
        return e.id === i.profileId
      })[0];
      if (r && !r.pinLength) return void Te(r);
      if (1 === o.length && !o[0].pinLength) return void Te(o[0])
    }
    W('<div class="center-panel wide"><h1>Who\'s watching?</h1><div class="profile-grid">' + o.map(function(e, t) {
      var n = e.iconUrl ? '<img src="' + x(Api.server + "/api/users/" + encodeURIComponent(e.id) + "/icon") + '" alt="">' : "<span>" + x((e.name || "?").charAt(0).toUpperCase()) + "</span>";
      return '<button class="profile" data-focus data-index="' + t + '"' + (e.id === i.profileId ? " data-autofocus" : "") + '><div class="face" style="background:' + x(e.color || "#2B374A") + '">' + n + '</div><div class="name">' + x(e.name) + (e.pinLength ? " <small>PIN</small>" : "") + "</div></button>"
    }).join("") + '</div><button class="btn quiet" data-focus id="signout">Sign out of this TV</button>' + we(!0) + "</div>", "screen-profiles"), Se(), n.querySelectorAll(".profile").forEach(function(e) {
      e.addEventListener("click", function() {
        Te(o[+e.getAttribute("data-index")])
      })
    }), document.getElementById("app-version").addEventListener("click", Ee), document.getElementById("signout").addEventListener("click", function() {
      Api.logout().catch(function() {}), (i.profiles || []).forEach(function(t) {
        try {
          localStorage.removeItem(e + "-home-" + t.id), localStorage.removeItem(p(t.id)), localStorage.removeItem(w(t.id))
        } catch (e) {}
      }), i.token = "", i.profileId = "", i.profiles = [], a(), gt = {}, Ae()
    }), Nav.first()
  }

  function Te(e) {
    e.pinLength && e.id !== (s && s.id) ? qe(e) : (s = e, i.profileId = e.id, a(), c = null, A = null, Pe())
  }

  function qe(e, t) {
    Nav.onBack(function() {
      Be()
    }), W('<div class="center-panel"><h1>Enter ' + x(e.name) + "'s PIN</h1>" + xe("pin", "PIN", "password", "") + '<button class="btn primary" data-focus id="pin-go">Continue</button>' + (t ? '<p class="error">' + x(t) + "</p>" : "") + "</div>", "screen-setup"), document.getElementById("pin-go").addEventListener("click", async function() {
      try {
        await Api.verifyPin(e.id, Le("pin")), s = e, i.profileId = e.id, a(), c = null, Pe()
      } catch (t) {
        qe(e, 401 === t.status ? "That PIN isn't right." : t.message)
      }
    }), Nav.first()
  }
  async function De() {
    var e = s.id,
      t = await Promise.all([Api.continueWatching(e).catch(function(e) {
        return {
          error: e
        }
      }), Api.watchlist(e).catch(function(e) {
        return {
          error: e
        }
      }), Api.topTen(e, "movie").catch(function(e) {
        return {
          error: e
        }
      }), Api.topTen(e, "series").catch(function(e) {
        return {
          error: e
        }
      }), Api.libraries().catch(function() {
        return []
      })]);
    if (t.every(function(e) {
        return e && e.error && 401 === e.error.status
      })) {
      var n = new Error("session");
      throw n.status = 401, n
    }
    var r, i = [];
    Array.isArray(t[0]) && t[0].length && i.push({
      title: "Continue watching",
      wide: !0,
      items: t[0].map(te)
    }), k(e) || (y[r = e] || (y[r] = !0, Api.calendar(r, 14, 7).then(function(e) {
      var t = (e && e.items || []).filter(function(e) {
        return e && ("watchlist" === e.source || "history" === e.source) && e.airDate
      });
      try {
        localStorage.setItem(w(r), JSON.stringify({
          items: t,
          at: Date.now()
        }))
      } catch (e) {}
      t.length && s && s.id === r && (l = !0, d ? setTimeout(function() {
        s && s.id === r && Me()
      }, 3e3) : Me())
    }, function() {
      try {
        localStorage.setItem(w(r), JSON.stringify({
          items: [],
          at: Date.now()
        }))
      } catch (e) {}
    }).then(function() {
      y[r] = !1
    })));
    var a = N(e, Array.isArray(t[0]) ? t[0].map(te) : []);
    a[0] && "New episodes" === a[0].title && i.push(a.shift()), v(e) || h(e);
    var o = function(e) {
      try {
        var t = JSON.parse(localStorage.getItem(p(e)));
        return t && Array.isArray(t.items) ? t : null
      } catch (e) {
        return null
      }
    }(e);
    if (o && o.items.length) {
      var c = o.items.filter(function(e) {
          return "movie" === e.kind
        }),
        u = o.items.filter(function(e) {
          return "movie" !== e.kind
        });
      c.length >= 3 && u.length >= 3 ? (i.push({
        title: "AI picks: films",
        items: c
      }), i.push({
        title: "AI picks: series",
        items: u
      })) : i.push({
        title: "AI picks for you",
        items: o.items
      })
    }
    Array.isArray(t[1]) && t[1].length && i.push({
      title: "Your watchlist",
      items: t[1].map(ne)
    }), a.length && i.push(a.shift()), [
      [t[2], "Top 10 films today"],
      [t[3], "Top 10 series today"]
    ].forEach(function(e) {
      var t = e[0] && e[0].items;
      Array.isArray(t) && t.length && i.push({
        title: e[1],
        items: t.map(function(e) {
          return re(e.title)
        })
      })
    });
    var m = (Array.isArray(t[4]) ? t[4] : []).filter(function(e) {
      return e && "complete" === e.lastScanStatus && (e.lastScanTotal > 0 || e.lastScanDiscovered > 0)
    });
    m.length && (await Promise.all(m.map(me))).filter(Boolean).forEach(function(e) {
      i.push(e)
    });
    var f = t.filter(function(e) {
      return e && e.error
    }).length;
    return {
      rows: i,
      failed: f
    }
  }
  async function Me() {
    if (!d) {
      d = !0;
      var e = s && s.id;
      try {
        var t = await De();
        if (!s || s.id !== e) return;
        l = !1;
        var r = JSON.stringify(t.rows) !== JSON.stringify(c && c.rows);
        c = t, m(t), !r || "screen-home" !== n.className || Player.active || document.getElementById("confirm") || Pe()
      } catch (e) {
        401 === e.status && (i.token = "", a(), Ae("Your session has ended. Sign in again."))
      } finally {
        d = !1
      }
    }
  }
  async function Pe(e) {
    if (Nav.onBack(function() {
        (o.length > 1 || s && s.pinLength) && Be()
      }), setTimeout(Ne, 4e3), Pt(), !c && !e) {
      var t = function() {
        try {
          var e = JSON.parse(localStorage.getItem(u()));
          return e && e.rows ? e : null
        } catch (e) {
          return null
        }
      }();
      t && (c = {
        rows: t.rows,
        failed: 0
      }, l = !0)
    }
    if (c && l && !e ? Me() : c && !e && s && !v(s.id) && h(s.id), !c || e) {
      W('<div class="loading">Loading ' + x(s.name) + "'s home</div>", "screen-home");
      try {
        c = await De(), l = !1, m(c)
      } catch (e) {
        return 401 === e.status ? (i.token = "", a(), void Ae("Your session has ended. Sign in again.")) : (W('<div class="center-panel"><h1>Couldn\'t load your home screen</h1><p class="lede">' + x(e.message) + '</p><button class="btn primary" data-focus id="retry">Try again</button></div>', "screen-setup"), document.getElementById("retry").addEventListener("click", function() {
          Pe(!0)
        }), void Nav.first())
      }
    }
    var r = [];

    function d(e, t) {
      var n = r.push(e) - 1;
      if ("seeAllLibrary" === e.kind) return '<button class="card poster see-all" data-focus data-i="' + n + '" data-key="' + x(e.key) + '">See all →</button>';
      var i = t ? e.backdrop || e.poster : e.poster || e.backdrop;
      if (e.isLibraryItem && !i) return fe(e, 'data-i="' + n + '" data-key="' + x(e.key) + '"' + nt(e));
      var a = t && e.percent > 1 ? '<i class="bar"><b style="width:' + Math.min(100, e.percent) + '%"></b></i>' : "",
        o = t ? '<span class="card-label">' + x(e.name) + (e.next ? "<em>S" + e.next.season + " E" + e.next.episode + (e.note ? " · " + x(e.note) : "") + "</em>" : e.note ? "<em>" + x(e.note) + "</em>" : "") + "</span>" : "";
      return '<button class="card ' + (t ? "wide" : "poster") + '" data-focus data-i="' + n + '" data-key="' + x(e.key) + '"' + (t ? "" : nt(e)) + ">" + (i ? R(i, t ? "w780" : "w342", !0) : "") + L(e.name) + o + a + "</button>"
    }
    Y = r;
    var f = c.rows.map(function(e) {
      var t = e.library ? "row-refresh-" + e.library.id.replace(/[^a-zA-Z0-9]/g, "") : "",
        n = e.library ? '<button class="row-refresh" id="' + t + '" data-focus data-refresh-lib="' + x(e.library.id) + '" aria-label="Refresh ' + x(e.title) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' : "",
        r = t ? ' data-up="#' + t + '"' : "";
      return '<section class="row"><h2>' + x(e.title) + n + '</h2><div class="row-track"' + r + ">" + e.items.map(function(t) {
        return d(t, e.wide)
      }).join("") + "</div></section>"
    }).join("");
    W('<div id="home"><div id="hero"><div class="hero-art"><img id="hero-a" alt="" decoding="async"><img id="hero-b" alt="" decoding="async"></div><div class="hero-text"><h1 id="hero-title"></h1><p class="meta" id="hero-meta"></p><p class="overview" id="hero-overview"></p></div><div class="home-bar"><button class="btn pill" data-focus id="home-search">Search</button><button class="btn pill" data-focus id="home-genres">Genres</button><button class="btn pill quiet" data-focus id="home-profile">' + x(s.name) + '</button></div></div><div id="rows" data-vscroll><div class="rows-layer">' + (f || '<div class="empty">Nothing here yet. Add films and series to your watchlist in mediastorm and they\'ll appear here.</div>') + "</div></div></div>", "screen-home"), document.getElementById("home-search").addEventListener("click", function() {
      Jt.focusKey = null, Xt()
    }), document.getElementById("home-genres").addEventListener("click", function() {
      Wt()
    }), document.getElementById("home-profile").addEventListener("click", function() {
      Be()
    }), c.failed && C("Some rows couldn't be loaded. Press Back and pick your profile again to retry.", "warn");
    var p = null,
      g = "a";
    document.getElementById("home").addEventListener("focusin", function(e) {
      var t = e.target.closest(".card");
      if (t) {
        var n = r[+t.getAttribute("data-i")];
        A = n.key, clearTimeout(p), p = setTimeout(function() {
          ! function(e) {
            if (document.getElementById("hero-title")) {
              document.getElementById("hero-title").textContent = e.name, document.getElementById("hero-meta").textContent = ve(e), document.getElementById("hero-overview").textContent = e.overview;
              var t = e.backdrop || e.poster || "";
              U(t);
              var n = F(t, "w1280"),
                r = document.getElementById("hero-" + g);
              if (r.getAttribute("src") !== n) {
                var i = document.getElementById("hero-" + ("a" === g ? "b" : "a"));
                i.onload = function() {
                  i.className = "on", r.className = "", g = "a" === g ? "b" : "a"
                }, i.onerror = function() {
                  i.getAttribute("src") !== t ? i.src = t : r.className = ""
                }, n ? i.src = n : r.className = ""
              }
            }
          }(n), "movie" !== n.kind && bt(n)
        }, 350)
      }
    }), n.querySelectorAll(".card").forEach(function(e) {
      e.addEventListener("click", function() {
        var t = r[+e.getAttribute("data-i")];
        t.isLibraryItem ? pe(t, e) : "seeAllLibrary" === t.kind ? Yt(t.library) : t.focusEp ? (yt = null, je(t, null, t.focusEp)) : kt(t, null)
      })
    }), n.querySelectorAll(".row-refresh").forEach(function(e) {
      e.addEventListener("click", function() {
        if (!e.classList.contains("spinning")) {
          var t = e.getAttribute("data-refresh-lib"),
            n = c.rows.filter(function(e) {
              return e.library && e.library.id === t
            })[0];
          n && (e.classList.add("spinning"), me(n.library).then(function(t) {
            if (e.classList.remove("spinning"), t) {
              n.items = t.items;
              var i = e.closest(".row").querySelector(".row-track");
              i.innerHTML = t.items.map(function(e) {
                return d(e, !1)
              }).join(""), i.querySelectorAll(".card").forEach(function(e) {
                e.addEventListener("click", function() {
                  var t = r[+e.getAttribute("data-i")];
                  t.isLibraryItem ? pe(t, e) : "seeAllLibrary" === t.kind && Yt(t.library)
                })
              }), tt(i), C(n.title + " refreshed.")
            } else C("Nothing in " + n.title + " right now.")
          }, function() {
            e.classList.remove("spinning"), C("Couldn't refresh " + n.title + ".", "warn")
          }))
        }
      })
    });
    var b = A && n.querySelector('.card[data-key="' + (window.CSS && CSS.escape ? CSS.escape(A) : A) + '"]');
    b ? Nav.focus(b) : Nav.focus(n.querySelector("#rows .card") || n.querySelector("[data-focus]")), tt(n.querySelector("#rows"))
  }

  function je(e, t, n) {
    "movie" === e.kind ? vt(e, t) : ht(e, t, n)
  }
  var Oe = '<button class="btn pill quiet go-home" data-focus id="go-home">Home</button>';

  function He(e, t, n) {
    return U(e.backdrop || e.poster || ""), Oe + '<div class="title-art">' + (e.backdrop ? '<img src="' + x(F(e.backdrop, "w1280")) + '" alt="" onerror="this.remove()">' : "") + '</div><div class="title-body' + (n ? " compact" : " film") + '"><h1>' + x(e.name) + '</h1><div class="meta-row"><p class="meta" id="title-meta">' + x(ve(e)) + '</p><span class="ratings" id="title-ratings"></span></div><p class="overview">' + x(e.overview) + '</p><div class="actions" id="actions"><button class="btn primary" data-focus data-autofocus id="play-main">Play</button></div>' + (t ? '<p class="error">' + x(t) + "</p>" : "") + "</div>" + (n || "")
  }
  n.addEventListener("click", function(e) {
    e.target && "go-home" === e.target.id && (yt = null, Pe())
  });
  var Ue = null,
    We = 1500;

  function Fe(e) {
    var t = n.querySelector(".title-body");
    if (t) {
      var r = t.querySelector(":scope > p.error");
      if (r && r.parentNode.removeChild(r), e) {
        var i = document.createElement("p");
        i.className = "error", i.textContent = e;
        var a = document.getElementById("actions");
        a && a.nextSibling ? t.insertBefore(i, a.nextSibling) : t.appendChild(i)
      }
    }
  }
  var Re = {};

  function ze(e) {
    if ("movie" !== e.kind) return bt(e).then(function(e) {
      return e && !e.error && e.title || null
    });
    var t = "movie|" + e.titleId;
    return Re[t] || (Re[t] = Api.movieDetails(e, s.id).then(function(e) {
      return e && (e.title || e) || null
    }).catch(function() {
      return delete Re[t], null
    })), Re[t]
  }

  function Ye(e) {
    return (e && e.credits && e.credits.cast || []).filter(function(e) {
      return e && e.id && e.name
    }).sort(function(e, t) {
      return (e.order || 0) - (t.order || 0)
    }).slice(0, 20).map(function(e) {
      return {
        id: e.id,
        name: e.name,
        character: e.character || "",
        photo: e.profileUrl || ""
      }
    })
  }

  function Je(e, t) {
    return '<button class="card person" data-focus data-p="' + t + '">' + (e.photo ? R(e.photo, "w185", !0) : "") + L(e.name) + '<span class="card-label">' + x(e.name) + (e.character ? "<em>" + x(e.character) + "</em>" : "") + "</span></button>"
  }
  var Ve = Util.showIds;
  async function $e(e) {
    for (var t = null, n = 0, r = Ve(e); n < r.length; n++) {
      var i = await Api.seriesWatchState(s.id, r[n]).catch(function() {
        return null
      });
      if (i && i.watchedEpisodes && Object.keys(i.watchedEpisodes).length) return i;
      i && !t && (t = i)
    }
    return t
  }
  var Ge = null,
    Ke = 0,
    _e = null;

  function Qe(e) {
    if (!e || "movie" !== e.kind) return "";
    var t = [];
    e.titleId && t.push("movie:" + e.titleId), e.tmdb && t.push("movie:tmdb:movie:" + e.tmdb, "movie:tmdb:" + e.tmdb), e.imdb && t.push("movie:imdb:" + e.imdb, "movie:" + e.imdb), e.tvdb && t.push("movie:tvdb:movie:" + e.tvdb);
    var n = String(e.titleId || "").match(/^tmdb:movie:(\d+)$/);
    return n && !e.tmdb && t.push("movie:tmdb:" + n[1]), t.join("|").toLowerCase()
  }

  function Ze() {
    return Ge && Date.now() - Ke < 12e4 ? Promise.resolve(Ge) : _e || (_e = Api.watchedKeys(s.id).then(function(e) {
      var t = {};
      return e && Array.isArray(e.watched) ? e.watched.forEach(function(e) {
        t[String(e).toLowerCase()] = !0
      }) : Array.isArray(e) && e.forEach(function(e) {
        if (e && e.watched && "movie" === e.mediaType) {
          t[("movie:" + e.itemId).toLowerCase()] = !0;
          var n = e.externalIds || {};
          n.tmdb && (t["movie:tmdb:movie:" + n.tmdb] = !0), n.imdb && (t[("movie:imdb:" + n.imdb).toLowerCase()] = !0)
        }
      }), Ge = t, Ke = Date.now(), _e = null, t
    }, function() {
      return _e = null, Ge || {}
    }))
  }

  function Xe() {
    return Ge = null, Ze()
  }

  function et(e, t) {
    return !!t && t.split("|").some(function(t) {
      return e[t]
    })
  }

  function tt(e) {
    e && e.querySelector("[data-wk]") && Ze().then(function(t) {
      e.querySelectorAll("[data-wk]").forEach(function(e) {
        var n = et(t, e.getAttribute("data-wk")),
          r = e.querySelector("i.seen");
        n && !r ? ((r = document.createElement("i")).className = "seen", r.textContent = "✓", e.appendChild(r)) : !n && r && r.parentNode.removeChild(r)
      })
    })
  }

  function nt(e) {
    var t = Qe(e);
    return t ? ' data-wk="' + x(t) + '"' : ""
  }

  function rt(e, t) {
    return "seeAllLibrary" === e.kind ? '<button class="card poster see-all" data-focus data-t="' + t + '">See all →</button>' : e.isLibraryItem && !e.poster ? fe(e, 'data-t="' + t + '"' + nt(e)) : '<button class="card poster" data-focus data-t="' + t + '"' + nt(e) + ">" + (e.poster ? R(e.poster, "w342", !0) : "") + L(e.name, e.year ? " (" + e.year + ")" : "") + "</button>"
  }

  function it(e) {
    if (!e) return "";
    var t = {};

    function n(e) {
      return Math.round(e.max && 100 !== e.max ? e.value / e.max * 100 : e.value) + "%"
    }

    function r(e, t) {
      var n = e.max && e.max !== t ? e.value / e.max * t : e.value;
      return 100 === t ? String(Math.round(n)) : n.toFixed(1)
    }(e.ratings || []).forEach(function(e) {
      e && e.source && e.value > 0 && (t[String(e.source).toLowerCase()] = e)
    });
    var i = [];
    t.imdb && i.push(["imdb", r(t.imdb, 10), "IMDb"]), t.tomatoes && i.push([n(t.tomatoes).replace("%", "") >= 60 ? "rt_critics" : "rt_rotten", n(t.tomatoes), "Rotten Tomatoes"]), t.audience && i.push(["rt_audience", n(t.audience), "Audience"]), t.metacritic && i.push(["metacritic", r(t.metacritic, 100), "Metacritic"]), t.letterboxd && i.push(["letterboxd", r(t.letterboxd, 5), "Letterboxd"]), !i.length && t.tmdb && i.push(["tmdb", r(t.tmdb, 10), "TMDB"]);
    var a = i.map(function(e) {
        return '<span class="rating" title="' + x(e[2]) + '">' + (t = e[0], '<img src="' + x(Api.staticUrl("rating_icons/" + t + ".png")) + '" alt="" onerror="this.remove()">') + x(e[1]) + "</span>";
        var t
      }).join(""),
      o = [];
    return e.certification && o.push('<span class="cert">' + x(e.certification) + "</span>"), e.runtimeMinutes > 0 && o.push(x(Math.floor(e.runtimeMinutes / 60) ? Math.floor(e.runtimeMinutes / 60) + "h " + e.runtimeMinutes % 60 + "m" : e.runtimeMinutes + "m")), e.genres && e.genres.length && o.push(x(e.genres.slice(0, 2).join(", "))), a + (o.length ? '<span class="rating-extra">' + o.join("<i>·</i>") + "</span>" : "")
  }
  var at = null;
  async function ot(e, t) {
    var n = document.getElementById("actions");
    if (n && !n.querySelector(".wl-btn")) {
      var r = document.createElement("button");
      r.className = "btn wl-btn", r.setAttribute("data-focus", ""), r.textContent = "+ Watchlist";
      var i = n.querySelector(".trailer-btn") || n.querySelector(".btn:not(.primary):not(.quiet)");
      n.insertBefore(r, i ? i.nextSibling : null);
      var a, o = function(e, t) {
          return t.filter(function(t) {
            if (!t) return !1;
            if (t.id === e.titleId) return !0;
            var n = t.externalIds || {};
            return "movie" === t.mediaType == ("movie" === e.kind) && (e.tvdb && n.tvdb === String(e.tvdb) || e.tmdb && n.tmdb === String(e.tmdb) || e.imdb && n.imdb === e.imdb)
          })[0] || null
        }(e, await (!a && at && Date.now() - at.at < 6e4 ? Promise.resolve(at.list) : Api.watchlist(s.id).then(function(e) {
          return (at = {
            at: Date.now(),
            list: Array.isArray(e) ? e : []
          }).list
        }, function() {
          return at && at.list || []
        }))),
        c = t && t.name || ee(e.name);
      if (o && o.name && o.name !== c && ee(o.name) !== o.name) {
        var d = {};
        for (var u in o) d[u] = o[u];
        d.name = c, Api.addToWatchlist(s.id, d).then(function() {
          o = d, at = null, l = !0
        }, function() {})
      }
      f();
      var m = !1;
      r.addEventListener("click", async function() {
        if (!m) {
          m = !0;
          var n = "movie" === e.kind ? "movie" : "series";
          try {
            if (o) await Api.removeFromWatchlist(s.id, o.mediaType || n, o.id || e.titleId), o = null, C("Removed " + e.name + " from your watchlist.");
            else {
              var r = t || {},
                i = {};
              e.imdb && (i.imdb = String(e.imdb)), e.tmdb && (i.tmdb = String(e.tmdb)), e.tvdb && (i.tvdb = String(e.tvdb));
              var a = {
                  id: e.titleId,
                  mediaType: n,
                  name: t && t.name || ee(e.name),
                  year: +e.year || 0,
                  overview: e.overview || "",
                  posterUrl: e.poster || "",
                  backdropUrl: e.backdrop || "",
                  externalIds: i,
                  genres: r.genres || [],
                  runtimeMinutes: r.runtimeMinutes || 0
                },
                c = await Api.addToWatchlist(s.id, a);
              o = c && c.id ? c : a, C("Added " + e.name + " to your watchlist.")
            }
            at = null, l = !0, f()
          } catch (e) {
            C("Couldn't change your watchlist: " + e.message, "warn")
          }
          m = !1
        }
      })
    }

    function f() {
      r.textContent = o ? "✓ On watchlist" : "+ Watchlist", r.classList.toggle("on", !!o)
    }
  }

  function st(e) {
    var t = [];
    e && e.primaryTrailer && t.push(e.primaryTrailer);
    var n = (t = t.concat(e && e.trailers || [])).filter(function(e) {
      return e && /youtube/i.test((e.site || "") + " " + (e.url || ""))
    });
    n.sort(function(e, t) {
      var n = function(e) {
        return (/trailer/i.test(e.type || e.name || "") ? 2 : 0) + (e.official ? 1 : 0)
      };
      return n(t) - n(e)
    });
    var r = n[0];
    if (!r) return null;
    if (r.key && /^[\w-]{6,}$/.test(r.key)) return r.key;
    var i = String(r.url || r.embedUrl || "").match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
    return i ? i[1] : null
  }
  async function ct(e, r) {
    var a = st(r),
      o = document.getElementById("actions");
    if (o && !o.querySelector(".trailer-btn")) {
      if (!a) {
        var c = await Api.trailers(e, s.id).catch(function() {
          return null
        });
        if (!(a = st(c)) || !document.body.contains(o) || o.querySelector(".trailer-btn")) return
      }
      var l = document.createElement("button");
      l.className = "btn trailer-btn", l.setAttribute("data-focus", ""), l.textContent = "Trailer", l.addEventListener("click", function() {
        ! function(e, r) {
          var a = i.trailerPage || t && t.trailerPage || "";
          if (!a) return void q("This trailer won't play here", "It can be opened in the TV's YouTube app instead. Back or the home bar brings you back here afterwards.", [{
            label: "Open in YouTube",
            fn: function() {
              dt(e, r)
            }
          }]);
          var o = document.activeElement,
            s = Nav.currentBack ? Nav.currentBack() : null,
            c = document.createElement("div");
          c.id = "trailer", c.innerHTML = '<iframe allow="autoplay; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" src="' + x(a + (a.indexOf("?") >= 0 ? "&" : "?") + "v=" + encodeURIComponent(r)) + '"></iframe><div class="trailer-keep" tabindex="0" data-focus></div><div class="trailer-hint">' + x(e.name) + " · trailer. OK pauses, Back closes</div>", document.body.appendChild(c);
          var l = c.querySelector("iframe"),
            d = c.querySelector(".trailer-keep");
          Nav.setScope(c), d.focus();
          var u = !1,
            m = !1,
            f = Date.now();

          function p(e, t) {
            var n = {
              ms: "trailer",
              cmd: e
            };
            for (var r in t || {}) n[r] = t[r];
            try {
              l.contentWindow.postMessage(n, "*")
            } catch (e) {}
          }

          function v(e) {
            var t = e.data;
            t && "trailer" === t.ms && !m && e.source === l.contentWindow && (f = Date.now(), "playing" === t.event ? u = !0 : "ended" === t.event ? y() : "error" === t.event && w())
          }
          window.addEventListener("message", v);
          var h = setInterval(function() {
              u ? clearInterval(h) : Date.now() - f > 25e3 && (clearInterval(h), w())
            }, 1e3),
            g = setInterval(function() {
              document.activeElement !== d && d.focus()
            }, 400);

          function b(e) {
            var t = e.keyCode;
            e.preventDefault(), e.stopImmediatePropagation(), 461 === t || 27 === t || 8 === t ? y() : 13 === t || 415 === t || 19 === t || 10252 === t ? p("toggle") : 37 === t || 412 === t ? p("seekBy", {
              by: -10
            }) : 39 !== t && 417 !== t || p("seekBy", {
              by: 10
            })
          }

          function y() {
            m || (m = !0, clearInterval(h), clearInterval(g), window.removeEventListener("message", v), document.removeEventListener("keydown", b, !0), c.parentNode && c.parentNode.removeChild(c), Nav.setScope(n), Nav.onBack(s), o && document.body.contains(o) ? Nav.focus(o) : Nav.first())
          }

          function w() {
            m || (y(), q("This trailer won't play here", "It can be opened in the TV's YouTube app instead. Back or the home bar brings you back here afterwards.", [{
              label: "Open in YouTube",
              fn: function() {
                dt(e, r)
              }
            }]))
          }
          document.addEventListener("keydown", b, !0)
        }(e, a)
      });
      var d = o.querySelector(".btn:not(.primary):not(.quiet)");
      o.insertBefore(l, d ? d.nextSibling : null)
    }
  }
  var lt = null;

  function dt(e, t) {
    function n(e) {
      q("Couldn't play the trailer", "YouTube wouldn't play it here, and the TV's YouTube app couldn't be opened" + (e ? " (" + e + ")" : "") + ". Is the YouTube app installed?", [])
    }
    if ("undefined" != typeof PalmServiceBridge) try {
      (lt = new PalmServiceBridge).onservicecallback = function(e) {
        var t = {};
        try {
          t = JSON.parse(e)
        } catch (e) {}!1 === t.returnValue && n(t.errorText || "refused")
      }, lt.call("luna://com.webos.applicationManager/launch", JSON.stringify({
        id: "youtube.leanback.v4",
        params: {
          contentTarget: "v=" + t
        }
      })), C("Opening the trailer in YouTube. Back or the home bar brings you back here.")
    } catch (e) {
      n(e.message)
    } else n("not running on a webOS TV")
  }
  async function ut(e, t) {
    var r = t || await ze(e),
      i = document.getElementById("play-main");
    if (i && document.body.contains(i)) {
      if (r && r.name && r.name !== e.name) {
        e.name = r.name;
        var a = n.querySelector(".title-body h1");
        a && (a.textContent = r.name)
      }! function(e) {
        var t = document.getElementById("title-ratings");
        t && (t.innerHTML = it(e))
      }(r), ct(e, r), ot(e, r);
      var o = Ye(r),
        c = [];
      if ("movie" === e.kind && r && r.collection && r.collection.id) {
        var l = await Api.collectionDetails(r.collection.id, s.id).catch(function() {
          return null
        });
        if (!document.body.contains(i)) return;
        (c = (l && l.movies || []).map(re).filter(function(t) {
          return t.titleId !== e.titleId
        })).colName = l && l.name || r.collection.name || "this collection"
      }
      var d = r && r.tmdbId || e.tmdb,
        u = [];
      if (d) {
        var m = await Api.similar("movie" === e.kind ? "movie" : "series", d, s.id).catch(function() {
          return null
        });
        if (!document.body.contains(i)) return;
        var f = {};
        u = ((Array.isArray(m) ? m : m && (m.titles || m.items || m.results)) || []).map(function(e) {
          return e && e.title && !e.id ? e.title : e
        }).filter(function(t) {
          return t && t.id && t.id !== e.titleId && !f[t.id] && (f[t.id] = !0)
        }).map(re).slice(0, 20)
      }
      if (o.length || c.length || u.length) {
        var p = "movie" === e.kind,
          v = '<div class="title-extras' + (p ? " film" : "") + '" data-vscroll><div class="rows-layer">' + (o.length ? '<section class="row"><h2>Cast</h2><div class="row-track">' + o.map(Je).join("") + "</div></section>" : "") + (c.length ? '<section class="row"><h2>' + x("In " + c.colName) + '</h2><div class="row-track">' + c.map(rt).join("") + "</div></section>" : "") + (u.length ? '<section class="row"><h2>More like this</h2><div class="row-track">' + u.map(function(e, t) {
            return rt(e, "m" + t)
          }).join("") + "</div></section>" : "") + "</div></div>";
        n.insertAdjacentHTML("beforeend", v + (p ? "" : '<div class="extras-hint">▼ ' + (o.length ? "Cast and more" : c.length ? x("More in " + c.colName) : "More like this") + "</div>"));
        var h = n.querySelector(".title-extras");
        if (tt(h), p) {
          var g = document.getElementById("actions").getBoundingClientRect();
          if (g.bottom + 24 + 330 > window.innerHeight) {
            var b = n.querySelector(".title-body");
            b.classList.add("tight"), T(b.querySelector(".overview"), e.name, function() {
              return e.overview
            }), g = document.getElementById("actions").getBoundingClientRect()
          }
          h.style.top = Math.round(g.bottom + 24) + "px"
        }
        var y = yt;
        h.querySelectorAll("[data-p]").forEach(function(e) {
          e.addEventListener("click", function() {
            ft(o[+e.getAttribute("data-p")], w)
          })
        }), h.querySelectorAll("[data-t]").forEach(function(e) {
          var t = e.getAttribute("data-t");
          e.addEventListener("click", function() {
            kt("m" === t.charAt(0) ? u[+t.slice(1)] : c[+t], w)
          })
        })
      }
    }

    function w() {
      yt = y, je(e)
    }
  }
  n.addEventListener("focusin", function(e) {
    n.classList.contains("screen-title") ? (n.classList.toggle("extras-on", !(!e.target.closest || !e.target.closest(".title-extras:not(.film)"))), n.scrollTop = 0, document.documentElement.scrollTop = 0, document.body.scrollTop = 0) : n.classList.remove("extras-on")
  });
  var mt = {};
  async function ft(e, t) {
    Nav.onBack(function() {
      t ? t() : Pe()
    }), W(Oe + '<div class="person-head"><div class="person-photo">' + (e.photo ? R(e.photo, "w342", !1) : "") + "</div><div><h1>" + x(e.name) + '</h1><p class="meta" id="person-meta">' + x(e.character ? "Plays " + e.character : "") + '</p><p class="bio" id="person-bio"></p></div></div><div id="person-rows" data-vscroll><div class="rows-layer"><p class="muted" style="margin-left:var(--pad)">Loading</p></div></div>', "screen-person"), Nav.focus(document.getElementById("go-home"));
    var r = String(e.id);
    mt[r] || (mt[r] = Api.personDetails(e.id, s.id).catch(function(e) {
      return delete mt[r], {
        error: e
      }
    }));
    var i = await mt[r],
      a = n.querySelector("#person-rows .rows-layer");
    if (a) {
      if (!i || i.error) return Nav.focus(document.getElementById("go-home")), void(a.innerHTML = '<p class="error" style="margin-left:var(--pad)">Couldn\'t load ' + x(e.name) + "'s films and series.</p>");
      var o = i.person || {},
        c = [];
      o.knownFor && c.push("Acting" === o.knownFor ? "Actor" : o.knownFor), o.birthday && c.push("Born " + o.birthday.slice(0, 4) + (o.placeOfBirth ? ", " + o.placeOfBirth : "")), document.getElementById("person-meta").textContent = c.join(" · ") || (e.character ? "Plays " + e.character : ""), document.getElementById("person-bio").textContent = o.biography || "";
      var l = {},
        d = (i.filmography || []).filter(function(e) {
          return !(!e || !e.id || "person" === e.mediaType || l[e.id]) && (l[e.id] = !0)
        }).map(re),
        u = d.filter(function(e) {
          return "movie" === e.kind
        }).slice(0, 30),
        m = d.filter(function(e) {
          return "movie" !== e.kind
        }).slice(0, 30),
        f = [];
      a.innerHTML = v("Films", u) + v("Series", m) || '<p class="muted" style="margin-left:var(--pad)">Nothing else listed for ' + x(e.name) + ".</p>", tt(a), a.querySelectorAll("[data-t]").forEach(function(e) {
        e.addEventListener("click", function() {
          kt(f[+e.getAttribute("data-t")], h)
        })
      });
      var p = a.querySelector("[data-t]");
      p ? Nav.focus(p) : Nav.focus(document.getElementById("go-home"))
    }

    function v(e, t) {
      if (!t.length) return "";
      var n = f.length;
      return f = f.concat(t), '<section class="row"><h2>' + x(e) + '</h2><div class="row-track">' + t.map(function(e, t) {
        return rt(e, n + t)
      }).join("") + "</div></section>"
    }

    function h() {
      ft(e, t)
    }
  }

  function pt(e, t) {
    return function(e) {
      var t = c && c.rows && c.rows.filter(function(e) {
        return e.wide
      })[0];
      return !(!t || !t.items.some(function(t) {
        return t.titleId === e.titleId
      }))
    }(e) ? [{
      label: "Remove from Continue watching",
      fn: function() {
        D(e, t || function() {})
      }
    }] : []
  }
  async function vt(e, t) {
    Nav.onBack(function() {
      wt()
    }), W(He(e, t), "screen-title"), T(n.querySelector(".title-body .overview"), e.name, function() {
      return e.overview
    });
    var r = document.getElementById("actions"),
      i = document.getElementById("play-main");
    i.addEventListener("click", function() {
      Et(e, {
        resume: !0
      })
    });
    var a = St(function() {
      Ct(e, null, function() {
        vt(e)
      })
    });
    r.appendChild(a), ut(e), Nav.first();
    var o = null;
    async function c() {
      var t = await Api.getProgress(s.id, "movie", e.titleId).catch(function() {
        return null
      });
      if (document.body.contains(i)) {
        var n = document.activeElement;
        t && t.position > 30 && t.percentWatched < 95 ? (i.textContent = "Resume from " + M(t.position), o || ((o = document.createElement("button")).className = "btn", o.setAttribute("data-focus", ""), o.textContent = "Play from the start", o.addEventListener("click", function() {
          Et(e, {
            resume: !1,
            startAt: 0
          })
        }), r.insertBefore(o, a))) : (i.textContent = "Play", o && (n === o && Nav.focus(i), o.parentNode.removeChild(o), o = null))
      }
    }

    function d(e) {
      var t = n.querySelector(".meta-row"),
        r = t && t.querySelector(".watched-tag");
      t && (e && !r ? ((r = document.createElement("span")).className = "watched-tag", r.textContent = "✓ Watched", t.insertBefore(r, t.firstChild)) : !e && r && r.parentNode.removeChild(r))
    }
    Ue = {
      item: e,
      node: i,
      restore: function(e, t, n) {
        Fe(e), Nav.focus(n && document.body.contains(n) ? n : i), setTimeout(c, We)
      }
    }, Ze().then(function(t) {
      document.body.contains(i) && d(et(t, Qe(e)))
    });
    var u = document.createElement("button");
    u.className = "btn more-btn", u.setAttribute("data-focus", ""), u.textContent = "⋯", u.setAttribute("aria-label", "More"), r.appendChild(u), u.addEventListener("click", async function() {
      var t = await Api.watchedItem(s.id, "movie", e.titleId).catch(function() {
          return null
        }),
        n = !(!t || !(!0 === t.watched || t.item && !0 === t.item.watched)) || et(await Ze(), Qe(e));
      q(e.name, "Your other mediastorm apps will see this too.", [{
        label: n ? "Mark as unwatched" : "Mark as watched",
        fn: async function() {
          var t = {};
          e.imdb && (t.imdb = String(e.imdb)), e.tmdb && (t.tmdb = String(e.tmdb)), e.tvdb && (t.tvdb = String(e.tvdb));
          try {
            await Api.markWatched(s.id, {
              mediaType: "movie",
              itemId: e.titleId,
              name: e.name,
              year: +e.year || 0,
              watched: !n,
              externalIds: t
            }), l = !0, Ge = null, d(!n), C((n ? "Unmarked " : "Marked ") + e.name + (n ? "." : " as watched.")), c()
          } catch (e) {
            C("Couldn't change that: " + e.message, "warn")
          }
        }
      }].concat(pt(e)))
    }), c()
  }
  async function ht(e, t, r) {
    Nav.onBack(function() {
      wt()
    }), W(He(e, t, '<div class="series-browse"><div class="row-track seasons" id="seasons" data-down="#episodes .card"><span class="muted">Loading episodes</span></div><div class="row-track episodes" id="episodes" data-up=".tab.current"></div><p class="ep-overview" id="ep-overview"></p></div>'), "screen-title"), T(n.querySelector(".title-body .overview"), e.name, function() {
      return e.overview
    });
    var i = document.getElementById("play-main");
    i.textContent = e.next ? "Play S" + e.next.season + " E" + e.next.episode + (e.next.title ? ": " + e.next.title : "") : "Play next episode", i.addEventListener("click", function() {
      var t = e.next,
        n = t && O(t.season, t.episode);
      !n || U(n) ? Et(e, {
        resume: !0,
        episode: e.next
      }) : H(n)
    });
    var a = e.next || null,
      o = St(function() {
        var t = a || e.next;
        t ? Ct(e, t, function() {
          ht(e, null, t)
        }) : C("Pick an episode first, then choose a release for it.")
      });

    function c() {
      o.textContent = a ? "Choose release: S" + a.season + " E" + a.episode : "Choose release"
    }
    document.getElementById("actions").appendChild(o), c(), Nav.first();
    var d = Promise.all([$e(e), Api.progressList(s.id).catch(function() {
        return []
      }), Xe()]),
      u = await bt(e);
    if (document.body.contains(i))
      if (u && !u.error && (! function(e, t) {
          e && t && (!e.tvdb && t.tvdbId && (e.tvdb = String(t.tvdbId)), !e.tmdb && t.tmdbId && (e.tmdb = String(t.tmdbId)), !e.imdb && t.imdbId && (e.imdb = t.imdbId), t.id && t.id !== e.titleId && (e.altIds = (e.altIds || []).concat([t.id])))
        }(e, u.title), ut(e, u.title || null)), u && !u.error && u.seasons) {
        var m = {},
          f = {},
          p = u.seasons.filter(function(e) {
            return e.episodes && e.episodes.length
          }).sort(function(e, t) {
            return (0 === e.number) - (0 === t.number) || e.number - t.number
          });
        if (p.length) {
          var v = D(r || e.next),
            h = document.getElementById("seasons");
          h.innerHTML = p.map(function(e, t) {
            return '<button class="tab" data-focus data-season="' + t + '">' + x(0 === e.number ? "Specials" : "Season " + e.number) + "</button>"
          }).join("");
          var g = -1,
            b = null;
          document.getElementById("actions").setAttribute("data-down", ".tab.current");
          var y = document.createElement("button");
          if (y.className = "btn more-btn", y.setAttribute("data-focus", ""), y.textContent = "⋯", y.setAttribute("aria-label", "More"), y.addEventListener("click", function() {
              var t = p[g];
              if (t) {
                var n = t.episodes.filter(U).every(function(e) {
                  return m[e.seasonNumber + ":" + e.episodeNumber]
                });
                q(e.name, "Hold OK on an episode to mark just that one.", [{
                  label: n ? "Mark " + z(t) + " unwatched" : "Mark " + z(t) + " watched",
                  fn: function() {
                    F(t.episodes, !n, z(t))
                  }
                }].concat(pt(e)))
              }
            }), document.getElementById("actions").appendChild(y), n.querySelector(".series-browse").addEventListener("focusin", function(e) {
              var t = e.target.closest(".tab");
              if (t) return clearTimeout(b), void(b = setTimeout(function() {
                P(+t.getAttribute("data-season"))
              }, 180));
              var n = e.target.closest(".card.ep");
              if (n) {
                var r = p[g].episodes[+n.getAttribute("data-ep")];
                a = {
                  season: r.seasonNumber,
                  episode: r.episodeNumber,
                  title: r.name || "",
                  aired: (r.airedDate || "").slice(0, 10)
                }, c();
                var i = [];
                if (r.airedDate) {
                  var o = new Date(r.airedDate.slice(0, 10) + "T12:00:00Z");
                  i.push(isNaN(o) ? r.airedDate.slice(0, 10) : o.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric"
                  }))
                }
                r.runtimeMinutes && i.push(r.runtimeMinutes + " min");
                var s = document.getElementById("ep-overview");
                s.innerHTML = (i.length ? '<span class="muted">' + x(i.join(", ")) + "</span><br>" : "") + x(r.overview || "");
                var l = "S" + r.seasonNumber + " E" + r.episodeNumber + (r.name ? ": " + r.name : ""),
                  d = r.overview || "";
                T(s, l, function() {
                  return d
                })
              }
            }), P(p.indexOf(v)), r) {
            var w = -1;
            v.episodes.forEach(function(e, t) {
              e.episodeNumber === r.episode && (w = t)
            });
            var k = document.getElementById("episodes").querySelector('[data-ep="' + w + '"]');
            k && Nav.focus(k)
          }
          Ue = {
            item: e,
            node: i,
            restore: function(t, n, r) {
              Fe(t);
              var a = n ? function(e) {
                if (!e) return null;
                var t = -1;
                if (p.forEach(function(n, r) {
                    n.number === e.season && (t = r)
                  }), t < 0) return null;
                t !== g && P(t);
                var n = -1;
                return p[t].episodes.forEach(function(t, r) {
                  t.episodeNumber === e.episode && (n = r)
                }), document.getElementById("episodes").querySelector('[data-ep="' + n + '"]')
              }(n) : null;
              Nav.focus(a || (r && document.body.contains(r) ? r : i)), setTimeout(function() {
                document.body.contains(i) && Promise.all([$e(e), Api.progressList(s.id).catch(function() {
                  return []
                }), Xe()]).then(function(e) {
                  J(e, !0)
                })
              }, We)
            }
          };
          var I = await d;
          J(I, !1);
          var N = I && I[0];
          if (!(N && N.watchedEpisodes && Object.keys(N.watchedEpisodes).length) && Ve(e).length > 1 && document.body.contains(i)) {
            var A = await Promise.all([$e(e), Promise.resolve(I[1]), Promise.resolve(I[2])]),
              B = A[0];
            B && B.watchedEpisodes && Object.keys(B.watchedEpisodes).length && J(A, !1)
          }
        } else document.getElementById("seasons").innerHTML = '<span class="muted">No episodes listed yet.</span>'
      } else document.getElementById("seasons").innerHTML = '<span class="muted">Couldn\'t load the episode list.</span>';

    function D(e) {
      return p.filter(function(t) {
        return e && t.number === e.season
      })[0] || p.filter(function(e) {
        return null != u.preferredSeason && e.number === u.preferredSeason
      })[0] || p.filter(function(e) {
        return e.number > 0
      })[0] || p[0]
    }

    function P(t, n) {
      if (t !== g || n) {
        var r = n ? document.activeElement && document.activeElement.getAttribute("data-ep") : null,
          i = n ? document.getElementById("episodes").scrollLeft : 0;
        g = t, h.querySelectorAll(".tab").forEach(function(e, n) {
          e.classList.toggle("current", n === t)
        });
        var a = p[t];
        document.getElementById("episodes").innerHTML = a.episodes.map(function(e, t) {
          var n = e.seasonNumber + ":" + e.episodeNumber,
            r = e.image && e.image.url,
            i = f[n],
            a = U(e);
          return '<button class="card ep' + (a ? "" : " unaired") + '" data-focus data-ep="' + t + '">' + (r ? R(r, "w500", !0) : "") + L("E" + e.episodeNumber) + (m[n] ? '<i class="seen">Watched</i>' : "") + '<span class="card-label"><em class="num">E' + e.episodeNumber + "</em>" + x(a ? e.name || "Episode " + e.episodeNumber : "Airs " + S(String(e.airedDate).slice(0, 10))) + "</span>" + (i ? '<i class="bar"><b style="width:' + Math.min(100, i) + '%"></b></i>' : "") + "</button>"
        }).join("");
        var o = document.getElementById("episodes");
        if (o.scrollLeft = i, o.querySelectorAll(".card").forEach(function(t) {
            t.addEventListener("click", function() {
              var n = a.episodes[+t.getAttribute("data-ep")];
              U(n) ? Et(e, {
                resume: !0,
                episode: {
                  season: n.seasonNumber,
                  episode: n.episodeNumber,
                  title: n.name || "",
                  aired: (n.airedDate || "").slice(0, 10)
                }
              }) : H(n)
            }), t.onhold = function() {
              ! function(e, t) {
                if (!t) return;
                var n = t.seasonNumber + ":" + t.episodeNumber,
                  r = !!m[n];
                if (!U(t) && !r) return void q((0 === t.seasonNumber ? "Special " : "S" + t.seasonNumber + " ") + "E" + t.episodeNumber + (t.name ? ": " + t.name : ""), "This episode hasn't aired yet" + (t.airedDate ? ": it's out " + S(String(t.airedDate).slice(0, 10)) : "") + ".", []);
                var i = (0 === t.seasonNumber ? "Special " : "S" + t.seasonNumber + " ") + "E" + t.episodeNumber + (t.name ? ": " + t.name : ""),
                  a = e.episodes.indexOf(t),
                  o = [];
                e.number > 0 && p.forEach(function(t) {
                  t.number > 0 && t.number < e.number && (o = o.concat(t.episodes))
                });
                o = o.concat(e.episodes.slice(0, a + 1)).filter(U);
                var s = o.length > a + 1,
                  c = e.episodes.slice(a);
                e.number > 0 && p.forEach(function(t) {
                  t.number > e.number && (c = c.concat(t.episodes))
                });
                c = c.filter(function(e) {
                  return m[e.seasonNumber + ":" + e.episodeNumber]
                });
                var l = [{
                  label: r ? "Mark as unwatched" : "Mark as watched",
                  fn: function() {
                    F([t], !r, i)
                  }
                }];
                r && c.length > 1 && l.push({
                  label: "Unwatched from here",
                  fn: function() {
                    F(c, !1, c.length + " episodes, from " + i)
                  }
                });
                !r && (a > 0 || s) && l.push({
                  label: "Watched up to here",
                  fn: function() {
                    F(o, !0, o.length + " episodes, up to " + i + ",")
                  }
                });
                var d = e.episodes.filter(U).every(function(e) {
                  return m[e.seasonNumber + ":" + e.episodeNumber]
                });
                l.push({
                  label: "Mark " + z(e) + (d ? " unwatched" : " watched"),
                  fn: function() {
                    F(e.episodes, !d, z(e))
                  }
                }), q(i, "Your other mediastorm apps will see this too.", l)
              }(a, a.episodes[+t.getAttribute("data-ep")])
            }
          }), null != r) {
          var s = o.querySelector('[data-ep="' + r + '"]');
          s && s.focus({
            preventScroll: !0
          })
        }
      }
    }

    function j(t, n) {
      var r = {};
      return e.imdb && (r.imdb = String(e.imdb)), e.tmdb && (r.tmdb = String(e.tmdb)), e.tvdb && (r.tvdb = String(e.tvdb)), {
        mediaType: "episode",
        seriesId: e.titleId,
        seriesName: e.name,
        seasonNumber: t.seasonNumber,
        episodeNumber: t.episodeNumber,
        name: t.name || "",
        watched: n,
        externalIds: r
      }
    }

    function O(e, t) {
      for (var n = 0; n < p.length; n++)
        if (p[n].number === e)
          for (var r = 0; r < p[n].episodes.length; r++)
            if (p[n].episodes[r].episodeNumber === t) return p[n].episodes[r];
      return null
    }

    function H(t) {
      var n = t.airedDate ? S(String(t.airedDate).slice(0, 10)) : "",
        r = {
          season: t.seasonNumber,
          episode: t.episodeNumber,
          title: t.name || "",
          aired: String(t.airedDate || "").slice(0, 10)
        };
      q("Not out yet", function(e) {
        return (0 === e.seasonNumber ? "Special " : "S" + e.seasonNumber + " ") + "E" + e.episodeNumber
      }(t) + (t.name ? ", " + t.name + "," : "") + " airs " + (n || "soon") + ".", [{
        label: "Search anyway",
        fn: function() {
          var t = yt;
          Ct(e, r, function() {
            yt = t, je(e, null, r)
          })
        }
      }])
    }

    function U(e) {
      var t = String(e && e.airedDate || "").slice(0, 10);
      return !t || t <= E(new Date)
    }
    async function F(t, n, r) {
      if (n && (t = t.filter(U)), t.length) try {
        if (1 === t.length) await Api.markWatched(s.id, j(t[0], n));
        else
          for (var i = t.map(function(e) {
              return j(e, n)
            }), a = 0; a < i.length; a += 50) await Api.markWatchedBulk(s.id, i.slice(a, a + 50));
        t.forEach(function(e) {
          var t = e.seasonNumber + ":" + e.episodeNumber;
          n ? (m[t] = !0, delete f[t]) : delete m[t]
        }), Y(), C((n ? "Marked " : "Unmarked ") + r + (n ? " as watched." : ".")), l = !0, Promise.all([$e(e), Api.progressList(s.id).catch(function() {
          return []
        }), Xe()]).then(function(e) {
          J(e, !0)
        })
      } catch (e) {
        C("Couldn't change that: " + e.message, "warn")
      } else C("Those episodes haven't aired yet.")
    }

    function z(e) {
      return 0 === e.number ? "the specials" : "Season " + e.number
    }

    function Y() {
      var e = p[g];
      e && document.getElementById("episodes").querySelectorAll(".card.ep").forEach(function(t) {
        var n = e.episodes[+t.getAttribute("data-ep")];
        if (n) {
          var r = n.seasonNumber + ":" + n.episodeNumber,
            i = t.querySelector("i.seen");
          m[r] && !i ? ((i = document.createElement("i")).className = "seen", i.textContent = "Watched", t.insertBefore(i, t.querySelector(".card-label"))) : !m[r] && i && i.parentNode.removeChild(i);
          var a = t.querySelector("i.bar"),
            o = f[r];
          o ? (a || ((a = document.createElement("i")).className = "bar", a.appendChild(document.createElement("b")), t.appendChild(a)), a.firstChild.style.width = Math.min(100, o) + "%") : a && a.parentNode.removeChild(a)
        }
      })
    }

    function J(t, n) {
      if (document.body.contains(i)) {
        m = {}, f = {};
        var o = t[0],
          s = t[1] || [],
          l = t[2] || null;
        if (o && o.watchedEpisodes && Object.keys(o.watchedEpisodes).forEach(function(e) {
            var t = o.watchedEpisodes[e];
            t && t.episodeNumber > 0 && (m[t.seasonNumber + ":" + t.episodeNumber] = !0)
          }), l) {
          var d = Ve(e).map(function(e) {
            return "episode:" + String(e).toLowerCase() + ":"
          });
          p.forEach(function(e) {
            e.episodes.forEach(function(e) {
              var t = "s" + Util.pad2(e.seasonNumber) + "e" + Util.pad2(e.episodeNumber);
              d.some(function(e) {
                return l[e + t]
              }) && (m[e.seasonNumber + ":" + e.episodeNumber] = !0)
            })
          })
        }
        var u = Ve(e).map(function(e) {
            return String(e).toLowerCase() + ":s"
          }),
          v = {};
        (Array.isArray(s) ? s : []).forEach(function(e) {
          var t = String(e.itemId || "").toLowerCase();
          if ("episode" === e.mediaType && u.some(function(e) {
              return 0 === t.indexOf(e)
            })) {
            var n = /:s(\d+)e(\d+)$/.exec(t);
            n && e.percentWatched > 1 && e.percentWatched < 95 && (f[+n[1] + ":" + +n[2]] = e.percentWatched, e.position > 30 && (v[+n[1] + ":" + +n[2]] = e.position))
          }
        });
        var h = o && o.nextEpisode && o.nextEpisode.episodeNumber > 0 ? {
          season: o.nextEpisode.seasonNumber,
          episode: o.nextEpisode.episodeNumber,
          title: o.nextEpisode.title || ""
        } : function() {
          var e = [];
          p.forEach(function(t) {
            t.number > 0 && (e = e.concat(t.episodes))
          });
          var t = -1;
          if (e.forEach(function(e, n) {
              m[e.seasonNumber + ":" + e.episodeNumber] && (t = n)
            }), t < 0) return null;
          var n = e[t + 1],
            r = E(new Date);
          return !n || n.airedDate && String(n.airedDate).slice(0, 10) > r ? null : {
            season: n.seasonNumber,
            episode: n.episodeNumber,
            title: n.name || ""
          }
        }() || e.next;
        if (h) {
          e.next = h;
          var b = v[h.season + ":" + h.episode],
            y = O(h.season, h.episode);
          i.textContent = y && !U(y) && y.airedDate ? "S" + h.season + " E" + h.episode + " airs " + S(String(y.airedDate).slice(0, 10)) : b ? "Resume S" + h.season + " E" + h.episode + " from " + M(b) : "Play S" + h.season + " E" + h.episode + (h.title ? ": " + h.title : ""), document.getElementById("title-meta").textContent = ve(e), !n && r || document.activeElement !== i || (a = h, c())
        }
        var w = !n && document.activeElement === i && !r,
          k = p.indexOf(D(h));
        w && k !== g ? P(k) : Y()
      }
    }
  }
  var gt = {};

  function bt(e) {
    var t = e.titleId;
    return gt[t] || (gt[t] = Api.seriesDetails(e, s.id).catch(function(e) {
      return delete gt[t], {
        error: e
      }
    })), gt[t]
  }
  var yt = null;

  function wt() {
    var e = yt;
    yt = null, e ? e() : Pe()
  }

  function kt(e, t) {
    yt = t || null, je(e)
  }

  function Et(e, t) {
    G();
    var r = yt,
      a = document.activeElement;
    Player.start({
      item: e,
      episode: t.episode || null,
      profileId: s.id,
      clientId: i.clientId,
      resume: t.resume,
      startAt: t.startAt,
      manual: t.manual || null,
      nextEpisode: "movie" === e.kind ? null : function(t) {
        return async function(e, t) {
          if (!(t && t.season > 0)) return null;
          var n = await bt(e);
          if (!n || n.error || !n.seasons) return null;
          var r = (new Date).toISOString().slice(0, 10),
            i = [];
          n.seasons.filter(function(e) {
            return e.number > 0 && e.episodes
          }).sort(function(e, t) {
            return e.number - t.number
          }).forEach(function(e) {
            e.episodes.slice().sort(function(e, t) {
              return e.episodeNumber - t.episodeNumber
            }).forEach(function(t) {
              i.push({
                season: t.seasonNumber || e.number,
                episode: t.episodeNumber,
                title: t.name || "",
                aired: t.airedDate
              })
            })
          });
          for (var a = 0; a < i.length; a++) {
            var o = i[a];
            if (o.season > t.season || o.season === t.season && o.episode > t.episode) return o.aired && o.aired.slice(0, 10) > r ? null : {
              season: o.season,
              episode: o.episode,
              title: o.title
            }
          }
          return null
        }(e, t)
      },
      cast: function() {
        return ze(e).then(Ye)
      },
      onPerson: function(t, n) {
        l = !0, ft(t, function() {
          yt = r, je(e, null, n && n.episode)
        })
      },
      onExit: function(i, o) {
        l = !0, yt = r;
        var s = Ue;
        s && s.item === e && document.body.contains(s.node) && n.classList.contains("screen-title") ? (Nav.onBack(function() {
          wt()
        }), s.restore(null, o && o.episode, a)) : je(e, null, o && o.episode), i && function(e, t, n) {
          var r = t ? 0 === t.season ? "this special" : "S" + t.season + " E" + t.episode : e.name,
            i = t && 0 === t.season,
            a = n;
          i && /no results|no .*releases?|couldn't find/i.test(n || "") && (a = "mediastorm searched for it as S0 E" + t.episode + " and found nothing. Specials are often released under their name or air date instead, so a search by those may find it."), q("Couldn't play " + r, a, [{
            label: i ? "Search by name and date" : "Choose release",
            fn: function() {
              var n = yt;
              Ct(e, t, function() {
                yt = n, je(e, null, t)
              })
            }
          }])
        }(e, o && o.episode || t.episode || null, i)
      }
    })
  }

  function St(e) {
    var t = document.createElement("button");
    return t.className = "btn", t.setAttribute("data-focus", ""), t.textContent = "Choose release", t.addEventListener("click", e), t
  }

  function It(e, t) {
    return new RegExp("(^|[^a-z0-9])(" + t + ")([^a-z0-9]|$)", "i").test(e)
  }

  function Nt(e) {
    var t = String(e || "").toLowerCase().replace(/[^a-z]/g, "");
    return t ? {
      torbox: "TorBox",
      realdebrid: "Real-Debrid",
      rd: "Real-Debrid",
      alldebrid: "AllDebrid",
      premiumize: "Premiumize",
      debridlink: "Debrid-Link"
    } [t] || e : "Debrid"
  }
  var At = Util.plainReason,
    xt = null;

  function Lt(e) {
    return (e && e.scoreBreakdown || []).filter(function(e) {
      return e && e.points > 0 && (e.reason || e.criterion)
    }).sort(function(e, t) {
      return t.points - e.points
    }).slice(0, 3).map(function(e) {
      var t = At(e.reason || e.criterion).replace(/^matches preferred terms\s*/i, "").replace(/\s*\(weight \d+\)$/, "");
      return t.length > 44 ? t.slice(0, 42) + "…" : t
    }).join(" · ")
  }
  async function Ct(e, t, r) {
    Nav.onBack(r), W('<div class="picker"><h1>' + (x(e.name) + (t ? "<span>S" + t.season + " E" + t.episode + (t.title ? ", " + x(t.title) : "") + "</span>" : "")) + '</h1><p class="lede" id="picker-status">Searching your indexers</p><div class="picker-list" id="picker-list"></div></div>', "screen-picker");
    var a = Util.pad2,
      o = e.name + (t ? " S" + a(t.season) + "E" + a(t.episode) : ""),
      c = t && 0 === t.season,
      l = [],
      d = "",
      u = null,
      m = [{
        q: o,
        ids: !0
      }];
    if (c) {
      var f = String(t.title || "").trim();
      u = (f.match(/\((\d+)\)\s*$/) || [])[1] || null;
      var p = f.replace(/\s*\((\d+)\)\s*$/, ""),
        v = e.name.toLowerCase().split(/[^a-z0-9]+/),
        h = ["the", "and", "of", "a", "in", "on", "to", "part", "special", "murder", "episode"];
      l = p.toLowerCase().split(/[^a-z0-9]+/).filter(function(e) {
        return e.length > 2 && h.indexOf(e) < 0 && v.indexOf(e) < 0
      }), /^\d{4}-\d{2}-\d{2}$/.test(t.aired || "") && (d = t.aired), m = [], l.length && (u && m.push({
        q: l.join(" ") + " Part " + u
      }), m.push({
        q: l.join(" ")
      })), m.push({
        q: o,
        ids: !0
      }), p && (m.push({
        q: e.name + " " + p
      }), u && m.push({
        q: e.name + " " + p + " S01E" + a(+u)
      })), d && m.push({
        q: e.name + " " + d.replace(/-/g, ".")
      }), document.getElementById("picker-status").textContent = "Searching for this special by name, number and air date"
    }
    var g = d.replace(/-/g, "."),
      b = d.replace(/-/g, " ");

    function y(e) {
      var t = String(e.title || "").toLowerCase(),
        n = " " + t.replace(/[^a-z0-9]+/g, " ") + " ";
      if (u) {
        var r = n.match(/ part (\d+) /);
        if (r && +r[1] !== +u) return !1
      }
      return !(!d || !(t.indexOf(g) >= 0 || n.indexOf(" " + b + " ") >= 0 || t.indexOf(d) >= 0)) || l.length > 0 && l.every(function(e) {
        return n.indexOf(" " + e + " ") >= 0
      })
    }
    var w = c && (l.length || d),
      k = [],
      E = {},
      S = null,
      I = null,
      N = xt;

    function A(e) {
      (Array.isArray(e) ? e : e && e.results || []).forEach(function(e) {
        var t = e.guid || e.link || e.downloadUrl || e.title;
        t && E[t] || (t && (E[t] = !0), k.push(e))
      })
    }
    for (var L = 0; L < m.length; L += 2) {
      var C = m.slice(L, L + 2),
        B = await Promise.all(C.map(function(t) {
          var n = {
            query: t.q,
            mediaType: "movie" === e.kind ? "movie" : "series",
            userId: s.id,
            clientId: i.clientId,
            imdbId: t.ids ? e.imdb : null,
            titleId: t.ids ? e.titleId : null,
            year: t.ids ? e.year : null
          };
          return (t.ids && !1 !== N ? Api.scoredReleases(n).then(function(e) {
            return N = !0, e
          }, function(e) {
            if (e && (404 === e.status || 405 === e.status || 403 === e.status)) return N = !1, Api.releases(n);
            throw e
          }) : Api.releases(n)).catch(function(e) {
            return I = I || e, []
          })
        }));
      if ("screen-picker" !== n.className) return;
      if (B.forEach(A), !w || k.some(y)) break
    }
    null !== N && (xt = N), !k.length && I && (S = I);
    var T = document.getElementById("picker-list");

    function q() {
      var n = document.createElement("button");
      return n.className = "btn primary", n.setAttribute("data-focus", ""), n.textContent = "Search again", n.addEventListener("click", function() {
        Ct(e, t, r)
      }), T.appendChild(n), n
    }
    if (S) return document.getElementById("picker-status").textContent = "The search failed: " + S.message, void Nav.focus(q());
    c && (o = "this special");
    var D = [];

    function M(e) {
      return "filtered" === e.filterStatus ? 1 : 0
    }
    w && (D = k.filter(function(e) {
      return !y(e)
    }), k = k.filter(y));
    var P = k.map(function(e, t) {
      return {
        r: e,
        i: t
      }
    }).sort(function(e, t) {
      return M(e.r) - M(t.r) || e.i - t.i
    }).map(function(e) {
      return e.r
    });
    if (P.length) H(P);
    else {
      document.getElementById("picker-status").textContent = D.length ? "No releases name this special or its air date. The " + D.length + " found are other episodes of the series." : "No releases found for " + o + ". Indexers sometimes miss a search, so it's worth trying again.";
      var j = q();
      if (D.length) {
        var O = document.createElement("button");
        O.className = "btn", O.setAttribute("data-focus", ""), O.textContent = "Show them anyway", O.addEventListener("click", function() {
          T.innerHTML = "", H(D.map(function(e, t) {
            return {
              r: e,
              i: t
            }
          }).sort(function(e, t) {
            return M(e.r) - M(t.r) || e.i - t.i
          }).map(function(e) {
            return e.r
          }))
        }), T.appendChild(O)
      }
      Nav.focus(j)
    }

    function H(n) {
      var r = n.filter(function(e) {
        return "filtered" !== e.filterStatus
      }).length;
      document.getElementById("picker-status").textContent = n.length + (1 === n.length ? " release" : " releases") + (r < n.length ? ", " + (n.length - r) + " of them filtered out by your mediastorm settings" : "") + ".";
      var i = document.getElementById("picker-list");
      i.innerHTML = n.map(function(e, t) {
        var n = function(e) {
            var t = String(e.title || ""),
              n = e.attributes || {},
              r = [],
              i = [],
              a = It(t, "2160p|4k|uhd") ? "4K" : It(t, "1080p") ? "1080p" : It(t, "720p") ? "720p" : It(t, "576p|480p|sd") ? "SD" : n.resolution || "";
            a && r.push(a);
            var o = It(t, "remux") ? "Remux" : It(t, "web-?dl") ? "WEB-DL" : It(t, "web-?rip") ? "WEBRip" : It(t, "blu-?ray|bdrip|brrip") ? "Blu-ray" : It(t, "web") ? "WEB" : It(t, "hdtv") ? "HDTV" : "";
            o && r.push(o), (It(t, "dv|dovi|dolby[ .]?vision") || "true" === n.hasDV) && r.push("Dolby Vision"), It(t, "hdr10\\+|hdr10p|hdr10plus") ? r.push("HDR10+") : It(t, "hdr10|hdr") ? r.push("HDR") : It(t, "hlg") && r.push("HLG");
            var s = It(t, "x265|h\\.?265|hevc") ? "HEVC" : It(t, "x264|h\\.?264|avc") ? "H.264" : It(t, "av1") ? "AV1" : "";
            s && i.push(s);
            var c = function(e) {
                return new RegExp("(^|[^a-z])(" + e + ")", "i").test(t)
              },
              l = c("truehd") ? "TrueHD" : c("dts-?hd[ .]?ma") ? "DTS-HD MA" : c("dts[-:]?x(?![a-z])") ? "DTS:X" : c("ddp|dd\\+|e-?ac-?3") ? "Dolby Digital Plus" : c("dd(?=[0-9 .]|$)|ac-?3") ? "Dolby Digital" : c("dts") ? "DTS" : c("aac") ? "AAC" : c("flac") ? "FLAC" : c("opus") ? "Opus" : "",
              d = (/(^|[^0-9])([257]\.[01])([^0-9]|$)/.exec(t) || [])[2];
            l && i.push(l + (d ? " " + d : "") + (It(t, "atmos") ? " Atmos" : ""));
            var u = [];
            It(t, "multi") && u.push("Multi-language"), It(t, "dual") && u.push("Dual audio"), [
              ["french|truefrench|vff|vfq|vf2", "French"],
              ["german|ger", "German"],
              ["ita|italian", "Italian"],
              ["spa|spanish|castellano|latino", "Spanish"],
              ["nordic", "Nordic"],
              ["hindi", "Hindi"],
              ["jpn|japanese", "Japanese"],
              ["kor|korean", "Korean"],
              ["rus|russian", "Russian"],
              ["pol|polish", "Polish"],
              ["dutch|nl", "Dutch"]
            ].forEach(function(e) {
              It(t, e[0]) && u.push(e[1])
            }), !u.length && n.languages && u.push(n.languages);
            var m = (/-([A-Za-z0-9]+)(\.(mkv|mp4))?$/.exec(t) || [])[1] || "",
              f = /debrid/i.test(e.serviceType || "");
            return {
              main: r,
              extra: i,
              langs: u,
              group: m,
              debrid: f,
              service: f ? Nt(n.provider || n.debridProvider) : "Usenet",
              size: e.sizeBytes ? (e.sizeBytes / 1073741824).toFixed(1) + " GB" : ""
            }
          }(e),
          r = "filtered" === e.filterStatus,
          i = n.main.map(function(e) {
            return "<b>" + x(e) + "</b>"
          }).join(""),
          a = [n.service, n.size].concat(n.extra, n.langs, n.group ? [n.group] : []).filter(Boolean).map(function(e) {
            return "<i>" + x(e) + "</i>"
          }).join("");
        return '<button class="release' + (r ? " filtered" : "") + (n.debrid ? " debrid" : "") + '" data-focus data-r="' + t + '"><span class="tags">' + (i || "<b>Unknown quality</b>") + '</span><span class="meta-tags">' + a + "</span>" + (r ? '<span class="why">Filtered: ' + x(e.filterReason || "excluded by your settings") + "</span>" : Lt(e) ? '<span class="why good">Ranked for: ' + x(Lt(e)) + "</span>" : "") + '<span class="name">' + x(e.title || "") + "</span></button>"
      }).join(""), i.querySelectorAll(".release").forEach(function(r) {
        r.addEventListener("click", function() {
          var i = n[+r.getAttribute("data-r")],
            a = n.filter(function(e) {
              return e !== i && "filtered" !== e.filterStatus
            });
          yt = yt || null, Et(e, {
            resume: !0,
            episode: t,
            manual: {
              releases: [i].concat(a)
            }
          })
        })
      }), Nav.focus(i.querySelector(".release"))
    }
  }
  var Bt = 9e4,
    Tt = 9e3,
    qt = 1800,
    Dt = null,
    Mt = !1;

  function Pt() {
    clearTimeout(Dt), Dt = setTimeout(jt, Bt)
  }

  function jt() {
    if (Mt || "screen-home" !== n.className || "on" === document.getElementById("player").className || document.getElementById("confirm") || document.getElementById("trailer")) Pt();
    else {
      var e = function() {
        var e = {},
          t = [];
        (c && c.rows || []).forEach(function(n) {
          n.items.forEach(function(n) {
            var r = n.backdrop && n.backdrop !== n.poster ? n.backdrop : "";
            r && n.key && !e[n.key] && (e[n.key] = !0, t.push(r))
          })
        });
        for (var n = t.length - 1; n > 0; n--) {
          var r = Math.floor(Math.random() * (n + 1)),
            i = t[n];
          t[n] = t[r], t[r] = i
        }
        return t
      }();
      e.length < 2 ? Pt() : function(e) {
        Mt = !0;
        var t = document.createElement("div");
        t.id = "screensaver", t.innerHTML = '<div class="ss-pic" id="ss-a"></div><div class="ss-pic" id="ss-b"></div>', document.body.appendChild(t);
        var n = -1,
          r = "a",
          i = null;

        function a() {
          n++;
          var t = "a" === r ? "b" : "a",
            i = document.getElementById("ss-" + t);
          if (i) {
            i.style.transition = "none", i.style.opacity = "0", i.style.transform = "scale(1) translate(0%, 0%)", i.style.backgroundImage = 'url("' + F(e[n % e.length], "w1280") + '")', i.offsetWidth;
            var a = (5 * Math.random() - 2.5).toFixed(1),
              o = (3 * Math.random() - 1.5).toFixed(1);
            i.style.transition = "opacity " + qt + "ms ease, transform " + (Tt + qt) + "ms linear", i.style.opacity = "1", i.style.transform = "scale(1.08) translate(" + a + "%, " + o + "%)", i.style.zIndex = "2", document.getElementById("ss-" + r).style.zIndex = "1", r = t
          }
        }

        function o(e) {
          e.preventDefault(), e.stopImmediatePropagation(), clearInterval(i), document.removeEventListener("keydown", o, !0), t.parentNode && t.parentNode.removeChild(t), Mt = !1, Pt()
        }
        a(), i = setInterval(a, Tt), document.addEventListener("keydown", o, !0)
      }(e)
    }
  }
  document.addEventListener("keydown", Pt, !0);
  var Ot = [
      [28, "Action"],
      [12, "Adventure"],
      [16, "Animation"],
      [35, "Comedy"],
      [80, "Crime"],
      [99, "Documentary"],
      [18, "Drama"],
      [10751, "Family"],
      [14, "Fantasy"],
      [36, "History"],
      [27, "Horror"],
      [10402, "Music"],
      [9648, "Mystery"],
      [10749, "Romance"],
      [878, "Science Fiction"],
      [53, "Thriller"],
      [10752, "War"],
      [37, "Western"]
    ],
    Ht = [
      [10759, "Action & Adventure"],
      [16, "Animation"],
      [35, "Comedy"],
      [80, "Crime"],
      [99, "Documentary"],
      [18, "Drama"],
      [10751, "Family"],
      [10762, "Kids"],
      [9648, "Mystery"],
      [10764, "Reality"],
      [10765, "Sci-Fi & Fantasy"],
      [10766, "Soap"],
      [10767, "Talk"],
      [10768, "War & Politics"],
      [37, "Western"]
    ],
    Ut = null;

  function Wt() {
    function e(e, t) {
      return e.map(function(e) {
        return '<button class="chip genre" data-focus data-gt="' + t + '" data-gid="' + e[0] + '">' + x(e[1]) + "</button>"
      }).join("")
    }
    Nav.onBack(function() {
      Pe()
    }), W(Oe + '<div class="genres-page"><h1>Genres</h1><div class="suggest"><h3>Films</h3>' + e(Ot, "movie") + '</div><div class="suggest"><h3>Series</h3>' + e(Ht, "series") + "</div></div>", "screen-genres"), n.querySelectorAll("[data-gid]").forEach(function(e) {
      e.addEventListener("click", function() {
        var t = e.getAttribute("data-gt"),
          n = +e.getAttribute("data-gid");
        Ut = t + ":" + n, Rt(t, n, e.textContent)
      })
    });
    var t = Ut && n.querySelector('[data-gt="' + Ut.split(":")[0] + '"][data-gid="' + Ut.split(":")[1] + '"]');
    Nav.focus(t || n.querySelector("[data-gid]"))
  }
  var Ft = 42;
  async function Rt(e, t, n, r) {
    r = r || {
      items: [],
      total: null,
      loading: !1,
      focus: 0
    }, Nav.onBack(function() {
      Wt()
    }), W(Oe + '<div class="genre-label">' + x(n) + " <span>" + ("movie" === e ? "films" : "series") + '</span></div><div id="hero" class="genre-hero"><div class="hero-art"><img id="hero-a" alt="" decoding="async"><img id="hero-b" alt="" decoding="async"></div><div class="hero-text"><h1 id="hero-title"></h1><p class="meta" id="hero-meta"></p><p class="overview" id="hero-overview"></p></div></div><div class="genre-page"><div class="genre-grid" id="genre-grid"></div><p class="muted" id="genre-status"></p></div>', "screen-genre");
    var i = document.getElementById("genre-grid"),
      a = document.getElementById("genre-status"),
      o = "a",
      c = null;

    function l(a) {
      var o = r.items.slice(a).map(function(e, t) {
        return rt(e, a + t)
      }).join("");
      i.insertAdjacentHTML("beforeend", o), i.querySelectorAll("[data-t]").forEach(function(i) {
        if (!i._wired) {
          i._wired = !0;
          var a = +i.getAttribute("data-t");
          i.addEventListener("click", function() {
            r.focus = a, kt(r.items[a], function() {
              Rt(e, t, n, r)
            })
          }), i.addEventListener("focus", function() {
            a >= r.items.length - 14 && d()
          })
        }
      }), tt(i)
    }
    async function d() {
      if (!(r.loading || null != r.total && r.items.length >= r.total)) {
        r.loading = !0, r.items.length || (a.textContent = "Loading");
        var o = await Api.discoverGenre(e, t, Ft, r.items.length, s.id).catch(function(e) {
          return {
            error: e
          }
        });
        if (r.loading = !1, document.body.contains(i))
          if (o && !o.error) {
            var c = {};
            r.items.forEach(function(e) {
              c[e.titleId] = !0
            });
            var d = (o.items || []).map(function(e) {
              return e && e.title ? re(e.title) : null
            }).filter(function(e) {
              return e && !c[e.titleId] && (c[e.titleId] = !0)
            });
            r.total = "number" == typeof o.total ? o.total : d.length ? null : r.items.length, d.length || (r.total = r.items.length);
            var u = r.items.length;
            r.items = r.items.concat(d), a.textContent = r.items.length ? "" : "Nothing in " + n + " right now.", l(u), 0 === u && Nav.focus(i.querySelector("[data-t]"))
          } else r.items.length || (a.textContent = "Couldn't load " + n + ": " + (o && o.error && o.error.message || "no reply"))
      }
    }
    if (i.addEventListener("focusin", function(e) {
        var t = e.target.closest("[data-t]");
        if (t) {
          var n = r.items[+t.getAttribute("data-t")];
          n && (document.getElementById("hero-title").textContent = n.name, clearTimeout(c), c = setTimeout(function() {
            ! function(e) {
              if (document.getElementById("hero-title")) {
                document.getElementById("hero-title").textContent = e.name, document.getElementById("hero-meta").textContent = ve(e), document.getElementById("hero-overview").textContent = e.overview || "";
                var t = e.backdrop || e.poster || "";
                U(t);
                var n = F(t, "w1280"),
                  r = document.getElementById("hero-" + o),
                  i = document.getElementById("hero-" + ("a" === o ? "b" : "a"));
                n ? r.getAttribute("src") !== n && (i.onload = function() {
                  i.className = "on", r.className = "", o = "a" === o ? "b" : "a"
                }, i.onerror = function() {
                  i.getAttribute("src") !== t ? i.src = t : r.className = ""
                }, i.src = n) : r.className = ""
              }
            }(n)
          }, 300))
        }
      }), r.items.length) {
      l(0);
      var u = i.querySelector('[data-t="' + r.focus + '"]');
      Nav.focus(u || i.querySelector("[data-t]"))
    } else await d()
  }
  var zt = 42;
  async function Yt(e, t) {
    t = t || {
      items: [],
      total: null,
      loading: !1,
      focus: 0
    }, Nav.onBack(function() {
      Pe()
    }), W(Oe + '<div class="genre-label">' + x(e.name) + '</div><div id="hero" class="genre-hero"><div class="hero-art"><img id="hero-a" alt="" decoding="async"><img id="hero-b" alt="" decoding="async"></div><div class="hero-text"><h1 id="hero-title"></h1><p class="meta" id="hero-meta"></p><p class="overview" id="hero-overview"></p></div></div><div class="genre-page"><div class="genre-grid" id="genre-grid"></div><p class="muted" id="genre-status"></p></div>', "screen-genre");
    var n = document.getElementById("genre-grid"),
      r = document.getElementById("genre-status"),
      i = "a",
      a = null;

    function o(e) {
      var r = t.items.slice(e).map(function(t, n) {
        return rt(t, e + n)
      }).join("");
      n.insertAdjacentHTML("beforeend", r), n.querySelectorAll("[data-t]").forEach(function(e) {
        if (!e._wired) {
          e._wired = !0;
          var n = +e.getAttribute("data-t");
          e.addEventListener("click", function() {
            t.focus = n, pe(t.items[n], e)
          }), e.addEventListener("focus", function() {
            n >= t.items.length - 14 && s()
          })
        }
      }), tt(n)
    }
    async function s() {
      if (!(t.loading || null != t.total && t.items.length >= t.total)) {
        t.loading = !0, t.items.length || (r.textContent = "Loading");
        var i = await Api.libraryGroups(e.id, zt, t.items.length).catch(function(e) {
          return {
            error: e
          }
        });
        if (t.loading = !1, document.body.contains(n))
          if (i && !i.error) {
            var a = {};
            t.items.forEach(function(e) {
              a[e.libraryItemId] = !0
            });
            var s = (i.groups || []).map(function(t) {
              return de(t, e)
            }).filter(function(e) {
              return e && !a[e.libraryItemId] && (a[e.libraryItemId] = !0)
            });
            t.total = "number" == typeof i.total ? i.total : s.length ? null : t.items.length, s.length || (t.total = t.items.length);
            var c = t.items.length;
            t.items = t.items.concat(s), r.textContent = t.items.length ? "" : "Nothing in " + e.name + " yet.", o(c), 0 === c && Nav.focus(n.querySelector("[data-t]"))
          } else t.items.length || (r.textContent = "Couldn't load " + e.name + ": " + (i && i.error && i.error.message || "no reply"))
      }
    }
    n.addEventListener("focusin", function(e) {
      var n = e.target.closest("[data-t]");
      if (n) {
        var r = t.items[+n.getAttribute("data-t")];
        r && (document.getElementById("hero-title").textContent = r.name, clearTimeout(a), a = setTimeout(function() {
          ! function(e) {
            if (document.getElementById("hero-title")) {
              document.getElementById("hero-title").textContent = e.name, document.getElementById("hero-meta").textContent = ve(e), document.getElementById("hero-overview").textContent = e.overview || "";
              var t = e.backdrop || e.poster || "";
              U(t);
              var n = document.getElementById("hero-" + i),
                r = document.getElementById("hero-" + ("a" === i ? "b" : "a"));
              t ? n.getAttribute("src") !== t && (r.onload = function() {
                r.className = "on", n.className = "", i = "a" === i ? "b" : "a"
              }, r.onerror = function() {
                n.className = ""
              }, r.src = t) : n.className = ""
            }
          }(r)
        }, 300))
      }
    }), t.items.length ? (o(0), Nav.focus(n.querySelector('[data-t="' + t.focus + '"]') || n.querySelector("[data-t]"))) : await s()
  }
  var Jt = {
      query: "",
      results: [],
      focusKey: null,
      mode: "title",
      aiQuery: "",
      status: ""
    },
    Vt = "abcdefghijklmnopqrstuvwxyz1234567890".split(""),
    $t = {},
    Gt = null,
    Kt = !1,
    _t = null;

  function Qt(e) {
    if (_t) {
      var t = _t;
      try {
        e ? t.rec.abort() : t.rec.stop()
      } catch (e) {}
      e && t.finish()
    }
  }

  function Zt() {
    var e = [],
      t = c && c.rows && c.rows.filter(function(e) {
        return e.wide
      })[0],
      n = t && t.items[0];
    return n && e.push("More like " + n.name), e.concat(["Feel-good comedies", "Mind-bending sci-fi", "Short series to binge in a weekend", "Hidden gems from the last few years", "Gripping crime dramas", "Something the whole family can watch"])
  }

  function Xt() {
    function e() {
      Qt(!0), document.removeEventListener("keydown", en), Pe()
    }
    Nav.onBack(e), W('<div class="search"><div class="search-left"><div class="search-query" id="search-query"></div><div class="keys"><div class="key half voice" data-focus tabindex="0" id="speak"><span id="speak-label">Speak</span><input type="text" id="speak-input" autocomplete="off" spellcheck="false" aria-label="Describe what you want to watch"></div><button class="key half ai" data-focus id="ask-ai">Ask AI</button>' + Vt.map(function(e) {
      return '<button class="key" data-focus data-k="' + e + '">' + e.toUpperCase() + "</button>"
    }).join("") + '<button class="key wide" data-focus data-k=" ">Space</button><button class="key wide" data-focus data-k="del">Delete</button><button class="key wide" data-focus data-k="clear">Clear</button></div></div><div class="search-right"><p class="search-caption" id="search-caption"></p><div class="search-results" id="search-results"></div></div></div>', "screen-search"), n.querySelectorAll(".key[data-k]").forEach(function(e) {
      e.addEventListener("click", function() {
        rn(e.getAttribute("data-k"))
      })
    }), document.getElementById("ask-ai").addEventListener("click", function() {
      var e = Jt.query.trim();
      e.length < 3 ? on("Type or pick a description first, then press Ask AI.") : cn(e)
    });
    var t = document.getElementById("speak"),
      r = document.getElementById("speak-input"),
      i = "",
      a = "",
      o = null;

    function s() {
      if (clearTimeout(o), document.activeElement === r) {
        var e = r.value.trim();
        r.blur(), Nav.focus(t), e && e !== a && (a = e, c(e))
      }
    }

    function c(e) {
      Jt.remember = !0, Jt.query = e.slice(0, 200), Jt.mode = "title", Jt.status = "", an(), clearTimeout(tn), sn(Jt.query.trim(), !0)
    }

    function l() {
      r.style.pointerEvents = "", a = "", i = r.value = "", r.focus()
    }
    var d = !Kt && (window.SpeechRecognition || window.webkitSpeechRecognition),
      u = document.getElementById("speak-label");

    function m(n) {
      _t = n ? _t : null, t.classList.toggle("listening", !!n), u.textContent = n ? "Listening… talk now" : "Speak", Nav.onBack(n ? function() {
        Qt(!0)
      } : e)
    }
    d && (r.style.pointerEvents = "none"), t.addEventListener("click", function() {
      _t ? Qt(!1) : d && !Kt ? function() {
        var e, t = "",
          n = !1;
        try {
          e = new d
        } catch (e) {
          return Kt = !0, void l()
        }

        function i() {
          if (!n) {
            n = !0, m(!1);
            var e = t.trim();
            e ? c(e) : on("Didn't catch that. Press Speak and try again.")
          }
        }
        e.lang = navigator.language || "en-GB", e.interimResults = !0, e.maxAlternatives = 1, e.onresult = function(n) {
          for (var r = "", a = !1, o = 0; o < n.results.length; o++) r += n.results[o][0].transcript, a = n.results[o].isFinal;
          if (t = r, Jt.query = r.slice(0, 200), Jt.mode = "title", an(), a) {
            try {
              e.stop()
            } catch (e) {}
            i()
          }
        }, e.onerror = function(e) {
          n || (/not-allowed|service-not-allowed|network|audio-capture|language-not-supported/.test(e.error) ? (n = !0, m(!1), Kt = !0, r.style.pointerEvents = "", C("Voice search isn't working directly here, so Speak opens LG's keyboard instead. Use its microphone key.", "warn"), l()) : "aborted" === e.error ? (n = !0, m(!1)) : i())
        }, e.onend = i;
        var a = Jt.query;
        _t = {
          rec: e,
          finish: function() {
            n = !0, m(!1), Jt.query = a, an()
          }
        }, m(!0), on("");
        try {
          e.start()
        } catch (e) {
          n = !0, m(!1), Kt = !0, l()
        }
      }() : l()
    }), r.addEventListener("input", function() {
      var e = r.value;
      clearTimeout(o), e.trim() && e.length - i.length >= 3 && (o = setTimeout(s, 1200)), i = e
    }), r.addEventListener("change", s), r.addEventListener("keydown", function(e) {
      13 === e.keyCode && (e.preventDefault(), e.stopPropagation(), s())
    }), Gt && document.removeEventListener("keyboardStateChange", Gt), Gt = function(e) {
      e && e.detail && !1 === e.detail.visibility && r.value.trim() && s()
    }, document.addEventListener("keyboardStateChange", Gt), document.removeEventListener("keydown", en), document.addEventListener("keydown", en), an(), fn();
    var f = Jt.focusKey && n.querySelector('.card[data-key="' + (window.CSS && CSS.escape ? CSS.escape(Jt.focusKey) : Jt.focusKey) + '"]');
    f ? Nav.focus(f) : Nav.focus(document.getElementById("speak"))
  }

  function en(e) {
    if (!("screen-search" !== n.className || Player.active || document.activeElement && "INPUT" === document.activeElement.tagName)) {
      var t = e.keyCode;
      t >= 48 && t <= 57 ? rn(String.fromCharCode(t)) : t >= 96 && t <= 105 ? rn(String(t - 96)) : t >= 65 && t <= 90 && !e.ctrlKey && !e.metaKey ? rn(String.fromCharCode(t).toLowerCase()) : 32 === t && (e.preventDefault(), rn(" "))
    }
  }
  var tn = null,
    nn = 0;

  function rn(e) {
    "ai" === Jt.mode && "del" !== e && "clear" !== e && (Jt.query = ""), "del" === e ? Jt.query = Jt.query.slice(0, -1) : "clear" === e ? Jt.query = "" : Jt.query.length < 200 && (Jt.query += e), Jt.mode = "title", Jt.status = "", an(), clearTimeout(tn), nn++;
    var t = Jt.query.trim();
    if (t.length < 2) return Jt.results = [], void fn();
    tn = setTimeout(function() {
      sn(t)
    }, 450)
  }

  function an() {
    var e = document.getElementById("search-query");
    if (e) {
      var t = "ai" === Jt.mode ? '<em class="ai-tag">AI</em>' : "",
        n = Jt.query;
      e.classList.toggle("long", n.length > 22);
      var r = n.length > 46 ? "…" + n.slice(-45) : n;
      e.innerHTML = t + (n ? x(r) + '<i class="caret"></i>' : '<span class="muted">Title or description</span><i class="caret"></i>')
    }
  }

  function on(e) {
    Jt.status = e;
    var t = document.getElementById("search-caption");
    t && (t.textContent = e)
  }
  async function sn(e, t) {
    var n, r = ++nn,
      i = document.getElementById("search-results");
    i && !Jt.results.length && (i.innerHTML = '<p class="muted">Searching</p>');
    try {
      n = await Api.search(e, s.id)
    } catch (e) {
      return void(r === nn && i && (i.innerHTML = '<p class="error">' + x(e.message) + "</p>"))
    }
    r === nn && (Jt.results = ae((n || []).filter(function(e) {
      return e.title && "person" !== e.title.mediaType
    }).map(function(e) {
      return re(e.title)
    })), t && !Jt.results.length && e.length >= 3 ? cn(e, !0) : fn())
  }
  async function cn(e, t) {
    clearTimeout(tn), Jt.remember = !0, Jt.fellBack = !!t;
    var n = ++nn;
    Jt.mode = "ai", Jt.aiQuery = e, Jt.results = [], an();
    var r, i = s.id + "|" + e.toLowerCase(),
      a = document.getElementById("search-results");
    $t[i] || (a && (a.innerHTML = '<p class="muted asking">' + (t ? 'No titles called that, so asking AI for "' : 'Asking AI for "') + x(e) + '"</p>'), on(""));
    try {
      r = $t[i] || await Api.aiSearch(e, s.id)
    } catch (e) {
      if (n !== nn) return;
      var o = String(e.message || "");
      return void(a && (a.innerHTML = '<p class="error">' + x(/not configured/i.test(o) ? "AI search isn't set up in mediastorm yet. Choose an AI provider under Movie & Show Information in the admin panel." : "The AI search didn't work: " + o) + "</p>"))
    }
    if (n === nn) {
      $t[i] = r;
      var c = r && r.items || [];
      Jt.results = c.filter(function(e) {
        return e.title && "person" !== e.title.mediaType
      }).map(function(e) {
        return re(e.title)
      }), fn()
    }
  }

  function ln() {
    return e + "-recent-" + (s && s.id)
  }

  function dn() {
    try {
      var e = JSON.parse(localStorage.getItem(ln()));
      return Array.isArray(e) ? e : []
    } catch (e) {
      return []
    }
  }

  function un(e) {
    try {
      localStorage.setItem(ln(), JSON.stringify(e.slice(0, 6)))
    } catch (e) {}
  }

  function mn(e, t) {
    if (!((e = String(e || "").trim()).length < 2)) {
      var n = dn().filter(function(t) {
        return t.q.toLowerCase() !== e.toLowerCase()
      });
      n.unshift({
        q: e,
        ai: !!t
      }), un(n)
    }
  }

  function fn() {
    var e = document.getElementById("search-results");
    if (e) {
      var t = Jt.query.trim(),
        n = Jt.results.length,
        r = "ai" === Jt.mode ? n ? (Jt.fellBack ? 'No titles matched, so here are AI picks for "' : 'AI picks for "') + Jt.aiQuery + '"' : "" : n ? n + (1 === n ? " result" : " results") : "";
      if (document.getElementById("search-caption").textContent = Jt.status || r, n && Jt.remember && (Jt.remember = !1, mn("ai" === Jt.mode ? Jt.aiQuery : t, "ai" === Jt.mode)), n) e.innerHTML = Jt.results.map(function(e, t) {
        return '<button class="card poster" data-focus data-r="' + t + '" data-key="' + x(e.key) + '"' + nt(e) + ">" + (e.poster ? R(e.poster, "w342", !0) : "") + L(e.name, e.year ? " (" + e.year + ")" : "") + "</button>"
      }).join(""), tt(e), e.querySelectorAll(".card").forEach(function(e) {
        e.addEventListener("focus", function() {
          var t = Jt.results[+e.getAttribute("data-r")];
          document.getElementById("search-caption").textContent = t.name + (t.year ? " (" + t.year + ")" : "") + ", " + ("movie" === t.kind ? "film" : "series")
        }), e.addEventListener("click", function() {
          var t = Jt.results[+e.getAttribute("data-r")];
          "ai" !== Jt.mode && mn(Jt.query, !1), Jt.focusKey = t.key, document.removeEventListener("keydown", en), kt(t, Xt)
        })
      });
      else {
        if ("ai" === Jt.mode) return void(e.innerHTML = '<p class="muted">The AI didn\'t come up with any matches. Try wording it differently.</p>');
        if (t.length >= 2) return void(e.innerHTML = '<p class="muted">No films or series found for "' + x(t) + '". Press Ask AI to describe it instead.</p>');
        var i = dn();
        e.innerHTML = (i.length ? '<div class="suggest recent-row"><h3>Recent</h3>' + i.map(function(e, t) {
          return '<button class="chip recent" data-focus data-rc="' + t + '">' + (e.ai ? '<i class="ai-mark">✦</i> ' : "") + x(e.q) + "</button>"
        }).join("") + '<button class="chip quiet" data-focus id="recent-clear">Clear</button></div>' : "") + '<div class="suggest"><h3>Ask AI</h3>' + Zt().map(function(e, t) {
          return '<button class="chip" data-focus data-s="' + t + '">' + x(e) + "</button>"
        }).join("") + "</div>", e.querySelectorAll("[data-rc]").forEach(function(e) {
          var t = i[+e.getAttribute("data-rc")];
          e.addEventListener("click", function() {
            ! function(e) {
              Jt.query = e.q, Jt.status = "", Jt.remember = !0, e.ai ? cn(e.q) : (Jt.mode = "title", an(), sn(e.q, !1))
            }(t)
          }), e.onhold = function() {
            var n, r;
            n = +e.getAttribute("data-rc"), (r = dn()).splice(n, 1), un(r), C('Removed "' + t.q + '" from recent searches.'), fn(), Nav.focus(document.querySelector("#search-results [data-rc]") || document.getElementById("speak"))
          }
        });
        var a = document.getElementById("recent-clear");
        a && a.addEventListener("click", function() {
          un([]), fn(), Nav.focus(document.getElementById("speak"))
        });
        var o = Zt();
        e.querySelectorAll(".chip").forEach(function(e) {
          e.addEventListener("click", function() {
            Jt.query = o[+e.getAttribute("data-s")], cn(Jt.query)
          })
        })
      }
    }
  }!async function() {
    if (Api.configure({
        server: i.server || t.server || "",
        token: i.token || "",
        clientId: i.clientId
      }), i.token) {
      var n = i.profiles || [],
        r = n.filter(function(e) {
          return e.id === i.profileId
        })[0];
      if (r && !r.pinLength && function(t) {
          try {
            return Boolean(localStorage.getItem(e + "-home-" + t))
          } catch (e) {
            return !1
          }
        }(r.id)) return o = n, s = r, Pe(), void Api.profiles().then(function(e) {
        o = e || [], i.profiles = o, a();
        var t = o.filter(function(e) {
          return e.id === r.id
        })[0];
        t && !t.pinLength || Be()
      }).catch(function(e) {
        401 === e.status && (i.token = "", a(), Ae("Your session has ended. Sign in again."))
      });
      await Be(!0)
    } else Ae()
  }()
}();