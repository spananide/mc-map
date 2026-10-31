import copy
import gzip
import json
import os
import struct
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from stats import (
    ACTIVITY_DAYS,
    BADGES,
    FOODS,
    MERGES,
    TZ,
    add_layer,
    advancement_done,
    advancement_events,
    advancement_list,
    badges,
    daily_hours,
    date_lines,
    death_patterns,
    death_text,
    derive,
    drop_layer,
    event,
    firsts,
    grave_layer,
    heatmap,
    last_death,
    load_orte,
    load_timeline,
    log_events,
    merge_events,
    merge_records,
    merge_state,
    new_log_lines,
    orte_layer,
    path_name,
    prune_activity,
    read_nbt,
    record_activity,
    record_history,
    records,
    rename_events,
    timeline,
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

    players3 = [
        {"uuid": "u1", "main": {"playtime_h": 3.5}},
        {"uuid": "u2", "main": {"playtime_h": 2.0}},
    ]
    record_history(hist, day3, players3)
    assert hist[day3]["u1"] == 3.5
    assert hist[day3]["u2"] == 2.0

    daily = daily_hours(hist, [day1, day2, day3], "u1")
    assert daily == [0.0, 0.0, 2.5]

    daily_u2 = daily_hours(hist, [day1, day2, day3], "u2")
    assert daily_u2 == [0.0, 0.0, 2.0]

    # a day older than 60 days is dropped
    old_day = "2026-05-01"
    hist[old_day] = {"u1": 0.5}
    record_history(hist, day3, players3)
    assert old_day not in hist
    assert day1 in hist


def test_record_activity_and_prune():
    assert ACTIVITY_DAYS == 60
    act = {}
    now = datetime(2026, 10, 26, 12, 15, tzinfo=TZ)
    record_activity(act, "u1", now)
    record_activity(act, "u1", now)
    assert act["u1"]["2026-10-26T12"] == 2

    # an 8-day-old key is kept under 60-day retention
    dt_8 = now - timedelta(days=8)
    key_8 = dt_8.astimezone(TZ).strftime("%Y-%m-%dT%H")
    act["u1"][key_8] = 5

    # a 59-day-old key is kept
    dt_59 = now - timedelta(days=59)
    key_59 = dt_59.astimezone(TZ).strftime("%Y-%m-%dT%H")
    act["u1"][key_59] = 3

    # a 61-day-old key is pruned
    dt_61 = now - timedelta(days=61)
    key_61 = dt_61.astimezone(TZ).strftime("%Y-%m-%dT%H")
    act["u1"][key_61] = 7

    prune_activity(act, now)
    assert key_61 not in act["u1"]
    assert act["u1"][key_8] == 5
    assert act["u1"][key_59] == 3
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


def test_merge_accounts():
    src_uuid, dst_uuid, src_name, dst_name = MERGES[0]

    # rename_events: events [{src death A}, {dst adv B}, {src adv B with the same text and t as dst's}]
    ev_src_death = {
        "t": "2024-01-01T10:00:00Z",
        "type": "death",
        "player": src_name,
        "text": f"{src_name} fell from a high place",
        "key": f"death|{src_name}|{src_name} fell from a high place|2024-01-01T10:00:00Z",
    }
    ev_dst_adv = {
        "t": "2024-01-02T12:00:00Z",
        "type": "advancement",
        "player": dst_name,
        "text": "{p} made progress",
        "key": f"advancement|{dst_name}|{{p}} made progress|2024-01-02T12:00:00Z",
    }
    ev_src_adv = {
        "t": "2024-01-02T12:00:00Z",
        "type": "advancement",
        "player": src_name,
        "text": "{p} made progress",
        "key": f"advancement|{src_name}|{{p}} made progress|2024-01-02T12:00:00Z",
    }
    events_in = [ev_src_death, ev_dst_adv, ev_src_adv]
    c_death = copy.deepcopy(ev_src_death)
    c_dst_adv = copy.deepcopy(ev_dst_adv)
    c_src_adv = copy.deepcopy(ev_src_adv)

    out_events = rename_events(events_in, src_name, dst_name)

    # src death renamed (player and key)
    assert out_events[0]["player"] == dst_name
    assert out_events[0]["key"] == f"death|{dst_name}|{src_name} fell from a high place|2024-01-01T10:00:00Z"
    assert out_events[0]["text"] == ev_src_death["text"]
    assert out_events[0]["t"] == ev_src_death["t"]

    # the duplicate collapses to one, order kept
    assert len(out_events) == 2
    assert out_events[1]["player"] == dst_name
    assert out_events[1]["key"] == ev_dst_adv["key"]
    assert out_events[1]["text"] == ev_dst_adv["text"]
    assert out_events[1]["t"] == ev_dst_adv["t"]

    # input dicts unchanged
    assert ev_src_death == c_death
    assert ev_dst_adv == c_dst_adv
    assert ev_src_adv == c_src_adv

    # merge_state:
    # meta src firstSeen earlier than dst's and lastSeen earlier -> dst firstSeen = src's, lastSeen = dst's, src gone
    meta = {
        src_uuid: {"firstSeen": "2024-01-01T00:00:00Z", "lastSeen": "2024-01-05T00:00:00Z"},
        dst_uuid: {"firstSeen": "2024-01-03T00:00:00Z", "lastSeen": "2024-01-10T00:00:00Z"},
    }
    # hist two days, src in both -> summed and rounded, src gone
    hist = {
        "2024-01-10": {src_uuid: 1.234, dst_uuid: 2.1},
        "2024-01-11": {src_uuid: 3.5, dst_uuid: 1.1},
    }
    # act overlapping hour summed, new hour added, src gone
    act = {
        src_uuid: {"2024-01-10T12": 2, "2024-01-10T13": 5},
        dst_uuid: {"2024-01-10T12": 3, "2024-01-10T14": 1},
    }

    merge_state(meta, hist, act, src_uuid, dst_uuid)

    assert src_uuid not in meta
    assert meta[dst_uuid]["firstSeen"] == "2024-01-01T00:00:00Z"
    assert meta[dst_uuid]["lastSeen"] == "2024-01-10T00:00:00Z"

    assert src_uuid not in hist["2024-01-10"]
    assert src_uuid not in hist["2024-01-11"]
    assert hist["2024-01-10"][dst_uuid] == 3.33
    assert hist["2024-01-11"][dst_uuid] == 4.6

    assert src_uuid not in act
    assert act[dst_uuid]["2024-01-10T12"] == 5
    assert act[dst_uuid]["2024-01-10T13"] == 5
    assert act[dst_uuid]["2024-01-10T14"] == 1

    # second call leaves all three dicts equal to a deep copy taken after the first call
    meta_snap = copy.deepcopy(meta)
    hist_snap = copy.deepcopy(hist)
    act_snap = copy.deepcopy(act)

    merge_state(meta, hist, act, src_uuid, dst_uuid)
    assert meta == meta_snap
    assert hist == hist_snap
    assert act == act_snap

    # meta with only src -> dst gets src's values
    meta_src_only = {
        src_uuid: {"firstSeen": "2024-02-01T00:00:00Z", "lastSeen": "2024-02-05T00:00:00Z"}
    }
    merge_state(meta_src_only, {}, {}, src_uuid, dst_uuid)
    assert src_uuid not in meta_src_only
    assert meta_src_only[dst_uuid] == {
        "firstSeen": "2024-02-01T00:00:00Z",
        "lastSeen": "2024-02-05T00:00:00Z",
    }


def test_heatmap():
    # Empty case
    res_empty = heatmap({})
    assert res_empty["samples"] == 0
    assert res_empty["days"] == 0
    assert res_empty["peak"] is None
    assert len(res_empty["grid"]) == 7
    for row in res_empty["grid"]:
        assert len(row) == 24
        assert row == [0] * 24

    # Non-dict / malformed keys ignored
    bad_act = {
        "u1": "not a dict",
        "u2": None,
        "u3": {
            "invalid_key": 5,
            "2026-99-99T99": 5,
            123: 5,
            "2026-10-26T10": "invalid_sample",
            "2026-10-26T11": True,
            "2026-10-26T12": 0,
            "2026-10-26T13": -2,
        },
    }
    res_bad = heatmap(bad_act)
    assert res_bad["samples"] == 0
    assert res_bad["days"] == 0
    assert res_bad["peak"] is None

    # Normal case:
    # 2026-10-26 is Monday (weekday 0)
    # 2026-10-27 is Tuesday (weekday 1)
    act = {
        "u1": {
            "2026-10-26T14": 3,
            "2026-10-26T15": 2,
        },
        "u2": {
            "2026-10-26T14": 4,
            "2026-10-27T10": 1,
        },
    }
    res = heatmap(act)
    assert res["samples"] == 10
    assert res["days"] == 2
    assert res["grid"][0][14] == 7
    assert res["grid"][0][15] == 2
    assert res["grid"][1][10] == 1
    assert res["peak"] == {"weekday": 0, "hour": 14}

    # Ties: first wins on ties (weekday 0, hour 5 vs weekday 1, hour 2)
    act_tie = {
        "u1": {
            "2026-10-26T05": 5,
            "2026-10-27T02": 5,
        }
    }
    res_tie = heatmap(act_tie)
    assert res_tie["peak"] == {"weekday": 0, "hour": 5}


def test_records():
    players = [
        {"name": "Alice", "uuid": "u1"},
        {"name": "Bob", "uuid": "u2"},
        {"name": "Charlie", "uuid": "u3"},
    ]
    history = {
        "2026-10-26": {"u1": 2.0, "u2": 1.0},
        "2026-10-27": {"u1": 5.0, "u2": 6.5},
        "2026-10-28": {"u1": 11.0, "u2": 8.0},
    }

    events = [
        {"type": "death", "player": "Alice", "t": "2026-10-26T10:00:00Z"},
        {"type": "death", "player": "Alice", "t": "2026-10-26T12:00:00Z"},
        {"type": "death", "player": "Bob", "t": "2026-10-26T15:00:00Z"},
        {"type": "advancement", "player": "Charlie", "t": "2026-10-27T10:00:00Z"},
        {"type": "advancement", "player": "Charlie", "t": "2026-10-27T11:00:00Z"},
        {"type": "advancement", "player": "Charlie", "t": "2026-10-27T12:00:00Z"},
    ]

    rec = records(history, events, players)
    assert rec["longest_day"] == {
        "id": "longest_day",
        "title": "Längster Spieltag",
        "player": "Alice",
        "uuid": "u1",
        "value": 6.0,
        "unit": "h",
        "day": "2026-10-28",
    }
    assert rec["deaths_day"] == {
        "id": "deaths_day",
        "title": "Meiste Tode an einem Tag",
        "player": "Alice",
        "uuid": "u1",
        "value": 2,
        "unit": "",
        "day": "2026-10-26",
    }
    assert rec["adv_day"] == {
        "id": "adv_day",
        "title": "Meiste Fortschritte an einem Tag",
        "player": "Charlie",
        "uuid": "u3",
        "value": 3,
        "unit": "",
        "day": "2026-10-27",
    }

    # Unknown player in events -> uuid is ""
    events_unknown = [
        {"type": "death", "player": "UnknownPlayer", "t": "2026-10-26T10:00:00Z"}
    ]
    rec_unk = records({}, events_unknown, players)
    assert rec_unk["deaths_day"]["uuid"] == ""
    assert "longest_day" not in rec_unk
    assert "adv_day" not in rec_unk

    # Tie breaking:
    # 1. Earliest day wins on tie
    hist_tie_day = {
        "2026-10-25": {"u1": 5.0},
        "2026-10-26": {"u1": 10.0},
        "2026-10-27": {"u1": 15.0},
    }
    rec_tie_day = records(hist_tie_day, [], players)
    assert rec_tie_day["longest_day"]["day"] == "2026-10-26"

    # 2. Player name alphabetical on tie of day & value
    hist_tie_name = {
        "2026-10-25": {"u1": 0.0, "u2": 0.0},
        "2026-10-26": {"u1": 5.0, "u2": 5.0},
    }
    rec_tie_name = records(hist_tie_name, [], players)
    assert rec_tie_name["longest_day"]["player"] == "Alice"

    # Value 0 not included
    assert records({}, [], players) == {}

    # merge_records: keeps higher value, old on tie, keeps unilateral ids
    old_records = {
        "longest_day": {"id": "longest_day", "value": 5.0, "player": "Alice"},
        "deaths_day": {"id": "deaths_day", "value": 10, "player": "Bob"},
    }
    new_records = {
        "longest_day": {"id": "longest_day", "value": 7.5, "player": "Charlie"},
        "deaths_day": {"id": "deaths_day", "value": 10, "player": "Alice"},
        "adv_day": {"id": "adv_day", "value": 4, "player": "Bob"},
    }
    merged = merge_records(old_records, new_records)
    assert merged["longest_day"]["value"] == 7.5
    assert merged["longest_day"]["player"] == "Charlie"
    assert merged["deaths_day"]["value"] == 10
    assert merged["deaths_day"]["player"] == "Bob"
    assert merged["adv_day"]["value"] == 4


def test_badges():
    # Empty / low stats -> no badges
    p_empty = {"main": {}, "more": {}}
    assert badges(p_empty) == []

    # Check each badge at threshold and below threshold
    # 1. diamond_fan: main.diamonds >= 100
    p1 = {"main": {"diamonds": 99}, "more": {}}
    assert badges(p1) == []
    p1["main"]["diamonds"] = 100
    assert [b["id"] for b in badges(p1)] == ["diamond_fan"]

    # 2. globetrotter: main.distance_km >= 100
    p2 = {"main": {"distance_km": 99.9}, "more": {}}
    assert badges(p2) == []
    p2["main"]["distance_km"] = 100.0
    assert [b["id"] for b in badges(p2)] == ["globetrotter"]

    # 3. graveyard: main.deaths >= 10
    p3 = {"main": {"deaths": 9}, "more": {}}
    assert badges(p3) == []
    p3["main"]["deaths"] = 10
    assert [b["id"] for b in badges(p3)] == ["graveyard"]

    # 4. demolition: main.mined >= 10000
    p4 = {"main": {"mined": 9999}, "more": {}}
    assert badges(p4) == []
    p4["main"]["mined"] = 10000
    assert [b["id"] for b in badges(p4)] == ["demolition"]

    # 5. monster_hunter: main.mob_kills >= 250
    p5 = {"main": {"mob_kills": 249}, "more": {}}
    assert badges(p5) == []
    p5["main"]["mob_kills"] = 250
    assert [b["id"] for b in badges(p5)] == ["monster_hunter"]

    # 6. marathon: main.playtime_h >= 24
    p6 = {"main": {"playtime_h": 23.9}, "more": {}}
    assert badges(p6) == []
    p6["main"]["playtime_h"] = 24.0
    assert [b["id"] for b in badges(p6)] == ["marathon"]

    # 7. undying: main.totems >= 1
    p7 = {"main": {"totems": 0}, "more": {}}
    assert badges(p7) == []
    p7["main"]["totems"] = 1
    assert [b["id"] for b in badges(p7)] == ["undying"]

    # 8. fisher: more.fish_caught >= 50
    p8 = {"main": {}, "more": {"fish_caught": 49}}
    assert badges(p8) == []
    p8["more"]["fish_caught"] = 50
    assert [b["id"] for b in badges(p8)] == ["fisher"]

    # 9. breeder: more.animals_bred >= 25
    p9 = {"main": {}, "more": {"animals_bred": 24}}
    assert badges(p9) == []
    p9["more"]["animals_bred"] = 25
    assert [b["id"] for b in badges(p9)] == ["breeder"]

    # 10. trader: more.trades >= 25
    p10 = {"main": {}, "more": {"trades": 24}}
    assert badges(p10) == []
    p10["more"]["trades"] = 25
    assert [b["id"] for b in badges(p10)] == ["trader"]

    # All badges earned together -> exact table order and format
    p_all = {
        "main": {
            "diamonds": 150,
            "distance_km": 200,
            "deaths": 12,
            "mined": 20000,
            "mob_kills": 300,
            "playtime_h": 50,
            "totems": 2,
        },
        "more": {
            "fish_caught": 60,
            "animals_bred": 30,
            "trades": 40,
        },
    }
    all_b = badges(p_all)
    assert len(all_b) == 10
    expected_order = [
        "diamond_fan",
        "globetrotter",
        "graveyard",
        "demolition",
        "monster_hunter",
        "marathon",
        "undying",
        "fisher",
        "breeder",
        "trader",
    ]
    assert [b["id"] for b in all_b] == expected_order
    for b in all_b:
        assert set(b.keys()) == {"id", "title", "desc"}


def test_load_orte():
    import tempfile

    # Seed file load
    seed = load_orte("data/orte.json")
    assert len(seed) == 1
    assert seed[0] == {
        "id": "lager",
        "name": "Lager",
        "dim": "overworld",
        "x": 574,
        "y": 85,
        "z": 534,
        "note": "Kisten-Lager",
    }

    # Missing file
    assert load_orte("nonexistent/path/orte.json") == []

    # Invalid file / validation tests
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as f:
        json.dump([
            {"id": "o1", "name": "Base", "dim": "overworld", "x": 10, "y": 64, "z": 20},
            {"id": "o2", "name": "Portal", "dim": "the_nether", "x": 0, "y": 70, "z": 0, "note": "Nether hub"},
            {"id": "o1", "name": "Duplicate Base", "dim": "overworld", "x": 11, "y": 64, "z": 20},
            {"id": "", "name": "Empty ID", "dim": "overworld", "x": 0, "y": 0, "z": 0},
            {"id": "bad_name1", "name": "", "dim": "overworld", "x": 0, "y": 0, "z": 0},
            {"id": "bad_name2", "name": "x" * 41, "dim": "overworld", "x": 0, "y": 0, "z": 0},
            {"id": "bad_dim", "name": "Bad Dim", "dim": "moon", "x": 0, "y": 0, "z": 0},
            {"id": "bad_x_bool", "name": "Bool X", "dim": "overworld", "x": True, "y": 64, "z": 0},
            {"id": "bad_y_str", "name": "Str Y", "dim": "overworld", "x": 0, "y": "64", "z": 0},
            {"id": "bad_note", "name": "Long Note", "dim": "the_end", "x": 0, "y": 64, "z": 0, "note": "a" * 201},
        ], f)
        temp_path = f.name

    try:
        loaded = load_orte(temp_path)
        assert len(loaded) == 2
        assert loaded[0] == {"id": "o1", "name": "Base", "dim": "overworld", "x": 10, "y": 64, "z": 20, "note": ""}
        assert loaded[1] == {"id": "o2", "name": "Portal", "dim": "the_nether", "x": 0, "y": 70, "z": 0, "note": "Nether hub"}
    finally:
        os.remove(temp_path)


def test_orte_layer_and_layers():
    orte = [
        {"id": "o1", "name": "Overworld Base", "dim": "overworld", "x": 100, "y": 64, "z": 200, "note": "Main base"},
        {"id": "o2", "name": "Mine", "dim": "overworld", "x": 150, "y": 12, "z": 250, "note": ""},
        {"id": "o3", "name": "Nether Fortress", "dim": "the_nether", "x": 50, "y": 60, "z": -100, "note": "Blaze spawn"},
    ]

    layer_ow = orte_layer(orte, "minecraft_overworld", 5000)
    assert layer_ow is not None
    assert layer_ow["id"] == "mc-site-orte"
    assert layer_ow["name"] == "Orte"
    assert layer_ow["order"] == 40
    assert layer_ow["z_index"] == 40
    assert layer_ow["control"] is True
    assert layer_ow["hide"] is False
    assert layer_ow["timestamp"] == 5000
    assert len(layer_ow["markers"]) == 2

    m1 = layer_ow["markers"][0]
    assert m1["type"] == "circle"
    assert m1["center"] == {"x": 100, "z": 200}
    assert m1["radius"] == 6
    assert m1["stroke"] is True
    assert m1["color"] == "#55ff55"
    assert m1["weight"] == 3
    assert m1["fill"] is True
    assert m1["fillColor"] == "#55ff55"
    assert m1["fillOpacity"] == 0.4
    assert m1["tooltip"] == "Overworld Base - Main base"

    m2 = layer_ow["markers"][1]
    assert m2["tooltip"] == "Mine"

    # End world has no markers -> None
    assert orte_layer(orte, "minecraft_the_end", 5000) is None

    # add_layer and drop_layer with multiple layers
    graves_layer = {"id": "mc-site-graves", "name": "Gräber", "markers": []}
    other_layer = {"id": "squaremap_spawn", "name": "Spawn", "markers": []}
    markers = [other_layer, graves_layer]

    # add orte layer: keeps squaremap and graves layers untouched
    updated = add_layer(markers, layer_ow, layer_id="mc-site-orte")
    assert len(updated) == 3
    assert updated[0]["id"] == "squaremap_spawn"
    assert updated[1]["id"] == "mc-site-graves"
    assert updated[2]["id"] == "mc-site-orte"

    # drop_layer
    dropped = drop_layer(updated, "mc-site-orte")
    assert len(dropped) == 2
    assert [l["id"] for l in dropped] == ["squaremap_spawn", "mc-site-graves"]

    # add_layer with None removes target layer
    removed_orte = add_layer(updated, None, layer_id="mc-site-orte")
    assert [l["id"] for l in removed_orte] == ["squaremap_spawn", "mc-site-graves"]

    # graves default untouched: add_layer(markers, None) removes mc-site-graves
    removed_graves = add_layer(updated, None)
    assert [l["id"] for l in removed_graves] == ["squaremap_spawn", "mc-site-orte"]


def test_timeline():
    import tempfile

    # Load seed file
    seed = load_timeline("data/timeline.json")
    assert len(seed) == 4
    assert seed[0]["date"] == "2026-10-26"
    assert seed[0]["title"] == "Neue Welt"

    # Validation
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", delete=False) as f:
        json.dump([
            {"date": "2026-10-26", "title": "Valid Event", "text": "Valid text"},
            {"date": "2026-10-26", "title": "No text"},
            {"date": "bad_date", "title": "Bad Date", "text": ""},
            {"date": "2026-10-26", "title": "", "text": ""},
            {"date": "2026-10-26", "title": "t" * 81, "text": ""},
            {"date": "2026-10-26", "title": "Long text", "text": "a" * 301},
        ], f)
        temp_path = f.name

    try:
        loaded = load_timeline(temp_path)
        assert len(loaded) == 2
        assert loaded[0] == {"date": "2026-10-26", "title": "Valid Event", "text": "Valid text"}
        assert loaded[1] == {"date": "2026-10-26", "title": "No text", "text": ""}
    finally:
        os.remove(temp_path)

    manual = [
        {"date": "2026-10-26", "title": "B-Manual", "text": "text1"},
        {"date": "2026-10-26", "title": "A-Manual", "text": "text2"},
        {"date": "2026-10-28", "title": "Later Manual", "text": "text3"},
    ]
    players = [
        {"name": "Bob", "firstSeen": "2026-10-26T14:00:00Z"},
        {"name": "Alice", "firstSeen": "2026-10-26T10:00:00Z"},
        {"name": "Charlie", "firstSeen": ""},
        {"name": "David"},
        {"name": "Eve", "firstSeen": "2026-10-27T10:00:00Z"},
    ]

    tl = timeline(manual, players)
    assert len(tl) == 6
    assert tl[0] == {"date": "2026-10-28", "title": "Later Manual", "text": "text3", "auto": False}
    assert tl[1] == {"date": "2026-10-27", "title": "Eve ist der Gemeinschaft beigetreten", "text": "", "auto": True}
    assert tl[2] == {"date": "2026-10-26", "title": "A-Manual", "text": "text2", "auto": False}
    assert tl[3] == {"date": "2026-10-26", "title": "B-Manual", "text": "text1", "auto": False}
    assert tl[4] == {"date": "2026-10-26", "title": "Alice ist der Gemeinschaft beigetreten", "text": "", "auto": True}
    assert tl[5] == {"date": "2026-10-26", "title": "Bob ist der Gemeinschaft beigetreten", "text": "", "auto": True}


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
    test_merge_accounts()
    test_heatmap()
    test_records()
    test_badges()
    test_load_orte()
    test_orte_layer_and_layers()
    test_timeline()
    print("OK")
