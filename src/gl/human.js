import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { clayMat } from "./kit.js";

/*
 * Rigged human figure (Mixamo "X Bot", distributed with the three.js examples).
 * Every figure plays a slow idle (breathing, weight shift); poses are layered on
 * top as per-bone rotation offsets, so a seated or lying figure still breathes.
 * Feet at y = 0, faces +z, about 1.78 m tall.
 */

let base = null;
export function loadHumanAsset(url) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader.loadAsync(url).then((g) => { base = g; return g; });
}
export const humanReady = () => !!base;


/* Poses aim limbs at directions in the figure's own frame (x = figure's left, y = up, z = forward),
   applied after the idle animation each frame so the spine and head keep breathing. */
const N = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const POSES = {
  stand: { aim: [] },
  cup: { aim: [["RightArm", "RightForeArm", N(-0.18, -0.9, 0.38)], ["RightForeArm", "RightHand", N(0.32, 0.82, 0.45)]], head: N(0, -0.15, 1) },
  window: {
    aim: [["LeftArm", "LeftForeArm", N(0.16, -0.82, 0.5)], ["LeftForeArm", "LeftHand", N(-0.2, -0.05, 1)],
      ["RightArm", "RightForeArm", N(-0.16, -0.82, 0.5)], ["RightForeArm", "RightHand", N(0.2, -0.05, 1)]],
  },
  sit: {
    hipsDrop: 0.47,
    aim: [["LeftUpLeg", "LeftLeg", N(0.1, -0.22, 1)], ["RightUpLeg", "RightLeg", N(-0.1, -0.22, 1)],
      ["LeftLeg", "LeftFoot", N(0.03, -1, 0.08)], ["RightLeg", "RightFoot", N(-0.03, -1, 0.08)],
      ["LeftArm", "LeftForeArm", N(0.12, -0.9, 0.35)], ["LeftForeArm", "LeftHand", N(-0.08, -0.3, 1)],
      ["RightArm", "RightForeArm", N(-0.12, -0.9, 0.35)], ["RightForeArm", "RightHand", N(0.08, -0.3, 1)]],
  },
  lie: {
    lieDown: true,
    aim: [["LeftArm", "LeftForeArm", N(0.22, -1, -0.05)], ["LeftForeArm", "LeftHand", N(0.1, -1, 0.1)],
      ["RightArm", "RightForeArm", N(-0.35, -0.9, 0.1)], ["RightForeArm", "RightHand", N(0.9, 0.3, 0.2)],
      ["RightUpLeg", "RightLeg", N(-0.12, -0.95, 0.3)], ["RightLeg", "RightFoot", N(-0.05, -1, -0.15)]],
  },
};

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
    if (bones.Spine) bones.Spine.scale.set(1.04, 1, 0.92);
    bones.Spine.children.forEach((c) => c.isBone && c !== bones.Spine2 && c.scale.set(1 / 1.04, 1, 1 / 0.92));
  }

  const mixer = new THREE.AnimationMixer(model);
  const clip = (n) => base.animations.find((a) => a.name === n);
  const idle = mixer.clipAction(clip("idle"));
  idle.play();
  idle.time = Math.random() * idle.getClip().duration;
  idle.timeScale = speed;

  let current = POSES[pose] || POSES.stand;
  const hipsY0 = bones.Hips ? bones.Hips.position.y : 0;

  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), qp = new THREE.Quaternion();
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vd = new THREE.Vector3();
  function aim(bone, child, dir) {
    bone.updateWorldMatrix(true, false);
    child.updateWorldMatrix(false, false);
    va.setFromMatrixPosition(bone.matrixWorld);
    vb.setFromMatrixPosition(child.matrixWorld).sub(va).normalize();
    holder.getWorldQuaternion(qp);
    vd.copy(dir).applyQuaternion(qp);
    qa.setFromUnitVectors(vb, vd); // world-space delta
    bone.getWorldQuaternion(qb);
    qa.multiply(qb); // desired world rotation
    bone.parent.getWorldQuaternion(qp).invert();
    bone.quaternion.copy(qp.multiply(qa));
  }
  function applyPose() {
    if (bones.Hips) {
      // keep the figure in place: damp the idle's drift, then drop for sitting
      const drop = (current.hipsDrop || 0) / s;
      bones.Hips.position.x *= 0.15;
      bones.Hips.position.z *= 0.15;
      bones.Hips.position.y = Math.min(bones.Hips.position.y, hipsY0) - drop;
    }
    for (const [name, childName, dir] of current.aim) {
      const b = bones[name], c = bones[childName];
      if (b && c) aim(b, c, dir);
    }
  }

  function setPose(name) {
    current = POSES[name] || POSES.stand;
    holder.rotation.set(current.lieDown ? -Math.PI / 2 : 0, 0, 0);
    holder.position.set(0, current.lieDown ? 0.12 : 0, current.lieDown ? 0.9 : 0);
  }
  setPose(pose);

  function update(dt) {
    mixer.update(dt);
    applyPose();
  }
  update(0);

  return { root, bones, update, setPose, hand: (side) => bones[side === "L" ? "LeftHand" : "RightHand"], scale: s };
}
