import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { COL, seg, smooth, lerp, clamp, canvasTexture, glowMat } from "./kit.js";
import { apartment, clinic, drawSharedScreen } from "./rooms.js";
import { pointsMat, lifeThread, dayBeads, fragments, wearable, dataBody, RINGS, loopRing, LOOP, labStreams, SOURCES, field, PEOPLE } from "./pieces.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* Where each set lives in the world. */
const APT = V(0, 0, 0);
const CLIN = V(46, 0, -34);
const FRAG = V(-34, 7, -44);
const DEV = V(8, 6, -78);
const BODY = V(-44, 0, -106);
const LOOPC = V(18, 11, -128);
const LAB = V(62, 3, -104);
const FIELD = V(96, 0, -56);

/* Lighting moods. keyDir points from the subject towards the light. */
const MOODS = {
  hero: { bg: 0x05080a, fog: 0.0075, hemi: 0.12, key: 0x9fb4c4, keyI: 0.3, keyDir: V(-0.3, 1, 0.4), fill: 0.0, lamp: 0, shaft: 0, env: 0.08 },
  morning: { bg: 0x0b1114, fog: 0.022, hemi: 0.42, key: 0xffc98a, keyI: 3.4, keyDir: V(0.35, 0.75, -0.75), fill: 0.35, lamp: 0, shaft: 0.13, env: 0.22 },
  night: { bg: 0x04070a, fog: 0.03, hemi: 0.07, key: 0x86a6ff, keyI: 0.9, keyDir: V(0.3, 0.8, -0.8), fill: 0.05, lamp: 0, shaft: 0.05, env: 0.05 },
  clinic: { bg: 0x0b1115, fog: 0.02, hemi: 0.5, key: 0xeef5ff, keyI: 2.8, keyDir: V(0.45, 0.75, -0.7), fill: 0.4, lamp: 0, shaft: 0.1, env: 0.28 },
  void: { bg: 0x070b0e, fog: 0.018, hemi: 0.3, key: 0xdfe6ea, keyI: 1.6, keyDir: V(0.3, 1, 0.6), fill: 0.3, lamp: 0, shaft: 0, env: 0.3 },
  studio: { bg: 0x06090b, fog: 0.012, hemi: 0.2, key: 0xffffff, keyI: 2.2, keyDir: V(0.6, 0.9, 0.7), fill: 0.6, lamp: 0, shaft: 0, env: 0.6 },
  dark: { bg: 0x05080a, fog: 0.016, hemi: 0.15, key: 0xbfd0d8, keyI: 0.6, keyDir: V(0.2, 1, 0.5), fill: 0.1, lamp: 0, shaft: 0, env: 0.1 },
  sunset: { bg: 0x0e0d0f, fog: 0.022, hemi: 0.35, key: 0xff9a5c, keyI: 3.2, keyDir: V(0.6, 0.38, -0.7), fill: 0.25, lamp: 0.6, shaft: 0.16, env: 0.2 },
};

export function createWorld(canvas, labelHost, { lite }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lite ? 1.25 : 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(MOODS.hero.bg);
  scene.fog = new THREE.FogExp2(MOODS.hero.bg, MOODS.hero.fog);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.1;

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 600);
  camera.position.set(-92, 0, 86);

  /* lights */
  const hemi = new THREE.HemisphereLight(0xc9d6dc, 0x2a2420, 0.2);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1);
  key.castShadow = true;
  key.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  key.shadow.camera.left = -9; key.shadow.camera.right = 9; key.shadow.camera.top = 9; key.shadow.camera.bottom = -9;
  key.shadow.camera.near = 1; key.shadow.camera.far = 60;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 4;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xbfd6e0, 0.3);
  scene.add(fill, fill.target);

  /* labels */
  const labels = new CSS2DRenderer({ element: labelHost });
  const labelList = [];
  function label(html, pos, station, parent = scene, cls = "") {
    const el = document.createElement("div");
    el.className = `lbl ${cls}`;
    el.innerHTML = `<div class="in">${html}</div>`;
    const o = new CSS2DObject(el);
    o.position.copy(pos);
    parent.add(o);
    const L = { o, el, station, show: 1 };
    labelList.push(L);
    return L;
  }

  /* ---------- sets ---------- */
  const apt = apartment();
  apt.group.position.copy(APT);
  scene.add(apt.group);

  const cli = clinic();
  cli.group.position.copy(CLIN);
  scene.add(cli.group);
  const sharedTex = canvasTexture(1024, 620, drawSharedScreen);
  const emptyTex = cli.screenTex;

  // hero: ninety days leading to the apartment
  const heroFrom = V(-86, -1.2, 82), heroTo = V(-7, -1.2, 6.2);
  scene.add(dayBeads(heroFrom, heroTo, 90, [0, 89]));
  // clinic: ninety days with two visits
  const cFrom = CLIN.clone().add(V(0, -1.1, 4.6)), cTo = CLIN.clone().add(V(78, -1.1, 4.6));
  const clinicBeads = dayBeads(cFrom, cTo, 90, [0, 89]);
  scene.add(clinicBeads);

  // the life thread winds through every set
  const thread = lifeThread([
    V(-7, -1.2, 6.2), V(-9.5, -1.6, 0), V(-13, -1.2, -14), FRAG.clone().add(V(0, -4, 3)), V(-10, 2, -60),
    DEV.clone().add(V(-3, -4, 2)), V(-20, -1, -95), BODY.clone().add(V(3, -1.5, 4)), V(-10, 5, -125),
    LOOPC.clone().add(V(0, -5, 2)), V(45, 2, -120), LAB.clone().add(V(0, -3, 4)), V(85, 0, -80), FIELD.clone().add(V(-20, -2, 6)), V(130, 0, -40),
  ]);
  scene.add(thread.mesh);

  const frag = fragments();
  frag.group.position.copy(FRAG);
  scene.add(frag.group);

  const dev = wearable();
  dev.group.position.copy(DEV);
  dev.group.scale.setScalar(2.2);
  scene.add(dev.group);
  const devLabels = dev.labels.map(([a, b], i) => label(`<strong>${a}</strong><span>${b}</span>`, V(0, 0, 0), 6, dev.layers[i].g, "lbl--right"));
  devLabels.forEach((L) => L.o.position.set(0.55, 0, 0));
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.3, 64), new THREE.MeshStandardMaterial({ color: 0x1a2024, roughness: 0.5, metalness: 0.2 }));
  plinth.position.copy(DEV).add(V(0, -1.8, 0));
  plinth.receiveShadow = true;
  scene.add(plinth);

  const body = dataBody(lite);
  body.group.position.copy(BODY);
  body.group.scale.setScalar(1.6);
  scene.add(body.group);
  const ringLabels = body.rings.map((r, i) => {
    const L = label(`<strong>${r.name}</strong><span>${r.src}</span>`, V(r.radius + 0.25, r.h, 0), 7, body.group, "lbl--right lbl--small");
    L.show = lite ? 0 : 1;
    return L;
  });

  const loop = loopRing();
  loop.group.position.copy(LOOPC);
  scene.add(loop.group);
  const loopLabels = LOOP.map(([n], i) => label(`<strong>${n}</strong>`, loop.nodes[i].position.clone().multiplyScalar(1.17), 8, loop.group, "lbl--center"));
  const loopCenter = label("", V(0, 0, 0), 8, loop.group, "lbl--center lbl--big");
  let loopIdx = -2;

  const lab = labStreams(lite);
  lab.group.position.copy(LAB);
  scene.add(lab.group);
  lab.srcs.forEach((s) => label(`<strong>${s.name}</strong>`, s.pos.clone().add(V(0, -0.9, 0)), 9, lab.group, "lbl--center lbl--small"));
  label(`<strong>The wrist</strong>`, V(0, -0.95, 0), 9, lab.group, "lbl--center lbl--small");

  const fld = field(lite);
  fld.group.position.copy(FIELD);
  scene.add(fld.group);
  fld.highlights.forEach((h, i) => label(`<strong>${PEOPLE[i][0]}</strong><span>${PEOPLE[i][1]}</span>`, h, 11, fld.group, "lbl--center"));

  const qLabel = label(`<strong>Around 3 a.m.</strong><span>Something may have happened. Nobody saw.</span>`, V(0, 0.55, 0), 2, apt.q, "lbl--center");
  const zoomLabel = label(`<strong>Two visits, about 40 minutes, out of 90 days.</strong><span>Roughly 0.03% of his time.</span>`, cFrom.clone().lerp(cTo, 0.5).add(V(0, 3, 0)), 3, scene, "lbl--center lbl--big");
  /* sky seen through the windows */
  const SKY = { hero: [0.02, 0.03, 0.05], morning: [1.25, 1.05, 0.8], night: [0.03, 0.05, 0.13], clinic: [1.1, 1.2, 1.3], void: [0.1, 0.12, 0.14], studio: [0.1, 0.1, 0.1], dark: [0.05, 0.06, 0.08], sunset: [1.5, 0.62, 0.3] };
  const skyMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(...SKY.morning), toneMapped: false, fog: false });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.5), skyMat);
  sky.position.copy(apt.windowCenter).add(V(0, 0.1, -0.9));
  apt.group.add(sky);
  const sky2 = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), glowMat(0xdde8f0, 1.15));
  sky2.position.set(2.7, 1.8, -4.4);
  cli.group.add(sky2);
  const skyC = new THREE.Color();

  /* show each set only near the stations that use it */
  const gated = [
    [apt.group, [0, 1, 2, 5, 12, 13]],
    [cli.group, [3, 10]], [clinicBeads, [3]],
    [frag.group, [4]],
    [dev.group, [6]], [plinth, [6]],
    [body.group, [7]],
    [loop.group, [8]],
    [lab.group, [9]],
    [fld.group, [11]],
  ];

  /* drifting dust around the camera, everywhere */
  const DUST = lite ? 500 : 1400;
  const dustGeo = new THREE.BufferGeometry();
  const dp = new Float32Array(DUST * 3), dc = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dp.set([(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40], i * 3);
    const k = 0.25 + Math.random() * 0.45;
    dc.set([k, k * 0.95, k * 0.85], i * 3);
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dp, 3));
  dustGeo.setAttribute("color", new THREE.BufferAttribute(dc, 3));
  const dustMat = pointsMat(0.035, {
    uniforms: { uCam: { value: new THREE.Vector3() } },
    vertex: `attribute vec3 color; varying vec3 vC; uniform float uSize; uniform float uScale; uniform float uTime; uniform vec3 uCam;
      void main(){ vec3 p = position + vec3(sin(uTime*0.05+position.y)*1.5, uTime*0.12, cos(uTime*0.04+position.x)*1.5);
        p = uCam + mod(p - uCam + 20.0, vec3(40.0,20.0,40.0)) - vec3(20.0,10.0,20.0);
        vec4 mv = modelViewMatrix*vec4(p,1.); float fade = smoothstep(22.0, 6.0, -mv.z) * smoothstep(0.5, 2.0, -mv.z);
        vC = color*fade; gl_PointSize = uSize*uScale/-mv.z; gl_Position = projectionMatrix*mv; }`,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  /* ---------- post ---------- */
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: lite ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.6, 1.2);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.035 }, uVig: { value: 0.9 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uGrain; uniform float uVig; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){ vec4 c = texture2D(tDiffuse, vUv);
        vec2 q = vUv - 0.5; float v = smoothstep(0.85, 0.2, length(q*vec2(1.0,0.85))*uVig);
        c.rgb *= mix(0.55, 1.0, v);
        float n = h(vUv*vec2(1920.,1080.) + floor(uTime*12.0)) - 0.5;
        c.rgb += n * uGrain;
        gl_FragColor = c; }`,
  });
  composer.addPass(grade);

  /* ---------- shots ---------- */
  const T = (o) => o; // readability
  const stations = {
    0: (p) => {
      const dir = heroTo.clone().sub(heroFrom).normalize();
      const side = V(-dir.z, 0, dir.x);
      const pos = heroFrom.clone().addScaledVector(dir, lerp(-3.5, 16, p)).addScaledVector(side, -2.6).add(V(0, lerp(1.0, 1.3, p), 0));
      const look = heroFrom.clone().addScaledVector(dir, lerp(30, 70, p)).add(V(0, -0.2, 0));
      return { pos, look, mood: "hero" };
    },
    1: (p) => T({ pos: APT.clone().add(V(lerp(8.5, 6, p), lerp(5.2, 3.6, p), lerp(10.5, 8, p))), look: APT.clone().add(V(0.6, 1.1, -1.6)), mood: "morning", apt: "day" }),
    2: (p) => T({ pos: APT.clone().add(V(lerp(0.2, -1.2, p), lerp(3.6, 2.6, p), lerp(4.8, 3.2, p))), look: APT.clone().add(V(-3.2, 0.9, -2.4)), mood: "night", apt: "night" }),
    3: (p) => {
      const k = smooth(seg(p, 0.4, 0.85));
      const near = { pos: CLIN.clone().add(V(4.6, 2.5, 4.2)), look: CLIN.clone().add(V(0, 1.0, -1)) };
      const far = { pos: cFrom.clone().lerp(cTo, 0.5).add(V(-8, 26, 52)), look: cFrom.clone().lerp(cTo, 0.45) };
      return { pos: near.pos.lerp(far.pos, k), look: near.look.lerp(far.look, k), mood: "clinic", screen: "empty" };
    },
    4: (p) => T({ pos: FRAG.clone().add(V(lerp(-3, 1, p), lerp(1.5, 0.4, p), 15)), look: FRAG.clone().add(V(0, 0, 0)), mood: "void" }),
    5: (p) => {
      const k = smooth(seg(p, 0.15, 0.9));
      return { pos: APT.clone().add(V(lerp(3.6, 7.5, k), lerp(1.7, 4.2, k), lerp(0.6, 8.5, k))), look: APT.clone().add(V(lerp(2.1, 0.8, k), lerp(1.05, 1.1, k), lerp(-1.6, -1.5, k))), mood: "morning", apt: "wear" };
    },
    6: (p) => {
      const a = lerp(0.7, -0.5, p);
      return { pos: DEV.clone().add(V(Math.sin(a) * 9.5, lerp(3.2, 2.2, p), Math.cos(a) * 9.5)), look: DEV.clone().add(V(0, 1.25 + seg(p, 0.1, 0.6) * 0.55, 0)), mood: "studio" };
    },
    7: (p) => {
      const a = lerp(-0.5, 0.6, p);
      return { pos: BODY.clone().add(V(Math.sin(a) * 9.2, lerp(2.3, 1.8, p), Math.cos(a) * 9.2)), look: BODY.clone().add(V(0.6, 1.55, 0)), mood: "dark" };
    },
    8: (p) => T({ pos: LOOPC.clone().add(V(lerp(-2.5, 2.5, p), 1.8, 14.5)), look: LOOPC.clone(), mood: "dark" }),
    9: (p) => T({ pos: LAB.clone().add(V(lerp(-1, 1, p), 2.6, 13)), look: LAB.clone().add(V(0, 1.4, 0)), mood: "dark" }),
    10: (p) => {
      const k = smooth(seg(p, 0.1, 0.5));
      const monW = cli.mon.localToWorld(V(0, 0.34, 0));
      const front = cli.mon.localToWorld(V(0.05, 0.36, 1.7));
      return { pos: CLIN.clone().add(V(4.6, 2.5, 4.2)).lerp(front, k), look: CLIN.clone().add(V(0, 1.0, -1)).lerp(monW, k), mood: "clinic", screen: "shared" };
    },
    11: (p) => T({ pos: FIELD.clone().add(V(lerp(-24, -6, p), lerp(4, 12, p), lerp(22, 30, p))), look: FIELD.clone().add(V(-2, 0, -28)), mood: "dark" }),
    12: (p) => T({ pos: APT.clone().add(V(lerp(-2.5, -4.5, p), lerp(2.2, 3.4, p), lerp(5.5, 9.5, p))), look: APT.clone().add(V(1.8, 1.5, -3.5)), mood: "sunset", apt: "sunset" }),
    13: (p) => T({ pos: APT.clone().add(V(-10, lerp(8, 18, p), 26)), look: APT.clone().add(V(20, 4, -60)), mood: "sunset", apt: "sunset" }),
  };

  /* ---------- state ---------- */
  const camPos = camera.position.clone();
  const camLook = V(-40, -0.6, 42);
  const mood = { ...MOODS.hero, bgC: new THREE.Color(MOODS.hero.bg), keyC: new THREE.Color(MOODS.hero.key), keyDir: MOODS.hero.keyDir.clone() };
  let active = 0, prog = 0, size = { w: 1, h: 1 }, mobile = false, time = 0, screenState = "";
  const labState = { chosen: new Set(["motion", "pulse"]) };
  lab.set(labState.chosen);

  function setApt(modeName) {
    const day = modeName === "day" || modeName === "wear";
    apt.standing.root.visible = day;
    apt.lying.root.visible = modeName === "night";
    apt.atWindow.root.visible = modeName === "sunset";
    apt.band.visible = modeName === "wear";
    apt.band2.visible = modeName === "sunset";
    apt.q.visible = modeName === "night";
    apt.lamp.intensity = modeName === "sunset" ? 2.5 : 0;
  }
  setApt("day");

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    size = { w, h };
    mobile = w < 860;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    labels.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = mobile ? 48 : 36;
    if (mobile) camera.setViewOffset(w, h, 0, h * 0.24, w, h);
    else camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
    camera.updateProjectionMatrix();
    const pts = (h / Math.tan((camera.fov * Math.PI) / 360)) * 0.5;
    scene.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.uScale) o.material.uniforms.uScale.value = pts; });
  }
  window.addEventListener("resize", resize);
  resize();

  const tmpC = new THREE.Color();
  function tick(dt) {
    time += dt;
    const shot = (stations[active] || stations[0])(prog);
    if (mobile && active !== 0) shot.pos.sub(shot.look).multiplyScalar(1.35).add(shot.look);
    const m = MOODS[shot.mood];
    const a = 1 - Math.exp(-dt * 2.4);
    const am = 1 - Math.exp(-dt * 1.8);
    camPos.lerp(shot.pos, a);
    camLook.lerp(shot.look, a);
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    mood.bgC.lerp(tmpC.set(m.bg), am);
    scene.background.copy(mood.bgC);
    scene.fog.color.copy(mood.bgC);
    scene.fog.density = lerp(scene.fog.density, mobile ? m.fog * 0.8 : m.fog, am);
    hemi.intensity = lerp(hemi.intensity, m.hemi, am);
    mood.keyC.lerp(tmpC.set(m.key), am);
    key.color.copy(mood.keyC);
    key.intensity = lerp(key.intensity, m.keyI, am);
    mood.keyDir.lerp(m.keyDir, am);
    fill.intensity = lerp(fill.intensity, m.fill, am);
    scene.environmentIntensity = lerp(scene.environmentIntensity, m.env, am);
    // key light follows what the camera is looking at
    key.target.position.copy(camLook);
    key.position.copy(camLook).addScaledVector(mood.keyDir.clone().normalize(), 22);
    fill.target.position.copy(camLook);
    fill.position.copy(camPos).add(V(0, 3, 0));
    const shaftO = lerp(apt.shaft.material.uniforms.uOpacity.value, m.shaft, am);
    apt.shaft.material.uniforms.uOpacity.value = shaftO;
    apt.shaft.material.uniforms.uColor.value.copy(mood.keyC);
    cli.shaft.material.uniforms.uOpacity.value = shaftO;
    skyMat.color.lerp(skyC.setRGB(...SKY[shot.mood]), am);

    if (shot.apt) setApt(shot.apt);
    if (shot.screen && shot.screen !== screenState) {
      screenState = shot.screen;
      cli.screenMat.map = shot.screen === "shared" ? sharedTex : emptyTex;
      cli.screenMat.needsUpdate = true;
    }

    gated.forEach(([o, st]) => { o.visible = st.some((x) => Math.abs(x - active) <= 1); });
    // per-set animation
    apt.ring.rotation.z = time * 0.3;
    apt.q.position.y = 1.55 + Math.sin(time * 0.8) * 0.04;
    frag.update(active === 4 ? prog : active > 4 ? 1 : 0, time);
    dev.explode(active === 6 ? smooth(seg(prog, 0.08, 0.55)) : 0);
    dev.group.rotation.y = active === 6 ? lerp(0.5, -0.3, prog) : time * 0.15;
    body.rings.forEach((r) => {
      r.mat.uniforms.uTime.value = time;
      const want = r.on ? 1 : 0.06;
      r.k = lerp(r.k, want, am);
      r.mat.uniforms.uOpacity.value = r.k * (active === 7 ? smooth(seg(prog, 0.05, 0.4)) * 1 + 0.15 : 0.6);
    });
    body.bodyPts.rotation.y = Math.sin(time * 0.2) * 0.1;
    if (active === 8) {
      const idx = loop.update(prog);
      if (idx !== loopIdx) {
        loopIdx = idx;
        const [n, d] = idx < 0 ? ["Repeat", "Each round makes the next version better"] : LOOP[idx];
        loopCenter.el.innerHTML = `<div class="in"><strong>${n}</strong><span>${d}</span></div>`;
      }
    }
    lab.srcs.forEach((s) => (s.mat.uniforms.uTime.value = time));
    lab.update(dt);
    lab.core.rotation.z = time * 0.2;

    labelList.forEach((L) => {
      let o = L.station === active ? L.show : 0;
      if (L === zoomLabel) o *= seg(prog, 0.7, 0.85);
      if (L === qLabel) o *= seg(prog, 0.25, 0.4);
      if (L.station === 6 && active === 6) o *= seg(prog, 0.4, 0.6);
      if (L.station === 7 && active === 7) o *= seg(prog, 0.2, 0.45);
      const s = o.toFixed(2);
      if (L.el.style.opacity !== s) L.el.style.opacity = s;
      L.o.visible = o > 0.01;
    });

    dustMat.uniforms.uTime.value = time;
    dustMat.uniforms.uCam.value.copy(camPos);
    grade.uniforms.uTime.value = time;
    composer.render();
    labels.render(scene, camera);
  }

  return {
    tick,
    resize,
    setActive(i, p) { active = i; prog = p; },
    setLab(chosen) { labState.chosen = new Set(chosen); lab.set(labState.chosen); },
    rings: body.rings,
    toggleRing(i) { body.rings[i].on = !body.rings[i].on; return body.rings[i].on; },
    snap() { const s = (stations[active] || stations[0])(prog); camPos.copy(s.pos); camLook.copy(s.look); },
  };
}
