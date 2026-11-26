import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/* Palette: muted clay world, warm life, teal data. */
export const COL = {
  clay: 0xb7b1a7,
  clayWarm: 0xc2b29e,
  coat: 0xe6e3dc,
  wall: 0xbdb6aa,
  wallClinic: 0xc4c9c6,
  floorWood: 0x7d6a57,
  floorClinic: 0x9ea6a3,
  slab: 0x2a2f33,
  wood: 0x5a4838,
  fabric: 0x55727a,
  linen: 0xd9d3c8,
  metal: 0x9aa3a8,
  plant: 0x4f6b4f,
  amber: new THREE.Color(1.0, 0.66, 0.28),
  teal: new THREE.Color(0.31, 0.78, 0.71),
};

const matCache = new Map();
export function clayMat(color, rough = 0.88, metal = 0) {
  const k = `${color}-${rough}-${metal}`;
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return matCache.get(k);
}

/** Unlit HDR colour so bloom picks it up. */
export function glowMat(color, intensity = 4, opts = {}) {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  return new THREE.MeshBasicMaterial({ color: c, toneMapped: false, ...opts });
}

export function box(w, h, d, mat, x = 0, y = 0, z = 0, r = 0) {
  const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function sphere(r, mat, x = 0, y = 0, z = 0, seg = 24) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75)), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const seg = (p, a, b) => clamp((p - a) / (b - a));
export const smooth = (t) => t * t * (3 - 2 * t);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Soft additive light shaft (a cone/box with a vertical gradient). */
export function lightShaft(w, h, d, color) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0.12 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec3 vP;
      void main(){ float g = smoothstep(${(h / 2).toFixed(2)}, ${(-h / 2).toFixed(2)}, vP.y);
        float edge = 1.0 - smoothstep(0.35, 0.5, abs(vP.x)/${w.toFixed(2)});
        gl_FragColor = vec4(uColor, uOpacity * (1.0 - g*0.85) * edge); }`,
  });
  return new THREE.Mesh(geo, mat);
}

/** Canvas texture helper for cards and screens. */
export function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
