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

let base = null;
const additive = {};
export function loadHumanAsset(url) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader.loadAsync(url).then((g) => {
    base = g;
    ["agree", "headShake", "sad_pose"].forEach((n) => {
      const c = g.animations.find((a) => a.name === n);
      if (c) additive[n] = THREE.AnimationUtils.makeClipAdditive(c.clone());
    });
    return g;
  });
}
export const humanReady = () => !!base;

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

export function makeHuman({ color = 0xc2b29e, joint = 0x8d8478, pose = "stand", speed = 0.7, build = "m" } = {}) {
  if (!base) throw new Error("human asset not loaded");
  const root = new THREE.Group();
  const holder = new THREE.Group();
  root.add(holder);
  const model = SkeletonUtils.clone(base.scene);
  holder.add(model);

  const surf = clayMat(color, 0.78);
  const joints = clayMat(joint, 0.6);
  model.traverse((o) => {
    if (o.isMesh) {
      o.material = /joint/i.test(o.material?.name || "") ? joints : surf;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
    }
  });

  // normalise height to 1.78 m with feet on the floor
  model.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(model);
  const s = 1.78 / Math.max(0.01, bb.max.y - bb.min.y);
  model.scale.multiplyScalar(s);
  model.position.y = -bb.min.y * s;

  const bones = {};
  model.traverse((o) => { if (o.isBone) bones[o.name.replace(/^mixamorig:?/, "")] = o; });

  // broader shoulders, flatter chest, narrower hips for a male build; children get the inverse scale
  if (build === "m" && bones.Spine2) {
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
  const clip = (n) => base.animations.find((a) => a.name === n);
  const idle = mixer.clipAction(clip("idle"));
  idle.play();
  idle.time = Math.random() * idle.getClip().duration;
  idle.timeScale = speed;
  const walk = clip("walk") ? mixer.clipAction(clip("walk")) : null;
  if (walk) { walk.play(); walk.paused = true; walk.setEffectiveWeight(0); }
  const gest = {};
  Object.entries(additive).forEach(([n, c]) => {
    const a = mixer.clipAction(c);
    a.play(); a.paused = true; a.setEffectiveWeight(0);
    gest[n] = a;
  });

  /* ---- state, set by the scene each frame ---- */
  const st = { a: pose, b: pose, k: 0, walkW: 0, walkPhase: 0 };
  const g = {}; // gesture name -> { w, t }

  const hipsRest = bones.Hips ? bones.Hips.position.clone() : null;
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
      const drop = ((A.hipsDrop || 0) * (1 - k) + (B.hipsDrop || 0) * k) / (vt.y / va.y);
      bones.Hips.position.x *= 0.15;
      bones.Hips.position.z *= 0.15;
      bones.Hips.position.y = Math.min(bones.Hips.position.y, hipsRest ? hipsRest.y : 0) - drop;
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
