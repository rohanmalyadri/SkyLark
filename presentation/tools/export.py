#!/usr/bin/env python3
"""Builds the static backups from full-resolution slide renders.

  1. node presentation/tools/shoot.mjs http://localhost:4173/index.html presentation/tools/.renders 1
  2. python3 presentation/tools/export.py presentation/tools/.renders

Writes, inside presentation/:
  exports/slides/NN.jpg            1920x1080 screenshot of every slide in its final state
  exports/Skylark-presentation.pdf one page per slide
  exports/Skylark-presentation.pptx full-bleed slide images with the speaker notes attached
  exports/speaker-notes.md         every slide's notes as Markdown
  assets/thumbs/NN.webp            640x360 thumbnails for the overview grid and presenter view
Needs Pillow, python-pptx and beautifulsoup4.
"""
import sys
from pathlib import Path

from bs4 import BeautifulSoup
from PIL import Image
from pptx import Presentation
from pptx.util import Emu

ROOT = Path(__file__).resolve().parent.parent
renders = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / "tools/.renders")
out = ROOT / "exports"
(out / "slides").mkdir(parents=True, exist_ok=True)
(ROOT / "assets/thumbs").mkdir(parents=True, exist_ok=True)

soup = BeautifulSoup((ROOT / "index.html").read_text(encoding="utf-8"), "html.parser")
slides = soup.select("section.slide")
pngs = sorted(renders.glob("*.png"))
if len(pngs) != len(slides):
    sys.exit(f"expected {len(slides)} renders in {renders}, found {len(pngs)}")


def notes_of(sec):
    aside = sec.select_one("aside.notes")
    if not aside:
        return "", []
    blocks = []
    for el in aside.find_all(["h4", "p", "ul", "ol"], recursive=False):
        if el.name == "h4":
            blocks.append(("h", el.get_text(" ", strip=True)))
        elif el.name == "p":
            blocks.append(("p", el.get_text(" ", strip=True)))
        else:
            for i, li in enumerate(el.find_all("li", recursive=False), 1):
                mark = f"{i}." if el.name == "ol" else "-"
                blocks.append(("li", f"{mark} {li.get_text(' ', strip=True)}"))
    return aside.get("data-duration", ""), blocks


prs = Presentation()
prs.slide_width, prs.slide_height = Emu(12192000), Emu(6858000)  # 13.333 x 7.5 in, 16:9
blank = prs.slide_layouts[6]
md = ["# Skylark presentation: speaker notes", "",
      "Durations are guides. They add up to about 35 minutes; trim the deep-dive slides for a shorter slot.", ""]
pages = []

for i, (sec, png) in enumerate(zip(slides, pngs), 1):
    nn = f"{i:02d}"
    title = sec.get("data-title", "")
    img = Image.open(png).convert("RGB")
    if img.size != (1920, 1080):
        img = img.resize((1920, 1080), Image.LANCZOS)
    jpg = out / "slides" / f"{nn}.jpg"
    img.save(jpg, quality=90, optimize=True, progressive=True)
    img.resize((640, 360), Image.LANCZOS).save(ROOT / "assets/thumbs" / f"{nn}.webp", quality=80, method=6)
    pages.append(img)

    dur, blocks = notes_of(sec)
    s = prs.slides.add_slide(blank)
    s.shapes.add_picture(str(jpg), 0, 0, prs.slide_width, prs.slide_height)
    text = [f"{nn} · {title}" + (f"  (about {dur})" if dur else "")]
    for kind, t in blocks:
        text.append(("" if kind != "h" else "\n") + (t.upper() if kind == "h" else t))
    s.notes_slide.notes_text_frame.text = "\n".join(text).strip()

    md.append(f"## {nn} · {title}" + (f" · about {dur}" if dur else ""))
    md.append("")
    for kind, t in blocks:
        if kind == "h":
            md += ["", f"**{t}**", ""]
        else:
            md.append(t if kind == "li" else t + "\n")
    md += ["", "---", ""]

prs.save(out / "Skylark-presentation.pptx")
pages[0].save(out / "Skylark-presentation.pdf", save_all=True, append_images=pages[1:], resolution=144, quality=90)
(out / "speaker-notes.md").write_text("\n".join(md).replace("\n\n\n", "\n\n"), encoding="utf-8")
print(f"exported {len(slides)} slides to {out}")
