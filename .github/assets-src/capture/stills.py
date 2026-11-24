"""Optimises product screenshots for the README and composes the phone screens."""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)

DESKTOP = ["landing", "dashboard", "jobs", "job-detail", "tailoring", "tracker", "answers", "ops-review-detail", "ops-delivery"]
for name in DESKTOP:
    p = os.path.join(src, name + ".png")
    if not os.path.exists(p):
        continue
    im = Image.open(p).convert("RGB")
    dst = os.path.join(out, name + ".webp")
    im.save(dst, "WEBP", quality=82, method=6)
    print(f"  screenshots/{name}.webp".ljust(42), f"{os.path.getsize(dst) / 1024:.1f} KB")

# Phones on the brand backdrop
phones = [n for n in ["mobile-dashboard", "mobile-jobs", "mobile-tracker"] if os.path.exists(os.path.join(src, n + ".png"))]
if phones:
    W, H = 1440, 900
    bg = Image.new("RGB", (W, H), (9, 10, 14))
    glow = Image.new("RGB", (W, H), (9, 10, 14))
    ImageDraw.Draw(glow).ellipse([W * 0.2, -H * 0.2, W * 0.8, H * 0.7], fill=(60, 24, 16))
    bg = Image.blend(bg, glow.filter(ImageFilter.GaussianBlur(160)), 0.8)
    grid = ImageDraw.Draw(bg)
    for x in range(0, W, 36):
        grid.line([(x, 0), (x, H)], fill=(18, 20, 25))
    for y in range(0, H, 36):
        grid.line([(0, y), (W, y)], fill=(18, 20, 25))
    pw, ph = 330, int(330 * 844 / 390)
    gap = 70
    x0 = (W - (pw * len(phones) + gap * (len(phones) - 1))) // 2
    y0 = (H - ph) // 2
    for i, n in enumerate(phones):
        im = Image.open(os.path.join(src, n + ".png")).convert("RGB").resize((pw, ph), Image.LANCZOS)
        x = x0 + i * (pw + gap)
        # bezel
        shadow = Image.new("L", (W, H), 0)
        ImageDraw.Draw(shadow).rounded_rectangle([x - 10, y0 - 10 + 18, x + pw + 10, y0 + ph + 10 + 18], radius=52, fill=150)
        bg.paste((0, 0, 0), (0, 0), shadow.filter(ImageFilter.GaussianBlur(24)))
        ImageDraw.Draw(bg).rounded_rectangle([x - 10, y0 - 10, x + pw + 10, y0 + ph + 10], radius=50, fill=(22, 24, 30), outline=(58, 62, 72), width=2)
        mask = Image.new("L", (pw, ph), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw - 1, ph - 1], radius=40, fill=255)
        bg.paste(im, (x, y0), mask)
    dst = os.path.join(out, "mobile.webp")
    bg.save(dst, "WEBP", quality=84, method=6)
    print("  screenshots/mobile.webp".ljust(42), f"{os.path.getsize(dst) / 1024:.1f} KB")
