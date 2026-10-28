#!/usr/bin/env python3
"""Generate app/icon.png (80x80) and app/largeIcon.png (130x130) with no dependencies."""
import os
import struct
import zlib

APP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app")


def png(path, size):
    radius = size * 0.22
    dot = size * 0.13
    centers = [(x, y) for y in (0.36, 0.64) for x in (0.36, 0.64)]
    rows = []
    for y in range(size):
        row = bytearray([0])  # filter: none
        for x in range(size):
            # Rounded-square mask.
            cx = min(max(x + 0.5, radius), size - radius)
            cy = min(max(y + 0.5, radius), size - radius)
            inside = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= radius ** 2
            if not inside:
                row += b"\0\0\0\0"
                continue
            # Vertical teal-to-blue gradient with a 2x2 grid of white dots.
            t = y / size
            r, g, b = int(20 + 10 * t), int(170 - 90 * t), int(160 + 60 * t)
            for dx, dy in centers:
                if (x + 0.5 - dx * size) ** 2 + (y + 0.5 - dy * size) ** 2 <= dot ** 2:
                    r, g, b = 255, 255, 255
            row += bytes([r, g, b, 255])
        rows.append(bytes(row))

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)))
        f.write(chunk(b"IDAT", zlib.compress(b"".join(rows), 9)))
        f.write(chunk(b"IEND", b""))


if __name__ == "__main__":
    png(os.path.join(APP_DIR, "icon.png"), 80)
    png(os.path.join(APP_DIR, "largeIcon.png"), 130)
    print("Icons written to", os.path.normpath(APP_DIR))
