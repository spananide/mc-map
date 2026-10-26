# Server website for "Die Friedliche Strullergemeinschaft"

Date: 2026-10-26. Status: approved in chat, building.

## Goal

One website for the exaroton Minecraft server `koellewirdmeister`, on `mc.spanani.de`:

- `/` start page: server status, who is online, latest events, buttons to map and stats
- `/map/` the squaremap mirror that today sits at the site root
- `/stats/` overview with counters, a fun fact, nine top-10 leaderboards, latest events, all players
- `/spieler/<name>/` one page per player

Reference for content: craftattack.one/stats and /spieler/<name>. Left out on purpose: Twitch, clips, server address, rules.

## Constraints

- No server of our own. exaroton exposes no web ports, so everything is static on GitHub Pages, built by the existing Actions workflow in this repo (`spananide/mc-map`, public, branch `master`).
- Data is at most ~10 minutes old. Every page shows "Stand: vor X Minuten".
- German UI. All game names (advancements, blocks, items, mobs, death messages) come from Mojang's `de_de.json` for 26.3, never hand-translated.
- No Mojang textures or other copyrighted assets. The Minecraft look is rebuilt in CSS. Font: Monocraft (OFL-1.1), self-hosted.
- Only third party called from the browser: `mc-heads.net` (player heads and body renders; the map already uses it).
- Footer on every page links `https://spanani.de/impressum/` and `https://spanani.de/datenschutz/`.

## Architecture

```
Cloudflare Worker "mc-tick" (cron */10)  --workflow_dispatch-->  GitHub Actions (pages.yml)
GitHub schedule "4-59/10" (backup trigger) ----------------------^
                                                                  |
  restore cache (site/map, state/) -> sync.py -> stats.py -> copy web/ -> deploy site/ to Pages
```

GitHub's own cron never fired for this repo (0 repo events recorded) and ran 4 h late on spanani.de, so a Cloudflare Worker cron (the pattern `claude-stand` and `tonne-push` already use) dispatches the workflow every 10 minutes. The GitHub schedule stays as a backup.

### Repo layout

| Path | Job |
|---|---|
| `sync.py` | existing map mirror; output moves from `map/` to `site/map/` |
| `stats.py` | new: pulls stats, advancements, names, status, log from exaroton; writes `site/data/*.json` and `state/*.json`; writes one `site/spieler/<name>/index.html` per player from `web/spieler.html` |
| `test_stats.py` | new: plain `assert` self-check of the pure functions in `stats.py` (`python test_stats.py`) |
| `lang/de.json` | new: trimmed `de_de.json` (keys `advancements.*.title`, `block.minecraft.*`, `item.minecraft.*`, `entity.minecraft.*`, `death.*`) |
| `lang/en.json` | new: trimmed `en_us.json` (keys `death.*`, `entity.minecraft.*`) to parse English log lines |
| `lang/fetch.py` | new: one-off script that downloads and trims both files from Mojang's asset index for 26.3 |
| `web/` | new: static source, copied into `site/` on every run: `index.html`, `stats/index.html`, `spieler.html`, `assets/style.css`, `assets/app.js`, `assets/monocraft.ttf`, `assets/bg.svg` |
| `worker/` | new: `wrangler.jsonc` + `index.js` for `mc-tick` |
| `.github/workflows/pages.yml` | cache `site/map` and `state`, run both scripts, upload `site/` |

### Data sources (exaroton API, token from secrets)

| Source | Use |
|---|---|
| `GET /servers/{id}/` | `status` (1 = online), `players.list`, `players.max`, `motd` (with `§` codes) |
| `files/data/server-icon.png` | server icon on the start page |
| `files/data/usercache.json` | uuid -> name |
| `files/info/world/players/stats/` + each `<uuid>.json` | all numbers |
| `files/info/world/players/advancements/` + each `<uuid>.json` | advancement events with exact timestamps |
| `GET /servers/{id}/logs/` | deaths (exact text), `joined the game` / `left the game` for first/last seen |

The exaroton API returns 429 after a burst of ~20 requests; reuse the retry-on-429 approach of `sync.py`. The log endpoint returns 400 while the server is stopping; treat that as "no log this run".

### Output files

`site/data/status.json`
```json
{"updated": "2026-10-26T17:20:00Z", "online": true, "max": 3, "motd": "§7Die §cFriedliche ...",
 "players": [{"name": "spananii", "uuid": "32d311bc-..."}]}
```

`site/data/stats.json`
```json
{"updated": "...", "players": [{
  "name": "spananii", "uuid": "...", "firstSeen": "ISO", "lastSeen": "ISO", "online": false,
  "main": {"playtime_h": 4.5, "diamonds": 3, "deaths": 2, "mined": 812, "mob_kills": 14,
           "distance_km": 3.2, "totems": 0, "damage_hearts": 120.5, "meals": 31},
  "more": {"placed": 400, "jumps": 900, "animals_bred": 2, "fish_caught": 0, "trades": 0,
           "chests_opened": 12, "damage_taken_hearts": 40.0, "sleep": 3, "crafted": 120,
           "fall_km": 0.1, "enchants": 0},
  "fav": {"mined": [["Stein", 300], ...], "placed": [...], "killed": [...], "killed_by": [...]}
}]}
```
Ranks are computed in the browser (sort `players` by the key), so the JSON stays rank-free.

`site/data/events.json`: newest first, max 300, each
`{"t": "ISO", "type": "advancement"|"death", "player": "spananii", "text": "German text, {p} marks the player name", "key": "dedupe key"}`.
Example texts: `{p} hat den Fortschritt [Monsterjäger] erzielt` (bracket parts render as a label), `{p} wurde von Zombie erschlagen`, `%2$s zeigte {p}, …` style word order is kept as German has it.

`state/` persists across runs through the Actions cache and holds the last good `status.json`, `stats.json`, `events.json`, plus `meta.json` (`{uuid: {firstSeen, lastSeen}}`) and `log.json` (`{fingerprint, lines}`: which log lines were already processed). `site/data/` is a copy of the three public files.

All links, asset and data URLs are relative (`data-root` on `<body>`: `""`, `"../"`, `"../../"`), so the site works both at `spananide.github.io/mc-map/` and at `mc.spanani.de/`.

### Stat definitions (vanilla stats JSON, namespace `minecraft:`)

| Key | Definition |
|---|---|
| playtime_h | `custom.play_time` / 20 / 3600 |
| diamonds | `mined.diamond_ore` + `mined.deepslate_diamond_ore` |
| deaths | `custom.deaths` |
| mined | sum of `mined.*` |
| mob_kills | `custom.mob_kills` |
| distance_km | sum of every `custom.*_one_cm` except `fall_one_cm`, / 100000 |
| totems | `used.totem_of_undying` |
| damage_hearts | `custom.damage_dealt` / 20 |
| meals | sum of `used.<food>` over a fixed food list + `custom.eat_cake_slice` |
| placed | sum of `used.<x>` where `block.minecraft.<x>` exists in `lang/de.json` |
| jumps, animals_bred, fish_caught, trades, chests_opened, sleep, enchants | `custom.jump`, `animals_bred`, `fish_caught`, `traded_with_villager`, `open_chest`, `sleep_in_bed`, `enchant_item` |
| damage_taken_hearts | `custom.damage_taken` / 20 |
| crafted | sum of `crafted.*` |
| fall_km | `custom.fall_one_cm` / 100000 |

Food list: apple, golden_apple, enchanted_golden_apple, bread, beef, cooked_beef, porkchop, cooked_porkchop, chicken, cooked_chicken, mutton, cooked_mutton, rabbit, cooked_rabbit, cod, cooked_cod, salmon, cooked_salmon, tropical_fish, pufferfish, potato, baked_potato, poisonous_potato, carrot, golden_carrot, beetroot, beetroot_soup, mushroom_stew, rabbit_stew, suspicious_stew, melon_slice, sweet_berries, glow_berries, chorus_fruit, cookie, pumpkin_pie, dried_kelp, honey_bottle, rotten_flesh, spider_eye.

Favorites: top 10 of `mined.*`, `used.*` limited to blocks, `killed.*`, `killed_by.*`, names from `lang/de.json` (`block.`, `item.`, `entity.` in that order; fall back to the raw id).

### Events

- **Advancements:** every entry in the advancements file with `done: true` whose `advancements.<path>.title` exists in `lang/de.json` (this drops `recipes/*` and hidden roots). Path `minecraft:adventure/kill_a_mob` -> key `advancements.adventure.kill_a_mob.title`. Timestamp = latest criterion time (format `2026-10-26 15:55:11 +0100`).
- **Deaths:** every log line `[HH:MM:SS] [Server thread/INFO]: <message>` whose message matches a `death.*` pattern from `lang/en.json` (`%1$s` = known player name, `%2$s` = killer, `%3$s` = item, regex built per key, longest pattern first). Rendered with the same key from `lang/de.json`; a killer that is an English entity name is mapped back to its `entity.minecraft.*` key and shown in German, player names stay as they are.
- **Log dates:** log lines carry only `HH:MM:SS` (server time, Europe/Berlin). Walk lines from the newest backwards starting at the fetch time; whenever the time jumps forward while going backwards, step one day back.
- **Each log line once:** the same log is served until the next server start, also while the server is offline. `state/log.json` stores a fingerprint (first 3 lines joined) and how many lines were processed; a matching fingerprint means only lines after that count are new. A different fingerprint means a new session: all its lines are new.
- **Dedupe:** key = type + player + text + timestamp to the second. Merge into `state/events.json`, sort newest first, keep 300.
- **First/last seen:** `firstSeen` = earliest of (first join line seen, first run that saw the stats file); `lastSeen` = latest of (leave line, run where the player was online).

## Pages

All pages: dark dirt-pattern background, Monocraft, Minecraft-style text shadow, top nav with three stone buttons (Start, Karte, Statistiken), footer with "Stand: vor X Minuten" and Impressum/Datenschutz links. Phone width (< 640px): everything stacks into one column with 16px side gutters, no horizontal scroll.

**Start `/`**
1. Server list entry like the multiplayer screen: server icon, name "Die Friedliche Strullergemeinschaft", MOTD rendered from `§` codes, `n/max` players, signal bars (green when online, crossed out when offline).
2. "Gerade online": heads + names linking to player pages; when empty: "Gerade ist niemand online."
3. Two large buttons: "Karte" (`/map/`), "Statistiken" (`/stats/`).
4. Latest 8 events.

**Stats `/stats/`**
1. Counter tiles: Spielzeit gesamt (h), Tode gesamt, Blöcke abgebaut, Spieler.
2. "Wusstest du?" box with one random fact and a "Noch einer" button. Templates (only those with non-zero data):
   `{name} springt im Schnitt alle {x} Sekunden.` (play seconds / jumps),
   `{name} ist schon {x} km unterwegs gewesen.`, `{name} hat {x} Blöcke abgebaut.`,
   `{name} ist {x} Mal gestorben.`, `{name} hat {x} Mahlzeiten gegessen.`, `{name} hat {x} Herzen Schaden ausgeteilt.`
3. Nine leaderboards, top 10 each, as inventory windows (title top-left in dark gray like a chest): Dauerzocker (playtime), Diamantenbank (diamonds), Friedhof (deaths), Abrissbirne (mined), Monsterjäger (mob_kills), Weltenbummler (distance_km), Unsterblich (totems), Kampfmaschine (damage_hearts), Vielfraß (meals). Rows: rank slot, head, name (link), value. Ranks 1-3 get gold/silver/bronze rank slots.
4. Latest 20 events.
5. All players: heads + names.

**Player `/spieler/<name>/`** (static copy of `web/spieler.html`; the script reads the name from the path). The path segment is the name in lower case with leading dots removed (Geyser/Floodgate Bedrock names start with `.`); lookups compare the same way.
1. Body render (`mc-heads.net/body/<uuid>/180`), name, online/offline, "Dabei seit <date>", "Zuletzt online <relative>".
2. Nine main values in slots, each with "Platz X von N".
3. "Noch mehr Zahlen": the `more` values with ranks.
4. "Lieblinge": four top-10 lists (abgebaut, gesetzt, getötet, getötet von).
5. "Zuletzt passiert": this player's events (max 20).
Unknown name: "Diesen Spieler gibt es hier nicht." plus a link back to `/stats/`.

**Events rendering:** advancements as the in-game toast (dark box, yellow "Fortschritt erzielt!", label with the advancement title), deaths as a chat line on a translucent black bar. Each with head, linked name and relative time.

## Look (CSS only)

- Background: own 16x16 pixel SVG pattern in dark browns (`assets/bg.svg`), scaled with `image-rendering: pixelated`.
- Panels: `#c6c6c6` with 2px bevel (light `#ffffff` top-left, dark `#555555` bottom-right) and a 2px black outline; panel titles `#404040`, no shadow.
- Slots: `#8b8b8b`, inset bevel (dark `#373737` top-left, `#ffffff` bottom-right).
- Buttons: stone gray `#6f6f6f` with bevel, white text with `#3f3f3f` shadow; hover/focus: white outline. Visible keyboard focus everywhere.
- Text on dark ground: white with 2px `#3f3f3f` shadow. Yellow `#ffff55` for toast titles, MOTD colors from the standard 16 Minecraft color codes.
- Dark only. Respect `prefers-reduced-motion` (no motion planned anyway).

## Error handling

- Each data source is fetched independently. A failed source keeps the last good file from the previous run (status and stats files are only replaced after a successful build).
- Missing `site/data/*.json` in the browser: show "Noch keine Daten." instead of empty panels.
- `sync.py` keeps deleting files the server no longer has.

## Testing

- `python test_stats.py` asserts: stat definitions on a fixture built from the real stats file in the world backup; death-line parsing for at least fall, mob, player and item variants, rendered in German; date inference across midnight; dedupe/merge keeps 300 newest; first/last seen update.
- Local run of both scripts against the live server, served with `python -m http.server`, checked with agent-browser at 1280px and 390px.
- After deploy: all three pages and one player page load on `mc.spanani.de` (or the github.io address before DNS).

## Setup steps outside the repo

1. **Strato DNS (user):** create subdomain `mc.spanani.de`, CNAME to `spananide.github.io`.
2. **Pages custom domain (me):** `gh api -X PUT repos/spananide/mc-map/pages -f cname=mc.spanani.de`, then enforce HTTPS once the certificate is issued.
3. **GitHub token (user, guided):** fine-grained PAT, only repo `mc-map`, permission "Actions: Read and write".
4. **Worker (me):** `wrangler deploy` in `worker/`, `wrangler secret put GH_TOKEN`.
5. **spanani.de Datenschutz (me, push only with the user's OK):** short section for `mc.spanani.de` (GitHub Pages hosting, `mc-heads.net` heads) and the third-party list in section 6.

## Changes found while building

- Paper 26.3 logs broadcasts as `System chat: <message>`; `log_events` strips that prefix (joins, leaves and deaths were all missed without it).
- Advancement tab roots (`*/root`) are skipped: the game grants them silently and never announces them.
- Leaderboards list only values > 0 ("Noch niemand." when empty) and carry a one-line subtitle; Kampfmaschine rows show the number only, the unit sits in the subtitle. Player-page values of 0 show "Noch nichts" instead of a rank.
