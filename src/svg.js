export const NS = "http://www.w3.org/2000/svg";

export function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

export function text(parent, x, y, str, attrs = {}) {
  const t = el("text", { x, y, ...attrs }, parent);
  t.textContent = str;
  return t;
}

/** Multi-line text; lines is an array of strings. */
export function lines(parent, x, y, arr, lh = 18, attrs = {}) {
  const t = el("text", { x, y, ...attrs }, parent);
  arr.forEach((s, i) => {
    const sp = el("tspan", { x, dy: i === 0 ? 0 : lh }, t);
    sp.textContent = s;
  });
  return t;
}

export function root(stage, w, h, label) {
  stage.textContent = "";
  return el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": label }, stage);
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** Local progress of p within [a, b]. */
export const seg = (p, a, b) => clamp((p - a) / (b - a));
export const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const lerp = (a, b, t) => a + (b - a) * t;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hatch(svg, id) {
  const defs = el("defs", {}, svg);
  const pat = el("pattern", { id, width: 6, height: 6, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
  el("line", { x1: 0, y1: 0, x2: 0, y2: 6, class: "ln-soft", "stroke-width": 2 }, pat);
  return `url(#${id})`;
}

/** Path drawn up to fraction f using stroke-dash. Call after the path is in the DOM. */
export function drawTo(path, f) {
  const L = path.__len || (path.__len = path.getTotalLength());
  path.style.strokeDasharray = `${L} ${L}`;
  path.style.strokeDashoffset = `${L * (1 - f)}`;
}
