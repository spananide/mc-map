import json
import os
import tempfile

os.environ.setdefault("EXAROTON_TOKEN", "dummy_token")
os.environ.setdefault("EXAROTON_SERVER", "dummy_server")

import sync


def test_patch_map():
    with tempfile.TemporaryDirectory() as tmp_dir:
        os.makedirs(os.path.join(tmp_dir, "tiles", "minecraft_overworld"), exist_ok=True)
        os.makedirs(os.path.join(tmp_dir, "assets"), exist_ok=True)

        settings_file = os.path.join(tmp_dir, "tiles", "settings.json")
        with open(settings_file, "w", encoding="utf-8") as f:
            json.dump({"static": True, "ui": {}}, f)

        world_settings_file = os.path.join(tmp_dir, "tiles", "minecraft_overworld", "settings.json")
        with open(world_settings_file, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "tiles_update_interval": 15,
                    "marker_update_interval": 5,
                    "player_tracker": {"update_interval": 1, "enabled": True},
                },
                f,
            )

        js_file = os.path.join(tmp_dir, "assets", "index-abc.js")
        with open(js_file, "w", encoding="utf-8") as f:
            f.write("x.getJSON(`tiles/players.json`,t=>{})")

        map_file = os.path.join(tmp_dir, "assets", "index-abc.js.map")
        map_content = '{"sources":["tiles/players.json"]}'
        with open(map_file, "w", encoding="utf-8") as f:
            f.write(map_content)

        sync.patch_map(tmp_dir, sync.PLAYERS_URL)
        sync.patch_map(tmp_dir, sync.PLAYERS_URL)

        with open(settings_file, "r", encoding="utf-8") as f:
            settings = json.load(f)
        assert not settings.get("static")

        with open(world_settings_file, "r", encoding="utf-8") as f:
            ws = json.load(f)
        assert ws["tiles_update_interval"] == 100000
        assert ws["marker_update_interval"] == 600
        assert ws["player_tracker"]["update_interval"] == 5
        assert ws["player_tracker"]["enabled"] is True

        with open(js_file, "r", encoding="utf-8") as f:
            js = f.read()
        assert js.count(sync.PLAYERS_URL) == 1
        assert "tiles/players.json" not in js

        with open(map_file, "r", encoding="utf-8") as f:
            map_after = f.read()
        assert map_after == map_content


if __name__ == "__main__":
    test_patch_map()
    print("OK")
