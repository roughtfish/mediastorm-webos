var Player = function() {
  "use strict";
  var e = function(e) {
      return document.getElementById(e)
    },
    t = e("video"),
    r = Nav.KEY,
    n = ["mjpeg", "png", "bmp", "gif", "webp", "tiff"],
    i = {
      usenet: 3,
      debrid: 2
    },
    a = null,
    o = null,
    s = null;

  function u(t) {
    e("prep-status").textContent = t
  }

  function l(e) {
    var t = e.progressTotal,
      r = e.progressCurrentMax || e.progressCurrent;
    switch (e.status) {
      case "queued":
        return "Getting ready";
      case "searching":
        return "Searching for releases";
      case "resolving":
        return t ? "Preparing release " + Math.max(1, r) + " of " + t : "Preparing a release";
      case "probing":
        return "Checking the file";
      default:
        return e.progressDetail || "Working"
    }
  }

  function d(e) {
    if (!e) return 0;
    var t = String(e).split("."),
      r = /^dv(he|av)/i.test(t[0]) ? t[1] : t[0];
    return parseInt(r, 10) || 0
  }

  function c(e) {
    return -1 !== n.indexOf(String(e || "").toLowerCase())
  }

  function f(e) {
    return e ? e.dv ? "Dolby Vision" + (e.dvProfile ? " (profile " + d(e.dvProfile) + ")" : "") : /hdr10\+|hdr10plus/i.test(e.hdr) ? "HDR10+" : /hdr|pq|hlg/i.test(e.hdr) ? -1 !== e.hdr.toUpperCase().indexOf("HLG") ? "HLG" : "HDR10" : "" : ""
  }

  function p(e) {
    return /usenet/i.test(e.serviceType || "") ? "usenet" : "debrid"
  }

  function m(e, t, r) {
    return e.prep || (t.attempts++, e.state = "pending", e.prep = async function() {
      try {
        return await async function() {
          if (!e.path) {
            try {
              var i = await async function(e, t, r) {
                var n = await Api.resolve(e.result, a.profileId);
                if (n && n.webdavPath) return n;
                if (!(n && n.queueId > 0)) return n;
                var i = Date.now();
                for (; Date.now() - i < 12e4;) {
                  if (a !== t) throw new Error("cancelled");
                  if (r || t.parallel || u(("queued" === n.healthStatus ? "Queued: " : "Preparing: ") + h(e.name)), await new Promise(function(e) {
                      setTimeout(e, 1500)
                    }), (n = await Api.queueStatus(n.queueId)) && n.webdavPath) return n;
                  if (n && /fail|error|unhealthy/i.test(n.healthStatus || "")) throw new Error("mediastorm reported the release as " + n.healthStatus)
                }
                throw new Error("Timed out waiting for mediastorm to prepare it")
              }(e, t, r);
              e.path = i && i.webdavPath, e.fileSize = i && i.fileSize, e.healthStatus = i && i.healthStatus
            } catch (t) {
              if ("cancelled" === t.message) throw t;
              return n(e, function(e, t) {
                var r = String(t && t.message || ""),
                  n = e.name ? h(e.name) : "That release";
                return /infringing|\b451\b/i.test(r) ? "Real-Debrid refused " + n + " (blocked by its filter)." : t && 409 === t.status ? n + " is marked as bad in mediastorm." : "Couldn't prepare " + n + "."
              }(e, t)), e.state = "bad", e
            }
            if (!e.path) return n(e, "mediastorm couldn't prepare " + (e.name || "that release") + "."), e.state = "bad", e
          }
          var o = await async function(e) {
            for (var t = null, r = 0; r < 2; r++) {
              try {
                t = await Api.probe(e)
              } catch (e) {
                t = null
              }
              if (t && ((t.videoStreams || []).length || t.formatName)) break;
              0 === r && await new Promise(function(e) {
                setTimeout(e, 2500)
              })
            }
            if (!t) return {
              ok: !0,
              info: null
            };
            var n = String(t.formatName || "").toLowerCase(),
              i = t.videoStreams || [],
              a = i.filter(function(e) {
                return e && e.codecName && !c(e.codecName)
              }),
              o = i.filter(function(e) {
                return e && c(e.codecName)
              });
            if (/_pipe$|^image2|^(jpeg|png|bmp|gif|webp|tiff)$/.test(n) || o.length && o.length === i.length) return {
              ok: !1,
              markBad: !0,
              reason: "This release contains a picture, not a video."
            };
            if (!a.length) return {
              ok: !0,
              info: null
            };
            var s = a[0],
              u = {
                codec: String(s.codecName || "").toLowerCase(),
                width: s.width,
                height: s.height,
                dv: s.hasDolbyVision,
                dvProfile: s.dolbyVisionProfile,
                hdr: s.hdrFormat || "",
                bitRate: s.bitRate || 0,
                fps: s.avgFrameRate || "",
                profile: s.profile || "",
                audio: (t.audioStreams || []).slice().sort(function(e, t) {
                  return e.index - t.index
                }),
                chapters: (t.chapters || []).map(function(e) {
                  return {
                    title: e.title || "",
                    start: e.start,
                    end: e.end || void 0
                  }
                })
              };
            return u.dv && 7 === d(u.dvProfile) ? {
              ok: !1,
              markBad: !1,
              profile7: !0,
              info: u,
              reason: "This release is Dolby Vision profile 7, which LG TVs can't show as Dolby Vision."
            } : {
              ok: !0,
              info: u
            }
          }(e.path);
          if (a !== t) throw new Error("cancelled");
          if (o.ok) return e.info = o.info, e.state = "ok", e;
          n(e, o.reason), o.markBad && Api.markBad({
            releaseName: e.name,
            serviceType: e.serviceType,
            sourcePath: e.path,
            reason: "webos:not-a-video"
          }).catch(function() {});
          if (o.profile7) return e.info = o.info, e.state = "p7", e;
          return e.state = "bad", e
        }()
      } catch (r) {
        if ("cancelled" === r.message) throw r;
        return t.notes.push("Couldn't check " + h(e.name) + "."), e.state = "bad", e
      }
    }(), e.prep.catch(function() {})), e.prep;

    function n(e, r) {
      t.notes.push(r), e.why = r
    }
  }

  function h(e) {
    return (e = String(e || "release")).length > 70 ? e.slice(0, 67) + "…" : e
  }
  async function v(e) {
    if (/^\/debrid\//.test(e.path)) try {
      var t = await Api.directUrl(e.path);
      if (t && t.url && /^https?:\/\//i.test(t.url)) return t.url
    } catch (e) {}
    return Api.streamUrl(e.path, a.profileId, function(e, t) {
      if (!e || !e.item) return null;
      var r = e.item,
        n = "movie" === r.kind,
        i = e.episode || null,
        a = (String(t.path || "").match(/^\/debrid\/([^/]+)\//) || [])[1] || "";
      return {
        mediaType: n ? "movie" : "episode",
        itemId: I(e),
        title: r.name,
        movieName: n ? r.name : "",
        seriesName: n ? "" : r.name,
        seriesId: n ? "" : r.titleId,
        episodeName: i && i.title || "",
        seasonNumber: i ? i.season : "",
        episodeNumber: i ? i.episode : "",
        year: r.year || "",
        posterUrl: r.poster || "",
        imdb: r.imdb || "",
        tmdb: r.tmdb || "",
        tvdb: r.tvdb || "",
        titleId: r.titleId || "",
        sourceServiceType: p(t),
        debridProvider: a
      }
    }(a, e))
  }
  var g = {
    torbox: "TorBox",
    realdebrid: "Real-Debrid",
    alldebrid: "AllDebrid",
    premiumize: "Premiumize",
    debridlink: "Debrid-Link"
  };

  function b(e) {
    var t = /^\/debrid\/([^\/]+)/.exec(e || "");
    if (t) return g[t[1].toLowerCase().replace(/[^a-z]/g, "")] || t[1];
    var r = /^(plexmedia|jellyfinmedia|localmedia):/.exec(e || "");
    return r ? "plexmedia" === r[1] ? "Plex" : "jellyfinmedia" === r[1] ? "Jellyfin" : "your library" : "Usenet"
  }

  function y(e, t) {
    var r = 0 !== t.indexOf(Api.server);
    return b(e) + (r ? ", streaming direct" : ", via your server")
  }

  function w(e) {
    return {
      result: e,
      name: e.title,
      serviceType: e.serviceType,
      path: e.knownPath || ""
    }
  }
  async function T(t) {
    J(!0);
    var r, n, i, o, s, d = {
      item: t.item,
      episode: t.episode || null,
      profileId: t.profileId,
      clientId: t.clientId,
      onExit: t.onExit,
      nextEpisode: t.nextEpisode || null,
      startAt: t.startAt || 0,
      resume: !1 !== t.resume,
      cast: t.cast || null,
      onPerson: t.onPerson || null,
      candidates: [],
      attempts: 0,
      parallel: !1,
      notes: [],
      current: null,
      lastSentAt: 0,
      playingSince: 0,
      startTimer: null,
      stallTimer: null,
      progressTimer: null,
      ended: !1
    };
    a = d, e("prep").className = "on", e("prep-title").textContent = t.item.name + (d.episode ? "  " + x(d.episode) : ""), u("Getting ready");
    try {
      if (t.manual) return void await async function(e, t) {
        e.manualPick = !t.libraryItem, e.libraryItem = !!t.libraryItem, e.wantTrackIndex = -1, e.wantSubIndex = -1;
        var r = await Api.userSettings(e.profileId).catch(function() {
          return null
        });
        if (a !== e) return;
        var n = r && r.playback || {};
        e.prefLang = n.preferredAudioLanguage || "eng";
        var i = String(n.preferredSubtitleMode || "").toLowerCase();
        if (i = "always" === i ? "on" : "auto" === i ? "forced-only" : i || "off", e.subPref = "off" === i ? {
            on: !1
          } : {
            on: !0,
            lang: n.preferredSubtitleLanguage || e.prefLang,
            forced: "forced-only" === i,
            forcedOnly: "forced-only" === i
          }, t.releases.forEach(function(t) {
            e.candidates.push(w(t))
          }), e.resume && !e.startAt) {
          var o = await Api.getProgress(e.profileId, C(e), I(e)).catch(function() {
            return null
          });
          o && o.position > 30 && o.percentWatched < 95 && (e.startAt = o.position)
        }
        await k(e)
      }(d, t.manual);
      var c = await Api.prequeue((r = t.item, n = d.episode, i = t.profileId, o = t.clientId, s = {
        titleId: r.titleId,
        titleName: r.name,
        mediaType: "movie" === r.kind ? "movie" : "series",
        userId: i,
        clientId: o,
        year: r.year || void 0,
        imdbId: r.imdb || void 0,
        tmdbId: r.tmdb || void 0,
        tvdbId: r.tvdb || void 0,
        skipHLS: !0
      }, n && (s.seasonNumber = n.season, s.episodeNumber = n.episode), s));
      if (a !== d) return;
      d.prequeueId = c.prequeueId, c.targetEpisode && "movie" !== t.item.kind && (d.episode = {
        season: c.targetEpisode.seasonNumber,
        episode: c.targetEpisode.episodeNumber,
        title: c.targetEpisode.title || d.episode && d.episode.title || ""
      }, e("prep-title").textContent = t.item.name + "  " + x(d.episode));
      var f = await async function(e, t) {
        for (var r = Date.now();;) {
          if (a !== t) throw new Error("cancelled");
          var n = await Api.prequeueStatus(e);
          if (a !== t) throw new Error("cancelled");
          if ("ready" === n.status) return n;
          if ("failed" === n.status || "expired" === n.status) throw new Error(n.error ? "mediastorm couldn't find a playable release: " + n.error : "mediastorm couldn't find a playable release.");
          if (u(l(n)), Date.now() - r > 18e4) throw new Error("Preparing took longer than three minutes, so playback was stopped.");
          await new Promise(function(e) {
            setTimeout(e, 1e3)
          })
        }
      }(c.prequeueId, d);
      if (a !== d) return;
      if (d.wantTrackIndex = "number" == typeof f.selectedAudioTrack ? f.selectedAudioTrack : -1, d.wantSubIndex = "number" == typeof f.selectedSubtitleTrack ? f.selectedSubtitleTrack : -1, d.subPref = {
          on: !1
        }, (f.subtitleTracks || []).forEach(function(e) {
          e.index === d.wantSubIndex && (d.subPref = {
            on: !0,
            lang: e.language || "",
            forced: Boolean(e.forced)
          })
        }), (f.audioTracks || []).forEach(function(e) {
          e.index === d.wantTrackIndex && (d.prefLang = e.language || "")
        }), d.candidates.push({
          path: f.streamPath,
          name: f.displayName || f.selectedResult && f.selectedResult.title || "",
          serviceType: f.serviceType,
          result: f.selectedResult,
          primary: !0,
          fileSize: f.fileSize,
          healthStatus: f.healthStatus
        }), (f.migrationCandidates || []).forEach(function(e) {
          d.candidates.push(w(e))
        }), d.resume && !d.startAt) {
        var p = await async function(e) {
          var t = C(e),
            r = await Api.getProgress(e.profileId, t, I(e)).catch(function() {
              return null
            });
          if (r && r.position > 0) return r;
          if ("episode" !== t || !e.episode) {
            if ("movie" === t) {
              var n = [];
              e.item.tmdb && n.push("tmdb:movie:" + e.item.tmdb), e.item.imdb && n.push(e.item.imdb);
              for (var i = 0; i < n.length; i++)
                if (n[i] !== e.item.titleId) {
                  var a = await Api.getProgress(e.profileId, "movie", n[i]).catch(function() {
                    return null
                  });
                  if (a && a.position > 0) return a
                }
            }
            return r
          }
          for (var o = "S" + A(e.episode.season) + "E" + A(e.episode.episode), s = P(e.item), u = 0; u < s.length; u++)
            if (s[u] !== e.item.titleId) {
              var l = await Api.getProgress(e.profileId, "episode", s[u] + ":" + o).catch(function() {
                return null
              });
              if (l && l.position > 0) return l
            } var d = await Api.progressList(e.profileId).catch(function() {
              return []
            }),
            c = e.item,
            f = {
              tvdb: String(c.tvdb || ""),
              tmdb: String(c.tmdb || ""),
              imdb: String(c.imdb || "")
            },
            p = (Array.isArray(d) ? d : []).filter(function(t) {
              if (!t || "episode" !== t.mediaType) return !1;
              var r = /:S(\d+)E(\d+)$/i.exec(t.itemId || ""),
                n = t.seasonNumber || r && +r[1],
                i = t.episodeNumber || r && +r[2];
              if (+n !== +e.episode.season || +i !== +e.episode.episode) return !1;
              var a = t.externalIds || {};
              return s.some(function(e) {
                return 0 === String(t.itemId || "").toLowerCase().indexOf(String(e).toLowerCase() + ":") || t.seriesId === e
              }) || f.tvdb && String(a.tvdb) === f.tvdb || f.tmdb && String(a.tmdb) === f.tmdb || f.imdb && a.imdb === f.imdb
            }).sort(function(e, t) {
              return String(t.updatedAt || "").localeCompare(String(e.updatedAt || ""))
            })[0];
          return p || r
        }(d);
        p && p.position > 30 && p.percentWatched < 95 && (d.startAt = p.position)
      }
      await k(d)
    } catch (e) {
      if ("cancelled" === e.message || a !== d) return;
      X(e.message)
    }
  }
  async function k(r, n) {
    if (!r.switching) {
      r.switching = !0;
      try {
        await async function(r, n) {
          n && (r.parallel = !0, j(n + " Trying another release."), r.playingSince = 0, clearTimeout(r.startTimer), clearTimeout(r.stallTimer));
          var o;
          try {
            o = await async function(e) {
              for (var t = e.candidates, r = 0;;) {
                if (a !== e) throw new Error("cancelled");
                for (var n = t.filter(function(e) {
                    return !e.used && "bad" !== e.state
                  }), o = null, s = !1, l = 0; l < n.length; l++) {
                  if ("ok" === n[l].state) {
                    o = n[l];
                    break
                  }
                  "pending" !== n[l].state && n[l].state || (s = !0)
                }
                if (o && (!s || r && Date.now() >= r)) return o.used = !0, o;
                o && !r && (r = Date.now() + 5e3);
                var d = e.parallel ? null : 1,
                  c = {
                    usenet: 0,
                    debrid: 0
                  },
                  f = 0;
                n.forEach(function(e) {
                  "pending" === e.state && (c[p(e)]++, f++)
                }), o || n.forEach(function(t) {
                  if (!(t.state || e.attempts >= 8)) {
                    var r = p(t);
                    (d ? f >= d : c[r] >= i[r]) || (m(t, e, !1), c[r]++, f++)
                  }
                });
                var h = n.filter(function(e) {
                  return "pending" === e.state
                });
                if (!h.length) {
                  if (o) return o.used = !0, o;
                  var v = n.filter(function(e) {
                    return "p7" === e.state
                  })[0];
                  if (v) return v.used = !0, v.p7 = !0, v;
                  throw new Error(e.notes.length ? e.notes[e.notes.length - 1] + " No other release worked either." : "None of the available releases could be played.")
                }
                var g = t.filter(function(e) {
                  return e.state && "pending" !== e.state
                }).length;
                u(0 === g && 1 === h.length ? "Checking the file" : "Trying other releases (" + h.length + " being checked, " + g + " done)");
                var b = h.map(function(e) {
                  return e.prep
                });
                r && b.push(new Promise(function(e) {
                  setTimeout(e, Math.max(0, r - Date.now()))
                })), await Promise.race(b).catch(function(e) {
                  if ("cancelled" === e.message) throw e
                }), t.some(function(e) {
                  return "bad" === e.state || "p7" === e.state
                }) && (e.parallel = !0)
              }
            }(r)
          } catch (e) {
            return void("cancelled" !== e.message && a === r && X(e.message))
          }
          if (a !== r) return;
          var s = r.current;
          s && n && s !== o && (s.why = s.why || String(n).replace(/\.$/, "").toLowerCase(), o.switchedFrom = {
            name: h(s.name),
            why: String(n).replace(/\.$/, "")
          });
          if (r.current = o, r.creditsAt = 0, r.creditsShown = !1, !o.primary && r.prequeueId) {
            var l = r.candidates.filter(function(e) {
              return !e.used && "bad" !== e.state
            }).map(function(e) {
              return e.result
            }).filter(Boolean);
            Api.adoptMigration(r.prequeueId, {
              streamPath: o.path,
              result: o.result,
              fileSize: o.fileSize || 0,
              healthStatus: o.healthStatus || "",
              migrationCandidates: l
            }).catch(function() {})
          }
          var d = await v(o);
          if (a !== r) return;
          e("prep").className = "", e("player").className = "on", e("osd-title").textContent = r.item.name, e("osd-sub").textContent = [r.episode ? x(r.episode) + (r.episode.title ? "  " + r.episode.title : "") : "", f(o.info)].filter(Boolean).join("    "), e("osd-release").textContent = o.name || "", e("osd-source").textContent = y(o.path, d), s || (e("osd-bar").style.width = "0%", e("osd-time").textContent = "");
          o.p7 ? j("Dolby Vision profile 7: expect HDR10 rather than Dolby Vision.") : !s && r.notes.length && j(1 === r.notes.length ? r.notes[0] + " Playing another release instead." : "Skipped " + r.notes.length + " releases that couldn't play here.");
          var c = s && t.currentTime || r.startAt;
          t.src = d, t.load(), t.addEventListener("loadedmetadata", function e() {
            t.removeEventListener("loadedmetadata", e), E.autoSelect(r, o), S.load(r, o, c > 0 && t.duration && c < t.duration - 10 ? c : 0), c > 0 && t.duration && c < t.duration - 10 && (t.currentTime = c)
          });
          var g = t.play();
          g && g.catch && g.catch(function() {});
          K(), clearTimeout(r.startTimer), r.startTimer = setTimeout(function() {
            a !== r || r.playingSince || k(r, "This release didn't start.")
          }, 45e3), clearInterval(r.progressTimer), r.progressTimer = setInterval(function() {
            L(r, !1)
          }, 1e4)
        }(r, n)
      } finally {
        r.switching = !1
      }
    }
  }
  var S = function() {
      var r = ["subrip", "srt", "ass", "ssa", "webvtt", "vtt", "mov_text", "text"],
        n = [],
        i = -1,
        o = [],
        s = "",
        u = "",
        l = null,
        d = null,
        c = -1,
        f = 0,
        p = 0,
        m = "";

      function h(e) {
        return -1 !== r.indexOf(String(e.codec || "").toLowerCase())
      }

      function v() {
        p++, clearTimeout(l), clearInterval(d), n = [], i = -1, o = [], s = "", u = "", c = -1, f = 0, k("")
      }
      async function g(e, r) {
        var n = ++p;
        if (clearTimeout(l), clearInterval(d), o = [], c = -1, f = 0, k(""), i = e, !(e < 0)) {
          try {
            var a = await Api.startSubtitles(s, e, null != r ? r : t.currentTime);
            if (n !== p) return;
            u = a && a.subtitleUrl
          } catch (e) {
            return void(n === p && (i = -1, j("These subtitles couldn't be loaded.")))
          }
          b(n, 0), d = setInterval(T, 200)
        }
      }
      async function b(e, t) {
        if (e === p && u) {
          try {
            var r = await Api.fetchText(u);
            if (e !== p) return;
            r.length === c ? f++ : (f = 0, c = r.length, o = function(e) {
              var t = [];
              return e.replace(/\r/g, "").split(/\n\n+/).forEach(function(e) {
                for (var r = e.split("\n"), n = 0; n < r.length; n++) {
                  var i = /^\s*([\d:.,]+)\s*-->\s*([\d:.,]+)/.exec(r[n]);
                  if (i) {
                    var a = r.slice(n + 1).join("\n").trim();
                    a && t.push({
                      start: y(i[1]),
                      end: y(i[2]),
                      html: w(a)
                    });
                    break
                  }
                }
              }), t.sort(function(e, t) {
                return e.start - t.start
              }), t
            }(r))
          } catch (e) {}
          f >= 3 || (l = setTimeout(function() {
            b(e, t + 1)
          }, t < 2 ? 2500 : 1e4))
        }
      }

      function y(e) {
        for (var t = e.trim().split(":"), r = 0, n = 0; n < t.length; n++) r = 60 * r + parseFloat(t[n].replace(",", "."));
        return r
      }

      function w(e) {
        return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&lt;(\/?)(i|b)&gt;/gi, "<$1$2>").replace(/&lt;[^&]*?&gt;/g, "").replace(/\n/g, "<br>")
      }

      function T() {
        if (i < 0 || !o.length) k("");
        else {
          for (var e = t.currentTime, r = 0, n = o.length - 1, a = -1; r <= n;) {
            var s = r + n >> 1;
            o[s].start <= e ? (a = s, r = s + 1) : n = s - 1
          }
          for (var u = [], l = a; l >= 0 && l > a - 8; l--) o[l].end > e && u.unshift(o[l].html);
          k(u.join("<br>"))
        }
      }

      function k(t) {
        t !== m && (m = t, e("subs").innerHTML = t ? "<span>" + t + "</span>" : "")
      }
      return t.addEventListener("seeked", function() {
        if (!(i < 0) && s) {
          var e = t.currentTime,
            r = o.length ? o[0].start : null,
            n = o.length ? o[o.length - 1].end : null;
          (null == r || e < r - 10 || !(f >= 3) && e > n + 60) && g(i, e)
        }
      }), {
        load: async function(e, t, r) {
          var i = e.subPref;
          v();
          var o = p;
          s = t.path;
          var u = [];
          try {
            var l = await Api.subtitleTracks(t.path);
            u = l && l.tracks || []
          } catch (e) {
            u = []
          }
          if (o === p && a === e) {
            n = u.map(function(e) {
              return {
                index: e.index,
                language: e.language || "",
                title: e.title || "",
                codec: e.codec || "",
                forced: Boolean(e.forced),
                text: h(e)
              }
            });
            var d = -1;
            t.primary && e.wantSubIndex >= 0 && n.forEach(function(t) {
              t.index === e.wantSubIndex && t.text && (d = t.index)
            }), d < 0 && i && i.on && (n.forEach(function(e) {
              d < 0 && e.text && E.sameLang(e.language, i.lang) && e.forced === i.forced && (d = e.index)
            }), d < 0 && !i.forcedOnly && n.forEach(function(e) {
              d < 0 && e.text && E.sameLang(e.language, i.lang) && (d = e.index)
            })), d >= 0 && g(d, r)
          }
        },
        reset: v,
        choose: g,
        selected: function() {
          return i
        },
        list: function() {
          return n
        },
        label: function(e) {
          var t = [E.langName(e.language)];
          return e.forced && t.push("forced"), e.title && !/^(forced|full|sdh)$/i.test(e.title.trim()) ? t.push(e.title) : /sdh/i.test(e.title) && t.push("SDH"), t.join(", ")
        },
        isOn: function() {
          return i >= 0
        }
      }
    }(),
    E = function() {
      var n = {
          fre: "fra",
          ger: "deu",
          chi: "zho",
          dut: "nld",
          cze: "ces",
          gre: "ell",
          per: "fas",
          rum: "ron",
          slo: "slk",
          ice: "isl",
          mac: "mkd",
          alb: "sqi",
          arm: "hye",
          baq: "eus",
          bur: "mya",
          geo: "kat",
          may: "msa",
          tib: "bod",
          wel: "cym"
        },
        i = {
          eac3: "Dolby Digital Plus",
          ac3: "Dolby Digital",
          truehd: "Dolby TrueHD",
          dts: "DTS",
          aac: "AAC",
          flac: "FLAC",
          opus: "Opus",
          mp3: "MP3",
          vorbis: "Vorbis",
          pcm_s16le: "PCM",
          pcm_s24le: "PCM"
        },
        o = null;
      try {
        o = new Intl.DisplayNames(["en"], {
          type: "language"
        })
      } catch (e) {}
      var u = !1,
        l = 0,
        d = [];

      function c(e) {
        return String(e || "").toLowerCase().slice(0, 2)
      }

      function f(e, t) {
        return !(!e || !t) && (e = String(e).toLowerCase(), t = String(t).toLowerCase(), (e = n[e] || e) === (t = n[t] || t) || c(e) === c(t))
      }

      function p(e) {
        if (!e || /^und/i.test(e)) return "Unknown language";
        var t = String(e).toLowerCase();
        t = n[t] || t;
        try {
          var r = o && o.of(t);
          if (r && r.toLowerCase() !== t) return r
        } catch (e) {}
        return String(e).toUpperCase()
      }

      function m(e) {
        var t = String(e.codecName || "").toLowerCase(),
          r = i[t] || t.toUpperCase();
        return "dts" === t && e.profile && (r = /ma/i.test(e.profile) ? "DTS-HD MA" : /hra|hi/i.test(e.profile) ? "DTS-HD" : /x/i.test(e.profile) ? "DTS:X" : "DTS"), [r, 1 === e.channels ? "mono" : 2 === e.channels ? "stereo" : 6 === e.channels ? "5.1" : 8 === e.channels ? "7.1" : e.channels ? e.channels + " channels" : "", /atmos/i.test(e.profile || "") || /atmos/i.test(e.title || "") ? "Atmos" : ""].filter(Boolean).join(" ")
      }

      function v() {
        return t.audioTracks
      }

      function g() {
        var e = v();
        if (!e) return -1;
        for (var t = 0; t < e.length; t++)
          if (e[t].enabled) return t;
        return -1
      }

      function w() {
        var e = v(),
          t = a && a.current && a.current.info && a.current.info.audio || [];
        d = [];
        for (var r = e ? e.length : 0, n = 0; n < r; n++) {
          var i = t[n] || {},
            o = i.language || e[n].language || "";
          d.push({
            i: n,
            language: o,
            title: p(o),
            detail: i.codecName ? m(i) : e[n].label || "",
            extra: i.title && !/atmos/i.test(i.title) ? i.title : ""
          })
        }
        return d
      }

      function T(e, r) {
        var n = v();
        if (!n || !n[e]) return !1;
        for (var i = 0; i < n.length; i++) n[i].enabled = i === e;
        return r && t.currentTime > 1 && (t.currentTime = t.currentTime - .25), C(), !0
      }
      var k = {
        hevc: "HEVC (H.265)",
        h265: "HEVC (H.265)",
        h264: "H.264 (AVC)",
        avc: "H.264 (AVC)",
        av1: "AV1",
        vp9: "VP9",
        vp8: "VP8",
        mpeg2video: "MPEG-2",
        mpeg4: "MPEG-4",
        vc1: "VC-1"
      };

      function E(e) {
        return e ? e >= 1e6 ? (e / 1e6).toFixed(1) + " Mbps" : Math.round(e / 1e3) + " kbps" : ""
      }

      function x(e) {
        var t = /^(\d+)\/(\d+)$/.exec(e || "");
        if (!t || 0 === +t[2]) return "";
        var r = +t[1] / +t[2],
          n = Math.round(100 * r) / 100;
        return (n % 1 == 0 ? n : n.toFixed(2)) + " fps"
      }

      function C() {
        var t = g(),
          r = t >= 0 ? w()[t] : null;
        e("osd-audio").textContent = r ? "Audio: " + r.title + (r.detail ? ", " + r.detail : "") : ""
      }
      var I = [];

      function P(e) {
        return I[e] && ("audio" === I[e].kind || "sub" === I[e].kind || "about" === I[e].kind)
      }

      function L() {
        var t = g(),
          r = S.selected();
        e("audio-list").innerHTML = I.map(function(e, n) {
          if ("head" === e.kind) return "<h3>" + D(e.title) + "</h3>";
          if ("note" === e.kind) return '<p class="menu-note">' + D(e.title) + "</p>";
          var i = "audio" === e.kind ? e.i === t : e.i === r;
          return '<div class="audio-row' + (n === l ? " focus" : "") + (i ? " current" : "") + '" data-k="' + n + '"><b></b><span>' + D(e.title) + "</span>" + (e.detail ? "<small>" + D(e.detail) + "</small>" : "") + "</div>"
        }).join("");
        var n = e("audio-list").querySelector(".focus");
        n && n.scrollIntoView({
          block: "nearest"
        })
      }

      function D(e) {
        return String(e).replace(/[&<>"]/g, function(e) {
          return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;"
          } [e]
        })
      }

      function B() {
        u = !1, M = !1, e("audio-menu").className = "", K()
      }
      var M = !1,
        R = 0;

      function O(e) {
        var t = ["th", "st", "nd", "rd"],
          r = e % 100;
        return e + (t[(r - 20) % 10] || t[r] || t[0])
      }

      function H() {
        var r = a,
          n = r && r.current;
        if (n) {
          M = !0;
          var i = r.candidates.indexOf(n),
            o = r.candidates.slice(0, Math.max(0, i)),
            s = [];
          r.libraryItem ? s.push("Playing directly from " + b(n.path) + ". No release search needed.") : r.manualPick ? s.push("You picked this release yourself, in Choose release.") : i <= 0 ? s.push("mediastorm's first choice for your settings.") : (s.push("mediastorm's " + O(i + 1) + " choice. The ones ranked above it:"), o.forEach(function(e, t) {
            var r = "p7" === e.state ? "Dolby Vision profile 7, which LG TVs can't show as Dolby Vision" : e.why || ("bad" === e.state ? "didn't work here" : "not tried");
            r = r.replace(/\.$/, ""), s.push(O(t + 1) + ": " + h(e.name) + " (" + r.charAt(0).toLowerCase() + r.slice(1) + ")")
          })), n.switchedFrom && s.push("Switched to this one during playback. The one before (" + n.switchedFrom.name + "): " + n.switchedFrom.why + ".");
          var u = function() {
            var e = a && a.current,
              t = e && e.info;
            if (!t) return [];
            var r = ["Video", [k[String(t.codec || "").toLowerCase()] || String(t.codec || "").toUpperCase(), t.profile, t.width && t.height ? t.width + "×" + t.height : "", x(t.fps), E(t.bitRate)].filter(Boolean).join(" · ")],
              n = g(),
              i = n >= 0 ? w()[n] : null,
              o = i && t.audio && t.audio[i.i] || t.audio && t.audio[0],
              s = o ? ["Audio", [m(o), o.language ? p(o.language) : "", o.sampleRate ? o.sampleRate / 1e3 + " kHz" : "", E(o.bitRate)].filter(Boolean).join(" · ")] : null;
            return s ? [r, s] : [r]
          }();
          e("audio-list").innerHTML = '<h3>About this release</h3><p class="about-name">' + D(n.name || "Unnamed release") + '</p><p class="menu-note">' + D(y(n.path, t.currentSrc || "")) + "</p>" + s.map(function(e) {
            return '<p class="about-line">' + D(e) + "</p>"
          }).join("") + (u.length ? "<h3>What's actually playing</h3>" + u.map(function(e) {
            return '<div class="score-row"><span>' + D(e[0]) + "</span><small>" + D(e[1]) + "</small></div>"
          }).join("") : "") + '<h3>Why mediastorm ranks it here</h3><div id="about-scores"><p class="menu-note">Checking with mediastorm…</p></div><p class="menu-note">Back to return</p>';
          var l = ++R,
            d = r.item.name + (r.episode ? " S" + A(r.episode.season) + "E" + A(r.episode.episode) : "");
          Api.scoredReleases({
            query: d,
            mediaType: "movie" === r.item.kind ? "movie" : "series",
            userId: r.profileId,
            clientId: r.clientId,
            imdbId: r.item.imdb,
            titleId: r.item.titleId,
            year: r.item.year
          }).then(function(t) {
            if (l === R && M) {
              var r = (t || []).filter(function(e) {
                  return e && e.title === n.name
                })[0],
                i = e("about-scores");
              if (r) {
                var a = (r.scoreBreakdown || []).filter(function(e) {
                  return e && (e.reason || e.criterion)
                });
                i.innerHTML = a.length ? a.map(function(e) {
                  var t = e.points > 0 ? "+" : e.points < 0 ? "−" : "";
                  return '<div class="score-row' + (e.points > 0 ? " up" : e.points < 0 ? " down" : " neutral") + '"><span>' + D(e.criterion || "") + "</span><small>" + D(N(e.reason)) + "</small><b>" + t + "</b></div>"
                }).join("") : '<p class="menu-note">mediastorm didn\'t give a breakdown for this release.</p>'
              } else i.innerHTML = "<p class=\"menu-note\">This release wasn't in a fresh search, so there's no breakdown for it right now.</p>"
            }
          }, function() {
            l === R && M && (e("about-scores").innerHTML = '<p class="menu-note">mediastorm couldn\'t give a breakdown right now.</p>')
          })
        }
      }

      function V(e) {
        for (var t = l + e; t >= 0 && t < I.length; t += e)
          if (P(t)) return void(l = t)
      }
      return {
        autoSelect: function(e, t) {
          var r = v();
          if (!r || r.length < 2) C();
          else {
            w();
            var n = -1;
            t.primary && e.wantTrackIndex >= 0 && t.info && t.info.audio && t.info.audio.forEach(function(t, r) {
              t.index === e.wantTrackIndex && (n = r)
            });
            var i = e.prefLang || "eng";
            (n < 0 || d[n] && d[n].language && !f(d[n].language, i) && e.prefLang) && (n = -1, d.forEach(function(e) {
              n < 0 && f(e.language, i) && (n = e.i)
            })), n >= 0 && n !== g() ? T(n, !1) : C()
          }
        },
        open: function() {
          ! function() {
            w(), I = [{
              kind: "head",
              title: "Audio"
            }], d.length ? d.forEach(function(e) {
              I.push({
                kind: "audio",
                i: e.i,
                title: e.title,
                detail: [e.detail, e.extra].filter(Boolean).join(", ")
              })
            }) : I.push({
              kind: "note",
              title: v() ? "The TV didn't report any audio tracks." : "This TV isn't letting the app switch audio tracks."
            }), I.push({
              kind: "head",
              title: "Subtitles"
            }), I.push({
              kind: "sub",
              i: -1,
              title: "Off",
              detail: ""
            });
            var e = 0;
            S.list().forEach(function(t) {
              t.text ? I.push({
                kind: "sub",
                i: t.index,
                title: S.label(t),
                detail: ""
              }) : e++
            }), e && I.push({
              kind: "note",
              title: e + (1 === e ? " picture-based track" : " picture-based tracks") + " can't be shown here."
            }), a && a.current && (I.push({
              kind: "head",
              title: "This release"
            }), I.push({
              kind: "about",
              title: "About this release",
              detail: "why it was chosen"
            }))
          }();
          var t = g();
          l = -1, I.forEach(function(e, r) {
            l < 0 && "audio" === e.kind && e.i === t && (l = r)
          }), l < 0 && I.forEach(function(e, t) {
            l < 0 && P(t) && (l = t)
          }), u = !0, L(), e("audio-menu").className = "on", e("osd").className = "", clearTimeout(s)
        },
        close: function() {
          u = !1, M = !1, e("audio-menu").className = ""
        },
        isOpen: function() {
          return u
        },
        key: function(t) {
          if (M) return t === r.UP || t === r.DOWN ? void(e("audio-list").scrollTop += t === r.DOWN ? 160 : -160) : t === r.BACK || t === r.ESC || t === r.BACKSPACE || t === r.LEFT ? (M = !1, R++, void L()) : void B();
          if (t === r.UP) V(-1), L();
          else if (t === r.DOWN) V(1), L();
          else if (t === r.ENTER) {
            var n = I[l];
            if (n && "audio" === n.kind) {
              var i = d.filter(function(e) {
                return e.i === n.i
              })[0];
              T(n.i, !0) && a && i && (a.prefLang = i.language || a.prefLang)
            } else {
              if (n && "about" === n.kind) return void H();
              if (n && "sub" === n.kind && (S.choose(n.i), a)) {
                var o = S.list().filter(function(e) {
                  return e.index === n.i
                })[0];
                a.subPref = o ? {
                  on: !0,
                  lang: o.language,
                  forced: o.forced
                } : {
                  on: !1
                }
              }
            }
            B()
          } else t !== r.BACK && t !== r.ESC && t !== r.BACKSPACE && t !== r.LEFT && t !== r.RIGHT || B()
        },
        sameLang: f,
        langName: p
      }
    }();

  function x(e) {
    return "S" + e.season + " E" + e.episode
  }

  function C(e) {
    return "movie" === e.item.kind ? "movie" : "episode"
  }
  var A = Util.pad2;

  function I(e) {
    if ("movie" === e.item.kind) return e.item.titleId;
    var t = e.episode || {
      season: 1,
      episode: 1
    };
    return e.item.titleId + ":S" + A(t.season) + "E" + A(t.episode)
  }
  var N = Util.plainReason,
    P = Util.showIds;
  async function L(e, r, n) {
    if (a === e && e.current && t.duration && isFinite(t.duration)) {
      var i = Math.max(0, Math.min(t.currentTime, t.duration));
      if (!(i <= 0)) {
        var o = e.item,
          s = {
            titleId: o.titleId
          };
        o.imdb && (s.imdb = o.imdb), o.tmdb && (s.tmdb = String(o.tmdb)), o.tvdb && (s.tvdb = String(o.tvdb));
        var u, l = {
          mediaType: C(e),
          itemId: I(e),
          position: i,
          duration: t.duration,
          isPaused: !!r || t.paused,
          isBuffering: !t.paused && t.readyState < 3,
          playbackEnded: Boolean(n),
          timestamp: (new Date).toISOString(),
          externalIds: s,
          sourcePath: e.current.path,
          year: o.year || void 0
        };
        "episode" === l.mediaType ? (l.seasonNumber = e.episode && e.episode.season, l.episodeNumber = e.episode && e.episode.episode, l.seriesId = o.titleId, l.seriesName = o.name, l.episodeName = e.episode && e.episode.title || void 0) : l.movieName = o.name, e.lastSentAt = Date.now();
        try {
          u = await Api.sendProgress(e.profileId, l)
        } catch (e) {
          return
        }!r && a === e && u && (!1 === u.allowedToContinue ? X("mediastorm stopped this stream: another device may be using your stream limit.") : u.migrationRequested && k(e, u.migrationReason ? "mediastorm reported a problem with this release (" + u.migrationReason + ")." : "mediastorm reported a problem with this release."))
      }
    }
  }
  t.addEventListener("playing", function() {
    if (a) {
      if (!a.playingSince) {
        var r = a;
        setTimeout(function() {
          a === r && r.playingSince && async function(e) {
            for (; a === e && e.attempts < 8;) {
              var t = e.candidates.filter(function(e) {
                return !e.used && "bad" !== e.state
              });
              if (t.some(function(e) {
                  return "ok" === e.state || "pending" === e.state
                })) return;
              var r = t.filter(function(e) {
                return !e.state
              })[0];
              if (!r) return;
              try {
                await m(r, e, !0)
              } catch (e) {
                return
              }
            }
          }(r)
        }, 5e3), async function(e, r) {
          if (!e || !r || !e.episode || r.creditsChecked) return;
          r.creditsChecked = !0;
          for (var n = !!e.nextEpisode, i = function() {
              return a === e && e.current === r
            }, o = 0; o < 20 && !(t.duration > 0 && isFinite(t.duration)); o++) await new Promise(function(e) {
            setTimeout(e, 500)
          });
          if (!i() || !(t.duration > 0 && isFinite(t.duration))) return;
          var s = t.duration,
            u = function(e) {
              return "number" == typeof e && e > .5 * s && e < s - 10
            },
            l = function(t) {
              i() && n && u(t) && (e.creditsAt = t, r.creditsAt = t)
            },
            d = r.info && r.info.chapters || [];
          r.skips || (r.skips = function(e, t) {
            var r = [];
            return (e || []).forEach(function(n, i) {
              if (n) {
                var a = M(n.title),
                  o = R.indexOf(a) >= 0 ? "intro" : O.indexOf(a) >= 0 || 0 === a.indexOf("previously on ") ? "recap" : "";
                if (o) {
                  var s = Number(n.start),
                    u = e[i + 1],
                    l = Number(n.end) || (u ? Number(u.start) : 0);
                  l > s + 5 && l - s < 300 && s < .5 * t && r.push({
                    type: o,
                    start: s,
                    end: l
                  })
                }
              }
            }), r
          }(d, s));
          var c = r.skips.length > 0;
          if (r.creditsAt && (l(r.creditsAt), c)) return;
          var f = n ? function(e, t) {
            for (var r = 0; r < (e || []).length; r++) {
              var n = e[r];
              if (n && B.indexOf(M(n.title)) >= 0 && t(Number(n.start))) return Number(n.start)
            }
            return null
          }(d, u) : null;
          null != f && l(f);
          var p = !n || !!r.creditsAt;
          if (p && c) return;
          var m = {
              imdbId: e.item.imdb || "",
              season: e.episode.season,
              episode: e.episode.episode,
              duration: s,
              chapters: d
            },
            h = !1;
          try {
            var v = await Api.skipSegments(m);
            (v && v.segments || []).forEach(function(e) {
              !e || "intro" !== e.type && "recap" !== e.type || H(r, e.type, Number(e.start), Number(e.end), s)
            });
            var g = (v && v.segments || []).filter(function(e) {
              return "outro" === e.type
            })[0];
            if (!p && g && u(g.start)) return void l(g.start);
            if (p) return
          } catch (e) {
            h = e && (404 === e.status || 405 === e.status)
          }
          if (h && m.imdbId && i()) try {
            var b = await Api.skipSegmentsLegacy(m);
            ["intro", "recap"].forEach(function(e) {
              var t = b && b[e];
              t && "number" == typeof t.start_ms && "number" == typeof t.end_ms && H(r, e, t.start_ms / 1e3, t.end_ms / 1e3, s)
            });
            var y = b && b.outro && b.outro.start_ms;
            if (!p && "number" == typeof y && u(y / 1e3)) return void l(y / 1e3);
            if (p) return
          } catch (e) {}
        }(r, r.current)
      }
      a.playingSince = a.playingSince || Date.now(), clearTimeout(a.startTimer), clearTimeout(a.stallTimer), e("spinner").className = ""
    }
  }), t.addEventListener("waiting", function() {
    if (a) {
      e("spinner").className = "on";
      var r = a;
      clearTimeout(a.stallTimer), a.playingSince && (a.stallTimer = setTimeout(function() {
        a === r && t.readyState < 3 && !t.paused && k(r, "This release stopped loading.")
      }, 6e4))
    }
  }), t.addEventListener("error", function() {
    if (a && a.current && t.getAttribute("src")) {
      var e = t.error ? t.error.code : 0;
      k(a, 3 === e ? "The TV couldn't decode this release." : 4 === e ? "The TV couldn't open this release." : "This release failed to play.")
    }
  });
  var D = null;
  t.addEventListener("timeupdate", function() {
    if (t.duration) {
      ! function() {
        var r = a && a.current,
          n = t.currentTime,
          i = null;
        if (!r || !r.skips || o || z || E.isOpen() || Z.isOpen() || (i = r.skips.filter(function(e) {
            return n >= e.start && n < e.end - 2 && !0 !== e.dismissed
          })[0] || null), i !== D) {
          D = i;
          var s = e("skip-btn");
          i ? (s.textContent = "recap" === i.type ? "Skip recap" : "Skip intro", s.className = "on") : s.className = ""
        }
      }(), e("osd-bar").style.width = 100 * t.currentTime / t.duration + "%", z || (e("osd-time").textContent = q(t.currentTime) + " / " + q(t.duration));
      var r = a;
      r && r.creditsAt && !r.creditsShown && !o && !z && !t.paused && t.currentTime >= r.creditsAt && t.currentTime < t.duration - 5 && (r.creditsShown = !0, Promise.resolve(r.nextEpisode(r.episode)).catch(function() {
        return null
      }).then(function(e) {
        e && a === r && !o && V(r, e, !0)
      }))
    }
  }), t.addEventListener("ended", function() {
    if (a && !a.ended) {
      var e = a;
      e.ended = !0;
      var t = L(e, !0, !0).catch(function() {}),
        r = e.episode && e.nextEpisode ? Promise.resolve(e.nextEpisode(e.episode)).catch(function() {
          return null
        }) : Promise.resolve(null);
      Promise.all([t, r]).then(function(t) {
        a === e && (t[1] ? V(e, t[1]) : Q())
      })
    }
  });
  var B = ["outro", "credits", "end credits", "ending credits", "closing credits", "closing titles", "end titles", "ed"];

  function M(e) {
    var t = String(e || "").toLowerCase().trim().replace(/^\s*\d+\s*[-.:)]\s*/, "");
    try {
      t = t.replace(new RegExp("[^\\p{L}\\p{N}]+", "gu"), " ")
    } catch (e) {
      t = t.replace(/[^a-z0-9\u00c0-\uffff]+/g, " ")
    }
    return t.trim()
  }
  var R = ["intro", "opening credits", "opening titles", "opening title sequence", "title sequence", "op"],
    O = ["recap", "previously", "previously on"];

  function H(e, t, r, n, i) {
    n > r + 5 && n - r < 300 && r < .5 * i && ((e.skips || []).some(function(e) {
      return e.type === t
    }) || (e.skips = e.skips || []).push({
      type: t,
      start: r,
      end: n
    }))
  }

  function V(t, r, n) {
    F(), e("osd").className = "hide", n || S.reset(), o = {
      token: t,
      episode: r,
      left: 10,
      timer: null,
      during: Boolean(n)
    }, e("upnext-hint").textContent = n ? "OK to play now, Back to keep watching" : "OK to play now, Back to stop", e("upnext-ep").textContent = x(r) + (r.title ? "  " + r.title : ""), e("upnext-count").textContent = "Starting in " + o.left, e("upnext").className = "on", o.timer = setInterval(function() {
      o && (o.left -= 1, o.left <= 0 ? U() : e("upnext-count").textContent = "Starting in " + o.left)
    }, 1e3)
  }

  function F() {
    o && clearInterval(o.timer), o = null, e("upnext").className = ""
  }

  function U() {
    var e = o;
    if (F(), e && a === e.token) {
      var t = e.token;
      e.during && L(t, !0, !0).catch(function() {}), T({
        item: t.item,
        episode: e.episode,
        profileId: t.profileId,
        clientId: t.clientId,
        onExit: t.onExit,
        nextEpisode: t.nextEpisode,
        resume: !1,
        startAt: 0,
        cast: t.cast,
        onPerson: t.onPerson
      })
    }
  }

  function q(e) {
    if (!isFinite(e)) return "–";
    e = Math.floor(e);
    var t = Math.floor(e / 3600),
      r = Math.floor(e % 3600 / 60),
      n = e % 60;
    return (t ? t + ":" + A(r) : r) + ":" + A(n)
  }

  function K() {
    e("osd").className = "", clearTimeout(s), s = setTimeout(function() {
      t.paused || (e("osd").className = "hide")
    }, 4e3)
  }

  function j(t) {
    var r = e("osd-note");
    r.textContent = t, r.className = "on", clearTimeout(r._t), r._t = setTimeout(function() {
      r.className = ""
    }, 8e3), K()
  }
  t.addEventListener("pause", function() {
    a && (K(), L(a, !1))
  });
  var z = null,
    G = {};

  function W(e, r, n, i) {
    if (t.duration) {
      var a, o = Date.now(),
        s = e > 0 ? 1 : -1,
        u = i && null != n && !G[n];
      if (null == n || i || (G[n] = !0), z) {
        if (i && !u && o - z.last < 110) return
      } else z = {
        from: t.currentTime,
        target: t.currentTime,
        start: o,
        last: 0,
        taps: 0,
        dir: s,
        timer: null
      };
      (s !== z.dir || o - z.last > 550) && (z.start = o, z.taps = 0), z.dir = s, z.last = o, u ? a = 120 : (i || z.taps++, a = function(e, t, r) {
        var n = t <= 3 ? e : t <= 6 ? 30 : t <= 9 ? 60 : 120,
          i = r < 1200 ? e : r < 3e3 ? 30 : r < 6e3 ? 60 : 120;
        return Math.max(e, n, i)
      }(r || Math.abs(e), z.taps, i ? o - z.start : 0)), z.target = Math.max(0, Math.min(t.duration - 2, z.target + s * a)), _(), clearTimeout(z.timer), z.timer = setTimeout($, 650)
    }
  }

  function _() {
    var r = e("osd-scrub"),
      n = e("osd-time");
    if (!z || !t.duration) return r.className = "", void(n.className = "");
    r.style.left = 100 * z.target / t.duration + "%", r.className = "on";
    var i = z.target - z.from;
    n.textContent = q(z.target) + " / " + q(t.duration) + "   (" + (i >= 0 ? "+" : "−") + q(Math.abs(i)) + ")", n.className = "scrub", K()
  }

  function $() {
    if (z) {
      var e = z.target;
      Y(), Math.abs(e - t.currentTime) > .5 && (t.currentTime = e), K()
    }
  }

  function Y() {
    z && clearTimeout(z.timer), z = null, _(), t.duration && (e("osd-time").textContent = q(t.currentTime) + " / " + q(t.duration))
  }

  function J(r) {
    var n = a;
    return Y(), F(), a && (clearTimeout(a.startTimer), clearTimeout(a.stallTimer), clearInterval(a.progressTimer)), n && n.current && !n.ended && !r && L(n, !0), a = null, t.pause(), t.removeAttribute("src"), t.load(), E.close(), Z.close(), D = null, e("skip-btn").className = "", S.reset(), e("player").className = "", e("prep").className = "", e("spinner").className = "", n
  }

  function Q() {
    var e = J(!1);
    e && e.onExit && e.onExit(null, {
      episode: e.episode
    })
  }

  function X(e) {
    var t = J(!1);
    t && t.onExit && t.onExit(e, {
      episode: t.episode
    })
  }
  document.addEventListener("keyup", function(e) {
    delete G[e.keyCode]
  }, !0);
  var Z = function() {
      var n = !1,
        i = 0,
        o = [],
        s = 0;

      function u() {
        var t = e("cast-strip-track");
        t.innerHTML = o.map(function(e, t) {
          return '<div class="card person' + (t === i ? " sel" : "") + '">' + (e.photo ? '<img src="' + ee(e.photo.replace(/\/t\/p\/(w\d+|original)\//, "/t/p/w185/")) + '" alt="" onerror="this.remove()">' : "") + '<span class="card-fallback">' + ee(e.name) + '</span><span class="card-label">' + ee(e.name) + (e.character ? "<em>" + ee(e.character) + "</em>" : "") + "</span></div>"
        }).join("");
        var r = t.children[i];
        if (r) {
          var n = t.getBoundingClientRect(),
            a = r.getBoundingClientRect();
          a.left < n.left + 60 ? t.scrollLeft -= n.left + 60 - a.left : a.right > n.right - 60 && (t.scrollLeft += a.right - (n.right - 60))
        }
      }

      function l() {
        n = !1, s++, e("cast-strip").className = "", K()
      }
      return {
        show: async function() {
          var r = a;
          if (r && r.cast) {
            t.pause(), n = !0, i = 0, o = [];
            var l = ++s;
            e("cast-strip").className = "on", e("cast-strip-title").textContent = "Cast", e("cast-strip-track").innerHTML = '<span class="muted" style="margin-left:var(--pad)">Loading the cast</span>', K();
            var d = [];
            try {
              d = await r.cast() || []
            } catch (e) {
              d = []
            }
            l === s && n && ((o = d).length ? u() : e("cast-strip-track").innerHTML = '<span class="muted" style="margin-left:var(--pad)">No cast listed for this one.</span>')
          }
        },
        key: function(e) {
          e === r.LEFT ? i > 0 && (i--, u()) : e === r.RIGHT ? i < o.length - 1 && (i++, u()) : e === r.ENTER ? function() {
            var e = o[i];
            if (e && a && a.onPerson) {
              l();
              var t = J(!1);
              t && t.onPerson(e, {
                episode: t.episode
              })
            }
          }() : e === r.UP || e === r.DOWN || e === r.BACK || e === r.ESC || e === r.BACKSPACE ? l() : e !== r.PLAY && e !== r.PLAYPAUSE || (l(), t.play())
        },
        close: function() {
          n && l()
        },
        isOpen: function() {
          return n
        }
      }
    }(),
    ee = Util.esc;
  return Nav.onKey(function(n) {
    var i = n.keyCode,
      s = "on" === e("prep").className,
      u = "on" === e("player").className;
    if (s && (i === r.BACK || i === r.ESC || i === r.BACKSPACE)) return Q(), !0;
    if (s) return !0;
    if (!u) return !1;
    if (o && o.during) {
      if (i === r.ENTER || i === r.PLAY) return U(), !0;
      if (F(), i === r.BACK || i === r.ESC || i === r.BACKSPACE) return K(), !0
    } else if (o) return i === r.ENTER || i === r.PLAY || i === r.PLAYPAUSE ? U() : i !== r.BACK && i !== r.ESC && i !== r.BACKSPACE && i !== r.STOP || Q(), !0;
    if (E.isOpen()) return E.key(i), !0;
    if (Z.isOpen()) return Z.key(i), !0;
    if (z)
      if (i === r.LEFT || i === r.RIGHT || i === r.RW || i === r.FF);
      else {
        if (i === r.ENTER) return $(), !0;
        i === r.BACK || i === r.ESC || i === r.BACKSPACE || i === r.STOP ? Y() : $()
      } return i === r.BACK || i === r.ESC || i === r.BACKSPACE || i === r.STOP ? Q() : i === r.ENTER && D && !t.paused ? function() {
      if (!D) return !1;
      var r = D;
      t.currentTime = Math.min(r.end, t.duration ? t.duration - 1 : r.end), D = null, e("skip-btn").className = ""
    }() : i === r.ENTER || i === r.PLAYPAUSE ? (t.paused ? t.play() : t.pause(), K()) : i === r.PLAY ? (t.play(), K()) : i === r.PAUSE ? (t.pause(), K()) : i === r.LEFT ? W(-10, 10, i, n.repeat) : i === r.RIGHT ? W(10, 10, i, n.repeat) : i === r.RW ? W(-30, 30, i, n.repeat) : i === r.FF ? W(30, 30, i, n.repeat) : i === r.DOWN ? E.open() : i === r.UP && a && a.cast ? Z.show() : K(), !0
  }), document.addEventListener("visibilitychange", function() {
    document.hidden && o && o.during && F(), document.hidden && o ? Q() : document.hidden && a && a.current && (t.pause(), L(a, !0))
  }), {
    start: T,
    stop: Q,
    get active() {
      return Boolean(a)
    }
  }
}();