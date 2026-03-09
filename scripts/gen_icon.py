"""
Generate ResumePlayer icons:
  - A violet rounded-square background
  - A white "resume" circular arrow (↺) suggesting resume-from-progress
  - A white play triangle inside
"""

import math
from PIL import Image, ImageDraw

SIZE = 1024  # working canvas (will be downscaled for AA)


def draw_rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.ellipse([x0, y0, x0 + 2 * radius, y0 + 2 * radius], fill=fill)
    draw.ellipse([x1 - 2 * radius, y0, x1, y0 + 2 * radius], fill=fill)
    draw.ellipse([x0, y1 - 2 * radius, x0 + 2 * radius, y1], fill=fill)
    draw.ellipse([x1 - 2 * radius, y1 - 2 * radius, x1, y1], fill=fill)


def draw_arc_with_arrow(draw, cx, cy, r, start_deg, end_deg, width, color):
    """Draw a thick arc by stacking many thin PIL arcs."""
    for w in range(-width // 2, width // 2 + 1):
        rr = r + w
        draw.arc(
            [cx - rr, cy - rr, cx + rr, cy + rr],
            start=start_deg, end=end_deg,
            fill=color, width=4,
        )


def draw_arrow_head(draw, cx, cy, r, angle_deg, size, color):
    """Draw a filled triangle arrowhead at angle_deg on circle of radius r."""
    a = math.radians(angle_deg)
    # tip of arrow
    tip_x = cx + r * math.cos(a)
    tip_y = cy + r * math.sin(a)
    # perpendicular direction
    perp = a + math.pi / 2
    # back of arrow
    back_a = a - math.radians(28)
    back_x = cx + (r - size * 0.6) * math.cos(back_a)
    back_y = cy + (r - size * 0.6) * math.sin(back_a)
    left_x = back_x + size * 0.55 * math.cos(perp)
    left_y = back_y + size * 0.55 * math.sin(perp)
    right_x = back_x - size * 0.55 * math.cos(perp)
    right_y = back_y - size * 0.55 * math.sin(perp)
    draw.polygon([(tip_x, tip_y), (left_x, left_y), (right_x, right_y)], fill=color)


def make_icon(size: int) -> Image.Image:
    S = size * 4  # supersample
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = int(S * 0.04)
    radius = int(S * 0.22)

    # --- Background: violet rounded square ---
    BG = "#5b21b6"
    draw_rounded_rect(draw, [pad, pad, S - pad, S - pad], radius, BG)

    # Subtle inner gradient feel via a lighter overlay ellipse
    hl = int(S * 0.55)
    draw.ellipse(
        [S // 2 - hl, pad, S // 2 + hl, S // 2 + int(S * 0.15)],
        fill=(255, 255, 255, 18),
    )

    cx, cy = S // 2, S // 2
    WHITE = (255, 255, 255, 255)

    # --- Circular resume arc (↺): ~300° arc with arrowhead ---
    arc_r = int(S * 0.30)
    arc_w = int(S * 0.055)
    # arc from 120° to 60° (going clockwise, leaving a gap at top-right)
    draw_arc_with_arrow(draw, cx, cy, arc_r, start_deg=100, end_deg=50, width=arc_w, color=WHITE)
    # arrowhead at end of arc (~50°)
    draw_arrow_head(draw, cx, cy, arc_r, angle_deg=50, size=int(S * 0.09), color=WHITE)

    # --- Play triangle (offset slightly left to account for visual center) ---
    tri_r = int(S * 0.155)
    offset_x = int(S * 0.025)   # nudge right (optical center of triangle)
    angle_offsets = [-140, 100, -20]  # equilateral pointing right
    pts = []
    for ang in angle_offsets:
        a = math.radians(ang)
        pts.append((cx + offset_x + tri_r * math.cos(a), cy + tri_r * math.sin(a)))
    draw.polygon(pts, fill=WHITE)

    # Downsample for AA
    return img.resize((size, size), Image.LANCZOS)


# ── Generate all required sizes ────────────────────────────────────────────────
import os

OUT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "src-tauri", "icons")

# 32x32
make_icon(32).save(os.path.join(OUT, "32x32.png"))
print("32x32.png done")

# 128x128
make_icon(128).save(os.path.join(OUT, "128x128.png"))
print("128x128.png done")

# 128x128@2x  (256px)
make_icon(256).save(os.path.join(OUT, "128x128@2x.png"))
print("128x128@2x.png done")

# icon.ico  (multi-size, PNG-in-ICO format, Windows Vista+)
import struct, io

def create_multi_ico(sizes_list):
    images = [make_icon(s) for s in sizes_list]
    png_datas = []
    for img in images:
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        png_datas.append(buf.getvalue())

    count = len(images)
    dir_offset = 6 + count * 16
    offsets = []
    for data in png_datas:
        offsets.append(dir_offset)
        dir_offset += len(data)

    header = struct.pack("<HHH", 0, 1, count)
    directory = b""
    for img, data, offset in zip(images, png_datas, offsets):
        w, h = img.size
        directory += struct.pack(
            "<BBBBHHII",
            0 if w >= 256 else w,
            0 if h >= 256 else h,
            0, 0, 1, 32,
            len(data), offset,
        )
    return header + directory + b"".join(png_datas)

ico_data = create_multi_ico([256, 128, 64, 48, 32, 24, 16])
with open(os.path.join(OUT, "icon.ico"), "wb") as f:
    f.write(ico_data)
print("icon.ico done")

# Also save a 512px PNG for reference / future use
make_icon(512).save(os.path.join(OUT, "icon.png"))
print("icon.png done")

print("\nAll icons generated successfully.")
