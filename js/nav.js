var Nav = function() {
  "use strict";
  var t = {
      LEFT: 37,
      UP: 38,
      RIGHT: 39,
      DOWN: 40,
      ENTER: 13,
      BACK: 461,
      ESC: 27,
      BACKSPACE: 8,
      PLAY: 415,
      PAUSE: 19,
      PLAYPAUSE: 10252,
      STOP: 413,
      FF: 417,
      RW: 412
    },
    e = document,
    n = null,
    r = null;

  function o(t) {
    if (!t.offsetParent && "fixed" !== getComputedStyle(t).position) return !1;
    var e = t.getBoundingClientRect();
    return e.width > 0 && e.height > 0
  }

  function a() {
    return Array.prototype.filter.call(e.querySelectorAll("[data-focus]"), o)
  }

  function i(t) {
    if (t) {
      t.focus({
        preventScroll: !0
      });
      var e = t.closest("[data-vscroll]");
      e || t.scrollIntoView({
        block: "nearest",
        inline: "nearest"
      });
      var n = t.closest(".row-track");
      if (n) {
        var r = n.getBoundingClientRect(),
          o = t.getBoundingClientRect();
        o.left < r.left + 60 ? n.scrollLeft -= r.left + 60 - o.left : o.right > r.right - 60 && (n.scrollLeft += o.right - (r.right - 60))
      }
      var a = t.closest(".row"),
        i = e && e.firstElementChild;
      i && a && (i.style.transform = "translateY(" + -a.offsetTop + "px)")
    }
  }

  function l() {
    var t = a();
    i(t.filter(function(t) {
      return t.hasAttribute("data-autofocus")
    })[0] || t[0])
  }

  function f(t) {
    var n = a(),
      r = document.activeElement;
    if (-1 !== n.indexOf(r)) {
      var f = r.closest("[data-" + t + "]");
      if (f) {
        var u = e.querySelector(f.getAttribute("data-" + t));
        if (u && o(u)) return void i(u)
      }
      var c = r.getBoundingClientRect(),
        s = c.left + c.width / 2,
        d = c.top + c.height / 2,
        v = null,
        h = 1 / 0;
      n.forEach(function(e) {
        if (e !== r) {
          var n, o, a = e.getBoundingClientRect(),
            i = a.left + a.width / 2,
            l = a.top + a.height / 2,
            f = i - s,
            u = l - d,
            p = Math.max(0, a.left - c.right, c.left - a.right),
            g = Math.max(0, a.top - c.bottom, c.top - a.bottom),
            E = a.top < c.bottom - 4 && a.bottom > c.top + 4;
          if ("left" === t) {
            if (a.right > c.left + 4 || !E) return;
            n = -f, o = Math.abs(u)
          } else if ("right" === t) {
            if (a.left < c.right - 4 || !E) return;
            n = f, o = Math.abs(u)
          } else if ("up" === t) {
            if (a.bottom > c.top + 4) return;
            n = g, o = p + .1 * Math.abs(f)
          } else {
            if (a.top < c.bottom - 4) return;
            n = g, o = p + .1 * Math.abs(f)
          }
          var m = n + 2.5 * o;
          m < h && (h = m, v = e)
        }
      }), v && i(v)
    } else l()
  }
  var u = document.documentElement;
  return document.addEventListener("keyup", function() {
    u.classList.remove("fast")
  }), document.addEventListener("keydown", function(e) {
    var o = e.keyCode;
    if (e.repeat && u.classList.add("fast"), r && !0 === r(e)) e.preventDefault();
    else {
      var a = document.activeElement;
      a && "INPUT" === a.tagName ? o !== t.ENTER && o !== t.BACK && o !== t.ESC || (e.preventDefault(), a.dispatchEvent(new Event("change")), i(a.closest("[data-focus]"))) : o === t.LEFT ? (f("left"), e.preventDefault()) : o === t.RIGHT ? (f("right"), e.preventDefault()) : o === t.UP ? (f("up"), e.preventDefault()) : o === t.DOWN ? (f("down"), e.preventDefault()) : o === t.ENTER ? a && a.classList.contains("field") ? (a.querySelector("input").focus(), e.preventDefault()) : a && a.hasAttribute("data-focus") && (a.click(), e.preventDefault()) : o !== t.BACK && o !== t.ESC && o !== t.BACKSPACE || (e.preventDefault(), n && n())
    }
  }), {
    KEY: t,
    setScope: function(t) {
      e = t || document
    },
    onBack: function(t) {
      n = t
    },
    currentBack: function() {
      return n
    },
    onKey: function(t) {
      r = t
    },
    focus: i,
    first: l
  }
}();