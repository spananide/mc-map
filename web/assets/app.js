// Minecraft color codes (§0 - §f)
const MC_COLORS = {
  "0": "#000000",
  "1": "#0000AA",
  "2": "#00AA00",
  "3": "#00AAAA",
  "4": "#AA0000",
  "5": "#AA00AA",
  "6": "#FFAA00",
  "7": "#AAAAAA",
  "8": "#555555",
  "9": "#5555FF",
  "a": "#55FF55",
  "b": "#55FFFF",
  "c": "#FF5555",
  "d": "#FF55FF",
  "e": "#FFFF55",
  "f": "#FFFFFF",
};

const numFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 1,
});

export function relTime(iso, nowMs) {
  const now = typeof nowMs === "number" ? nowMs : Date.now();
  const past = typeof iso === "number" ? iso : Date.parse(iso);
  if (Number.isNaN(past)) return "";
  const diffSec = Math.max(0, Math.floor((now - past) / 1000));
  if (diffSec < 60) {
    return "gerade eben";
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `vor ${diffMin} Min`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `vor ${diffHours} Std`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return "vor 1 Tag";
  }
  return `vor ${diffDays} Tagen`;
}

export function motdSpans(motd) {
  if (!motd) return [];
  const spans = [];
  let color = "#FFFFFF";
  let bold = false;
  let italic = false;
  let underline = false;
  let strike = false;
  let currentText = "";

  function flush() {
    if (currentText.length > 0) {
      spans.push({
        text: currentText,
        color,
        bold,
        italic,
        underline,
        strike,
      });
      currentText = "";
    }
  }

  for (let i = 0; i < motd.length; i++) {
    if (motd[i] === "§" && i + 1 < motd.length) {
      const code = motd[i + 1].toLowerCase();
      if (code in MC_COLORS) {
        flush();
        color = MC_COLORS[code];
        bold = false;
        italic = false;
        underline = false;
        strike = false;
        i++;
        continue;
      } else if (code === "l") {
        flush();
        bold = true;
        i++;
        continue;
      } else if (code === "m") {
        flush();
        strike = true;
        i++;
        continue;
      } else if (code === "n") {
        flush();
        underline = true;
        i++;
        continue;
      } else if (code === "o") {
        flush();
        italic = true;
        i++;
        continue;
      } else if (code === "k") {
        i++;
        continue;
      } else if (code === "r") {
        flush();
        color = "#FFFFFF";
        bold = false;
        italic = false;
        underline = false;
        strike = false;
        i++;
        continue;
      }
    }
    currentText += motd[i];
  }
  flush();
  return spans;
}

export function rankOf(players, get, uuid) {
  if (!Array.isArray(players) || players.length === 0) {
    return { rank: 0, of: 0 };
  }
  const target = players.find((p) => p.uuid === uuid);
  if (!target) {
    return { rank: players.length, of: players.length };
  }
  const targetVal = get(target);
  let rank = 1;
  for (const p of players) {
    if (get(p) > targetVal) {
      rank++;
    }
  }
  return { rank, of: players.length };
}

export function board(players, get) {
  if (!Array.isArray(players) || players.length === 0) {
    return [];
  }
  const entries = [];
  for (const p of players) {
    const val = get(p);
    if (typeof val === "number" && val > 0) {
      entries.push({ player: p, value: val });
    }
  }
  entries.sort((a, b) => b.value - a.value);
  let rank = 1;
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].value < entries[i - 1].value) {
      rank = i + 1;
    }
    entries[i].rank = rank;
  }
  return entries;
}

export function pathName(name) {
  if (typeof name !== "string") return "";
  return name.replace(/^\.+/, "").toLowerCase();
}

export function eventParts(text) {
  if (typeof text !== "string" || !text) return [];
  const parts = [];
  const segments = text.split(/(\{p\}|\[[^\]]*\])/);
  for (const seg of segments) {
    if (!seg) continue;
    if (seg === "{p}") {
      parts.push({ type: "player" });
    } else if (seg.startsWith("[") && seg.endsWith("]")) {
      parts.push({ type: "label", text: seg.slice(1, -1) });
    } else {
      parts.push({ type: "text", text: seg });
    }
  }
  return parts;
}

export function fmt(n) {
  if (typeof n !== "number" || Number.isNaN(n)) {
    return "0";
  }
  return numFormatter.format(n);
}

// -------------------------------------------------------------
// DOM Code (runs only in browser context)
// -------------------------------------------------------------

function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === "class" || k === "className") {
      element.className = v;
    } else if (k === "style" && typeof v === "object") {
      Object.assign(element.style, v);
    } else if (k === "title" || k === "href" || k === "src" || k === "alt" || k === "width" || k === "height" || k === "target" || k === "rel") {
      element.setAttribute(k, String(v));
    } else if (k === "id") {
      element.id = v;
    } else if (k.startsWith("data-")) {
      element.setAttribute(k, String(v));
    } else {
      element[k] = v;
    }
  }
  const childArray = Array.isArray(children) ? children : [children];
  for (const child of childArray) {
    if (child == null) continue;
    if (typeof child === "string" || typeof child === "number") {
      element.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }
  return element;
}

function renderEventParts(container, text, playerName, root) {
  const parts = eventParts(text);
  for (const part of parts) {
    if (part.type === "player") {
      container.appendChild(
        el("a", { href: `${root}spieler/${pathName(playerName)}/`, class: "player-link" }, playerName)
      );
    } else if (part.type === "label") {
      container.appendChild(el("span", { class: "event-label" }, `[${part.text}]`));
    } else {
      container.appendChild(document.createTextNode(part.text));
    }
  }
}

function renderEvent(ev, playerMap, root) {
  const pName = ev.player || "Unbekannt";
  const uuid = playerMap.get(pName.toLowerCase()) || pName;

  const item = el("div", {
    class: `event-item ${ev.type === "advancement" ? "event-advancement" : "event-death"}`,
  });

  const head = el("img", {
    src: `https://mc-heads.net/avatar/${uuid}/32`,
    alt: pName,
    class: "player-head",
    width: 32,
    height: 32,
  });
  item.appendChild(head);

  const content = el("div", { class: "event-content" });

  if (ev.type === "advancement") {
    content.appendChild(el("div", { class: "toast-header" }, "Fortschritt erzielt!"));
  }

  const desc = el("div", { class: "event-desc" });
  renderEventParts(desc, ev.text || "", pName, root);

  const timeSpan = el("span", { class: "event-time" }, relTime(ev.t));
  desc.appendChild(timeSpan);

  content.appendChild(desc);
  item.appendChild(content);

  return item;
}

function renderStart(appEl, root, status, stats, events, playerMap) {
  if (!status && !stats && !events) {
    appEl.appendChild(el("div", { class: "panel" }, el("p", { class: "empty-msg" }, "Noch keine Daten.")));
    return;
  }

  // 1. Server List Entry
  const serverPanel = el("div", { class: "panel server-panel" });
  const serverEntry = el("div", { class: "server-entry" });

  const icon = el("img", {
    src: `${root}assets/server-icon.png`,
    alt: "Server-Icon",
    class: "server-icon",
    width: 64,
    height: 64,
  });
  serverEntry.appendChild(icon);

  const details = el("div", { class: "server-details" });
  details.appendChild(el("div", { class: "server-name" }, "Die Friedliche Strullergemeinschaft"));

  const motdDiv = el("div", { class: "server-motd" });
  if (status?.motd) {
    const spans = motdSpans(status.motd);
    for (const span of spans) {
      const spanStyle = { color: span.color };
      if (span.bold) spanStyle.fontWeight = "bold";
      if (span.italic) spanStyle.fontStyle = "italic";
      if (span.underline && span.strike) {
        spanStyle.textDecoration = "underline line-through";
      } else if (span.underline) {
        spanStyle.textDecoration = "underline";
      } else if (span.strike) {
        spanStyle.textDecoration = "line-through";
      }
      motdDiv.appendChild(el("span", { style: spanStyle }, span.text));
    }
  } else {
    motdDiv.appendChild(document.createTextNode(status ? "Willkommen auf dem Server!" : "Noch keine Daten."));
  }
  details.appendChild(motdDiv);
  serverEntry.appendChild(details);

  const statusCol = el("div", { class: "server-status-col" });
  const countText = status ? `${status.players?.length ?? 0}/${status.max ?? 0}` : "-/-";
  statusCol.appendChild(el("div", { class: "server-players-count" }, countText));

  const signalBars = el("div", {
    class: `signal-bars ${status?.online ? "online" : "offline"}`,
    title: status?.online ? "Online" : "Offline",
  });
  for (let i = 0; i < 5; i++) {
    signalBars.appendChild(el("div", { class: "signal-bar" }));
  }
  statusCol.appendChild(signalBars);
  serverEntry.appendChild(statusCol);

  serverPanel.appendChild(serverEntry);
  appEl.appendChild(serverPanel);

  // 2. "Gerade online"
  appEl.appendChild(el("h2", { class: "section-title" }, "Gerade online"));
  if (status?.players && status.players.length > 0) {
    const onlineList = el("div", { class: "online-list" });
    for (const p of status.players) {
      const card = el("a", {
        href: `${root}spieler/${pathName(p.name)}/`,
        class: "player-card slot",
      }, [
        el("img", {
          src: `https://mc-heads.net/avatar/${p.uuid || p.name}/32`,
          alt: p.name,
          class: "player-head",
          width: 32,
          height: 32,
        }),
        el("span", { class: "player-name" }, p.name),
      ]);
      onlineList.appendChild(card);
    }
    appEl.appendChild(onlineList);
  } else {
    appEl.appendChild(el("p", { class: "empty-msg" }, "Gerade ist niemand online."));
  }

  // 3. Two large buttons
  const bigBtns = el("div", { class: "big-buttons" }, [
    el("a", { href: `${root}map/`, class: "btn btn-large" }, "Karte"),
    el("a", { href: `${root}stats/`, class: "btn btn-large" }, "Statistiken"),
  ]);
  appEl.appendChild(bigBtns);

  // 4. Latest 8 events
  appEl.appendChild(el("h2", { class: "section-title" }, "Zuletzt passiert"));
  if (events && events.length > 0) {
    const eventsList = el("div", { class: "events-list" });
    const slice = events.slice(0, 8);
    for (const ev of slice) {
      eventsList.appendChild(renderEvent(ev, playerMap, root));
    }
    appEl.appendChild(eventsList);
  } else {
    appEl.appendChild(el("p", { class: "empty-msg" }, "Noch keine Ereignisse."));
  }
}

function renderStats(appEl, root, status, stats, events, playerMap) {
  if (!stats || !stats.players) {
    appEl.appendChild(el("div", { class: "panel" }, el("p", { class: "empty-msg" }, "Noch keine Daten.")));
    return;
  }

  const players = stats.players;

  // 1. Counter tiles
  const totalPlaytime = players.reduce((acc, p) => acc + (p.main?.playtime_h || 0), 0);
  const totalDeaths = players.reduce((acc, p) => acc + (p.main?.deaths || 0), 0);
  const totalMined = players.reduce((acc, p) => acc + (p.main?.mined || 0), 0);
  const totalPlayers = players.length;

  const counterGrid = el("div", { class: "counter-grid" }, [
    el("div", { class: "panel counter-tile" }, [
      el("div", { class: "counter-label" }, "Spielzeit gesamt"),
      el("div", { class: "slot counter-value" }, `${fmt(totalPlaytime)} h`),
    ]),
    el("div", { class: "panel counter-tile" }, [
      el("div", { class: "counter-label" }, "Tode gesamt"),
      el("div", { class: "slot counter-value" }, fmt(totalDeaths)),
    ]),
    el("div", { class: "panel counter-tile" }, [
      el("div", { class: "counter-label" }, "Blöcke abgebaut"),
      el("div", { class: "slot counter-value" }, fmt(totalMined)),
    ]),
    el("div", { class: "panel counter-tile" }, [
      el("div", { class: "counter-label" }, "Spieler"),
      el("div", { class: "slot counter-value" }, fmt(totalPlayers)),
    ]),
  ]);
  appEl.appendChild(counterGrid);

  // 2. "Wusstest du?" Box
  const facts = [];
  for (const p of players) {
    const name = p.name;
    if ((p.main?.playtime_h || 0) > 0 && (p.more?.jumps || 0) > 0) {
      const secPerJump = (p.main.playtime_h * 3600) / p.more.jumps;
      facts.push(`${name} springt im Schnitt alle ${fmt(Math.round(secPerJump * 10) / 10)} Sekunden.`);
    }
    if ((p.main?.distance_km || 0) > 0) {
      facts.push(`${name} ist schon ${fmt(p.main.distance_km)} km unterwegs gewesen.`);
    }
    if ((p.main?.mined || 0) > 0) {
      facts.push(`${name} hat ${fmt(p.main.mined)} Blöcke abgebaut.`);
    }
    if ((p.main?.deaths || 0) > 0) {
      facts.push(`${name} ist ${fmt(p.main.deaths)} Mal gestorben.`);
    }
    if ((p.main?.meals || 0) > 0) {
      facts.push(`${name} hat ${fmt(p.main.meals)} Mahlzeiten gegessen.`);
    }
    if ((p.main?.damage_hearts || 0) > 0) {
      facts.push(`${name} hat ${fmt(p.main.damage_hearts)} Herzen Schaden ausgeteilt.`);
    }
  }

  const factPanel = el("div", { class: "panel fact-panel" });
  factPanel.appendChild(el("h2", { class: "panel-title" }, "Wusstest du?"));

  let currentFactIndex = facts.length > 0 ? Math.floor(Math.random() * facts.length) : -1;
  const factP = el("p", { class: "fact-text" }, currentFactIndex >= 0 ? facts[currentFactIndex] : "Noch keine Daten.");
  factPanel.appendChild(factP);

  const nextFactBtn = el("button", { class: "btn" }, "Noch einer");
  nextFactBtn.addEventListener("click", () => {
    if (facts.length <= 1) return;
    let nextIndex = Math.floor(Math.random() * facts.length);
    while (nextIndex === currentFactIndex) {
      nextIndex = Math.floor(Math.random() * facts.length);
    }
    currentFactIndex = nextIndex;
    factP.textContent = facts[currentFactIndex];
  });
  factPanel.appendChild(nextFactBtn);
  appEl.appendChild(factPanel);

  // 3. Nine leaderboards
  const leaderboards = [
    { title: "Dauerzocker", subtitle: "Meiste Spielzeit", get: (p) => p.main?.playtime_h || 0, fmt: (v) => `${fmt(v)} h` },
    { title: "Diamantenbank", subtitle: "Meiste Diamanten abgebaut", get: (p) => p.main?.diamonds || 0, fmt: (v) => fmt(v) },
    { title: "Friedhof", subtitle: "Am häufigsten gestorben", get: (p) => p.main?.deaths || 0, fmt: (v) => fmt(v) },
    { title: "Abrissbirne", subtitle: "Meiste Blöcke abgebaut", get: (p) => p.main?.mined || 0, fmt: (v) => fmt(v) },
    { title: "Monsterjäger", subtitle: "Meiste Monster erledigt", get: (p) => p.main?.mob_kills || 0, fmt: (v) => fmt(v) },
    { title: "Weltenbummler", subtitle: "Weiteste Strecke", get: (p) => p.main?.distance_km || 0, fmt: (v) => `${fmt(v)} km` },
    { title: "Unsterblich", subtitle: "Meiste Totems verbraucht", get: (p) => p.main?.totems || 0, fmt: (v) => fmt(v) },
    { title: "Kampfmaschine", subtitle: "Am meisten Schaden ausgeteilt, in Herzen", get: (p) => p.main?.damage_hearts || 0, fmt: (v) => fmt(v) },
    { title: "Vielfraß", subtitle: "Meiste Mahlzeiten gegessen", get: (p) => p.main?.meals || 0, fmt: (v) => fmt(v) },
  ];

  appEl.appendChild(el("h2", { class: "section-title" }, "Bestenlisten"));
  const lbGrid = el("div", { class: "leaderboards-grid" });

  for (const lb of leaderboards) {
    const windowEl = el("div", { class: "panel inventory-window" });
    windowEl.appendChild(el("h3", { class: "panel-title" }, lb.title));
    windowEl.appendChild(el("div", { class: "panel-subtitle" }, lb.subtitle));

    const entries = board(players, lb.get).slice(0, 10);
    if (entries.length === 0) {
      windowEl.appendChild(el("p", { class: "panel-empty-msg" }, "Noch niemand."));
    } else {
      const rowsEl = el("div", { class: "leaderboard-rows" });
      for (const entry of entries) {
        const p = entry.player;
        const rank = entry.rank;
        const row = el("div", { class: "leaderboard-row" });

        const rankClass = rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "";
        const rankSlot = el("div", { class: `slot slot-rank ${rankClass}` }, rank);
        row.appendChild(rankSlot);

        const head = el("img", {
          src: `https://mc-heads.net/avatar/${p.uuid}/24`,
          alt: p.name,
          class: "player-head",
          width: 24,
          height: 24,
        });
        row.appendChild(head);

        const link = el("a", {
          href: `${root}spieler/${pathName(p.name)}/`,
          class: "player-link",
        }, p.name);
        row.appendChild(link);

        const valSpan = el("span", { class: "player-val" }, lb.fmt(entry.value));
        row.appendChild(valSpan);

        rowsEl.appendChild(row);
      }
      windowEl.appendChild(rowsEl);
    }
    lbGrid.appendChild(windowEl);
  }
  appEl.appendChild(lbGrid);

  // 4. Latest 20 events
  appEl.appendChild(el("h2", { class: "section-title" }, "Zuletzt passiert"));
  if (events && events.length > 0) {
    const eventsList = el("div", { class: "events-list" });
    const slice = events.slice(0, 20);
    for (const ev of slice) {
      eventsList.appendChild(renderEvent(ev, playerMap, root));
    }
    appEl.appendChild(eventsList);
  } else {
    appEl.appendChild(el("p", { class: "empty-msg" }, "Noch keine Ereignisse."));
  }

  // 5. All players
  appEl.appendChild(el("h2", { class: "section-title" }, "Alle Spieler"));
  const allList = el("div", { class: "all-players-list" });
  for (const p of players) {
    const card = el("a", {
      href: `${root}spieler/${pathName(p.name)}/`,
      class: "player-card slot",
    }, [
      el("img", {
        src: `https://mc-heads.net/avatar/${p.uuid}/32`,
        alt: p.name,
        class: "player-head",
        width: 32,
        height: 32,
      }),
      el("span", { class: "player-name" }, p.name),
    ]);
    allList.appendChild(card);
  }
  appEl.appendChild(allList);
}

function getPlayerNameFromPath() {
  const pathname = window.location.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const idx = segments.indexOf("spieler");
  if (idx !== -1 && segments[idx + 1]) {
    return pathName(segments[idx + 1].replace(/\.html$/, ""));
  }
  const params = new URLSearchParams(window.location.search);
  const q = params.get("name") || params.get("player");
  if (q) return pathName(q);
  return "";
}

function renderPlayer(appEl, root, status, stats, events, playerMap) {
  if (!stats || !stats.players) {
    appEl.appendChild(el("div", { class: "panel" }, el("p", { class: "empty-msg" }, "Noch keine Daten.")));
    return;
  }

  const lookup = getPlayerNameFromPath();
  const player = stats.players.find((p) => pathName(p.name) === lookup);

  if (!player) {
    const unknownPanel = el("div", { class: "panel" }, [
      el("h2", { class: "panel-title" }, "Diesen Spieler gibt es hier nicht."),
      el("p", {}, [
        el("a", { href: `${root}stats/`, class: "btn" }, "Zurück zu den Statistiken"),
      ]),
    ]);
    appEl.appendChild(unknownPanel);
    return;
  }

  // 1. Profile header
  const profilePanel = el("div", { class: "panel player-profile-panel" });
  const bodyImg = el("img", {
    src: `https://mc-heads.net/body/${player.uuid}/180`,
    alt: player.name,
    class: "player-body-img",
    width: 140,
  });
  profilePanel.appendChild(bodyImg);

  const infoDiv = el("div", { class: "player-profile-info" });
  infoDiv.appendChild(el("h1", { class: "player-title" }, player.name));

  const badge = el("span", {
    class: `badge ${player.online ? "badge-online" : "badge-offline"}`,
  }, player.online ? "Online" : "Offline");
  infoDiv.appendChild(badge);

  const firstSeenDate = player.firstSeen
    ? new Date(player.firstSeen).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "-";
  infoDiv.appendChild(el("p", { class: "player-meta" }, `Dabei seit ${firstSeenDate}`));

  let lastSeenStr = "Zuletzt online unbekannt";
  if (player.online) {
    lastSeenStr = "Gerade online";
  } else if (player.lastSeen) {
    lastSeenStr = `Zuletzt online ${relTime(player.lastSeen)}`;
  }
  infoDiv.appendChild(el("p", { class: "player-meta" }, lastSeenStr));
  profilePanel.appendChild(infoDiv);
  appEl.appendChild(profilePanel);

  // 2. Nine main values in slots, each with "Platz X von N"
  appEl.appendChild(el("h2", { class: "section-title" }, "Hauptwerte"));
  const mainStats = [
    { key: "playtime_h", label: "Spielzeit", get: (p) => p.main?.playtime_h || 0, fmt: (v) => `${fmt(v)} h` },
    { key: "diamonds", label: "Diamanten", get: (p) => p.main?.diamonds || 0, fmt: (v) => fmt(v) },
    { key: "deaths", label: "Tode", get: (p) => p.main?.deaths || 0, fmt: (v) => fmt(v) },
    { key: "mined", label: "Blöcke abgebaut", get: (p) => p.main?.mined || 0, fmt: (v) => fmt(v) },
    { key: "mob_kills", label: "Monster getötet", get: (p) => p.main?.mob_kills || 0, fmt: (v) => fmt(v) },
    { key: "distance_km", label: "Strecke gereist", get: (p) => p.main?.distance_km || 0, fmt: (v) => `${fmt(v)} km` },
    { key: "totems", label: "Totems verwendet", get: (p) => p.main?.totems || 0, fmt: (v) => fmt(v) },
    { key: "damage_hearts", label: "Schaden ausgeteilt", get: (p) => p.main?.damage_hearts || 0, fmt: (v) => `${fmt(v)} Herzen` },
    { key: "meals", label: "Mahlzeiten", get: (p) => p.main?.meals || 0, fmt: (v) => fmt(v) },
  ];

  const mainGrid = el("div", { class: "stats-grid" });
  for (const item of mainStats) {
    const val = item.get(player);
    const r = rankOf(stats.players, item.get, player.uuid);
    const rankText = val > 0 ? `Platz ${r.rank} von ${r.of}` : "Noch nichts";
    const card = el("div", { class: "slot stat-card" }, [
      el("div", { class: "stat-label" }, item.label),
      el("div", { class: "stat-val" }, item.fmt(val)),
      el("div", { class: "stat-rank" }, rankText),
    ]);
    mainGrid.appendChild(card);
  }
  appEl.appendChild(mainGrid);

  // 3. "Noch mehr Zahlen"
  appEl.appendChild(el("h2", { class: "section-title" }, "Noch mehr Zahlen"));
  const moreStats = [
    { key: "placed", label: "Blöcke platziert", fmt: (v) => fmt(v) },
    { key: "jumps", label: "Sprünge", fmt: (v) => fmt(v) },
    { key: "animals_bred", label: "Tiere vermehrt", fmt: (v) => fmt(v) },
    { key: "fish_caught", label: "Fische gefangen", fmt: (v) => fmt(v) },
    { key: "trades", label: "Dorfbewohner-Handel", fmt: (v) => fmt(v) },
    { key: "chests_opened", label: "Truhen geöffnet", fmt: (v) => fmt(v) },
    { key: "damage_taken_hearts", label: "Schaden erlitten", fmt: (v) => `${fmt(v)} Herzen` },
    { key: "sleep", label: "Im Bett geschlafen", fmt: (v) => fmt(v) },
    { key: "crafted", label: "Gegenstände hergestellt", fmt: (v) => fmt(v) },
    { key: "fall_km", label: "Gefallene Strecke", fmt: (v) => `${fmt(v)} km` },
    { key: "enchants", label: "Verzauberungen", fmt: (v) => fmt(v) },
  ];

  const moreGrid = el("div", { class: "stats-grid" });
  for (const item of moreStats) {
    const val = player.more?.[item.key] || 0;
    const r = rankOf(stats.players, (p) => p.more?.[item.key] || 0, player.uuid);
    const rankText = val > 0 ? `Platz ${r.rank} von ${r.of}` : "Noch nichts";
    const card = el("div", { class: "slot stat-card" }, [
      el("div", { class: "stat-label" }, item.label),
      el("div", { class: "stat-val" }, item.fmt(val)),
      el("div", { class: "stat-rank" }, rankText),
    ]);
    moreGrid.appendChild(card);
  }
  appEl.appendChild(moreGrid);

  // 4. "Lieblinge"
  appEl.appendChild(el("h2", { class: "section-title" }, "Lieblinge"));
  const favCats = [
    { key: "mined", title: "Abgebaut" },
    { key: "placed", title: "Platziert" },
    { key: "killed", title: "Getötet" },
    { key: "killed_by", title: "Getötet von" },
  ];

  const favGrid = el("div", { class: "favs-grid" });
  for (const cat of favCats) {
    const catPanel = el("div", { class: "panel fav-panel" });
    catPanel.appendChild(el("h3", { class: "panel-title" }, cat.title));

    const list = player.fav?.[cat.key] || [];
    if (list.length > 0) {
      const listEl = el("div", { class: "fav-list" });
      for (const [itemName, count] of list) {
        const row = el("div", { class: "slot fav-row" }, [
          el("span", { class: "fav-name" }, itemName),
          el("span", { class: "fav-count" }, fmt(count)),
        ]);
        listEl.appendChild(row);
      }
      catPanel.appendChild(listEl);
    } else {
      catPanel.appendChild(el("p", { class: "empty-msg" }, "Keine Daten"));
    }
    favGrid.appendChild(catPanel);
  }
  appEl.appendChild(favGrid);

  // 5. "Zuletzt passiert" (player's events, max 20)
  appEl.appendChild(el("h2", { class: "section-title" }, "Zuletzt passiert"));
  const pEvents = (events || []).filter((e) => pathName(e.player) === lookup).slice(0, 20);
  if (pEvents.length > 0) {
    const eventsList = el("div", { class: "events-list" });
    for (const ev of pEvents) {
      eventsList.appendChild(renderEvent(ev, playerMap, root));
    }
    appEl.appendChild(eventsList);
  } else {
    appEl.appendChild(el("p", { class: "empty-msg" }, "Noch keine Ereignisse."));
  }
}

async function init() {
  const root = document.body.dataset.root ?? "";
  const page = document.body.dataset.page;
  const appEl = document.getElementById("app");
  if (!appEl) return;

  const fetchJson = async (file) => {
    try {
      const res = await fetch(`${root}data/${file}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const [status, stats, events] = await Promise.all([
    fetchJson("status.json"),
    fetchJson("stats.json"),
    fetchJson("events.json"),
  ]);

  // Build name -> uuid lookup map
  const playerMap = new Map();
  if (status?.players) {
    for (const p of status.players) {
      if (p.name && p.uuid) {
        playerMap.set(p.name.toLowerCase(), p.uuid);
      }
    }
  }
  if (stats?.players) {
    for (const p of stats.players) {
      if (p.name && p.uuid) {
        playerMap.set(p.name.toLowerCase(), p.uuid);
      }
    }
  }

  // Update footer stand
  const footerStand = document.getElementById("footer-stand");
  if (footerStand) {
    const updatedTime = status?.updated || stats?.updated;
    if (updatedTime) {
      footerStand.textContent = `Stand: ${relTime(updatedTime)}`;
    } else {
      footerStand.textContent = "Stand: Noch keine Daten";
    }
  }

  // Render current page
  if (page === "start") {
    renderStart(appEl, root, status, stats, events, playerMap);
  } else if (page === "stats") {
    renderStats(appEl, root, status, stats, events, playerMap);
  } else if (page === "player") {
    renderPlayer(appEl, root, status, stats, events, playerMap);
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
