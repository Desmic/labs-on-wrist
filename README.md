# The life between appointments

A scroll-driven story explaining **Labs on the Wrist**: why we're building an affordable wearable and shared health timeline, what it can and can't do, and the research question behind it.

Vision and original research ideas: **Desmic (Kumar Shashank)**.

> Early concept. Not a medical device and not medical advice. Aarav is fictional and all data on the site is synthetic.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
```

## How it's built

- **Three.js world** (`src/gl/`): one persistent WebGL scene. A glowing life thread connects miniature diorama sets (Aarav's apartment, the clinic), an exploded wearable, a particle body with data rings, the calibration loop, labs-on-the-wrist particle streams and a field of lives. Faceless clay mannequins, shadows, bloom, film grain and vignette, inspired by Fern and LEMMiNO documentaries.
- **Camera direction:** each section of the page maps to a "station" with a camera shot that is a function of scroll progress; the camera eases between shots, so moving between chapters is a fly-through.
- **Lenis** smooth scrolling and **GSAP ScrollTrigger + SplitText** for chapter-title and text reveals.
- **Illustrated SVG version** (`src/scenes.js`) is used for the reading mode and as the fallback when WebGL 2 isn't available.
- **Reading mode** turns off all animation. It's on automatically for people who've asked their device for reduced motion, and there's a toggle in the top bar.
- **Labs-on-the-wrist experiment** (`src/lab.js`) uses illustrative, made-up numbers only.
- Fonts: Literata and Schibsted Grotesk, self-hosted via Fontsource.

## Visual safety

This site is about epilepsy, so it avoids flashing, strobing and fast luminance changes; background tones ease over 0.6 s; there's no scroll hijacking.

## Docs

- `docs/PHASE0_RESEARCH.md`: the short research pass behind v1, and what is still owed.
- `docs/DECISIONS.md`: art direction, stack, colour tokens and safety decisions.
- `docs/CLAIMS.md`: every factual claim on the site and its source.

## Deploy

Render static site: build command `npm ci && npm run build`, publish directory `dist`. See `render.yaml`.
