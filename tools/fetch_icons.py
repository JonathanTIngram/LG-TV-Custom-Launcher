#!/usr/bin/env python3
"""Download app logos into app/icons/ (git-ignored).

Logos are trademarks of their owners, so they are fetched on your machine at
build time rather than committed to the repo. Slugs must match app/brands.js.
"""
import os
import struct
import sys
import urllib.request

ICON_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "icons")

FAVICON = "https://www.google.com/s2/favicons?domain=%s&sz=256"
COMMONS = "https://commons.wikimedia.org/wiki/Special:FilePath/%s?width=256"

# slug -> candidate URLs, best first. The first image at least MIN_SIZE px wins.
SOURCES = {
    "netflix": [COMMONS % "Netflix_icon.svg", FAVICON % "netflix.com"],
    "youtube": [FAVICON % "youtube.com"],
    "primevideo": [FAVICON % "primevideo.com"],
    "disneyplus": [FAVICON % "disneyplus.com"],
    "hulu": [FAVICON % "hulu.com"],
    "appletv": [FAVICON % "tv.apple.com"],
    "spotify": [COMMONS % "Spotify_icon.svg", FAVICON % "spotify.com"],
    "plex": [FAVICON % "plex.tv"],
    "paramountplus": [FAVICON % "paramountplus.com"],
    "peacock": [FAVICON % "peacocktv.com"],
    "twitch": [COMMONS % "Twitch_Glitch_Logo_Purple.svg", FAVICON % "twitch.tv"],
    "crunchyroll": [FAVICON % "crunchyroll.com"],
    "tubi": [FAVICON % "tubitv.com"],
}

MIN_SIZE = 96


def image_size(data):
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", data[16:24])
    if data[:2] == b"\xff\xd8":  # JPEG: walk segments to the SOF marker
        i = 2
        while i + 9 < len(data):
            marker, length = data[i + 1], struct.unpack(">H", data[i + 2:i + 4])[0]
            if 0xC0 <= marker <= 0xC3:
                h, w = struct.unpack(">HH", data[i + 5:i + 9])
                return w, h
            i += 2 + length
    return None


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "CleanHomeIconFetcher/1.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.read()


def main():
    os.makedirs(ICON_DIR, exist_ok=True)
    failed = []
    for slug, urls in SOURCES.items():
        best = None
        for url in urls:
            try:
                data = fetch(url)
            except Exception as e:
                print("  %s: %s (%s)" % (slug, e, url))
                continue
            size = image_size(data)
            if not size:
                continue
            if best is None or min(size) > min(best[1]):
                best = (data, size)
            if min(size) >= MIN_SIZE:
                break
        if best:
            with open(os.path.join(ICON_DIR, slug + ".png"), "wb") as f:
                f.write(best[0])
            print("%-14s %dx%d" % (slug, best[1][0], best[1][1]))
        else:
            failed.append(slug)
    if failed:
        print("No icon for:", ", ".join(failed), "(these will use a lettered tile)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
