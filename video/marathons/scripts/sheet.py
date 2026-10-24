# Contact sheet of out/stills/*.jpg: python scripts/sheet.py 1.2 3.5 … → out/sheet.jpg
import sys
from PIL import Image, ImageDraw
names = sys.argv[1:]
ims = [Image.open(f"out/stills/{n}.jpg") for n in names]
w, h = ims[0].size
cols = 4 if h > w else 2
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (w * cols, h * rows), "white")
for i, (n, im) in enumerate(zip(names, ims)):
    x, y = (i % cols) * w, (i // cols) * h
    sheet.paste(im, (x, y))
    ImageDraw.Draw(sheet).text((x + 8, y + 8), n + "s", fill="red")
sheet.save("out/sheet.jpg", quality=80)
