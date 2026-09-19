/* ============================================================
   main.js — loader, nav, reveals, split text, parallax,
   starfield, cursor, marquee, video posters.
   Plain JS. No libraries.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---- 1. Loader ---------------------------------------- */
  window.addEventListener('load', function () {
    setTimeout(function () {
      var l = $('#loader');
      if (l) l.classList.add('done');
      document.body.classList.add('ready');
      kick();
    }, reduce ? 0 : 650);
  });

  /* ---- 2. Split headings into animatable lines/words ----- */
  function splitNode(el) {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    var parts = [];
    Array.prototype.forEach.call(el.childNodes, function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (w) {
          if (w.trim()) parts.push({ text: w, cls: '' });
          else if (w) parts.push({ space: true });
        });
      } else if (node.nodeType === 1) {
        // keep element wrappers (em / .l2) as their own word group
        parts.push({ text: node.textContent, cls: node.className, tag: node.tagName, block: node.classList.contains('l2') });
      }
    });
    el.innerHTML = '';
    parts.forEach(function (p) {
      if (p.space) { el.appendChild(document.createTextNode(' ')); return; }
      var outer = document.createElement('span');
      if (p.block) outer.style.display = 'block';
      var inner = document.createElement('i');
      if (p.tag === 'EM') {                    // keep the italic/gold accent word
        var em = document.createElement('em');
        em.textContent = p.text;
        inner.appendChild(em);
      } else {
        inner.textContent = p.text;
      }
      if (p.cls) outer.className = p.cls;
      outer.appendChild(inner);
      el.appendChild(outer);
      el.appendChild(document.createTextNode(' '));
    });
    // stagger
    $$('i', el).forEach(function (i, n) { i.style.transitionDelay = (n * 0.055) + 's'; });
  }
  $$('[data-split]').forEach(splitNode);

  /* ---- 3. Reveal on scroll -------------------------------
     A plain sweep rather than an IntersectionObserver. An observer
     can silently skip a target during a fast flick or a jump to an
     anchor, and a skipped target stays at opacity:0 forever — which
     reads as a large blank gap in the middle of a section. This runs
     inside the existing rAF scroll handler and re-checks every
     element that has not revealed yet, so anything that has ever
     reached the trigger line (or been scrolled past) is revealed. */
  var pending = $$('[data-reveal], .split');

  function sweep() {
    if (!pending.length) return;
    var line = innerHeight * 0.88;
    pending = pending.filter(function (el) {
      // r.top is negative once an element is above the viewport, so
      // this one test covers both "scrolling into view" and "skipped".
      if (el.getBoundingClientRect().top < line) { el.classList.add('in'); return false; }
      return true;
    });
  }

  function kick() { sweep(); }

  if (reduce) {                       // no animation wanted: show it all now
    pending.forEach(function (el) { el.classList.add('in'); });
    pending = [];
  }
  kick();

  /* ---- 4. Menu ------------------------------------------- */
  var toggle = $('#navToggle'), label = $('#navLabel');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (label) label.textContent = open ? 'Close' : 'Index';
    });
    $$('#menu a').forEach(function (a) {
      a.addEventListener('click', function () {
        document.body.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
        if (label) label.textContent = 'Index';
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) toggle.click();
    });
  }

  /* ---- 5. Scroll: progress bar, sticky header, parallax --- */
  var head = $('.site-head'), bar = $('#progress');
  var pars = $$('[data-par]');
  var auroras = $$('.aurora span');
  var ticking = false;

  function onScroll() {
    // Revealing is cheap and must never be skipped — it is what makes the
    // content visible at all, so it stays outside the rAF throttle. If a
    // frame is never delivered (background tab, throttled timer) the
    // decoration below can wait, but the page must still be readable.
    sweep();

    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || 0;
      var max = document.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      if (head) head.classList.toggle('stuck', y > 40);

      if (!reduce) {
        pars.forEach(function (img) {
          var r = img.parentNode.getBoundingClientRect();
          if (r.bottom < -200 || r.top > innerHeight + 200) return;
          var p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; // -1..1
          img.style.transform = 'scale(1.14) translate3d(0,' + (p * -26).toFixed(2) + 'px,0)';
        });
        auroras.forEach(function (s, i) {
          s.style.transform = 'translate3d(0,' + (y * (0.05 + i * 0.035)).toFixed(1) + 'px,0)';
        });
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  // A resize changes the trigger line and can also reflow content upward.
  window.addEventListener('resize', sweep, { passive: true });
  onScroll();

  /* ---- 6. Cursor ----------------------------------------- */
  var cur = $('#cursor');
  if (cur && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    var cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY; cur.classList.add('on');
    });
    (function loop() {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('mouseover', function (e) {
      var hot = e.target.closest('a, button, .media, .chip, .poem-card, .book3d, .vid');
      cur.classList.toggle('grow', !!hot);
    });
  }

  /* ---- 7. Magnetic buttons -------------------------------- */
  if (!reduce) {
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2;
        var y = e.clientY - r.top - r.height / 2;
        el.style.transform = 'translate(' + x * 0.22 + 'px,' + y * 0.32 + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transition = 'transform .5s cubic-bezier(.22,.61,.36,1)';
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 500);
      });
    });
  }

  /* ---- 8. Hero book tilt ---------------------------------- */
  var tilt = $('[data-tilt]');
  if (tilt && !reduce && window.matchMedia('(hover:hover)').matches) {
    var host = tilt.parentNode;
    host.addEventListener('mousemove', function (e) {
      var r = host.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = 'rotateY(' + (-10 + px * 22) + 'deg) rotateX(' + (-py * 14) + 'deg) scale(1.03)';
    });
    host.addEventListener('mouseleave', function () { tilt.style.transform = ''; });
  }

  /* ---- 9. Marquee of poem titles -------------------------- */
  var mq = $('#marquee');
  if (mq && window.QP_PAGES) {
    var titles = window.QP_PAGES.filter(function (p) { return p.day > 0 && p.day < 100; })
                                .map(function (p) { return p.title; });
    // take a spread across the book
    var pick = titles.filter(function (_, i) { return i % 3 === 0; }).slice(0, 22);
    var html = pick.map(function (t) { return '<span>' + t + '</span>'; }).join('');
    mq.innerHTML = '<div>' + html + '</div><div aria-hidden="true">' + html + '</div>';
  }

  /* ---- 10. Video posters ---------------------------------- */
  $$('[data-vid]').forEach(function (box) {
    var v = $('video', box), p = $('.poster', box);
    if (!v || !p) return;
    p.addEventListener('click', function () {
      box.classList.add('playing');
      v.preload = 'auto';
      v.play();
    });
    v.addEventListener('pause', function () { if (v.currentTime === 0) box.classList.remove('playing'); });
  });

  /* ---- 11. Starfield -------------------------------------- */
  var cv = $('#stars');
  if (cv && !reduce) {
    var ctx = cv.getContext('2d'), stars = [], w, h, dpr = Math.min(devicePixelRatio || 1, 2);
    function size() {
      w = cv.width = innerWidth * dpr;
      h = cv.height = innerHeight * dpr;
      cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px';
      stars = [];
      var n = Math.round(innerWidth * innerHeight / 14000);
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: (Math.random() * 1.2 + 0.25) * dpr,
          a: Math.random(), s: Math.random() * 0.012 + 0.003,
          g: Math.random() > 0.82
        });
      }
    }
    size();
    var rz; addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(size, 200); });
    (function draw() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.a += s.s; if (s.a > 1 || s.a < 0.05) s.s *= -1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.fillStyle = (s.g ? 'rgba(217,179,108,' : 'rgba(210,220,255,') + (s.a * 0.75).toFixed(3) + ')';
        ctx.fill();
      }
      requestAnimationFrame(draw);
    })();
  }
})();
