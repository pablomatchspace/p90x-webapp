"""Generate PWA icons (one-time; outputs are committed).

Usage: python tools/gen_icons.py
Requires Pillow and a bold system font (Windows: arialbd.ttf).
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "icons")
BRAND = (220, 38, 38, 255)  # tailwind red-600, matches manifest theme_color
WHITE = (255, 255, 255, 255)

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    raise SystemExit("No bold TrueType font found; edit FONT_CANDIDATES.")


def draw_icon(canvas_px: int, content_scale: float) -> Image.Image:
    """content_scale < 1 shrinks the tile inside the canvas (maskable safe zone)."""
    img = Image.new("RGBA", (canvas_px, canvas_px), BRAND if content_scale == 1.0 else (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    tile = int(canvas_px * content_scale)
    offset = (canvas_px - tile) // 2
    radius = int(tile * 0.22)
    draw.rounded_rectangle([offset, offset, offset + tile, offset + tile], radius=radius, fill=BRAND)
    font = load_font(int(tile * 0.40))
    text = "90X"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(
        ((canvas_px - tw) / 2 - bbox[0], (canvas_px - th) / 2 - bbox[1]),
        text,
        font=font,
        fill=WHITE,
    )
    return img


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    draw_icon(192, 1.0).save(os.path.join(OUT, "icon-192.png"))
    draw_icon(512, 1.0).save(os.path.join(OUT, "icon-512.png"))
    # maskable: full-bleed brand square with content in the 80% safe zone
    maskable = Image.new("RGBA", (512, 512), BRAND)
    inner = draw_icon(512, 0.78)
    maskable.alpha_composite(inner)
    maskable.save(os.path.join(OUT, "maskable-512.png"))
    draw_icon(180, 1.0).save(os.path.join(OUT, "apple-touch-icon.png"))
    print("icons written to", OUT)


if __name__ == "__main__":
    main()
