"""Fetch a simplified boundary for every city in data/restaurants.json, for the map's city outlines.

    uv run --no-project --with requests python scripts/city-outlines.py

Writes data/city-outlines.json ({city: GeoJSON geometry}). Uses OpenStreetMap's Nominatim, politely
(one request a second, an identifying User-Agent); re-run it after adding a place in a new city.
Cities it can't find are left out, and the map falls back to fitting that city's pins.
"""
import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "restaurants.json"
OUT = ROOT / "data" / "city-outlines.json"
UA = "narunraman.com restaurant map (city outlines, run by hand)"


def outline(city, region, country):
    params = {"city": city, "state": region, "country": country, "format": "jsonv2", "limit": 1,
              "polygon_geojson": 1, "polygon_threshold": 0.002}
    for attempt in (params, {k: v for k, v in params.items() if k != "state"}):
        r = requests.get("https://nominatim.openstreetmap.org/search", params=attempt,
                         headers={"User-Agent": UA}, timeout=30)
        r.raise_for_status()
        time.sleep(1.1)
        hits = [h for h in r.json() if h.get("geojson", {}).get("type") in ("Polygon", "MultiPolygon")]
        if hits:
            return hits[0]["geojson"]
    return None


def rounded(geometry):
    def walk(x):
        return [walk(y) for y in x] if isinstance(x[0], list) else [round(x[0], 4), round(x[1], 4)]
    return {"type": geometry["type"], "coordinates": walk(geometry["coordinates"])}


def main():
    places = json.loads(DATA.read_text())["restaurants"]
    cities = {}
    for p in places:
        cities.setdefault(p["city"], (p.get("region", ""), p.get("country", "")))
    old = json.loads(OUT.read_text()) if OUT.exists() else {}
    result = {}
    for city, (region, country) in sorted(cities.items()):
        if city in old:
            result[city] = old[city]
            continue
        geometry = outline(city, region, country)
        print(f"{city}: {'ok' if geometry else 'not found'}")
        if geometry:
            result[city] = rounded(geometry)
    OUT.write_text(json.dumps(result, separators=(",", ":")) + "\n")
    print(f"{len(result)} of {len(cities)} cities, {OUT.stat().st_size / 1024:.0f} KB -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
