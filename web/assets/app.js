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

const PALETTE = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];

const GERMAN_WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export const WEEKDAYS_MO = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const numFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 1,
});

export const LIVE_STATUS = "https://mc-tick.spanani.workers.dev/status.json";

export function germanDate(iso) {
  if (typeof iso !== "string" || !iso) return "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12 || d < 1 || d > 31) return "";
  return `${match[3]}.${match[2]}.${match[1]}`;
}

export function heatLevel(value, max) {
  if (typeof value !== "number" || typeof max !== "number" || Number.isNaN(value) || Number.isNaN(max)) {
    return 0;
  }
  if (value <= 0 || max <= 0) {
    return 0;
  }
  return Math.min(4, Math.max(0, Math.ceil((4 * value) / max)));
}

export function peakLabel(peak) {
  if (!peak || typeof peak !== "object") return "";
  const { weekday, hour } = peak;
  if (typeof weekday !== "number" || typeof hour !== "number" || Number.isNaN(weekday) || Number.isNaN(hour)) {
    return "";
  }
  if (weekday < 0 || weekday > 6 || hour < 0 || hour > 23) {
    return "";
  }
  const day = WEEKDAYS_MO[weekday];
  return `${day} ${hour}-${hour + 1} Uhr`;
}

export function dimLabel(dim) {
  if (dim === "overworld") return "Oberwelt";
  if (dim === "the_nether") return "Nether";
  if (dim === "the_end") return "Ende";
  return dim;
}

export function tpCommand(o) {
  const x = o?.x ?? 0;
  const y = o?.y ?? 0;
  const z = o?.z ?? 0;
  return `/tp @s ${x} ${y} ${z}`;
}

export function mapLink(root, o) {
  const base = root ?? "";
  const dim = o?.dim || "";
  let world;
  if (dim === "overworld") {
    world = "minecraft_overworld";
  } else if (dim === "the_nether") {
    world = "minecraft_the_nether";
  } else if (dim === "the_end") {
    world = "minecraft_the_end";
  } else if (typeof dim === "string" && dim.startsWith("minecraft_")) {
    world = dim;
  } else {
    world = `minecraft_${dim}`;
  }
  const x = o?.x ?? 0;
  const z = o?.z ?? 0;
  return `${base}map/?world=${world}&x=${x}&z=${z}`;
}

export function recordValue(r) {
  if (!r || typeof r !== "object") return "0";
  const val = typeof r.value === "number" ? r.value : 0;
  if (r.unit === "h") {
    return `${fmt(val)} h`;
  }
  return fmt(val);
}

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

export function colorSlots(players) {
  const map = new Map();
  if (!Array.isArray(players)) return map;
  const sorted = [...players].sort((a, b) => {
    const tA = a.firstSeen ? (Date.parse(a.firstSeen) || 0) : 0;
    const tB = b.firstSeen ? (Date.parse(b.firstSeen) || 0) : 0;
    if (tA !== tB) return tA - tB;
    return (a.name || "").localeCompare(b.name || "");
  });
  sorted.forEach((p, idx) => {
    if (!p.uuid) return;
    const color = idx < 8 ? PALETTE[idx] : "#8a8a8a";
    map.set(p.uuid, color);
    map[p.uuid] = color;
  });
  return map;
}

export function stackDays(history, slots) {
  if (!history || !Array.isArray(history.days)) return [];
  const days = history.days;
  const players = Array.isArray(history.players) ? history.players : [];

  const playerByUuid = new Map();
  for (const p of players) {
    if (p.uuid) playerByUuid.set(p.uuid, p);
  }

  const slotOrder = [];
  if (slots instanceof Map) {
    for (const [uuid, color] of slots) {
      slotOrder.push({ uuid, color });
    }
  } else if (slots && typeof slots === "object") {
    for (const [uuid, color] of Object.entries(slots)) {
      slotOrder.push({ uuid, color });
    }
  }

  const seenUuids = new Set(slotOrder.map((s) => s.uuid));
  for (const p of players) {
    if (p.uuid && !seenUuids.has(p.uuid)) {
      slotOrder.push({ uuid: p.uuid, color: "#8a8a8a" });
    }
  }

  const result = [];
  for (let dIdx = 0; dIdx < days.length; dIdx++) {
    const day = days[dIdx];
    const segments = [];
    let total = 0;

    for (const slot of slotOrder) {
      const p = playerByUuid.get(slot.uuid);
      if (!p) continue;
      const hours = p.hours?.[dIdx] ?? 0;
      if (hours > 0) {
        segments.push({
          uuid: p.uuid,
          name: p.name,
          hours,
          color: slot.color || "#8a8a8a",
        });
        total += hours;
      }
    }

    result.push({
      day,
      total: Math.round(total * 100) / 100,
      segments,
    });
  }

  return result;
}

function getBerlinDateParts(ms) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const y = Number(parts.find((p) => p.type === "year")?.value || 1970);
  const m = Number(parts.find((p) => p.type === "month")?.value || 1);
  const d = Number(parts.find((p) => p.type === "day")?.value || 1);
  return { y, m, d };
}

export function activityGrid(activity, nowMs) {
  const now = typeof nowMs === "number" ? nowMs : (typeof nowMs === "string" ? Date.parse(nowMs) : Date.now());
  const { y, m, d } = getBerlinDateParts(now);
  const grid = [];
  for (let i = 0; i < 7; i++) {
    const row = [];
    const offset = 6 - i;
    const dayDt = new Date(Date.UTC(y, m - 1, d - offset, 12, 0, 0));
    const dayStr = dayDt.toISOString().slice(0, 10);
    for (let h = 0; h < 24; h++) {
      const hourKey = `${dayStr}T${String(h).padStart(2, "0")}`;
      const samples = (activity && typeof activity === "object") ? (Number(activity[hourKey]) || 0) : 0;
      row.push(samples);
    }
    grid.push(row);
  }
  return grid;
}

export function compareRows(a, b, defs) {
  if (!Array.isArray(defs)) return [];
  return defs.map((def) => {
    const get = typeof def.get === "function"
      ? def.get
      : (p) => (p?.main?.[def.key] ?? p?.more?.[def.key] ?? p?.[def.key] ?? 0);
    const rawA = a ? (get(a) ?? 0) : 0;
    const rawB = b ? (get(b) ?? 0) : 0;
    let winner = null;
    if (rawA > rawB) {
      winner = "a";
    } else if (rawB > rawA) {
      winner = "b";
    }
    const valA = def.fmt ? def.fmt(rawA) : rawA;
    const valB = def.fmt ? def.fmt(rawB) : rawB;
    return {
      label: def.label || "",
      a: valA,
      b: valB,
      winner,
    };
  });
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
    } else if (k === "title" || k === "href" || k === "src" || k === "alt" || k === "width" || k === "height" || k === "target" || k === "rel" || k === "tabindex" || k === "value") {
      element.setAttribute(k, String(v));
    } else if (k === "id") {
      element.id = v;
    } else if (k.startsWith("data-") || k.startsWith("aria-")) {
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

function svgEl(tag, attrs = {}, children = []) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    element.setAttribute(k, String(v));
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

function roundedTopRectPath(x, y, w, h, r) {
  if (h <= 0 || w <= 0) return "";
  const actualR = Math.min(r, h, w / 2);
  return `M ${x} ${y + actualR} ` +
         `a ${actualR} ${actualR} 0 0 1 ${actualR} ${-actualR} ` +
         `h ${w - 2 * actualR} ` +
         `a ${actualR} ${actualR} 0 0 1 ${actualR} ${actualR} ` +
         `v ${h - actualR} ` +
         `h ${-w} Z`;
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
  const serverPanel = el("div", { class: "panel server-panel", id: "start-server-panel" });
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

  const motdDiv = el("div", { class: "server-motd", id: "server-motd" });
  function fillMotd(motd) {
    while (motdDiv.firstChild) motdDiv.removeChild(motdDiv.firstChild);
    if (motd) {
      const spans = motdSpans(motd);
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
  }
  fillMotd(status?.motd);
  details.appendChild(motdDiv);
  serverEntry.appendChild(details);

  const statusCol = el("div", { class: "server-status-col" });
  const countText = status ? `${status.players?.length ?? 0}/${status.max ?? 0}` : "-/-";
  const countDiv = el("div", { class: "server-players-count", id: "server-players-count" }, countText);
  statusCol.appendChild(countDiv);

  const signalBars = el("div", {
    class: `signal-bars ${status?.online ? "online" : "offline"}`,
    id: "server-signal-bars",
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
  const onlineSection = el("div", { id: "start-online-section" });
  function renderOnlinePlayers(playerList) {
    while (onlineSection.firstChild) onlineSection.removeChild(onlineSection.firstChild);
    if (playerList && playerList.length > 0) {
      const onlineList = el("div", { class: "online-list" });
      for (const p of playerList) {
        const name = typeof p === "string" ? p : p.name;
        const uuid = (typeof p === "object" && p.uuid) ? p.uuid : (playerMap.get(name.toLowerCase()) || name);
        const card = el("a", {
          href: `${root}spieler/${pathName(name)}/`,
          class: "player-card slot",
        }, [
          el("img", {
            src: `https://mc-heads.net/avatar/${uuid}/32`,
            alt: name,
            class: "player-head",
            width: 32,
            height: 32,
          }),
          el("span", { class: "player-name" }, name),
        ]);
        onlineList.appendChild(card);
      }
      onlineSection.appendChild(onlineList);
    } else {
      onlineSection.appendChild(el("p", { class: "empty-msg" }, "Gerade ist niemand online."));
    }
  }
  renderOnlinePlayers(status?.players);
  appEl.appendChild(onlineSection);

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

  // Live Status Poller (every 30s)
  async function pollLive() {
    try {
      const res = await fetch(LIVE_STATUS);
      if (!res.ok) return;
      const live = await res.json();
      fillMotd(live.motd);
      countDiv.textContent = `${live.players?.length ?? 0}/${live.max ?? 0}`;
      signalBars.className = `signal-bars ${live.online ? "online" : "offline"}`;
      signalBars.title = live.online ? "Online" : "Offline";
      renderOnlinePlayers(live.players);
    } catch {
      // Silently keep static data
    }
  }
  pollLive();
  setInterval(pollLive, 30000);
}

function renderPlaytimeChart(container, history, players) {
  const slots = colorSlots(players);
  const stacked = stackDays(history, slots);

  const panel = el("div", { class: "panel playtime-panel" });
  panel.appendChild(el("h2", { class: "panel-title" }, "Spielzeit pro Tag"));

  const hasData = stacked.length > 0 && stacked.some((d) => d.total > 0);
  if (!hasData) {
    panel.appendChild(el("p", { class: "empty-msg" }, "Noch keine Spielzeit aufgezeichnet."));
    container.appendChild(panel);
    return;
  }

  // Legend above the chart (swatch + name), text in white, never in series color
  const legend = el("div", { class: "chart-legend" });
  const sortedPlayers = [...players].sort((a, b) => {
    const tA = a.firstSeen ? (Date.parse(a.firstSeen) || 0) : 0;
    const tB = b.firstSeen ? (Date.parse(b.firstSeen) || 0) : 0;
    if (tA !== tB) return tA - tB;
    return (a.name || "").localeCompare(b.name || "");
  });

  const top8 = sortedPlayers.slice(0, 8);
  for (let i = 0; i < top8.length; i++) {
    const p = top8[i];
    const color = PALETTE[i];
    const item = el("div", { class: "legend-item" }, [
      el("span", { class: "legend-swatch", style: { backgroundColor: color } }),
      el("span", { class: "legend-label" }, p.name),
    ]);
    legend.appendChild(item);
  }
  if (sortedPlayers.length > 8) {
    const item = el("div", { class: "legend-item" }, [
      el("span", { class: "legend-swatch", style: { backgroundColor: "#8a8a8a" } }),
      el("span", { class: "legend-label" }, "Andere"),
    ]);
    legend.appendChild(item);
  }
  panel.appendChild(legend);

  // SVG stacked bar chart
  const svgWidth = 740;
  const svgHeight = 280;
  const marginLeft = 45;
  const marginRight = 15;
  const marginTop = 20;
  const marginBottom = 35;

  const chartWidth = svgWidth - marginLeft - marginRight;
  const chartHeight = svgHeight - marginTop - marginBottom;
  const bottomY = marginTop + chartHeight;

  const maxTotal = Math.max(...stacked.map((d) => d.total), 1);
  // Recessive grid lines: 3-4 intervals
  let step = 1;
  if (maxTotal > 20) step = 10;
  else if (maxTotal > 10) step = 5;
  else if (maxTotal > 4) step = 2;
  const maxY = Math.ceil(maxTotal / step) * step;

  const svg = svgEl("svg", {
    viewBox: `0 0 ${svgWidth} ${svgHeight}`,
    class: "chart-svg",
    "aria-label": "Spielzeit pro Tag Diagramm",
    role: "img",
  });

  // Grid lines & Y axis
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const val = (maxY / gridSteps) * i;
    const y = bottomY - (val / maxY) * chartHeight;
    svg.appendChild(
      svgEl("line", {
        x1: marginLeft,
        y1: y,
        x2: marginLeft + chartWidth,
        y2: y,
        stroke: "rgba(255,255,255,.12)",
        "stroke-width": 1,
      })
    );
    svg.appendChild(
      svgEl("text", {
        x: marginLeft - 8,
        y: y + 4,
        "text-anchor": "end",
        fill: "#aaaaaa",
        "font-size": "11px",
        "font-family": "Monocraft, monospace",
      }, `${fmt(val)} h`)
    );
  }

  // Chart container for tooltip positioning
  const chartWrapper = el("div", { class: "chart-wrapper", style: { position: "relative" } });
  const tooltip = el("div", { class: "chart-tooltip slot", style: { display: "none" } });
  chartWrapper.appendChild(tooltip);

  const numDays = stacked.length;
  const colWidth = chartWidth / numDays;
  const barWidth = Math.max(8, colWidth * 0.6);

  for (let dIdx = 0; dIdx < numDays; dIdx++) {
    const d = stacked[dIdx];
    const colCenterX = marginLeft + dIdx * colWidth + colWidth / 2;
    const barX = colCenterX - barWidth / 2;

    // Day label: Mo 26.
    const parts = d.day.split("-").map(Number);
    const dayDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12));
    const dayLabel = `${GERMAN_WEEKDAYS[dayDate.getUTCDay()]} ${parts[2]}.`;
    svg.appendChild(
      svgEl("text", {
        x: colCenterX,
        y: bottomY + 20,
        "text-anchor": "middle",
        fill: "#aaaaaa",
        "font-size": "11px",
        "font-family": "Monocraft, monospace",
      }, dayLabel)
    );

    // Stack segments
    let curY = bottomY;
    const numSegments = d.segments.length;
    for (let sIdx = 0; sIdx < numSegments; sIdx++) {
      const seg = d.segments[sIdx];
      const segH = (seg.hours / maxY) * chartHeight;
      const topY = curY - segH;
      const isTop = sIdx === numSegments - 1;

      if (isTop) {
        const pathD = roundedTopRectPath(barX, topY, barWidth, segH, 4);
        svg.appendChild(
          svgEl("path", {
            d: pathD,
            fill: seg.color,
            stroke: "rgba(0,0,0,.6)",
            "stroke-width": 2,
          })
        );
      } else {
        svg.appendChild(
          svgEl("rect", {
            x: barX,
            y: topY,
            width: barWidth,
            height: segH,
            fill: seg.color,
            stroke: "rgba(0,0,0,.6)",
            "stroke-width": 2,
          })
        );
      }
      curY = topY;
    }

    // Hit target for hover/focus (full column height)
    const hitRect = svgEl("rect", {
      x: marginLeft + dIdx * colWidth,
      y: marginTop,
      width: colWidth,
      height: chartHeight,
      fill: "transparent",
      tabindex: "0",
      class: "chart-hit-col",
      "aria-label": `${d.day}: ${fmt(d.total)} h`,
    });

    function showTooltip(evt) {
      while (tooltip.firstChild) tooltip.removeChild(tooltip.firstChild);
      const title = el("div", { class: "tooltip-date" }, `${dayLabel} (${d.day})`);
      tooltip.appendChild(title);

      if (d.segments.length > 0) {
        for (const seg of d.segments) {
          const row = el("div", { class: "tooltip-row" }, [
            el("span", { class: "tooltip-name" }, seg.name),
            el("span", { class: "tooltip-hours" }, `${fmt(seg.hours)} h`),
          ]);
          tooltip.appendChild(row);
        }
      } else {
        tooltip.appendChild(el("div", { class: "tooltip-row" }, "Keine Spielzeit"));
      }
      tooltip.appendChild(
        el("div", { class: "tooltip-total" }, `Gesamt: ${fmt(d.total)} h`)
      );

      tooltip.style.display = "block";
      const svgRect = svg.getBoundingClientRect();
      const colPx = ((marginLeft + dIdx * colWidth + colWidth / 2) / svgWidth) * svgRect.width;
      tooltip.style.left = `${Math.min(Math.max(colPx, 100), svgRect.width - 100)}px`;
      tooltip.style.top = "10px";
    }

    function hideTooltip() {
      tooltip.style.display = "none";
    }

    hitRect.addEventListener("mouseenter", showTooltip);
    hitRect.addEventListener("focus", showTooltip);
    hitRect.addEventListener("mouseleave", hideTooltip);
    hitRect.addEventListener("blur", hideTooltip);

    svg.appendChild(hitRect);
  }

  chartWrapper.appendChild(svg);
  panel.appendChild(chartWrapper);

  // <details><summary>Als Tabelle</summary>
  const details = el("details", { class: "chart-details" }, [
    el("summary", { class: "btn" }, "Als Tabelle"),
  ]);
  const table = el("table", { class: "chart-table slot" });
  const thead = el("thead", {}, el("tr", {}, [
    el("th", {}, "Datum"),
    el("th", {}, "Spieler"),
    el("th", {}, "Gesamt"),
  ]));
  table.appendChild(thead);

  const tbody = el("tbody");
  for (const d of stacked) {
    const pStr = d.segments.map((s) => `${s.name}: ${fmt(s.hours)} h`).join(", ") || "-";
    const tr = el("tr", {}, [
      el("td", {}, d.day),
      el("td", {}, pStr),
      el("td", { class: "table-total" }, `${fmt(d.total)} h`),
    ]);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  details.appendChild(table);
  panel.appendChild(details);

  container.appendChild(panel);
}

function renderFirsts(container, firstsList, playerMap, root) {
  const panel = el("div", { class: "panel firsts-panel" });
  panel.appendChild(el("h2", { class: "panel-title" }, "Wer war zuerst?"));

  if (!firstsList || firstsList.length === 0) {
    panel.appendChild(el("p", { class: "empty-msg" }, "Noch keine Fortschritte."));
    container.appendChild(panel);
    return;
  }

  const listEl = el("div", { class: "firsts-list" });
  function makeRow(item) {
    const uuid = playerMap.get(item.player?.toLowerCase()) || item.player;
    const row = el("div", { class: "leaderboard-row first-row" }, [
      el("span", { class: "event-label" }, `[${item.title}]`),
      el("img", {
        src: `https://mc-heads.net/avatar/${uuid}/24`,
        alt: item.player,
        class: "player-head",
        width: 24,
        height: 24,
      }),
      el("a", {
        href: `${root}spieler/${pathName(item.player)}/`,
        class: "player-link",
      }, item.player),
      el("span", { class: "event-time" }, relTime(item.t)),
    ]);
    return row;
  }

  const initialItems = firstsList.slice(0, 15);
  for (const item of initialItems) {
    listEl.appendChild(makeRow(item));
  }
  panel.appendChild(listEl);

  if (firstsList.length > 15) {
    const showAllBtn = el("button", { class: "btn firsts-show-all" }, "Alle anzeigen");
    showAllBtn.addEventListener("click", () => {
      const rest = firstsList.slice(15);
      for (const item of rest) {
        listEl.appendChild(makeRow(item));
      }
      showAllBtn.remove();
    });
    panel.appendChild(showAllBtn);
  }

  container.appendChild(panel);
}

function renderStats(appEl, root, status, stats, events, playerMap, history, advancements, records, heatmap) {
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

  // B3: "Spielzeit pro Tag" (after leaderboards)
  renderPlaytimeChart(appEl, history, players);

  // B4: "Wer war zuerst?"
  renderFirsts(appEl, stats.firsts, playerMap, root);

  // Rekorde
  appEl.appendChild(el("h2", { class: "section-title" }, "Rekorde"));
  const recordList = Array.isArray(records?.records) ? records.records : [];
  if (recordList.length === 0) {
    appEl.appendChild(el("p", { class: "empty-msg" }, "Noch keine Rekorde."));
  } else {
    const recordsGrid = el("div", { class: "records-grid" });
    for (const r of recordList) {
      const card = el("div", { class: "panel record-card" });
      card.appendChild(el("div", { class: "panel-title record-title" }, r.title || "Rekord"));
      card.appendChild(el("div", { class: "slot record-value" }, recordValue(r)));

      const metaRow = el("div", { class: "record-meta" });
      const pName = r.player || "Unbekannt";
      const uuid = r.uuid || playerMap.get(pName.toLowerCase()) || pName;

      const playerWrap = el("div", { class: "record-player-wrap" }, [
        el("img", {
          src: `https://mc-heads.net/avatar/${uuid}/24`,
          alt: pName,
          class: "player-head",
          width: 24,
          height: 24,
        }),
        el("a", {
          href: `${root}spieler/${pathName(pName)}/`,
          class: "player-link record-player",
        }, pName),
      ]);
      metaRow.appendChild(playerWrap);

      const dateText = germanDate(r.day);
      if (dateText) {
        metaRow.appendChild(el("span", { class: "record-date" }, dateText));
      }
      card.appendChild(metaRow);
      recordsGrid.appendChild(card);
    }
    appEl.appendChild(recordsGrid);
  }

  // "Wann ist was los?" Heatmap
  const heatPanel = el("div", { class: "panel heatmap-panel" });
  heatPanel.appendChild(el("h2", { class: "panel-title" }, "Wann ist was los?"));

  const hasHeatmapData = heatmap && Array.isArray(heatmap.grid) && typeof heatmap.samples === "number" && heatmap.samples > 0;
  if (!hasHeatmapData) {
    heatPanel.appendChild(el("p", { class: "empty-msg" }, "Noch zu wenig Daten."));
  } else {
    let maxCell = 0;
    for (const row of heatmap.grid) {
      if (Array.isArray(row)) {
        for (const v of row) {
          if (typeof v === "number" && v > maxCell) {
            maxCell = v;
          }
        }
      }
    }

    const heatGrid = el("div", { class: "heat-grid", role: "grid", "aria-label": "Aktivitäts-Heatmap" });

    // Header: corner + 8 hour labels every 3 hours (0, 3, 6, 9, 12, 15, 18, 21)
    heatGrid.appendChild(el("div", { class: "heat-label heat-corner" }));
    for (let h = 0; h < 24; h += 3) {
      heatGrid.appendChild(el("div", { class: "heat-label heat-hour-label" }, `${h}`));
    }

    // 7 rows: Montag (0) to Sonntag (6)
    for (let r = 0; r < 7; r++) {
      const dayName = WEEKDAYS_MO[r];
      heatGrid.appendChild(el("div", { class: "heat-label heat-weekday-label" }, dayName));

      const rowData = Array.isArray(heatmap.grid[r]) ? heatmap.grid[r] : [];
      for (let h = 0; h < 24; h++) {
        const val = typeof rowData[h] === "number" ? rowData[h] : 0;
        const level = heatLevel(val, maxCell);
        const mins = val * 10;
        const cellLabel = `${dayName} ${h}-${h + 1} Uhr: ca. ${mins} Min.`;

        const cell = el("div", {
          class: `heat-cell heat-${level}`,
          title: cellLabel,
          "aria-label": cellLabel,
          tabindex: "0",
        });
        heatGrid.appendChild(cell);
      }
    }
    heatPanel.appendChild(heatGrid);

    if (heatmap.peak) {
      const peakStr = peakLabel(heatmap.peak);
      if (peakStr) {
        heatPanel.appendChild(el("div", { class: "heatmap-peak" }, `Meist los: ${peakStr}`));
      }
    }

    if (typeof heatmap.days === "number" && heatmap.days < 14) {
      heatPanel.appendChild(el("div", { class: "heatmap-hint panel-subtitle" }, `Basiert auf ${heatmap.days} Tagen Daten - wird mit der Zeit genauer.`));
    }
  }
  appEl.appendChild(heatPanel);

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

  // 5. All players (with "Spieler vergleichen" button B6)
  const allHeader = el("div", { class: "section-header-row" }, [
    el("h2", { class: "section-title" }, "Alle Spieler"),
    el("a", { href: `${root}vergleich/`, class: "btn" }, "Spieler vergleichen"),
  ]);
  appEl.appendChild(allHeader);

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

function renderPlayer(appEl, root, status, stats, events, playerMap, history, advancements) {
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
    id: "player-live-badge",
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
  const lastSeenP = el("p", { class: "player-meta", id: "player-live-last-seen" }, lastSeenStr);
  infoDiv.appendChild(lastSeenP);

  // Abzeichen
  const badgesRow = el("div", { class: "badges-row" });
  if (Array.isArray(player.badges) && player.badges.length > 0) {
    for (const b of player.badges) {
      badgesRow.appendChild(el("span", {
        class: "badge-chip",
        title: b.desc || "",
        "aria-label": b.desc || "",
      }, b.title || ""));
    }
  } else {
    badgesRow.appendChild(el("span", { class: "empty-msg badge-empty" }, "Noch keine Abzeichen."));
  }
  infoDiv.appendChild(badgesRow);

  // Button "Vergleichen" (B5)
  const compareBtn = el("a", {
    href: `${root}vergleich/?a=${encodeURIComponent(player.name)}`,
    class: "btn player-compare-btn",
  }, "Vergleichen");
  infoDiv.appendChild(compareBtn);

  profilePanel.appendChild(infoDiv);
  appEl.appendChild(profilePanel);

  // Hook live status to update badge and last-seen
  async function updatePlayerLive() {
    try {
      const res = await fetch(LIVE_STATUS);
      if (!res.ok) return;
      const live = await res.json();
      const isOnline = live.online && Array.isArray(live.players) && live.players.some((n) => pathName(n) === lookup);
      if (isOnline) {
        badge.className = "badge badge-online";
        badge.textContent = "Online";
        lastSeenP.textContent = "Gerade online";
      } else {
        badge.className = "badge badge-offline";
        badge.textContent = "Offline";
        if (player.lastSeen) {
          lastSeenP.textContent = `Zuletzt online ${relTime(player.lastSeen)}`;
        } else {
          lastSeenP.textContent = "Zuletzt online unbekannt";
        }
      }
    } catch {
      // Silently keep static data
    }
  }
  updatePlayerLive();

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

  // B5: "Fortschritte"
  const advList = Array.isArray(advancements) ? advancements : [];
  const playerAdvDone = new Map(player.adv?.done || []);
  const doneCount = advList.filter((a) => playerAdvDone.has(a.key)).length;
  const totalCount = advList.length;

  appEl.appendChild(el("h2", { class: "section-title" }, "Fortschritte"));
  const advPanel = el("div", { class: "panel adv-panel" });

  const progHeader = el("div", { class: "progress-header" }, `${doneCount} von ${totalCount}`);
  advPanel.appendChild(progHeader);

  const progPct = totalCount > 0 ? Math.min(100, Math.round((doneCount / totalCount) * 100)) : 0;
  const progSlot = el("div", { class: "slot progress-bar-slot" }, [
    el("div", {
      class: "progress-bar-fill",
      style: { width: `${progPct}%` },
    }),
  ]);
  advPanel.appendChild(progSlot);

  const CAT_NAMES = {
    story: "Minecraft",
    nether: "Nether",
    end: "Das Ende",
    adventure: "Abenteuer",
    husbandry: "Landwirtschaft",
  };

  const cats = ["story", "nether", "end", "adventure", "husbandry"];
  for (const cat of cats) {
    const catItems = advList.filter((a) => a.key.startsWith(`${cat}/`));
    if (catItems.length === 0) continue;

    const doneInCat = [];
    const missingInCat = [];

    for (const item of catItems) {
      if (playerAdvDone.has(item.key)) {
        doneInCat.push({ ...item, t: playerAdvDone.get(item.key) });
      } else {
        missingInCat.push(item);
      }
    }

    const catDetails = el("details", { class: "adv-category slot" }, [
      el("summary", { class: "adv-summary" }, `${CAT_NAMES[cat] || cat} (${doneInCat.length}/${catItems.length})`),
    ]);

    const itemsContainer = el("div", { class: "adv-items-list" });
    for (const item of doneInCat) {
      const advRow = el("div", { class: "adv-item" }, [
        el("div", { class: "adv-item-title-row" }, [
          el("span", { class: "adv-title" }, item.title),
          el("span", { class: "event-time" }, relTime(item.t)),
        ]),
        el("div", { class: "adv-desc" }, item.description || ""),
      ]);
      itemsContainer.appendChild(advRow);
    }

    for (const item of missingInCat) {
      const advRow = el("div", { class: "adv-item adv-item-dimmed" }, [
        el("div", { class: "adv-item-title-row" }, [
          el("span", { class: "adv-title" }, item.title),
        ]),
        el("div", { class: "adv-desc" }, item.description || ""),
      ]);
      itemsContainer.appendChild(advRow);
    }

    catDetails.appendChild(itemsContainer);
    advPanel.appendChild(catDetails);
  }
  appEl.appendChild(advPanel);

  // B5: "Letzter Tod"
  appEl.appendChild(el("h2", { class: "section-title" }, "Letzter Tod"));
  const deathPanel = el("div", { class: "panel death-panel" });
  if (player.lastDeath) {
    const ld = player.lastDeath;
    const DIM_NAMES = {
      minecraft_overworld: "Oberwelt",
      minecraft_the_nether: "Nether",
      minecraft_the_end: "Das Ende",
    };
    const dimName = DIM_NAMES[ld.world] || ld.world;
    const coordStr = `${ld.x} / ${ld.y} / ${ld.z} (${dimName})`;
    const mapUrl = `${root}map/?world=${encodeURIComponent(ld.world)}&zoom=3&x=${ld.x}&z=${ld.z}`;

    deathPanel.appendChild(el("div", { class: "death-location-text" }, coordStr));
    deathPanel.appendChild(el("a", { href: mapUrl, class: "btn death-map-link" }, "Auf der Karte zeigen"));
  } else {
    deathPanel.appendChild(el("p", { class: "empty-msg" }, "Noch nie gestorben."));
  }
  appEl.appendChild(deathPanel);

  // B5: "Online-Zeiten (letzte 7 Tage)"
  appEl.appendChild(el("h2", { class: "section-title" }, "Online-Zeiten (letzte 7 Tage)"));
  const actPanel = el("div", { class: "panel activity-panel" });

  const pSlots = colorSlots(stats.players);
  const playerColor = (pSlots.get ? pSlots.get(player.uuid) : pSlots[player.uuid]) || "#3987e5";
  const grid = activityGrid(player.activity, Date.now());

  const { y: curY, m: curM, d: curD } = getBerlinDateParts(Date.now());
  const actGridWrapper = el("div", { class: "activity-grid-wrapper" });

  for (let r = 0; r < 7; r++) {
    const offset = 6 - r;
    const dDt = new Date(Date.UTC(curY, curM - 1, curD - offset, 12));
    const dDay = dDt.getUTCDate();
    const dMonth = String(dDt.getUTCMonth() + 1).padStart(2, "0");
    const dLabel = `${GERMAN_WEEKDAYS[dDt.getUTCDay()]} ${String(dDay).padStart(2, "0")}.${dMonth}.`;

    const rowEl = el("div", { class: "activity-row" });
    rowEl.appendChild(el("span", { class: "activity-day-label" }, dLabel));

    const cellsRow = el("div", { class: "activity-cells" });
    for (let h = 0; h < 24; h++) {
      const samples = grid[r][h];
      const opacity = samples > 0 ? Math.min(samples, 6) / 6 : 0;
      const mins = samples * 10;
      const tooltipText = `${dLabel}, ${h}-${h + 1} Uhr: ca. ${mins} Min.`;

      const cell = el("div", {
        class: `activity-cell ${samples > 0 ? "active" : "empty"}`,
        title: tooltipText,
        tabindex: "0",
        "aria-label": tooltipText,
        style: samples > 0
          ? { backgroundColor: playerColor, opacity: String(opacity) }
          : { backgroundColor: "rgba(255,255,255,.05)" },
      });
      cellsRow.appendChild(cell);
    }
    rowEl.appendChild(cellsRow);
    actGridWrapper.appendChild(rowEl);
  }
  actPanel.appendChild(actGridWrapper);
  appEl.appendChild(actPanel);

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

function renderCompare(appEl, root, status, stats, events, playerMap) {
  if (!stats || !stats.players || stats.players.length === 0) {
    appEl.appendChild(el("div", { class: "panel" }, el("p", { class: "empty-msg" }, "Noch keine Daten.")));
    return;
  }

  const players = stats.players;
  const sortedByPlaytime = [...players].sort((a, b) => (b.main?.playtime_h || 0) - (a.main?.playtime_h || 0));

  const params = new URLSearchParams(window.location.search);
  const qA = params.get("a");
  const qB = params.get("b");

  let playerA = qA ? players.find((p) => pathName(p.name) === pathName(qA)) : null;
  let playerB = qB ? players.find((p) => pathName(p.name) === pathName(qB)) : null;

  if (!playerA) {
    playerA = sortedByPlaytime[0];
  }
  if (!playerB) {
    playerB = sortedByPlaytime.length > 1 ? sortedByPlaytime[1] : sortedByPlaytime[0];
  }

  const comparePanel = el("div", { class: "panel compare-panel" });
  comparePanel.appendChild(el("h1", { class: "panel-title" }, "Spieler vergleichen"));

  // Selectors row
  const selectorsRow = el("div", { class: "compare-selectors-row" });

  const selectA = el("select", { class: "compare-select btn", "aria-label": "Spieler 1 auswählen" });
  const selectB = el("select", { class: "compare-select btn", "aria-label": "Spieler 2 auswählen" });

  for (const p of players) {
    selectA.appendChild(el("option", { value: p.name }, p.name));
    selectB.appendChild(el("option", { value: p.name }, p.name));
  }

  selectA.value = playerA.name;
  selectB.value = playerB.name;

  const colA = el("div", { class: "compare-col" }, [
    el("img", {
      src: `https://mc-heads.net/avatar/${playerA.uuid}/48`,
      alt: playerA.name,
      class: "player-head compare-head",
      id: "compare-head-a",
      width: 48,
      height: 48,
    }),
    selectA,
  ]);

  const vsEl = el("div", { class: "compare-vs" }, "VS");

  const colB = el("div", { class: "compare-col" }, [
    el("img", {
      src: `https://mc-heads.net/avatar/${playerB.uuid}/48`,
      alt: playerB.name,
      class: "player-head compare-head",
      id: "compare-head-b",
      width: 48,
      height: 48,
    }),
    selectB,
  ]);

  selectorsRow.appendChild(colA);
  selectorsRow.appendChild(vsEl);
  selectorsRow.appendChild(colB);
  comparePanel.appendChild(selectorsRow);

  const COMPARE_DEFS = [
    // Main stats
    { key: "playtime_h", label: "Spielzeit", get: (p) => p.main?.playtime_h || 0, fmt: (v) => `${fmt(v)} h` },
    { key: "diamonds", label: "Diamanten", get: (p) => p.main?.diamonds || 0, fmt: (v) => fmt(v) },
    { key: "deaths", label: "Tode", get: (p) => p.main?.deaths || 0, fmt: (v) => fmt(v) },
    { key: "mined", label: "Blöcke abgebaut", get: (p) => p.main?.mined || 0, fmt: (v) => fmt(v) },
    { key: "mob_kills", label: "Monster getötet", get: (p) => p.main?.mob_kills || 0, fmt: (v) => fmt(v) },
    { key: "distance_km", label: "Strecke gereist", get: (p) => p.main?.distance_km || 0, fmt: (v) => `${fmt(v)} km` },
    { key: "totems", label: "Totems verwendet", get: (p) => p.main?.totems || 0, fmt: (v) => fmt(v) },
    { key: "damage_hearts", label: "Schaden ausgeteilt", get: (p) => p.main?.damage_hearts || 0, fmt: (v) => `${fmt(v)} Herzen` },
    { key: "meals", label: "Mahlzeiten", get: (p) => p.main?.meals || 0, fmt: (v) => fmt(v) },
    // More stats
    { key: "placed", label: "Blöcke platziert", get: (p) => p.more?.placed || 0, fmt: (v) => fmt(v) },
    { key: "jumps", label: "Sprünge", get: (p) => p.more?.jumps || 0, fmt: (v) => fmt(v) },
    { key: "animals_bred", label: "Tiere vermehrt", get: (p) => p.more?.animals_bred || 0, fmt: (v) => fmt(v) },
    { key: "fish_caught", label: "Fische gefangen", get: (p) => p.more?.fish_caught || 0, fmt: (v) => fmt(v) },
    { key: "trades", label: "Dorfbewohner-Handel", get: (p) => p.more?.trades || 0, fmt: (v) => fmt(v) },
    { key: "chests_opened", label: "Truhen geöffnet", get: (p) => p.more?.chests_opened || 0, fmt: (v) => fmt(v) },
    { key: "damage_taken_hearts", label: "Schaden erlitten", get: (p) => p.more?.damage_taken_hearts || 0, fmt: (v) => `${fmt(v)} Herzen` },
    { key: "sleep", label: "Im Bett geschlafen", get: (p) => p.more?.sleep || 0, fmt: (v) => fmt(v) },
    { key: "crafted", label: "Gegenstände hergestellt", get: (p) => p.more?.crafted || 0, fmt: (v) => fmt(v) },
    { key: "fall_km", label: "Gefallene Strecke", get: (p) => p.more?.fall_km || 0, fmt: (v) => `${fmt(v)} km` },
    { key: "enchants", label: "Verzauberungen", get: (p) => p.more?.enchants || 0, fmt: (v) => fmt(v) },
  ];

  const tableContainer = el("div", { class: "compare-table-container" });
  function updateTable() {
    while (tableContainer.firstChild) tableContainer.removeChild(tableContainer.firstChild);

    const rows = compareRows(playerA, playerB, COMPARE_DEFS);
    for (const r of rows) {
      const rowEl = el("div", { class: "slot compare-row" });

      const labelEl = el("div", { class: "compare-label" }, r.label);

      let valAEl;
      if (r.winner === "a") {
        valAEl = el("div", { class: "compare-val val-a winner" }, [
          el("strong", {}, `${r.a} ▲`),
        ]);
      } else {
        valAEl = el("div", { class: "compare-val val-a" }, String(r.a));
      }

      let valBEl;
      if (r.winner === "b") {
        valBEl = el("div", { class: "compare-val val-b winner" }, [
          el("strong", {}, `${r.b} ▲`),
        ]);
      } else {
        valBEl = el("div", { class: "compare-val val-b" }, String(r.b));
      }

      rowEl.appendChild(labelEl);
      rowEl.appendChild(valAEl);
      rowEl.appendChild(valBEl);
      tableContainer.appendChild(rowEl);
    }
  }

  function onSelectChange() {
    const newA = players.find((p) => p.name === selectA.value) || playerA;
    const newB = players.find((p) => p.name === selectB.value) || playerB;
    playerA = newA;
    playerB = newB;

    document.getElementById("compare-head-a").src = `https://mc-heads.net/avatar/${playerA.uuid}/48`;
    document.getElementById("compare-head-b").src = `https://mc-heads.net/avatar/${playerB.uuid}/48`;

    const newUrl = `${window.location.pathname}?a=${encodeURIComponent(playerA.name)}&b=${encodeURIComponent(playerB.name)}`;
    window.history.replaceState(null, "", newUrl);

    updateTable();
  }

  selectA.addEventListener("change", onSelectChange);
  selectB.addEventListener("change", onSelectChange);

  updateTable();
  comparePanel.appendChild(tableContainer);
  appEl.appendChild(comparePanel);
}

function renderOrte(appEl, root, orte) {
  appEl.appendChild(el("h1", { class: "section-title" }, "Orte"));

  const places = Array.isArray(orte) ? orte : [];
  if (places.length === 0) {
    appEl.appendChild(el("p", { class: "empty-msg" }, "Noch keine Orte."));
    return;
  }

  const list = el("div", { class: "orte-list" });
  for (const o of places) {
    const card = el("div", { class: "panel place-card" });

    const header = el("div", { class: "place-header" }, [
      el("h2", { class: "panel-title place-name" }, o.name || "Unbenannt"),
      el("span", { class: "place-dim" }, dimLabel(o.dim)),
    ]);
    card.appendChild(header);

    const coords = el("div", { class: "slot place-coords" }, `${o.x} ${o.y} ${o.z}`);
    card.appendChild(coords);

    if (o.note) {
      card.appendChild(el("p", { class: "place-note" }, o.note));
    }

    const actions = el("div", { class: "place-actions" });

    const copyBtn = el("button", { class: "btn place-copy-btn" }, "/tp kopieren");
    copyBtn.addEventListener("click", () => {
      try {
        const p = navigator?.clipboard?.writeText(tpCommand(o));
        if (p && typeof p.then === "function") {
          p.then(() => {
            copyBtn.textContent = "Kopiert!";
            setTimeout(() => {
              copyBtn.textContent = "/tp kopieren";
            }, 1500);
          }).catch(() => {});
        }
      } catch {
        // swallow errors
      }
    });
    actions.appendChild(copyBtn);

    if (o.dim === "overworld") {
      const mapBtn = el("a", {
        href: mapLink(root, o),
        class: "btn place-map-btn",
      }, "Auf der Karte");
      actions.appendChild(mapBtn);
    }

    card.appendChild(actions);
    list.appendChild(card);
  }
  appEl.appendChild(list);
}

function renderZeitleiste(appEl, root, timeline) {
  appEl.appendChild(el("h1", { class: "section-title" }, "Zeitleiste"));

  const items = Array.isArray(timeline) ? timeline : [];
  if (items.length === 0) {
    appEl.appendChild(el("p", { class: "empty-msg" }, "Noch keine Einträge."));
    return;
  }

  const list = el("div", { class: "timeline-list" });
  for (const item of items) {
    const cardClass = item.auto ? "panel timeline-item timeline-auto" : "panel timeline-item";
    const card = el("div", { class: cardClass });

    const header = el("div", { class: "timeline-header" }, [
      el("h2", { class: "panel-title timeline-title" }, item.title || ""),
      el("span", { class: "timeline-date" }, germanDate(item.date)),
    ]);
    card.appendChild(header);

    if (item.text) {
      card.appendChild(el("p", { class: "timeline-text" }, item.text));
    }

    list.appendChild(card);
  }
  appEl.appendChild(list);
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

  const [status, stats, events, history, advancements, records, heatmap, orte, timeline] = await Promise.all([
    fetchJson("status.json"),
    fetchJson("stats.json"),
    fetchJson("events.json"),
    fetchJson("history.json"),
    fetchJson("advancements.json"),
    fetchJson("records.json"),
    fetchJson("heatmap.json"),
    fetchJson("orte.json"),
    fetchJson("timeline.json"),
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
  if (records?.records) {
    for (const r of records.records) {
      if (r.player && r.uuid) {
        playerMap.set(r.player.toLowerCase(), r.uuid);
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
    renderStats(appEl, root, status, stats, events, playerMap, history, advancements, records, heatmap);
  } else if (page === "player") {
    renderPlayer(appEl, root, status, stats, events, playerMap, history, advancements);
  } else if (page === "compare") {
    renderCompare(appEl, root, status, stats, events, playerMap);
  } else if (page === "orte") {
    renderOrte(appEl, root, orte);
  } else if (page === "zeitleiste") {
    renderZeitleiste(appEl, root, timeline);
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
