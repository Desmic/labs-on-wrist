import { el, text, lines, root, seg, ease, lerp, rng, hatch, drawTo, clamp } from "./svg.js";

const W = 640;
const H = 560;
const show = (node, o) => { node.style.opacity = o; };

/* ---------------- Hero: 90 days, two visits ---------------- */
export function hero(stage, animate) {
  const narrow = window.innerWidth < 700;
  const VW = narrow ? 560 : 1200;
  const svg = root(stage, VW, 150, "A ninety-day timeline with only two clinic visits marked.");
  const x0 = 10, x1 = VW - 10, y = 78;
  const dx = (x1 - x0) / 89;
  const ticks = el("g", {}, svg);
  for (let d = 0; d < 90; d++) {
    el("line", { x1: x0 + d * dx, x2: x0 + d * dx, y1: y - 5, y2: y + 5, class: "ln-soft", "stroke-width": 1.5 }, ticks);
  }
  const thread = el("path", { d: `M${x0} ${y} H${x1}`, class: "ln-life", "stroke-width": 2.5 }, svg);
  const months = ["August", "September", "October"];
  months.forEach((m, i) => text(svg, x0 + i * 30 * dx, y + 42, m, { "font-size": narrow ? 22 : 15 }));
  const visits = el("g", {}, svg);
  [6, 84].forEach((d) => {
    const cx = x0 + d * dx;
    el("circle", { cx, cy: y, r: 8, class: "f-life" }, visits);
    text(visits, cx, y - 24, "Clinic visit", { "font-size": narrow ? 22 : 15, "text-anchor": d < 45 ? "start" : "end", class: "t-strong", dx: d < 45 ? -10 : 10 });
  });
  if (animate) {
    drawTo(thread, 0);
    show(visits, 0);
    thread.style.transition = "stroke-dashoffset 1.8s cubic-bezier(.6,0,.2,1)";
    visits.style.transition = "opacity .6s ease 1.7s";
    requestAnimationFrame(() => requestAnimationFrame(() => { drawTo(thread, 1); show(visits, 1); }));
  }
}

/* ---------------- Ch1: a day ---------------- */
const MOMENTS = [
  [6.7, "Wakes up"],
  [7.3, "Chai on the balcony"],
  [9.5, "Site visit"],
  [13.2, "Lunch with the team"],
  [18.5, "Cricket with friends"],
  [23, "Sleep"],
];

function dayStrip(svg, opts = {}) {
  const x0 = 40, x1 = 600, y = 400;
  const hx = (h) => x0 + ((h - 6) / 18) * (x1 - x0);
  el("path", { d: `M${x0} ${y} H${x1}`, class: "ln-soft", "stroke-width": 2 }, svg);
  const done = el("path", { d: `M${x0} ${y} H${x1}`, class: "ln-life", "stroke-width": 3 }, svg);
  [6, 12, 18, 24].forEach((h) => text(svg, hx(h), y + 34, `${h === 24 ? "Midnight" : h + ":00"}`, { "font-size": 13, "text-anchor": "middle" }));
  // sun arc
  const cx = 320, rx = 270, ry = 230, cy = y - 20;
  el("path", { d: `M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`, class: "ln-soft", "stroke-width": 1, "stroke-dasharray": "2 6" }, svg);
  const sun = el("circle", { r: 20, class: "f-life" }, svg);
  const marks = MOMENTS.map(([h, label], i) => {
    const g = el("g", {}, svg);
    const x = hx(h);
    const ly = y - [44, 132, 88, 44, 88, 132][i];
    el("line", { x1: x, x2: x, y1: y, y2: ly + 8, class: "ln-soft", "stroke-width": 1 }, g);
    el("circle", { cx: x, cy: y, r: 5, class: "f-life" }, g);
    text(g, x, ly, label, { "font-size": 14, "text-anchor": i <= 1 ? "start" : i === MOMENTS.length - 1 ? "end" : "middle", class: "t-strong" });
    return { g, h };
  });
  return (p) => {
    const hour = 6 + p * 17.6;
    drawTo(done, clamp((hour - 6) / 18));
    const t = clamp((hour - 6) / 18);
    const ang = Math.PI * (1 - t);
    sun.setAttribute("cx", cx + rx * Math.cos(ang));
    sun.setAttribute("cy", cy - ry * Math.sin(ang));
    show(sun, hour > 20 ? clamp(1 - (hour - 20) / 3) : 1);
    marks.forEach(({ g, h }) => show(g, hour >= h ? 1 : 0.12));
    if (opts.extra) opts.extra(p, hour);
  };
}

export function day(stage) {
  const svg = root(stage, W, H, "Aarav's day from 6 a.m. to midnight: chai, a site visit, lunch, cricket, sleep.");
  text(svg, 40, 70, "Tuesday", { "font-size": 15 });
  text(svg, 40, 104, "Aarav", { class: "t-serif", "font-size": 34 });
  return dayStrip(svg);
}

/* ---------------- Ch2: a night ---------------- */
export function night(stage) {
  const svg = root(stage, W, H, "A night timeline from 10 p.m. to 8 a.m. with an unexplained gap around 3 a.m.");
  const x0 = 40, x1 = 600, y = 330;
  const hx = (h) => x0 + (((h < 22 ? h + 24 : h) - 22) / 10) * (x1 - x0);
  // moon
  const moon = el("g", { transform: "translate(500 110)" }, svg);
  el("circle", { r: 26, fill: "var(--fg)", opacity: 0.9 }, moon);
  el("circle", { r: 24, cx: 12, cy: -8, fill: "var(--bg)" }, moon);
  el("path", { d: `M${x0} ${y} H${x1}`, class: "ln-soft", "stroke-width": 2 }, svg);
  const before = el("path", { d: `M${hx(22)} ${y} H${hx(2.8)}`, class: "ln-life", "stroke-width": 3 }, svg);
  const after = el("path", { d: `M${hx(3.6)} ${y} H${hx(8)}`, class: "ln-life", "stroke-width": 3 }, svg);
  [22, 0, 2, 4, 6, 8].forEach((h) => text(svg, hx(h), y + 34, h === 0 ? "Midnight" : `${h}:00`, { "font-size": 13, "text-anchor": "middle" }));
  // sleep band
  el("rect", { x: hx(23), y: y - 18, width: hx(6.8) - hx(23), height: 6, class: "f-panel", rx: 3 }, svg);
  text(svg, hx(23), y - 26, "Asleep", { "font-size": 13 });
  // gap
  const gap = el("g", {}, svg);
  el("path", { d: `M${hx(2.8)} ${y} H${hx(3.6)}`, class: "ln", "stroke-width": 2, "stroke-dasharray": "3 5" }, gap);
  el("circle", { cx: hx(3.2), cy: y, r: 16, class: "f-bg", stroke: "var(--life)", "stroke-width": 2 }, gap);
  text(gap, hx(3.2), y + 5, "?", { "font-size": 16, "text-anchor": "middle", class: "t-strong" });
  lines(gap, hx(3.2), y - 130, ["Around 3 a.m.", "Something may have happened.", "Nobody saw."], 20, { "font-size": 15, "text-anchor": "middle", class: "t-strong" });
  el("line", { x1: hx(3.2), x2: hx(3.2), y1: y - 75, y2: y - 20, class: "ln-soft" }, gap);
  const morning = el("g", {}, svg);
  lines(morning, hx(8), y + 90, ["Wakes tired and sore.", "Doesn't remember the night."], 20, { "font-size": 15, "text-anchor": "end", class: "t-strong" });
  el("line", { x1: hx(7.2), x2: hx(7.2), y1: y + 8, y2: y + 70, class: "ln-soft" }, morning);
  const work = text(svg, hx(8), y + 160, "Goes to work anyway.", { "font-size": 15, "text-anchor": "end" });
  return (p) => {
    drawTo(before, seg(p, 0, 0.3));
    drawTo(after, seg(p, 0.45, 0.7));
    show(gap, seg(p, 0.28, 0.42));
    show(morning, seg(p, 0.6, 0.72));
    show(work, seg(p, 0.75, 0.85));
  };
}

/* ---------------- Ch3: the clinic ---------------- */
export function clinic(stage) {
  const svg = root(stage, W, H, "Questions from the neurologist, then a ninety-day timeline where the clinic sees only two short visits.");
  const qs = ["How many events since last time?", "How have you been sleeping?", "Any side effects since the dose change?"];
  const qn = qs.map((q, i) => text(svg, 40, 90 + i * 44, q, { class: "t-serif", "font-size": 22 }));
  const ans = text(svg, 80, 250, "“Maybe two? I think I slept okay.”", { class: "t-serif", "font-size": 22, "font-style": "italic", fill: "var(--life)" });
  ans.style.fill = "var(--life)";
  const tl = el("g", {}, svg);
  const x0 = 40, x1 = 600, y = 420, dx = (x1 - x0) / 89;
  for (let d = 0; d < 90; d++) el("line", { x1: x0 + d * dx, x2: x0 + d * dx, y1: y - 4, y2: y + 4, class: "ln-soft" }, tl);
  el("path", { d: `M${x0} ${y} H${x1}`, class: "ln-soft", "stroke-width": 2 }, tl);
  [0, 89].forEach((d) => {
    el("circle", { cx: x0 + d * dx, cy: y, r: 7, class: "f-life" }, tl);
  });
  text(tl, x0, y - 22, "Last visit", { "font-size": 13, class: "t-strong" });
  text(tl, x1, y - 22, "Today", { "font-size": 13, class: "t-strong", "text-anchor": "end" });
  lines(tl, 40, y + 50, ["Two visits, about 40 minutes, out of 90 days.", "That's roughly 0.03% of his time."], 22, { "font-size": 16 });
  return (p) => {
    qn.forEach((n, i) => show(n, p < 0.55 ? seg(p, i * 0.1, i * 0.1 + 0.1) : lerp(1, 0.35, seg(p, 0.55, 0.7))));
    show(ans, p < 0.55 ? seg(p, 0.3, 0.42) : lerp(1, 0.35, seg(p, 0.55, 0.7)));
    show(tl, seg(p, 0.5, 0.66));
  };
}

/* ---------------- Ch4: fragments ---------------- */
const FRAGS = [
  { d: 8, a: "EEG report", b: "Hospital, March" },
  { d: 20, a: "Prescription", b: "Dose increased" },
  { d: 36, a: "Note on his phone", b: "“felt strange on the bus”" },
  { d: 49, a: "Sleep app", b: "Not opened in weeks" },
  { d: 61, a: "Message from Maa", b: "“you sounded confused”" },
  { d: 76, a: "Pill box", b: "Evening dose missed" },
];

export function fragments(stage) {
  const svg = root(stage, W, H, "Six scattered pieces of Aarav's health story that gradually line up along one timeline.");
  const x0 = 40, x1 = 600, y = 480, dx = (x1 - x0) / 89;
  const thread = el("path", { d: `M${x0} ${y} H${x1}`, class: "ln-life", "stroke-width": 2.5 }, svg);
  const r = rng(7);
  const cards = FRAGS.map((f, i) => {
    const g = el("g", {}, svg);
    const stem = el("line", { class: "ln-soft", "stroke-dasharray": "2 4" }, svg);
    el("rect", { x: -86, y: -30, width: 172, height: 60, rx: 4, class: "f-panel", stroke: "var(--rule)" }, g);
    text(g, -74, -6, f.a, { "font-size": 14, class: "t-strong" });
    text(g, -74, 15, f.b, { "font-size": 12.5 });
    const start = { x: 90 + r() * 460, y: 70 + r() * 300, rot: (r() - 0.5) * 22 };
    const tx = clamp(x0 + f.d * dx, 126, 514);
    const end = { x: tx, y: i % 2 === 0 ? 300 : 395, rot: 0 };
    const dot = el("circle", { cx: x0 + f.d * dx, cy: y, r: 5, class: "f-life" }, svg);
    return { g, stem, dot, start, end, f };
  });
  return (p) => {
    const t = ease(seg(p, 0.3, 0.85));
    drawTo(thread, seg(p, 0.6, 0.9));
    cards.forEach(({ g, stem, dot, start, end, f }) => {
      const x = lerp(start.x, end.x, t), yy = lerp(start.y, end.y, t), rot = lerp(start.rot, end.rot, t);
      g.setAttribute("transform", `translate(${x} ${yy}) rotate(${rot})`);
      const k = seg(p, 0.7, 0.9);
      stem.setAttribute("x1", x); stem.setAttribute("y1", yy + 30);
      stem.setAttribute("x2", x0 + f.d * dx); stem.setAttribute("y2", y);
      show(stem, k); show(dot, k);
    });
  };
}

/* ---------------- Ch5: wearing the band ---------------- */
function band(svg, cx, cy, s = 1) {
  const g = el("g", { transform: `translate(${cx} ${cy}) scale(${s})` }, svg);
  el("path", { d: "M-150 -18 C-60 -30 60 -30 150 -18 L150 18 C60 30 -60 30 -150 18 Z", class: "f-panel", stroke: "var(--rule)", "stroke-width": 1.5 }, g);
  el("rect", { x: -52, y: -36, width: 104, height: 72, rx: 22, class: "f-fg" }, g);
  el("rect", { x: -44, y: -28, width: 88, height: 56, rx: 16, fill: "var(--bg)", opacity: 0.12 }, g);
  el("circle", { cx: 0, cy: 0, r: 11, fill: "var(--life)" }, g);
  el("circle", { cx: 0, cy: 0, r: 15, fill: "none", stroke: "var(--life)", "stroke-width": 1.5, opacity: 0.6 }, g);
  return g;
}

export function wear(stage) {
  const svg = root(stage, W, H, "A simple wrist band, and a week of synthetic activity with gaps when it was charging or not worn.");
  band(svg, 320, 110, 1);
  text(svg, 320, 182, "SOS button in the middle. Press and hold.", { "font-size": 13, "text-anchor": "middle" });
  const x0 = 40, x1 = 600, base = 420, days = 7, dW = (x1 - x0) / days;
  const fill = hatch(svg, "h5");
  const gaps = [[2.75, 3.05, "Charging"], [4.4, 5.5, "Not worn"]];
  gaps.forEach(([a, b, label]) => {
    el("rect", { x: x0 + a * dW, y: base - 120, width: (b - a) * dW, height: 120, fill }, svg);
    text(svg, x0 + ((a + b) / 2) * dW, base - 128, label, { "font-size": 12, "text-anchor": "middle" });
  });
  const r = rng(11);
  let d = "";
  const N = 420;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * days;
    const inGap = gaps.some(([a, b]) => t > a && t < b);
    const hour = (t % 1) * 24;
    const awake = hour > 6.5 && hour < 23;
    const act = awake ? 30 + 45 * Math.abs(Math.sin(hour / 2.2)) + r() * 22 : 4 + r() * 5;
    const x = x0 + t * dW, yy = base - act;
    d += inGap ? ` M${x.toFixed(1)} ${base}` : `${i === 0 ? "M" : " L"}${x.toFixed(1)} ${yy.toFixed(1)}`;
  }
  const sig = el("path", { d, class: "ln-signal", "stroke-width": 1.4, "stroke-linejoin": "round" }, svg);
  el("path", { d: `M${x0} ${base} H${x1}`, class: "ln-soft" }, svg);
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((n, i) => text(svg, x0 + (i + 0.5) * dW, base + 26, n, { "font-size": 13, "text-anchor": "middle" }));
  text(svg, x0, base - 150, "Movement, a week", { "font-size": 13, class: "t-strong" });
  const note = el("g", {}, svg);
  const nx = x0 + 3.62 * dW;
  el("path", { d: `M${nx} ${base + 44} l7 7 l-7 7 l-7 -7 z`, class: "f-life" }, note);
  lines(note, nx + 14, base + 56, ["Tapped the band:", "“felt odd on the bus”"], 17, { "font-size": 13, class: "t-strong" });
  return (p) => {
    drawTo(sig, seg(p, 0.15, 0.75));
    show(note, seg(p, 0.45, 0.55));
  };
}

/* ---------------- Ch6: exploded device ---------------- */
const LAYERS = [
  { name: "SOS button", sub: "Fixed from day one: help at a press", kind: "direct" },
  { name: "Feedback", sub: "Vibration you can feel", kind: "parts" },
  { name: "Processor and memory", sub: "Works offline, syncs to the phone", kind: "parts" },
  { name: "Power", sub: "Days between charges", kind: "parts" },
  { name: "Sensing layer", sub: "What goes here is decided by experiments", kind: "direct" },
  { name: "Skin contact", sub: "Candidate sensors under test", kind: "direct" },
];

function slab(g, cx, cy, w, dpt, t, cls) {
  const top = `${cx},${cy - dpt / 2} ${cx + w / 2},${cy} ${cx},${cy + dpt / 2} ${cx - w / 2},${cy}`;
  el("polygon", { points: `${cx - w / 2},${cy} ${cx},${cy + dpt / 2} ${cx},${cy + dpt / 2 + t} ${cx - w / 2},${cy + t}`, fill: "var(--fg)", opacity: 0.35 }, g);
  el("polygon", { points: `${cx + w / 2},${cy} ${cx},${cy + dpt / 2} ${cx},${cy + dpt / 2 + t} ${cx + w / 2},${cy + t}`, fill: "var(--fg)", opacity: 0.55 }, g);
  el("polygon", { points: top, class: cls, stroke: "var(--fg)", "stroke-width": 1, "stroke-opacity": 0.4 }, g);
}

export function device(stage) {
  const svg = root(stage, W, H, "An exploded view of the wrist band showing six layers from the cover down to the sensors that touch the skin.");
  const cx = 160, w = 210, dpt = 105;
  const parts = LAYERS.map((L, i) => {
    const g = el("g", {}, svg);
    const cls = i === 0 ? "f-fg" : i === 5 ? "f-signal" : "f-panel";
    slab(g, cx, 0, w, dpt, i === 3 ? 16 : 7, cls);
    if (i === 0) el("ellipse", { cx, cy: 0, rx: 20, ry: 10, fill: "var(--life)" }, g);
    if (i === 1) el("ellipse", { cx: cx + 40, cy: 0, rx: 14, ry: 7, fill: "var(--fg)", opacity: 0.6 }, g);
    if (i === 2) { slab(g, cx - 10, -4, 60, 30, 4, "f-fg"); slab(g, cx + 48, 6, 28, 14, 3, "f-fg"); }
    if (i === 4) slab(g, cx + 20, -2, 34, 17, 4, "f-signal");
    if (i === 5) [[-24, 0], [0, -6], [24, 0]].forEach(([ox, oy]) => el("ellipse", { cx: cx + ox, cy: oy, rx: 7, ry: 3.5, fill: "var(--bg)" }, g));
    const lab = el("g", {}, svg);
    const leader = el("line", { class: "ln-soft" }, lab);
    const nm = text(lab, 310, 0, L.name, { "font-size": 15, class: "t-strong" });
    const sb = text(lab, 310, 0, L.sub, { "font-size": 13 });
    return { g, lab, leader, nm, sb, i };
  });
  const n = LAYERS.length;
  return (p) => {
    const spread = ease(seg(p, 0.05, 0.6));
    const gap = lerp(12, 74, spread);
    const total = gap * (n - 1);
    const top = 290 - total / 2;
    parts.forEach(({ g, lab, leader, nm, sb, i }) => {
      const y = top + i * gap;
      g.setAttribute("transform", `translate(0 ${y})`);
      leader.setAttribute("x1", cx + w / 2 + 6); leader.setAttribute("y1", y);
      leader.setAttribute("x2", 300); leader.setAttribute("y2", y);
      nm.setAttribute("y", y - 3); sb.setAttribute("y", y + 15);
      show(lab, seg(p, 0.35 + i * 0.05, 0.45 + i * 0.05));
    });
  };
}

/* ---------------- Ch7: layers ---------------- */
const TRACKS = [
  { id: "move", name: "Movement", src: "band", type: "line", seed: 3, base: 0.55, amp: 0.3 },
  { id: "pulse", name: "Pulse", src: "band, estimated", type: "line", seed: 5, base: 0.5, amp: 0.15 },
  { id: "sleep", name: "Sleep", src: "band, estimated", type: "bars", seed: 9 },
  { id: "temp", name: "Daily routine", src: "phone and Aarav", type: "line", seed: 13, base: 0.5, amp: 0.1 },
  { id: "felt", name: "Mood and stress", src: "Aarav", type: "dots", days: [2, 5, 9, 10, 16, 21, 22, 27] },
  { id: "meds", name: "Medication", src: "Aarav and clinic", type: "step", change: 18 },
  { id: "events", name: "Possible events", src: "band, unconfirmed", type: "events", days: [9, 21] },
  { id: "clinic", name: "Clinic results", src: "clinic", type: "squares", days: [1, 28] },
];

export function layers(stage) {
  const wrap = document.createElement("div");
  wrap.className = "stage__wrap";
  stage.textContent = "";
  stage.appendChild(wrap);
  const holder = document.createElement("div");
  wrap.appendChild(holder);
  const svg = root(holder, W, 600, "Eight layers of synthetic data over thirty days, including gaps when the band was not worn.");
  const fill = hatch(svg, "h7");
  const x0 = 190, x1 = 620, top = 30, rowH = 62, days = 30, dW = (x1 - x0) / days;
  const gapA = 12, gapB = 15.5;
  const devTrack = (t) => t.src.startsWith("band");
  const rows = TRACKS.map((t, i) => {
    const g = el("g", { transform: `translate(0 ${top + i * rowH})` }, svg);
    text(g, 0, 26, t.name, { "font-size": 14, class: "t-strong" });
    text(g, 0, 44, t.src, { "font-size": 12 });
    el("line", { x1: x0, x2: x1, y1: 50, y2: 50, class: "ln-soft" }, g);
    if (devTrack(t)) el("rect", { x: x0 + gapA * dW, y: 6, width: (gapB - gapA) * dW, height: 44, fill }, g);
    const r = rng(t.seed || i + 1);
    if (t.type === "line") {
      let d = "";
      let pen = false;
      for (let k = 0; k <= 120; k++) {
        const day = (k / 120) * days;
        const x = x0 + day * dW;
        if (day > gapA && day < gapB) { pen = false; continue; }
        const v = t.base + t.amp * Math.sin(day / 2.1 + t.seed) + (r() - 0.5) * t.amp;
        d += `${pen ? " L" : " M"}${x.toFixed(1)} ${(50 - v * 42).toFixed(1)}`;
        pen = true;
      }
      el("path", { d, class: "ln-signal", "stroke-width": 1.4 }, g);
    } else if (t.type === "bars") {
      for (let k = 0; k < days; k++) {
        if (k + 0.5 > gapA && k + 0.5 < gapB) continue;
        const h = (k >= 18 ? 18 : 26) + r() * 12;
        el("rect", { x: x0 + k * dW + 2, y: 50 - h, width: dW - 4, height: h, class: "f-signal", opacity: 0.7 }, g);
      }
    } else if (t.type === "dots") {
      t.days.forEach((d) => el("circle", { cx: x0 + d * dW, cy: 30, r: 5, class: "f-life" }, g));
    } else if (t.type === "step") {
      el("path", { d: `M${x0} 36 H${x0 + t.change * dW} V22 H${x1}`, class: "ln-life", "stroke-width": 2 }, g);
      text(g, x0 + t.change * dW + 6, 16, "Dose changed", { "font-size": 12 });
    } else if (t.type === "events") {
      t.days.forEach((d) => el("path", { d: `M${x0 + d * dW} 20 l9 9 l-9 9 l-9 -9 z`, fill: "none", stroke: "var(--life)", "stroke-width": 2 }, g));
    } else if (t.type === "squares") {
      t.days.forEach((d) => el("rect", { x: x0 + d * dW - 6, y: 23, width: 12, height: 12, class: "f-fg" }, g));
    }
    return { g, t, on: true };
  });
  const axis = el("g", { transform: `translate(0 ${top + TRACKS.length * rowH + 4})` }, svg);
  [1, 10, 20, 30].forEach((d) => text(axis, x0 + (d - 0.5) * dW, 14, `Day ${d}`, { "font-size": 12, "text-anchor": "middle" }));
  text(axis, x0 + ((gapA + gapB) / 2) * dW, 34, "Shaded: band not worn", { "font-size": 12, "text-anchor": "middle" });

  const toggles = document.createElement("div");
  toggles.className = "layer-toggles";
  toggles.setAttribute("role", "group");
  toggles.setAttribute("aria-label", "Show or hide layers");
  rows.forEach((row) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = row.t.name;
    b.setAttribute("aria-pressed", "true");
    b.addEventListener("click", () => {
      row.on = !row.on;
      b.setAttribute("aria-pressed", String(row.on));
      last !== null && update(last);
    });
    toggles.appendChild(b);
  });
  wrap.appendChild(toggles);
  let last = null;
  const update = (p) => {
    last = p;
    rows.forEach((row, i) => {
      const reveal = seg(p, i * 0.07, i * 0.07 + 0.08);
      show(row.g, row.on ? reveal : 0.08 * reveal);
    });
  };
  return update;
}

/* ---------------- Ch8: the calibration loop ---------------- */
const LOOP = [
  ["Collect", "Band and reference test record at the same moment"],
  ["Check quality", "Throw out readings ruined by movement or a loose strap"],
  ["Compare", "Pulse vs ECG. Movement events vs video-EEG. Sleep vs a sleep lab"],
  ["Calibrate", "Adjust the model for one narrow, defined question"],
  ["Validate", "Test on people the system has never seen"],
  ["Improve", "Better hardware and models, version by version"],
];

export function loop(stage) {
  const svg = root(stage, W, H, "A six-step loop: collect, check quality, compare, calibrate, validate, improve, then repeat.");
  const cx = 320, cy = 270, R = 190;
  const ring = el("circle", { cx, cy, r: R, class: "ln-soft", "stroke-width": 2 }, svg);
  const arc = el("circle", { cx, cy, r: R, class: "ln-life", "stroke-width": 3, transform: `rotate(-90 ${cx} ${cy})` }, svg);
  const nodes = LOOP.map(([name], i) => {
    const a = -Math.PI / 2 + (i / LOOP.length) * Math.PI * 2;
    const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
    const dot = el("circle", { cx: x, cy: y, r: 9, class: "f-bg", stroke: "var(--fg)", "stroke-width": 2 }, svg);
    const right = Math.cos(a) > 0.2, left = Math.cos(a) < -0.2;
    const lbl = text(svg, x + (right ? 18 : left ? -18 : 0), y + (Math.sin(a) < -0.5 ? -18 : Math.sin(a) > 0.5 ? 30 : 5), name, {
      "font-size": 15, class: "t-strong", "text-anchor": right ? "start" : left ? "end" : "middle",
    });
    return { dot, lbl };
  });
  const title = text(svg, cx, cy - 8, "", { class: "t-serif", "font-size": 24, "text-anchor": "middle" });
  const detail = el("text", { x: cx, y: cy + 24, "font-size": 14, "text-anchor": "middle" }, svg);
  const L = 2 * Math.PI * R;
  arc.style.strokeDasharray = `${L} ${L}`;
  void ring;
  return (p) => {
    const k = clamp(p * 1.05);
    arc.style.strokeDashoffset = `${L * (1 - k)}`;
    const idx = Math.min(LOOP.length - 1, Math.floor(k * LOOP.length));
    nodes.forEach(({ dot, lbl }, i) => {
      dot.setAttribute("fill", i <= idx ? "var(--life)" : "var(--bg)");
      dot.setAttribute("stroke", i <= idx ? "var(--life)" : "var(--fg)");
      show(lbl, i === idx ? 1 : 0.55);
    });
    const [nm, det] = k >= 0.999 ? ["Repeat", "Each round makes the next version better"] : LOOP[idx];
    if (title.textContent !== nm) {
      title.textContent = nm;
      detail.textContent = "";
      wrapText(detail, det, 30, cx);
    }
  };
}

function wrapText(node, str, max, x) {
  const words = str.split(" ");
  let line = "", i = 0;
  const flush = () => { const sp = el("tspan", { x, dy: i === 0 ? 0 : 19 }, node); sp.textContent = line; i++; line = ""; };
  words.forEach((w) => { if ((line + " " + w).trim().length > max) flush(); line = (line + " " + w).trim(); });
  if (line) flush();
}

/* ---------------- Ch10: the next appointment ---------------- */
export function appointment(stage) {
  const wrap = document.createElement("div");
  wrap.className = "stage__wrap";
  stage.textContent = "";
  stage.appendChild(wrap);
  const tg = document.createElement("div");
  tg.className = "view-toggle";
  tg.setAttribute("role", "group");
  tg.setAttribute("aria-label", "Compare views");
  const bBefore = document.createElement("button");
  const bAfter = document.createElement("button");
  bBefore.type = bAfter.type = "button";
  bBefore.textContent = "What the clinic had before";
  bAfter.textContent = "With the shared timeline";
  tg.append(bBefore, bAfter);
  wrap.appendChild(tg);
  const holder = document.createElement("div");
  wrap.appendChild(holder);
  const svg = root(holder, W, 500, "The doctor's view of thirty days: possible events marked unconfirmed, days not worn, shorter sleep after a dose change, and Aarav's notes.");
  const fill = hatch(svg, "h10");
  const x0 = 40, x1 = 600, days = 30, dW = (x1 - x0) / days;
  const X = (d) => x0 + d * dW;

  const before = el("g", {}, svg);
  el("path", { d: `M${x0} 300 H${x1}`, class: "ln-soft", "stroke-width": 2 }, before);
  el("circle", { cx: x0, cy: 300, r: 7, class: "f-life" }, before);
  el("circle", { cx: x1, cy: 300, r: 7, class: "f-life" }, before);
  text(before, 320, 250, "“Maybe two? I think I slept okay.”", { class: "t-serif", "font-size": 21, "text-anchor": "middle", "font-style": "italic" });
  text(before, 320, 350, "Everything else depends on memory.", { "font-size": 14, "text-anchor": "middle" });

  const after = el("g", {}, svg);
  const share = el("g", {}, after);
  el("rect", { x: x0, y: 2, width: x1 - x0, height: 56, rx: 4, class: "f-panel" }, share);
  lines(share, x0 + 14, 25, ["Shared with Dr. Mehta until 30 September.", "Aarav can stop sharing at any time."], 18, { "font-size": 13 });

  const rows = [];
  const row = (y, name, src) => {
    const g = el("g", { transform: `translate(0 ${y})` }, after);
    text(g, x0, 0, name, { "font-size": 13, class: "t-strong" });
    text(g, x1, 0, src, { "font-size": 12, "text-anchor": "end" });
    el("line", { x1: x0, x2: x1, y1: 50, y2: 50, class: "ln-soft" }, g);
    rows.push(g);
    return g;
  };
  // notes
  const notes = row(80, "Aarav's notes", "his words");
  [[4, "tired"], [9, "sore, bad night"], [21, "felt odd on bus"]].forEach(([d, s]) => {
    el("circle", { cx: X(d), cy: 34, r: 4, class: "f-life" }, notes);
    text(notes, X(d) + 8, 38, s, { "font-size": 12 });
  });
  // possible events
  const ev = row(150, "Possible events", "band, unconfirmed");
  [9, 21].forEach((d) => {
    el("path", { d: `M${X(d)} 22 l9 9 l-9 9 l-9 -9 z`, fill: "none", stroke: "var(--life)", "stroke-width": 2 }, ev);
    text(ev, X(d) + 14, 36, "night, about 2 min", { "font-size": 12 });
  });
  // sleep
  const sl = row(220, "Sleep", "band, estimated");
  const r = rng(21);
  for (let k = 0; k < days; k++) {
    if (k >= 12 && k < 16) continue;
    const h = (k >= 18 ? 16 : 26) + r() * 10;
    el("rect", { x: X(k) + 2, y: 50 - h, width: dW - 4, height: h, class: "f-signal", opacity: 0.7 }, sl);
  }
  el("rect", { x: X(12), y: 8, width: 4 * dW, height: 42, fill }, sl);
  text(sl, X(14), 4, "not worn", { "font-size": 12, "text-anchor": "middle" });
  // meds
  const md = row(290, "Medication", "clinic record");
  el("path", { d: `M${x0} 38 H${X(18)} V24 H${x1}`, class: "ln-life", "stroke-width": 2 }, md);
  text(md, X(18) + 6, 18, "dose increased", { "font-size": 12 });
  // clinician
  const cl = el("g", { transform: "translate(0 370)" }, after);
  el("line", { x1: x0, x2: x1, y1: 0, y2: 0, class: "ln" }, cl);
  lines(cl, x0, 30, ["Dr. Mehta's note: “Sleep shorter since the dose change.", "Ask about side effects. Consider an EEG for the night events.”"], 20, { class: "t-serif", "font-size": 16 });
  rows.push(cl);
  [1, 10, 20, 30].forEach((d) => text(after, X(d - 0.5), 470, `Day ${d}`, { "font-size": 12, "text-anchor": "middle" }));

  let mode = "after";
  let last = 1;
  const setMode = (m) => {
    mode = m;
    bBefore.setAttribute("aria-pressed", String(m === "before"));
    bAfter.setAttribute("aria-pressed", String(m === "after"));
    update(last);
  };
  bBefore.addEventListener("click", () => setMode("before"));
  bAfter.addEventListener("click", () => setMode("after"));
  const update = (p) => {
    last = p;
    show(before, mode === "before" ? 1 : 0);
    show(after, mode === "after" ? 1 : 0);
    show(share, seg(p, 0.0, 0.1));
    rows.forEach((g, i) => show(g, seg(p, 0.05 + i * 0.08, 0.13 + i * 0.08)));
  };
  setMode("after");
  return update;
}

/* ---------------- Ch11: many threads ---------------- */
const PEOPLE = [
  ["Aarav, 29", "epilepsy, seizures mostly at night"],
  ["Meera, 78", "lives alone, worried about falls"],
  ["Kabir, 9", "his parents want to sleep, too"],
  ["Ananya, 24", "ADHD, wants help with routines"],
  ["Joseph, 61", "managing a long-term heart condition"],
];

export function many(stage) {
  const svg = root(stage, W, H, "Five fictional people, each with their own timeline.");
  const x0 = 40, x1 = 600;
  const threads = PEOPLE.map(([n, s], i) => {
    const y = 70 + i * 98;
    const g = el("g", {}, svg);
    text(g, x0, y, n, { class: "t-serif", "font-size": 19 });
    text(g, x0, y + 20, s, { "font-size": 13 });
    const r = rng(40 + i);
    let d = `M${x0} ${y + 50}`;
    for (let k = 1; k <= 60; k++) d += ` L${(x0 + (k / 60) * (x1 - x0)).toFixed(1)} ${(y + 50 - Math.abs(Math.sin(k / 4 + i)) * 12 - r() * 6).toFixed(1)}`;
    const path = el("path", { d, class: i === 0 ? "ln-life" : "ln-signal", "stroke-width": 1.5 }, g);
    return { g, path };
  });
  return (p) => threads.forEach(({ g, path }, i) => {
    const k = seg(p, i * 0.12, i * 0.12 + 0.3);
    show(g, k > 0 ? 1 : 0.1);
    drawTo(path, k);
  });
}

/* ---------------- Ch12: back to the day ---------------- */
export function close(stage) {
  const svg = root(stage, W, H, "Aarav's ordinary day again, with the band fading into the background.");
  text(svg, 40, 70, "Thursday", { "font-size": 15 });
  text(svg, 40, 104, "Aarav", { class: "t-serif", "font-size": 34 });
  const b = band(svg, 500, 90, 0.45);
  const upd = dayStrip(svg);
  return (p) => {
    upd(lerp(0.7, 1, p));
    show(b, lerp(1, 0.12, seg(p, 0.2, 0.8)));
  };
}

export const SCENES = { day, night, clinic, fragments, wear, device, layers, loop, appointment, many, close };
