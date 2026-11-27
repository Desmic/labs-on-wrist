import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { clayMat } from "./kit.js";

/*
 * Rigged human figure (Mixamo "X Bot", distributed with the three.js examples).
 * Layers, applied every frame:
 *   1. idle animation (breathing, weight shift), cross-faded with a walk cycle whose phase is driven by scroll
 *   2. additive gestures (nod, head shake, slump) whose time and weight are driven by scroll
 *   3. a pose: limbs aimed at directions in the figure's own frame, blended between two named poses
 * Everything that is scroll-driven is set from scroll position, so it plays backwards exactly.
 * Feet at y = 0, faces +z, about 1.78 m tall.
 */

const bases = {}; // figure kind -> loaded glTF (meshes + skeleton)
let animGltf = null; // shared Mixamo clips (idle, walk, gestures) on X Bot's skeleton, kept unquantized
export function loadHumanAssets(figures, animUrl) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return Promise.all([
    loader.loadAsync(animUrl).then((a) => (animGltf = a)),
    ...Object.entries(figures).map(([k, url]) => loader.loadAsync(url).then((g) => (bases[k] = g))),
  ]);
}

/* ---- retargeting ----
 * The clips were made on X Bot. Other Mixamo characters share bone names but not units or joint axes,
 * so the clips are re-baked per character: at every frame each bone gets the same rotation AWAY FROM THE T-POSE
 * (in world space) as on X Bot, expressed in that character's own joint frames. Hip travel is scaled by hip height.
 * Both rigs must be in a T-pose at rest, which Mixamo downloads are. */
const strip = (n) => n.replace(/^mixamorig\d*:?/, "");
function boneMap(root) {
  const m = {};
  root.traverse((o) => { if (o.isBone || /^mixamorig/.test(o.name)) m[strip(o.name)] = o; });
  return m;
}
function restWorld(map) {
  const q = {};
  Object.values(map)[0].parent.updateWorldMatrix(true, true);
  for (const [n, b] of Object.entries(map)) q[n] = b.getWorldQuaternion(new THREE.Quaternion());
  return q;
}
function retargetClips(kind) {
  const src = SkeletonUtils.clone(animGltf.scene);
  const S = boneMap(src);
  const T = boneMap(bases[kind].scene);
  const sRest = restWorld(S), tRest = restWorld(T);
  // hip travel is moved in world space (rigs differ in units and in which way their root is turned),
  // scaled by hip height above the feet, then expressed in the target hips' parent space
  src.updateMatrixWorld(true);
  const tScene = bases[kind].scene; tScene.updateMatrixWorld(true);
  const sHipsW = S.Hips.getWorldPosition(new THREE.Vector3()), tHipsW = T.Hips.getWorldPosition(new THREE.Vector3());
  const footY = (M, root) => Math.min(...["LeftToeBase", "RightToeBase", "LeftFoot", "RightFoot"].filter((n) => M[n]).map((n) => M[n].getWorldPosition(new THREE.Vector3()).y));
  const hipScale = (tHipsW.y - footY(T)) / (sHipsW.y - footY(S));
  const tParentInv = T.Hips.parent.matrixWorld.clone().invert();
  const dW = new THREE.Vector3(), pL = new THREE.Vector3();
  // target bones, parents first
  const order = [];
  T.Hips.traverse((o) => { const n = strip(o.name); if (S[n]) order.push(n); });
  const tParentRest = T.Hips.parent.getWorldQuaternion(new THREE.Quaternion());
  const mixer = new THREE.AnimationMixer(src);
  const out = {};
  const q = new THREE.Quaternion(), d = new THREE.Quaternion(), w = {}, inv = new THREE.Quaternion();
  for (const clip of animGltf.animations) {
    mixer.stopAllAction();
    const act = mixer.clipAction(clip);
    act.play();
    const fps = 30, n = Math.max(2, Math.round(clip.duration * fps) + 1);
    const times = new Float32Array(n);
    const rot = {}; order.forEach((b) => (rot[b] = new Float32Array(n * 4)));
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const t = Math.min(clip.duration, i / fps);
      times[i] = t;
      act.time = t; mixer.update(0);
      src.updateMatrixWorld(true);
      for (const b of order) {
        S[b].getWorldQuaternion(q);
        d.copy(q).multiply(inv.copy(sRest[b]).invert()); // world-space change from rest on X Bot
        w[b] = d.clone().multiply(tRest[b]); // same change applied to the target's rest
        const pw = T[b] === T.Hips ? tParentRest : w[strip(T[b].parent.name)];
        q.copy(pw).invert().multiply(w[b]);
        q.toArray(rot[b], i * 4);
      }
      S.Hips.getWorldPosition(dW).sub(sHipsW).multiplyScalar(hipScale);
      pL.copy(tHipsW).add(dW).applyMatrix4(tParentInv);
      pL.toArray(pos, i * 3);
    }
    const tracks = order.map((b) => new THREE.QuaternionKeyframeTrack(`${T[b].name}.quaternion`, times, rot[b]));
    tracks.push(new THREE.VectorKeyframeTrack(`${T.Hips.name}.position`, times, pos));
    out[clip.name] = new THREE.AnimationClip(clip.name, clip.duration, tracks);
  }
  mixer.stopAllAction();
  return out;
}
const clipCache = {};
function clipsFor(kind) {
  if (clipCache[kind]) return clipCache[kind];
  const raw = kind === "xbot" ? Object.fromEntries(animGltf.animations.map((c) => [c.name, c])) : retargetClips(kind);
  const out = {};
  for (const [n, c] of Object.entries(raw)) out[n] = ["agree", "headShake", "sad_pose"].includes(n) ? THREE.AnimationUtils.makeClipAdditive(c.clone()) : c;
  return (clipCache[kind] = out);
}
export const humanReady = () => !!animGltf;

/* Directions in the figure's frame: x = figure's left, y = up, z = forward. */
const N = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const POSES = {
  stand: { aim: {} },
  cup: { aim: { RightArm: N(-0.18, -0.9, 0.38), RightForeArm: N(0.32, 0.82, 0.45), Head: N(0, 0.97, 0.22) } },
  sip: { aim: { RightArm: N(-0.12, -0.55, 0.82), RightForeArm: N(0.3, 0.93, 0.2), Head: N(0, 0.96, -0.25) } },
  check: {
    aim: { RightArm: N(-0.18, -0.9, 0.38), RightForeArm: N(0.32, 0.82, 0.45),
      LeftArm: N(0.3, -0.75, 0.6), LeftForeArm: N(-0.7, 0.4, 0.6), Head: N(0.18, 0.72, 0.67) },
  },
  window: {
    aim: { LeftArm: N(0.16, -0.82, 0.5), LeftForeArm: N(-0.2, -0.05, 1), RightArm: N(-0.16, -0.82, 0.5), RightForeArm: N(0.2, -0.05, 1) },
  },
  sit: {
    hipsDrop: 0.38,
    aim: { LeftUpLeg: N(0.1, -0.14, 1), RightUpLeg: N(-0.1, -0.14, 1), LeftLeg: N(0.03, -1, 0.3), RightLeg: N(-0.03, -1, 0.3),
      LeftArm: N(0.12, -0.9, 0.35), LeftForeArm: N(-0.08, -0.3, 1), RightArm: N(-0.12, -0.9, 0.35), RightForeArm: N(0.08, -0.3, 1) },
  },
  // seated on the edge of a bed (higher than a chair), elbows on knees
  bedEdge: {
    hipsDrop: 0.29,
    aim: { LeftUpLeg: N(0.12, -0.32, 1), RightUpLeg: N(-0.12, -0.32, 1), LeftLeg: N(0.03, -1, 0.12), RightLeg: N(-0.03, -1, 0.12),
      LeftArm: N(0.1, -0.85, 0.5), LeftForeArm: N(-0.25, -0.15, 1), RightArm: N(-0.1, -0.85, 0.5), RightForeArm: N(0.25, -0.15, 1),
      Head: N(0, 0.8, 0.6) },
  },
  // still lying, legs swung over the edge of the bed with the shins hanging down (in the lying frame, -z is the floor)
  lieEdge: {
    lieDown: true,
    aim: { LeftArm: N(0.22, -1, -0.05), LeftForeArm: N(0.1, -1, 0.1), RightArm: N(-0.3, -0.92, 0.22), RightForeArm: N(0.9, 0.25, 0.3),
      LeftUpLeg: N(0.1, -1, 0.05), RightUpLeg: N(-0.1, -1, 0.05), LeftLeg: N(0.05, -0.2, -1), RightLeg: N(-0.05, -0.2, -1) },
  },
  lie: {
    lieDown: true,
    aim: { LeftArm: N(0.22, -1, -0.05), LeftForeArm: N(0.1, -1, 0.1), RightArm: N(-0.3, -0.92, 0.22), RightForeArm: N(0.9, 0.25, 0.3),
      LeftUpLeg: N(0.06, -1, 0), LeftLeg: N(0.04, -1, 0), RightUpLeg: N(-0.06, -1, 0), RightLeg: N(-0.04, -1, 0),
      LeftFoot: N(0.1, -0.75, 0.6), RightFoot: N(-0.1, -0.75, 0.6) },
  },
};
/* parents before children, with the child bone that defines each bone's direction */
const ORDER = [
  ["LeftUpLeg", "LeftLeg"], ["RightUpLeg", "RightLeg"], ["LeftLeg", "LeftFoot"], ["RightLeg", "RightFoot"],
  ["LeftFoot", "LeftToeBase"], ["RightFoot", "RightToeBase"],
  ["LeftArm", "LeftForeArm"], ["RightArm", "RightForeArm"], ["LeftForeArm", "LeftHand"], ["RightForeArm", "RightHand"],
  ["Head", "HeadTop_End"],
];
const PIVOT = 0.95; // lying down rotates about the hips, not the feet

/* palette: { skin, top, bottom, shoes, hair } for figures with clothing meshes (named Body, Hoodie, Pants, Sneakers, Hair, Beard) */
const PART = { Body: "skin", Hoodie: "top", Shirt: "top", Pants: "bottom", Sneakers: "shoes", Shoe: "shoes", Hair: "hair", Beard: "hair" };
export function makeHuman({ height = 1.78, seatLift = 0, kind = "xbot", color = 0xc2b29e, joint = 0x8d8478, palette = null, pose = "stand", speed = 0.7, build = "m" } = {}) {
  const base = bases[kind];
  if (!base || !animGltf) throw new Error("human asset not loaded");
  const root = new THREE.Group();
  const holder = new THREE.Group();
  root.add(holder);
  const model = SkeletonUtils.clone(base.scene);
  holder.add(model);

  const surf = clayMat(color, 0.78);
  const joints = clayMat(joint, 0.6);
  model.traverse((o) => {
    if (o.isMesh) {
      const part = palette && (PART[(o.name || "").replace(/^Ch\d+_|_\d+$/g, "")] || PART[o.parent && o.parent.name.replace(/^Ch\d+_/, "")]);
      if (part) o.material = clayMat(palette[part], part === "hair" ? 0.95 : part === "skin" ? 0.7 : 0.85);
      else o.material = /joint/i.test(o.material?.name || "") ? joints : surf;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
    }
  });

  // normalise height (default 1.78 m) with feet on the floor
  model.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(model);
  const s = height / Math.max(0.01, bb.max.y - bb.min.y);
  model.scale.multiplyScalar(s);
  model.position.y = -bb.min.y * s;

  const bones = {};
  model.traverse((o) => { if (o.isBone) bones[o.name.replace(/^mixamorig:?/, "")] = o; });

  // broader shoulders, flatter chest, narrower hips for a male build; children get the inverse scale
  if (kind === "xbot" && build === "m" && bones.Spine2) {
    const sc = new THREE.Vector3(1.1, 1, 0.8);
    bones.Spine2.scale.copy(sc);
    bones.Spine2.children.forEach((c) => c.isBone && c.scale.set(1 / sc.x, 1 / sc.y, 1 / sc.z));
    ["LeftUpLeg", "RightUpLeg"].forEach((n) => { if (bones[n]) bones[n].position.x *= 0.86; });
    if (bones.Spine) {
      bones.Spine.scale.set(1.04, 1, 0.92);
      bones.Spine.children.forEach((c) => c.isBone && c !== bones.Spine2 && c.scale.set(1 / 1.04, 1, 1 / 0.92));
    }
  }

  const mixer = new THREE.AnimationMixer(model);
  const C = clipsFor(kind);
  const clip = (n) => C[n];
  const idle = mixer.clipAction(clip("idle"));
  idle.play();
  idle.time = Math.random() * idle.getClip().duration;
  idle.timeScale = speed;
  const walk = clip("walk") ? mixer.clipAction(clip("walk")) : null;
  if (walk) { walk.play(); walk.paused = true; walk.setEffectiveWeight(0); }
  const gest = {};
  ["agree", "headShake", "sad_pose"].filter((n) => C[n]).forEach((n) => {
    const a = mixer.clipAction(C[n]);
    a.play(); a.paused = true; a.setEffectiveWeight(0);
    gest[n] = a;
  });

  /* ---- state, set by the scene each frame ---- */
  const st = { a: pose, b: pose, k: 0, walkW: 0, walkPhase: 0 };
  const g = {}; // gesture name -> { w, t }

  const hipsRest = bones.Hips ? bones.Hips.position.clone() : null;
  // the figure's "up", expressed in the hips' parent space (Blender-exported rigs sit under a Z-up parent)
  const hipsUp = new THREE.Vector3(0, 1, 0);
  if (bones.Hips) {
    root.updateMatrixWorld(true);
    const qp = bones.Hips.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    hipsUp.applyQuaternion(root.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(qp).normalize();
  }
  const hipD = new THREE.Vector3();
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qp = new THREE.Quaternion(), qd = new THREE.Quaternion();
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vd = new THREE.Vector3(), vt = new THREE.Vector3();

  function aim(bone, child, dir, w) {
    bone.updateWorldMatrix(true, false);
    child.updateWorldMatrix(false, false);
    va.setFromMatrixPosition(bone.matrixWorld);
    vb.setFromMatrixPosition(child.matrixWorld).sub(va).normalize();
    holder.getWorldQuaternion(qp);
    vd.copy(dir).applyQuaternion(qp);
    qa.setFromUnitVectors(vb, vd);
    bone.getWorldQuaternion(qb);
    qa.multiply(qb);
    bone.parent.getWorldQuaternion(qp).invert();
    qd.copy(qp.multiply(qa));
    if (w >= 0.999) bone.quaternion.copy(qd);
    else bone.quaternion.slerp(qd, w);
  }

  function applyPose() {
    const A = POSES[st.a] || POSES.stand, B = POSES[st.b] || POSES.stand, k = st.k;
    // lying down: rotate about the hips
    const lieK = (A.lieDown ? 1 - k : 0) + (B.lieDown ? k : 0);
    const ang = (-Math.PI / 2) * lieK;
    holder.rotation.set(ang, 0, 0);
    holder.position.set(0, PIVOT - PIVOT * Math.cos(ang), -PIVOT * Math.sin(ang));
    if (bones.Hips) {
      // drop is in metres; convert to the skeleton's own units (Mixamo rigs are in centimetres)
      bones.Hips.parent.getWorldScale(vt);
      root.getWorldScale(va);
      // seatLift: thicker thighs or longer shins need the hips to stop a little higher
      const dA = A.hipsDrop ? A.hipsDrop - seatLift : 0, dB = B.hipsDrop ? B.hipsDrop - seatLift : 0;
      const drop = (dA * (1 - k) + dB * k) / (vt.x / va.x);
      // keep only a little of the clip's sideways sway, never let it lift above rest height, then lower by drop
      hipD.copy(bones.Hips.position).sub(hipsRest);
      const up = Math.min(hipD.dot(hipsUp), 0);
      hipD.addScaledVector(hipsUp, -hipD.dot(hipsUp)).multiplyScalar(0.15);
      bones.Hips.position.copy(hipsRest).add(hipD).addScaledVector(hipsUp, up - drop);
    }
    for (const [name, childName] of ORDER) {
      const da = A.aim[name], db = B.aim[name];
      if (!da && !db) continue;
      const b = bones[name], c = bones[childName];
      if (!b || !c) continue;
      if (da && db) aim(b, c, vt.copy(da).lerp(db, k).normalize(), 1);
      else if (da) { if (k < 0.999) aim(b, c, da, 1 - k); }
      else if (k > 0.001) aim(b, c, db, k);
    }
  }

  function update(dt) {
    if (hipsRest) bones.Hips.position.copy(hipsRest); // never accumulate offsets
    const ww = walk ? st.walkW : 0;
    idle.setEffectiveWeight(1 - ww);
    if (walk) {
      walk.setEffectiveWeight(ww);
      walk.time = (((st.walkPhase % 1) + 1) % 1) * walk.getClip().duration;
    }
    Object.entries(gest).forEach(([n, a]) => {
      const s2 = g[n];
      a.setEffectiveWeight(s2 ? s2.w : 0);
      if (s2) a.time = Math.min(0.999, Math.max(0, s2.t)) * a.getClip().duration;
    });
    mixer.update(dt);
    applyPose();
  }

  /* scene controls */
  function setPose(a, b = a, k = 0) { st.a = a; st.b = b; st.k = Math.min(1, Math.max(0, k)); }
  function setWalk(w, phase) { st.walkW = Math.min(1, Math.max(0, w)); st.walkPhase = phase; }
  function gesture(name, w, t) { if (w <= 0.001) delete g[name]; else g[name] = { w, t }; }
  setPose(pose);
  update(0);

  /* world-space samples of the skinned surface, for placement checks */
  const meshes = [];
  model.traverse((o) => { if (o.isSkinnedMesh) meshes.push(o); });
  function sample(step = 7) {
    const out = [];
    const v = new THREE.Vector3();
    root.updateMatrixWorld(true);
    meshes.forEach((m) => {
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i);
        m.applyBoneTransform(i, v);
        out.push(v.clone().applyMatrix4(m.matrixWorld));
      }
    });
    return out;
  }
  const bonePos = (n) => (bones[n] ? bones[n].getWorldPosition(new THREE.Vector3()) : null);

  return {
    root, bones, update, setPose, setWalk, gesture, sample, bonePos,
    poseName: () => (st.k < 0.5 ? st.a : st.b),
    hand: (side) => bones[side === "L" ? "LeftHand" : "RightHand"],
    scale: s,
  };
}

/* ---- dissolve: one figure burns away into another ----
 * k = 0: fully the figure as built; k = 1: gone. With `appear` the reverse, so a pair of figures sharing one k
 * hands over cleanly: each point of space belongs to exactly one of them at any moment, with a thin warm seam. */
export function makeDissolvable(h, appear = false) {
  const u = { uDis: { value: appear ? 1 : 0 }, uInv: { value: appear ? 1 : 0 } };
  h.root.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material.clone();
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = sh.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vDisP;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvDisP = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", `#include <common>
          varying vec3 vDisP; uniform float uDis; uniform float uInv; float disEdge;
          float dh(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
          float dn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(dh(i), dh(i + vec3(1,0,0)), f.x), mix(dh(i + vec3(0,1,0)), dh(i + vec3(1,1,0)), f.x), f.y),
                       mix(mix(dh(i + vec3(0,0,1)), dh(i + vec3(1,0,1)), f.x), mix(dh(i + vec3(0,1,1)), dh(i + vec3(1,1,1)), f.x), f.y), f.z); }`)
        .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>
          float dN = 0.65 * dn(vDisP * 9.0) + 0.35 * dn(vDisP * 23.0);
          float dT = uInv > 0.5 ? 1.0 - dN : dN;
          if (dT < uDis) discard;
          disEdge = (uDis > 0.001 && uDis < 0.999) ? smoothstep(uDis + 0.05, uDis, dT) : 0.0;`)
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.68, 0.36) * disEdge * 2.5;");
    };
    m.customProgramCacheKey = () => "dissolve";
    o.material = m;
  });
  // k: 0 = this figure whole (or, with appear, not yet there), 1 = the reverse
  return (k) => {
    u.uDis.value = appear ? 1 - k : k;
    const shown = appear ? k > 0.001 : k < 0.999;
    h.root.visible = shown;
    h.root.traverse((o) => { if (o.isMesh) o.castShadow = appear ? k > 0.5 : k <= 0.5; });
  };
}
