import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

TOKEN = os.environ["EXAROTON_TOKEN"]
SERVER = os.environ["EXAROTON_SERVER"]
API = f"https://api.exaroton.com/v1/servers/{SERVER}/files"
ROOT = "plugins/squaremap/web"


def get(kind, path):
    url = f"{API}/{kind}/{urllib.parse.quote(path)}/"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {TOKEN}", "User-Agent": "mc-map"})
    while True:
        try:
            with urllib.request.urlopen(req) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(1)


def sync(path):
    info = json.loads(get("info", path))["data"]
    for child in info["children"] or []:
        remote = f"{path}/{child['name']}"
        local = os.path.join("map", os.path.relpath(remote, ROOT))
        if child["isDirectory"]:
            sync(remote)
        elif child["name"].endswith(".json") or not os.path.exists(local) or os.path.getsize(local) != child["size"]:
            os.makedirs(os.path.dirname(local), exist_ok=True)
            with open(local, "wb") as f:
                f.write(get("data", remote))


sync(ROOT)
