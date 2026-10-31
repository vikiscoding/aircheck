"""Draw og-image.png (1200x630) and apple-touch-icon.png (180x180).

Run from the repo root: python scripts/make-images.py
Needs Pillow. Font paths default to Windows; pass --serif and --sans to override.
The sentence is the table row for mild|clear_dry|low, the same sample the page shows.
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PAGE = "#f4f0e6"
INK = "#1a1814"
SECONDARY = "#5e584e"
ACTION = "#0f6e6b"
CARD = "#fffdf8"
LINE = "#ddd6c8"

ROOT = Path(__file__).resolve().parent.parent


def wrap(draw, text, font, width):
    lines, line = [], ""
    for word in text.split():
        trial = (line + " " + word).strip()
        if draw.textlength(trial, font=font) <= width:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def og_image(serif, sans, sans_bold):
    sample = json.loads((ROOT / "feel-table.json").read_text(encoding="utf-8"))["mild|clear_dry|low"]["feel"]
    img = Image.new("RGB", (1200, 630), PAGE)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 1200, 14], fill=ACTION)
    d.ellipse([80, 72, 116, 108], fill=ACTION)
    d.text((132, 70), "aircheck.fyi", font=ImageFont.truetype(sans_bold, 36), fill=INK)
    d.text((80, 150), "How it feels outside right now", font=ImageFont.truetype(sans_bold, 64), fill=INK)
    d.rounded_rectangle([80, 270, 1120, 520], radius=14, fill=CARD, outline=LINE, width=2)
    d.text((112, 296), "SAMPLE READING", font=ImageFont.truetype(sans_bold, 24), fill=SECONDARY)
    quote = ImageFont.truetype(serif, 44)
    y = 342
    for line in wrap(d, sample, quote, 976):
        d.text((112, y), line, font=quote, fill=INK)
        y += 58
    d.text((80, 552), "Weather, US AQI and UV, in one plain sentence. Data: Open-Meteo.",
           font=ImageFont.truetype(sans, 28), fill=SECONDARY)
    img.save(ROOT / "og-image.png", optimize=True)


def touch_icon():
    img = Image.new("RGB", (180, 180), PAGE)
    d = ImageDraw.Draw(img)
    d.ellipse([45, 45, 135, 135], fill=ACTION)
    img.save(ROOT / "apple-touch-icon.png", optimize=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--serif", default="C:/Windows/Fonts/georgia.ttf")
    parser.add_argument("--sans", default="C:/Windows/Fonts/segoeui.ttf")
    parser.add_argument("--sans-bold", default="C:/Windows/Fonts/segoeuib.ttf")
    args = parser.parse_args()
    og_image(args.serif, args.sans, args.sans_bold)
    touch_icon()
