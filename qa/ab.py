"""A/B: same frozen-clock frame from two builds. ab.py URL_A URL_B sec:pct,..."""
import asyncio, sys, io
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright
A, B, POS = sys.argv[1], sys.argv[2], [p.split(":") for p in sys.argv[3].split(",")]
async def grab(b, url):
    pg = await (await b.new_context(viewport={"width":1280,"height":800})).new_page()
    await pg.goto(url + "?debug"); await pg.wait_for_timeout(9000)
    await pg.evaluate("window.__freeze()")
    out = {}
    for sec, pct in POS:
        await pg.evaluate(f"""(() => {{ const e = document.getElementById('{sec}'); const top = e.getBoundingClientRect().top + scrollY;
          window.__scrollTo(top - innerHeight * 0.5 + {pct} * e.offsetHeight); }})()""")
        for _ in range(4): await pg.evaluate("window.__step(60)")
        out[f"{sec}-{pct}"] = np.asarray(Image.open(io.BytesIO(await pg.screenshot(timeout=90000))).convert("RGB")).astype(float)
    return out
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        a, c = await grab(b, A), await grab(b, B)
        for k in a:
            d = np.abs(a[k] - c[k])
            print(k, "mean A", a[k].mean().round(2), "B", c[k].mean().round(2), "mean |diff|", d.mean().round(2), "p99 |diff|", np.percentile(d, 99).round(1))
            Image.fromarray(np.hstack([a[k], c[k]]).astype(np.uint8)).resize((1280, 400)).save(f"ab-{k}.png")
        await b.close()
asyncio.run(main())
