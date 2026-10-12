#!/usr/bin/env python3
"""Rebuild the offline single-file website from editable sources and local assets."""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def build():
    page = (ROOT / 'src/template.html').read_text()
    assets = {}
    for name, ext in [('earth','webp'),('normal','jpg'),('specular','jpg'),('clouds','png')]:
        mime = {'png':'image/png','jpg':'image/jpeg','webp':'image/webp'}[ext]
        assets[name] = f'data:{mime};base64,' + base64.b64encode((ROOT / f'assets/{name}.{ext}').read_bytes()).decode()
    blocks = {
        'IMMERSIVE_CSS': (ROOT / 'src/immersive.css').read_text(),
        'THREE': (ROOT / 'vendor/three.min.js').read_text(),
        'WORLD_ASSETS': 'window.WORLD_ASSETS=' + json.dumps(assets,separators=(',',':')) + ';',
        'FLIGHT_MATH': (ROOT / 'src/flight-math.js').read_text(),
        'WORLD': (ROOT / 'src/world.js').read_text(),
    }
    for name, text in blocks.items():
        token = f'/*__{name}__*/'
        if page.count(token) != 1:
            raise ValueError(f'Expected exactly one {token} placeholder')
        page = page.replace(token, text)
    (ROOT / 'index.html').write_text(page)
    print(f'Built index.html: {len(page.encode()):,} bytes; all rendering code and textures embedded.')

if __name__ == '__main__':
    build()
