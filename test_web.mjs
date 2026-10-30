import assert from "node:assert/strict";
import {
  relTime,
  motdSpans,
  rankOf,
  board,
  pathName,
  eventParts,
  fmt,
  colorSlots,
  stackDays,
  activityGrid,
  compareRows,
  LIVE_STATUS,
} from "./web/assets/app.js";

// 1. relTime
const t0 = "2026-10-26T12:00:00Z";
assert.equal(
  relTime(t0, Date.parse("2026-10-26T12:00:30Z")),
  "gerade eben"
);
assert.equal(
  relTime(t0, Date.parse("2026-10-26T12:05:00Z")),
  "vor 5 Min"
);
assert.equal(
  relTime(t0, Date.parse("2026-10-26T15:00:00Z")),
  "vor 3 Std"
);
assert.equal(
  relTime(t0, Date.parse("2026-10-27T12:00:00Z")),
  "vor 1 Tag"
);
assert.equal(
  relTime(t0, Date.parse("2026-10-28T12:00:00Z")),
  "vor 2 Tagen"
);

// 2. motdSpans
assert.deepEqual(motdSpans("§7Die §cFriedliche"), [
  {
    text: "Die ",
    color: "#AAAAAA",
    bold: false,
    italic: false,
    underline: false,
    strike: false,
  },
  {
    text: "Friedliche",
    color: "#FF5555",
    bold: false,
    italic: false,
    underline: false,
    strike: false,
  },
]);

assert.deepEqual(motdSpans("§lA§rB"), [
  {
    text: "A",
    color: "#FFFFFF",
    bold: true,
    italic: false,
    underline: false,
    strike: false,
  },
  {
    text: "B",
    color: "#FFFFFF",
    bold: false,
    italic: false,
    underline: false,
    strike: false,
  },
]);

// 3. rankOf
const players = [
  { uuid: "a", v: 5 },
  { uuid: "b", v: 9 },
  { uuid: "c", v: 5 },
];
assert.deepEqual(rankOf(players, (p) => p.v, "b"), { rank: 1, of: 3 });
assert.deepEqual(rankOf(players, (p) => p.v, "a"), { rank: 2, of: 3 });
assert.deepEqual(rankOf(players, (p) => p.v, "c"), { rank: 2, of: 3 });

// 4. pathName
assert.equal(pathName(".Steve"), "steve");
assert.equal(pathName("spananii"), "spananii");
assert.equal(pathName("...Steve"), "steve");

// 5. eventParts
assert.deepEqual(
  eventParts("{p} hat den Fortschritt [Monsterjäger] erzielt"),
  [
    { type: "player" },
    { type: "text", text: " hat den Fortschritt " },
    { type: "label", text: "Monsterjäger" },
    { type: "text", text: " erzielt" },
  ]
);

// 6. fmt
assert.equal(fmt(1234.56), "1.234,6");
assert.equal(fmt(3), "3");

// 7. board
assert.deepEqual(board([], (p) => p.v), []);
assert.deepEqual(board(null, (p) => p.v), []);

const boardPlayers = [
  { uuid: "a", v: 0 },
  { uuid: "b", v: 9 },
  { uuid: "c", v: 5 },
  { uuid: "d", v: 5 },
  { uuid: "e", v: 0 },
  { uuid: "f", v: 2 },
];
assert.deepEqual(board(boardPlayers, (p) => p.v), [
  { player: { uuid: "b", v: 9 }, value: 9, rank: 1 },
  { player: { uuid: "c", v: 5 }, value: 5, rank: 2 },
  { player: { uuid: "d", v: 5 }, value: 5, rank: 2 },
  { player: { uuid: "f", v: 2 }, value: 2, rank: 4 },
]);

assert.deepEqual(
  board(
    [
      { uuid: "a", v: 0 },
      { uuid: "b", v: 0 },
    ],
    (p) => p.v
  ),
  []
);

// 8. LIVE_STATUS constant
assert.equal(LIVE_STATUS, "https://mc-tick.spanani.workers.dev/status.json");

// 9. colorSlots (order by firstSeen, 9th -> #8a8a8a, stable when sorted differently on input)
const pList = [
  { uuid: "u1", name: "Alice", firstSeen: "2026-10-26T10:00:00Z" },
  { uuid: "u2", name: "Bob", firstSeen: "2026-10-26T11:00:00Z" },
  { uuid: "u3", name: "Charlie", firstSeen: "2026-10-26T12:00:00Z" },
  { uuid: "u4", name: "Dave", firstSeen: "2026-10-26T13:00:00Z" },
  { uuid: "u5", name: "Eve", firstSeen: "2026-10-26T14:00:00Z" },
  { uuid: "u6", name: "Frank", firstSeen: "2026-10-26T15:00:00Z" },
  { uuid: "u7", name: "Grace", firstSeen: "2026-10-26T16:00:00Z" },
  { uuid: "u8", name: "Heidi", firstSeen: "2026-10-26T17:00:00Z" },
  { uuid: "u9", name: "Ivan", firstSeen: "2026-10-26T18:00:00Z" },
];

const slots1 = colorSlots(pList);
assert.equal(slots1.get ? slots1.get("u1") : slots1["u1"], "#3987e5");
assert.equal(slots1.get ? slots1.get("u2") : slots1["u2"], "#d95926");
assert.equal(slots1.get ? slots1.get("u3") : slots1["u3"], "#199e70");
assert.equal(slots1.get ? slots1.get("u4") : slots1["u4"], "#c98500");
assert.equal(slots1.get ? slots1.get("u5") : slots1["u5"], "#d55181");
assert.equal(slots1.get ? slots1.get("u6") : slots1["u6"], "#008300");
assert.equal(slots1.get ? slots1.get("u7") : slots1["u7"], "#9085e9");
assert.equal(slots1.get ? slots1.get("u8") : slots1["u8"], "#e66767");
// 9th gets #8a8a8a
assert.equal(slots1.get ? slots1.get("u9") : slots1["u9"], "#8a8a8a");

// Stable when sorted differently on input
const reversedList = [...pList].reverse();
const slots2 = colorSlots(reversedList);
for (const p of pList) {
  assert.equal(
    slots2.get ? slots2.get(p.uuid) : slots2[p.uuid],
    slots1.get ? slots1.get(p.uuid) : slots1[p.uuid]
  );
}

// Same firstSeen -> sorted by name
const sameSeenList = [
  { uuid: "z", name: "Zack", firstSeen: "2026-10-26T10:00:00Z" },
  { uuid: "a", name: "Adam", firstSeen: "2026-10-26T10:00:00Z" },
];
const sameSlots = colorSlots(sameSeenList);
assert.equal(sameSlots.get ? sameSlots.get("a") : sameSlots["a"], "#3987e5");
assert.equal(sameSlots.get ? sameSlots.get("z") : sameSlots["z"], "#d95926");

// 10. stackDays (zero segments dropped, totals)
const hist = {
  days: ["2026-10-25", "2026-10-26"],
  players: [
    { uuid: "u1", name: "Alice", hours: [1.5, 0.0] },
    { uuid: "u2", name: "Bob", hours: [2.5, 3.0] },
  ],
};
const testSlots = new Map([
  ["u1", "#3987e5"],
  ["u2", "#d95926"],
]);
const stacked = stackDays(hist, testSlots);
assert.equal(stacked.length, 2);
// Day 1
assert.equal(stacked[0].day, "2026-10-25");
assert.equal(stacked[0].total, 4.0);
assert.deepEqual(stacked[0].segments, [
  { uuid: "u1", name: "Alice", hours: 1.5, color: "#3987e5" },
  { uuid: "u2", name: "Bob", hours: 2.5, color: "#d95926" },
]);
// Day 2 (Alice has 0 hours -> zero segment dropped)
assert.equal(stacked[1].day, "2026-10-26");
assert.equal(stacked[1].total, 3.0);
assert.deepEqual(stacked[1].segments, [
  { uuid: "u2", name: "Bob", hours: 3.0, color: "#d95926" },
]);

// 11. activityGrid (7x24, a sample in the right cell)
const actData = {
  "2026-10-26T20": 4,
};
const nowMs = Date.parse("2026-10-26T20:30:00Z");
const grid = activityGrid(actData, nowMs);
assert.equal(grid.length, 7);
for (const row of grid) {
  assert.equal(row.length, 24);
}
// Day 6 is newest (today, 2026-10-26 in Europe/Berlin), hour 20 has sample
assert.equal(grid[6][20], 4);
assert.equal(grid[6][19], 0);
assert.equal(grid[6][21], 0);
assert.equal(grid[0][20], 0);

// 12. compareRows (winner a / b / null)
const playerA = {
  main: { playtime_h: 10, diamonds: 5, deaths: 3 },
  more: { jumps: 100 },
};
const playerB = {
  main: { playtime_h: 8, diamonds: 12, deaths: 3 },
  more: { jumps: 100 },
};
const defs = [
  { key: "playtime_h", label: "Spielzeit" },
  { key: "diamonds", label: "Diamanten" },
  { key: "deaths", label: "Tode" },
  { key: "jumps", label: "Sprünge" },
];
const rows = compareRows(playerA, playerB, defs);
assert.deepEqual(rows, [
  { label: "Spielzeit", a: 10, b: 8, winner: "a" },
  { label: "Diamanten", a: 5, b: 12, winner: "b" },
  { label: "Tode", a: 3, b: 3, winner: null },
  { label: "Sprünge", a: 100, b: 100, winner: null },
]);

console.log("OK");
