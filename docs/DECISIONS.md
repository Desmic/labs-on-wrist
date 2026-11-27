# Decision record

## D1 — v1 art direction: "One continuous line"

The whole story is told along a single thread: a person's timeline. It starts as a day, gets a gap at night, shrinks to two dots at the clinic, collects scattered fragments, becomes a sensor signal, splits into body layers, loops through calibration, and returns to an ordinary day. The thread is the one bold element; everything else stays quiet.

**Why:** the core problem in the founder's research is an *information gap over time*. A timeline is the most honest picture of that gap, and it works in static mode, on mobile and in print.

**Rejected for v1:** isometric 3D miniatures (asset cost and risk of crude primitives), full WebGL (payload and safety review not yet done).

## D2 — Stack

Vite + vanilla JavaScript + SVG. Self-hosted fonts via Fontsource (Literata for narration, Schibsted Grotesk for interface and data). No animation library: one `requestAnimationFrame` scroll controller.

## D3 — Tokens

| Name | Hex | Use |
| --- | --- | --- |
| Linen | `#E8ECE8` | Day background |
| Slate | `#1F2B33` | Text on day, night background base |
| Night | `#1C2830` | Night chapters |
| Mist | `#C9D3D6` | Rules, faded ticks |
| Teal | `#2F7D76` | Measured signal, the platform |
| Morning | `#D9A24E` | Life, the person, daylight |

## D4 — Safety

No flashing, strobing, or rapid luminance changes. Background tone changes ease over 1.2 s. No scroll hijacking. Reduced motion means static mode.

## D5 — v2: cinematic 3D (founder feedback, 26 Nov 2026)

The founder asked for the most ambitious animated, scroll-driven experience current web tech allows, inspired by Fern and LEMMiNO. v2 keeps the "one continuous line" idea but makes it a physical glowing thread in a dark, foggy 3D world:

- Fern: miniature diorama rooms with faceless clay mannequins, warm key light through windows, the same rooms revisited (morning, night, wearing the band, sunset).
- LEMMiNO: dark atmosphere, drifting dust, film grain and vignette, slow camera moves, large centred chapter title cards.
- Stack: Three.js (r187), Lenis, GSAP ScrollTrigger + SplitText. All geometry is procedural; no external assets.
- Safety kept: no flashing or strobing; bloom is steady; grain amplitude is low; reading mode and the SVG fallback remain.

## D6 — Rigged figures and scroll-driven acting (27 Nov 2026)

- Capsule mannequins replaced by a rigged faceless mannequin (Mixamo "X Bot" via the three.js examples), re-coloured to the clay palette. A faceless segmented mannequin fits the Fern-style miniature; fully textured Mixamo characters (real faces and clothes, e.g. "Remy") were checked and rejected because they clash with the clay sets. (Superseded by D7.)
- Every action is driven by scroll position, not time, so it reverses exactly: walk with chai (ch1), wake and sit up on the bed edge (ch2), head shake and nods (ch3, ch10), checking the band (ch5), a sip at the window (ch12). Breathing (idle) keeps running underneath.
- Poses aim limbs at directions in the figure's own frame instead of hand-tuned bone angles.
- Verification is now measured, not just eyeballed: `qa/verify.py` steps every chapter at ten scroll positions on desktop and mobile, samples the skinned surface of every figure (`?debug`), reports points inside furniture, feet off the floor, 3D labels over story text and console errors, and writes contact sheets.

## D7 — Real people instead of mannequins, and why the figures vibrated (27 Nov 2026)

- The vibration was measured, not guessed. With the scroll held still, the whole figure jumped about 11 mm between two heights every few frames. Cause: compressing the model file had quantized the animation, rounding the idle sway to two values. Animations are now stored unquantized (`anims.glb`); after the fix the largest frame-to-frame bone step while still is under 1 mm.
- `qa/motion.py` makes this a standing test: it freezes the page clock (`?debug` exposes `__freeze`, `__step`, `__scrollTo`, `__bones`), steps fixed 1/60 s frames, and reports per-bone acceleration (vibration), sudden jumps while scrubbing (pops) and per-pixel flicker that alternates frame to frame (shimmer), with heatmaps.
- Aarav is now Mixamo's "Adam" (beard, hoodie, joggers), coloured flat in the site palette instead of photo textures, to keep the Fern-style look. Remy was considered: technically fine, but a blond surfer in cargo shorts doesn't read as Aarav. Other Mixamo candidates kept on file: "Chad" (scrubs and mask) for a clinician; "Roth" or "Kate" for a female doctor.
- Clips are retargeted per character at load: each bone gets the same rotation away from the T-pose as on X Bot, in the new character's own joint frames, with hip travel scaled to hip height. Any Mixamo character can be dropped in this way.
- Seat heights are per character (`seatLift`): Adam needs 4.5 cm more than X Bot; the patient sits 5 cm further back so his knees clear the desk. Checked with the furniture intersection test.
- Shimmer: the shadow camera now snaps to whole shadow-map texels, and adaptive resolution only climbs back after several fast windows (and never to a level that was just too slow), so resolution no longer pumps.

## D8 — The mannequin as a point of view; content to the vision; sharing (27 Nov 2026)

- The clinician stays a faceless mannequin through chapter 3: that is how the clinic feels to Aarav. In chapter 10, as she reads his shared timeline, she dissolves into a person (Mixamo "Roth"), and only then nods. Both figures share one dissolve value with a warm seam, so each point of space belongs to exactly one of them. Founder's call to keep the mannequin; the swap was agreed as part of the plan.
- Content checked against the Research Brief v0.1 (Notion): ch7 now names brain, body and mind, daily life and surroundings, children as well as adults, and everyday help, not only alarms; ch8 adds periodic clinical recalibration and drift checks; the short version no longer says the device "notices movement and pulse". Ch7 layers no longer imply a fixed sensor (skin temperature → daily routine).
- Retargeting now moves hip travel in world space and lowers seated hips along each rig's own "up", so rigs exported by Blender (Z-up parent) and FBX2glTF (Y-up) both work.
- Animation file trimmed from 691 KB to 397 KB by dropping keyframes that lie on straight lines (full float precision kept; no quantization).
- Link previews (Open Graph and Twitter tags, `og.jpg`), and a feedback route (GitHub issues) until there is a contact address.
- `qa/run_all.sh` runs every check in one command with pass/fail thresholds (`qa/motion_check.py`): vibration ≤ 1 mm/frame², pops ≤ 3× neighbours, shimmer ≤ 0.05 % of pixels.
- Measured on the founder's laptop (Intel UHD integrated graphics, 1920×889, full resolution, live site): 17–31 ms per frame depending on chapter; fixed post-processing cost is about 17 ms. Adaptive resolution takes it from there; per-pass costs are measured with `?debug` `__perf` switches.

## D9 — Frame cost and a hidden lighting seam (27 Nov 2026)

- Measured on the founder's laptop (Intel UHD, 1920×889, live site, frozen clock with a GPU sync per frame): 2× multisampling was ~40 % of the frame. Adaptive quality now drops it first, for FXAA, before lowering resolution; tone mapping, vignette and grain share one pass. Result: 10–20 ms per chapter at full resolution (was 16–31 ms).
- A sharp dark patch on Aarav's shin was traced (by raycast, not by guessing) to the window light-shaft volume: an additive box that brightened the parts of a figure behind its front face and not the parts in front. Figures now write a stencil mark and light shafts skip those pixels. Ruled out on the way: mesh simplification, compression, normals, face winding, shadows.

## Owed work (from the master brief)

- Full Phase 0: 20+ reference matrix with live inspection and measurements.
- Three competing art directions with prototypes.
- Clinical expert review of all public claims before wider promotion.
- Independent accessibility audit.
