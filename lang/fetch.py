import io
import json
import os
import urllib.request
import zipfile

DIR = os.path.dirname(os.path.abspath(__file__))


def main():
    manifest_url = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"
    req = urllib.request.Request(manifest_url, headers={"User-Agent": "mc-map"})
    with urllib.request.urlopen(req) as r:
        manifest = json.loads(r.read())

    v_meta = next(v for v in manifest["versions"] if v["id"] == "26.3")
    v_req = urllib.request.Request(v_meta["url"], headers={"User-Agent": "mc-map"})
    with urllib.request.urlopen(v_req) as r:
        v_data = json.loads(r.read())

    # German: asset index -> minecraft/lang/de_de.json -> resources.download.minecraft.net
    asset_req = urllib.request.Request(v_data["assetIndex"]["url"], headers={"User-Agent": "mc-map"})
    with urllib.request.urlopen(asset_req) as r:
        asset_index = json.loads(r.read())

    de_hash = asset_index["objects"]["minecraft/lang/de_de.json"]["hash"]
    de_url = f"https://resources.download.minecraft.net/{de_hash[:2]}/{de_hash}"
    de_req = urllib.request.Request(de_url, headers={"User-Agent": "mc-map"})
    with urllib.request.urlopen(de_req) as r:
        de_raw = json.loads(r.read().decode("utf-8"))

    de_filtered = {
        k: v for k, v in de_raw.items()
        if (k.startswith("advancements.") and k.endswith(".title"))
        or k.startswith("block.minecraft.")
        or k.startswith("item.minecraft.")
        or k.startswith("entity.minecraft.")
        or k.startswith("death.")
    }
    de_sorted = dict(sorted(de_filtered.items()))

    # English: client jar -> assets/minecraft/lang/en_us.json
    client_url = v_data["downloads"]["client"]["url"]
    client_req = urllib.request.Request(client_url, headers={"User-Agent": "mc-map"})
    with urllib.request.urlopen(client_req) as r:
        client_jar = r.read()

    with zipfile.ZipFile(io.BytesIO(client_jar)) as z:
        en_raw = json.loads(z.read("assets/minecraft/lang/en_us.json").decode("utf-8"))

    en_filtered = {
        k: v for k, v in en_raw.items()
        if k.startswith("death.") or k.startswith("entity.minecraft.")
    }
    en_sorted = dict(sorted(en_filtered.items()))

    os.makedirs(DIR, exist_ok=True)
    with open(os.path.join(DIR, "de.json"), "w", encoding="utf-8") as f:
        json.dump(de_sorted, f, ensure_ascii=False, indent=2)

    with open(os.path.join(DIR, "en.json"), "w", encoding="utf-8") as f:
        json.dump(en_sorted, f, ensure_ascii=False, indent=2)

    print("Language files fetched successfully.")


if __name__ == "__main__":
    main()
