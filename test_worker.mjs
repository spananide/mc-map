import assert from "node:assert/strict";
import worker, { _resetCache } from "./worker/index.js";

const env = {
  EXAROTON_SERVER: "srv-test",
  EXAROTON_TOKEN: "tok-test",
};

const calls = [];
let handler = null;

globalThis.fetch = async (url, options) => {
  calls.push({ url: String(url), options });
  if (handler) {
    return handler(String(url), options);
  }
  throw new Error(`Unhandled fetch: ${url}`);
};

// 1. offline (status: 0, max 3): 200, players [], exactly one exaroton call, CORS + Cache-Control headers present
_resetCache();
calls.length = 0;
handler = (url) => {
  if (url === `https://api.exaroton.com/v1/servers/${env.EXAROTON_SERVER}/`) {
    return new Response(
      JSON.stringify({
        data: {
          status: 0,
          players: { max: 3, list: [] },
        },
      }),
      { status: 200 }
    );
  }
  throw new Error(`Unexpected url: ${url}`);
};

const resOffline = await worker.fetch(new Request("https://worker.dev/players.json"), env);
assert.equal(resOffline.status, 200);
assert.equal(resOffline.headers.get("access-control-allow-origin"), "*");
assert.equal(resOffline.headers.get("cache-control"), "public, max-age=5");
assert.equal(resOffline.headers.get("content-type"), "application/json");

const dataOffline = await resOffline.json();
assert.equal(dataOffline.max, 3);
assert.deepEqual(dataOffline.players, []);
assert.equal(calls.length, 1);
assert.equal(calls[0].url, `https://api.exaroton.com/v1/servers/${env.EXAROTON_SERVER}/`);
assert.equal(calls[0].options?.headers?.Authorization, `Bearer ${env.EXAROTON_TOKEN}`);
assert.equal(calls[0].options?.headers?.["User-Agent"], "mc-tick");

// 2. online with list ["spananii"] and squaremap players for spananii and ghost: only spananii returned, health/armor kept
_resetCache();
calls.length = 0;
handler = (url) => {
  if (url === `https://api.exaroton.com/v1/servers/${env.EXAROTON_SERVER}/`) {
    return new Response(
      JSON.stringify({
        data: {
          status: 1,
          players: { max: 20, list: ["spananii"] },
        },
      }),
      { status: 200 }
    );
  }
  if (
    url ===
    `https://api.exaroton.com/v1/servers/${env.EXAROTON_SERVER}/files/data/plugins/squaremap/web/tiles/players.json/`
  ) {
    return new Response(
      JSON.stringify({
        max: 20,
        players: [
          {
            name: "spananii",
            uuid: "uuid-1",
            world: "world",
            x: 10,
            y: 64,
            z: 20,
            yaw: 180,
            health: 18,
            armor: 12,
          },
          {
            name: "ghost",
            uuid: "uuid-2",
            world: "world",
            x: 0,
            y: 64,
            z: 0,
            yaw: 0,
            health: 20,
            armor: 0,
          },
        ],
      }),
      { status: 200 }
    );
  }
  throw new Error(`Unexpected url: ${url}`);
};

const resOnline = await worker.fetch(new Request("https://worker.dev/players.json"), env);
assert.equal(resOnline.status, 200);
const dataOnline = await resOnline.json();
assert.equal(dataOnline.max, 20);
assert.equal(dataOnline.players.length, 1);
assert.equal(dataOnline.players[0].name, "spananii");
assert.equal(dataOnline.players[0].health, 18);
assert.equal(dataOnline.players[0].armor, 12);
assert.equal(calls.length, 2);

// 3. second call within 5 s returns the cached body without new fetch calls (reset the cache between cases)
calls.length = 0;
handler = () => {
  throw new Error("Should not fetch when cached");
};

const resCached = await worker.fetch(new Request("https://worker.dev/players.json"), env);
assert.equal(resCached.status, 200);
const dataCached = await resCached.json();
assert.deepEqual(dataCached, dataOnline);
assert.equal(calls.length, 0);

// 4. exaroton 500: status 502, players []
_resetCache();
calls.length = 0;
handler = () => {
  return new Response("Internal Server Error", { status: 500 });
};

const res500 = await worker.fetch(new Request("https://worker.dev/players.json"), env);
assert.equal(res500.status, 502);
assert.equal(res500.headers.get("content-type"), "application/json");
assert.equal(res500.headers.get("access-control-allow-origin"), "*");
assert.equal(res500.headers.get("cache-control"), "public, max-age=5");
const data500 = await res500.json();
assert.equal(data500.max, 0);
assert.deepEqual(data500.players, []);

// 5. /other: 404
const resOther = await worker.fetch(new Request("https://worker.dev/other"), env);
assert.equal(resOther.status, 404);
const textOther = await resOther.text();
assert.equal(textOther, "Not found");

// OPTIONS preflight
const resOptions = await worker.fetch(
  new Request("https://worker.dev/players.json", { method: "OPTIONS" }),
  env
);
assert.equal(resOptions.status, 204);
assert.equal(resOptions.headers.get("access-control-allow-origin"), "*");

// 6. /status.json offline: 200, online: false, max: 3, players: [], motd: "Offline MOTD"
_resetCache();
calls.length = 0;
handler = (url) => {
  if (url === `https://api.exaroton.com/v1/servers/${env.EXAROTON_SERVER}/`) {
    return new Response(
      JSON.stringify({
        data: {
          status: 0,
          players: { max: 3, list: [] },
          motd: "Offline MOTD",
        },
      }),
      { status: 200 }
    );
  }
  throw new Error(`Unexpected url: ${url}`);
};

const resStatusOffline = await worker.fetch(new Request("https://worker.dev/status.json"), env);
assert.equal(resStatusOffline.status, 200);
assert.equal(resStatusOffline.headers.get("access-control-allow-origin"), "*");
assert.equal(resStatusOffline.headers.get("cache-control"), "public, max-age=5");
assert.equal(resStatusOffline.headers.get("content-type"), "application/json");

const dataStatusOffline = await resStatusOffline.json();
assert.equal(dataStatusOffline.online, false);
assert.equal(dataStatusOffline.max, 3);
assert.deepEqual(dataStatusOffline.players, []);
assert.equal(dataStatusOffline.motd, "Offline MOTD");
assert.equal(calls.length, 1);

// 7. /status.json online: 200, online: true, max: 20, players: ["spananii"], motd: "Online MOTD"
_resetCache();
calls.length = 0;
handler = (url) => {
  if (url === `https://api.exaroton.com/v1/servers/${env.EXAROTON_SERVER}/`) {
    return new Response(
      JSON.stringify({
        data: {
          status: 1,
          players: { max: 20, list: ["spananii"] },
          motd: "Online MOTD",
        },
      }),
      { status: 200 }
    );
  }
  throw new Error(`Unexpected url: ${url}`);
};

const resStatusOnline = await worker.fetch(new Request("https://worker.dev/status.json"), env);
assert.equal(resStatusOnline.status, 200);
const dataStatusOnline = await resStatusOnline.json();
assert.equal(dataStatusOnline.online, true);
assert.equal(dataStatusOnline.max, 20);
assert.deepEqual(dataStatusOnline.players, ["spananii"]);
assert.equal(dataStatusOnline.motd, "Online MOTD");
assert.equal(calls.length, 1);

// 8. Shared cache: status fetched once for a /status.json and a /players.json call within 5 s
_resetCache();
calls.length = 0;
handler = (url) => {
  if (url === `https://api.exaroton.com/v1/servers/${env.EXAROTON_SERVER}/`) {
    return new Response(
      JSON.stringify({
        data: {
          status: 1,
          players: { max: 20, list: ["spananii"] },
          motd: "Shared MOTD",
        },
      }),
      { status: 200 }
    );
  }
  if (
    url ===
    `https://api.exaroton.com/v1/servers/${env.EXAROTON_SERVER}/files/data/plugins/squaremap/web/tiles/players.json/`
  ) {
    return new Response(
      JSON.stringify({
        max: 20,
        players: [{ name: "spananii", uuid: "uuid-1" }],
      }),
      { status: 200 }
    );
  }
  throw new Error(`Unexpected url: ${url}`);
};

// First call: /status.json -> fetches exaroton server status
const resSharedStatus = await worker.fetch(new Request("https://worker.dev/status.json"), env);
assert.equal(resSharedStatus.status, 200);
assert.equal(calls.length, 1);
assert.equal(calls[0].url, `https://api.exaroton.com/v1/servers/${env.EXAROTON_SERVER}/`);

// Second call: /players.json within 5s -> reuses cached server status, only fetches squaremap players
const resSharedPlayers = await worker.fetch(new Request("https://worker.dev/players.json"), env);
assert.equal(resSharedPlayers.status, 200);
assert.equal(calls.length, 2);
assert.equal(
  calls[1].url,
  `https://api.exaroton.com/v1/servers/${env.EXAROTON_SERVER}/files/data/plugins/squaremap/web/tiles/players.json/`
);

// Third call: /status.json again within 5s -> zero additional fetches
const resSharedStatus2 = await worker.fetch(new Request("https://worker.dev/status.json"), env);
assert.equal(resSharedStatus2.status, 200);
assert.equal(calls.length, 2);

console.log("OK");
