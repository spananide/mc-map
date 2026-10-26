import json
import os
import re
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request

PLAYERS_URL = "https://mc-tick.spanani.workers.dev/players.json"
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


def patch_map(out, players_url):
    settings_file = os.path.join(out, "tiles", "settings.json")
    if os.path.exists(settings_file):
        with open(settings_file, "r", encoding="utf-8") as f:
            settings = json.load(f)
        settings.pop("static", None)
        with open(settings_file, "w", encoding="utf-8") as f:
            json.dump(settings, f)

    tiles_dir = os.path.join(out, "tiles")
    if os.path.isdir(tiles_dir):
        for entry in os.listdir(tiles_dir):
            world_dir = os.path.join(tiles_dir, entry)
            world_settings = os.path.join(world_dir, "settings.json")
            if os.path.isdir(world_dir) and os.path.isfile(world_settings):
                with open(world_settings, "r", encoding="utf-8") as f:
                    ws = json.load(f)
                ws["tiles_update_interval"] = 100000
                ws["marker_update_interval"] = 600
                if "player_tracker" not in ws or not isinstance(ws["player_tracker"], dict):
                    ws["player_tracker"] = {}
                ws["player_tracker"]["update_interval"] = 5
                with open(world_settings, "w", encoding="utf-8") as f:
                    json.dump(ws, f)

    assets_dir = os.path.join(out, "assets")
    if os.path.isdir(assets_dir):
        for root, _, files in os.walk(assets_dir):
            for entry in files:
                if entry.endswith(".js") and not entry.endswith(".js.map"):
                    file_path = os.path.join(root, entry)
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    if "tiles/players.json" in content:
                        content = content.replace("tiles/players.json", players_url)
                        with open(file_path, "w", encoding="utf-8") as f:
                            f.write(content)


if __name__ == "__main__":
    sync(ROOT)

    patch_map(OUT, PLAYERS_URL)

    # exaroton's Cloudflare injects its analytics beacon into index.html on download.
    index_file = os.path.join(OUT, "index.html")
    with open(index_file, encoding="utf-8") as f:
        html = re.sub(r"<script[^>]*cloudflareinsights.*?</script>\s*", "", f.read(), flags=re.S)
    with open(index_file, "w", encoding="utf-8") as f:
        f.write(html)
