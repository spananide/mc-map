# Extras: firsts, live status, advancements, history, compare, graves, backups

Date: 2026-10-26. Approved by the owner as a list ("rest los gehts"); details below are Claude's design. Builds on `2026-10-26-server-website-design.md` (read it first: data files, look, rules). Not in scope: whitelist (owner declined), Discord button (waits for the owner's bot).

Done on the server by hand already: game rule `players_sleeping_percentage 34`, `max-players=10`.

## Global rules (same as the first spec)

Python stdlib only, plain JS without packages, no `innerHTML` with data (build DOM nodes), German UI copy, game names only from `lang/de.json`, relative URLs via `data-root`, dark look from `style.css` (dark see-through panels `.panel`, slots `.slot`, rows `.leaderboard-row`, white text, `#aaaaaa` secondary). Every new piece of logic gets a pure function with a test case.

## Part A: data (`stats.py`, tests in `test_stats.py`)

### A1 Advancement list and per-player progress
- `advancement_list(de) -> list[dict]`: every key `advancements.<cat>.<name>.title` in `de` whose `<name>` is not `root`, as `{"key": "<cat>/<name>", "title": ..., "description": de.get("advancements.<cat>.<name>.description", "")}`; sorted by category order `story, nether, end, adventure, husbandry` (unknown categories after, alphabetically), then by key. Written to `site/data/advancements.json` every run.
- `advancement_done(adv) -> list[list]`: from a player's advancements file, `[[key, t_iso], ...]` for every done advancement that is not a recipe and not a root (key without `minecraft:`, t = latest criterion, UTC ISO `...Z`), sorted by t ascending.
- Per player in `stats.json`: `"adv": {"done": [[key, t_iso], ...]}` (only keys that are in the advancement list).

### A2 Firsts ("Wer war zuerst?")
- `firsts(players, titles) -> list[dict]`: `players` = list of `{"name", "adv": {"done": [...]}}`, `titles` = `{key: title}`. For each key the earliest time over all players; result `[{"key", "title", "player", "t"}]` sorted by `t` descending. Ties: alphabetically first name.
- Top-level `stats.json` field `"firsts"`.

### A3 Playtime history
- `state/history.json`: `{"YYYY-MM-DD": {uuid: playtime_h}}` (Berlin date). `record_history(hist, day, players)` sets `hist[day][uuid] = main.playtime_h` for every player and drops days older than 60 days before `day`.
- `daily_hours(hist, days, uuid) -> list[float]`: for each of `days` (ascending date strings) the playtime gained that day = value on that day minus the last value recorded on an earlier day (0 if none); a day without a record counts as 0; never negative; rounded to 2 decimals.
- `site/data/history.json`: `{"days": [14 dates ending today], "players": [{"uuid", "name", "hours": [14 floats]}]}`.

### A4 Online activity
- `state/activity.json`: `{uuid: {"YYYY-MM-DDTHH": samples}}`. `record_activity(act, uuid, now)` increments the Berlin hour key; `prune_activity(act, now)` drops keys older than 7 days. Called each run for every player online now.
- Per player in `stats.json`: `"activity": {hour_key: samples}` (last 7 days).

### A5 Last death and graves on the map
- `read_nbt(data: bytes) -> dict`: gunzip if it starts with `1f 8b`, then parse the root compound (tag ids 0-12: End, Byte, Short, Int, Long, Float, Double, ByteArray, String (u16 length + modified UTF-8, decode as UTF-8 with `errors="replace"`), List, Compound, IntArray, LongArray; big-endian). Return the root compound as a dict (lists as lists, arrays as lists of ints).
- `last_death(nbt) -> dict | None`: from `LastDeathLocation` = `{"dimension": "minecraft:overworld", "pos": [x, y, z]}` return `{"world": "minecraft_overworld", "x", "y", "z"}`; None if missing.
- In `main()`: read `world/players/data/<uuid>.dat` per player (missing -> None); per player in `stats.json`: `"lastDeath"`.
- `grave_layer(players, world, now_ms) -> dict | None`: icon markers for players whose `lastDeath.world == world`: `{"type": "icon", "point": {"x", "z"}, "size": {"x": 16, "z": 16}, "anchor": {"x": 8, "z": 8}, "tooltip_anchor": {"x": 0, "z": -8}, "icon": "grave", "tooltip": "Letzter Tod von " + html.escape(name)}`; layer `{"id": "mc-site-graves", "name": "Gräber", "order": 50, "z_index": 50, "control": true, "hide": false, "timestamp": now_ms, "markers": [...]}`; None when no markers.
- `add_layer(markers_list, layer) -> list`: removes any layer with id `mc-site-graves`, appends `layer` if not None.
- In `main()`: for every `site/map/tiles/<world>/markers.json` that exists, rewrite it with `add_layer(...)`.
- Icon file `web/map/images/icon/registered/grave.png` (16x16, drawn by Claude, already in the repo); the workflow's `cp -r web/. site/` puts it next to squaremap's own icons.

### A tests (`test_stats.py`, added cases)
- `advancement_list`: de with `story/root`, `story/mine_stone`, `adventure/kill_a_mob`, `husbandry/root` titles -> keys `["story/mine_stone", "adventure/kill_a_mob"]`, description from de or `""`.
- `advancement_done`: recipes and roots dropped, not-done dropped, times UTC.
- `firsts`: two players share a key, earlier one wins; tie -> alphabetical; sorted by t desc.
- `record_history` + `daily_hours`: records 1.0 on day1, 3.5 on day3 -> daily over [day1, day2, day3] = [1.0, 0, 2.5]; a day older than 60 days is dropped.
- `record_activity` + `prune_activity`: two runs in the same hour -> 2; a key 8 days old is pruned.
- `read_nbt` + `last_death`: build a gzipped NBT in the test with a tiny writer (root compound with a String, an Int, a List of Strings and `LastDeathLocation` compound with `dimension` String and `pos` IntArray) -> parsed values equal; `last_death` -> `{"world": "minecraft_the_nether", "x": 1, "y": 64, "z": -5}`; root without the field -> None.
- `grave_layer` / `add_layer`: two players, one in overworld -> one marker, tooltip escaped (`<b>` name -> `&lt;b&gt;`); `add_layer` replaces an old `mc-site-graves` layer and keeps squaremap's own layers.

## Part B: pages and Worker (`web/assets/app.js`, `worker/index.js`, tests in `test_web.mjs`, `test_worker.mjs`)

### B1 Live status
- Worker: `GET /status.json` -> `{"online": bool, "max": n, "players": [names], "motd": str}`, same headers and 5 s cache idea as `/players.json`. Refactor so both endpoints share one cached exaroton status fetch (`getStatus(env)`), the players endpoint keeps its behaviour.
- `app.js`: `export const LIVE_STATUS = "https://mc-tick.spanani.workers.dev/status.json"`. Start page: render from `data/status.json` as today, then fetch `LIVE_STATUS` and re-render the server entry and "Gerade online" (names -> uuid via `stats.json`; unknown uuid -> head by name); repeat every 30 s. Player page: online badge and "Gerade online"/"Zuletzt online" line from the live status when it answers. Any live error: keep the static data silently.

### B2 Player colors
- `export function colorSlots(players)`: map `uuid -> color` with the fixed order: sort by `firstSeen` ascending, then name; slots 1-8 get `#3987e5, #d95926, #199e70, #c98500, #d55181, #008300, #9085e9, #e66767` (validated for the dark surface); the 9th and later get `#8a8a8a` and are labeled "Andere" in charts. Color follows the player, never the rank.

### B3 "Spielzeit pro Tag" (stats page, after the leaderboards)
- SVG stacked bar chart from `data/history.json`, 14 days, one stack per day, segments in `colorSlots` order, 2px gap between segments (stroke in the panel color), 4px rounded top on the top segment only, bars ~60% of the slot width, y axis in hours with 3-4 recessive grid lines (`rgba(255,255,255,.12)`), axis text `#aaaaaa`, day labels like `Mo 26.`.
- Legend above the chart (swatch + name), text in white, never in the series color.
- Hover/focus per day column (hit target = full column height): tooltip with the date, each player's hours (`fmt`) and the day total. Keyboard: columns focusable (`tabindex="0"`), same tooltip on focus.
- `<details><summary>Als Tabelle</summary>` with the same numbers.
- No data or all zeros: "Noch keine Spielzeit aufgezeichnet."
- Pure helper `export function stackDays(history, slots)` -> `[{day, total, segments: [{uuid, name, hours, color}]}]` (zero segments dropped).

### B4 "Wer war zuerst?" (stats page)
- List from `stats.firsts`: advancement title as label (same green bracket label style as events), player head + linked name, relative time. Show 15, then a "Alle anzeigen" button reveals the rest.

### B5 Player page additions
- "Fortschritte": `X von Y` (Y = length of `data/advancements.json`) with a progress bar (fill `#80ff20`, Minecraft XP green, on a dark slot) and a `<details>` list per category title ("Minecraft", "Nether", "Das Ende", "Abenteuer", "Landwirtschaft"): done ones first with date, missing ones dimmed; description as the second line.
- "Letzter Tod": `x / y / z` and the dimension name (Oberwelt, Nether, Das Ende) plus a link "Auf der Karte zeigen" -> `{root}map/?world=<world>&zoom=3&x=<x>&z=<z>`. Missing: "Noch nie gestorben."
- "Online-Zeiten (letzte 7 Tage)": grid 7 rows (days, newest last) x 24 columns (hours), cell fill = the player's color with opacity `min(samples, 6) / 6` (0 -> empty slot look), hover/focus tooltip `Mo 26.10., 20-21 Uhr: ca. 40 Min.` (samples x 10 min). Pure helper `export function activityGrid(activity, nowMs)` -> 7 x 24 numbers.
- A button "Vergleichen" -> `{root}vergleich/?a=<name>`.

### B6 Compare page `/vergleich/`
- New `web/vergleich/index.html` (root `../`, `data-page="compare"`, same nav/footer).
- Two `<select>` with all players, defaults from `?a=&b=` (case-insensitive by `pathName`), else the first two players by playtime; changing a select updates the URL with `history.replaceState`.
- Rows for every main and "Noch mehr Zahlen" value: label, value A, value B; the higher value bold with a "▲" after it (not color alone); equal -> no marker.
- Stats page "Alle Spieler" section gets a button "Spieler vergleichen" -> `vergleich/`.
- Pure helper `export function compareRows(a, b, defs)` -> `[{label, a, b, winner: "a" | "b" | null}]`.

### B tests
- `test_web.mjs`: `colorSlots` (order by firstSeen, 9th -> `#8a8a8a`, stable when sorted differently on input); `stackDays` (zero segments dropped, totals); `activityGrid` (7x24, a sample in the right cell); `compareRows` (winner a / b / null).
- `test_worker.mjs`: `/status.json` offline and online shapes, shared cache (status fetched once for a `/status.json` and a `/players.json` call within 5 s).

## Part C: nightly backups (`tools/backup.py`, `test_backup.py`)

- Usage: `python tools/backup.py <dest_root>`. Token from env `EXAROTON_TOKEN`, else from the file `~/.exaroton-token` (stripped); server id `CXVm6tP2BMCwrEgB` as a constant (overridable by env `EXAROTON_SERVER`).
- If the server is online (`status == 1`): send `save-off`, then `save-all flush`, wait (poll `logs/` every 2 s, max 60 s) until a log line after the command contains `Saved the game`; always send `save-on` in a `finally`.
- Download every file under `world/` (recursive `files/info`, `files/data`, retry on 429 with 1 s sleep) into `<dest_root>/auto-YYYY-MM-DD_HHMM.partial/`, check each file's size against the listing, then rename the folder to `auto-YYYY-MM-DD_HHMM`.
- Keep the newest 7 `auto-*` folders (by name), delete older `auto-*` and any leftover `*.partial`; never touch other folders (the manual `world-2026-10-26` backup stays).
- Append one line per run to `<dest_root>/backup.log` (time, files, MB, seconds or the error); exit code 1 on failure.
- Pure helper `prune(names, keep=7) -> list[str]` (names to delete) and `folder_name(now) -> str`; `test_backup.py` covers: 9 `auto-*` -> the 2 oldest; `world-2026-10-26` and `notes` never returned; `.partial` always returned.
- Claude sets up the Windows task afterwards: daily 05:00, "run as soon as possible after a missed start", token file in the user profile.

## Datenschutz note

New third-party contacts in the browser: Cloudflare (`mc-tick.spanani.workers.dev`, start page and map). Goes into the pending spanani.de Datenschutz section together with GitHub Pages and mc-heads.net.
