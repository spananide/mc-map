import { el, relTime, mapLink } from "./app.js";

export const ENCHANTS = {
  aqua_affinity: { de: "Wasseraffinität", max: 1, anvil: 4 },
  bane_of_arthropods: { de: "Nemesis der Gliederfüßer", max: 5, anvil: 2 },
  blast_protection: { de: "Explosionsschutz", max: 4, anvil: 4 },
  breach: { de: "Durchbruch", max: 4, anvil: 4 },
  channeling: { de: "Entladung", max: 1, anvil: 8 },
  density: { de: "Dichte", max: 5, anvil: 2 },
  depth_strider: { de: "Wasserläufer", max: 3, anvil: 4 },
  efficiency: { de: "Effizienz", max: 5, anvil: 1 },
  feather_falling: { de: "Federfall", max: 4, anvil: 2 },
  fire_aspect: { de: "Verbrennung", max: 2, anvil: 4 },
  fire_protection: { de: "Feuerschutz", max: 4, anvil: 2 },
  flame: { de: "Flamme", max: 1, anvil: 4 },
  fortune: { de: "Glück", max: 3, anvil: 4 },
  frost_walker: { de: "Eisläufer", max: 2, anvil: 4 },
  impaling: { de: "Harpune", max: 5, anvil: 4 },
  infinity: { de: "Unendlichkeit", max: 1, anvil: 8 },
  knockback: { de: "Rückstoß", max: 2, anvil: 2 },
  looting: { de: "Plünderung", max: 3, anvil: 4 },
  loyalty: { de: "Treue", max: 3, anvil: 2 },
  luck_of_the_sea: { de: "Glück des Meeres", max: 3, anvil: 4 },
  lunge: { de: "Ausfallschritt", max: 3, anvil: 2 },
  lure: { de: "Köder", max: 3, anvil: 4 },
  mending: { de: "Reparatur", max: 1, anvil: 4 },
  multishot: { de: "Mehrfachschuss", max: 1, anvil: 4 },
  piercing: { de: "Durchschuss", max: 4, anvil: 1 },
  power: { de: "Stärke", max: 5, anvil: 1 },
  projectile_protection: { de: "Schussschutz", max: 4, anvil: 2 },
  protection: { de: "Schutz", max: 4, anvil: 1 },
  punch: { de: "Schlag", max: 2, anvil: 4 },
  quick_charge: { de: "Schnellladen", max: 3, anvil: 2 },
  respiration: { de: "Atmung", max: 3, anvil: 4 },
  riptide: { de: "Sog", max: 3, anvil: 4 },
  sharpness: { de: "Schärfe", max: 5, anvil: 1 },
  silk_touch: { de: "Behutsamkeit", max: 1, anvil: 8 },
  smite: { de: "Bann", max: 5, anvil: 2 },
  sweeping_edge: { de: "Schwungkraft", max: 3, anvil: 4 },
  thorns: { de: "Dornen", max: 3, anvil: 8 },
  unbreaking: { de: "Haltbarkeit", max: 3, anvil: 2 },
};

export const EXCLUSIVE = [
  ["sharpness", "smite", "bane_of_arthropods", "impaling", "density", "breach"],
  ["fortune", "silk_touch"],
  ["riptide", "loyalty"],
  ["riptide", "channeling"],
  ["infinity", "mending"],
  ["frost_walker", "depth_strider"],
  ["multishot", "piercing"],
  ["protection", "blast_protection", "fire_protection", "projectile_protection"],
];

const PROT = {
  title: "Schutz",
  options: ["protection", "fire_protection", "blast_protection", "projectile_protection"],
};
const MINE = { title: "Abbau", options: ["fortune", "silk_touch"] };
const COMMON = ["unbreaking", "mending"];

export const GEAR = [
  { id: "sword", title: "Schwert", icon: "diamond_sword", group: "Waffen", base: ["sharpness", "looting", "sweeping_edge", "fire_aspect", ...COMMON] },
  { id: "spear", title: "Speer", icon: "diamond_spear", group: "Waffen", base: ["lunge", "looting", "fire_aspect", ...COMMON], choices: [{ title: "Schaden", options: ["sharpness", "smite", "bane_of_arthropods"] }] },
  { id: "mace", title: "Streitkolben", icon: "mace", group: "Waffen", note: "Windstoß gibt es bei keinem Villager, nur aus Tresoren.", kits: [
    { title: "PvP", note: "Geht durch Rüstung.", books: ["breach", "fire_aspect", ...COMMON] },
    { title: "Fall-Schaden", note: "Der härteste Treffer aus großer Höhe.", books: ["density", "fire_aspect", ...COMMON] },
    { title: "PvE", note: "Extra Schaden gegen Untote.", books: ["smite", "fire_aspect", ...COMMON] },
  ] },
  { id: "bow", title: "Bogen", icon: "bow", group: "Waffen", base: ["power", "punch", "flame", "unbreaking"], choices: [{ title: "Pfeile oder Reparatur", options: ["infinity", "mending"] }] },
  { id: "crossbow", title: "Armbrust", icon: "crossbow", group: "Waffen", base: ["quick_charge", ...COMMON], choices: [{ title: "Schuss", options: ["multishot", "piercing"] }] },
  { id: "trident", title: "Dreizack", icon: "trident", group: "Waffen", kits: [
    { title: "PvP", note: "Kommt zurück, ruft bei Gewitter Blitze.", books: ["loyalty", "channeling", ...COMMON] },
    { title: "PvE", note: "Wie PvP, dazu extra Schaden gegen Wassermobs.", books: ["loyalty", "impaling", "channeling", ...COMMON] },
    { title: "Flug", note: "Schleudert dich bei Regen und im Wasser. Nicht zum Werfen.", books: ["riptide", ...COMMON] },
  ] },
  { id: "helmet", title: "Helm", icon: "diamond_helmet", group: "Rüstung", base: ["respiration", "aqua_affinity", ...COMMON], choices: [PROT], extras: ["thorns"] },
  { id: "chestplate", title: "Brustpanzer", icon: "diamond_chestplate", group: "Rüstung", base: [...COMMON], choices: [PROT], extras: ["thorns"] },
  { id: "leggings", title: "Hose", icon: "diamond_leggings", group: "Rüstung", base: [...COMMON], choices: [PROT], extras: ["thorns"] },
  { id: "boots", title: "Stiefel", icon: "diamond_boots", group: "Rüstung", base: ["feather_falling", ...COMMON], choices: [PROT, { title: "Wasser oder Eis", options: ["depth_strider", "frost_walker"] }], extras: ["thorns"] },
  { id: "pickaxe", title: "Spitzhacke", icon: "diamond_pickaxe", group: "Werkzeuge", base: ["efficiency", ...COMMON], choices: [MINE] },
  { id: "axe", title: "Axt", icon: "diamond_axe", group: "Werkzeuge", base: ["efficiency", ...COMMON], choices: [MINE, { title: "Schaden", options: [null, "sharpness", "smite", "bane_of_arthropods"] }] },
  { id: "shovel", title: "Schaufel", icon: "diamond_shovel", group: "Werkzeuge", base: ["efficiency", ...COMMON], choices: [MINE] },
  { id: "hoe", title: "Hacke", icon: "diamond_hoe", group: "Werkzeuge", base: ["efficiency", ...COMMON], choices: [MINE] },
  { id: "rod", title: "Angel", icon: "fishing_rod", group: "Werkzeuge", base: ["luck_of_the_sea", "lure", ...COMMON] },
];

export const CATEGORIES = [
  { title: "Allround", color: "#ffaa00", ids: ["unbreaking", "mending"] },
  { title: "Schwert", color: "#ff5555", ids: ["sharpness", "smite", "bane_of_arthropods", "sweeping_edge", "fire_aspect", "looting", "knockback"] },
  { title: "Mace & Speer", color: "#ff55ff", ids: ["breach", "density", "lunge"] },
  { title: "Bogen", color: "#55ff55", ids: ["power", "punch", "flame", "infinity"] },
  { title: "Armbrust", color: "#55ffff", ids: ["quick_charge", "multishot", "piercing"] },
  { title: "Werkzeug", color: "#ffff55", ids: ["efficiency", "fortune", "silk_touch"] },
  { title: "Angel", color: "#7f7fff", ids: ["luck_of_the_sea", "lure"] },
  { title: "Dreizack", color: "#00aaaa", ids: ["impaling", "loyalty", "riptide", "channeling"] },
  { title: "Rüstung", color: "#aaaaaa", ids: ["aqua_affinity", "respiration", "protection", "fire_protection", "blast_protection", "projectile_protection", "thorns", "feather_falling", "depth_strider", "frost_walker"] },
];

export function roman(n) {
  const numerals = ["", "I", "II", "III", "IV", "V"];
  return numerals[n] ?? String(n);
}

export function bookLabel(id) {
  const enc = ENCHANTS[id];
  if (!enc) return id;
  if (enc.max === 1) return enc.de;
  return `${enc.de} ${roman(enc.max)}`;
}

export function bookValue(id) {
  const enc = ENCHANTS[id];
  if (!enc) return 1;
  return Math.max(1, Math.floor(enc.anvil / 2)) * enc.max;
}

export function xpForLevel(l) {
  if (l <= 0) return 0;
  if (l <= 16) return l * l + 6 * l;
  if (l <= 31) return Math.round(2.5 * l * l - 40.5 * l + 360);
  return Math.round(4.5 * l * l - 162.5 * l + 2220);
}

export function anvilPlan(ids) {
  if (!ids || ids.length === 0) {
    return { steps: [], total: 0, maxStep: 0 };
  }
  const n = ids.length;
  const fullMask = (1 << n) - 1;

  const valOfMask = new Array(1 << n);
  valOfMask[0] = 0;
  for (let mask = 1; mask <= fullMask; mask++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if ((mask & (1 << i)) !== 0) {
        sum += bookValue(ids[i]);
      }
    }
    valOfMask[mask] = sum;
  }

  const book = Array.from({ length: 1 << n }, () => new Map());
  const item = Array.from({ length: 1 << n }, () => new Map());

  for (let i = 0; i < n; i++) {
    const mask = 1 << i;
    book[mask].set(0, {
      total: 0,
      maxStep: 0,
      type: "book",
      mask,
      work: 0,
      isLeaf: true,
    });
  }

  item[0].set(0, {
    total: 0,
    maxStep: 0,
    type: "item",
    mask: 0,
    work: 0,
    isLeaf: true,
  });

  function isBetter(newTotal, newMax, cur) {
    if (!cur) return true;
    if (newTotal < cur.total) return true;
    if (newTotal === cur.total && newMax < cur.maxStep) return true;
    return false;
  }

  for (let sz = 2; sz <= n; sz++) {
    for (let mask = 1; mask <= fullMask; mask++) {
      let cnt = 0;
      for (let t = mask; t > 0; t &= t - 1) cnt++;
      if (cnt !== sz) continue;

      for (let L = (mask - 1) & mask; L > 0; L = (L - 1) & mask) {
        const R = mask ^ L;
        if (R === 0) continue;

        const leftMap = book[L];
        const rightMap = book[R];
        if (leftMap.size === 0 || rightMap.size === 0) continue;

        const sacrificeVal = valOfMask[R];

        for (const [w_L, leftState] of leftMap.entries()) {
          const leftWorkCost = (1 << w_L) - 1;
          for (const [w_R, rightState] of rightMap.entries()) {
            const cost = sacrificeVal + leftWorkCost + ((1 << w_R) - 1);
            if (cost >= 40) continue;

            const newWork = Math.max(w_L, w_R) + 1;
            const newTotal = leftState.total + rightState.total + cost;
            const newMax = Math.max(leftState.maxStep, rightState.maxStep, cost);

            const cur = book[mask].get(newWork);
            if (isBetter(newTotal, newMax, cur)) {
              book[mask].set(newWork, {
                total: newTotal,
                maxStep: newMax,
                type: "book",
                mask,
                work: newWork,
                left: leftState,
                right: rightState,
                cost,
              });
            }
          }
        }
      }
    }
  }

  for (let sz = 1; sz <= n; sz++) {
    for (let mask = 1; mask <= fullMask; mask++) {
      let cnt = 0;
      for (let t = mask; t > 0; t &= t - 1) cnt++;
      if (cnt !== sz) continue;

      const submasks = [0];
      for (let L = (mask - 1) & mask; L > 0; L = (L - 1) & mask) {
        submasks.push(L);
      }

      for (const L of submasks) {
        const R = mask ^ L;
        if (R === 0) continue;

        const leftItemMap = item[L];
        const rightBookMap = book[R];
        if (leftItemMap.size === 0 || rightBookMap.size === 0) continue;

        const sacrificeVal = valOfMask[R];

        for (const [w_L, leftState] of leftItemMap.entries()) {
          const leftWorkCost = (1 << w_L) - 1;
          for (const [w_R, rightState] of rightBookMap.entries()) {
            const cost = sacrificeVal + leftWorkCost + ((1 << w_R) - 1);
            if (cost >= 40) continue;

            const newWork = Math.max(w_L, w_R) + 1;
            const newTotal = leftState.total + rightState.total + cost;
            const newMax = Math.max(leftState.maxStep, rightState.maxStep, cost);

            const cur = item[mask].get(newWork);
            if (isBetter(newTotal, newMax, cur)) {
              item[mask].set(newWork, {
                total: newTotal,
                maxStep: newMax,
                type: "item",
                mask,
                work: newWork,
                left: leftState,
                right: rightState,
                cost,
              });
            }
          }
        }
      }
    }
  }

  const fullItemMap = item[fullMask];
  if (!fullItemMap || fullItemMap.size === 0) {
    return null;
  }

  let best = null;
  for (const state of fullItemMap.values()) {
    if (isBetter(state.total, state.maxStep, best)) {
      best = state;
    }
  }

  if (!best) return null;

  function maskToIds(m) {
    const res = [];
    for (let i = 0; i < n; i++) {
      if ((m & (1 << i)) !== 0) {
        res.push(ids[i]);
      }
    }
    return res;
  }

  const steps = [];
  function emit(node) {
    if (node.isLeaf) return;
    emit(node.left);
    emit(node.right);
    steps.push({
      left: {
        item: node.left.type === "item",
        books: maskToIds(node.left.mask),
      },
      right: {
        books: maskToIds(node.right.mask),
      },
      cost: node.cost,
    });
  }

  emit(best);

  return {
    steps,
    total: best.total,
    maxStep: best.maxStep,
  };
}

// Preise der Sammelübersicht (Em + Buch), gelten statt der Weltdaten.
const PRICES = {
  sharpness: 26, smite: 23, bane_of_arthropods: 23, sweeping_edge: 11, fire_aspect: 11, looting: 15, knockback: 11,
  lunge: 16, density: 23, breach: 20, power: 23, punch: 11, flame: 6, infinity: 6, quick_charge: 16, multishot: 7, piercing: 20,
  impaling: 23, loyalty: 16, riptide: 16, channeling: 7, efficiency: 23, fortune: 14, silk_touch: 6, luck_of_the_sea: 16, lure: 16,
  protection: 14, fire_protection: 20, blast_protection: 20, projectile_protection: 20, feather_falling: 19, depth_strider: 13,
  frost_walker: 22, aqua_affinity: 7, thorns: 11, unbreaking: 13, mending: 8,
};

export function offerIndex(data) {
  const map = new Map();
  if (!data) return map;
  const villagers = [...(data.hall ?? []), ...(data.others ?? [])];
  for (const v of villagers) {
    for (const t of (v.trades ?? [])) {
      if (t.sell?.id !== "enchanted_book") continue;
      if (t.buy?.id !== "emerald") continue;
      if (!Array.isArray(t.ench) || t.ench.length !== 1) continue;
      const ench = t.ench[0];
      const maxLvl = ENCHANTS[ench.id]?.max;
      if (maxLvl == null || ench.lvl !== maxLvl) continue;

      const soldOut = Boolean(t.maxUses > 0 && t.uses >= t.maxUses);
      const price = PRICES[ench.id] ?? t.price;
      const where = v.wing != null
        ? `${v.wing === "W" ? "Westreihe" : "Ostreihe"}, Zelle ${v.cell + 1}`
        : `${v.x} ${v.y} ${v.z}`;

      const candidate = {
        price,
        where,
        x: v.x,
        y: v.y,
        z: v.z,
        soldOut,
      };

      const existing = map.get(ench.id);
      if (!existing) {
        map.set(ench.id, candidate);
      } else {
        if (existing.soldOut && !candidate.soldOut) {
          map.set(ench.id, candidate);
        } else if (!existing.soldOut && candidate.soldOut) {
          // Keep in-stock existing
        } else if (candidate.price < existing.price) {
          map.set(ench.id, candidate);
        }
      }
    }
  }
  return map;
}

export function defaultSelection(gear) {
  return {
    kit: 0,
    choices: gear.choices ? gear.choices.map(() => 0) : [],
    extras: [],
  };
}

export function gearBooks(gear, sel) {
  if (gear.kits) {
    const k = gear.kits[sel?.kit ?? 0];
    return k ? [...k.books] : [];
  }
  const list = [...(gear.base ?? [])];
  if (gear.choices && sel?.choices) {
    for (let i = 0; i < gear.choices.length; i++) {
      const optIdx = sel.choices[i] ?? 0;
      const opt = gear.choices[i].options[optIdx];
      if (opt != null) {
        list.push(opt);
      }
    }
  }
  if (sel?.extras) {
    for (const extra of sel.extras) {
      if (extra != null) {
        list.push(extra);
      }
    }
  }
  return list;
}

export function summary(picks, index) {
  const items = [];
  let emeralds = 0;
  let blankBooks = 0;
  let missing = 0;
  let levels = 0;
  let xp = 0;

  for (const pick of picks) {
    const bookIds = gearBooks(pick.gear, pick.sel);
    const books = [];
    let itemEmeralds = 0;

    for (const id of bookIds) {
      const offer = index ? index.get(id) ?? null : null;
      books.push({ id, offer });
      if (offer) {
        itemEmeralds += offer.price;
        blankBooks++;
      } else {
        missing++;
      }
    }

    const plan = anvilPlan(bookIds);
    if (plan) {
      levels += plan.total;
      for (const step of plan.steps) {
        xp += xpForLevel(step.cost);
      }
    }

    emeralds += itemEmeralds;
    items.push({
      gear: pick.gear,
      books,
      emeralds: itemEmeralds,
      plan,
    });
  }

  return {
    items,
    emeralds,
    blankBooks,
    levels,
    xp,
    missing,
  };
}

function formatTradeLine(t) {
  const buyPart = `${t.buy.count} ${t.buy.name}`;
  const buy2Part = t.buy2 ? ` + ${t.buy2.count} ${t.buy2.name}` : "";
  const sellPart = `${t.sell.count} ${t.sell.name}`;
  return `${buyPart}${buy2Part} → ${sellPart}`;
}

export function renderVillager(appEl, root, data) {
  appEl.textContent = "";

  const hallBtn = el("a", { href: "#halle", class: "btn" }, "Halle");
  const rechnerBtn = el("a", { href: "#rechner", class: "btn" }, "Rechner");
  const navTabs = el("div", { class: "vl-tabs" }, [hallBtn, rechnerBtn]);

  const hallSection = el("section", { id: "vl-halle" });
  const rechnerSection = el("section", { id: "vl-rechner" });

  function updateTab() {
    const isRechner = window.location.hash === "#rechner";
    hallBtn.classList.toggle("vl-on", !isRechner);
    rechnerBtn.classList.toggle("vl-on", isRechner);
    if (isRechner) {
      hallSection.setAttribute("hidden", "");
      rechnerSection.removeAttribute("hidden");
    } else {
      rechnerSection.setAttribute("hidden", "");
      hallSection.removeAttribute("hidden");
    }
  }

  window.addEventListener("hashchange", updateTab);

  // -------------------------------------------------------------
  // Halle section
  // -------------------------------------------------------------
  if (!data || !data.hall || data.hall.length === 0) {
    hallSection.appendChild(el("p", { class: "empty-msg" }, "Noch keine Villager-Daten."));
  } else {
    const n = data.hall.length;

    const searchInput = el("input", {
      type: "search",
      placeholder: "Buch suchen, z.B. Schärfe oder Bogen",
      "aria-label": "Buch suchen",
      class: "vl-search",
    });

    // Legend line
    const legendItems = CATEGORIES.map((cat) =>
      el("span", { class: "vl-legend-item" }, [
        el("span", { class: "vl-legend-swatch", style: { backgroundColor: cat.color } }),
        el("span", {}, cat.title),
      ])
    );
    const legendEl = el("div", { class: "vl-legend" }, legendItems);

    const headerPanel = el("div", { class: "panel vl-header-panel" }, [
      el("h1", { class: "vl-big" }, `${n} Bibliothekare · alle Bücher auf Maximum`),
      el(
        "p",
        { class: "vl-sub" },
        `Jeder Tausch braucht dazu 1 leeres Buch. Preise ohne Rabatt durch Ruf oder Held des Dorfes. Stand der Welt: ${relTime(data.updated)}.`
      ),
      searchInput,
      legendEl,
    ]);
    hallSection.appendChild(headerPanel);

    const noMatchMsg = el("p", { class: "panel empty-msg", hidden: true, style: { display: "none" } }, "Kein Buch gefunden.");
    hallSection.appendChild(noMatchMsg);

    // Floor plan
    const hallPlan = el("div", { class: "vl-hall" });
    hallPlan.appendChild(el("div", { class: "vl-door" }, "Nordtür"));

    const westHeading = el("h3", {}, "Westreihe");
    const eastHeading = el("h3", {}, "Ostreihe");
    const westCol = el("div", { class: "vl-col" }, [westHeading]);
    const eastCol = el("div", { class: "vl-col" }, [eastHeading]);
    const aisle = el("div", { class: "vl-aisle" }, [westCol, eastCol]);
    hallPlan.appendChild(aisle);
    hallPlan.appendChild(el("div", { class: "vl-door" }, "Südtür"));
    hallSection.appendChild(hallPlan);

    const allRowEls = [];

    function createVillagerRow(v) {
      const bookTrade = (v.trades ?? []).find(
        (t) => t.sell?.id === "enchanted_book" && Array.isArray(t.ench) && t.ench.length > 0
      );

      let tradeName = "Kein Buch";
      let category = null;
      let price = 0;
      let isSoldOut = false;
      let uses = 0;
      let maxUses = 0;

      if (bookTrade) {
        const ench = bookTrade.ench[0];
        tradeName = ench.lvl === 1 && ENCHANTS[ench.id]?.max === 1 ? ench.name : `${ench.name} ${roman(ench.lvl)}`;
        category = CATEGORIES.find((c) => c.ids.includes(ench.id)) ?? null;
        price = bookTrade.price;
        uses = bookTrade.uses ?? 0;
        maxUses = bookTrade.maxUses ?? 0;
        isSoldOut = maxUses > 0 && uses >= maxUses;
      } else if (v.trades && v.trades.length > 0) {
        tradeName = v.trades[0].sell?.name ?? "Kein Buch";
        price = v.trades[0].price;
        uses = v.trades[0].uses ?? 0;
        maxUses = v.trades[0].maxUses ?? 0;
        isSoldOut = maxUses > 0 && uses >= maxUses;
      }

      const rowAttrs = { class: "vl-row" };
      if (category) {
        rowAttrs.style = { borderLeftColor: category.color };
      }
      const row = el("details", rowAttrs);

      const tradeReq = el("span", { class: "vl-trade-req" }, [
        el("span", { class: "vl-plus" }, "+"),
        el("img", { src: `${root}assets/items/book.png`, width: "20", height: "20", class: "vl-dim", alt: "" }),
        el("span", { class: "vl-arrow" }, "→"),
      ]);

      const summaryChildren = [
        el("div", { class: "vl-price-box" }, [
          el("img", { src: `${root}assets/items/emerald.png`, width: "20", height: "20", alt: "" }),
          el("span", {}, String(price)),
        ]),
        tradeReq,
        el("img", { src: `${root}assets/items/enchanted_book.png`, width: "32", height: "32", alt: "" }),
        el("span", { class: "vl-row-name" }, tradeName),
      ];

      row.appendChild(el("summary", {}, summaryChildren));

      const otherTrades = (v.trades ?? []).filter((t) => t !== bookTrade);
      const otherTradeEls = otherTrades.map((t) =>
        el("div", { class: "vl-other-trade" }, formatTradeLine(t))
      );

      const stockEl = isSoldOut
        ? el("span", { style: { color: "#ff5555" } }, "Ausverkauft")
        : el("span", { class: "vl-stock-text" }, `Vorrat: ${maxUses - uses} von ${maxUses}`);

      const infoRow = el("div", { class: "vl-row-info" }, [
        el("span", { class: "slot" }, `${v.x} ${v.y} ${v.z}`),
        stockEl,
        el("a", { href: mapLink(root, { dim: "overworld", x: v.x, y: v.y, z: v.z }), class: "btn" }, "Auf der Karte"),
      ]);

      const body = el("div", { class: "vl-row-body" }, [
        infoRow,
        ...otherTradeEls,
      ]);

      row.appendChild(body);

      const searchKey = `${tradeName} ${category ? category.title : ""}`.toLowerCase();
      allRowEls.push({ row, searchKey, wing: v.wing });
      return row;
    }

    const wVillagers = data.hall.filter((v) => v.wing === "W").sort((a, b) => a.cell - b.cell);
    const eVillagers = data.hall.filter((v) => v.wing === "E").sort((a, b) => a.cell - b.cell);

    for (const v of wVillagers) {
      westCol.appendChild(createVillagerRow(v));
    }
    for (const v of eVillagers) {
      eastCol.appendChild(createVillagerRow(v));
    }

    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();
      let matchCount = 0;
      let westCount = 0;
      let eastCount = 0;
      for (const item of allRowEls) {
        const matches = q === "" || item.searchKey.includes(q);
        item.row.style.display = matches ? "" : "none";
        if (matches) {
          matchCount++;
          if (item.wing === "W") westCount++;
          else if (item.wing === "E") eastCount++;
        }
      }
      if (matchCount === 0) {
        hallPlan.setAttribute("hidden", "");
        hallPlan.style.display = "none";
        noMatchMsg.removeAttribute("hidden");
        noMatchMsg.style.display = "";
      } else {
        hallPlan.removeAttribute("hidden");
        hallPlan.style.display = "";
        noMatchMsg.setAttribute("hidden", "");
        noMatchMsg.style.display = "none";

        if (westCount === 0) {
          westHeading.setAttribute("hidden", "");
          westHeading.style.display = "none";
        } else {
          westHeading.removeAttribute("hidden");
          westHeading.style.display = "";
        }

        if (eastCount === 0) {
          eastHeading.setAttribute("hidden", "");
          eastHeading.style.display = "none";
        } else {
          eastHeading.removeAttribute("hidden");
          eastHeading.style.display = "";
        }
      }
    });

    // Other villagers
    if (data.others && data.others.length > 0) {
      hallSection.appendChild(el("h2", { class: "section-title" }, "Andere Dorfbewohner"));

      const groups = new Map();
      for (const v of data.others) {
        const key = v.profName || v.prof;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(v);
      }

      for (const [profTitle, list] of groups.entries()) {
        const profDetails = el("details", { class: "panel vl-prof" });
        profDetails.appendChild(el("summary", {}, `${profTitle} (${list.length})`));

        for (const v of list) {
          const vBox = el("div", { class: "vl-other-villager" });
          const lineHead = el("div", { class: "vl-other-head" }, [
            el("span", {}, `Stufe ${v.level} · ${v.x} ${v.y} ${v.z} `),
            el("a", { href: mapLink(root, { dim: "overworld", x: v.x, y: v.y, z: v.z }), class: "btn vl-map-btn" }, "Karte"),
          ]);
          vBox.appendChild(lineHead);

          for (const t of (v.trades ?? [])) {
            vBox.appendChild(el("div", { class: "vl-other-trade" }, formatTradeLine(t)));
          }
          profDetails.appendChild(vBox);
        }
        hallSection.appendChild(profDetails);
      }
    }

    hallSection.appendChild(
      el("div", { class: "panel vl-idle-panel" }, [
        el("p", { class: "vl-sub", style: { margin: "0" } }, `Dazu ${data.idle ?? 0} Dorfbewohner ohne Beruf oder Handel.`),
      ])
    );
  }

  // -------------------------------------------------------------
  // Rechner section
  // -------------------------------------------------------------
  const idx = offerIndex(data);
  const picks = new Map();
  const swordGear = GEAR.find((g) => g.id === "sword");
  if (swordGear) {
    picks.set("sword", defaultSelection(swordGear));
  }

  const selectorPanel = el("div", { class: "panel vl-selector-panel" });
  selectorPanel.appendChild(el("h1", { class: "vl-big" }, "Was willst du verzaubern?"));

  const tileButtons = new Map();
  const groupsOrder = ["Waffen", "Rüstung", "Werkzeuge"];

  for (const group of groupsOrder) {
    const gearInGroup = GEAR.filter((g) => g.group === group);
    if (gearInGroup.length === 0) continue;

    const groupEl = el("div", { class: "vl-gear-group" });
    groupEl.appendChild(el("div", { class: "vl-group-title" }, group));

    const tilesRow = el("div", { class: "vl-tiles" });
    for (const gear of gearInGroup) {
      const tileBtn = el("button", {
        type: "button",
        class: "vl-tile",
        "aria-pressed": picks.has(gear.id) ? "true" : "false",
      }, [
        el("img", { src: `${root}assets/items/${gear.icon}.png`, width: "40", height: "40", alt: "" }),
        el("span", {}, gear.title),
      ]);

      tileBtn.addEventListener("click", () => {
        if (picks.has(gear.id)) {
          picks.delete(gear.id);
          tileBtn.setAttribute("aria-pressed", "false");
        } else {
          picks.set(gear.id, defaultSelection(gear));
          tileBtn.setAttribute("aria-pressed", "true");
        }
        rebuildResults();
      });

      tileButtons.set(gear.id, tileBtn);
      tilesRow.appendChild(tileBtn);
    }
    groupEl.appendChild(tilesRow);
    selectorPanel.appendChild(groupEl);
  }

  rechnerSection.appendChild(selectorPanel);

  const resultsArea = el("div", { class: "vl-results" });
  rechnerSection.appendChild(resultsArea);

  function rebuildResults() {
    resultsArea.textContent = "";

    if (picks.size === 0) {
      resultsArea.appendChild(el("p", { class: "vl-sub" }, "Wähl oben was aus."));
      return;
    }

    const picksList = [];
    for (const g of GEAR) {
      if (picks.has(g.id)) {
        picksList.push({ gear: g, sel: picks.get(g.id) });
      }
    }

    const totalPanel = el("div", { class: "panel vl-total" });
    resultsArea.appendChild(totalPanel);

    const itemPanels = [];
    for (const itemPick of picksList) {
      const panel = createItemPanel(itemPick);
      itemPanels.push(panel);
      resultsArea.appendChild(panel.element);
    }

    function updateTotalAndLists() {
      const currentRes = summary(picksList, idx);

      // Update total panel
      totalPanel.textContent = "";
      const statsRow = el("div", { class: "vl-total-stats" }, [
        el("div", { class: "vl-total-item" }, [
          el("img", { src: `${root}assets/items/emerald.png`, width: "28", height: "28", alt: "" }),
          el("span", {}, `${currentRes.emeralds} Smaragde`),
        ]),
        el("div", { class: "vl-total-item" }, [
          el("img", { src: `${root}assets/items/book.png`, width: "28", height: "28", alt: "" }),
          el("span", {}, `${currentRes.blankBooks} leere Bücher`),
        ]),
        el("div", { class: "vl-total-item vl-total-level-item" }, [
          el("span", { class: "vl-level-main" }, `${currentRes.levels} Level`),
          el("span", { class: "vl-sub vl-xp-sub" }, `≈ ${currentRes.xp} XP-Punkte`),
        ]),
      ]);
      totalPanel.appendChild(statsRow);

      if (currentRes.missing > 0) {
        totalPanel.appendChild(
          el(
            "p",
            { style: { color: "#ff5555", margin: "4px 0" } },
            `${currentRes.missing} ${currentRes.missing === 1 ? "Buch" : "Bücher"} gibt es gerade bei keinem Villager, sie fehlen in der Summe.`
          )
        );
      }
      totalPanel.appendChild(
        el(
          "p",
          { class: "vl-sub", style: { margin: "4px 0 0" } },
          "Level: so viel zeigt der Amboss an. Die XP-Punkte gelten, wenn du jeden Schritt genau mit dem nötigen Level machst."
        )
      );

      // Update each item's book list & anvil plan
      for (let i = 0; i < currentRes.items.length; i++) {
        itemPanels[i].update(currentRes.items[i]);
      }
    }

    function createItemPanel(pick) {
      const gear = pick.gear;
      const sel = pick.sel;
      const panelEl = el("div", { class: "panel vl-item-panel" });

      const head = el("div", { class: "vl-item-head" }, [
        el("img", { src: `${root}assets/items/${gear.icon}.png`, width: "32", height: "32", alt: "" }),
        el("h3", {}, gear.title),
      ]);
      panelEl.appendChild(head);

      if (gear.note) {
        panelEl.appendChild(el("p", { class: "vl-sub" }, gear.note));
      }

      // Kits
      if (gear.kits) {
        const kitsBox = el("div", { class: "vl-kits-box" });
        gear.kits.forEach((kit, kIdx) => {
          const radio = el("input", {
            type: "radio",
            name: `kit-${gear.id}`,
            value: String(kIdx),
            class: "vl-visually-hidden",
          });
          if (sel.kit === kIdx) radio.checked = true;

          radio.addEventListener("change", () => {
            if (radio.checked) {
              sel.kit = kIdx;
              updateTotalAndLists();
            }
          });

          const chip = el("label", { class: "vl-chip" }, [
            radio,
            el("strong", {}, kit.title),
            el("span", { class: "vl-sub" }, kit.note),
          ]);
          kitsBox.appendChild(chip);
        });
        panelEl.appendChild(kitsBox);
      }

      // Choices
      if (gear.choices) {
        gear.choices.forEach((choice, cIdx) => {
          panelEl.appendChild(el("div", { class: "vl-choice-title" }, choice.title));
          const chipsRow = el("div", { class: "vl-chips" });
          choice.options.forEach((opt, oIdx) => {
            const radio = el("input", {
              type: "radio",
              name: `choice-${gear.id}-${cIdx}`,
              value: String(oIdx),
              class: "vl-visually-hidden",
            });
            if (sel.choices[cIdx] === oIdx) radio.checked = true;

            radio.addEventListener("change", () => {
              if (radio.checked) {
                sel.choices[cIdx] = oIdx;
                updateTotalAndLists();
              }
            });

            const chip = el("label", { class: "vl-chip" }, [
              radio,
              el("span", {}, opt === null ? "Kein" : bookLabel(opt)),
            ]);
            chipsRow.appendChild(chip);
          });
          panelEl.appendChild(chipsRow);
        });
      }

      // Extras
      if (gear.extras) {
        const extrasRow = el("div", { class: "vl-chips" });
        gear.extras.forEach((extra) => {
          const checkbox = el("input", {
            type: "checkbox",
            name: `extra-${gear.id}-${extra}`,
            value: extra,
            class: "vl-visually-hidden",
          });
          if (sel.extras.includes(extra)) checkbox.checked = true;

          checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
              if (!sel.extras.includes(extra)) sel.extras.push(extra);
            } else {
              sel.extras = sel.extras.filter((x) => x !== extra);
            }
            updateTotalAndLists();
          });

          const chip = el("label", { class: "vl-chip" }, [
            checkbox,
            el("span", {}, `+ ${bookLabel(extra)}`),
          ]);
          extrasRow.appendChild(chip);
        });
        panelEl.appendChild(extrasRow);
      }

      // Dynamic sub-container for books and anvil steps
      const contentEl = el("div", { class: "vl-item-content" });
      panelEl.appendChild(contentEl);

      function update(itemData) {
        contentEl.textContent = "";

        // Book list
        const bookListEl = el("div", { class: "vl-book-list" });
        for (const b of itemData.books) {
          const bRow = el("div", { class: "vl-book-row" });
          bRow.appendChild(
            el("img", { src: `${root}assets/items/enchanted_book.png`, width: "24", height: "24", alt: "" })
          );
          bRow.appendChild(el("span", { class: "vl-book-name" }, bookLabel(b.id)));

          if (b.offer) {
            const whereText = b.offer.soldOut
              ? el("span", { class: "vl-book-where" }, [
                  b.offer.where,
                  el("span", { style: { color: "#ff5555" } }, " (ausverkauft)"),
                ])
              : el("span", { class: "vl-book-where" }, b.offer.where);
            bRow.appendChild(whereText);

            bRow.appendChild(
              el("div", { class: "vl-book-price" }, [
                el("span", {}, String(b.offer.price)),
                el("img", { src: `${root}assets/items/emerald.png`, width: "20", height: "20", alt: "" }),
              ])
            );
          } else {
            bRow.appendChild(
              el("span", { class: "vl-book-where", style: { color: "#ff5555" } }, "nicht verfügbar")
            );
            bRow.appendChild(el("div", { class: "vl-book-price" }, "—"));
          }
          bookListEl.appendChild(bRow);
        }

        // Sum row
        const sumRow = el("div", { class: "vl-book-row vl-book-sum" }, [
          el("span", { class: "vl-book-name", style: { fontWeight: "bold" } }, "Summe"),
          el("span", { class: "vl-book-where" }, ""),
          el("div", { class: "vl-book-price", style: { fontWeight: "bold" } }, [
            el("span", {}, String(itemData.emeralds)),
            el("img", { src: `${root}assets/items/emerald.png`, width: "20", height: "20", alt: "" }),
          ]),
        ]);
        bookListEl.appendChild(sumRow);
        contentEl.appendChild(bookListEl);

        // Amboss-Reihenfolge
        const plan = itemData.plan;
        if (plan === null) {
          contentEl.appendChild(el("h4", { class: "vl-steps-title" }, "Amboss-Reihenfolge"));
          contentEl.appendChild(el("p", { style: { color: "#ff5555", fontWeight: "bold", margin: "4px 0" } }, "Zu teuer!"));
          contentEl.appendChild(
            el("p", { class: "vl-sub" }, "Kann nicht unter 40 Level pro Schritt kombiniert werden.")
          );
        } else if (plan.steps.length > 0) {
          contentEl.appendChild(el("h4", { class: "vl-steps-title" }, "Amboss-Reihenfolge"));
          const ol = el("ol", { class: "vl-steps" });

          for (const step of plan.steps) {
            let leftStr = "";
            if (step.left.item) {
              leftStr = gear.title;
            } else if (step.left.books.length === 1) {
              leftStr = bookLabel(step.left.books[0]);
            } else {
              leftStr = `[${step.left.books.map(bookLabel).join(", ")}]`;
            }

            let rightStr = "";
            if (step.right.books.length === 1) {
              rightStr = bookLabel(step.right.books[0]);
            } else {
              rightStr = `[${step.right.books.map(bookLabel).join(", ")}]`;
            }

            const stepText = step.left.item
              ? `${leftStr} + ${rightStr}`
              : `Buch: ${leftStr} + ${rightStr}`;

            ol.appendChild(
              el("li", { class: "vl-step" }, [
                el("div", { class: "vl-step-inner" }, [
                  el("span", { class: "vl-step-text" }, stepText),
                  el("strong", { class: "vl-step-cost" }, `${step.cost} Level`),
                ]),
              ])
            );
          }
          contentEl.appendChild(ol);
          contentEl.appendChild(
            el("p", { class: "vl-sub" }, `Gesamt ${plan.total} Level · größter Schritt ${plan.maxStep}`)
          );
        }
      }

      return {
        element: panelEl,
        update,
      };
    }

    updateTotalAndLists();
  }

  rebuildResults();

  appEl.appendChild(navTabs);
  appEl.appendChild(hallSection);
  appEl.appendChild(rechnerSection);

  updateTab();
}
