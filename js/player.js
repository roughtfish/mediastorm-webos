// Playback: prepares a title through mediastorm's prequeue, checks the chosen
// release before the TV sees it, falls back to backup releases when one fails,
// and plays the untouched file through the TV's own pipeline (which is what
// makes Dolby Vision and Atmos work). Progress goes back to mediastorm.
var Player = (function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var video = $('video');
  var KEY = Nav.KEY;

  var IMAGE_CODECS = ['mjpeg', 'png', 'bmp', 'gif', 'webp', 'tiff'];
  var MAX_ATTEMPTS = 6;            // releases tried before giving up
  var START_TIMEOUT_MS = 45000;    // nothing playing after this long counts as a failure
  var STALL_TIMEOUT_MS = 60000;    // buffering mid-film for this long counts too
  var PROGRESS_INTERVAL_MS = 10000;

  var s = null;            // the current session
  var osdTimer = null;

  // ---------- preparing ----------
  function prepLine(text) { $('prep-status').textContent = text; }

  function prequeueBody(item, episode, profileId, clientId) {
    var body = {
      titleId: item.titleId, titleName: item.name, mediaType: item.kind === 'movie' ? 'movie' : 'series',
      userId: profileId, clientId: clientId, year: item.year || undefined,
      imdbId: item.imdb || undefined, tmdbId: item.tmdb || undefined, tvdbId: item.tvdb || undefined,
      skipHLS: true
    };
    if (episode) { body.seasonNumber = episode.season; body.episodeNumber = episode.episode; }
    return body;
  }

  function describeStage(st) {
    var total = st.progressTotal, cur = st.progressCurrentMax || st.progressCurrent;
    switch (st.status) {
      case 'queued': return 'Getting ready';
      case 'searching': return 'Searching for releases';
      case 'resolving': return total ? 'Preparing release ' + Math.max(1, cur) + ' of ' + total : 'Preparing a release';
      case 'probing': return 'Checking the file';
      default: return st.progressDetail || 'Working';
    }
  }

  async function waitForPrequeue(id, token) {
    var started = Date.now();
    while (true) {
      if (s !== token) throw new Error('cancelled');
      var st = await Api.prequeueStatus(id);
      if (s !== token) throw new Error('cancelled');
      if (st.status === 'ready') return st;
      if (st.status === 'failed' || st.status === 'expired') {
        throw new Error(st.error ? 'mediastorm couldn\'t find a playable release: ' + st.error : 'mediastorm couldn\'t find a playable release.');
      }
      prepLine(describeStage(st));
      if (Date.now() - started > 180000) throw new Error('Preparing took longer than three minutes, so playback was stopped.');
      await new Promise(function (r) { setTimeout(r, 1000); });
    }
  }

  // ---------- checking a release ----------
  function dvProfileNumber(p) {
    if (!p) return 0;
    var parts = String(p).split('.');
    var n = /^dv(he|av)/i.test(parts[0]) ? parts[1] : parts[0];
    return parseInt(n, 10) || 0;
  }

  // Returns { ok, reason, markBad, info } for one candidate path.
  async function vet(path) {
    var m;
    try { m = await Api.probe(path); }
    catch (e) { return { ok: true, info: null }; }   // can't check: let the TV try it
    var v = (m && m.videoStreams && m.videoStreams[0]) || {};
    var codec = String(v.codecName || '').toLowerCase();
    var format = String(m && m.formatName || '').toLowerCase();
    if (!codec || IMAGE_CODECS.indexOf(codec) !== -1 || /_pipe$|^image2/.test(format)) {
      return { ok: false, markBad: true, reason: 'This release contains a picture, not a video.' };
    }
    var info = { codec: codec, width: v.width, height: v.height, dv: v.hasDolbyVision, dvProfile: v.dolbyVisionProfile,
                 hdr: v.hdrFormat || '', audio: (m.audioStreams || []).slice().sort(function (a, b) { return a.index - b.index; }) };
    if (info.dv && dvProfileNumber(info.dvProfile) === 7) {
      return { ok: false, markBad: false, profile7: true, info: info,
               reason: 'This release is Dolby Vision profile 7, which LG TVs can\'t show as Dolby Vision.' };
    }
    return { ok: true, info: info };
  }

  function hdrLabel(info) {
    if (!info) return '';
    if (info.dv) return 'Dolby Vision' + (info.dvProfile ? ' (profile ' + dvProfileNumber(info.dvProfile) + ')' : '');
    if (/hdr10\+|hdr10plus/i.test(info.hdr)) return 'HDR10+';
    if (/hdr|pq|hlg/i.test(info.hdr)) return info.hdr.toUpperCase().indexOf('HLG') !== -1 ? 'HLG' : 'HDR10';
    return '';
  }

  // Walks the candidates until one passes the checks. Profile 7 releases are
  // skipped while better ones remain, but used as a last resort (the TV can
  // still show the HDR10 base layer).
  async function pickCandidate(token) {
    var fallbackP7 = null;
    while (s.cursor < s.candidates.length && s.attempts < MAX_ATTEMPTS) {
      var c = s.candidates[s.cursor++];
      s.attempts++;
      if (s !== token) throw new Error('cancelled');
      prepLine(s.attempts === 1 ? 'Checking the file' : 'Trying another release (' + s.attempts + ' of up to ' + Math.min(MAX_ATTEMPTS, s.candidates.length) + ')');

      if (!c.path) {
        try {
          var r = await resolveRelease(c, token);
          c.path = r && r.webdavPath;
          c.fileSize = r && r.fileSize;
          c.healthStatus = r && r.healthStatus;
        } catch (e) {
          if (e.message === 'cancelled') throw e;
          s.notes.push(failureReason(c, e));   // marked bad, refused, or unavailable: move on
          continue;
        }
        if (!c.path) { s.notes.push('mediastorm couldn\'t prepare ' + (c.name || 'that release') + '.'); continue; }
      }

      var check = await vet(c.path);
      if (s !== token) throw new Error('cancelled');
      if (check.ok) { c.info = check.info; return c; }
      s.notes.push(check.reason);
      if (check.markBad) {
        Api.markBad({ releaseName: c.name, serviceType: c.serviceType, sourcePath: c.path, reason: 'webos:not-a-video' })
          .catch(function () {});
      }
      if (check.profile7 && !fallbackP7) { c.info = check.info; fallbackP7 = c; }
    }
    if (fallbackP7) { fallbackP7.p7 = true; return fallbackP7; }
    throw new Error(s.notes.length ? s.notes[s.notes.length - 1] + ' No other release worked either.' : 'None of the available releases could be played.');
  }

  // Some Usenet setups prepare a release in the background: resolving returns a
  // queue ticket first, and the path once it's ready.
  async function resolveRelease(c, token) {
    var r = await Api.resolve(c.result, s.profileId);
    if (r && r.webdavPath) return r;
    if (!r || !(r.queueId > 0)) return r;
    var started = Date.now();
    while (Date.now() - started < 120000) {
      if (s !== token) throw new Error('cancelled');
      prepLine((r.healthStatus === 'queued' ? 'Queued: ' : 'Preparing: ') + shortName(c.name));
      await new Promise(function (ok) { setTimeout(ok, 1500); });
      r = await Api.queueStatus(r.queueId);
      if (r && r.webdavPath) return r;
      if (r && /fail|error|unhealthy/i.test(r.healthStatus || '')) throw new Error('mediastorm reported the release as ' + r.healthStatus);
    }
    throw new Error('Timed out waiting for mediastorm to prepare it');
  }
  function shortName(n) { n = String(n || 'release'); return n.length > 70 ? n.slice(0, 67) + '…' : n; }
  function failureReason(c, e) {
    var m = String(e && e.message || '');
    var who = c.name ? shortName(c.name) : 'That release';
    if (/infringing|\b451\b/i.test(m)) return 'Real-Debrid refused ' + who + ' (blocked by its filter).';
    if (e && e.status === 409) return who + ' is marked as bad in mediastorm.';
    return 'Couldn\'t prepare ' + who + '.';
  }

  async function urlFor(c) {
    if (/^\/debrid\//.test(c.path)) {
      try {
        var d = await Api.directUrl(c.path);
        // Library files answer with a disk path, which the TV can't open.
        if (d && d.url && /^https?:\/\//i.test(d.url)) return d.url;
      } catch (e) { /* fall through to the server route */ }
    }
    return Api.streamUrl(c.path, s.profileId);
  }

  // Where the stream comes from, read from the path mediastorm handed back:
  // /debrid/<service>/..., /webdav/... (Usenet) or localmedia:... (library).
  var SERVICES = { torbox: 'TorBox', realdebrid: 'Real-Debrid', alldebrid: 'AllDebrid', premiumize: 'Premiumize', debridlink: 'Debrid-Link' };
  function sourceLabel(path, url) {
    var direct = url.indexOf(Api.server) !== 0;
    var m = /^\/debrid\/([^\/]+)/.exec(path || '');
    var what = m ? (SERVICES[m[1].toLowerCase().replace(/[^a-z]/g, '')] || m[1]) :
      /^localmedia:/.test(path || '') ? 'Library' : 'Usenet';
    return what + (direct ? ', streaming direct' : ', via your server');
  }

  function candidateFromResult(result) {
    return { result: result, name: result.title, serviceType: result.serviceType, path: '' };
  }

  // ---------- starting and switching ----------
  async function start(opts) {
    stop(true);
    var token = {
      item: opts.item, episode: opts.episode || null, profileId: opts.profileId, clientId: opts.clientId,
      onExit: opts.onExit, startAt: opts.startAt || 0, resume: opts.resume !== false,
      candidates: [], cursor: 0, attempts: 0, notes: [], current: null,
      lastSentAt: 0, playingSince: 0, startTimer: null, stallTimer: null, progressTimer: null, ended: false
    };
    s = token;
    $('prep').className = 'on';
    $('prep-title').textContent = opts.item.name + (token.episode ? '  ' + episodeCode(token.episode) : '');
    prepLine('Getting ready');

    try {
      if (opts.manual) { await startManual(token, opts.manual); return; }
      var pq = await Api.prequeue(prequeueBody(opts.item, token.episode, opts.profileId, opts.clientId));
      if (s !== token) return;
      token.prequeueId = pq.prequeueId;
      if (pq.targetEpisode && opts.item.kind !== 'movie') {
        token.episode = { season: pq.targetEpisode.seasonNumber, episode: pq.targetEpisode.episodeNumber,
                          title: pq.targetEpisode.title || (token.episode && token.episode.title) || '' };
        $('prep-title').textContent = opts.item.name + '  ' + episodeCode(token.episode);
      }
      var st = await waitForPrequeue(pq.prequeueId, token);
      if (s !== token) return;

      token.wantTrackIndex = typeof st.selectedAudioTrack === 'number' ? st.selectedAudioTrack : -1;
      token.wantSubIndex = typeof st.selectedSubtitleTrack === 'number' ? st.selectedSubtitleTrack : -1;
      token.subPref = { on: false };
      (st.subtitleTracks || []).forEach(function (t) {
        if (t.index === token.wantSubIndex) token.subPref = { on: true, lang: t.language || '', forced: Boolean(t.forced) };
      });
      (st.audioTracks || []).forEach(function (t) { if (t.index === token.wantTrackIndex) token.prefLang = t.language || ''; });
      token.candidates.push({ path: st.streamPath, name: st.displayName || (st.selectedResult && st.selectedResult.title) || '',
                              serviceType: st.serviceType, result: st.selectedResult, primary: true,
                              fileSize: st.fileSize, healthStatus: st.healthStatus });
      (st.migrationCandidates || []).forEach(function (r) { token.candidates.push(candidateFromResult(r)); });

      if (token.resume && !token.startAt) {
        var p = await Api.getProgress(token.profileId, mediaTypeFor(token), progressItemId(token)).catch(function () { return null; });
        if (p && p.position > 30 && p.percentWatched < 95) token.startAt = p.position;
      }
      await playNext(token);
    } catch (e) {
      if (e.message === 'cancelled' || s !== token) return;
      fail(e.message);
    }
  }

  // A release picked by hand skips mediastorm's prequeue, so the profile's
  // audio and subtitle preferences are read here instead.
  async function startManual(token, manual) {
    token.wantTrackIndex = -1;
    token.wantSubIndex = -1;
    var settings = await Api.userSettings(token.profileId).catch(function () { return null; });
    if (s !== token) return;
    var pb = (settings && settings.playback) || {};
    token.prefLang = pb.preferredAudioLanguage || 'eng';
    var mode = String(pb.preferredSubtitleMode || '').toLowerCase();
    mode = mode === 'always' ? 'on' : mode === 'auto' ? 'forced-only' : mode || 'off';
    token.subPref = mode === 'off' ? { on: false }
      : { on: true, lang: pb.preferredSubtitleLanguage || token.prefLang, forced: mode === 'forced-only', forcedOnly: mode === 'forced-only' };
    manual.releases.forEach(function (r) { token.candidates.push(candidateFromResult(r)); });
    if (token.resume && !token.startAt) {
      var p = await Api.getProgress(token.profileId, mediaTypeFor(token), progressItemId(token)).catch(function () { return null; });
      if (p && p.position > 30 && p.percentWatched < 95) token.startAt = p.position;
    }
    await playNext(token);
  }

  async function playNext(token, reason) {
    if (token.switching) return;
    token.switching = true;
    try { await switchTo(token, reason); }
    finally { token.switching = false; }
  }

  async function switchTo(token, reason) {
    if (reason) {
      osdNote(reason + ' Trying another release.');
      token.playingSince = 0;
      clearTimeout(token.startTimer); clearTimeout(token.stallTimer);
    }
    var c;
    try { c = await pickCandidate(token); }
    catch (e) { if (e.message !== 'cancelled' && s === token) fail(e.message); return; }
    if (s !== token) return;

    var previous = token.current;
    token.current = c;
    if (!c.primary && token.prequeueId) {
      var rest = token.candidates.slice(token.cursor).map(function (x) { return x.result; }).filter(Boolean);
      Api.adoptMigration(token.prequeueId, {
        streamPath: c.path, result: c.result, fileSize: c.fileSize || 0, healthStatus: c.healthStatus || '',
        migrationCandidates: rest
      }).catch(function () {});
    }
    var url = await urlFor(c);
    if (s !== token) return;

    $('prep').className = '';
    $('player').className = 'on';
    $('osd-title').textContent = token.item.name;
    $('osd-sub').textContent = [token.episode ? episodeCode(token.episode) + (token.episode.title ? '  ' + token.episode.title : '') : '',
                                hdrLabel(c.info)].filter(Boolean).join('    ');
    $('osd-release').textContent = c.name || '';
    $('osd-source').textContent = sourceLabel(c.path, url);
    if (c.p7) osdNote('Dolby Vision profile 7: expect HDR10 rather than Dolby Vision.');
    else if (!previous && token.notes.length) {
      osdNote(token.notes.length === 1 ? token.notes[0] + ' Playing another release instead.'
        : 'Skipped ' + token.notes.length + ' releases that couldn\'t play here.');
    }

    var resumeAt = previous ? (video.currentTime || token.startAt) : token.startAt;
    video.src = url;
    video.load();
    video.addEventListener('loadedmetadata', function seekOnce() {
      video.removeEventListener('loadedmetadata', seekOnce);
      Audio.autoSelect(token, c);
      Subs.load(token, c, resumeAt > 0 && video.duration && resumeAt < video.duration - 10 ? resumeAt : 0);
      if (resumeAt > 0 && video.duration && resumeAt < video.duration - 10) video.currentTime = resumeAt;
    });
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* the error event handles real failures */ });
    showOsd();

    clearTimeout(token.startTimer);
    token.startTimer = setTimeout(function () {
      if (s === token && !token.playingSince) playNext(token, 'This release didn\'t start.');
    }, START_TIMEOUT_MS);
    clearInterval(token.progressTimer);
    token.progressTimer = setInterval(function () { sendProgress(token, false); }, PROGRESS_INTERVAL_MS);
  }



  // ---------- subtitles ----------
  // mediastorm extracts a text subtitle track from the file as WebVTT, a bit
  // ahead of playback. The app fetches it as it grows and draws the cues itself
  // over the video, so they're large, readable and work over Dolby Vision.
  // Picture-based tracks (PGS) can't be converted, so they're listed but not offered.
  var Subs = (function () {
    var TEXT_CODECS = ['subrip', 'srt', 'ass', 'ssa', 'webvtt', 'vtt', 'mov_text', 'text'];
    var tracks = [], selected = -1, cues = [], path = '', subUrl = '';
    var pollTimer = null, drawTimer = null, lastLen = -1, stable = 0, gen = 0, shown = '';

    function isText(t) { return TEXT_CODECS.indexOf(String(t.codec || '').toLowerCase()) !== -1; }

    function reset() {
      gen++;
      clearTimeout(pollTimer); clearInterval(drawTimer);
      tracks = []; selected = -1; cues = []; path = ''; subUrl = ''; lastLen = -1; stable = 0;
      draw('');
    }

    async function load(token, c, startAt) {
      var keepPref = token.subPref;
      reset();
      var myGen = gen;
      path = c.path;
      var list = [];
      try { var r = await Api.subtitleTracks(c.path); list = (r && r.tracks) || []; } catch (e) { list = []; }
      if (myGen !== gen || s !== token) return;
      tracks = list.map(function (t) {
        return { index: t.index, language: t.language || '', title: t.title || '', codec: t.codec || '',
                 forced: Boolean(t.forced), text: isText(t) };
      });
      var pick = -1;
      if (c.primary && token.wantSubIndex >= 0) {
        tracks.forEach(function (t) { if (t.index === token.wantSubIndex && t.text) pick = t.index; });
      }
      if (pick < 0 && keepPref && keepPref.on) {
        tracks.forEach(function (t) {
          if (pick < 0 && t.text && Audio.sameLang(t.language, keepPref.lang) && t.forced === keepPref.forced) pick = t.index;
        });
        if (pick < 0 && !keepPref.forcedOnly) tracks.forEach(function (t) { if (pick < 0 && t.text && Audio.sameLang(t.language, keepPref.lang)) pick = t.index; });
      }
      if (pick >= 0) choose(pick, startAt);
    }

    async function choose(index, at) {
      gen++;
      var myGen = gen;
      clearTimeout(pollTimer); clearInterval(drawTimer);
      cues = []; lastLen = -1; stable = 0; draw('');
      selected = index;
      if (index < 0) return;
      try {
        var r = await Api.startSubtitles(path, index, at != null ? at : video.currentTime);
        if (myGen !== gen) return;
        subUrl = r && r.subtitleUrl;
      } catch (e) {
        if (myGen === gen) { selected = -1; osdNote('These subtitles couldn\'t be loaded.'); }
        return;
      }
      poll(myGen, 0);
      drawTimer = setInterval(tick, 200);
    }

    // The file grows as mediastorm reads further into the video, so it's
    // fetched again until it stops changing.
    async function poll(myGen, n) {
      if (myGen !== gen || !subUrl) return;
      try {
        var text = await Api.fetchText(subUrl);
        if (myGen !== gen) return;
        if (text.length === lastLen) stable++; else { stable = 0; lastLen = text.length; cues = parse(text); }
      } catch (e) { /* try again on the next round */ }
      if (stable >= 3) return;
      pollTimer = setTimeout(function () { poll(myGen, n + 1); }, n < 2 ? 2500 : 10000);
    }

    function toSec(t) {
      var p = t.trim().split(':'), sec = 0;
      for (var i = 0; i < p.length; i++) sec = sec * 60 + parseFloat(p[i].replace(',', '.'));
      return sec;
    }
    function parse(text) {
      var out = [];
      text.replace(/\r/g, '').split(/\n\n+/).forEach(function (block) {
        var lines = block.split('\n');
        for (var i = 0; i < lines.length; i++) {
          var m = /^\s*([\d:.,]+)\s*-->\s*([\d:.,]+)/.exec(lines[i]);
          if (m) {
            var body = lines.slice(i + 1).join('\n').trim();
            if (body) out.push({ start: toSec(m[1]), end: toSec(m[2]), html: clean(body) });
            break;
          }
        }
      });
      out.sort(function (a, b) { return a.start - b.start; });
      return out;
    }
    // Keep italics and bold; drop every other tag and escape the rest.
    function clean(body) {
      var safe = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return safe.replace(/&lt;(\/?)(i|b)&gt;/gi, '<$1$2>').replace(/&lt;[^&]*?&gt;/g, '').replace(/\n/g, '<br>');
    }

    function tick() {
      if (selected < 0 || !cues.length) { draw(''); return; }
      var t = video.currentTime, lo = 0, hi = cues.length - 1, last = -1;
      while (lo <= hi) { var mid = (lo + hi) >> 1; if (cues[mid].start <= t) { last = mid; lo = mid + 1; } else hi = mid - 1; }
      var active = [];
      for (var i = last; i >= 0 && i > last - 8; i--) if (cues[i].end > t) active.unshift(cues[i].html);
      draw(active.join('<br>'));
    }
    function draw(html) {
      if (html === shown) return;
      shown = html;
      $('subs').innerHTML = html ? '<span>' + html + '</span>' : '';
    }

    // After a big jump past what's been extracted, start again from there.
    video.addEventListener('seeked', function () {
      if (selected < 0 || !path) return;
      var t = video.currentTime;
      var first = cues.length ? cues[0].start : null, lastEnd = cues.length ? cues[cues.length - 1].end : null;
      if (first == null || t < first - 10 || (stable >= 3 ? false : t > lastEnd + 60)) choose(selected, t);
    });

    function label(t) {
      var bits = [Audio.langName(t.language)];
      if (t.forced) bits.push('forced');
      if (t.title && !/^(forced|full|sdh)$/i.test(t.title.trim())) bits.push(t.title);
      else if (/sdh/i.test(t.title)) bits.push('SDH');
      return bits.join(', ');
    }

    return {
      load: load, reset: reset, choose: choose,
      selected: function () { return selected; },
      list: function () { return tracks; },
      label: label,
      isOn: function () { return selected >= 0; }
    };
  })();

  // ---------- audio tracks ----------
  // The TV plays the file's default track unless told otherwise, which for
  // MULTI releases is often not the one you want. mediastorm picks a track from
  // the profile's preferred audio language; the app applies it, keeps that
  // language across backup releases, and offers a menu on the Down key.
  var Audio = (function () {
    var BIB = { fre: 'fra', ger: 'deu', chi: 'zho', dut: 'nld', cze: 'ces', gre: 'ell', per: 'fas', rum: 'ron',
                slo: 'slk', ice: 'isl', mac: 'mkd', alb: 'sqi', arm: 'hye', baq: 'eus', bur: 'mya', geo: 'kat',
                may: 'msa', tib: 'bod', wel: 'cym' };
    var CODECS = { eac3: 'Dolby Digital Plus', ac3: 'Dolby Digital', truehd: 'Dolby TrueHD', dts: 'DTS', aac: 'AAC',
                   flac: 'FLAC', opus: 'Opus', mp3: 'MP3', vorbis: 'Vorbis', pcm_s16le: 'PCM', pcm_s24le: 'PCM' };
    var names = null;
    try { names = new Intl.DisplayNames(['en'], { type: 'language' }); } catch (e) { /* older engine */ }
    var open = false, focusIdx = 0, rows = [];

    function lang2(code) { return String(code || '').toLowerCase().slice(0, 2); }
    function sameLang(a, b) {
      if (!a || !b) return false;
      a = String(a).toLowerCase(); b = String(b).toLowerCase();
      a = BIB[a] || a; b = BIB[b] || b;
      return a === b || lang2(a) === lang2(b);
    }
    function langName(code) {
      if (!code || /^und/i.test(code)) return 'Unknown language';
      var c = String(code).toLowerCase(); c = BIB[c] || c;
      try { var n = names && names.of(c); if (n && n.toLowerCase() !== c) return n; } catch (e) { /* unknown code */ }
      return String(code).toUpperCase();
    }
    function formatName(a) {
      var codec = String(a.codecName || '').toLowerCase();
      var label = CODECS[codec] || codec.toUpperCase();
      if (codec === 'dts' && a.profile) label = /ma/i.test(a.profile) ? 'DTS-HD MA' : /hra|hi/i.test(a.profile) ? 'DTS-HD' : /x/i.test(a.profile) ? 'DTS:X' : 'DTS';
      var ch = a.channels === 1 ? 'mono' : a.channels === 2 ? 'stereo' : a.channels === 6 ? '5.1' : a.channels === 8 ? '7.1' : a.channels ? a.channels + ' channels' : '';
      var atmos = /atmos/i.test(a.profile || '') || /atmos/i.test(a.title || '');
      return [label, ch, atmos ? 'Atmos' : ''].filter(Boolean).join(' ');
    }

    function tvTracks() { return video.audioTracks; }
    function enabledIndex() {
      var t = tvTracks(); if (!t) return -1;
      for (var i = 0; i < t.length; i++) if (t[i].enabled) return i;
      return -1;
    }

    // Rows pair the TV's track list with the file check's details, by position.
    function buildRows() {
      var t = tvTracks(), info = (s && s.current && s.current.info && s.current.info.audio) || [];
      rows = [];
      var n = t ? t.length : 0;
      for (var i = 0; i < n; i++) {
        var a = info[i] || {};
        var language = a.language || t[i].language || '';
        rows.push({ i: i, language: language,
                    title: langName(language), detail: a.codecName ? formatName(a) : (t[i].label || ''),
                    extra: a.title && !/atmos/i.test(a.title) ? a.title : '' });
      }
      return rows;
    }

    function apply(i, nudge) {
      var t = tvTracks(); if (!t || !t[i]) return false;
      for (var j = 0; j < t.length; j++) t[j].enabled = (j === i);
      // Some TV pipelines only switch on the next seek; a tiny step back is enough.
      if (nudge && video.currentTime > 1) video.currentTime = video.currentTime - 0.25;
      showCurrent();
      return true;
    }

    function autoSelect(token, c) {
      var t = tvTracks();
      if (!t || t.length < 2) { showCurrent(); return; }
      buildRows();
      var pick = -1;
      // On mediastorm's own pick, use the track it chose, by its position in the file.
      if (c.primary && token.wantTrackIndex >= 0 && c.info && c.info.audio) {
        c.info.audio.forEach(function (a, pos) { if (a.index === token.wantTrackIndex) pick = pos; });
      }
      var want = token.prefLang || 'eng';
      if (pick < 0 || (rows[pick] && rows[pick].language && !sameLang(rows[pick].language, want) && token.prefLang)) {
        pick = -1;
        rows.forEach(function (r) { if (pick < 0 && sameLang(r.language, want)) pick = r.i; });
      }
      if (pick >= 0 && pick !== enabledIndex()) apply(pick, false);
      else showCurrent();
    }

    function showCurrent() {
      var cur = enabledIndex();
      var r = cur >= 0 ? buildRows()[cur] : null;
      $('osd-audio').textContent = r ? 'Audio: ' + r.title + (r.detail ? ', ' + r.detail : '') : '';
    }

    // The menu lists audio tracks, then subtitles: Off, the text tracks, and a
    // note about any picture-based tracks that can't be shown.
    var menu = [];
    function buildMenu() {
      buildRows();
      menu = [{ kind: 'head', title: 'Audio' }];
      if (rows.length) rows.forEach(function (r) { menu.push({ kind: 'audio', i: r.i, title: r.title, detail: [r.detail, r.extra].filter(Boolean).join(', ') }); });
      else menu.push({ kind: 'note', title: tvTracks() ? 'The TV didn\'t report any audio tracks.' : 'This TV isn\'t letting the app switch audio tracks.' });
      menu.push({ kind: 'head', title: 'Subtitles' });
      menu.push({ kind: 'sub', i: -1, title: 'Off', detail: '' });
      var bitmaps = 0;
      Subs.list().forEach(function (t) {
        if (t.text) menu.push({ kind: 'sub', i: t.index, title: Subs.label(t), detail: '' });
        else bitmaps++;
      });
      if (bitmaps) menu.push({ kind: 'note', title: bitmaps + (bitmaps === 1 ? ' picture-based track' : ' picture-based tracks') + ' can\'t be shown here.' });
    }
    function selectable(k) { return menu[k] && (menu[k].kind === 'audio' || menu[k].kind === 'sub'); }
    function render() {
      var curA = enabledIndex(), curS = Subs.selected();
      $('audio-list').innerHTML = menu.map(function (r, k) {
        if (r.kind === 'head') return '<h3>' + escapeHtml(r.title) + '</h3>';
        if (r.kind === 'note') return '<p class="menu-note">' + escapeHtml(r.title) + '</p>';
        var current = r.kind === 'audio' ? r.i === curA : r.i === curS;
        return '<div class="audio-row' + (k === focusIdx ? ' focus' : '') + (current ? ' current' : '') + '" data-k="' + k + '">' +
          '<b></b><span>' + escapeHtml(r.title) + '</span>' + (r.detail ? '<small>' + escapeHtml(r.detail) + '</small>' : '') + '</div>';
      }).join('');
      var f = $('audio-list').querySelector('.focus');
      if (f) f.scrollIntoView({ block: 'nearest' });
    }
    function escapeHtml(v) { return String(v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function openMenu() {
      buildMenu();
      var curA = enabledIndex();
      focusIdx = -1;
      menu.forEach(function (r, k) { if (focusIdx < 0 && r.kind === 'audio' && r.i === curA) focusIdx = k; });
      if (focusIdx < 0) menu.forEach(function (r, k) { if (focusIdx < 0 && selectable(k)) focusIdx = k; });
      open = true;
      render();
      $('audio-menu').className = 'on';
      $('osd').className = '';
      clearTimeout(osdTimer);
    }
    function closeMenu() { open = false; $('audio-menu').className = ''; showOsd(); }

    function step(dir) {
      for (var k = focusIdx + dir; k >= 0 && k < menu.length; k += dir) if (selectable(k)) { focusIdx = k; return; }
    }
    function key(k) {
      if (k === KEY.UP) { step(-1); render(); }
      else if (k === KEY.DOWN) { step(1); render(); }
      else if (k === KEY.ENTER) {
        var r = menu[focusIdx];
        if (r && r.kind === 'audio') {
          var row = rows.filter(function (x) { return x.i === r.i; })[0];
          if (apply(r.i, true) && s && row) s.prefLang = row.language || s.prefLang;
        } else if (r && r.kind === 'sub') {
          Subs.choose(r.i);
          if (s) {
            var t = Subs.list().filter(function (x) { return x.index === r.i; })[0];
            s.subPref = t ? { on: true, lang: t.language, forced: t.forced } : { on: false };
          }
        }
        closeMenu();
      }
      else if (k === KEY.BACK || k === KEY.ESC || k === KEY.BACKSPACE || k === KEY.LEFT || k === KEY.RIGHT) closeMenu();
    }

    return { autoSelect: autoSelect, open: openMenu, close: function () { open = false; $('audio-menu').className = ''; },
             isOpen: function () { return open; }, key: key, sameLang: sameLang, langName: langName };
  })();

  // ---------- progress ----------
  function episodeCode(ep) {
    return 'S' + ep.season + ' E' + ep.episode;
  }
  function mediaTypeFor(token) { return token.item.kind === 'movie' ? 'movie' : 'episode'; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function progressItemId(token) {
    if (token.item.kind === 'movie') return token.item.titleId;
    var ep = token.episode || { season: 1, episode: 1 };
    return token.item.titleId + ':S' + pad2(ep.season) + 'E' + pad2(ep.episode);
  }

  async function sendProgress(token, final, ended) {
    if (s !== token || !token.current || !video.duration || !isFinite(video.duration)) return;
    var position = Math.max(0, Math.min(video.currentTime, video.duration));
    if (position <= 0) return;
    var item = token.item;
    var ext = { titleId: item.titleId };
    if (item.imdb) ext.imdb = item.imdb;
    if (item.tmdb) ext.tmdb = String(item.tmdb);
    if (item.tvdb) ext.tvdb = String(item.tvdb);
    var payload = {
      mediaType: mediaTypeFor(token), itemId: progressItemId(token), position: position, duration: video.duration,
      isPaused: final ? true : video.paused, isBuffering: !video.paused && video.readyState < 3,
      playbackEnded: Boolean(ended), timestamp: new Date().toISOString(), externalIds: ext,
      sourcePath: token.current.path, year: item.year || undefined
    };
    if (payload.mediaType === 'episode') {
      payload.seasonNumber = token.episode && token.episode.season;
      payload.episodeNumber = token.episode && token.episode.episode;
      payload.seriesId = item.titleId;
      payload.seriesName = item.name;
      payload.episodeName = (token.episode && token.episode.title) || undefined;
    } else {
      payload.movieName = item.name;
    }
    token.lastSentAt = Date.now();
    var reply;
    try { reply = await Api.sendProgress(token.profileId, payload); } catch (e) { return; }
    if (final || s !== token || !reply) return;
    if (reply.allowedToContinue === false) {
      fail('mediastorm stopped this stream: another device may be using your stream limit.');
    } else if (reply.migrationRequested) {
      playNext(token, reply.migrationReason ? 'mediastorm reported a problem with this release (' + reply.migrationReason + ').' : 'mediastorm reported a problem with this release.');
    }
  }

  // ---------- player events ----------
  video.addEventListener('playing', function () {
    if (!s) return;
    s.playingSince = s.playingSince || Date.now();
    clearTimeout(s.startTimer);
    clearTimeout(s.stallTimer);
    $('spinner').className = '';
  });
  video.addEventListener('waiting', function () {
    if (!s) return;
    $('spinner').className = 'on';
    var token = s;
    clearTimeout(s.stallTimer);
    if (s.playingSince) {
      s.stallTimer = setTimeout(function () {
        if (s === token && video.readyState < 3 && !video.paused) playNext(token, 'This release stopped loading.');
      }, STALL_TIMEOUT_MS);
    }
  });
  video.addEventListener('error', function () {
    if (!s || !s.current || !video.getAttribute('src')) return;
    var code = video.error ? video.error.code : 0;
    var why = code === 3 ? 'The TV couldn\'t decode this release.' : code === 4 ? 'The TV couldn\'t open this release.' : 'This release failed to play.';
    playNext(s, why);
  });
  video.addEventListener('timeupdate', function () {
    if (!video.duration) return;
    $('osd-bar').style.width = (100 * video.currentTime / video.duration) + '%';
    $('osd-time').textContent = fmt(video.currentTime) + ' / ' + fmt(video.duration);
  });
  video.addEventListener('ended', function () {
    if (!s) return;
    var token = s;
    token.ended = true;
    sendProgress(token, true, true).then(function () { exit(); });
  });
  video.addEventListener('pause', function () { if (s) { showOsd(); sendProgress(s, false); } });

  function fmt(sec) {
    if (!isFinite(sec)) return '–';
    sec = Math.floor(sec);
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), x = sec % 60;
    return (h ? h + ':' + pad2(m) : m) + ':' + pad2(x);
  }

  function showOsd() {
    $('osd').className = '';
    clearTimeout(osdTimer);
    osdTimer = setTimeout(function () { if (!video.paused) $('osd').className = 'hide'; }, 4000);
  }
  function osdNote(text) {
    var n = $('osd-note');
    n.textContent = text;
    n.className = 'on';
    clearTimeout(n._t);
    n._t = setTimeout(function () { n.className = ''; }, 8000);
    showOsd();
  }

  function seek(delta) {
    if (!video.duration) return;
    video.currentTime = Math.max(0, Math.min(video.duration - 2, video.currentTime + delta));
    showOsd();
  }

  // ---------- leaving ----------
  function teardown() {
    if (!s) return;
    clearTimeout(s.startTimer); clearTimeout(s.stallTimer); clearInterval(s.progressTimer);
  }
  function stop(silent) {
    var token = s;
    teardown();
    if (token && token.current && !token.ended && !silent) sendProgress(token, true);
    s = null;
    video.pause();
    video.removeAttribute('src');
    video.load();
    Audio.close();
    Subs.reset();
    $('player').className = '';
    $('prep').className = '';
    $('spinner').className = '';
    return token;
  }
  function exit() {
    var token = stop(false);
    if (token && token.onExit) token.onExit(null, { episode: token.episode });
  }
  function fail(message) {
    var token = stop(false);
    if (token && token.onExit) token.onExit(message, { episode: token.episode });
  }

  // Player keys take priority while it's open.
  Nav.onKey(function (e) {
    var k = e.keyCode;
    var prepOn = $('prep').className === 'on';
    var playerOn = $('player').className === 'on';
    if (prepOn && (k === KEY.BACK || k === KEY.ESC || k === KEY.BACKSPACE)) { exit(); return true; }
    if (prepOn) return true;
    if (!playerOn) return false;
    if (Audio.isOpen()) { Audio.key(k); return true; }
    if (k === KEY.BACK || k === KEY.ESC || k === KEY.BACKSPACE || k === KEY.STOP) exit();
    else if (k === KEY.ENTER || k === KEY.PLAYPAUSE) { if (video.paused) video.play(); else video.pause(); showOsd(); }
    else if (k === KEY.PLAY) { video.play(); showOsd(); }
    else if (k === KEY.PAUSE) { video.pause(); showOsd(); }
    else if (k === KEY.LEFT || k === KEY.RW) seek(-10);
    else if (k === KEY.RIGHT || k === KEY.FF) seek(10);
    else if (k === KEY.DOWN) Audio.open();
    else showOsd();
    return true;
  });

  // Save position if the app is sent to the background or closed.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && s && s.current) { video.pause(); sendProgress(s, true); }
  });

  return { start: start, stop: exit, get active() { return Boolean(s); } };
})();
