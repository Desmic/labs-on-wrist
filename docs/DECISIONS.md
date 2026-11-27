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

- Capsule mannequins replaced by a rigged faceless mannequin (Mixamo "X Bot" via the three.js examples), re-coloured to the clay palette. A faceless segmented mannequin fits the Fern-style miniature; fully textured Mixamo characters (real faces and clothes, e.g. "Remy") were checked and rejected because they clash with the clay sets. Mixamo's male "Y Bot" is the preferred upgrade and drops in by replacing `public/models/xbot.glb` (needs a Mixamo sign-in to download).
- Every action is driven by scroll position, not time, so it reverses exactly: walk with chai (ch1), wake and sit up on the bed edge (ch2), head shake and nods (ch3, ch10), checking the band (ch5), a sip at the window (ch12). Breathing (idle) keeps running underneath.
- Poses aim limbs at directions in the figure's own frame instead of hand-tuned bone angles.
- Verification is now measured, not just eyeballed: `qa/verify.py` steps every chapter at ten scroll positions on desktop and mobile, samples the skinned surface of every figure (`?debug`), reports points inside furniture, feet off the floor, 3D labels over story text and console errors, and writes contact sheets.

## Owed work (from the master brief)

- Full Phase 0: 20+ reference matrix with live inspection and measurements.
- Three competing art directions with prototypes.
- Clinical expert review of all public claims before wider promotion.
- Independent accessibility audit.
