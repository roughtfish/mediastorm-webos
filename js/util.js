var Util = function() {
  function t(t) {
    var e = String(t || "").trim();
    return /^\/.*\/[a-z]*$|\\[bsdw]|\(\?|[|]/.test(e) && (e = e.replace(/^\/(.*)\/[a-z]*$/, "$1").replace(/\(\?[a-z]+\)/g, "").replace(/\\b/g, "").replace(/\\s\*|\\s\+|\\s|\.\?|\.\*|\.\+|\[[^\]]*\]\??/g, " ").replace(/[()^$?*]/g, "").replace(/\|/g, " or ").replace(/\s+/g, " ").trim()), e && e === e.toLowerCase() && (e = e.replace(/\b[a-z]{3,}/g, function(t) {
      return t.charAt(0).toUpperCase() + t.slice(1)
    })), e || String(t || "")
  }
  return {
    esc: function(t) {
      return String(null == t ? "" : t).replace(/[&<>"']/g, function(t) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        } [t]
      })
    },
    pad2: function(t) {
      return (t = String(t)).length < 2 ? "0" + t : t
    },
    showIds: function(t) {
      var e = [t.titleId].concat(t.altIds || []);
      return t.tvdb && e.push("tvdb:series:" + t.tvdb), t.tmdb && e.push("tmdb:tv:" + t.tmdb), t.imdb && e.push(t.imdb), e.filter(function(t, e, r) {
        return t && r.indexOf(t) === e
      })
    },
    plainTerm: t,
    plainReason: function(e) {
      return String(e || "").replace(/'([^']*)'/g, function(e, r) {
        return r.split(/,\s*(?![^()]*\))/).map(t).join(", ")
      }).replace(/\(combined weight (\d+)\)/, "(weight $1)")
    }
  }
}();