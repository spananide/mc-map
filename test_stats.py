from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from stats import (
    FOODS,
    TZ,
    advancement_events,
    date_lines,
    death_patterns,
    death_text,
    derive,
    event,
    log_events,
    merge_events,
    new_log_lines,
    path_name,
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
    print("OK")
