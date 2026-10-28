#!/usr/bin/env python3
"""Package ./app into an installable webOS .ipk without needing Node/ares-cli.

Produces the same layout as `ares-package`: an ar archive holding
debian-binary, control.tar.gz and data.tar.gz (app under usr/palm/applications/<id>).
"""
import io
import json
import os
import tarfile
import time

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
APP_DIR = os.path.join(ROOT, "app")
OUT_DIR = os.path.join(ROOT, "dist")


def add_bytes(tar, name, data, mode=0o644):
    info = tarfile.TarInfo(name)
    info.size = len(data)
    info.mode = mode
    info.mtime = int(time.time())
    tar.addfile(info, io.BytesIO(data))


def add_dir(tar, name):
    info = tarfile.TarInfo(name)
    info.type = tarfile.DIRTYPE
    info.mode = 0o755
    info.mtime = int(time.time())
    tar.addfile(info)


def targz(build):
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz", format=tarfile.GNU_FORMAT) as tar:
        build(tar)
    return buf.getvalue()


def ar_member(name, data):
    header = (
        name.ljust(16)
        + str(int(time.time())).ljust(12)
        + "0".ljust(6)
        + "0".ljust(6)
        + "100644".ljust(8)
        + str(len(data)).ljust(10)
        + "`\n"
    ).encode("ascii")
    return header + data + (b"\n" if len(data) % 2 else b"")


def main():
    with open(os.path.join(APP_DIR, "appinfo.json")) as f:
        info = json.load(f)
    app_id, version = info["id"], info["version"]
    app_root = "./usr/palm/applications/" + app_id

    files = []
    size = 0
    for dirpath, _, names in os.walk(APP_DIR):
        for n in sorted(names):
            full = os.path.join(dirpath, n)
            rel = os.path.relpath(full, APP_DIR).replace(os.sep, "/")
            files.append((rel, full))
            size += os.path.getsize(full)

    package_info = json.dumps(
        {"app": app_id, "id": app_id, "loc_name": info.get("title", app_id), "version": version},
        indent=2,
    ).encode()

    def data(tar):
        for d in ["./usr", "./usr/palm", "./usr/palm/applications", app_root,
                  "./usr/palm/packages", "./usr/palm/packages/" + app_id]:
            add_dir(tar, d)
        made = set()
        for rel, full in files:
            parts = rel.split("/")[:-1]
            for i in range(1, len(parts) + 1):
                sub = app_root + "/" + "/".join(parts[:i])
                if sub not in made:
                    add_dir(tar, sub)
                    made.add(sub)
            with open(full, "rb") as fh:
                add_bytes(tar, app_root + "/" + rel, fh.read())
        add_bytes(tar, "./usr/palm/packages/%s/packageinfo.json" % app_id, package_info)

    control = (
        "Package: {id}\nVersion: {v}\nSection: misc\nPriority: optional\n"
        "Architecture: all\nInstalled-Size: {size}\nMaintainer: {vendor}\n"
        "Description: {title}\nwebOS-Package-Format-Version: 2\n"
        "webOS-Packager-Version: x.y.x\n"
    ).format(id=app_id, v=version, size=(size + 1023) // 1024,
             vendor=info.get("vendor", "unknown"), title=info.get("title", app_id)).encode()

    ipk = b"!<arch>\n"
    ipk += ar_member("debian-binary", b"2.0\n")
    ipk += ar_member("control.tar.gz", targz(lambda t: add_bytes(t, "./control", control)))
    ipk += ar_member("data.tar.gz", targz(data))

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, "%s_%s_all.ipk" % (app_id, version))
    with open(out, "wb") as f:
        f.write(ipk)
    print("Built", os.path.normpath(out))


if __name__ == "__main__":
    main()
