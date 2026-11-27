import "./styles.css";
import { SCENES, hero } from "./scenes.js";
import { mountLab } from "./lab.js";
import { clamp } from "./svg.js";

const html = document.documentElement;
const body = document.body;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = window.matchMedia("(max-width: 860px)").matches;

function readPref() { try { return localStorage.getItem("static-mode"); } catch { return null; } }
function writePref(v) { try { localStorage.setItem("static-mode", v); } catch { /* storage unavailable */ } }

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2"));
  } catch { return false; }
}

const pref = readPref();
let staticMode = pref === null ? reduced : pref === "1";
if (new URLSearchParams(location.search).has("static")) staticMode = true;
const useGL = !staticMode && webglOK();
html.classList.toggle("static", staticMode);
html.classList.toggle("gl", useGL);
html.classList.toggle("svg", !useGL && !staticMode);

const toggle = document.getElementById("mode-toggle");
toggle.setAttribute("aria-pressed", String(staticMode));
toggle.textContent = staticMode ? "Turn animation on" : "Read without animation";
toggle.addEventListener("click", () => {
  writePref(staticMode ? "0" : "1");
  location.reload();
});

/* ---- Sections in order, mapped to 3D stations ---- */
const chapterEls = [...document.querySelectorAll(".chapter")];
const sections = [
  { el: document.querySelector(".hero"), station: 0 },
  { el: document.getElementById("short"), station: 0 },
  ...chapterEls.map((el, i) => ({ el, station: i + 1 })),
  { el: document.getElementById("first"), station: 13 },
  { el: document.getElementById("evidence"), station: 13 },
  { el: document.querySelector(".principles"), station: 13 },
  { el: document.querySelector(".foot"), station: 13 },
];

/* ---- Chapter rail ---- */
const rail = document.getElementById("chapter-rail");
const railLinks = chapterEls.map((sec, i) => {
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.href = `#${sec.id}`;
  a.textContent = String(i + 1);
  const title = sec.querySelector("h2")?.textContent || "";
  a.setAttribute("aria-label", `Chapter ${i + 1}: ${title}`);
  a.title = title;
  li.appendChild(a);
  rail.appendChild(li);
  return a;
});

/* ---- SVG scenes: used in static mode and as the no-WebGL fallback.
       In 3D mode only the data panel in chapter 10 is kept. ---- */
const svgChapters = chapterEls.map((sec, i) => {
  const name = sec.dataset.scene;
  const stage = sec.querySelector("[data-stage]");
  const wanted = !useGL || sec.hasAttribute("data-panel");
  const update = wanted && name && stage && SCENES[name] ? SCENES[name](stage) : null;
  return { sec, update, i, last: -1 };
});
if (!useGL) hero(document.getElementById("hero-stage"), !staticMode);

/* ---- Larger diagram labels on small screens ---- */
if (mobile) {
  document.querySelectorAll(".stage svg text, .lab__meter svg text").forEach((t) => {
    const fs = parseFloat(t.getAttribute("font-size"));
    if (fs) t.setAttribute("font-size", (fs * 1.3).toFixed(1));
  });
}

mountLab();

/* ---- Scroll state, shared by every mode ---- */
function sectionProgress(r, vh) {
  return clamp((vh * 0.5 - r.top) / Math.max(1, r.height));
}
function readScroll() {
  const vh = window.innerHeight;
  let cur = sections[0], p = 0, chapterIdx = -1;
  for (const s of sections) {
    const r = s.el.getBoundingClientRect();
    if (r.top <= vh * 0.5 && r.bottom > vh * 0.5) { cur = s; p = sectionProgress(r, vh); }
  }
  chapterIdx = chapterEls.indexOf(cur.el);
  return { cur, p, chapterIdx, vh };
}

function updateSVG(vh, chapterIdx) {
  for (const c of svgChapters) {
    if (!c.update) continue;
    const r = c.sec.getBoundingClientRect();
    let p;
    if (staticMode) p = 1;
    else {
      if (r.bottom < -vh || r.top > vh * 2) continue;
      p = clamp((vh * 0.35 - r.top) / Math.max(1, r.height - vh * 0.9));
    }
    if (Math.abs(p - c.last) > 0.0005) { c.update(p); c.last = p; }
  }
  railLinks.forEach((a, i) => a.setAttribute("aria-current", String(i === chapterIdx)));
}

if (!useGL) {
  let ticking = false;
  const frame = () => {
    ticking = false;
    const { cur, chapterIdx, vh } = readScroll();
    const tone = cur.el.dataset?.tone || "day";
    if (body.dataset.tone !== tone) body.dataset.tone = tone;
    updateSVG(vh, chapterIdx);
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => { svgChapters.forEach((c) => (c.last = -1)); onScroll(); });
  frame();
} else {
  body.dataset.tone = "night";
  startGL();
}

async function startGL() {
  const [{ createWorld }, { default: Lenis }, { gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
    import("./gl/world.js"),
    import("lenis"),
    import("gsap"),
    import("gsap/ScrollTrigger"),
    import("gsap/SplitText"),
  ]);
  gsap.registerPlugin(ScrollTrigger, SplitText);
  await document.fonts.ready;

  let world;
  try {
    world = createWorld(document.getElementById("gl"), document.getElementById("labels"), { lite: mobile });
  } catch (e) {
    console.warn("3D failed, using illustrated version", e);
    writePref("0");
    html.classList.remove("gl");
    html.classList.add("svg");
    location.search = "";
    return;
  }

  /* ring toggles for chapter 7 */
  const rt = document.getElementById("ring-toggles");
  rt.hidden = false;
  world.rings.forEach((r, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = r.name;
    b.setAttribute("aria-pressed", "true");
    b.addEventListener("click", () => b.setAttribute("aria-pressed", String(world.toggleRing(i))));
    rt.appendChild(b);
  });
  window.addEventListener("lab:change", (e) => world.setLab(e.detail.chosen));

  /* smooth scrolling */
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  lenis.on("scroll", ScrollTrigger.update);
  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const t = id.length > 1 && document.querySelector(id);
    if (t) { e.preventDefault(); lenis.scrollTo(t, { offset: -50, duration: 2.2 }); history.replaceState(null, "", id); }
  }));

  /* text choreography */
  // Line masks clip overflow, so give each mask room below the baseline for descenders (p, g, y)
  // and a little above for accents, then cancel that room with negative margins so layout is unchanged.
  const roomy = (split) => split.masks.forEach((m) => {
    m.style.paddingBottom = "0.2em"; m.style.marginBottom = "-0.2em";
    m.style.paddingTop = "0.06em"; m.style.marginTop = "-0.06em";
  });
  const heroTitle = new SplitText("#hero-title", { type: "words,lines", mask: "lines", linesClass: "sline" });
  roomy(heroTitle);
  gsap.from(heroTitle.lines, { yPercent: 130, duration: 1.6, ease: "expo.out", stagger: 0.12, delay: 0.3 });
  gsap.from(".hero__lede, .hero__actions", { opacity: 0, y: 24, duration: 1.4, ease: "power3.out", stagger: 0.15, delay: 1.0 });

  document.querySelectorAll(".chapter__head").forEach((head) => {
    const h2 = head.querySelector("h2");
    const split = new SplitText(h2, { type: "words,lines", mask: "lines", linesClass: "sline" });
    roomy(split);
    const tl = gsap.timeline({ scrollTrigger: { trigger: head, start: "top 78%", toggleActions: "play none none reverse" } });
    tl.from(head.querySelector(".chapter__num"), { opacity: 0, y: 14, duration: 0.8, ease: "power2.out" })
      .from(split.lines, { yPercent: 130, duration: 1.3, ease: "expo.out", stagger: 0.1 }, "-=0.5");
    // title drifts up and softens as the scene takes over
    gsap.to(h2, { yPercent: -30, opacity: 0.25, ease: "none", scrollTrigger: { trigger: head, start: "center 40%", end: "bottom top", scrub: true } });
  });

  // Narration lines: words light up as you read, tied to scroll position (reversible).
  document.querySelectorAll(".narration, .closing p").forEach((el) => {
    const split = new SplitText(el, { type: "words" });
    gsap.fromTo(split.words, { opacity: 0.14 }, {
      opacity: 1, ease: "none", stagger: 0.08,
      scrollTrigger: { trigger: el, start: "top 82%", end: "top 42%", scrub: 0.6 },
    });
  });

  // Reading focus: body text is bright near the middle of the screen and dims at the edges.
  // No movement, so it never fights the camera.
  gsap.utils.toArray(".step").forEach((el) => {
    if (el.querySelector(".narration, .closing")) return;
    gsap.timeline({ scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } })
      .fromTo(el, { opacity: 0.12 }, { opacity: 1, ease: "power1.out", duration: 0.3 })
      .to(el, { opacity: 1, duration: 0.4 })
      .to(el, { opacity: 0.12, ease: "power1.in", duration: 0.3 });
  });
  gsap.utils.toArray(".short__grid > div, .claims li, .principles li, .lab, .formula, .flow > p:not(.narration), .first__item").forEach((el) => {
    gsap.from(el, { opacity: 0, y: 24, duration: 1.0, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none reverse" } });
  });

  /* panel chapter (10): data panel fades in after the camera reaches the screen */
  const panelStage = document.querySelector("#ch10 .chapter__stage");

  /* frame loop */
  let first = true;
  const snapAlways = new URLSearchParams(location.search).has("snap");
  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add((time, deltaMs) => {
    lenis.raf(time * 1000);
    const { cur, p, chapterIdx, vh } = readScroll();
    // how much of the screen a chapter title currently occupies (0..1)
    let cover = 0;
    const head = cur.el.querySelector && cur.el.querySelector(".chapter__head");
    if (head) {
      const r = head.getBoundingClientRect();
      cover = clamp(1 - Math.abs((r.top + r.height / 2) - vh / 2) / (vh * 0.6));
    }
    world.setActive(cur.station, p, cover);
    if (first || snapAlways) { world.snap(); first = false; }
    updateSVG(vh, chapterIdx);
    if (panelStage) {
      const k = cur.el.id === "ch10" ? clamp((p - 0.3) / 0.12) : 0;
      panelStage.style.opacity = k.toFixed(2);
      panelStage.style.pointerEvents = k > 0.5 ? "auto" : "none";
    }
    world.tick(Math.min(0.1, deltaMs / 1000), deltaMs / 1000);
  });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) ScrollTrigger.refresh(); });
}
