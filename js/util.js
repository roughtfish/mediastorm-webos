// Small helpers shared by the player and the rest of the app.
var Util = (function () {
  // Makes text safe to put inside HTML.
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad2(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
  // Every ID a show might be filed under in mediastorm (TVDB, TMDB, IMDb and
  // its own), since it doesn't always link them.
  function showIds(item) {
    var ids = [item.titleId].concat(item.altIds || []);
    if (item.tvdb) ids.push('tvdb:series:' + item.tvdb);
    if (item.tmdb) ids.push('tmdb:tv:' + item.tmdb);
    if (item.imdb) ids.push(item.imdb);
    return ids.filter(function (v, i, a) { return v && a.indexOf(v) === i; });
  }
  // mediastorm's reasons quote your terms as written, patterns included, like
  // '(?i)\b(DV|DoVi)\b'. This turns them into plain words: "DV or DoVi".
  function plainTerm(t) {
    var s = String(t || '').trim();
    if (/^\/.*\/[a-z]*$|\\[bsdw]|\(\?|[|]/.test(s)) {   // a pattern: keep just the words
      s = s.replace(/^\/(.*)\/[a-z]*$/, '$1').replace(/\(\?[a-z]+\)/g, '')
        .replace(/\\b/g, '').replace(/\\s\*|\\s\+|\\s|\.\?|\.\*|\.\+|\[[^\]]*\]\??/g, ' ')
        .replace(/[()^$?*]/g, '').replace(/\|/g, ' or ').replace(/\s+/g, ' ').trim();
    }
    if (s && s === s.toLowerCase()) s = s.replace(/\b[a-z]{3,}/g, function (w) { return w.charAt(0).toUpperCase() + w.slice(1); });
    return s || String(t || '');
  }
  function plainReason(r) {
    return String(r || '').replace(/'([^']*)'/g, function (m, list) {
      return list.split(/,\s*(?![^()]*\))/).map(plainTerm).join(', ');
    }).replace(/\(combined weight (\d+)\)/, '(weight $1)');
  }

  return { esc: esc, pad2: pad2, showIds: showIds, plainTerm: plainTerm, plainReason: plainReason };
})();
