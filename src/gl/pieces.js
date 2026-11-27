import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { COL, clayMat, glowMat, rng, canvasTexture, seg, smooth, lerp } from "./kit.js";
import { makePerson } from "./person.js";

/* ---------------- Glowing particles material ---------------- */
export function pointsMat(size = 0.05, opts = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uSize: { value: size }, uScale: { value: 400 }, uOpacity: { value: 1 }, uTime: { value: 0 }, ...(opts.uniforms || {}) },
    vertexShader: opts.vertex || `
      attribute vec3 color; varying vec3 vC; uniform float uSize; uniform float uScale;
      void main(){ vec4 mv = modelViewMatrix*vec4(position,1.);
        // points under ~2.5 px alias and twinkle as they move: draw them bigger and dimmer instead (same total light)
        float sz = uSize*uScale/-mv.z; float big = max(sz, 2.5);
        vC = color * (sz*sz)/(big*big); gl_PointSize = big; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; uniform float uOpacity;
      void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d); gl_FragColor = vec4(vC*a, a*uOpacity); }`,
  });
}

/* ---------------- The life thread ---------------- */
export function lifeThread(points) {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.5);
  const geo = new THREE.TubeGeometry(curve, 1400, 0.028, 8, false);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uColor: { value: COL.amber.clone().multiplyScalar(2.2) }, uReveal: { value: 1 }, uOpacity: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uReveal; uniform float uOpacity; varying vec2 vUv;
      void main(){ if (vUv.x > uReveal) discard; gl_FragColor = vec4(uColor, uOpacity); }`,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  return { mesh, curve, mat };
}

/** A straight 90-day line of beads with two bright clinic visits at either end. */
export function dayBeads(from, to, n = 90, bright = [0, 89]) {
  const g = new THREE.Group();
  const line = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, from.distanceTo(to), 6),
    glowMat(COL.amber, 1.6)
  );
  line.position.copy(from).lerp(to, 0.5);
  line.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  g.add(line);
  const geo = new THREE.SphereGeometry(0.11, 14, 10);
  const inst = new THREE.InstancedMesh(geo, glowMat(0xffffff, 1), n);
  const m = new THREE.Matrix4();
  const dim = COL.amber.clone().multiplyScalar(0.55);
  for (let i = 0; i < n; i++) {
    const p = from.clone().lerp(to, i / (n - 1));
    m.makeTranslation(p.x, p.y, p.z);
    inst.setMatrixAt(i, m);
    inst.setColorAt(i, bright.includes(i) ? COL.amber.clone().multiplyScalar(8) : dim);
  }
  g.add(inst);
  bright.forEach((i) => {
    const p = from.clone().lerp(to, i / (n - 1));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), glowMat(COL.amber, 5));
    halo.position.copy(p);
    g.add(halo);
  });
  return g;
}

/* ---------------- Floating fragments (chapter 4) ---------------- */
const FRAGS = [
  ["EEG report", "Hospital, March"],
  ["Prescription", "Dose increased"],
  ["Note on his phone", "“felt strange on the bus”"],
  ["Sleep app", "Not opened in weeks"],
  ["Message from Maa", "“you sounded confused”"],
  ["Pill box", "Evening dose missed"],
];

export function fragments() {
  const g = new THREE.Group();
  const r = rng(4);
  const cards = FRAGS.map(([a, b], i) => {
    const tex = canvasTexture(640, 300, (ctx, w, h) => {
      ctx.fillStyle = "#eef0ec";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#b07c2a";
      ctx.fillRect(0, 0, 10, h);
      ctx.fillStyle = "#1f2b33";
      ctx.font = "600 54px 'Schibsted Grotesk', sans-serif";
      ctx.fillText(a, 48, 120);
      ctx.fillStyle = "#4b5862";
      ctx.font = "40px 'Schibsted Grotesk', sans-serif";
      ctx.fillText(b, 48, 196);
    });
    const card = new THREE.Group();
    const back = new THREE.Mesh(new RoundedBoxGeometry(2.2, 1.06, 0.06, 3, 0.04), clayMat(0x2a3136, 0.6));
    back.castShadow = true;
    card.add(back);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.98), new THREE.MeshBasicMaterial({ map: tex, color: 0xd8dcd8 }));
    face.position.z = 0.032;
    card.add(face);
    const start = new THREE.Vector3((r() - 0.5) * 11, (r() - 0.5) * 6, (r() - 0.5) * 5);
    const rot = new THREE.Euler((r() - 0.5) * 1.2, (r() - 0.5) * 1.6, (r() - 0.5) * 0.8);
    const end = new THREE.Vector3(-5.6 + i * 2.25, i % 2 === 0 ? 1.4 : 0.0, 0);
    card.position.copy(start);
    g.add(card);
    return { card, start, rot, end, phase: r() * 6 };
  });
  const lineGeo = new THREE.CylinderGeometry(0.025, 0.025, 14, 6);
  const line = new THREE.Mesh(lineGeo, glowMat(COL.amber, 1.8));
  line.rotation.z = Math.PI / 2;
  line.position.y = -1.6;
  g.add(line);
  const stems = cards.map(({ end }) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 4), glowMat(COL.amber, 1.5, { transparent: true }));
    g.add(s);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), glowMat(COL.amber, 6));
    bead.position.set(end.x, -1.6, 0);
    g.add(bead);
    return { s, bead };
  });
  return {
    group: g,
    update(p, t) {
      const k = smooth(seg(p, 0.25, 0.8));
      cards.forEach(({ card, start, rot, end, phase }, i) => {
        const fl = (1 - k) * 0.25;
        card.position.set(
          lerp(start.x, end.x, k) + Math.sin(t * 0.4 + phase) * fl,
          lerp(start.y, end.y, k) + Math.cos(t * 0.35 + phase) * fl,
          lerp(start.z, end.z, k)
        );
        card.rotation.set(lerp(rot.x, 0, k) + Math.sin(t * 0.3 + phase) * 0.05 * (1 - k), lerp(rot.y, 0, k), lerp(rot.z, 0, k));
        const { s, bead } = stems[i];
        const top = card.position.y - 0.53;
        const len = Math.max(0.01, top + 1.6);
        s.scale.y = len;
        s.position.set(card.position.x, -1.6 + len / 2, card.position.z);
        const vis = seg(p, 0.65, 0.85);
        s.material.opacity = vis;
        s.visible = vis > 0.01;
        bead.scale.setScalar(Math.max(0.001, vis));
      });
      line.scale.y = Math.max(0.001, seg(p, 0.55, 0.85));
    },
  };
}

/* ---------------- The wearable, with exploded view ---------------- */
const LAYERS = [
  ["SOS button", "Fixed from day one: help at a press"],
  ["Feedback", "Vibration you can feel"],
  ["Processor and memory", "Works offline, syncs to the phone"],
  ["Power", "Days between charges"],
  ["Sensing layer", "What goes here is decided by experiments"],
  ["Skin contact", "Candidate sensors under test"],
];

export function wearable() {
  const g = new THREE.Group();
  const strapMat = new THREE.MeshPhysicalMaterial({ color: 0x2c3438, roughness: 0.55, clearcoat: 0.4, clearcoatRoughness: 0.5 });
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 24, 128), strapMat);
  strap.scale.set(1, 0.86, 5.2);
  strap.castShadow = true;
  g.add(strap);

  const body = new THREE.Group();
  body.position.y = 0.55;
  g.add(body);
  const shellMat = new THREE.MeshPhysicalMaterial({ color: 0x3a4247, roughness: 0.35, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 });
  const layers = [];
  const L = (h, build) => {
    const lg = new THREE.Group();
    build(lg);
    body.add(lg);
    layers.push({ g: lg, h });
  };
  // 0 cover + SOS
  L(0.06, (lg) => {
    const cover = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.06, 0.5, 4, 0.025), shellMat);
    cover.castShadow = true;
    lg.add(cover);
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.04, 40), new THREE.MeshPhysicalMaterial({ color: 0xc98a3a, roughness: 0.4, clearcoat: 1 }));
    btn.position.y = 0.045;
    lg.add(btn);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 8, 64), glowMat(COL.amber, 3));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.035;
    lg.add(ring);
  });
  // 1 vibration motor
  L(0.05, (lg) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 32), new THREE.MeshStandardMaterial({ color: 0xa9b1b5, metalness: 0.9, roughness: 0.3 }));
    m.position.x = 0.15;
    lg.add(m);
  });
  // 2 PCB with chips
  L(0.03, (lg) => {
    const pcb = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.02, 0.44, 2, 0.01), new THREE.MeshStandardMaterial({ color: 0x1d4a47, roughness: 0.6 }));
    lg.add(pcb);
    const chip = (w, d, x, z, c = 0x16191b) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 })); b.position.set(x, 0.02, z); lg.add(b); };
    chip(0.16, 0.16, -0.08, 0);
    chip(0.07, 0.05, 0.14, -0.1);
    chip(0.05, 0.08, 0.16, 0.1, 0xb9a46a);
    for (let i = 0; i < 10; i++) chip(0.012, 0.03, -0.2 + i * 0.04, 0.17, 0x8f7b4f);
  });
  // 3 battery
  L(0.07, (lg) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.06, 0.38, 3, 0.02), new THREE.MeshStandardMaterial({ color: 0x7f878c, metalness: 0.6, roughness: 0.45 }));
    lg.add(b);
  });
  // 4 motion sensor board
  L(0.03, (lg) => {
    const pcb = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.015, 0.3, 2, 0.008), new THREE.MeshStandardMaterial({ color: 0x1d4a47, roughness: 0.6 }));
    lg.add(pcb);
    const imu = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.06), glowMat(COL.teal, 2.2));
    imu.position.y = 0.015;
    lg.add(imu);
  });
  // 5 sensor plate with green LEDs
  L(0.05, (lg) => {
    const plate = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.05, 0.5, 4, 0.02), shellMat);
    plate.castShadow = true;
    lg.add(plate);
    const win = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.01, 40), new THREE.MeshPhysicalMaterial({ color: 0x111518, roughness: 0.1, clearcoat: 1 }));
    win.position.y = -0.028;
    lg.add(win);
    [[-0.05, 0], [0.05, 0], [0, 0.05]].forEach(([x, z]) => {
      const led = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.01, 16), glowMat(0x5cff8a, 4));
      led.position.set(x, -0.033, z);
      lg.add(led);
    });
  });
  // stack positions (closed)
  let y = 0.0;
  const closedY = [];
  for (let i = 0; i < layers.length; i++) {
    closedY.push(-y);
    y += layers[i].h * 0.8;
  }
  layers.forEach((l, i) => (l.g.position.y = closedY[i]));
  return {
    group: g,
    strap,
    body,
    layers,
    labels: LAYERS,
    explode(k) {
      layers.forEach((l, i) => {
        l.g.position.y = closedY[i] + (layers.length - 1 - i - (layers.length - 1) / 2) * 0.32 * k + 0.25 * k;
      });
      strap.material.opacity = 1 - 0.85 * k;
      strap.material.transparent = k > 0.01;
      strap.visible = k < 0.98;
    },
  };
}

/* ---------------- Particle person with data rings (chapter 7) ---------------- */
export const RINGS = [
  ["Movement", "band", "teal", true],
  ["Pulse", "band", "teal", true],
  ["Sleep", "band", "teal", true],
  ["Daily routine", "phone and Aarav", "teal", true],
  ["Mood and stress", "Aarav", "amber", false],
  ["Medication", "Aarav and clinic", "amber", false],
  ["Possible events", "band, unconfirmed", "amber", true],
  ["Clinic results", "clinic", "white", false],
];

export function dataBody(lite) {
  const g = new THREE.Group();
  const P = makePerson();
  P.root.updateMatrixWorld(true);
  const geos = [];
  P.root.traverse((o) => {
    if (o.isMesh) {
      const gg = o.geometry.clone();
      gg.applyMatrix4(o.matrixWorld);
      geos.push(gg.toNonIndexed());
    }
  });
  const merged = mergeGeometries(geos.map((x) => { const y = new THREE.BufferGeometry(); y.setAttribute("position", x.getAttribute("position")); return y; }));
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(merged)).build();
  const N = lite ? 3500 : 9000;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const v = new THREE.Vector3();
  const c1 = new THREE.Color(0.75, 0.85, 0.85);
  for (let i = 0; i < N; i++) {
    sampler.sample(v);
    pos.set([v.x, v.y, v.z], i * 3);
    const k = 0.35 + Math.random() * 0.5;
    col.set([c1.r * k, c1.g * k, c1.b * k], i * 3);
  }
  const bg = new THREE.BufferGeometry();
  bg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  bg.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const bodyPts = new THREE.Points(bg, pointsMat(0.035));
  g.add(bodyPts);

  const colors = { teal: COL.teal.clone().multiplyScalar(2.2), amber: COL.amber.clone().multiplyScalar(2.2), white: new THREE.Color(2, 2, 2) };
  const rings = RINGS.map(([name, src, ckey, gappy], i) => {
    const n = lite ? 180 : 360;
    const radius = 0.75 + (i % 2) * 0.18 + i * 0.03;
    const h = 0.15 + i * 0.24;
    const ang = new Float32Array(n);
    const p = new Float32Array(n * 3);
    const c = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) {
      let a = (k / n) * Math.PI * 2;
      ang[k] = a;
      p.set([Math.cos(a) * radius, h, Math.sin(a) * radius], k * 3);
      const cc = colors[ckey];
      c.set([cc.r, cc.g, cc.b], k * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
    geo.setAttribute("aAng", new THREE.BufferAttribute(ang, 1));
    const mat = pointsMat(0.045, {
      uniforms: { uSpeed: { value: 0.12 + i * 0.015 }, uR: { value: radius }, uH: { value: h }, uGap: { value: gappy ? 1 : 0 } },
      vertex: `attribute vec3 color; attribute float aAng; varying vec3 vC; uniform float uSize; uniform float uScale; uniform float uTime; uniform float uSpeed; uniform float uR; uniform float uH; uniform float uGap;
        void main(){ float a = aAng + uTime*uSpeed; float m = mod(a, 6.28318);
          // a gap in the data: soft-edged, so points fade out and in as the ring turns instead of popping
          float hole = uGap * smoothstep(4.0, 4.2, m) * (1.0 - smoothstep(4.8, 5.0, m));
          vec3 p = vec3(cos(a)*uR, uH + sin(a*3.0+uTime*0.3)*0.02, sin(a)*uR);
          vec4 mv = modelViewMatrix*vec4(p,1.);
          float sz = uSize*uScale/-mv.z; float big = max(sz, 2.5);
          vC = color * (1.0 - hole) * (sz*sz)/(big*big);
          gl_PointSize = big; gl_Position = projectionMatrix*mv; }`,
    });
    const pts = new THREE.Points(geo, mat);
    g.add(pts);
    return { pts, mat, on: true, k: 1, name, src, h, radius };
  });
  return { group: g, bodyPts, rings };
}

/* ---------------- Calibration loop (chapter 8) ---------------- */
export const LOOP = [
  ["Collect", "Band and reference test record at the same moment"],
  ["Check quality", "Readings spoiled by movement or a loose strap are set aside"],
  ["Compare", "Pulse vs ECG. Movement events vs video-EEG. Sleep vs a sleep lab"],
  ["Calibrate", "Adjust the model for one narrow, defined question"],
  ["Validate", "Test on people the system has never seen"],
  ["Improve", "Better hardware and models, version by version"],
];

export function loopRing() {
  const g = new THREE.Group();
  const R = 3;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.015, 8, 200), glowMat(0x9aa9b0, 1.2));
  g.add(ring);
  const prog = new THREE.Mesh(new THREE.TorusGeometry(R, 0.03, 8, 200, 0.001), glowMat(COL.amber, 2.4));
  g.add(prog);
  const nodes = LOOP.map((_, i) => {
    const a = Math.PI / 2 - (i / LOOP.length) * Math.PI * 2;
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.55, 0.57), toneMapped: false }));
    n.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    g.add(n);
    return n;
  });
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 14), glowMat(0xffffff, 3.5));
  g.add(pulse);
  let lastArc = -1;
  return {
    group: g,
    nodes,
    update(p) {
      const k = Math.min(1, p * 1.05);
      const arc = Math.max(0.001, k * Math.PI * 2);
      if (Math.abs(arc - lastArc) > 0.01) {
        prog.geometry.dispose();
        prog.geometry = new THREE.TorusGeometry(R, 0.03, 8, 200, arc);
        lastArc = arc;
      }
      prog.rotation.z = Math.PI / 2 - arc;
      const a = Math.PI / 2 - k * Math.PI * 2;
      pulse.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
      const idx = Math.min(LOOP.length - 1, Math.floor(k * LOOP.length));
      nodes.forEach((n, i) => {
        const on = i <= idx;
        n.material.color.set(on ? COL.amber.clone().multiplyScalar(i === idx ? 3.2 : 1.5) : new THREE.Color(0.45, 0.5, 0.52));
        n.scale.setScalar(i === idx ? 1.35 : 1);
      });
      return k >= 0.999 ? -1 : idx;
    },
  };
}

/* ---------------- Labs on the wrist streams (chapter 9) ---------------- */
export const SOURCES = [
  ["blood", "Blood tests", 25],
  ["ecg", "Heart recording", 6],
  ["eeg", "Brain recording", 12],
  ["sleep", "Sleep study", 30],
  ["breath", "Breathing tests", 8],
  ["mri", "Scans", 400],
];

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smoothstep = (x) => x * x * (3 - 2 * x);
export function labStreams(lite) {
  const g = new THREE.Group();
  const target = new THREE.Vector3(0, -0.2, 0);
  const core = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 16, 64), glowMat(COL.teal, 2.5));
  core.rotation.x = Math.PI / 2;
  core.position.copy(target);
  g.add(core);
  const srcs = SOURCES.map(([id, name, cost], i) => {
    // fan over the right and top only: on desktop the story text occupies the left of the screen
    const a = Math.PI * (0.04 + (i / (SOURCES.length - 1)) * 0.6);
    const R = 6.5;
    const pos = new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R * 0.55 + 0.6, -Math.sin(a) * 2.5);
    const size = 0.16 + Math.log10(cost + 1) * 0.32;
    const hospital = true;
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 3), new THREE.MeshStandardMaterial({ color: hospital ? 0xd7d4cc : 0x6fa9a2, roughness: 0.4, metalness: 0.1, emissive: hospital ? 0x221d14 : 0x0b2422 }));
    s.position.copy(pos);
    g.add(s);
    const n = lite ? 60 : 140;
    const arr = new Float32Array(n * 3);
    const t0 = new Float32Array(n);
    const col = new Float32Array(n * 3);
    const cc = hospital ? new THREE.Color(2.2, 2.0, 1.7) : COL.teal.clone().multiplyScalar(2.4);
    for (let k = 0; k < n; k++) { t0[k] = k / n; col.set([cc.r, cc.g, cc.b], k * 3); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    geo.setAttribute("aT", new THREE.BufferAttribute(t0, 1));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mid = pos.clone().lerp(target, 0.5).add(new THREE.Vector3(0, 1.8, 1.2));
    const mat = pointsMat(0.06, {
      uniforms: { uA: { value: pos }, uB: { value: mid }, uC: { value: target }, uOn: { value: 0 } },
      vertex: `attribute vec3 color; attribute float aT; varying vec3 vC; uniform float uSize; uniform float uScale; uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uOn;
        void main(){ float t = fract(aT + uTime*0.18); vec3 p = mix(mix(uA,uB,t), mix(uB,uC,t), t);
          vec4 mv = modelViewMatrix*vec4(p,1.);
          float sz = uSize*uScale/-mv.z*uOn; float big = max(sz, 2.5 * step(0.001, uOn));
          vC = color * uOn * sin(t*3.14159) * (sz*sz)/max(big*big, 1e-6);
          gl_PointSize = big; gl_Position = projectionMatrix*mv; }`,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    g.add(pts);
    return { id, name, s, mat, on: 0, want: 0, pos };
  });
  // the handful of signals that come out the other side
  const signals = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 2), glowMat(COL.amber, 3));
    m.userData.a = (i / 4) * Math.PI * 2;
    g.add(m);
    signals.push(m);
  }
  return {
    group: g,
    srcs,
    core,
    signals,
    // k: 0 → streams off, 1 → every instrument has flowed in and the few signals are lit
    progress(k, time) {
      srcs.forEach((s, i) => (s.want = smoothstep(clamp01((k - i * 0.07) / 0.3))));
      const lit = smoothstep(clamp01((k - 0.55) / 0.3));
      signals.forEach((m) => {
        const a = m.userData.a + time * 0.35;
        m.position.set(target.x + Math.cos(a) * 0.45, target.y + Math.sin(a * 2) * 0.04, target.z + Math.sin(a) * 0.45);
        m.scale.setScalar(Math.max(0.001, lit));
      });
    },
    set(chosen) { srcs.forEach((s) => (s.want = chosen.has(s.id) ? 1 : 0)); },
    update(dt) { srcs.forEach((s) => { s.on += (s.want - s.on) * Math.min(1, dt * 3); s.mat.uniforms.uOn.value = s.on; s.s.scale.setScalar(0.7 + 0.3 * s.on); }); },
  };
}

/* ---------------- Field of lives (chapter 11) ---------------- */
export const PEOPLE = [
  ["Aarav, 29", "epilepsy"],
  ["Meera, 78", "lives alone, worried about falls"],
  ["Kabir, 9", "his parents want to sleep, too"],
  ["Ananya, 24", "ADHD, wants help with routines"],
  ["Joseph, 61", "a long-term heart condition"],
];

export function field(lite) {
  const g = new THREE.Group();
  const r = rng(99);
  const count = lite ? 70 : 180;
  const pos = [];
  const col = [];
  const highlights = [];
  for (let i = 0; i < count; i++) {
    const z = -i * 0.35 + (r() - 0.5) * 0.2;
    const y0 = (r() - 0.5) * 6;
    const ph = r() * 6;
    const hl = i % Math.floor(count / 5) === 3 && highlights.length < 5;
    const c = hl ? (highlights.length === 0 ? COL.amber.clone().multiplyScalar(3) : COL.teal.clone().multiplyScalar(2.4)) : new THREE.Color(0.22, 0.27, 0.3);
    let prev = null;
    for (let k = 0; k <= 60; k++) {
      const x = -18 + k * 0.6;
      const y = y0 + Math.sin(k * 0.18 + ph) * 0.6 + Math.sin(k * 0.05 + i) * 0.8;
      const p = [x, y, z];
      if (prev) { pos.push(...prev, ...p); col.push(c.r, c.g, c.b, c.r, c.g, c.b); }
      prev = p;
    }
    if (hl) {
      const kk = [14, 24, 34, 44, 52][highlights.length];
      highlights.push(new THREE.Vector3(-18 + kk * 0.6, y0 + Math.sin(kk * 0.18 + ph) * 0.6 + Math.sin(kk * 0.05 + i) * 0.8 + 0.45, z));
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, opacity: 1 }));
  g.add(lines);
  return { group: g, lines, highlights };
}
