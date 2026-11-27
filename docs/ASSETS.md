# Asset provenance

| Asset | Source | Licence / terms | Changes |
| --- | --- | --- | --- |
| `public/models/xbot.glb` (rigged human figure + idle animation) | "X Bot" character and animations from Adobe Mixamo, as distributed in the three.js repository (`examples/models/gltf/Xbot.glb`) | Mixamo characters and animations are royalty-free for use in projects; not to be redistributed as standalone assets | Re-encoded with gltf-transform (meshopt), re-coloured in code, poses layered on the idle animation in `src/gl/human.js` |
| Fonts (Literata, Schibsted Grotesk) | Fontsource | SIL Open Font License | none |

Everything else in the 3D scenes is built procedurally in code.
