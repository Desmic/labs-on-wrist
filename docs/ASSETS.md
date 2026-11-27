# Asset provenance

| Asset | Source | Licence / terms | Changes |
| --- | --- | --- | --- |
| `public/models/adam.glb` (Aarav) | "Adam" (Ch08) character from Adobe Mixamo, downloaded 27 Nov 2026 as FBX, converted with FBX2glTF | Mixamo characters and animations are royalty-free for use in projects; not to be redistributed as standalone assets | Built by `scripts/build-models.mjs`: textures removed (coloured per part in code), eyelashes removed, simplified to about 35k triangles, meshopt-compressed geometry |
| `public/models/anims.glb` (idle, walk, nod, head shake, slump) | Mixamo animations on "X Bot", as distributed in the three.js repository (`examples/models/gltf/Xbot.glb`) | as above | Built by `scripts/build-models.mjs`, deliberately **not** quantized (quantizing rounded the breathing motion into 1 cm steps and made figures vibrate). Retargeted at load time to each character's skeleton in `src/gl/human.js` |
| `public/models/roth.glb` (the doctor, from chapter 10) | "Roth" (Ch13) character from Adobe Mixamo, downloaded 27 Nov 2026 as FBX, converted in Blender (Draco GLB, textures not exported) | Mixamo terms as above | Built by `scripts/build-models.mjs char`: stray objects and eyelashes removed, coloured per part in code, about 29k triangles, meshopt geometry |
| `public/og.jpg` (link preview) | Rendered from the site's own chapter 12 scene | Project's own | 1200×630, used by Open Graph / Twitter tags |
| `public/models/xbot.glb` (clinician, for now) | "X Bot" from the three.js repository, as above | as above | meshopt-compressed; its embedded clips are ignored |
| Fonts (Literata, Schibsted Grotesk) | Fontsource | SIL Open Font License | none |

Everything else in the 3D scenes is built procedurally in code.
