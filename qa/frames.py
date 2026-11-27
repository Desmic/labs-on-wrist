import asyncio, sys, io
from playwright.async_api import async_playwright
from PIL import Image
SEC, PCT, X0, Y0, X1, Y1 = sys.argv[1], float(sys.argv[2]), *map(int, sys.argv[3:7])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox","--use-angle=swiftshader","--enable-unsafe-swiftshader"])
        pg = await (await b.new_context(viewport={"width":1280,"height":800})).new_page()
        await pg.goto("http://localhost:4173/?debug"); await pg.wait_for_timeout(9000)
        await pg.evaluate("window.__freeze()")
        await pg.evaluate(f"""(() => {{ const e = document.getElementById('{SEC}'); const top = e.getBoundingClientRect().top + scrollY;
          window.__scrollTo(top - innerHeight * 0.5 + {PCT} * e.offsetHeight); }})()""")
        await pg.evaluate("window.__step(240)")
        ims = []
        for i in range(8):
            await pg.evaluate("window.__step(1)")
            ims.append(Image.open(io.BytesIO(await pg.screenshot(clip={"x":X0,"y":Y0,"width":X1-X0,"height":Y1-Y0}))).convert("RGB"))
        w, h = ims[0].size
        sheet = Image.new("RGB", (w * 4, h * 2))
        for i, im in enumerate(ims): sheet.paste(im, ((i % 4) * w, (i // 4) * h))
        sheet = sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST)
        sheet.save(f"frames-{SEC}.png"); print(sheet.size)
        await b.close()
asyncio.run(main())
