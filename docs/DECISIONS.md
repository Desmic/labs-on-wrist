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

## Owed work (from the master brief)

- Full Phase 0: 20+ reference matrix with live inspection and measurements.
- Three competing art directions with prototypes.
- Clinical expert review of all public claims before wider promotion.
- Independent accessibility audit.
