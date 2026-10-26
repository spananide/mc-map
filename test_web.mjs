import assert from "node:assert/strict";
import {
  relTime,
  motdSpans,
  rankOf,
  board,
  pathName,
  eventParts,
  fmt,
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

console.log("OK");
