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

- **Vite + vanilla JavaScript + SVG.** No animation library.
- **One scroll controller** (`src/main.js`) computes each chapter's progress (0 to 1) and calls that chapter's scene. Scenes (`src/scenes.js`) are pure functions of progress, so scrolling backwards or jumping chapters always works.
- **Static reading mode** turns off all scroll animation. It's on automatically for people who've asked their device for reduced motion, and there's a toggle in the top bar.
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
