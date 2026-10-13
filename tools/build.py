#!/usr/bin/env python3
"""Build a lightweight website and a self-contained full-resolution offline copy."""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def embedded_assets(full_resolution):
    files = [('earth', 'earth.webp'), ('normal', 'normal.jpg'),
             ('specular', 'specular.jpg'), ('clouds', 'clouds.png')] if full_resolution else [
                 ('earth', 'earth-preview.webp'), ('normal', 'normal-preview.jpg'),
                 ('specular', 'specular-preview.jpg'), ('clouds', 'clouds-preview.webp')]
    assets = {}
    mime = {'png': 'image/png', 'jpg': 'image/jpeg', 'webp': 'image/webp'}
    for key, filename in files:
        path = ROOT / 'assets' / filename
        ext = path.suffix[1:]
        assets[key] = f'data:{mime[ext]};base64,' + base64.b64encode(path.read_bytes()).decode()
    return 'window.WORLD_ASSETS=' + json.dumps(assets, separators=(',', ':')) + ';'


def build():
    template = (ROOT / 'src/template.html').read_text()
    common = {
        'IMMERSIVE_CSS': (ROOT / 'src/immersive.css').read_text(),
        'THREE': (ROOT / 'vendor/three.min.js').read_text(),
        'FLIGHT_MATH': (ROOT / 'src/flight-math.js').read_text(),
        'WORLD': (ROOT / 'src/world.js').read_text(),
        'SATELLITE_MATH': (ROOT / 'src/satellite-math.js').read_text(),
        'SATELLITE': (ROOT / 'src/satellite.js').read_text(),
    }
    for name, full in [('index.html', False), ('offline.html', True)]:
        page = template
        for key, text in {**common, 'WORLD_ASSETS': embedded_assets(full)}.items():
            token = f'/*__{key}__*/'
            if page.count(token) != 1:
                raise ValueError(f'Expected exactly one {token} placeholder')
            page = page.replace(token, text)
        (ROOT / name).write_text(page)
        print(f'Built {name}: {len(page.encode()):,} bytes; ' +
              ('full 8K offline imagery' if full else 'compact globe fallback and on-demand satellite detail'))


if __name__ == '__main__':
    build()
