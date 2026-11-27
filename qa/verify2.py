"""Full-site verification: every chapter at many scroll positions.
usage: verify.py OUTDIR WIDTH HEIGHT [URL]
Writes OUTDIR/<section>-<pct>.png, OUTDIR/report.json, OUTDIR/sheet-<section>.png
"""
import sys, asyncio, json
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw

OUT, W, H = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
URL = sys.argv[4] if len(sys.argv) > 4 else "http://localhost:4173/?debug&snap"
import os
SECTIONS = os.environ.get("SECS", "hero,short," + ",".join(f"ch{i}" for i in range(1, 13)) + ",first,evidence").split(",")
PS = [float(x) for x in os.environ.get("PS", "0.05,0.15,0.25,0.35,0.45,0.55,0.65,0.75,0.85,0.95").split(",")]

CHECK_JS = """() => {
  const vis = (el) => { const cs = getComputedStyle(el); let o = 1, a = el;
    while (a && a !== document.documentElement) { o *= parseFloat(getComputedStyle(a).opacity || 1); a = a.parentElement; }
    return cs.visibility !== 'hidden' && cs.display !== 'none' && o; };
  const R = (el) => el.getBoundingClientRect();
  const onScreen = (r) => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 2;
  const texts = [...document.querySelectorAll('.step p, .step li, .step dd, .step dt, .flow > p, .first__item, .chapter__head h2, .chapter__num, .closing p')]
    .map((el) => ({ el, r: R(el), o: vis(el) })).filter((t) => onScreen(t.r) && t.o > 0.45);
  const labels = [...document.querySelectorAll('#labels .lbl')].map((el) => ({ el, r: R(el.querySelector('.in')), o: parseFloat(el.style.opacity || 1) * (el.style.display === 'none' ? 0 : 1) }))
    .filter((l) => onScreen(l.r) && l.o > 0.3);
  const overlaps = [];
  labels.forEach((l) => texts.forEach((t) => {
    const a = l.r, b = t.r;
    const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    if (ix > 4 && iy > 4) overlaps.push([l.el.textContent.slice(0, 40), t.el.textContent.slice(0, 40)]);
  }));
  // text running off the right edge
  const offRight = texts.filter((t) => t.r.right > innerWidth + 1).map((t) => t.el.textContent.slice(0, 40));
  return { overlaps, offRight, labels: labels.map((l) => l.el.textContent.slice(0, 30)) };
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        ctx = await b.new_context(viewport={"width": W, "height": H}, is_mobile=W < 800, has_touch=W < 800, device_scale_factor=1)
        pg = await ctx.new_page(); errs = []
        pg.on("pageerror", lambda e: errs.append("pageerror " + str(e)[:300]))
        pg.on("console", lambda m: m.type == "error" and "GL Driver" not in m.text and errs.append("console " + m.text[:300]))
        await pg.goto(URL); await pg.wait_for_timeout(9000)
        report = {"errors": errs, "frames": []}
        for sec in SECTIONS:
            shots = []
            for pct in PS:
                if sec == "hero":
                    await pg.evaluate(f"window.scrollTo(0, {pct} * innerHeight * 0.6)")
                else:
                    await pg.evaluate(f"""(() => {{ const e = document.getElementById('{sec}');
                        const top = e.getBoundingClientRect().top + scrollY;
                        window.scrollTo(0, top - innerHeight * 0.5 + {pct} * e.offsetHeight); }})()""")
                await pg.wait_for_timeout(1400)
                fn = f"{OUT}/{sec}-{int(pct*100):02d}.png"
                await pg.screenshot(path=fn)
                chk = await pg.evaluate(CHECK_JS)
                figs = await pg.evaluate("window.__figures ? window.__figures() : []")
                report["frames"].append({"sec": sec, "p": pct, "check": chk, "figs": figs})
                shots.append(fn)
            # contact sheet for the section
            ims = [Image.open(f).convert("RGB") for f in shots]
            tw = 480 if W > 800 else 180; th = int(ims[0].height * tw / ims[0].width)
            cols = 5 if W > 800 else 10
            sheet = Image.new("RGB", (tw * cols, th * ((len(ims) + cols - 1) // cols)), (40, 40, 40))
            for k, im in enumerate(ims):
                t = im.resize((tw, th)); d = ImageDraw.Draw(t); d.text((6, 4), f"{sec} {PS[k]:.2f}", fill=(255, 200, 80))
                sheet.paste(t, ((k % cols) * tw, (k // cols) * th))
            sheet.save(f"{OUT}/sheet-{sec}.png")
        json.dump(report, open(f"{OUT}/report.json", "w"), indent=1)
        await b.close()

asyncio.run(main())
