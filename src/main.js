import "./styles.css";
import { SCENES, hero } from "./scenes.js";
import { mountLab } from "./lab.js";
import { clamp } from "./svg.js";

const html = document.documentElement;
const body = document.body;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function readPref() {
  try { return localStorage.getItem("static-mode"); } catch { return null; }
}
function writePref(v) {
  try { localStorage.setItem("static-mode", v); } catch { /* storage unavailable */ }
}

let staticMode = readPref() === null ? reduced : readPref() === "1";
if (new URLSearchParams(location.search).has("static")) staticMode = true;

/* ---- Hero ---- */
hero(document.getElementById("hero-stage"), !staticMode && !reduced);

/* ---- Chapters ---- */
const chapters = [...document.querySelectorAll(".chapter")].map((sec, i) => {
  const name = sec.dataset.scene;
  const stage = sec.querySelector("[data-stage]");
  const update = name && stage && SCENES[name] ? SCENES[name](stage) : null;
  return { sec, update, i, last: -1 };
});

/* ---- Larger diagram labels on small screens ---- */
if (window.matchMedia("(max-width: 860px)").matches) {
  document.querySelectorAll(".stage svg text, .lab__meter svg text").forEach((t) => {
    const fs = parseFloat(t.getAttribute("font-size"));
    if (fs) t.setAttribute("font-size", (fs * 1.3).toFixed(1));
  });
}

/* ---- Chapter rail ---- */
const rail = document.getElementById("chapter-rail");
const railLinks = chapters.map(({ sec, i }) => {
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

/* ---- Mode toggle ---- */
const toggle = document.getElementById("mode-toggle");
function applyMode() {
  html.classList.toggle("static", staticMode);
  toggle.setAttribute("aria-pressed", String(staticMode));
  toggle.textContent = staticMode ? "Turn animation on" : "Read without animation";
  chapters.forEach((c) => (c.last = -1));
  frame();
}
toggle.addEventListener("click", () => {
  staticMode = !staticMode;
  writePref(staticMode ? "1" : "0");
  applyMode();
});

/* ---- One scroll controller for everything ---- */
let ticking = false;
function frame() {
  ticking = false;
  const vh = window.innerHeight;
  let current = -1;
  let tone = "day";
  for (const c of chapters) {
    const r = c.sec.getBoundingClientRect();
    if (r.top <= vh * 0.5 && r.bottom > vh * 0.5) {
      current = c.i;
      tone = c.sec.dataset.tone || "day";
    }
    if (!c.update) continue;
    let p;
    if (staticMode) p = 1;
    else {
      if (r.bottom < -vh || r.top > vh * 2) continue;
      p = clamp((vh * 0.35 - r.top) / Math.max(1, r.height - vh * 0.9));
    }
    if (Math.abs(p - c.last) > 0.0005) {
      c.update(p);
      c.last = p;
    }
  }
  if (body.dataset.tone !== tone) body.dataset.tone = tone;
  railLinks.forEach((a, i) => a.setAttribute("aria-current", String(i === current)));
}
function onScroll() {
  if (!ticking) { ticking = true; requestAnimationFrame(frame); }
}
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", () => { chapters.forEach((c) => (c.last = -1)); onScroll(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) onScroll(); });

mountLab();
applyMode();
