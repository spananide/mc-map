import json
import os
import re
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request

TOKEN = os.environ["EXAROTON_TOKEN"]
SERVER = os.environ["EXAROTON_SERVER"]
ROOT = "plugins/squaremap/web"
OUT = os.path.join("site", "map")


def api(path):
    url = f"https://api.exaroton.com/v1/servers/{SERVER}/{path}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}", "User-Agent": "mc-map"})
    while True:
        try:
            with urllib.request.urlopen(req) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(1)


def get(kind, path):
    return api(f"files/{kind}/{urllib.parse.quote(path)}/")


def sync(path):
    info = json.loads(get("info", path))["data"]
    for child in info["children"] or []:
        remote = f"{path}/{child['name']}"
        local = os.path.join(OUT, os.path.relpath(remote, ROOT))
        if child["isDirectory"]:
            sync(remote)
        elif child["name"].endswith(".json") or not os.path.exists(local) or os.path.getsize(local) != child["size"]:
            os.makedirs(os.path.dirname(local), exist_ok=True)
            with open(local, "wb") as f:
                f.write(get("data", remote))
    # Drop what the server no longer has (e.g. tiles after a world reset).
    local_dir = os.path.join(OUT, os.path.relpath(path, ROOT))
    if os.path.isdir(local_dir):
        for name in set(os.listdir(local_dir)) - {c["name"] for c in info["children"] or []}:
            stale = os.path.join(local_dir, name)
            shutil.rmtree(stale) if os.path.isdir(stale) else os.remove(stale)


if __name__ == "__main__":
    sync(ROOT)

    # The mirror only changes every 10 min; static mode stops the UI re-fetching every tile every 15 s.
    settings_file = os.path.join(OUT, "tiles", "settings.json")
    with open(settings_file) as f:
        settings = json.load(f)
    settings["static"] = True
    with open(settings_file, "w") as f:
        json.dump(settings, f)

    # exaroton's Cloudflare injects its analytics beacon into index.html on download.
    index_file = os.path.join(OUT, "index.html")
    with open(index_file, encoding="utf-8") as f:
        html = re.sub(r"<script[^>]*cloudflareinsights.*?</script>\s*", "", f.read(), flags=re.S)
    with open(index_file, "w", encoding="utf-8") as f:
        f.write(html)
