/*
 * Builds the human models in public/models from the Mixamo downloads.
 *   node scripts/build-models.mjs <Xbot.glb> <adam.glb (converted from Mixamo Ch08 FBX)>
 * anims.glb  - X Bot's skeleton + animations only, written WITHOUT compression or quantization.
 *              (quantizing animation rounds small motions, like breathing, into visible 1 cm steps)
 * (xbot.glb, the clinician's mesh, is the earlier meshopt build; its own embedded clips are ignored.)
 * adam.glb   - Adam's meshes, textures stripped (we colour him in code), bones renamed to mixamorig:*,
 *              simplified, geometry compressed with meshopt.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune, dedup, weld, simplify, meshopt, quantize, reorder } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from "meshoptimizer";

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
const [xbotPath, adamPath, outDir = "public/models"] = process.argv.slice(2);

// 1. animations
{
  const doc = await io.read(xbotPath);
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
  await doc.transform(prune());
  await io.write(`${outDir}/anims.glb`, doc);
}

// 2. Adam
{
  const doc = await io.read(adamPath);
  const root = doc.getRoot();
  root.listNodes().forEach((n) => n.setName(n.getName().replace(/^mixamorig\d*:/, "mixamorig:")));
  root.listTextures().forEach((t) => t.dispose());
  root.listMeshes().forEach((m) => { if (/Eyelash/i.test(m.getName())) m.dispose(); });
  root.listAnimations().forEach((a) => a.dispose());
  // keep the mesh name on each primitive's material so the site can colour body, hoodie, pants, shoes and hair separately
  root.listMeshes().forEach((m) => {
    const mat = doc.createMaterial(m.getName().replace(/^Ch\d+_/, ""));
    m.listPrimitives().forEach((p) => p.setMaterial(mat));
  });
  const ratio = Number(process.env.RATIO || 0.45);
  await doc.transform(
    prune(), dedup(), weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.0008, lockBorder: true }),
    reorder({ encoder: MeshoptEncoder }),
    quantize(),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
    prune(),
  );
  let tris = 0;
  root.listMeshes().forEach((m) => m.listPrimitives().forEach((p) => (tris += p.getIndices().getCount() / 3)));
  console.log("adam tris", tris, root.listMeshes().map((m) => m.getName()));
  await io.write(`${outDir}/adam.glb`, doc);
}
