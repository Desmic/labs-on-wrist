import { el, text } from "./svg.js";

// All values are illustrative and synthetic. They are not real accuracy figures or prices.
const SENSORS = [
  { id: "motion", name: "Motion sensor", where: "wrist", cost: 1 },
  { id: "pulse", name: "Optical pulse sensor", where: "wrist", cost: 2 },
  { id: "temp", name: "Skin temperature", where: "wrist", cost: 1 },
  { id: "eda", name: "Skin conductance", where: "wrist", cost: 2 },
  { id: "ecg", name: "Chest ECG patch", where: "on the body", cost: 6 },
  { id: "eeg", name: "Behind-the-ear EEG", where: "on the head", cost: 12 },
  { id: "blood", name: "Blood test", where: "clinic visit", cost: 25 },
  { id: "mri", name: "MRI scan", where: "hospital", cost: 400 },
];

const TASKS = [
  {
    id: "pulse",
    name: "Track resting pulse over weeks",
    hint: "A wrist sensor measures this fairly directly",
    need: 0.75,
    c: { motion: 0.1, pulse: 0.78, temp: 0.02, eda: 0, ecg: 0.95, eeg: 0, blood: 0, mri: 0 },
  },
  {
    id: "event",
    name: "Notice a possible convulsive movement at night",
    hint: "Movement carries most of the signal",
    need: 0.7,
    c: { motion: 0.66, pulse: 0.25, temp: 0.02, eda: 0.12, ecg: 0.15, eeg: 0.45, blood: 0, mri: 0 },
  },
  {
    id: "brain",
    name: "Find a specific change in brain structure",
    hint: "The kind of thing an MRI shows",
    need: 0.8,
    imaging: true,
    c: { motion: 0.05, pulse: 0.02, temp: 0, eda: 0, ecg: 0.02, eeg: 0.06, blood: 0.03, mri: 0.96 },
  },
];

const HOSPITAL = new Set(["blood", "mri"]);

export function mountLab() {
  const tasksEl = document.querySelector(".lab__tasks");
  const sensorsEl = document.getElementById("lab-sensors");
  const meterEl = document.getElementById("lab-meter");
  const verdictEl = document.getElementById("lab-verdict");
  const costEl = document.getElementById("lab-cost");
  const optBtn = document.getElementById("lab-optimise");
  if (!tasksEl) return;

  let task = TASKS[0];
  const chosen = new Set(["motion", "pulse"]);

  const taskBtns = TASKS.map((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "lab__task";
    b.setAttribute("role", "radio");
    b.innerHTML = `<strong>${t.name}</strong><span>${t.hint}</span>`;
    b.addEventListener("click", () => { task = t; render(); });
    b.addEventListener("keydown", (e) => {
      if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
      e.preventDefault();
      const i = TASKS.indexOf(task);
      const n = (i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1) + TASKS.length) % TASKS.length;
      task = TASKS[n]; render(); taskBtns[n].focus();
    });
    tasksEl.appendChild(b);
    return b;
  });

  const boxes = SENSORS.map((s) => {
    const label = document.createElement("label");
    label.className = "sensor";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = s.id;
    input.checked = chosen.has(s.id);
    input.addEventListener("change", () => { input.checked ? chosen.add(s.id) : chosen.delete(s.id); render(); });
    const name = document.createElement("span");
    name.innerHTML = `${s.name}<span class="sensor__where">${s.where}</span>`;
    const cost = document.createElement("small");
    cost.textContent = `${s.cost} unit${s.cost === 1 ? "" : "s"}`;
    label.append(input, name, cost);
    sensorsEl.appendChild(label);
    return input;
  });

  const NS_W = 520;
  const svg = el("svg", { viewBox: `0 0 ${NS_W} 92`, role: "img" }, meterEl);
  text(svg, 0, 16, "Useful information kept for this question (illustrative)", { "font-size": 13 });
  el("rect", { x: 0, y: 30, width: NS_W, height: 22, rx: 3, class: "f-bg" }, svg);
  const bar = el("rect", { x: 0, y: 30, width: 0, height: 22, rx: 3, class: "f-signal" }, svg);
  const thr = el("line", { y1: 24, y2: 58, class: "ln", "stroke-width": 2 }, svg);
  const thrLbl = text(svg, 0, 78, "", { "font-size": 12, class: "t-strong" });
  const pct = text(svg, 0, 46, "", { "font-size": 12, class: "t-strong" });
  bar.style.transition = "width .35s ease";

  const utility = (set) => 1 - [...set].reduce((acc, id) => acc * (1 - (task.c[id] || 0)), 1);
  const costOf = (set) => [...set].reduce((a, id) => a + SENSORS.find((s) => s.id === id).cost, 0);

  function cheapest() {
    let best = null;
    const ids = SENSORS.map((s) => s.id);
    for (let m = 1; m < 1 << ids.length; m++) {
      const set = new Set(ids.filter((_, i) => m & (1 << i)));
      if (utility(set) >= task.need) {
        const c = costOf(set);
        if (!best || c < best.c) best = { set, c };
      }
    }
    return best;
  }

  function render() {
    taskBtns.forEach((b, i) => {
      const on = TASKS[i] === task;
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    boxes.forEach((b) => (b.checked = chosen.has(b.value)));
    const u = utility(chosen);
    bar.setAttribute("width", (u * NS_W).toFixed(1));
    const tx = task.need * NS_W;
    thr.setAttribute("x1", tx); thr.setAttribute("x2", tx);
    thrLbl.setAttribute("x", tx); thrLbl.setAttribute("text-anchor", "middle");
    thrLbl.textContent = "Enough to be safe for this question";
    pct.setAttribute("x", Math.min(u * NS_W + 6, NS_W - 30));
    pct.textContent = `${Math.round(u * 100)}%`;
    svg.setAttribute("aria-label", `About ${Math.round(u * 100)} percent of the useful information is kept. The safe threshold is ${Math.round(task.need * 100)} percent.`);

    const c = costOf(chosen);
    const wristOnly = [...chosen].every((id) => SENSORS.find((s) => s.id === id).where === "wrist");
    const needsHospital = [...chosen].some((id) => HOSPITAL.has(id));
    costEl.textContent = chosen.size
      ? `Relative cost: ${c} unit${c === 1 ? "" : "s"}. ${wristOnly ? "Everything is on the wrist, so it can run every day." : needsHospital ? "Includes a clinic or hospital test, so it can't run continuously." : "Needs something worn beyond the wrist."}`
      : "Nothing selected.";

    let v;
    if (!chosen.size) v = "Choose at least one measurement.";
    else if (u >= task.need) {
      v = task.imaging && chosen.has("mri")
        ? "Enough, but only because the MRI is included. Wrist sensors can't stand in for it here."
        : "Enough for this question, in this made-up example.";
    } else if (task.imaging && !chosen.has("mri")) {
      v = "Not enough, and adding more wrist sensors won't fix it. The information isn't in these signals. The honest answer is: get the scan.";
    } else v = "Not enough yet. The system should say “I can't tell” rather than guess.";
    verdictEl.textContent = v;
    window.dispatchEvent(new CustomEvent("lab:change", { detail: { chosen: [...chosen], utility: u } }));
  }

  optBtn.addEventListener("click", () => {
    const best = cheapest();
    if (!best) return;
    chosen.clear();
    best.set.forEach((id) => chosen.add(id));
    render();
  });

  render();
}
