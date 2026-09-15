"""One-off script to generate PWA icons from the source dove artwork.
Run once locally with: python tools/generate_icons.py
"""
from PIL import Image, ImageOps
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r"C:\Users\Alex si Livi\Downloads\pngwing.com.png"
OUT_DIR = os.path.join(ROOT, "public", "icons")
os.makedirs(OUT_DIR, exist_ok=True)

BG = (30, 78, 120, 255)     # deep sky blue background
BG_LIGHT = (235, 244, 250, 255)  # light background for favicon-ish contexts

def make_square(src_img, size, bg, padding_ratio):
    img = src_img.convert("RGBA")
    canvas = Image.new("RGBA", (size, size), bg)
    inner = int(size * (1 - padding_ratio * 2))
    fitted = ImageOps.contain(img, (inner, inner))
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.paste(fitted, (x, y), fitted)
    return canvas

src = Image.open(SRC)

# Standard "any" icons - generous padding, brand background
for size in (192, 512):
    icon = make_square(src, size, BG, padding_ratio=0.12)
    icon.save(os.path.join(OUT_DIR, f"icon-{size}.png"))

# Maskable icons - safe zone requires ~40% padding from each edge total (20% each side)
for size in (192, 512):
    icon = make_square(src, size, BG, padding_ratio=0.20)
    icon.save(os.path.join(OUT_DIR, f"icon-maskable-{size}.png"))

# Apple touch icon (no transparency, solid bg, standard 180x180)
apple = make_square(src, 180, BG, padding_ratio=0.14)
apple.convert("RGB").save(os.path.join(OUT_DIR, "apple-touch-icon.png"))

# Favicon (32x32) light background for browser tab visibility
fav32 = make_square(src, 32, BG, padding_ratio=0.08)
fav16 = make_square(src, 16, BG, padding_ratio=0.05)
fav32.save(os.path.join(OUT_DIR, "favicon-32.png"))
fav16.save(os.path.join(OUT_DIR, "favicon-16.png"))
fav32.convert("RGB").save(os.path.join(OUT_DIR, "favicon.ico"), sizes=[(16, 16), (32, 32)])

print("Icons generated in", OUT_DIR)
