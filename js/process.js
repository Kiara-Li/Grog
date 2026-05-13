(function () {
  "use strict";

  var reduceMotion =
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var DEFAULT_INTERVAL_MS = 4200;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function initCarouselRotations(root) {
    root.querySelectorAll(".process-carousel-slide img").forEach(function (img) {
      var r = rand(-3.5, 3.5);
      img.style.setProperty("--carousel-r", r.toFixed(2) + "deg");
    });
  }

  function initCarousels() {
    document.querySelectorAll("[data-process-carousel]").forEach(function (root) {
      var viewport = root.querySelector(".process-carousel-viewport");
      var track = root.querySelector(".process-carousel-track");
      var slides = track ? track.querySelectorAll(".process-carousel-slide") : [];

      if (!viewport || !track || slides.length === 0) return;

      initCarouselRotations(root);

      var index = 0;
      var n = slides.length;
      var intervalMs = parseInt(String(root.getAttribute("data-carousel-interval") || ""), 10);
      if (!intervalMs || intervalMs < 1200) intervalMs = DEFAULT_INTERVAL_MS;

      var autoplayTimer = null;

      function widthPx() {
        return viewport.getBoundingClientRect().width;
      }

      function layout() {
        var w = widthPx();
        if (w < 1) return;
        slides.forEach(function (slide) {
          slide.style.flex = "0 0 " + w + "px";
          slide.style.width = w + "px";
        });
        track.style.width = w * n + "px";
        track.style.transform = "translate3d(" + -index * w + "px,0,0)";
        slides.forEach(function (slide, i) {
          slide.classList.toggle("is-active", i === index);
          slide.setAttribute("aria-hidden", i === index ? "false" : "true");
        });
      }

      function go(delta) {
        if (n <= 1) return;
        index = (index + delta + n) % n;
        layout();
      }

      function advance() {
        go(1);
      }

      function stopAutoplay() {
        if (autoplayTimer) {
          clearInterval(autoplayTimer);
          autoplayTimer = null;
        }
      }

      function startAutoplay() {
        stopAutoplay();
        if (n <= 1 || reduceMotion) return;
        autoplayTimer = window.setInterval(advance, intervalMs);
      }

      if (n > 1) {
        root.setAttribute("data-carousel-multiple", "true");
        viewport.setAttribute("role", "button");
        viewport.setAttribute("tabindex", "0");
        viewport.setAttribute(
          "aria-label",
          "Image carousel: click or wait to advance to the next image"
        );
        viewport.style.cursor = "pointer";
        viewport.addEventListener("click", function () {
          advance();
          stopAutoplay();
          startAutoplay();
        });
        viewport.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            advance();
            stopAutoplay();
            startAutoplay();
          }
        });
      } else {
        viewport.setAttribute("role", "img");
        viewport.removeAttribute("tabindex");
      }

      if (typeof ResizeObserver !== "undefined") {
        var ro = new ResizeObserver(function () {
          layout();
        });
        ro.observe(viewport);
      } else {
        window.addEventListener("resize", layout);
      }

      if (reduceMotion) track.style.transition = "none";

      layout();
      window.requestAnimationFrame(function () {
        layout();
      });

      if (typeof IntersectionObserver !== "undefined") {
        var vis = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) startAutoplay();
              else stopAutoplay();
            });
          },
          { threshold: 0.2 }
        );
        vis.observe(root);
      } else {
        startAutoplay();
      }
    });
  }

  /** Pottery silhouettes (same assets as homepage); paths relative to process.html in site root. */
  var PUZZ_FILES = ["Group 196.png", "Group 197.png", "Group 198.png", "Group 201.png"];

  function puzzSrc(filename) {
    return "puzz/" + encodeURIComponent(filename);
  }

  function shuffleInPlace(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function pickPuzzCount() {
    if (typeof window.matchMedia === "function" && window.matchMedia("(min-width: 900px)").matches) return 3;
    return 2;
  }

  function horizontalSlots(n) {
    if (n === 2) {
      var x1 = rand(10, 30);
      var x2 = rand(Math.max(x1 + 30, 58), 92);
      return [x1, x2];
    }
    var a = rand(8, 24);
    var b = rand(38, 56);
    var c = rand(70, 90);
    if (b - a < 20) b = Math.min(56, a + 22 + rand(0, 6));
    if (c - b < 20) c = Math.min(92, b + 22 + rand(0, 6));
    return [a, b, c];
  }

  function initProcessPuzzStrip() {
    var sections = document.querySelectorAll(".process-section.process-section--wash");
    if (!sections.length || !PUZZ_FILES.length) return;

    sections.forEach(function (sec) {
      var strip = document.createElement("div");
      strip.className = "process-puzz-strip";
      strip.setAttribute("aria-hidden", "true");

      var names = PUZZ_FILES.slice();
      shuffleInPlace(names);
      var n = pickPuzzCount();
      var chosen = names.slice(0, n);
      var xs = horizontalSlots(chosen.length);

      chosen.forEach(function (file, i) {
        var img = document.createElement("img");
        img.className = "process-puzz-fig";
        img.src = puzzSrc(file);
        img.alt = "";
        img.decoding = "async";
        img.loading = "lazy";
        img.style.left = xs[i].toFixed(1) + "%";
        img.style.transform =
          "translateX(-50%) rotate(" + rand(-4.2, 4.2).toFixed(2) + "deg)";
        img.style.height = rand(0.92, 1.08).toFixed(2) + "em";
        strip.appendChild(img);
      });

      sec.appendChild(strip);
    });
  }

  function observeSections() {
    var sections = document.querySelectorAll(".process-section");
    if (!sections.length) return;

    if (reduceMotion) {
      sections.forEach(function (sec) {
        sec.classList.add("process-section--visible");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("process-section--visible");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    sections.forEach(function (sec) {
      io.observe(sec);
    });
  }

  function init() {
    observeSections();
    initCarousels();
    initProcessPuzzStrip();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
