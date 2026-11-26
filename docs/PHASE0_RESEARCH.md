# Phase 0 — Frontier research (compressed pass)

**Research date:** 26 November 2026
**Scope:** a short first pass so v1 could ship. The full Phase 0 in the master brief (20+ references, 8 deep inspections, three competing prototypes) is still owed and should be done before the cinematic v2.

## What was checked

| Source | What we took from it | How it was checked |
| --- | --- | --- |
| Chrome Developers, *How NRK uses scroll-driven animations* | Scroll-driven storytelling works best for non-fiction where few images exist; animations should support the reading, not replace it. | Search excerpt (secondary) |
| Chrome Developers, *CSS scroll-triggered animations are coming* (Dec 2025) | Scroll-triggered CSS is new (Chrome 145); IntersectionObserver fallback still needed. | Search excerpt |
| WebKit, *A guide to scroll-driven animations with just CSS* | Safari 26 supports `animation-timeline`. | Search excerpt |
| Mozilla Connect thread; camoa dev guide (early 2026) | Firefox support for `animation-timeline` was still behind a flag in early 2026; sources conflict on whether it has shipped since. | Search excerpts, conflicting |
| Codrops 2026 case studies (Podium, ZERO, False Earth, Interactive Storytelling tutorial) | Leading work uses a single shared timeline and one persistent canvas; restraint and rhythm are praised over effect density. | Index pages only; not inspected live |
| Awwwards 2026 healthcare / social-responsibility listings | Few healthcare sites lead with a human story; most are product/agency pages. | Index pages only |

**Not done in this pass:** live inspection with devtools, frame-timing measurements, X/Threads/Reddit discovery, prototype bake-off. These are listed as owed work in `DECISIONS.md`.

## Conclusions used for v1

1. Drive every scene from **one deterministic scroll controller** (pure function of chapter progress), so reverse scrolling and jumping between chapters always work. Do not depend on CSS `animation-timeline` alone.
2. Prefer **SVG and typography** over real-time 3D for v1: it is lightweight, accessible, prints, and is safe for an epilepsy audience. Real-time 3D (wearable, body model) is a v2 candidate once performance budgets are measured.
3. A **static reading mode** is on by default for `prefers-reduced-motion` and is reachable from the first screen.
