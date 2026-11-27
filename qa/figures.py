import sys, asyncio, json
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173/?debug&snap"
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        pg = await b.new_page(viewport={"width": 1280, "height": 800}); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:300]))
        await pg.goto(URL); await pg.wait_for_timeout(9000)
        for mode in ["day", "wear", "night", "sunset"]:
            r = await pg.evaluate(f"window.__figures ? window.__figures('{mode}') : 'no debug'")
            print("== mode", mode)
            if isinstance(r, str): print(r); continue
            for row in r: print(json.dumps(row))
        print("ERRORS:", errs[:5])
        await b.close()
asyncio.run(main())
