# Server Website Implementation Plan

> **For agentic workers:** this user's rule: every implementation task is one Gemini run via the `gemini` skill (Claude plans and reviews, Gemini types). Tasks 1-3 are one Gemini run, tasks 4-5 a second one. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `mc-map` repo into the website of the Minecraft server "Die Friedliche Strullergemeinschaft" with a start page, the map at `/map/`, a stats overview and one page per player.

**Architecture:** GitHub Actions (dispatched every 10 min by a Cloudflare Worker) runs `sync.py` (map mirror, now into `site/map/`) and the new `stats.py` (stats, events, status from the exaroton API into `state/` and `site/data/`), copies the static `web/` source into `site/` and deploys `site/` to Pages. The pages are plain HTML + one ES module that renders from the JSON files.

**Tech Stack:** Python 3 stdlib only (`json`, `re`, `urllib`, `zoneinfo`, `datetime`, `shutil`), vanilla HTML/CSS/JS (ES module, no build, no libraries), Node only for `test_web.mjs`, Cloudflare Workers (wrangler) for `worker/`.

**Spec:** `docs/superpowers/specs/2026-10-26-server-website-design.md` (read it; it is the source of truth for stat definitions, pages and look).

## Global Constraints

- No new dependencies: Python stdlib only, no npm packages, no CDN scripts, no Google Fonts.
- German UI copy. Game names only from `lang/de.json` (Mojang 26.3 `de_de.json`), never hand-translated.
- Never insert data into the DOM with `innerHTML`; build nodes with `createElement` + `textContent` (player names, MOTD and custom mob names are untrusted).
- All page links, asset and data URLs relative via `document.body.dataset.root` (`""` start, `"../"` stats, `"../../"` player pages).
- Only third-party URL in the browser: `https://mc-heads.net/avatar/<uuid>/<size>` and `https://mc-heads.net/body/<uuid>/<size>`.
- Footer on every page: "Stand: vor X Minuten" from `status.updated`, links to `https://spanani.de/impressum/` and `https://spanani.de/datenschutz/`.
- Dark only. Phone width < 640px: one column, 16px side gutters, no horizontal scroll.
- The exaroton token is only ever read from the environment (`EXAROTON_TOKEN`, `EXAROTON_SERVER`).

---

### Task 1: Language files

**Files:**
- Create: `lang/fetch.py`, generated `lang/de.json`, `lang/en.json`

**Interfaces:**
- Produces: `lang/de.json` with all keys starting `advancements.` (only `.title` keys), `block.minecraft.`, `item.minecraft.`, `entity.minecraft.`, `death.`; `lang/en.json` with keys starting `death.` and `entity.minecraft.`. Both UTF-8, `ensure_ascii=False`, sorted keys.

- [ ] **Step 1:** Write `lang/fetch.py`: read `https://piston-meta.mojang.com/mc/game/version_manifest_v2.json`, take version `26.3`, load its version JSON. German: asset index -> object `minecraft/lang/de_de.json` -> `https://resources.download.minecraft.net/<hash[:2]>/<hash>`. English: download `downloads.client.url` (client jar, ~39 MB) into memory, read `assets/minecraft/lang/en_us.json` with `zipfile`. Trim both by the prefixes above and write them next to the script.
- [ ] **Step 2:** Run `python lang/fetch.py`.
- [ ] **Step 3:** Verify: `python -c "import json;d=json.load(open('lang/de.json',encoding='utf-8'));e=json.load(open('lang/en.json',encoding='utf-8'));assert d['advancements.adventure.kill_a_mob.title']=='Monsterjäger';assert d['death.attack.mob']=='%1\$s wurde von %2\$s erschlagen';assert e['entity.minecraft.skeleton']=='Skeleton';assert 'block.minecraft.stone' in d and 'death.attack.fall' in e;print('lang OK')"`

### Task 2: Pure functions in `stats.py` (test first)

**Files:**
- Create: `test_stats.py`, `stats.py` (pure part)

**Interfaces (exact names, all in `stats.py`):**
```python
TZ = ZoneInfo("Europe/Berlin")
FOODS: list[str]                      # the spec's food list, ids without namespace
def path_name(name: str) -> str       # lower case, leading dots stripped
def derive(stats: dict, de: dict) -> dict
    # stats = the "stats" object of a vanilla stats file; returns {"main": {...}, "more": {...}, "fav": {...}}
    # keys and formulas exactly as in the spec table; floats rounded to 2 decimals;
    # fav lists are [[german_name, count], ...] top 10 by count desc; name lookup block., item., entity. in that order,
    # fallback: id without "minecraft:"
def event(t: datetime, type_: str, player: str, text: str) -> dict
    # {"t": UTC ISO "YYYY-MM-DDTHH:MM:SSZ", "type": type_, "player": player, "text": text, "key": f"{type_}|{player}|{text}|{t_iso}"}
def advancement_events(adv: dict, player: str, de: dict) -> list[dict]
    # text "{p} hat den Fortschritt [<title>] erzielt"; t = latest criterion time ("%Y-%m-%d %H:%M:%S %z")
def death_patterns(en: dict) -> list[tuple[str, re.Pattern]]
    # every death.* template containing "%1$s"; %1$s/%2$s/%3$s -> named groups p1/p2/p3 (non-greedy); longest template first
def death_text(message: str, players: set[str], patterns, en: dict, de: dict) -> tuple[str, str] | None
    # fullmatch; p1 must be in players; p2: player name kept, English entity name -> German via en/de entity.minecraft.*, else kept;
    # p3 kept as logged; returns (player, de[key] with %1$s -> "{p}", %2$s -> p2, %3$s -> p3)
def date_lines(lines: list[str], now: datetime) -> list[tuple[datetime, str, str]]
    # lines matching r"^\[(\d\d):(\d\d):(\d\d)\] \[([^\]]+)\]: (.*)$" -> (aware datetime in TZ, thread, message), oldest first;
    # dates assigned walking backwards from now, one day back whenever the time increases going backwards
def log_events(dated, players: set[str], patterns, en: dict, de: dict) -> tuple[list[dict], dict[str, list[datetime]]]
    # only thread "Server thread/INFO": deaths -> event(..., "death", ...); "<name> joined the game" / "<name> left the game"
    # for known players -> seen[name].append(dt)
def new_log_lines(lines: list[str], state: dict) -> tuple[list[str], dict]
    # fingerprint = "\n".join(lines[:3]); same fingerprint -> lines[state["lines"]:], else all lines;
    # new state {"fingerprint": fp, "lines": len(lines)}
def merge_events(old: list[dict], new: list[dict], limit: int = 300) -> list[dict]
    # dedupe by "key", sort by "t" desc, keep limit
def update_meta(meta: dict, uuid: str, times: list[datetime]) -> None
    # meta[uuid] = {"firstSeen": min, "lastSeen": max} as UTC ISO strings, merged with existing values
```
`stats.py` must import without `EXAROTON_*` env vars (all network code lives in `main()`, Task 3).

- [ ] **Step 1: Write `test_stats.py`** (plain asserts, `if __name__ == "__main__":` runs all `test_*` functions and prints `OK`). Cases:
  - `path_name(".BedrockGuy") == "bedrockguy"`, `path_name("spananii") == "spananii"`.
  - `derive`: stats = `{"minecraft:custom": {"minecraft:play_time": 72000, "minecraft:deaths": 2, "minecraft:mob_kills": 5, "minecraft:walk_one_cm": 150000, "minecraft:sprint_one_cm": 50000, "minecraft:fall_one_cm": 1000, "minecraft:damage_dealt": 400, "minecraft:damage_taken": 100, "minecraft:jump": 30, "minecraft:eat_cake_slice": 1}, "minecraft:mined": {"minecraft:stone": 10, "minecraft:diamond_ore": 2, "minecraft:deepslate_diamond_ore": 1}, "minecraft:used": {"minecraft:totem_of_undying": 1, "minecraft:bread": 3, "minecraft:stone": 7, "minecraft:diamond_pickaxe": 9}, "minecraft:killed": {"minecraft:zombie": 4}, "minecraft:killed_by": {"minecraft:skeleton": 1}, "minecraft:crafted": {"minecraft:stick": 8}}`, de = `{"block.minecraft.stone": "Stein", "block.minecraft.diamond_ore": "Diamanterz", "item.minecraft.bread": "Brot", "entity.minecraft.zombie": "Zombie", "entity.minecraft.skeleton": "Skelett"}`. Expect main `playtime_h 1.0, diamonds 3, deaths 2, mined 13, mob_kills 5, distance_km 2.0, totems 1, damage_hearts 20.0, meals 4`; more `placed 7, jumps 30, damage_taken_hearts 5.0, crafted 8, fall_km 0.01, animals_bred 0`; fav `mined[0] == ["Stein", 10]`, `["deepslate_diamond_ore", 1] in mined`, `placed == [["Stein", 7]]`, `killed == [["Zombie", 4]]`, `killed_by == [["Skelett", 1]]`.
  - `advancement_events`: adv with `minecraft:adventure/kill_a_mob` (done, criterion `"2026-10-26 15:55:11 +0100"`), `minecraft:recipes/misc/stick` (done), `minecraft:story/mine_stone` (not done), `"DataVersion": 4000`; de with `advancements.adventure.kill_a_mob.title: "Monsterjäger"` -> exactly one event, `t == "2026-10-26T14:55:11Z"`, `text == "{p} hat den Fortschritt [Monsterjäger] erzielt"`.
  - `death_text` with en `{"death.attack.mob": "%1$s was slain by %2$s", "death.attack.player.item": "%1$s was slain by %2$s using %3$s", "death.fell.accident.generic": "%1$s fell from a high place", "death.attack.generic": "%1$s died", "entity.minecraft.skeleton": "Skeleton"}` and de `{"death.attack.mob": "%1$s wurde von %2$s erschlagen", "death.attack.player.item": "%1$s wurde von %2$s mit %3$s erschlagen", "death.fell.accident.generic": "%1$s fiel aus zu großer Höhe", "death.attack.generic": "%1$s starb", "entity.minecraft.skeleton": "Skelett"}`, players `{"spananii", "Bob"}`:
    `"spananii fell from a high place"` -> `("spananii", "{p} fiel aus zu großer Höhe")`;
    `"spananii was slain by Skeleton"` -> `("spananii", "{p} wurde von Skelett erschlagen")`;
    `"spananii was slain by Bob using [Diamond Sword]"` -> `("spananii", "{p} wurde von Bob mit [Diamond Sword] erschlagen")`;
    `"Notch died"` -> `None`; `"spananii joined the game"` -> `None`.
  - `date_lines`: now = `datetime(2026, 10, 27, 0, 5, tzinfo=TZ)`, lines `["[23:58:00] [Server thread/INFO]: a", "java.lang.Exception: x", "[00:01:00] [Server thread/INFO]: b"]` -> two tuples, first dated 2026-10-26 23:58 with message `"a"`, second 2026-10-27 00:01 with `"b"`, thread `"Server thread/INFO"`.
  - `log_events`: dated lines for `spananii joined the game`, `spananii fell from a high place`, a chat line `<spananii> spananii died` on thread `"Async Chat Thread - #0/INFO"`, `spananii left the game` -> exactly one death event; `len(seen["spananii"]) == 2`.
  - `new_log_lines`: 5 lines + `{}` -> all 5 and state `{"fingerprint": first 3 joined by "\n", "lines": 5}`; same 5 + 2 more with that state -> the 2 new; 5 different lines with that state -> all 5.
  - `merge_events`: 299 old events with distinct keys + 3 new (one has an old key) -> length 300, keys unique, sorted by `t` desc.
  - `update_meta`: `{}` + `[t2, t1]` -> firstSeen t1, lastSeen t2; then `[t0]` with t0 < t1 -> firstSeen t0, lastSeen still t2.
- [ ] **Step 2:** `python test_stats.py` fails (functions missing).
- [ ] **Step 3:** Implement the pure functions in `stats.py`.
- [ ] **Step 4:** `python test_stats.py` prints `OK`.

### Task 3: `stats.py` main, shared API helper in `sync.py`

**Files:**
- Modify: `sync.py` (add `api()`, make `get()` use it, wrap the run in `if __name__ == "__main__":`)
- Modify: `stats.py` (add `main()`)

**Interfaces:**
- Produces in `sync.py`: `def api(path: str) -> bytes` = GET `https://api.exaroton.com/v1/servers/{SERVER}/{path}` with the same headers and retry-on-429 as `get()`; `get(kind, path)` becomes `api(f"files/{kind}/{urllib.parse.quote(path)}/")`. Behaviour of `python sync.py` unchanged.
- `stats.py main()` (import `from sync import api` inside `main()`), paths relative to the repo root: reads `lang/`, `web/spieler.html`; writes `state/` and `site/`.

- [ ] **Step 1:** `main()` steps, each source in its own `try/except Exception` that prints `warning: <source>: <error>` and keeps the previous `state/` file:
  1. `now = datetime.now(TZ)`; load `state/status.json`, `stats.json`, `events.json`, `meta.json`, `log.json` (missing -> defaults).
  2. Names: `api("files/data/usercache.json/")` -> `{uuid: name}`.
  3. Status: `api("")` -> `data`; `{"updated": now UTC ISO, "online": status == 1, "max": players.max, "motd": motd, "players": [{"name", "uuid"}]}` (uuid via the names map, `""` if unknown).
  4. Stats + advancements: list `files/info/world/players/stats/`, for each `<uuid>.json` load it (`["stats"]`) and the matching `world/players/advancements/<uuid>.json` (missing -> `{}`); `derive()`; `advancement_events()` with the player name (fallback uuid).
  5. Log: `api("logs/")` -> `data.content.splitlines()`; `new_log_lines()` with `state/log.json`; `date_lines(new, now)`; `log_events()` with the known names.
  6. Meta: for each player `update_meta()` with their join/leave times, plus `now` when online now or when the uuid is new to `meta`.
  7. `stats.json`: `{"updated", "players": [{name, uuid, firstSeen, lastSeen, online, main, more, fav}]}` sorted by `main.playtime_h` desc.
  8. Events: `merge_events(old, advancement + death events)`.
  9. Write all state files (UTF-8, `ensure_ascii=False`), copy `status.json`, `stats.json`, `events.json` to `site/data/`.
  10. Player pages: for each player write `web/spieler.html` unchanged to `site/spieler/<path_name(name)>/index.html`.
  11. Server icon: `api("files/data/server-icon.png/")` -> `site/assets/server-icon.png`.
- [ ] **Step 2:** `python test_stats.py` still prints `OK`.
- [ ] **Step 3 (Claude, live check):** in a scratch copy of the repo: `EXAROTON_TOKEN=… EXAROTON_SERVER=CXVm6tP2BMCwrEgB python sync.py && python stats.py`, then check `site/data/stats.json` has player `spananii` with sane numbers, `site/spieler/spananii/index.html` exists, and a second run adds no duplicate events.
- [ ] **Step 4:** Commit `lang/ stats.py test_stats.py sync.py` ("Add stats builder: player stats, events and status from exaroton").

### Task 4: Frontend in `web/`

**Files:**
- Create: `web/index.html`, `web/stats/index.html`, `web/spieler.html`, `web/assets/style.css`, `web/assets/app.js`, `web/assets/bg.svg`, `test_web.mjs`
- Already placed by Claude: `web/assets/monocraft.ttf`, `web/assets/OFL.txt`

**Interfaces:**
- Consumes: `site/data/status.json`, `stats.json`, `events.json` exactly as in the spec ("Output files"); `{p}` in event text marks the player name, `[...]` marks a label.
- Produces in `web/assets/app.js` (ES module, named exports, DOM code only runs when `typeof document !== "undefined"`):
```js
export function relTime(iso, nowMs)   // "gerade eben" (<60 s), "vor 5 Min", "vor 3 Std", "vor 1 Tag", "vor 2 Tagen"
export function motdSpans(motd)       // [{text, color, bold, italic, underline, strike}] from § codes 0-9a-f, l-o, r; obfuscated (k) shown as plain text
export function rankOf(players, get, uuid)  // get = p => number; competition ranking, ties share a rank: {rank, of}
export function pathName(name)        // same rule as stats.py path_name
export function eventParts(text)      // [{type: "player"} | {type: "text", text} | {type: "label", text}]
export function fmt(n)                // de-DE, max 1 decimal: fmt(1234.56) === "1.234,6", fmt(3) === "3"
```
- Each HTML file: `<html lang="de">`, `<body data-root="…" data-page="start|stats|player">`, nav (stone buttons "Start", "Karte" -> `map/`, "Statistiken" -> `stats/`, all prefixed with root), `<main id="app">`, footer per Global Constraints, `<link rel="stylesheet" href="{root}assets/style.css">`, `<script type="module" src="{root}assets/app.js">`. Player template uses root `../../`.

- [ ] **Step 1: Write `test_web.mjs`** (node, `node:assert/strict`, imports `./web/assets/app.js`, prints `OK`):
  - `relTime("2026-10-26T12:00:00Z", Date.parse("2026-10-26T12:00:30Z")) === "gerade eben"`; +5 min `"vor 5 Min"`; +3 h `"vor 3 Std"`; +1 day `"vor 1 Tag"`; +2 days `"vor 2 Tagen"`.
  - `motdSpans("§7Die §cFriedliche")` deep-equals `[{text: "Die ", color: "#AAAAAA", bold: false, italic: false, underline: false, strike: false}, {text: "Friedliche", color: "#FF5555", …all false}]`; `motdSpans("§lA§rB")` -> first bold true, second bold false with color `"#FFFFFF"` (default).
  - `rankOf([{uuid:"a",v:5},{uuid:"b",v:9},{uuid:"c",v:5}], p => p.v, "b")` -> `{rank: 1, of: 3}`; for `"a"` and `"c"` -> `{rank: 2, of: 3}`.
  - `pathName(".Steve") === "steve"`.
  - `eventParts("{p} hat den Fortschritt [Monsterjäger] erzielt")` -> `[{type:"player"}, {type:"text", text:" hat den Fortschritt "}, {type:"label", text:"Monsterjäger"}, {type:"text", text:" erzielt"}]`.
  - `fmt(1234.56) === "1.234,6"`, `fmt(3) === "3"`.
- [ ] **Step 2:** `node test_web.mjs` fails.
- [ ] **Step 3:** Implement `app.js` helpers, then the three page renderers exactly as the spec's "Pages" section (start: server-list entry with `{root}assets/server-icon.png`, MOTD, `n/max`, signal bars; online heads; two big buttons; 8 events. stats: four counter tiles, "Wusstest du?" with "Noch einer", nine leaderboards in the spec's order and titles, 20 events, all players. player: body render, status lines, nine main values with "Platz X von N", "Noch mehr Zahlen", four "Lieblinge" lists, 20 events, unknown-player message). Missing data file -> "Noch keine Daten." Event toasts/chat lines as in the spec.
- [ ] **Step 4:** `style.css` per the spec's "Look" section: `@font-face` Monocraft from `monocraft.ttf` (`font-display: swap`), background `bg.svg` with `image-rendering: pixelated`, panels, slots, stone buttons, text shadow, focus outline, < 640px single column.
- [ ] **Step 5:** `bg.svg`: own 16x16 pixel pattern (rects, 4-6 dark browns between `#2b1d14` and `#4a3426`), `shape-rendering="crispEdges"`.
- [ ] **Step 6:** `node test_web.mjs` prints `OK`; `node --check web/assets/app.js` passes.

### Task 5: Pipeline and Worker

**Files:**
- Modify: `sync.py` (map output into `site/map`)
- Modify: `.github/workflows/pages.yml`
- Create: `worker/index.js`, `worker/wrangler.jsonc`

- [ ] **Step 1:** `sync.py`: every `"map"` output path becomes `site/map` (one constant `OUT = os.path.join("site", "map")`), including the two patches (`tiles/settings.json`, `index.html`) and the stale-file cleanup.
- [ ] **Step 2:** Workflow: cache `path` becomes the two lines `site/map` and `state`, `key: site-${{ github.run_id }}`, `restore-keys: site-`; steps after the cache: `python test_stats.py`, `node test_web.mjs`, `python sync.py` (env as now), `python stats.py` (same env), `cp -r web/. site/ && rm site/spieler.html`; upload `path: site`. Keep triggers (`cron: "4-59/10 * * * *"`, `workflow_dispatch`), permissions and concurrency.
- [ ] **Step 3:** `worker/wrangler.jsonc`: `{"name": "mc-tick", "main": "index.js", "compatibility_date": "2026-10-01", "triggers": {"crons": ["*/10 * * * *"]}}`. `worker/index.js`: `export default { async scheduled(event, env) { … } }` doing `POST https://api.github.com/repos/spananide/mc-map/actions/workflows/pages.yml/dispatches` with body `{"ref":"master"}` and headers `Authorization: Bearer ${env.GH_TOKEN}`, `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent: mc-tick`; throw on a non-2xx status with the response text.
- [ ] **Step 4:** `python test_stats.py && node test_web.mjs && node --check worker/index.js` pass.

### Task 6: Integration check (Claude)

- [ ] **Step 1:** In a scratch copy: run `sync.py`, `stats.py`, `cp -r web/. site/`, serve `site/` with `python -m http.server`, open `/`, `/stats/`, `/spieler/spananii/`, `/map/` with agent-browser at 1280x800 and 390x844; check numbers against the stats file, no console errors, no horizontal scroll, heads load.
- [ ] **Step 2:** Fix findings (one Gemini correction run, then by hand).
- [ ] **Step 3:** Commit web/, test_web.mjs, workflow, worker/, sync.py; push; `gh workflow run pages.yml`; check all pages on `https://spananide.github.io/mc-map/`.

### Task 7: Setup outside the repo

- [ ] **Step 1 (user):** Strato: subdomain `mc.spanani.de`, CNAME `spananide.github.io`.
- [ ] **Step 2 (Claude):** after DNS resolves: `gh api -X PUT repos/spananide/mc-map/pages -f cname=mc.spanani.de`; once the certificate exists `gh api -X PUT repos/spananide/mc-map/pages -F https_enforced=true`.
- [ ] **Step 3 (user, guided):** fine-grained token: repo `spananide/mc-map` only, "Actions: Read and write".
- [ ] **Step 4 (Claude):** `cd worker && wrangler deploy && wrangler secret put GH_TOKEN`; confirm a `workflow_dispatch` run appears within 10 minutes.
- [ ] **Step 5 (Claude, push only with the user's OK):** spanani.de `/datenschutz/`: section for `mc.spanani.de` (hosting by GitHub Pages, player heads from `mc-heads.net`) and both in the third-party list of section 6; changelog rule does not apply (no visible change on spanani.de itself).
- [ ] **Step 6:** Update the mc-map memory.
