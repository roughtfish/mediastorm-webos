// Spatial navigation for the remote. Arrow keys move to the nearest focusable
// element in that direction, so rows, grids and button bars all work without
// per-screen wiring. Screens register a Back handler and optional key handler.
var Nav = (function () {
  'use strict';

  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 461, ESC: 27, BACKSPACE: 8,
              PLAY: 415, PAUSE: 19, PLAYPAUSE: 10252, STOP: 413, FF: 417, RW: 412 };

  var scope = document;       // where focusable elements are looked for
  var backHandler = null;
  var keyHandler = null;      // gets first refusal on every key (the player uses this)

  function visible(el) {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function focusables() {
    return Array.prototype.filter.call(scope.querySelectorAll('[data-focus]'), visible);
  }

  function focus(el) {
    if (!el) return;
    el.focus({ preventScroll: true });
    var section = el.closest('[data-vscroll]');
    // Native scrolling would fight the row slide below, so it's only used
    // outside the stacked-rows area.
    if (!section) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    // Rows scroll sideways: keep a little of the previous card in view.
    var row = el.closest('.row-track');
    if (row) {
      var rr = row.getBoundingClientRect(), er = el.getBoundingClientRect();
      if (er.left < rr.left + 60) row.scrollLeft -= (rr.left + 60 - er.left);
      else if (er.right > rr.right - 60) row.scrollLeft += (er.right - (rr.right - 60));
    }
    // Stacked rows slide as one layer so the focused row sits at the top of
    // the rows area. A transform is handled by the TV's graphics hardware,
    // which is much cheaper than scrolling the area.
    var rowEl = el.closest('.row');
    var layer = section && section.firstElementChild;
    if (layer && rowEl) layer.style.transform = 'translateY(' + (-rowEl.offsetTop) + 'px)';
  }

  function first() {
    var list = focusables();
    var preferred = list.filter(function (el) { return el.hasAttribute('data-autofocus'); })[0];
    focus(preferred || list[0]);
  }

  function move(dir) {
    var list = focusables();
    var cur = document.activeElement;
    if (list.indexOf(cur) === -1) { first(); return; }
    // A container can name where a move should go, e.g. Up from the episode
    // row returns to the current season's tab rather than the nearest one.
    var hint = cur.closest('[data-' + dir + ']');
    if (hint) {
      var target = scope.querySelector(hint.getAttribute('data-' + dir));
      if (target && visible(target)) { focus(target); return; }
    }
    var a = cur.getBoundingClientRect();
    var ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    var best = null, bestScore = Infinity;
    list.forEach(function (el) {
      if (el === cur) return;
      var b = el.getBoundingClientRect();
      var bx = b.left + b.width / 2, by = b.top + b.height / 2;
      var dx = bx - ax, dy = by - ay, primary, secondary;
      // Left and right stay within the same band, so the end of a row is a stop
      // rather than a jump into the row below.
      var sameBand = b.top < a.bottom - 4 && b.bottom > a.top + 4;
      if (dir === 'left') { if (b.right > a.left + 4 || !sameBand) return; primary = -dx; secondary = Math.abs(dy); }
      else if (dir === 'right') { if (b.left < a.right - 4 || !sameBand) return; primary = dx; secondary = Math.abs(dy); }
      else if (dir === 'up') { if (b.bottom > a.top + 4) return; primary = -dy; secondary = Math.abs(dx); }
      else { if (b.top < a.bottom - 4) return; primary = dy; secondary = Math.abs(dx); }
      // Staying in line matters more than raw distance, so a row's neighbour
      // beats a closer element diagonally above or below.
      var score = primary + secondary * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) focus(best);
  }

  // While an arrow is held, moves happen instantly so animations can't queue up.
  var root = document.documentElement;
  document.addEventListener('keyup', function () { root.classList.remove('fast'); });

  document.addEventListener('keydown', function (e) {
    var k = e.keyCode;
    if (e.repeat) root.classList.add('fast');
    if (keyHandler && keyHandler(e) === true) { e.preventDefault(); return; }

    var a = document.activeElement;
    if (a && a.tagName === 'INPUT') {
      // While typing, Enter or Back finishes editing and returns to the field.
      if (k === KEY.ENTER || k === KEY.BACK || k === KEY.ESC) {
        e.preventDefault();
        a.dispatchEvent(new Event('change'));
        focus(a.closest('[data-focus]'));
      }
      return;
    }

    if (k === KEY.LEFT) { move('left'); e.preventDefault(); }
    else if (k === KEY.RIGHT) { move('right'); e.preventDefault(); }
    else if (k === KEY.UP) { move('up'); e.preventDefault(); }
    else if (k === KEY.DOWN) { move('down'); e.preventDefault(); }
    else if (k === KEY.ENTER) {
      if (a && a.classList.contains('field')) { a.querySelector('input').focus(); e.preventDefault(); }
      else if (a && a.hasAttribute('data-focus')) { a.click(); e.preventDefault(); }
    }
    else if (k === KEY.BACK || k === KEY.ESC || k === KEY.BACKSPACE) {
      e.preventDefault();
      if (backHandler) backHandler();
    }
  });

  return {
    KEY: KEY,
    setScope: function (el) { scope = el || document; },
    onBack: function (fn) { backHandler = fn; },
    currentBack: function () { return backHandler; },
    onKey: function (fn) { keyHandler = fn; },
    focus: focus,
    first: first
  };
})();
