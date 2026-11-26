import * as THREE from "three";
import { clayMat, COL } from "./kit.js";

/**
 * Faceless clay mannequin. Faces +z. Feet at y = 0.
 * Poses: stand, cup, sit, lie, window.
 */
export function makePerson(color = COL.clay) {
  const mat = clayMat(color, 0.82);
  const cap = (r, len) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.94;
  root.add(hips);

  const pelvis = cap(0.15, 0.12);
  pelvis.rotation.z = Math.PI / 2;
  pelvis.scale.set(1, 1, 0.8);
  hips.add(pelvis);

  const torso = new THREE.Group();
  hips.add(torso);
  const chest = cap(0.17, 0.36);
  chest.position.y = 0.34;
  chest.scale.set(1.15, 1, 0.72);
  torso.add(chest);
  const neck = cap(0.05, 0.08);
  neck.position.y = 0.68;
  torso.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18), mat);
  head.scale.set(0.92, 1.15, 1);
  head.position.y = 0.84;
  head.castShadow = true;
  torso.add(head);

  const arm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.25 * side, 0.6, 0);
    torso.add(shoulder);
    const upper = cap(0.055, 0.22);
    upper.position.y = -0.15;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    shoulder.add(elbow);
    const fore = cap(0.047, 0.2);
    fore.position.y = -0.13;
    elbow.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 10), mat);
    hand.position.y = -0.28;
    hand.scale.set(0.8, 1.1, 0.6);
    hand.castShadow = true;
    elbow.add(hand);
    return { shoulder, elbow, hand };
  };
  const leg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(0.1 * side, -0.04, 0);
    hips.add(hip);
    const thigh = cap(0.078, 0.3);
    thigh.position.y = -0.21;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.44;
    hip.add(knee);
    const shin = cap(0.064, 0.32);
    shin.position.y = -0.21;
    knee.add(shin);
    const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 4, 10), mat);
    foot.rotation.x = Math.PI / 2;
    foot.position.set(0, -0.44, 0.05);
    foot.castShadow = true;
    knee.add(foot);
    return { hip, knee };
  };

  const P = { root, hips, torso, head, armL: arm(1), armR: arm(-1), legL: leg(1), legR: leg(-1) };
  setPose(P, "stand");
  return P;
}

export function setPose(P, pose) {
  const { hips, torso, armL, armR, legL, legR, head } = P;
  const z = (o) => { o.rotation.set(0, 0, 0); };
  [torso, armL.shoulder, armL.elbow, armR.shoulder, armR.elbow, legL.hip, legL.knee, legR.hip, legR.knee, head].forEach(z);
  hips.position.y = 0.94;
  hips.rotation.set(0, 0, 0);
  armL.shoulder.rotation.z = 0.09;
  armR.shoulder.rotation.z = -0.09;
  if (pose === "cup") {
    armR.shoulder.rotation.set(-0.35, 0, -0.12);
    armR.elbow.rotation.x = -1.75;
    head.rotation.x = 0.08;
  } else if (pose === "sit") {
    hips.position.y = 0.5;
    legL.hip.rotation.x = legR.hip.rotation.x = -1.5;
    legL.knee.rotation.x = legR.knee.rotation.x = 1.5;
    torso.rotation.x = -0.06;
    armL.shoulder.rotation.x = armR.shoulder.rotation.x = -0.45;
    armL.elbow.rotation.x = armR.elbow.rotation.x = -0.95;
  } else if (pose === "lie") {
    hips.position.y = 0.12;
    hips.rotation.x = -Math.PI / 2;
    armL.shoulder.rotation.z = 0.12;
    armR.shoulder.rotation.z = -0.4;
    armR.elbow.rotation.x = -0.6;
    legR.hip.rotation.x = -0.2;
    legR.knee.rotation.x = 0.35;
    head.rotation.y = 0.5;
  } else if (pose === "window") {
    armL.shoulder.rotation.set(-0.2, 0, 0.15);
    armL.elbow.rotation.x = -1.2;
    armR.shoulder.rotation.set(-0.2, 0, -0.15);
    armR.elbow.rotation.x = -1.2;
  }
}
