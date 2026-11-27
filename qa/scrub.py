import asyncio, sys, math
from playwright.async_api import async_playwright
SEC, PCT, BONE = sys.argv[1], float(sys.argv[2]), sys.argv[3]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        pg = await (await b.new_context(viewport={"width":1280,"height":800})).new_page()
        await pg.goto("http://localhost:4173/?debug"); await pg.wait_for_timeout(9000)
        await pg.evaluate("window.__freeze()")
        await pg.evaluate(f"""(() => {{ const e = document.getElementById('{SEC}'); const top = e.getBoundingClientRect().top + scrollY;
          window.__scrollTo(top - innerHeight * 0.5 + {PCT} * e.offsetHeight); }})()""")
        await pg.evaluate("window.__step(240)")
        rows = await pg.evaluate(f"""(() => {{ const out = []; for (let i = 0; i < 60; i++) {{ window.__scrollTo(scrollY + 6); window.__step(1);
           const r = window.__bones(); const f = r.bones[0]; out.push([f['{BONE}'], window.__dbg.p]); }} return out; }})()""")
        prev = None
        for i, (pnt, pr) in enumerate(rows):
            if prev: print(i, round(pr, 4), round(math.dist(pnt, prev) * 1000, 2))
            prev = pnt
        await b.close()
asyncio.run(main())
