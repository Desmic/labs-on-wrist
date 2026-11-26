import * as THREE from "three";
import { COL, clayMat, glowMat, box, cyl, sphere, lightShaft, canvasTexture } from "./kit.js";
import { makePerson, setPose } from "./person.js";

/* A floating diorama slab with two walls, like a cut-away miniature set. */
function shell(group, { w = 9, d = 7, h = 3.2, wallCol, floorCol, win }) {
  group.add(box(w + 0.3, 0.6, d + 0.3, clayMat(COL.slab, 0.7), 0, -0.32, 0, 0.12));
  group.add(box(w, 0.06, d, clayMat(floorCol, 0.75), 0, -0.01, 0));
  const wm = clayMat(wallCol, 0.92);
  const bz = -d / 2 - 0.1;
  // back wall with a window opening [x0, x1] x [y0, y1]
  const [x0, x1, y0, y1] = win;
  const t = 0.2;
  group.add(box(x0 + w / 2, h, t, wm, (-w / 2 + x0) / 2, h / 2, bz));
  group.add(box(w / 2 - x1, h, t, wm, (x1 + w / 2) / 2, h / 2, bz));
  group.add(box(x1 - x0, y0, t, wm, (x0 + x1) / 2, y0 / 2, bz));
  group.add(box(x1 - x0, h - y1, t, wm, (x0 + x1) / 2, (h + y1) / 2, bz));
  // window frame + mullion
  const fm = clayMat(0xe9e5dd, 0.6);
  const fx = (x0 + x1) / 2, fy = (y0 + y1) / 2, fw = x1 - x0, fh = y1 - y0;
  group.add(box(fw, 0.06, 0.26, fm, fx, y0, bz));
  group.add(box(fw, 0.06, 0.26, fm, fx, y1, bz));
  group.add(box(0.06, fh, 0.26, fm, x0, fy, bz));
  group.add(box(0.06, fh, 0.26, fm, x1, fy, bz));
  group.add(box(0.04, fh, 0.12, fm, fx, fy, bz));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), new THREE.MeshBasicMaterial({ color: 0xbfd6e6, transparent: true, opacity: 0.08, depthWrite: false }));
  glass.position.set(fx, fy, bz);
  group.add(glass);
  // left wall
  group.add(box(t, h, d, wm, -w / 2 - 0.1, h / 2, 0));
  return { windowCenter: new THREE.Vector3(fx, fy, bz), fw, fh };
}

/* ---------- Aarav's apartment ---------- */
export function apartment() {
  const g = new THREE.Group();
  const { windowCenter, fw, fh } = shell(g, { wallCol: COL.wall, floorCol: COL.floorWood, win: [0.4, 3.2, 0.9, 2.65] });

  // rug
  const rug = cyl(1.5, 1.5, 0.02, clayMat(0x6d5f58, 0.95), 0.4, 0.03, 0.4, 48);
  rug.scale.z = 0.7;
  g.add(rug);
  // bed along the left wall
  const bed = new THREE.Group();
  bed.add(box(1.6, 0.34, 2.2, clayMat(COL.wood, 0.8), 0, 0.17, 0, 0.04));
  bed.add(box(1.5, 0.2, 2.1, clayMat(COL.linen, 0.95), 0, 0.44, 0, 0.08));
  bed.add(box(1.52, 0.1, 1.3, clayMat(COL.fabric, 0.95), 0, 0.57, 0.38, 0.05));
  bed.add(box(0.6, 0.12, 0.34, clayMat(0xece8e0, 0.95), -0.33, 0.6, -0.82, 0.06));
  bed.add(box(0.6, 0.12, 0.34, clayMat(0xece8e0, 0.95), 0.33, 0.6, -0.82, 0.06));
  bed.add(box(1.6, 0.9, 0.1, clayMat(COL.wood, 0.8), 0, 0.45, -1.12, 0.03));
  bed.position.set(-3.4, 0, -2.25);
  g.add(bed);
  // bedside table + lamp
  g.add(box(0.5, 0.5, 0.45, clayMat(COL.wood, 0.8), -2.25, 0.25, -3.0, 0.03));
  g.add(cyl(0.05, 0.08, 0.32, clayMat(COL.metal, 0.4, 0.4), -2.25, 0.66, -3.0));
  const shade = cyl(0.12, 0.2, 0.22, clayMat(0xe8dcc4, 0.9), -2.25, 0.9, -3.0);
  g.add(shade);
  const lamp = new THREE.PointLight(0xffb36b, 0, 6, 1.6);
  lamp.position.set(-2.25, 0.95, -2.85);
  g.add(lamp);
  // desk, laptop, chair (right side)
  const desk = new THREE.Group();
  desk.add(box(1.7, 0.06, 0.75, clayMat(COL.wood, 0.75), 0, 0.76, 0));
  [[-0.8, -0.32], [0.8, -0.32], [-0.8, 0.32], [0.8, 0.32]].forEach(([x, z]) => desk.add(box(0.05, 0.76, 0.05, clayMat(0x2f2a26, 0.6), x, 0.38, z)));
  desk.add(box(0.5, 0.02, 0.34, clayMat(0x3b3f44, 0.4, 0.3), 0.1, 0.8, 0.05));
  const lid = box(0.5, 0.32, 0.02, clayMat(0x3b3f44, 0.4, 0.3), 0.1, 0.96, -0.12);
  lid.rotation.x = -0.25;
  desk.add(lid);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.27), glowMat(0x9fd0e0, 0.9));
  screen.position.set(0.1, 0.965, -0.105);
  screen.rotation.x = -0.25;
  desk.add(screen);
  desk.add(box(0.12, 0.2, 0.12, clayMat(0x8a5a44, 0.9), -0.55, 0.88, 0.05, 0.02));
  desk.position.set(3.3, 0, -2.95);
  desk.rotation.y = 0;
  g.add(desk);
  const chair = new THREE.Group();
  chair.add(box(0.5, 0.06, 0.5, clayMat(0x40474c, 0.8), 0, 0.48, 0, 0.03));
  chair.add(box(0.5, 0.55, 0.06, clayMat(0x40474c, 0.8), 0, 0.78, 0.24, 0.03));
  chair.add(cyl(0.03, 0.03, 0.45, clayMat(COL.metal, 0.4, 0.4), 0, 0.24, 0));
  chair.position.set(3.2, 0, -2.2);
  chair.rotation.y = 0.3;
  g.add(chair);
  // shelf on the left wall with books
  g.add(box(0.3, 0.04, 1.6, clayMat(COL.wood, 0.8), -4.35, 1.75, 0.9));
  const bookCols = [0x7a4b3a, 0x52707a, 0xc2a36b, 0x5d6b52, 0x8c7f73, 0x3f4f63];
  bookCols.forEach((c, i) => g.add(box(0.2, 0.26 + (i % 3) * 0.04, 0.09, clayMat(c, 0.9), -4.33, 1.9 + (i % 3) * 0.02, 0.35 + i * 0.13)));
  // plant
  g.add(cyl(0.2, 0.15, 0.36, clayMat(0x9a6b52, 0.9), 4.0, 0.18, 0.6));
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), clayMat(COL.plant, 0.9));
  leaves.position.set(4.0, 0.68, 0.6);
  leaves.scale.set(1, 1.3, 1);
  leaves.castShadow = true;
  g.add(leaves);
  // small table by the window with a cup
  g.add(cyl(0.32, 0.32, 0.04, clayMat(COL.wood, 0.8), 1.0, 0.62, -2.4, 32));
  g.add(cyl(0.03, 0.05, 0.6, clayMat(0x2f2a26, 0.6), 1.0, 0.31, -2.4));
  g.add(cyl(0.045, 0.04, 0.09, clayMat(0xe9e2d4, 0.6), 0.95, 0.69, -2.35));

  // people
  const standing = makePerson(COL.clayWarm);
  setPose(standing, "cup");
  standing.root.position.set(1.9, 0, -1.7);
  standing.root.rotation.y = -0.35;
  const cup = cyl(0.04, 0.035, 0.08, clayMat(0xe9e2d4, 0.6), 0, -0.3, 0.02);
  standing.armR.elbow.add(cup);
  g.add(standing.root);

  const lying = makePerson(COL.clayWarm);
  setPose(lying, "lie");
  lying.root.position.set(-3.4, 0.5, -2.75);
  g.add(lying.root);

  const atWindow = makePerson(COL.clayWarm);
  setPose(atWindow, "window");
  atWindow.root.position.set(1.8, 0, -2.6);
  atWindow.root.rotation.y = Math.PI;
  g.add(atWindow.root);

  // wrist band (glows when worn)
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 10, 32), glowMat(COL.teal, 3));
  band.rotation.x = Math.PI / 2;
  band.position.y = -0.24;
  standing.armL.elbow.add(band);
  const band2 = band.clone();
  atWindow.armL.elbow.add(band2);

  // window light shaft
  const shaft = lightShaft(fw * 0.9, 4.2, 2.2, 0xffd29a);
  shaft.position.set(windowCenter.x - 0.2, 1.2, windowCenter.z + 1.2);
  shaft.rotation.x = 0.55;
  g.add(shaft);

  // "something happened?" marker over the bed at night
  const q = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.012, 8, 64), glowMat(COL.amber, 3));
  q.add(ring);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), glowMat(COL.amber, 4));
  q.add(dot);
  q.position.set(-3.4, 1.55, -2.5);
  g.add(q);

  return {
    group: g,
    lamp, shaft, q, ring, band, band2, standing, lying, atWindow,
    windowCenter: windowCenter.clone(),
    anchors: {
      wrist: () => standing.armL.elbow.localToWorld(new THREE.Vector3(0, -0.24, 0)),
    },
  };
}

/* ---------- The clinic ---------- */
export function clinic() {
  const g = new THREE.Group();
  const { windowCenter, fw } = shell(g, { wallCol: COL.wallClinic, floorCol: COL.floorClinic, win: [1.6, 3.8, 1.0, 2.6] });
  // desk
  g.add(box(2.4, 0.07, 1.0, clayMat(0xd8d6d0, 0.6), 0, 0.76, -1.2, 0.02));
  g.add(box(2.3, 0.72, 0.06, clayMat(0xbfc3c1, 0.7), 0, 0.37, -0.75));
  g.add(box(0.06, 0.74, 0.9, clayMat(0xbfc3c1, 0.7), -1.15, 0.37, -1.2));
  g.add(box(0.06, 0.74, 0.9, clayMat(0xbfc3c1, 0.7), 1.15, 0.37, -1.2));
  // monitor turned slightly so both can see it
  const mon = new THREE.Group();
  mon.add(box(0.95, 0.58, 0.04, clayMat(0x2b2f33, 0.4, 0.2), 0, 0.34, 0, 0.015));
  mon.add(cyl(0.03, 0.03, 0.2, clayMat(COL.metal, 0.4, 0.4), 0, 0.0, -0.05));
  mon.add(box(0.3, 0.02, 0.2, clayMat(COL.metal, 0.4, 0.4), 0, -0.1, -0.05));
  const screenTex = canvasTexture(1024, 620, drawEmptyScreen);
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.89, 0.52), screenMat);
  screen.position.set(0, 0.34, 0.022);
  mon.add(screen);
  mon.position.set(0.55, 0.9, -1.4);
  mon.rotation.y = -0.55;
  g.add(mon);
  g.add(box(0.28, 0.02, 0.36, clayMat(0xf2f0ea, 0.9), -0.5, 0.8, -1.1));
  // chairs + people
  const doctor = makePerson(COL.coat);
  setPose(doctor, "sit");
  doctor.root.position.set(-0.15, 0, -2.05);
  g.add(doctor.root);
  g.add(box(0.55, 0.08, 0.55, clayMat(0x3e464b, 0.8), -0.15, 0.44, -2.1, 0.03));
  g.add(box(0.55, 0.7, 0.08, clayMat(0x3e464b, 0.8), -0.15, 0.85, -2.4, 0.03));
  const patient = makePerson(COL.clayWarm);
  setPose(patient, "sit");
  patient.root.position.set(0.2, 0, 0.05);
  patient.root.rotation.y = Math.PI + 0.25;
  g.add(patient.root);
  g.add(box(0.55, 0.08, 0.55, clayMat(0x6a7c80, 0.8), 0.2, 0.44, 0.1, 0.03));
  g.add(box(0.55, 0.6, 0.08, clayMat(0x6a7c80, 0.8), 0.25, 0.8, 0.38, 0.03));
  // exam couch on the left
  g.add(box(0.8, 0.12, 2.0, clayMat(0xe6e7e2, 0.9), -3.6, 0.68, 0.6, 0.05));
  g.add(box(0.7, 0.62, 1.8, clayMat(0x8f9a9a, 0.8), -3.6, 0.31, 0.6, 0.03));
  // cabinet, certificate, plant
  g.add(box(1.4, 1.6, 0.5, clayMat(0xd2d4cf, 0.8), 3.6, 0.8, -3.0, 0.03));
  g.add(box(0.7, 0.5, 0.03, clayMat(0xefece4, 0.7), -1.6, 2.1, -3.39));
  g.add(box(0.56, 0.36, 0.01, clayMat(0xc9b58a, 0.7), -1.6, 2.1, -3.37));
  g.add(cyl(0.18, 0.14, 0.34, clayMat(0xd6d1c6, 0.9), 4.0, 0.17, 1.8));
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), clayMat(COL.plant, 0.9));
  leaves.position.set(4.0, 0.62, 1.8);
  leaves.castShadow = true;
  g.add(leaves);
  const shaft = lightShaft(fw * 0.9, 4.2, 2.2, 0xdfeeff);
  shaft.position.set(windowCenter.x - 0.2, 1.2, windowCenter.z + 1.2);
  shaft.rotation.x = 0.5;
  g.add(shaft);
  return { group: g, screen, screenMat, screenTex, mon, shaft };
}

function drawEmptyScreen(ctx, w, h) {
  ctx.fillStyle = "#e9eef0";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#1f2b33";
  ctx.font = "600 40px 'Schibsted Grotesk', sans-serif";
  ctx.fillText("Aarav S.  —  Epilepsy follow-up", 50, 80);
  ctx.font = "30px 'Schibsted Grotesk', sans-serif";
  ctx.fillStyle = "#4b5862";
  ctx.fillText("Last visit: 12 weeks ago", 50, 140);
  ctx.fillText("Medication: dose increased", 50, 186);
  ctx.fillText("Events since last visit:  ?", 50, 232);
  ctx.fillText("Sleep:  ?", 50, 278);
  ctx.strokeStyle = "#c9d3d6";
  ctx.lineWidth = 3;
  ctx.strokeRect(50, 330, w - 100, 220);
  ctx.fillStyle = "#9aa9b0";
  ctx.fillText("No information between visits", 260, 450);
}

/** Shared timeline drawn on the clinic monitor (chapter 10). */
export function drawSharedScreen(ctx, w, h) {
  ctx.fillStyle = "#e9eef0";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#1f2b33";
  ctx.font = "600 38px 'Schibsted Grotesk', sans-serif";
  ctx.fillText("Aarav S.  —  shared timeline, 30 days", 50, 72);
  const x0 = 60, x1 = w - 50, dW = (x1 - x0) / 30;
  const row = (y, label) => {
    ctx.fillStyle = "#4b5862";
    ctx.font = "26px 'Schibsted Grotesk', sans-serif";
    ctx.fillText(label, x0, y - 12);
    ctx.strokeStyle = "#c9d3d6";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, y + 40); ctx.lineTo(x1, y + 40); ctx.stroke();
  };
  row(130, "Possible events (unconfirmed)");
  [9, 21].forEach((d) => {
    const x = x0 + d * dW;
    ctx.strokeStyle = "#b07c2a"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, 132); ctx.lineTo(x + 16, 148); ctx.lineTo(x, 164); ctx.lineTo(x - 16, 148); ctx.closePath(); ctx.stroke();
  });
  row(240, "Sleep");
  for (let k = 0; k < 30; k++) {
    if (k >= 12 && k < 16) continue;
    const hgt = (k >= 18 ? 24 : 40) + ((k * 37) % 11);
    ctx.fillStyle = "#2f7d76";
    ctx.fillRect(x0 + k * dW + 3, 280 - hgt, dW - 6, hgt);
  }
  ctx.fillStyle = "#9aa9b0";
  ctx.fillText("not worn", x0 + 12.3 * dW, 262);
  row(350, "Medication");
  ctx.strokeStyle = "#b07c2a"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x0, 380); ctx.lineTo(x0 + 18 * dW, 380); ctx.lineTo(x0 + 18 * dW, 362); ctx.lineTo(x1, 362); ctx.stroke();
  row(460, "Aarav's notes");
  ctx.fillStyle = "#1f2b33";
  ctx.font = "24px 'Schibsted Grotesk', sans-serif";
  [[4, "tired"], [9, "sore, bad night"], [21, "felt odd on bus"]].forEach(([d, s]) => {
    ctx.beginPath(); ctx.arc(x0 + d * dW, 490, 7, 0, 7); ctx.fill();
    ctx.fillText(s, x0 + d * dW + 14, 498);
  });
  ctx.fillStyle = "#1f2b33";
  ctx.font = "italic 26px 'Literata Variable', serif";
  ctx.fillText("Dr. Mehta: \u201cSleep shorter since the dose change. Ask about side effects.\u201d", x0, 575);
}
