"""Converts the landing screen captures from PNG to WebP and removes the PNG files.

The service worker precaches *.png under src/assets, so the PNG files must not ship: they are
deleted once their WebP twin exists. Run with `python3 -I` (isolated mode, no user site-packages).
"""

from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
SCREENS_DIR = REPO_ROOT / "src" / "assets" / "landing" / "screens"
TARGET_WIDTH = 780  # 390 CSS px at 2x
WEBP_QUALITY = 82


def convert(png_path: Path) -> Path:
    webp_path = png_path.with_suffix(".webp")
    with Image.open(png_path) as image:
        rgb = image.convert("RGB")
        if rgb.width != TARGET_WIDTH:
            height = round(rgb.height * TARGET_WIDTH / rgb.width)
            rgb = rgb.resize((TARGET_WIDTH, height), Image.Resampling.LANCZOS)
        rgb.save(webp_path, "WEBP", quality=WEBP_QUALITY)
    png_path.unlink()
    return webp_path


def main() -> None:
    pngs = sorted(SCREENS_DIR.glob("*.png"))
    if not pngs:
        raise SystemExit(f"No PNG captures found in {SCREENS_DIR}")
    for png in pngs:
        webp = convert(png)
        with Image.open(webp) as image:
            print(f"{webp.relative_to(REPO_ROOT)} {image.width}x{image.height}")


if __name__ == "__main__":
    main()
