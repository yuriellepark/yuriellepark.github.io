/* ============================================================
   book.js — the A Quiet Pencil flipbook.

   Two renderers share one page index:
     · "spread" (wide screens) — a real leaf-stack book. Leaf k
       carries page 2k on the front and page 2k+1 on the back, and
       rotates -180deg around its left edge.
     · "single" (narrow screens) — one page at a time, turned with
       a temporary overlay leaf so the motion still reads as paper.

   Images are only given a src inside a window around the current
   page, so opening the book does not pull 24 MB of artwork.
   ============================================================ */
(function () {
  'use strict';

  var PAGES  = window.QP_PAGES || [];
  var N      = PAGES.length;
  var LEAVES = Math.ceil(N / 2);
  var MAXFLIP = Math.floor(N / 2);          // last spread that still has a left page
  var ASPECT = 928 / 1200;                 // page width / height
  var WINDOW = 6;                           // pages loaded either side
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var $ = function (s) { return document.querySelector(s); };

  var stage = $('#stage'), book = $('#book');
  var elPrev = $('#prev'), elNext = $('#next');
  var elLbl = $('#nowLbl'), elTtl = $('#nowTtl'), elCount = $('#count');
  var elTrack = $('#track'), elFill = $('#trackFill'), elHint = $('#hint');
  var drawer = $('#drawer'), thumbs = $('#thumbs');

  var page = 0;        // current page index (0..N-1); in spread mode this is the RIGHT page
  var mode = '';       // 'spread' | 'single'
  var leaves = [];     // spread mode leaf elements
  var busy = false;

  function src(i) { return 'assets/book/pages/' + PAGES[i].src + '.jpg'; }
  function thumb(i) { return 'assets/book/thumbs/' + PAGES[i].src + '.jpg'; }

  /* ---- build ------------------------------------------------ */
  function buildSpread() {
    book.innerHTML = '<div class="book-shadow" aria-hidden="true"></div>';
    leaves = [];
    for (var k = 0; k < LEAVES; k++) {
      var leaf = document.createElement('div');
      leaf.className = 'leaf';
      leaf.dataset.k = k;
      leaf.appendChild(face('front', 2 * k));
      leaf.appendChild(face('back', 2 * k + 1));
      book.appendChild(leaf);
      leaves.push(leaf);
    }
  }

  function face(side, i) {
    var f = document.createElement('div');
    f.className = 'face ' + side;
    if (i < N) {
      var img = document.createElement('img');
      img.alt = PAGES[i].label + (PAGES[i].title ? ' — ' + PAGES[i].title : '');
      img.dataset.i = i;
      img.decoding = 'async';
      f.appendChild(img);
    } else {
      f.classList.add('empty');
    }
    return f;
  }

  function buildSingle() {
    book.innerHTML = '<div class="book-shadow" aria-hidden="true"></div>' +
                     '<div class="leaf top" id="solo" style="left:0;width:100%">' +
                       '<div class="face front"><img id="soloImg" alt=""></div>' +
                     '</div>';
    leaves = [];
  }

  /* ---- sizing ----------------------------------------------- */
  function layout() {
    var want = stage.clientWidth >= 860 ? 'spread' : 'single';
    if (want !== mode) {
      mode = want;
      mode === 'spread' ? buildSpread() : buildSingle();
      render(true);
    }
    var padW = stage.clientWidth - 2 * (mode === 'spread' ? 64 : 18);
    var padH = stage.clientHeight - 2 * 14;
    var per  = mode === 'spread' ? 2 : 1;
    var h = Math.min(padH, padW / per / ASPECT);
    var w = h * ASPECT;
    book.style.width  = (w * per) + 'px';
    book.style.height = h + 'px';
  }

  /* ---- image windowing -------------------------------------- */
  function hydrate() {
    var lo = Math.max(0, page - WINDOW), hi = Math.min(N - 1, page + WINDOW);
    book.querySelectorAll('img[data-i]').forEach(function (img) {
      var i = +img.dataset.i;
      if (i >= lo && i <= hi) { if (!img.src) img.src = src(i); }
    });
  }

  /* ---- render ----------------------------------------------- */
  function render(instant) {
    page = Math.max(0, Math.min(N - 1, page));

    if (mode === 'spread') {
      var flips = Math.min(MAXFLIP, Math.ceil(page / 2));
      leaves.forEach(function (leaf, k) {
        var on = k < flips;
        if (instant) leaf.style.transition = 'none';
        leaf.classList.toggle('flipped', on);
        // Only the two leaves actually on top carry the page shadow — see
        // the note on .reader .leaf.top in style.css.
        leaf.classList.toggle('top', k === flips - 1 || k === flips);
        leaf.style.zIndex = on ? (k + 1) : (LEAVES - k);
        if (instant) { void leaf.offsetWidth; leaf.style.transition = ''; }
      });
      // a closed book has nothing on the left, so slide it over to sit centred
      book.style.transform = flips === 0 ? 'translateX(-25%)' : 'translateX(0)';
    } else {
      book.style.transform = '';
      var img = $('#soloImg');
      if (img) {
        img.src = src(page);
        img.alt = PAGES[page].label + ' — ' + PAGES[page].title;
      }
    }

    hydrate();
    status();
  }

  function status() {
    var p = PAGES[page];
    elLbl.textContent = p.label;
    elTtl.textContent = p.title;
    elCount.textContent = String(page + 1).padStart(2, '0') + ' / ' + N;
    var pct = N > 1 ? (page / (N - 1)) * 100 : 0;
    elFill.style.width = pct + '%';
    elTrack.setAttribute('aria-valuenow', page + 1);
    elTrack.setAttribute('aria-valuetext', p.label + ', ' + p.title);
    elPrev.disabled = page <= 0;
    elNext.disabled = page >= N - 1;
    thumbs.querySelectorAll('button').forEach(function (b, i) {
      b.setAttribute('aria-current', i === page ? 'true' : 'false');
    });
  }

  /* ---- navigation -------------------------------------------- */
  function go(to, instant) {
    to = Math.max(0, Math.min(N - 1, to));
    if (to === page) return;

    if (mode === 'single' && !instant && !reduce) { turnSingle(to); return; }

    // in spread mode, move a whole spread at a time
    page = to;
    render(instant);
  }

  function step(dir) {
    if (busy) return;
    if (mode === 'spread') {
      // advance to the next spread: right page of spread s is page 2s
      var s = Math.min(MAXFLIP, Math.ceil(page / 2)) + dir;
      s = Math.max(0, Math.min(MAXFLIP, s));
      go(Math.min(N - 1, 2 * s));
    } else {
      go(page + dir);
    }
    hideHint();
  }

  /* single-page turn: overlay leaf with old page on the front and
     the new page on the back, rotated away like a real sheet. */
  function turnSingle(to) {
    var fwd = to > page;
    busy = true;
    var ov = document.createElement('div');
    ov.className = 'leaf top';
    ov.style.cssText = 'left:0;width:100%;z-index:50;transition:transform .72s cubic-bezier(.65,.05,.36,1)';
    ov.innerHTML = '<div class="face front"><img src="' + src(fwd ? page : to) + '" alt=""></div>' +
                   '<div class="face back"><img src="' + src(fwd ? to : page) + '" alt=""></div>';
    if (!fwd) ov.style.transform = 'rotateY(-180deg)';
    book.appendChild(ov);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        ov.style.transform = fwd ? 'rotateY(-180deg)' : 'rotateY(0deg)';
      });
    });

    setTimeout(function () {
      page = to;
      render(true);
      ov.remove();
      busy = false;
    }, 740);
  }

  /* ---- thumbnails -------------------------------------------- */
  function buildThumbs() {
    var frag = document.createDocumentFragment();
    PAGES.forEach(function (p, i) {
      var b = document.createElement('button');
      b.innerHTML = '<img loading="lazy" src="' + thumb(i) + '" alt=""><em>' + p.label + '</em>';
      b.title = p.label + ' — ' + p.title;
      b.addEventListener('click', function () {
        page = i;
        render(true);
        closeDrawer();
        hideHint();
      });
      frag.appendChild(b);
    });
    thumbs.appendChild(frag);
  }

  function openDrawer() {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    $('#btnThumbs').setAttribute('aria-pressed', 'true');
    var cur = thumbs.querySelectorAll('button')[page];
    if (cur) cur.scrollIntoView({ block: 'center' });
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    $('#btnThumbs').setAttribute('aria-pressed', 'false');
  }

  /* ---- hint --------------------------------------------------- */
  var hintGone = false;
  function hideHint() {
    if (hintGone || !elHint) return;
    hintGone = true;
    elHint.classList.add('gone');
  }
  setTimeout(hideHint, 7000);

  /* ---- events ------------------------------------------------- */
  elPrev.addEventListener('click', function () { step(-1); });
  elNext.addEventListener('click', function () { step(1); });

  stage.addEventListener('click', function (e) {
    if (e.target.closest('.pager')) return;
    var r = book.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    step(e.clientX < r.left + r.width / 2 ? -1 : 1);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { step(1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { step(-1); e.preventDefault(); }
    else if (e.key === 'Home') { page = 0; render(true); }
    else if (e.key === 'End') { page = N - 1; render(true); }
    else if (e.key === 'Escape') { closeDrawer(); }
  });

  var sx = 0, sy = 0, swiping = false;
  stage.addEventListener('touchstart', function (e) {
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; swiping = true;
  }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (!swiping) return;
    swiping = false;
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  function seek(clientX) {
    var r = elTrack.getBoundingClientRect();
    var t = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    page = Math.round(t * (N - 1));
    render(true);
    hideHint();
  }
  elTrack.addEventListener('click', function (e) { seek(e.clientX); });
  elTrack.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
  });

  $('#btnThumbs').addEventListener('click', function () {
    drawer.classList.contains('open') ? closeDrawer() : openDrawer();
  });
  $('#btnClose').addEventListener('click', closeDrawer);

  var btnFull = $('#btnFull');
  btnFull.addEventListener('click', function () {
    if (!document.fullscreenElement) {
      (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
    } else {
      document.exitFullscreen();
    }
  });
  document.addEventListener('fullscreenchange', function () {
    btnFull.setAttribute('aria-pressed', document.fullscreenElement ? 'true' : 'false');
    setTimeout(layout, 120);
  });

  var rz;
  addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(layout, 140); });

  /* ---- cursor (shared look with the home page) ---------------- */
  var cur = $('#cursor');
  if (cur && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    document.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; cur.classList.add('on'); });
    (function loop() {
      cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2;
      cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('mouseover', function (e) {
      cur.classList.toggle('grow', !!e.target.closest('a,button,.leaf'));
    });
  }

  /* ---- go --------------------------------------------------- */
  buildThumbs();
  layout();
  render(true);

  // deep link: reader.html#day12
  var m = /^#(?:day)?(\d+)$/i.exec(location.hash);
  if (m) {
    var want = PAGES.findIndex(function (p) { return p.day === +m[1]; });
    if (want > -1) { page = want; render(true); }
  }
})();
