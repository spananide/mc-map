import gzip
import html
import json
import os
import re
import struct
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, reset_tzpath

try:
    TZ = ZoneInfo("Europe/Berlin")
except Exception:
    for _p in [
        r"C:\Program Files\Git\mingw64\share\zoneinfo",
        r"C:\Program Files\Git\usr\share\zoneinfo",
    ]:
        if os.path.exists(_p):
            reset_tzpath([_p])
            break
    try:
        TZ = ZoneInfo("Europe/Berlin")
    except Exception:
        TZ = timezone(timedelta(hours=1))

FOODS: list[str] = [
    "apple", "golden_apple", "enchanted_golden_apple", "bread", "beef", "cooked_beef",
    "porkchop", "cooked_porkchop", "chicken", "cooked_chicken", "mutton", "cooked_mutton",
    "rabbit", "cooked_rabbit", "cod", "cooked_cod", "salmon", "cooked_salmon",
    "tropical_fish", "pufferfish", "potato", "baked_potato", "poisonous_potato",
    "carrot", "golden_carrot", "beetroot", "beetroot_soup", "mushroom_stew",
    "rabbit_stew", "suspicious_stew", "melon_slice", "sweet_berries", "glow_berries",
    "chorus_fruit", "cookie", "pumpkin_pie", "dried_kelp", "honey_bottle",
    "rotten_flesh", "spider_eye"
]

CAT_ORDER: list[str] = ["story", "nether", "end", "adventure", "husbandry"]
CAT_PRIORITY: dict[str, int] = {cat: i for i, cat in enumerate(CAT_ORDER)}

LINE_RE = re.compile(r"^\[(\d\d):(\d\d):(\d\d)\] \[([^\]]+)\]: (.*)$")


def path_name(name: str) -> str:
    return name.lstrip(".").lower()


def _cat(stats: dict, name: str) -> dict:
    return stats.get(f"minecraft:{name}", stats.get(name, {}))


def _norm(d: dict) -> dict:
    return {k.removeprefix("minecraft:"): v for k, v in d.items()}


def _de_name(raw_id: str, de: dict) -> str:
    if f"block.minecraft.{raw_id}" in de:
        return de[f"block.minecraft.{raw_id}"]
    if f"item.minecraft.{raw_id}" in de:
        return de[f"item.minecraft.{raw_id}"]
    if f"entity.minecraft.{raw_id}" in de:
        return de[f"entity.minecraft.{raw_id}"]
    return raw_id


def derive(stats: dict, de: dict) -> dict:
    custom = _norm(_cat(stats, "custom"))
    mined = _norm(_cat(stats, "mined"))
    used = _norm(_cat(stats, "used"))
    killed = _norm(_cat(stats, "killed"))
    killed_by = _norm(_cat(stats, "killed_by"))
    crafted = _norm(_cat(stats, "crafted"))

    playtime_h = round(custom.get("play_time", 0) / 20 / 3600, 2)
    diamonds = mined.get("diamond_ore", 0) + mined.get("deepslate_diamond_ore", 0)
    deaths = custom.get("deaths", 0)
    total_mined = sum(mined.values())
    mob_kills = custom.get("mob_kills", 0)

    distance_cm = sum(v for k, v in custom.items() if k.endswith("_one_cm") and k != "fall_one_cm")
    distance_km = round(distance_cm / 100000, 2)

    totems = used.get("totem_of_undying", 0)
    damage_hearts = round(custom.get("damage_dealt", 0) / 20, 2)
    meals = sum(used.get(f, 0) for f in FOODS) + custom.get("eat_cake_slice", 0)

    placed = sum(v for k, v in used.items() if f"block.minecraft.{k}" in de)
    jumps = custom.get("jump", 0)
    animals_bred = custom.get("animals_bred", 0)
    fish_caught = custom.get("fish_caught", 0)
    trades = custom.get("traded_with_villager", 0)
    chests_opened = custom.get("open_chest", 0)
    sleep = custom.get("sleep_in_bed", 0)
    enchants = custom.get("enchant_item", 0)
    damage_taken_hearts = round(custom.get("damage_taken", 0) / 20, 2)
    total_crafted = sum(crafted.values())
    fall_km = round(custom.get("fall_one_cm", 0) / 100000, 2)

    main = {
        "playtime_h": playtime_h,
        "diamonds": diamonds,
        "deaths": deaths,
        "mined": total_mined,
        "mob_kills": mob_kills,
        "distance_km": distance_km,
        "totems": totems,
        "damage_hearts": damage_hearts,
        "meals": meals,
    }

    more = {
        "placed": placed,
        "jumps": jumps,
        "animals_bred": animals_bred,
        "fish_caught": fish_caught,
        "trades": trades,
        "chests_opened": chests_opened,
        "damage_taken_hearts": damage_taken_hearts,
        "sleep": sleep,
        "crafted": total_crafted,
        "fall_km": fall_km,
        "enchants": enchants,
    }

    fav_mined = [[_de_name(k, de), v] for k, v in sorted(mined.items(), key=lambda x: x[1], reverse=True)[:10]]
    fav_placed = [
        [_de_name(k, de), v]
        for k, v in sorted(
            ((k, v) for k, v in used.items() if f"block.minecraft.{k}" in de),
            key=lambda x: x[1],
            reverse=True,
        )[:10]
    ]
    fav_killed = [[_de_name(k, de), v] for k, v in sorted(killed.items(), key=lambda x: x[1], reverse=True)[:10]]
    fav_killed_by = [[_de_name(k, de), v] for k, v in sorted(killed_by.items(), key=lambda x: x[1], reverse=True)[:10]]

    fav = {
        "mined": fav_mined,
        "placed": fav_placed,
        "killed": fav_killed,
        "killed_by": fav_killed_by,
    }

    return {"main": main, "more": more, "fav": fav}


def event(t: datetime, type_: str, player: str, text: str) -> dict:
    t_iso = t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {
        "t": t_iso,
        "type": type_,
        "player": player,
        "text": text,
        "key": f"{type_}|{player}|{text}|{t_iso}",
    }


def advancement_events(adv: dict, player: str, de: dict) -> list[dict]:
    events = []
    for k, v in adv.items():
        if not isinstance(v, dict) or not v.get("done"):
            continue
        path = k.removeprefix("minecraft:")
        if path.endswith("/root"):  # tab roots are granted silently, the game never announces them
            continue
        title_key = f"advancements.{path.replace('/', '.')}.title"
        if title_key in de:
            title = de[title_key]
            text = f"{{p}} hat den Fortschritt [{title}] erzielt"
            criteria = v.get("criteria", {})
            times = []
            for c_val in criteria.values():
                try:
                    times.append(datetime.strptime(c_val, "%Y-%m-%d %H:%M:%S %z"))
                except (ValueError, TypeError):
                    pass
            if times:
                latest_t = max(times)
                events.append(event(latest_t, "advancement", player, text))
    events.sort(key=lambda e: e["t"], reverse=True)
    return events


def advancement_list(de: dict) -> list[dict]:
    items = []
    for k, title in de.items():
        if not (k.startswith("advancements.") and k.endswith(".title")):
            continue
        inner = k[len("advancements.") : -len(".title")]
        parts = inner.split(".", 1)
        if len(parts) == 2:
            cat, name = parts
            if name == "root":
                continue
            desc = de.get(f"advancements.{cat}.{name}.description", "")
            items.append({
                "key": f"{cat}/{name}",
                "title": title,
                "description": desc,
            })

    def sort_key(item: dict):
        cat = item["key"].split("/", 1)[0]
        if cat in CAT_PRIORITY:
            return (0, CAT_PRIORITY[cat], item["key"])
        return (1, cat, item["key"])

    items.sort(key=sort_key)
    return items


def advancement_done(adv: dict) -> list[list]:
    done_items = []
    for k, v in adv.items():
        if not isinstance(v, dict) or not v.get("done"):
            continue
        key = k.removeprefix("minecraft:")
        if key.startswith("recipes/") or key.startswith("recipe/"):
            continue
        if key.endswith("/root") or key == "root":
            continue

        criteria = v.get("criteria", {})
        if not isinstance(criteria, dict):
            continue

        times = []
        for c_val in criteria.values():
            if not isinstance(c_val, str):
                continue
            try:
                times.append(datetime.strptime(c_val, "%Y-%m-%d %H:%M:%S %z"))
                continue
            except (ValueError, TypeError):
                pass
            try:
                times.append(datetime.fromisoformat(c_val))
                continue
            except (ValueError, TypeError):
                pass

        if times:
            latest_t = max(times)
            t_iso = latest_t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            done_items.append([key, t_iso])

    done_items.sort(key=lambda x: (x[1], x[0]))
    return done_items


def firsts(players: list[dict], titles: dict[str, str]) -> list[dict]:
    best = {}  # key -> (t, player_name)
    for p in players:
        p_name = p.get("name", "")
        adv_info = p.get("adv", {})
        done_list = adv_info.get("done", []) if isinstance(adv_info, dict) else []
        for item in done_list:
            if not isinstance(item, (list, tuple)) or len(item) < 2:
                continue
            key, t = item[0], item[1]
            if key not in best:
                best[key] = (t, p_name)
            else:
                cur_t, cur_p = best[key]
                if t < cur_t or (t == cur_t and p_name < cur_p):
                    best[key] = (t, p_name)

    res = []
    for key, (t, p_name) in best.items():
        res.append({
            "key": key,
            "title": titles.get(key, key),
            "player": p_name,
            "t": t,
        })
    res.sort(key=lambda x: x["key"])
    res.sort(key=lambda x: x["t"], reverse=True)
    return res


def record_history(hist: dict, day: str, players: list[dict]) -> dict:
    if day not in hist:
        hist[day] = {}
    for p in players:
        uuid = p.get("uuid")
        if uuid:
            hist[day][uuid] = p.get("main", {}).get("playtime_h", 0.0)

    try:
        day_dt = datetime.strptime(day, "%Y-%m-%d").date()
        cutoff = day_dt - timedelta(days=60)
        for d_str in list(hist.keys()):
            try:
                d_dt = datetime.strptime(d_str, "%Y-%m-%d").date()
                if d_dt < cutoff:
                    del hist[d_str]
            except ValueError:
                pass
    except ValueError:
        pass
    return hist


def daily_hours(hist: dict, days: list[str], uuid: str) -> list[float]:
    if not days:
        return []

    earlier_days = [d for d in hist if d < days[0] and uuid in hist[d]]
    if earlier_days:
        last_val = hist[max(earlier_days)][uuid]
    else:
        last_val = 0.0

    result = []
    for day in days:
        if day in hist and uuid in hist[day]:
            val = hist[day][uuid]
            gained = max(0.0, val - last_val)
            last_val = val
            result.append(round(gained, 2))
        else:
            result.append(0.0)
    return result


def record_activity(act: dict, uuid: str, now: datetime) -> dict:
    hour_key = now.astimezone(TZ).strftime("%Y-%m-%dT%H")
    if uuid not in act:
        act[uuid] = {}
    act[uuid][hour_key] = act[uuid].get(hour_key, 0) + 1
    return act


def prune_activity(act: dict, now: datetime) -> dict:
    now_tz = now.astimezone(TZ)
    cutoff = now_tz - timedelta(days=7)
    for uuid, hours in list(act.items()):
        if not isinstance(hours, dict):
            continue
        for k in list(hours.keys()):
            try:
                k_dt = datetime.strptime(k, "%Y-%m-%dT%H").replace(tzinfo=TZ)
                if k_dt < cutoff:
                    del hours[k]
            except ValueError:
                pass
    return act


def read_nbt(data: bytes) -> dict:
    if data.startswith(b"\x1f\x8b"):
        data = gzip.decompress(data)

    pos = 0

    def read_bytes(n: int) -> bytes:
        nonlocal pos
        res = data[pos : pos + n]
        if len(res) < n:
            raise ValueError("Unexpected EOF in NBT")
        pos += n
        return res

    def read_string() -> str:
        length = struct.unpack(">H", read_bytes(2))[0]
        raw = read_bytes(length)
        return raw.decode("utf-8", errors="replace")

    def read_payload(tag_type: int):
        if tag_type == 1:
            return struct.unpack(">b", read_bytes(1))[0]
        elif tag_type == 2:
            return struct.unpack(">h", read_bytes(2))[0]
        elif tag_type == 3:
            return struct.unpack(">i", read_bytes(4))[0]
        elif tag_type == 4:
            return struct.unpack(">q", read_bytes(8))[0]
        elif tag_type == 5:
            return struct.unpack(">f", read_bytes(4))[0]
        elif tag_type == 6:
            return struct.unpack(">d", read_bytes(8))[0]
        elif tag_type == 7:
            count = struct.unpack(">i", read_bytes(4))[0]
            if count <= 0:
                return []
            return list(struct.unpack(f">{count}b", read_bytes(count)))
        elif tag_type == 8:
            return read_string()
        elif tag_type == 9:
            elem_type = struct.unpack(">b", read_bytes(1))[0]
            count = struct.unpack(">i", read_bytes(4))[0]
            if count <= 0:
                return []
            return [read_payload(elem_type) for _ in range(count)]
        elif tag_type == 10:
            res = {}
            while True:
                item_tag = struct.unpack(">b", read_bytes(1))[0]
                if item_tag == 0:
                    break
                name = read_string()
                val = read_payload(item_tag)
                res[name] = val
            return res
        elif tag_type == 11:
            count = struct.unpack(">i", read_bytes(4))[0]
            if count <= 0:
                return []
            return list(struct.unpack(f">{count}i", read_bytes(count * 4)))
        elif tag_type == 12:
            count = struct.unpack(">i", read_bytes(4))[0]
            if count <= 0:
                return []
            return list(struct.unpack(f">{count}q", read_bytes(count * 8)))
        else:
            raise ValueError(f"Unknown NBT tag type {tag_type}")

    if not data:
        return {}
    root_type = struct.unpack(">b", read_bytes(1))[0]
    if root_type == 0:
        return {}
    if root_type != 10:
        raise ValueError(f"Expected root compound (10), got {root_type}")
    _root_name = read_string()
    return read_payload(10)


def last_death(nbt: dict | None) -> dict | None:
    if not isinstance(nbt, dict):
        return None
    loc = nbt.get("LastDeathLocation")
    if not isinstance(loc, dict):
        return None
    dim = loc.get("dimension")
    pos = loc.get("pos")
    if not isinstance(dim, str) or not isinstance(pos, (list, tuple)) or len(pos) < 3:
        return None
    world = dim.replace(":", "_")
    return {
        "world": world,
        "x": int(pos[0]),
        "y": int(pos[1]),
        "z": int(pos[2]),
    }


def grave_layer(players: list[dict], world: str, now_ms: int) -> dict | None:
    markers = []
    for p in players:
        ld = p.get("lastDeath")
        if isinstance(ld, dict) and ld.get("world") == world:
            name = p.get("name", "")
            markers.append({
                "type": "icon",
                "point": {"x": ld["x"], "z": ld["z"]},
                "size": {"x": 16, "z": 16},
                "anchor": {"x": 8, "z": 8},
                "tooltip_anchor": {"x": 0, "z": -8},
                "icon": "grave",
                "tooltip": "Letzter Tod von " + html.escape(name),
            })
    if not markers:
        return None
    return {
        "id": "mc-site-graves",
        "name": "Gräber",
        "order": 50,
        "z_index": 50,
        "control": True,
        "hide": False,
        "timestamp": now_ms,
        "markers": markers,
    }


def add_layer(markers_list: list[dict], layer: dict | None) -> list[dict]:
    res = [l for l in markers_list if isinstance(l, dict) and l.get("id") != "mc-site-graves"]
    if layer is not None:
        res.append(layer)
    return res


def death_patterns(en: dict) -> list[tuple[str, re.Pattern]]:
    templates = []
    for k, tmpl in en.items():
        if k.startswith("death.") and "%1$s" in tmpl:
            templates.append((k, tmpl))
    templates.sort(key=lambda x: len(x[1]), reverse=True)

    result = []
    for k, tmpl in templates:
        parts = re.split(r"(%\d\$s)", tmpl)
        pat_parts = []
        for part in parts:
            if part == "%1$s":
                pat_parts.append(r"(?P<p1>.+?)")
            elif part == "%2$s":
                pat_parts.append(r"(?P<p2>.+?)")
            elif part == "%3$s":
                pat_parts.append(r"(?P<p3>.+?)")
            elif part:
                pat_parts.append(re.escape(part))
        pattern = re.compile("^" + "".join(pat_parts) + "$")
        result.append((k, pattern))
    return result


def death_text(message: str, players: set[str], patterns, en: dict, de: dict) -> tuple[str, str] | None:
    en_entity_to_de = {
        en_val: de[k]
        for k, en_val in en.items()
        if k.startswith("entity.minecraft.") and k in de
    }

    for key, pattern in patterns:
        m = pattern.fullmatch(message)
        if not m:
            continue
        groups = m.groupdict()
        p1 = groups.get("p1")
        if p1 not in players:
            continue

        p2 = groups.get("p2")
        p3 = groups.get("p3")

        if p2 is not None:
            if p2 in players:
                pass
            elif p2 in en_entity_to_de:
                p2 = en_entity_to_de[p2]

        de_template = de.get(key)
        if not de_template:
            continue

        text = de_template.replace("%1$s", "{p}")
        if p2 is not None:
            text = text.replace("%2$s", p2)
        if p3 is not None:
            text = text.replace("%3$s", p3)
        return (p1, text)

    return None


def date_lines(lines: list[str], now: datetime) -> list[tuple[datetime, str, str]]:
    parsed = []
    for line in lines:
        m = LINE_RE.match(line)
        if m:
            h, m_min, s, thread, msg = int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4), m.group(5)
            parsed.append((time(h, m_min, s), thread, msg))

    if not parsed:
        return []

    now_tz = now.astimezone(TZ)
    current_date = now_tz.date()
    if parsed[-1][0] > now_tz.time():
        current_date -= timedelta(days=1)

    results = []
    prev_time = None
    for t_val, thread, msg in reversed(parsed):
        if prev_time is not None and t_val > prev_time:
            current_date -= timedelta(days=1)
        prev_time = t_val
        dt = datetime(current_date.year, current_date.month, current_date.day, t_val.hour, t_val.minute, t_val.second, tzinfo=TZ)
        results.append((dt, thread, msg))

    results.reverse()
    return results


def log_events(dated, players: set[str], patterns, en: dict, de: dict) -> tuple[list[dict], dict[str, list[datetime]]]:
    events = []
    seen = {p: [] for p in players}
    for dt, thread, msg in dated:
        if thread != "Server thread/INFO":
            continue
        msg = msg.removeprefix("System chat: ")  # Paper 26.x prefixes broadcast messages
        if msg.endswith(" joined the game"):
            p_name = msg.removesuffix(" joined the game")
            if p_name in players:
                seen.setdefault(p_name, []).append(dt)
        elif msg.endswith(" left the game"):
            p_name = msg.removesuffix(" left the game")
            if p_name in players:
                seen.setdefault(p_name, []).append(dt)
        else:
            d_info = death_text(msg, players, patterns, en, de)
            if d_info is not None:
                p, text = d_info
                events.append(event(dt, "death", p, text))
    return events, seen


def new_log_lines(lines: list[str], state: dict) -> tuple[list[str], dict]:
    fp = "\n".join(lines[:3])
    if state and state.get("fingerprint") == fp and "lines" in state:
        new_lines = lines[state["lines"]:]
    else:
        new_lines = lines
    new_state = {"fingerprint": fp, "lines": len(lines)}
    return new_lines, new_state


def merge_events(old: list[dict], new: list[dict], limit: int = 300) -> list[dict]:
    by_key = {}
    for ev in old:
        by_key[ev["key"]] = ev
    for ev in new:
        by_key[ev["key"]] = ev
    sorted_events = sorted(by_key.values(), key=lambda e: e["t"], reverse=True)
    return sorted_events[:limit]


def update_meta(meta: dict, uuid: str, times: list[datetime]) -> None:
    time_strs = [t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") for t in times]
    if uuid in meta:
        existing = meta[uuid]
        if "firstSeen" in existing and existing["firstSeen"]:
            time_strs.append(existing["firstSeen"])
        if "lastSeen" in existing and existing["lastSeen"]:
            time_strs.append(existing["lastSeen"])
    if time_strs:
        meta[uuid] = {
            "firstSeen": min(time_strs),
            "lastSeen": max(time_strs),
        }


def main():
    from sync import api

    now = datetime.now(TZ)

    # 1. Load lang files and previous state files
    lang_dir = "lang"
    de = {}
    en = {}
    de_path = os.path.join(lang_dir, "de.json")
    en_path = os.path.join(lang_dir, "en.json")
    if os.path.exists(de_path):
        with open(de_path, encoding="utf-8") as f:
            de = json.load(f)
    if os.path.exists(en_path):
        with open(en_path, encoding="utf-8") as f:
            en = json.load(f)
    patterns = death_patterns(en)

    adv_list = advancement_list(de)
    titles_dict = {item["key"]: item["title"] for item in adv_list}
    adv_keys = {item["key"] for item in adv_list}

    def load_json(path, default):
        if os.path.exists(path):
            try:
                with open(path, encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return default
        return default

    status_state = load_json("state/status.json", {"updated": "", "online": False, "max": 0, "motd": "", "players": []})
    stats_state = load_json("state/stats.json", {"updated": "", "players": [], "firsts": []})
    events_state = load_json("state/events.json", [])
    meta_state = load_json("state/meta.json", {})
    log_state = load_json("state/log.json", {"fingerprint": "", "lines": 0})
    history_state = load_json("state/history.json", {})
    activity_state = load_json("state/activity.json", {})

    # 2. Names: api("files/data/usercache.json/") -> {uuid: name}
    names = {p["uuid"]: p["name"] for p in stats_state.get("players", []) if "uuid" in p and "name" in p}
    try:
        usercache_raw = api("files/data/usercache.json/")
        usercache = json.loads(usercache_raw.decode("utf-8"))
        if isinstance(usercache, list):
            for entry in usercache:
                if "uuid" in entry and "name" in entry:
                    names[entry["uuid"]] = entry["name"]
        elif isinstance(usercache, dict):
            names.update(usercache)
    except Exception as e:
        print(f"warning: names: {e}")

    # 3. Status: api("") -> data
    status_data = status_state
    online_names = set()
    online_uuids = set()
    try:
        status_raw = api("")
        status_json = json.loads(status_raw.decode("utf-8"))
        s_data = status_json.get("data", status_json)
        status_code = s_data.get("status", 0)
        p_info = s_data.get("players", {})
        max_players = p_info.get("max", 0)
        motd = s_data.get("motd", "")
        p_list = p_info.get("list", [])
        name_to_uuid = {v: k for k, v in names.items()}
        players_status = []
        for p_name in p_list:
            p_uuid = name_to_uuid.get(p_name, "")
            players_status.append({"name": p_name, "uuid": p_uuid})
            online_names.add(p_name)
            if p_uuid:
                online_uuids.add(p_uuid)
        status_data = {
            "updated": now.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "online": status_code == 1,
            "max": max_players,
            "motd": motd,
            "players": players_status,
        }
    except Exception as e:
        print(f"warning: status: {e}")

    for u in online_uuids:
        record_activity(activity_state, u, now)
    prune_activity(activity_state, now)

    # 4. Stats + advancements + player data (.dat)
    player_stats_map = {}
    advancement_events_list = []
    stats_success = False
    try:
        stats_dir_raw = api("files/info/world/players/stats/")
        stats_dir_json = json.loads(stats_dir_raw.decode("utf-8"))
        stats_children = stats_dir_json.get("data", {}).get("children") or []
        for child in stats_children:
            name = child.get("name", "")
            if not name.endswith(".json"):
                continue
            uuid = name[:-5]
            try:
                stat_content = api(f"files/data/world/players/stats/{uuid}.json/")
                stat_file = json.loads(stat_content.decode("utf-8"))
                s_obj = stat_file.get("stats", {})
            except Exception:
                s_obj = {}

            try:
                adv_content = api(f"files/data/world/players/advancements/{uuid}.json/")
                adv_file = json.loads(adv_content.decode("utf-8"))
            except Exception:
                adv_file = {}

            dat_bytes = None
            local_dat = os.path.join("world", "players", "data", f"{uuid}.dat")
            if os.path.exists(local_dat):
                try:
                    with open(local_dat, "rb") as f:
                        dat_bytes = f.read()
                except Exception:
                    pass
            if dat_bytes is None:
                try:
                    dat_bytes = api(f"files/data/world/players/data/{uuid}.dat/")
                except Exception:
                    dat_bytes = None

            ld = None
            if dat_bytes:
                try:
                    ld = last_death(read_nbt(dat_bytes))
                except Exception:
                    ld = None

            p_name = names.get(uuid, uuid)
            derived = derive(s_obj, de)
            raw_done = advancement_done(adv_file)
            filtered_done = [entry for entry in raw_done if entry[0] in adv_keys]

            player_stats_map[uuid] = {
                "name": p_name,
                "uuid": uuid,
                "main": derived["main"],
                "more": derived["more"],
                "fav": derived["fav"],
                "adv": {"done": filtered_done},
                "lastDeath": ld,
            }
            advancement_events_list.extend(advancement_events(adv_file, p_name, de))
        stats_success = True
    except Exception as e:
        print(f"warning: stats: {e}")

    if not stats_success:
        for p in stats_state.get("players", []):
            if "uuid" in p:
                player_stats_map[p["uuid"]] = p

    # 5. Log
    death_events_list = []
    seen = {}
    try:
        log_raw = api("logs/")
        log_json = json.loads(log_raw.decode("utf-8"))
        log_content = log_json.get("data", {}).get("content", "")
        lines = log_content.splitlines()
        new_lines, log_state = new_log_lines(lines, log_state)
        dated = date_lines(new_lines, now)
        known_names = set(names.values()) | {p["name"] for p in player_stats_map.values()}
        death_events_list, seen = log_events(dated, known_names, patterns, en, de)
    except Exception as e:
        print(f"warning: log: {e}")

    # 6. Meta
    for uuid, p_data in player_stats_map.items():
        p_name = p_data["name"]
        is_online = (uuid in online_uuids) or (p_name in online_names)
        times = list(seen.get(p_name, []))
        if is_online or uuid not in meta_state:
            times.append(now)
        update_meta(meta_state, uuid, times)

    # 7. stats.json
    players_out = []
    for uuid, p_data in player_stats_map.items():
        p_name = p_data["name"]
        is_online = (uuid in online_uuids) or (p_name in online_names)
        meta_info = meta_state.get(uuid, {})
        players_out.append({
            "name": p_name,
            "uuid": uuid,
            "firstSeen": meta_info.get("firstSeen", ""),
            "lastSeen": meta_info.get("lastSeen", ""),
            "online": is_online,
            "main": p_data["main"],
            "more": p_data["more"],
            "fav": p_data["fav"],
            "adv": p_data.get("adv", {"done": []}),
            "activity": activity_state.get(uuid, {}),
            "lastDeath": p_data.get("lastDeath"),
        })
    players_out.sort(key=lambda p: p["main"]["playtime_h"], reverse=True)

    today_berlin = now.astimezone(TZ).strftime("%Y-%m-%d")
    record_history(history_state, today_berlin, players_out)
    today_date = now.astimezone(TZ).date()
    days14 = [(today_date - timedelta(days=13 - i)).strftime("%Y-%m-%d") for i in range(14)]
    history_players = [
        {
            "uuid": p["uuid"],
            "name": p["name"],
            "hours": daily_hours(history_state, days14, p["uuid"]),
        }
        for p in players_out
    ]
    history_data = {
        "days": days14,
        "players": history_players,
    }

    firsts_data = firsts(players_out, titles_dict)

    if stats_success or not stats_state.get("players"):
        stats_data = {
            "updated": now.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "players": players_out,
            "firsts": firsts_data,
        }
    else:
        stats_data = stats_state
        if "firsts" not in stats_data:
            stats_data["firsts"] = firsts(stats_data.get("players", []), titles_dict)

    # 8. Events
    events_data = merge_events(events_state, advancement_events_list + death_events_list, limit=300)

    # 9. Write all state files, copy to site/data/
    os.makedirs("state", exist_ok=True)
    os.makedirs("site/data", exist_ok=True)
    os.makedirs("site/assets", exist_ok=True)

    with open("state/status.json", "w", encoding="utf-8") as f:
        json.dump(status_data, f, ensure_ascii=False, indent=2)
    with open("state/stats.json", "w", encoding="utf-8") as f:
        json.dump(stats_data, f, ensure_ascii=False, indent=2)
    with open("state/events.json", "w", encoding="utf-8") as f:
        json.dump(events_data, f, ensure_ascii=False, indent=2)
    with open("state/meta.json", "w", encoding="utf-8") as f:
        json.dump(meta_state, f, ensure_ascii=False, indent=2)
    with open("state/log.json", "w", encoding="utf-8") as f:
        json.dump(log_state, f, ensure_ascii=False, indent=2)
    with open("state/history.json", "w", encoding="utf-8") as f:
        json.dump(history_state, f, ensure_ascii=False, indent=2)
    with open("state/activity.json", "w", encoding="utf-8") as f:
        json.dump(activity_state, f, ensure_ascii=False, indent=2)

    with open("site/data/status.json", "w", encoding="utf-8") as f:
        json.dump(status_data, f, ensure_ascii=False, indent=2)
    with open("site/data/stats.json", "w", encoding="utf-8") as f:
        json.dump(stats_data, f, ensure_ascii=False, indent=2)
    with open("site/data/events.json", "w", encoding="utf-8") as f:
        json.dump(events_data, f, ensure_ascii=False, indent=2)
    with open("site/data/advancements.json", "w", encoding="utf-8") as f:
        json.dump(adv_list, f, ensure_ascii=False, indent=2)
    with open("site/data/history.json", "w", encoding="utf-8") as f:
        json.dump(history_data, f, ensure_ascii=False, indent=2)

    # 10. Player pages
    if os.path.exists("web/spieler.html"):
        with open("web/spieler.html", encoding="utf-8") as f:
            template = f.read()
        for p in stats_data.get("players", []):
            p_dir = os.path.join("site", "spieler", path_name(p["name"]))
            os.makedirs(p_dir, exist_ok=True)
            with open(os.path.join(p_dir, "index.html"), "w", encoding="utf-8") as f:
                f.write(template)

    # 11. Server icon
    try:
        icon_data = api("files/data/server-icon.png/")
        with open("site/assets/server-icon.png", "wb") as f:
            f.write(icon_data)
    except Exception as e:
        print(f"warning: icon: {e}")

    # 12. Map graves
    tiles_dir = os.path.join("site", "map", "tiles")
    if os.path.exists(tiles_dir):
        now_ms = int(now.timestamp() * 1000)
        for world_name in os.listdir(tiles_dir):
            world_path = os.path.join(tiles_dir, world_name)
            if os.path.isdir(world_path):
                markers_path = os.path.join(world_path, "markers.json")
                if os.path.exists(markers_path):
                    try:
                        with open(markers_path, "r", encoding="utf-8") as f:
                            existing_markers = json.load(f)
                        if not isinstance(existing_markers, list):
                            existing_markers = []
                    except Exception:
                        existing_markers = []
                    gl = grave_layer(players_out, world_name, now_ms)
                    updated_markers = add_layer(existing_markers, gl)
                    try:
                        with open(markers_path, "w", encoding="utf-8") as f:
                            json.dump(updated_markers, f, ensure_ascii=False, indent=2)
                    except Exception as e:
                        print(f"warning: markers for {world_name}: {e}")


if __name__ == "__main__":
    main()
