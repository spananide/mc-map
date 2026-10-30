import gzip
import struct
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from stats import (
    FOODS,
    TZ,
    add_layer,
    advancement_done,
    advancement_events,
    advancement_list,
    daily_hours,
    date_lines,
    death_patterns,
    death_text,
    derive,
    event,
    firsts,
    grave_layer,
    last_death,
    log_events,
    merge_events,
    new_log_lines,
    path_name,
    prune_activity,
    read_nbt,
    record_activity,
    record_history,
    update_meta,
)


def test_path_name():
    assert path_name(".BedrockGuy") == "bedrockguy"
    assert path_name("spananii") == "spananii"


def test_derive():
    stats = {
        "minecraft:custom": {
            "minecraft:play_time": 72000,
            "minecraft:deaths": 2,
            "minecraft:mob_kills": 5,
            "minecraft:walk_one_cm": 150000,
            "minecraft:sprint_one_cm": 50000,
            "minecraft:fall_one_cm": 1000,
            "minecraft:damage_dealt": 400,
            "minecraft:damage_taken": 100,
            "minecraft:jump": 30,
            "minecraft:eat_cake_slice": 1,
        },
        "minecraft:mined": {
            "minecraft:stone": 10,
            "minecraft:diamond_ore": 2,
            "minecraft:deepslate_diamond_ore": 1,
        },
        "minecraft:used": {
            "minecraft:totem_of_undying": 1,
            "minecraft:bread": 3,
            "minecraft:stone": 7,
            "minecraft:diamond_pickaxe": 9,
        },
        "minecraft:killed": {
            "minecraft:zombie": 4,
        },
        "minecraft:killed_by": {
            "minecraft:skeleton": 1,
        },
        "minecraft:crafted": {
            "minecraft:stick": 8,
        },
    }
    de = {
        "block.minecraft.stone": "Stein",
        "block.minecraft.diamond_ore": "Diamanterz",
        "item.minecraft.bread": "Brot",
        "entity.minecraft.zombie": "Zombie",
        "entity.minecraft.skeleton": "Skelett",
    }
    res = derive(stats, de)
    assert res["main"]["playtime_h"] == 1.0
    assert res["main"]["diamonds"] == 3
    assert res["main"]["deaths"] == 2
    assert res["main"]["mined"] == 13
    assert res["main"]["mob_kills"] == 5
    assert res["main"]["distance_km"] == 2.0
    assert res["main"]["totems"] == 1
    assert res["main"]["damage_hearts"] == 20.0
    assert res["main"]["meals"] == 4

    assert res["more"]["placed"] == 7
    assert res["more"]["jumps"] == 30
    assert res["more"]["damage_taken_hearts"] == 5.0
    assert res["more"]["crafted"] == 8
    assert res["more"]["fall_km"] == 0.01
    assert res["more"]["animals_bred"] == 0

    assert res["fav"]["mined"][0] == ["Stein", 10]
    assert ["deepslate_diamond_ore", 1] in res["fav"]["mined"]
    assert res["fav"]["placed"] == [["Stein", 7]]
    assert res["fav"]["killed"] == [["Zombie", 4]]
    assert res["fav"]["killed_by"] == [["Skelett", 1]]


def test_advancement_events():
    adv = {
        "minecraft:adventure/kill_a_mob": {
            "criteria": {
                "zombie": "2026-10-26 15:55:11 +0100"
            },
            "done": True,
        },
        "minecraft:recipes/misc/stick": {
            "criteria": {
                "has_wood": "2026-10-26 15:50:00 +0100"
            },
            "done": True,
        },
        "minecraft:story/mine_stone": {
            "criteria": {},
            "done": False,
        },
        "minecraft:adventure/root": {
            "criteria": {
                "killed_something": "2026-10-26 15:55:11 +0100"
            },
            "done": True,
        },
        "DataVersion": 4000,
    }
    de = {
        "advancements.adventure.kill_a_mob.title": "Monsterjäger",
        "advancements.adventure.root.title": "Abenteuer",
    }
    events = advancement_events(adv, "spananii", de)
    assert len(events) == 1
    assert events[0]["t"] == "2026-10-26T14:55:11Z"
    assert events[0]["text"] == "{p} hat den Fortschritt [Monsterjäger] erzielt"


def test_death_text():
    en = {
        "death.attack.mob": "%1$s was slain by %2$s",
        "death.attack.player.item": "%1$s was slain by %2$s using %3$s",
        "death.fell.accident.generic": "%1$s fell from a high place",
        "death.attack.generic": "%1$s died",
        "entity.minecraft.skeleton": "Skeleton",
    }
    de = {
        "death.attack.mob": "%1$s wurde von %2$s erschlagen",
        "death.attack.player.item": "%1$s wurde von %2$s mit %3$s erschlagen",
        "death.fell.accident.generic": "%1$s fiel aus zu großer Höhe",
        "death.attack.generic": "%1$s starb",
        "entity.minecraft.skeleton": "Skelett",
    }
    players = {"spananii", "Bob"}
    patterns = death_patterns(en)
    assert death_text("spananii fell from a high place", players, patterns, en, de) == ("spananii", "{p} fiel aus zu großer Höhe")
    assert death_text("spananii was slain by Skeleton", players, patterns, en, de) == ("spananii", "{p} wurde von Skelett erschlagen")
    assert death_text("spananii was slain by Bob using [Diamond Sword]", players, patterns, en, de) == ("spananii", "{p} wurde von Bob mit [Diamond Sword] erschlagen")
    assert death_text("Notch died", players, patterns, en, de) is None
    assert death_text("spananii joined the game", players, patterns, en, de) is None


def test_date_lines():
    now = datetime(2026, 10, 27, 0, 5, tzinfo=TZ)
    lines = [
        "[23:58:00] [Server thread/INFO]: a",
        "java.lang.Exception: x",
        "[00:01:00] [Server thread/INFO]: b",
    ]
    dated = date_lines(lines, now)
    assert len(dated) == 2
    assert dated[0] == (datetime(2026, 10, 26, 23, 58, tzinfo=TZ), "Server thread/INFO", "a")
    assert dated[1] == (datetime(2026, 10, 27, 0, 1, tzinfo=TZ), "Server thread/INFO", "b")


def test_log_events():
    en = {
        "death.fell.accident.generic": "%1$s fell from a high place",
    }
    de = {
        "death.fell.accident.generic": "%1$s fiel aus zu großer Höhe",
    }
    dt1 = datetime(2026, 10, 26, 12, 0, tzinfo=TZ)
    dt2 = datetime(2026, 10, 26, 12, 5, tzinfo=TZ)
    dt3 = datetime(2026, 10, 26, 12, 10, tzinfo=TZ)
    dt4 = datetime(2026, 10, 26, 12, 15, tzinfo=TZ)
    dated = [
        # Paper 26.x logs system messages with a "System chat: " prefix
        (dt1, "Server thread/INFO", "System chat: spananii joined the game"),
        (dt2, "Server thread/INFO", "System chat: spananii fell from a high place"),
        (dt3, "Async Chat Thread - #0/INFO", "<spananii> spananii died"),
        (dt4, "Server thread/INFO", "spananii left the game"),
    ]
    players = {"spananii", "Bob"}
    patterns = death_patterns(en)
    events, seen = log_events(dated, players, patterns, en, de)
    assert len(events) == 1
    assert events[0]["type"] == "death"
    assert events[0]["player"] == "spananii"
    assert events[0]["text"] == "{p} fiel aus zu großer Höhe"
    assert len(seen["spananii"]) == 2
    assert seen["spananii"] == [dt1, dt4]


def test_new_log_lines():
    lines = [f"line {i}" for i in range(5)]
    lines_new, state = new_log_lines(lines, {})
    assert lines_new == lines
    assert state == {"fingerprint": "\n".join(lines[:3]), "lines": 5}

    lines_more = lines + ["line 5", "line 6"]
    lines_new2, state2 = new_log_lines(lines_more, state)
    assert lines_new2 == ["line 5", "line 6"]
    assert state2 == {"fingerprint": "\n".join(lines[:3]), "lines": 7}

    lines_diff = [f"different {i}" for i in range(5)]
    lines_new3, state3 = new_log_lines(lines_diff, state)
    assert lines_new3 == lines_diff
    assert state3 == {"fingerprint": "\n".join(lines_diff[:3]), "lines": 5}


def test_merge_events():
    old = [
        {"t": f"2026-10-26T10:{i // 60:02d}:{i % 60:02d}Z", "type": "death", "player": "p", "text": "t", "key": f"key_{i}"}
        for i in range(299)
    ]
    new = [
        {"t": "2026-10-26T11:00:00Z", "type": "death", "player": "p", "text": "t", "key": "key_0"},
        {"t": "2026-10-26T11:01:00Z", "type": "death", "player": "p", "text": "t", "key": "key_new_1"},
        {"t": "2026-10-26T11:02:00Z", "type": "death", "player": "p", "text": "t", "key": "key_new_2"},
    ]
    merged = merge_events(old, new, limit=300)
    assert len(merged) == 300
    keys = [e["key"] for e in merged]
    assert len(keys) == len(set(keys))
    for i in range(len(merged) - 1):
        assert merged[i]["t"] >= merged[i + 1]["t"]


def test_update_meta():
    meta = {}
    t0 = datetime(2026, 10, 26, 10, 0, tzinfo=timezone.utc)
    t1 = datetime(2026, 10, 26, 12, 0, tzinfo=timezone.utc)
    t2 = datetime(2026, 10, 26, 14, 0, tzinfo=timezone.utc)
    update_meta(meta, "uuid1", [t2, t1])
    assert meta["uuid1"]["firstSeen"] == "2026-10-26T12:00:00Z"
    assert meta["uuid1"]["lastSeen"] == "2026-10-26T14:00:00Z"

    update_meta(meta, "uuid1", [t0])
    assert meta["uuid1"]["firstSeen"] == "2026-10-26T10:00:00Z"
    assert meta["uuid1"]["lastSeen"] == "2026-10-26T14:00:00Z"


def test_advancement_list():
    de = {
        "advancements.story.root.title": "Minecraft",
        "advancements.story.mine_stone.title": "Steinzeit",
        "advancements.story.mine_stone.description": "Baue Stein ab",
        "advancements.adventure.kill_a_mob.title": "Monsterjäger",
        "advancements.husbandry.root.title": "Landwirtschaft",
    }
    res = advancement_list(de)
    assert [x["key"] for x in res] == ["story/mine_stone", "adventure/kill_a_mob"]
    assert res[0]["title"] == "Steinzeit"
    assert res[0]["description"] == "Baue Stein ab"
    assert res[1]["title"] == "Monsterjäger"
    assert res[1]["description"] == ""


def test_advancement_done():
    adv = {
        "minecraft:adventure/kill_a_mob": {
            "criteria": {
                "zombie": "2026-10-26 15:55:11 +0100"
            },
            "done": True,
        },
        "minecraft:recipes/misc/stick": {
            "criteria": {
                "has_wood": "2026-10-26 15:50:00 +0100"
            },
            "done": True,
        },
        "minecraft:story/mine_stone": {
            "criteria": {},
            "done": False,
        },
        "minecraft:adventure/root": {
            "criteria": {
                "killed_something": "2026-10-26 15:55:11 +0100"
            },
            "done": True,
        },
        "DataVersion": 4000,
    }
    res = advancement_done(adv)
    # recipes and roots dropped, not-done dropped, times UTC
    assert res == [["adventure/kill_a_mob", "2026-10-26T14:55:11Z"]]


def test_firsts():
    players = [
        {
            "name": "Bob",
            "adv": {
                "done": [
                    ["story/mine_stone", "2026-10-26T12:00:00Z"],
                    ["adventure/kill_a_mob", "2026-10-26T14:00:00Z"],
                ]
            },
        },
        {
            "name": "Alice",
            "adv": {
                "done": [
                    ["story/mine_stone", "2026-10-26T10:00:00Z"],
                    ["adventure/kill_a_mob", "2026-10-26T14:00:00Z"],
                ]
            },
        },
    ]
    titles = {
        "story/mine_stone": "Steinzeit",
        "adventure/kill_a_mob": "Monsterjäger",
    }
    res = firsts(players, titles)
    # two players share a key, earlier one wins; tie -> alphabetical; sorted by t desc.
    assert len(res) == 2
    assert res[0] == {
        "key": "adventure/kill_a_mob",
        "title": "Monsterjäger",
        "player": "Alice",
        "t": "2026-10-26T14:00:00Z",
    }
    assert res[1] == {
        "key": "story/mine_stone",
        "title": "Steinzeit",
        "player": "Alice",
        "t": "2026-10-26T10:00:00Z",
    }

    # Verify tie-breaker when players order is reversed in input
    players_rev = [players[1], players[0]]
    assert firsts(players_rev, titles) == res


def test_record_history_and_daily_hours():
    hist = {}
    day1 = "2026-08-01"
    day2 = "2026-08-02"
    day3 = "2026-08-03"
    players1 = [{"uuid": "u1", "main": {"playtime_h": 1.0}}]
    record_history(hist, day1, players1)
    assert hist[day1]["u1"] == 1.0

    players3 = [{"uuid": "u1", "main": {"playtime_h": 3.5}}]
    record_history(hist, day3, players3)
    assert hist[day3]["u1"] == 3.5

    daily = daily_hours(hist, [day1, day2, day3], "u1")
    assert daily == [1.0, 0, 2.5]

    # a day older than 60 days is dropped
    old_day = "2026-05-01"
    hist[old_day] = {"u1": 0.5}
    record_history(hist, day3, players3)
    assert old_day not in hist
    assert day1 in hist


def test_record_activity_and_prune():
    act = {}
    now = datetime(2026, 10, 26, 12, 15, tzinfo=TZ)
    record_activity(act, "u1", now)
    record_activity(act, "u1", now)
    assert act["u1"]["2026-10-26T12"] == 2

    # a key 8 days old is pruned
    old_dt = now - timedelta(days=8)
    old_key = old_dt.astimezone(TZ).strftime("%Y-%m-%dT%H")
    act["u1"][old_key] = 5
    prune_activity(act, now)
    assert old_key not in act["u1"]
    assert act["u1"]["2026-10-26T12"] == 2


def test_read_nbt_and_last_death():
    buf = bytearray()
    buf += b"\x0a"  # TAG_Compound root
    buf += struct.pack(">H", 0)  # root name ""

    # String tag
    buf += b"\x08" + struct.pack(">H", 4) + b"name" + struct.pack(">H", 5) + b"value"
    # Int tag
    buf += b"\x03" + struct.pack(">H", 3) + b"num" + struct.pack(">i", 42)
    # List of Strings
    buf += b"\x09" + struct.pack(">H", 4) + b"list" + b"\x08" + struct.pack(">i", 2)
    buf += struct.pack(">H", 1) + b"a" + struct.pack(">H", 1) + b"b"

    # LastDeathLocation compound
    buf += b"\x0a" + struct.pack(">H", 17) + b"LastDeathLocation"
    buf += b"\x08" + struct.pack(">H", 9) + b"dimension" + struct.pack(">H", 20) + b"minecraft:the_nether"
    buf += b"\x0b" + struct.pack(">H", 3) + b"pos" + struct.pack(">i", 3) + struct.pack(">3i", 1, 64, -5)
    buf += b"\x00"  # TAG_End LastDeathLocation

    buf += b"\x00"  # TAG_End root
    data = gzip.compress(buf)

    parsed = read_nbt(data)
    assert parsed["name"] == "value"
    assert parsed["num"] == 42
    assert parsed["list"] == ["a", "b"]
    assert parsed["LastDeathLocation"] == {
        "dimension": "minecraft:the_nether",
        "pos": [1, 64, -5],
    }

    ld = last_death(parsed)
    assert ld == {"world": "minecraft_the_nether", "x": 1, "y": 64, "z": -5}

    assert last_death({"name": "value"}) is None
    assert last_death({}) is None
    assert last_death(None) is None


def test_grave_layer_and_add_layer():
    players = [
        {
            "name": "<b>Alice</b>",
            "lastDeath": {"world": "minecraft_overworld", "x": 10, "y": 64, "z": 20},
        },
        {
            "name": "Bob",
            "lastDeath": {"world": "minecraft_the_nether", "x": 0, "y": 64, "z": 0},
        },
    ]
    layer = grave_layer(players, "minecraft_overworld", 1000)
    assert layer is not None
    assert layer["id"] == "mc-site-graves"
    assert layer["name"] == "Gräber"
    assert layer["order"] == 50
    assert layer["z_index"] == 50
    assert layer["control"] is True
    assert layer["hide"] is False
    assert layer["timestamp"] == 1000
    assert len(layer["markers"]) == 1

    marker = layer["markers"][0]
    assert marker["type"] == "icon"
    assert marker["point"] == {"x": 10, "z": 20}
    assert marker["size"] == {"x": 16, "z": 16}
    assert marker["anchor"] == {"x": 8, "z": 8}
    assert marker["tooltip_anchor"] == {"x": 0, "z": -8}
    assert marker["icon"] == "grave"
    assert marker["tooltip"] == "Letzter Tod von &lt;b&gt;Alice&lt;/b&gt;"

    # Nether layer has Bob
    nether_layer = grave_layer(players, "minecraft_the_nether", 1000)
    assert nether_layer is not None
    assert len(nether_layer["markers"]) == 1

    # End layer has no players -> None
    assert grave_layer(players, "minecraft_the_end", 1000) is None

    # add_layer replaces an old mc-site-graves layer and keeps squaremap's own layers
    old_markers = [
        {"id": "squaremap_spawn", "name": "Spawn"},
        {"id": "mc-site-graves", "name": "Old graves"},
    ]
    updated = add_layer(old_markers, layer)
    assert len(updated) == 2
    assert updated[0] == {"id": "squaremap_spawn", "name": "Spawn"}
    assert updated[1]["id"] == "mc-site-graves"
    assert updated[1]["timestamp"] == 1000

    # If layer is None, removes old mc-site-graves and keeps squaremap layers
    cleaned = add_layer(old_markers, None)
    assert len(cleaned) == 1
    assert cleaned[0] == {"id": "squaremap_spawn", "name": "Spawn"}


if __name__ == "__main__":
    test_path_name()
    test_derive()
    test_advancement_events()
    test_death_text()
    test_date_lines()
    test_log_events()
    test_new_log_lines()
    test_merge_events()
    test_update_meta()
    test_advancement_list()
    test_advancement_done()
    test_firsts()
    test_record_history_and_daily_hours()
    test_record_activity_and_prune()
    test_read_nbt_and_last_death()
    test_grave_layer_and_add_layer()
    print("OK")
