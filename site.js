// Landing-page interactions. No dependencies; every effect degrades to a static
// page when JS is off, and motion is skipped under prefers-reduced-motion.
(function () {
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var track = function (event, props) {
    if (typeof window.aqTrack === "function") window.aqTrack(event, props);
  };

  // ---------- reveal on scroll ----------
  var revealed = document.querySelectorAll("[data-reveal], [data-steps]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealed.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealed.forEach(function (el) { el.classList.add("is-in"); });
  }

  // ---------- before / after compare ----------
  var compare = document.querySelector("[data-compare]");
  if (compare) {
    var frame = compare.querySelector(".compare-frame");
    var handle = compare.querySelector(".compare-handle");
    var before = compare.querySelector(".compare-before");
    var after = compare.querySelector(".compare-after");
    var label = compare.querySelector("[data-compare-label]");
    var tabs = Array.prototype.slice.call(compare.querySelectorAll("[data-pair]"));
    var pos = 50;
    var userTouched = false;
    var sweepFrame = null;
    var autoplay = null;

    var setPos = function (value) {
      pos = Math.max(0, Math.min(100, value));
      frame.style.setProperty("--pos", pos + "%");
      handle.setAttribute("aria-valuenow", Math.round(pos));
    };

    var stopAuto = function () {
      if (sweepFrame) cancelAnimationFrame(sweepFrame);
      if (autoplay) clearInterval(autoplay);
      sweepFrame = null; autoplay = null;
    };

    var markTouched = function (how) {
      stopAuto();
      if (userTouched) return;
      userTouched = true;
      track("compare_interacted", { method: how });
    };

    // Gentle sweep to show the slider is draggable: 50 → 78 → 22 → 50.
    var sweep = function () {
      if (reduceMotion) return;
      var keys = [50, 78, 22, 50], seg = 700, start = null;
      var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
      var step = function (now) {
        if (start === null) start = now;
        var t = (now - start) / seg, i = Math.floor(t);
        if (i >= keys.length - 1) { setPos(50); sweepFrame = null; return; }
        setPos(keys[i] + (keys[i + 1] - keys[i]) * ease(t - i));
        sweepFrame = requestAnimationFrame(step);
      };
      sweepFrame = requestAnimationFrame(step);
    };

    var showPair = function (tab, fromUser) {
      if (tab.classList.contains("is-active")) return;
      tabs.forEach(function (t) { t.classList.toggle("is-active", t === tab); t.setAttribute("aria-pressed", t === tab); });
      var name = tab.getAttribute("data-pair");
      var nextBefore = new Image(), nextAfter = new Image(), loaded = 0;
      var swap = function () {
        if (++loaded < 2) return;
        frame.classList.add("is-swapping");
        setTimeout(function () {
          before.src = nextBefore.src; after.src = nextAfter.src;
          label.textContent = tab.getAttribute("data-label");
          after.alt = "After: the photo regraded in Aesthiq's " + tab.textContent + " look";
          frame.classList.remove("is-swapping");
          setPos(50);
          if (!fromUser) sweep();
        }, 260);
      };
      nextBefore.onload = nextAfter.onload = swap;
      nextBefore.src = "img/compare/" + name + "-before.webp";
      nextAfter.src = "img/compare/" + name + "-after.webp";
      if (fromUser) track("compare_look_selected", { look: name });
    };

    tabs.forEach(function (tab) {
      tab.setAttribute("aria-pressed", tab.classList.contains("is-active"));
      tab.addEventListener("click", function () { markTouched("tab"); showPair(tab, true); });
    });

    // Drag anywhere on the photo, not just the handle.
    var dragging = false;
    var fromEvent = function (e) {
      var rect = frame.getBoundingClientRect();
      setPos(((e.clientX - rect.left) / rect.width) * 100);
    };
    frame.addEventListener("pointerdown", function (e) {
      dragging = true; frame.classList.add("is-dragging");
      frame.setPointerCapture(e.pointerId); markTouched("drag"); fromEvent(e);
    });
    frame.addEventListener("pointermove", function (e) { if (dragging) fromEvent(e); });
    var endDrag = function () { dragging = false; frame.classList.remove("is-dragging"); };
    frame.addEventListener("pointerup", endDrag);
    frame.addEventListener("pointercancel", endDrag);

    handle.addEventListener("keydown", function (e) {
      var delta = { ArrowLeft: -5, ArrowRight: 5, Home: -100, End: 100 }[e.key];
      if (delta === undefined) return;
      e.preventDefault(); markTouched("keyboard"); setPos(pos + delta);
    });

    // Preload the other pairs so switching is instant.
    tabs.forEach(function (tab) {
      var n = tab.getAttribute("data-pair");
      new Image().src = "img/compare/" + n + "-before.webp";
      new Image().src = "img/compare/" + n + "-after.webp";
    });

    // Sweep once when the hero is on screen, then rotate looks until the visitor
    // touches the slider.
    if (!reduceMotion) {
      setTimeout(sweep, 900);
      autoplay = setInterval(function () {
        if (userTouched || document.hidden) return;
        var i = tabs.findIndex(function (t) { return t.classList.contains("is-active"); });
        showPair(tabs[(i + 1) % tabs.length], false);
      }, 6500);
    }
  }

  // ---------- styles row (swipeable on phones) ----------
  var row = document.querySelector("[data-style-row]");
  if (row) {
    var rowSeen = false;
    row.addEventListener("scroll", function () {
      if (rowSeen) return;
      rowSeen = true; track("styles_row_scrolled");
    }, { passive: true });
  }

  // ---------- features: sticky phone follows the active feature ----------
  var feats = document.querySelectorAll("[data-feat]");
  var shots = document.querySelectorAll(".phone img");
  var dots = document.querySelectorAll(".feat-dots li");
  if (feats.length && shots.length && "IntersectionObserver" in window) {
    var setActive = function (i) {
      feats.forEach(function (f, n) { f.classList.toggle("is-active", n === i); });
      shots.forEach(function (s, n) { s.classList.toggle("is-active", n === i); });
      dots.forEach(function (d, n) { d.classList.toggle("is-active", n === i); });
    };
    var featObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(Number(entry.target.getAttribute("data-feat")));
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    feats.forEach(function (f) { featObserver.observe(f); });
    setActive(0);
  }

  // ---------- section views (once each) ----------
  if ("IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        track("section_viewed", { section: entry.target.id });
        sectionObserver.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    document.querySelectorAll("main section[id]").forEach(function (s) { sectionObserver.observe(s); });
  }

  // ---------- App Store clicks ----------
  document.querySelectorAll("[data-download]").forEach(function (link) {
    link.addEventListener("click", function () {
      track("download_clicked", { location: link.getAttribute("data-download") });
    });
  });
})();
