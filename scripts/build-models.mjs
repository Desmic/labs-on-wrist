/*
 * Builds the human models in public/models from Mixamo downloads.
 *   node scripts/build-models.mjs anims <Xbot.glb> <out/anims.glb>
 *       X Bot's skeleton + the clips we use, NOT quantized (quantizing rounded the breathing motion into
 *       visible 1 cm steps and made figures vibrate). Keyframes on straight lines are dropped (resample).
 *   node scripts/build-models.mjs char <in.glb> <out.glb> [ratio]
 *       A Mixamo character converted to glTF (FBX2glTF, or Blender's exporter with Draco): textures, eyelashes and
 *       any stray objects removed (we colour figures per part in code), bones renamed to mixamorig:*, simplified,
 *       geometry compressed with meshopt.
 * Used for: Adam (Ch08, Aarav) and Roth (Ch13, the doctor once she becomes a person).
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune, dedup, weld, simplify, meshopt, quantize, reorder, resample } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from "meshoptimizer";
import draco3d from "draco3dgltf";

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder, "draco3d.decoder": await draco3d.createDecoderModule(),
});
const [mode, inPath, outPath, ratioArg] = process.argv.slice(2);

if (mode === "anims") {
  const doc = await io.read(inPath);
  const root = doc.getRoot();
  root.listNodes().forEach((n) => n.getMesh() && n.setMesh(null));
  const KEEP = ["idle", "walk", "agree", "headShake", "sad_pose"];
  root.listAnimations().forEach((a) => { if (!KEEP.includes(a.getName())) a.dispose(); });
  // only the hips move; every other bone's translation is just its (constant) length
  root.listAnimations().forEach((a) => a.listChannels().forEach((c) => {
    if (c.getTargetPath() === "translation" && !/Hips$/.test(c.getTargetNode().getName())) { c.getSampler().dispose(); c.dispose(); }
  }));
  root.listSkins().forEach((s) => s.dispose());
  for (const ext of root.listExtensionsUsed()) ext.dispose();
  await doc.transform(resample({ tolerance: 1e-4 }), prune());
  await io.write(outPath, doc);
} else if (mode === "char") {
  const doc = await io.read(inPath);
  const root = doc.getRoot();
  root.listNodes().forEach((n) => n.setName(n.getName().replace(/^mixamorig\d*:/, "mixamorig:")));
  root.listNodes().forEach((n) => { if (n.getMesh() && /Eyelash|Eyeleash|^Cube$/i.test(n.getName())) { n.getMesh().dispose(); n.dispose(); } });
  root.listTextures().forEach((t) => t.dispose());
  root.listAnimations().forEach((a) => a.dispose());
  for (const ext of root.listExtensionsUsed()) if (/draco/i.test(ext.extensionName)) ext.dispose();
  // one material per part, named after the part, so the site can colour skin, clothes, shoes and hair separately
  root.listNodes().forEach((n) => {
    const m = n.getMesh(); if (!m) return;
    const part = n.getName().replace(/^Ch\d+_/, "");
    m.setName(part);
    const mat = doc.createMaterial(part).setBaseColorFactor([Math.random(), Math.random(), Math.random(), 1]); // distinct, so dedup can't merge them
    m.listPrimitives().forEach((p) => p.setMaterial(mat));
  });
  await doc.transform(
    prune(), dedup({ propertyTypes: ["Accessor", "Mesh", "Texture"] }), weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: Number(ratioArg || 0.45), error: 0.0008, lockBorder: true }),
    reorder({ encoder: MeshoptEncoder }), quantize(), meshopt({ encoder: MeshoptEncoder, level: "medium" }), prune(),
  );
  let tris = 0;
  root.listMeshes().forEach((m) => m.listPrimitives().forEach((p) => (tris += p.getIndices().getCount() / 3)));
  console.log(outPath, "tris", tris, root.listMeshes().map((m) => m.getName()));
  await io.write(outPath, doc);
}
