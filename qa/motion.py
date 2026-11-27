"""Visual-defect tests: bone jitter, pixel shimmer, and pops while scrubbing.
usage: motion.py OUTDIR WIDTH HEIGHT [URL]
The page clock is frozen (window.__freeze) and advanced in fixed 1/60 s steps (window.__step),
so every number here is reproducible and independent of how fast the test machine is.

Tests, per scroll position in POS:
  hold   - scroll still, 40 frames. Bones should move smoothly (idle breathing): we measure the
           second difference of each bone's world position (acceleration per frame). Vibration shows
           up as large acceleration that flips sign frame to frame.
  shimmer- scroll still, 24 frames of pixels. Per-pixel temporal second difference; flicker that
           alternates frame to frame (shadow crawl, aliasing, resolution pumping) lights up the heatmap.
  scrub  - scroll moves 6 px per frame for 60 frames (a slow, steady scroll). Bone paths should be
           smooth; a 'pop' is a frame whose bone displacement is far above its neighbours'.
Writes OUTDIR/motion.json and OUTDIR/shimmer-<name>.png heatmaps.
"""
import sys, os, asyncio, json, io, math
from playwright.async_api import async_playwright
from PIL import Image, ImageChops, ImageOps
import numpy as np

OUT, W, H = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
URL = sys.argv[4] if len(sys.argv) > 4 else "http://localhost:4173/?debug"
os.makedirs(OUT, exist_ok=True)
POS = [p.split(":") for p in os.environ.get("POS",
    "ch1:0.10,ch1:0.35,ch1:0.60,ch2:0.25,ch2:0.40,ch2:0.50,ch2:0.70,ch3:0.30,ch3:0.50,ch5:0.47,ch7:0.50,ch10:0.40,ch10:0.70,ch12:0.30,ch12:0.44").split(",")]
SKIP_SHIMMER = os.environ.get("NOSHIMMER") == "1"

def scroll_js(sec, pct):
    # through Lenis, so the frozen clock and the smooth scroller agree on where we are
    return f"""(() => {{ const e = document.getElementById('{sec}');
      const top = e.getBoundingClientRect().top + scrollY;
      window.__scrollTo(top - innerHeight * 0.5 + {pct} * e.offsetHeight); }})()"""

def bone_stats(frames):
    """frames: list of {fig: {bone: [x,y,z]}} -> per-figure worst bone acceleration (mm/frame^2) and flip rate"""
    res = {}
    figs = set(frames[0].keys())
    for f in figs:
        names = frames[0][f].keys()
        worst = (0, None, 0)
        for n in names:
            P = np.array([fr[f][n] for fr in frames if f in fr])
            if len(P) < 5: continue
            a = P[2:] - 2 * P[1:-1] + P[:-2]
            mag = np.linalg.norm(a, axis=1) * 1000
            rms = float(np.sqrt((mag ** 2).mean()))
            # flips: consecutive accelerations pointing in opposite directions = oscillation
            dots = (a[1:] * a[:-1]).sum(1)
            flips = float((dots < 0).mean()) if len(dots) else 0
            if rms > worst[0]: worst = (rms, n, flips)
        res[f] = {"accRmsMm": round(worst[0], 3), "bone": worst[1], "flipRate": round(worst[2], 2)}
    return res

def pop_stats(frames):
    """A pop is a frame whose bone step is far bigger than the steps on BOTH sides of it.
    (Comparing against the whole run's median wrongly flags every start of motion after a still stretch.)"""
    res = {}
    for f in frames[0].keys():
        worst = (0, None, None, 0)
        for n in frames[0][f].keys():
            P = np.array([fr[f][n] for fr in frames if f in fr])
            if len(P) < 6: continue
            d = np.linalg.norm(P[1:] - P[:-1], axis=1) * 1000
            for i in range(1, len(d) - 1):
                if d[i] < 5: continue  # under 5 mm in a frame is never visible as a jump
                r = d[i] / max(1.0, max(d[i - 1], d[i + 1]))
                if r > worst[0]: worst = (float(r), n, i, float(d[i]))
        res[f] = {"popRatio": round(worst[0], 2), "bone": worst[1], "frame": worst[2], "stepMm": round(worst[3], 1)}
    return res

async def grab(pg):
    b = await pg.screenshot(type="png")
    return np.asarray(Image.open(io.BytesIO(b)).convert("L"), dtype=np.float32)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        ctx = await b.new_context(viewport={"width": W, "height": H}, is_mobile=W < 800, has_touch=W < 800, device_scale_factor=1)
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:300]))
        await pg.goto(URL); await pg.wait_for_timeout(9000)
        await pg.evaluate("window.__freeze()")
        if os.environ.get("PRE"): print("PRE", await pg.evaluate(os.environ["PRE"]), flush=True)  # e.g. force a render setting
        out = {"errors": errs, "tests": []}
        for sec, pct in POS:
            pct = float(pct); name = f"{sec}-{int(pct*100):02d}"
            await pg.evaluate(scroll_js(sec, pct))
            await pg.evaluate("window.__step(240)")  # 4 s of sim time: camera, lighting, lenis settle
            # hold
            fr = []
            for _ in range(40):
                await pg.evaluate("window.__step(1)")
                fr.append((await pg.evaluate("window.__bones()")))
            hold = bone_stats([f["bones"] for f in fr])
            q = sorted(set(f["quality"] for f in fr))
            keyMove = float(np.abs(np.diff(np.array([f["key"] for f in fr]), axis=0)).max())
            st = await pg.evaluate("window.__dbg && [window.__dbg.station, +window.__dbg.p.toFixed(3)]")
            rec = {"name": name, "station": st, "hold": hold, "quality": q, "keyLightMaxStep": round(keyMove, 5)}
            # shimmer
            if not SKIP_SHIMMER:
                ims = []
                for _ in range(16):
                    await pg.evaluate("window.__step(1)")
                    ims.append(await grab(pg))
                A = np.stack(ims)
                d2 = np.abs(A[2:] - 2 * A[1:-1] + A[:-2])
                # flicker = second difference that flips sign: alternating brightness
                s = np.sign(A[2:] - 2 * A[1:-1] + A[:-2])
                flipping = (s[1:] * s[:-1] < 0) & (d2[1:] > 6) & (d2[:-1] > 6)
                heat = flipping.mean(0)
                rec["shimmerPct"] = round(float((heat > 0.3).mean() * 100), 3)
                rec["d2Mean"] = round(float(d2.mean()), 3)
                hm = Image.fromarray(np.clip(heat * 255 * 2, 0, 255).astype(np.uint8))
                base = Image.fromarray(A[-1].astype(np.uint8)).convert("RGB")
                red = Image.merge("RGB", (hm, Image.new("L", hm.size, 0), Image.new("L", hm.size, 0)))
                Image.blend(base, red, 0.6).save(f"{OUT}/shimmer-{name}.png")
            # scrub: steady scroll
            fr = []
            for _ in range(60):
                await pg.evaluate("window.__scrollTo(scrollY + 6)")
                await pg.evaluate("window.__step(1)")
                fr.append((await pg.evaluate("window.__bones()"))["bones"])
            # figures can appear/disappear as chapters change; keep frames that share the first frame's figures
            keys = set(fr[0].keys()); fr = [f for f in fr if set(f.keys()) == keys]
            rec["scrub"] = pop_stats(fr) if fr and keys else {}
            rec["scrubHold"] = bone_stats(fr) if fr and keys else {}
            out["tests"].append(rec)
            print(json.dumps(rec), flush=True)
        json.dump(out, open(f"{OUT}/motion.json", "w"), indent=1)
        await b.close()

asyncio.run(main())
