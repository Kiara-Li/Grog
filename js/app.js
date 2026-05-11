(function () {
  "use strict";

  /** En dash (U+2013); Grog maps this slot for punctuation. */
  const ND = "\u2013";

  const coneTemps = [
    { name: "Cone 04", temp: 1060 },
    { name: "Cone 6", temp: 1222 },
    { name: "Cone 10", temp: 1305 },
  ];

  const rawGlazes = [
    {
      name: "Celadon",
      rawColor: "#B8C4B8",
      firedColors: { cone04: "#C8B8A8", cone6: "#7BA899", cone10: "#4A7A6A" },
    },
    {
      name: "Iron Red",
      rawColor: "#9A8070",
      firedColors: { cone04: "#C49080", cone6: "#8B1A10", cone10: "#2A0C08" },
    },
    {
      name: "Cobalt",
      rawColor: "#8090A8",
      firedColors: { cone04: "#6888C0", cone6: "#1A2E5A", cone10: "#080E20" },
    },
    {
      name: "Wood Ash",
      rawColor: "#C0B8A0",
      firedColors: { cone04: "#D0C8A8", cone6: "#8A9E78", cone10: "#4A5E38" },
    },
    {
      name: "Tenmoku",
      rawColor: "#6B5040",
      firedColors: { cone04: "#7A6858", cone6: "#3A1A0C", cone10: "#120808" },
    },
  ];

  const characterSet = [
    "ABCDEFGHIJKLM",
    "NOPQRSTUVWXYZ",
    "abcdefghijklm",
    "nopqrstuvwxyz",
    "0123456789",
    "$.,!?&\u201C\u201D\u2018\u2019#*:;",
    "@%(){}+\u2013_=/\\<>",
  ];

  const GLYPH_SWATCHES = ["#2A1A0A", "#E8DCC8", "#C4622D", "#8B5A3A", "#D4956A", "#6B4428", "#E8C49A"];
  const GLAZE_SWATCHES = ["#6B9E8F", "#3D7060", "#3A2010", "#7A2010", "#C09080", "#9BAA8A", "#7090C0"];

  const CUSTOM_GLAZE_INDEX = 5;

  const state = {
    mousePos: { x: 0, y: 0 },
    temperature: 20,
    /** Kiln sim runs only while #hero is in view (scroll away → freeze). */
    heroSectionInView: true,
    fontSize: 128,
    isInverted: false,
    letterSpacing: 0,
    lineHeight: 1,
    typeTesterText: "GROG",
    glazeCoveragePct: 0,
    glyphColor: "#2A1A0A",
    glazeColor: "#C4622D",
    selectedChar: "A",
    selectedCone: null,
    selectedRawGlaze: null,
    isFiring: false,
    firingTemp: 20,
    hasFired: false,
    firedColor: "",
    customColor: "#C4622D",
  };

  const letters = "GROG".split("");

  /** @type {HTMLElement | null} */
  let lettersContainer = null;
  /** @type {HTMLSpanElement[]} */
  let letterEls = [];

  /** Specimen column: one PNG per slide (color/ folder). Filenames keep their original spaces. */
  const SPEC_CAROUSEL_SLIDES = [
    { image: "color/GLAZE 01.png", alt: "Glaze 01 specimen" },
    { image: "color/CELADON.png", alt: "Celadon specimen" },
    { image: "color/IRON RED.png", alt: "Iron Red specimen" },
    { image: "color/WOOD ASH.png", alt: "Wood Ash specimen" },
    { image: "color/TENMOKU.png", alt: "Tenmoku specimen" },
  ];

  let specCarouselIndex = 0;
  let specCarouselTimer = null;

  function buildSpecCarousel() {
    const track = document.getElementById("spec-carousel-track");
    const dotsRoot = document.getElementById("spec-carousel-dots");
    const root = document.getElementById("spec-carousel");
    if (!track || !dotsRoot || !root) return;

    const n = SPEC_CAROUSEL_SLIDES.length;
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stepPct = 100 / n;

    function goToSlide(idx) {
      specCarouselIndex = ((idx % n) + n) % n;
      track.style.transform = "translateX(-" + specCarouselIndex * stepPct + "%)";
      dotsRoot.querySelectorAll(".spec-carousel-dot").forEach(function (d, i) {
        d.setAttribute("aria-current", i === specCarouselIndex ? "true" : "false");
      });
    }

    function stopAutoplay() {
      if (specCarouselTimer) {
        window.clearInterval(specCarouselTimer);
        specCarouselTimer = null;
      }
    }

    function startAutoplay() {
      if (reduceMotion || n < 2) return;
      stopAutoplay();
      specCarouselTimer = window.setInterval(function () {
        goToSlide(specCarouselIndex + 1);
      }, 5200);
    }

    track.innerHTML = "";
    dotsRoot.innerHTML = "";
    track.style.width = n * 100 + "%";

    SPEC_CAROUSEL_SLIDES.forEach(function (slide, slideIdx) {
      const slideEl = document.createElement("div");
      slideEl.className = "spec-carousel-slide";
      slideEl.setAttribute("role", "group");
      slideEl.setAttribute("aria-roledescription", "slide");
      slideEl.setAttribute("aria-label", "Slide " + (slideIdx + 1) + " of " + n);
      slideEl.style.flex = "0 0 " + stepPct + "%";

      const img = document.createElement("img");
      img.className = "spec-image";
      img.src = encodeURI(slide.image);
      img.alt = slide.alt || "";
      img.loading = "lazy";
      img.decoding = "async";
      slideEl.appendChild(img);
      track.appendChild(slideEl);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "spec-carousel-dot";
      dot.setAttribute("aria-label", "Show specimen slide " + (slideIdx + 1));
      dot.addEventListener("click", function () {
        stopAutoplay();
        goToSlide(slideIdx);
        startAutoplay();
      });
      dotsRoot.appendChild(dot);
    });

    goToSlide(0);
    startAutoplay();

    root.addEventListener("mouseenter", stopAutoplay);
    root.addEventListener("mouseleave", startAutoplay);
  }


  function interpolateColor(color1, color2, factor) {
    const hex1 = color1.replace("#", "");
    const hex2 = color2.replace("#", "");
    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);
    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  /** °C → ember red ramp (hero GROG / stage label + °C readout share the same scale). */
  function kilnReadoutColorAtTemp(t) {
    const minT = 20;
    const maxT = 1280;
    const u = Math.max(0, Math.min(1, (t - minT) / (maxT - minT)));
    return interpolateColor("#3D2A22", "#FF4A2E", u);
  }

  function getFiringStageLabel() {
    const t = state.temperature;
    if (t < 200) return "UNFIRED CLAY";
    if (t < 500) return "BONE DRY";
    if (t < 800) return "BISQUE FIRE";
    if (t < 1000) return "PEAK FIRING";
    if (t < 1150) return "GLAZE MELTING";
    return "COOLED & GLAZED";
  }

  function calculateLetterScale(index) {
    const el = letterEls[index];
    if (!el) return 1;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const d = Math.hypot(state.mousePos.x - cx, state.mousePos.y - cy);
    return d < 150 ? 1.05 : 1;
  }

  function transformCustomColor(hexColor, cone) {
    const hex = hexColor.replace("#", "");
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (delta !== 0) {
      s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
      if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / delta + 2) / 6;
      else h = ((r - g) / delta + 4) / 6;
    }
    let newH = h;
    let newS = s;
    let newL = l;
    if (cone === 0) {
      newL = Math.min(1, l * 1.15);
      newS = Math.max(0, s * 0.9);
    } else if (cone === 1) {
      newS = Math.min(1, s * 1.2);
      newH = (h + 10 / 360) % 1;
    } else {
      newL = Math.max(0, l * 0.8);
      newS = Math.min(1, s * 1.3);
    }
    function hslToRgb(hh, ss, ll) {
      let rr;
      let gg;
      let bb;
      if (ss === 0) {
        rr = gg = bb = ll;
      } else {
        function hue2rgb(p, q, tt) {
          let t = tt;
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        }
        const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
        const p = 2 * ll - q;
        rr = hue2rgb(p, q, hh + 1 / 3);
        gg = hue2rgb(p, q, hh);
        bb = hue2rgb(p, q, hh - 1 / 3);
      }
      function toHex(x) {
        const hx = Math.round(x * 255).toString(16);
        return hx.length === 1 ? "0" + hx : hx;
      }
      return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
    }
    return hslToRgb(newH, newS, newL);
  }

  function getContrastColor(hexColor) {
    const hex = hexColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.4 ? "#1A0A00" : "#F5F0E8";
  }

  function resetTile() {
    state.hasFired = false;
    state.firedColor = "";
    state.firingTemp = 20;
    updateTileCard();
    updateFireButton();
    updatePdfButton();
  }

  function fireTile() {
    if (state.selectedCone === null || state.selectedRawGlaze === null) return;
    state.isFiring = true;
    state.hasFired = false;
    state.firingTemp = 20;
    updateTileCard();
    updateFireButton();

    const targetTemp = coneTemps[state.selectedCone].temp;
    const duration = 2700;
    const steps = 50;
    const increment = (targetTemp - 20) / steps;
    const stepDuration = duration / steps;
    let currentStep = 0;
    const tempInterval = setInterval(function () {
      currentStep += 1;
      state.firingTemp = Math.round((20 + increment * currentStep) / 10) * 10;
      updateFireButton();
      if (currentStep >= steps) clearInterval(tempInterval);
    }, stepDuration);

    setTimeout(function () {
      let fired;
      if (state.selectedRawGlaze === CUSTOM_GLAZE_INDEX) {
        fired = transformCustomColor(state.customColor, state.selectedCone);
      } else {
        const glaze = rawGlazes[state.selectedRawGlaze];
        const coneKey = state.selectedCone === 0 ? "cone04" : state.selectedCone === 1 ? "cone6" : "cone10";
        fired = glaze.firedColors[coneKey];
      }
      state.firedColor = fired;
      state.hasFired = true;
      state.isFiring = false;
      clearInterval(tempInterval);
      updateTileCard();
      updateFireButton();
      updatePdfButton();
    }, 3000);
  }

  function normalizeHexColor(hex) {
    let h = String(hex || "#000000")
      .trim()
      .replace(/^#/, "");
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    if (h.length !== 6 || /[^0-9a-f]/i.test(h)) return "#000000";
    return "#" + h.toUpperCase();
  }

  function hexToPdfRgb(hex) {
    const h = normalizeHexColor(hex).replace("#", "");
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255,
    };
  }

  function slugForFilename(name) {
    return (
      String(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "tile"
    );
  }

  async function exportPDF() {
    if (state.selectedCone === null || state.selectedRawGlaze === null || !state.hasFired) return;
    if (typeof PDFLib === "undefined" || !PDFLib.PDFDocument) {
      window.alert("PDF library is missing. Check that js/vendor/pdf-lib.min.js is loaded.");
      return;
    }
    const glazeName =
      state.selectedRawGlaze === CUSTOM_GLAZE_INDEX ? "Custom" : rawGlazes[state.selectedRawGlaze].name;
    const rawHex = normalizeHexColor(
      state.selectedRawGlaze === CUSTOM_GLAZE_INDEX ? state.customColor : rawGlazes[state.selectedRawGlaze].rawColor
    );
    const firedHex = normalizeHexColor(state.firedColor || rawHex);
    const cone = coneTemps[state.selectedCone];
    const { PDFDocument, rgb } = PDFLib;

    let fontBytes;
    try {
      const fontUrl = new URL("fonts/Grog-Regular_3.otf", window.location.href).href;
      const res = await fetch(fontUrl);
      if (!res.ok) throw new Error("font " + res.status);
      fontBytes = await res.arrayBuffer();
    } catch (err) {
      window.alert("Could not load the Grog font file for PDF export.");
      return;
    }

    let pdfDoc;
    let grogFont;
    try {
      pdfDoc = await PDFDocument.create();
      grogFont = await pdfDoc.embedFont(fontBytes);
    } catch (err) {
      window.alert("Could not embed the font in the PDF.");
      return;
    }

    const page = pdfDoc.addPage([595, 842]);
    const H = page.getHeight();
    const margin = 56;
    const ink = rgb(0.16, 0.09, 0.04);
    const rawC = hexToPdfRgb(rawHex);
    const firedC = hexToPdfRgb(firedHex);
    const sw = 76;
    const gap = 22;
    const hexSize = 22;

    let t = H - margin;
    page.drawText("GROG", { x: margin, y: t, size: 44, font: grogFont, color: ink });
    t -= 50;
    const subtitle = glazeName + " " + ND + " " + cone.name;
    page.drawText(subtitle, { x: margin, y: t, size: 13, font: grogFont, color: ink });

    function drawSwatchRow(label, fillRgb, hexDisp, boxBottom) {
      page.drawText(label, { x: margin, y: boxBottom + sw + 14, size: 10, font: grogFont, color: ink });
      page.drawRectangle({
        x: margin,
        y: boxBottom,
        width: sw,
        height: sw,
        color: rgb(fillRgb.r, fillRgb.g, fillRgb.b),
        borderColor: rgb(0.32, 0.26, 0.18),
        borderWidth: 0.75,
      });
      page.drawText(hexDisp, {
        x: margin + sw + gap,
        y: boxBottom + 24,
        size: hexSize,
        font: grogFont,
        color: ink,
      });
    }

    const firstBoxBottom = t - 96;
    drawSwatchRow("RAW", rawC, rawHex, firstBoxBottom);
    drawSwatchRow("FIRED", firedC, firedHex, firstBoxBottom - sw - 58);

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes], { type: "application/pdf" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "grog-tile-" + slugForFilename(glazeName) + "-" + slugForFilename(cone.name) + ".pdf";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  }

  function getCharUnicode(char) {
    const code = char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0");
    return `U+${code}`;
  }

  function applyTesterTypography(fontSize, letterSpacing, lineHeight) {
    ["tester-input", "tester-fit", "tester-base", "tester-glaze"].forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.fontSize = fontSize + "px";
      el.style.letterSpacing = letterSpacing + "em";
      el.style.lineHeight = String(lineHeight);
    });
  }

  function syncTypeTesterText() {
    const input = document.getElementById("tester-input");
    const fit = document.getElementById("tester-fit");
    const base = document.getElementById("tester-base");
    const glaze = document.getElementById("tester-glaze");
    if (!input || !fit || !base || !glaze) return;

    const applyMirrors = function () {
      let text = input.textContent || "";
      if (!text.trim()) {
        text = "GROG";
        input.textContent = text;
      }
      fit.textContent = text;
      base.textContent = text;
      glaze.textContent = text;
      state.typeTesterText = text;
    };

    const typing = document.activeElement === input && (input.textContent || "").trim().length > 0;
    if (typing && typeof queueMicrotask === "function") {
      queueMicrotask(applyMirrors);
    } else {
      applyMirrors();
    }
  }

  /** Glaze = second layer clipped with overflow + px height from Range (no gradient / no background-clip). */
  function layoutTesterGlazeClip() {
    const line = document.getElementById("tester-line");
    const base = document.getElementById("tester-base");
    const clip = document.getElementById("tester-glaze-clip");
    const glaze = document.getElementById("tester-glaze");
    if (!line || !base || !clip || !glaze) return;

    const baseFill = state.isInverted ? "#E8DCC8" : state.glyphColor;
    const glazeHex = state.glazeColor || "#C4622D";
    base.style.color = baseFill;
    glaze.style.color = glazeHex;

    let pct = Number(state.glazeCoveragePct);
    if (!Number.isFinite(pct)) pct = 0;
    pct = Math.max(0, Math.min(100, pct));

    if (pct <= 0) {
      clip.style.visibility = "hidden";
      clip.style.height = "0px";
      clip.style.top = "0px";
      return;
    }

    const lr = line.getBoundingClientRect();
    if (lr.height <= 0) return;

    let inkTop = 0;
    let inkH = lr.height;
    try {
      const range = document.createRange();
      range.selectNodeContents(base);
      const br = range.getBoundingClientRect();
      if (br.height > 0) {
        inkTop = br.top - lr.top;
        inkH = br.height;
      }
    } catch (e) {
      inkTop = 0;
      inkH = lr.height;
    }

    const band = (inkH * pct) / 100;
    const maxBand = Math.max(0, lr.height - inkTop);
    const bandClamped = Math.min(band, maxBand);

    clip.style.visibility = "visible";
    clip.style.top = inkTop + "px";
    clip.style.height = bandClamped + "px";
    clip.style.left = "0";
    clip.style.width = "100%";

    glaze.style.top = -inkTop + "px";
    glaze.style.left = "0";
    glaze.style.width = "100%";
    glaze.style.height = lr.height + "px";
  }

  function updateHero() {
    const t = state.temperature;
    const heat = kilnReadoutColorAtTemp(t);
    const word = document.getElementById("hero-word");
    const stage = document.getElementById("hero-stage");
    if (word) word.style.color = heat;
    if (stage) {
      stage.style.color = heat;
      stage.textContent = getFiringStageLabel();
    }
    letters.forEach(function (_, i) {
      const el = letterEls[i];
      if (el) el.style.transform = "scale(" + calculateLetterScale(i) + ")";
    });
  }

  function updateKilnReadout() {
    const el = document.getElementById("kiln-temp");
    if (el) {
      el.textContent = state.temperature + "°C";
      el.style.color = kilnReadoutColorAtTemp(state.temperature);
    }
  }

  function updateTypeTester() {
    const preview = document.getElementById("type-preview-wrap");
    if (preview) {
      preview.style.backgroundColor = state.isInverted ? "#0F0804" : "#F5F0E8";
      preview.classList.toggle("surface-dark-texture", state.isInverted);
    }

    syncTypeTesterText();
    applyTesterTypography(state.fontSize, state.letterSpacing, state.lineHeight);

    const baseFill = state.isInverted ? "#E8DCC8" : state.glyphColor;
    layoutTesterGlazeClip();
    requestAnimationFrame(function () {
      layoutTesterGlazeClip();
      requestAnimationFrame(layoutTesterGlazeClip);
    });

    const input = document.getElementById("tester-input");
    if (input) input.style.caretColor = baseFill;

    const pct = state.glazeCoveragePct;
    const fsVal = document.getElementById("ctrl-fontsize-val");
    if (fsVal) fsVal.textContent = state.fontSize + " PT";
    const spVal = document.getElementById("ctrl-spacing-val");
    if (spVal) spVal.textContent = state.letterSpacing.toFixed(2) + " EM";
    const lhVal = document.getElementById("ctrl-lineheight-val");
    if (lhVal) lhVal.textContent = state.lineHeight.toFixed(2);
    const lhCtrl = document.getElementById("ctrl-lineheight");
    if (lhCtrl && document.activeElement !== lhCtrl) lhCtrl.value = String(state.lineHeight);
    const gc = document.getElementById("ctrl-glaze-coverage");
    if (gc && document.activeElement !== gc) gc.value = String(pct);
    const gcVal = document.getElementById("ctrl-glaze-coverage-val");
    if (gcVal) gcVal.textContent = pct + "%";

    document.querySelectorAll("[data-toggle=day]").forEach(function (btn) {
      setToggleStyle(btn, !state.isInverted);
    });
    document.querySelectorAll("[data-toggle=kiln]").forEach(function (btn) {
      setToggleStyle(btn, state.isInverted);
    });

    document.querySelectorAll("[data-glyph-swatch]").forEach(function (btn) {
      const col = btn.getAttribute("data-glyph-swatch");
      btn.style.outline = state.glyphColor === col ? "2px solid #E8DCC8" : "none";
      btn.style.outlineOffset = state.glyphColor === col ? "-2px" : "0";
    });
    document.querySelectorAll("[data-glaze-swatch]").forEach(function (btn) {
      const col = btn.getAttribute("data-glaze-swatch");
      btn.style.outline = state.glazeColor === col ? "2px solid #E8DCC8" : "none";
      btn.style.outlineOffset = state.glazeColor === col ? "-2px" : "0";
    });
  }

  function setToggleStyle(btn, on) {
    btn.style.borderColor = on ? "#B8AFA0" : "#3D2B1A";
    btn.style.backgroundColor = on ? "#2A1F10" : "transparent";
    btn.style.color = on ? "#E8DCC8" : "#B8AFA0";
  }

  function updateCharPreview() {
    const g = document.getElementById("char-preview-glyph");
    const c = document.getElementById("char-preview-code");
    if (g) {
      g.textContent = state.selectedChar;
      g.style.fontSize = "clamp(12rem, 30vw, 40rem)";
    }
    if (c) c.textContent = getCharUnicode(state.selectedChar);
  }

  function tileDisplayColor() {
    if (state.hasFired && state.selectedRawGlaze !== null && state.selectedCone !== null) return state.firedColor;
    if (state.selectedRawGlaze !== null) {
      if (state.selectedRawGlaze === CUSTOM_GLAZE_INDEX) return state.customColor;
      return rawGlazes[state.selectedRawGlaze].rawColor;
    }
    return "#C8B8A0";
  }

  function updateTileCard() {
    const card = document.getElementById("tile-card");
    const main = document.getElementById("tile-card-main");
    const footer = document.getElementById("tile-card-footer");
    const labelGrog = document.getElementById("tile-label-grog");
    const line1 = document.getElementById("tile-footer-line1");
    const line2 = document.getElementById("tile-footer-line2");
    if (!card || !main || !footer) return;

    card.classList.remove("firing-animation");
    void card.offsetWidth;
    if (state.isFiring) card.classList.add("firing-animation");
    else card.classList.remove("firing-animation");

    card.classList.toggle("is-firing", state.isFiring);

    const color = tileDisplayColor();
    const neutral = state.selectedRawGlaze === null || state.selectedCone === null;

    if (!state.isFiring) {
      card.style.backgroundColor = color;
      main.style.backgroundColor = color;
      if (labelGrog) labelGrog.style.color = neutral ? "#3D2B1A" : getContrastColor(color);
      if (line1 && line2) {
        if (neutral) {
          line1.textContent = "Select Glaze + Cone";
          line1.className = "line1";
          line2.textContent = "";
          line2.style.display = "none";
        } else {
          const gname = state.selectedRawGlaze === CUSTOM_GLAZE_INDEX ? "Custom" : rawGlazes[state.selectedRawGlaze].name;
          const cn = coneTemps[state.selectedCone];
          line1.textContent = gname;
          line2.textContent = cn.name + " " + ND + " " + cn.temp + "\u00B0C";
          line2.style.display = "block";
        }
      }
    } else {
      card.style.backgroundColor = "#1A0A00";
    }
  }

  function updateFireButton() {
    const btn = document.getElementById("btn-fire");
    if (!btn) return;
    const disabled = state.isFiring || state.hasFired || state.selectedCone === null || state.selectedRawGlaze === null;
    btn.disabled = disabled;
    if (state.isFiring) btn.textContent = "Firing " + state.firingTemp + "°C";
    else if (state.hasFired) btn.textContent = "Fired";
    else btn.textContent = "Fire Tile";
  }

  function updatePdfButton() {
    const btn = document.getElementById("btn-pdf");
    if (!btn) return;
    const show = state.selectedCone !== null && state.selectedRawGlaze !== null && state.hasFired;
    btn.hidden = !show;
  }

  function updateConeButtons() {
    document.querySelectorAll("[data-cone-idx]").forEach(function (btn) {
      const idx = parseInt(btn.getAttribute("data-cone-idx"), 10);
      const on = state.selectedCone === idx;
      btn.style.borderColor = on ? "#3D2B1A" : "#B8AFA0";
      btn.style.backgroundColor = on ? "#3D2B1A" : "transparent";
      btn.style.color = on ? "#F5F0E8" : "#3D2B1A";
    });
  }

  function updateGlazeCards() {
    document.querySelectorAll("[data-raw-idx]").forEach(function (btn) {
      const idx = parseInt(btn.getAttribute("data-raw-idx"), 10);
      const on = state.selectedRawGlaze === idx;
      btn.style.border = on ? "2px solid #3D2B1A" : "1px solid #B8AFA0";
    });
    const customCard = document.querySelector("[data-raw-custom]");
    if (customCard) {
      const on = state.selectedRawGlaze === CUSTOM_GLAZE_INDEX;
      customCard.style.border = on ? "2px solid #3D2B1A" : "1px solid #B8AFA0";
    }
    const customSwatch = document.getElementById("custom-color-swatch");
    const customPlus = document.getElementById("custom-plus");
    if (customSwatch) customSwatch.style.backgroundColor = state.customColor;
    if (customPlus) customPlus.style.color = getContrastColor(state.customColor);
  }

  function buildHeroLetters() {
    lettersContainer = document.getElementById("hero-word");
    if (!lettersContainer) return;
    lettersContainer.innerHTML = "";
    letterEls = [];
    letters.forEach(function (ch) {
      const span = document.createElement("span");
      span.className = "hero-letter";
      span.textContent = ch;
      lettersContainer.appendChild(span);
      letterEls.push(span);
    });
  }

  function buildCharacterMap() {
    const root = document.getElementById("char-rows");
    if (!root) return;
    root.innerHTML = "";
    characterSet.forEach(function (row) {
      const rowEl = document.createElement("div");
      rowEl.className = "char-row";
      row.split("").forEach(function (ch) {
        const span = document.createElement("span");
        span.className = "char-glyph";
        span.textContent = ch;
        span.dataset.char = ch;
        span.addEventListener("mouseenter", function () {
          state.selectedChar = ch;
          updateCharPreview();
        });
        rowEl.appendChild(span);
      });
      root.appendChild(rowEl);
    });
  }

  function wireControls() {
    window.addEventListener("mousemove", function (e) {
      state.mousePos.x = e.clientX;
      state.mousePos.y = e.clientY;
      updateHero();
    });

    setInterval(function () {
      if (!state.heroSectionInView) return;
      state.temperature = state.temperature >= 1280 ? 20 : Math.min(1280, state.temperature + 10);
      updateKilnReadout();
      updateHero();
    }, 56);

    const heroEl = document.getElementById("hero");
    if (heroEl && typeof IntersectionObserver !== "undefined") {
      const io = new IntersectionObserver(
        function (entries) {
          const en = entries[0];
          state.heroSectionInView = !!(en && en.isIntersecting);
          if (state.heroSectionInView) {
            updateKilnReadout();
            updateHero();
          }
        },
        { threshold: 0, rootMargin: "0px" }
      );
      io.observe(heroEl);
    }

    document.getElementById("ctrl-fontsize")?.addEventListener("input", function (e) {
      state.fontSize = Number(e.target.value);
      updateTypeTester();
    });

    document.getElementById("ctrl-spacing")?.addEventListener("input", function (e) {
      state.letterSpacing = Number(e.target.value);
      updateTypeTester();
    });

    document.getElementById("ctrl-lineheight")?.addEventListener("input", function (e) {
      state.lineHeight = Number(e.target.value);
      if (!Number.isFinite(state.lineHeight)) state.lineHeight = 1;
      state.lineHeight = Math.max(0.85, Math.min(2, state.lineHeight));
      updateTypeTester();
    });

    document.querySelector("[data-toggle=day]")?.addEventListener("click", function () {
      state.isInverted = false;
      updateTypeTester();
    });
    document.querySelector("[data-toggle=kiln]")?.addEventListener("click", function () {
      state.isInverted = true;
      updateTypeTester();
    });

    function onGlazeCoverageSlider(e) {
      const v = Number((e.target && e.target.value) || 0);
      state.glazeCoveragePct = Math.max(0, Math.min(100, v));
      updateTypeTester();
    }
    document.getElementById("ctrl-glaze-coverage")?.addEventListener("input", onGlazeCoverageSlider);
    document.getElementById("ctrl-glaze-coverage")?.addEventListener("change", onGlazeCoverageSlider);

    document.querySelectorAll("[data-glyph-swatch]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.glyphColor = btn.getAttribute("data-glyph-swatch") || state.glyphColor;
        updateTypeTester();
      });
    });
    document.querySelectorAll("[data-glaze-swatch]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.glazeColor = btn.getAttribute("data-glaze-swatch") || state.glazeColor;
        updateTypeTester();
      });
    });

    document.getElementById("tester-input")?.addEventListener("input", function () {
      updateTypeTester();
    });

    document.querySelectorAll("[data-cone-idx]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.selectedCone = parseInt(btn.getAttribute("data-cone-idx"), 10);
        resetTile();
        updateConeButtons();
      });
    });

    document.querySelectorAll("[data-raw-idx]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.selectedRawGlaze = parseInt(btn.getAttribute("data-raw-idx"), 10);
        resetTile();
        updateGlazeCards();
      });
    });

    const customCard = document.querySelector("[data-raw-custom]");
    customCard?.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest('input[type="color"]')) return;
      state.selectedRawGlaze = CUSTOM_GLAZE_INDEX;
      resetTile();
      updateGlazeCards();
    });

    document.getElementById("custom-color-input")?.addEventListener("input", function (e) {
      state.customColor = e.target.value;
      updateGlazeCards();
      if (state.selectedRawGlaze === CUSTOM_GLAZE_INDEX && !state.hasFired) updateTileCard();
    });

    document.getElementById("custom-color-input")?.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    document.getElementById("btn-fire")?.addEventListener("click", fireTile);
    document.getElementById("btn-pdf")?.addEventListener("click", function () {
      exportPDF().catch(function (err) {
        console.error(err);
        window.alert("Could not create PDF.");
      });
    });

    window.addEventListener("resize", function () {
      updateTypeTester();
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        updateTypeTester();
      });
    }
  }

  function buildSwatches() {
    const glyphRow = document.getElementById("swatch-row-glyph");
    const glazeRow = document.getElementById("swatch-row-glaze");
    if (glyphRow) {
      GLYPH_SWATCHES.forEach(function (col) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "swatch";
        b.dataset.glyphSwatch = col;
        b.style.backgroundColor = col;
        b.setAttribute("aria-label", "Glyph color " + col);
        glyphRow.appendChild(b);
      });
    }
    if (glazeRow) {
      GLAZE_SWATCHES.forEach(function (col) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "swatch";
        b.dataset.glazeSwatch = col;
        b.style.backgroundColor = col;
        b.setAttribute("aria-label", "Glaze color " + col);
        glazeRow.appendChild(b);
      });
    }
  }

  function init() {
    buildHeroLetters();
    buildCharacterMap();
    buildSpecCarousel();
    buildSwatches();
    wireControls();

    const input = document.getElementById("tester-input");
    if (input) input.textContent = state.typeTesterText;

    updateHero();
    updateKilnReadout();
    updateTypeTester();
    updateCharPreview();
    updateConeButtons();
    updateGlazeCards();
    updateTileCard();
    updateFireButton();
    updatePdfButton();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
