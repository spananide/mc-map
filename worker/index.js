let cache = { t: 0, body: null };

export function _resetCache() {
  cache = { t: 0, body: null };
}

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=5",
};

export default {
  async scheduled(event, env) {
    const res = await fetch(
      "https://api.github.com/repos/spananide/mc-map/actions/workflows/pages.yml/dispatches",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GH_TOKEN}`,
          "Accept": "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "mc-tick",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "master" }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub dispatch failed (${res.status}): ${text}`);
    }
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/players.json") {
      return new Response("Not found", { status: 404 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    if (request.method !== "GET") {
      return new Response("Not found", { status: 404 });
    }

    if (cache.body !== null && Date.now() - cache.t < 5000) {
      return new Response(cache.body, { headers: HEADERS });
    }

    try {
      const exarotonHeaders = {
        "Authorization": `Bearer ${env.EXAROTON_TOKEN}`,
        "User-Agent": "mc-tick",
      };

      const serverRes = await fetch(
        `https://api.exaroton.com/v1/servers/${env.EXAROTON_SERVER}/`,
        { headers: exarotonHeaders }
      );

      if (!serverRes.ok) {
        return new Response(JSON.stringify({ max: 0, players: [] }), {
          status: 502,
          headers: HEADERS,
        });
      }

      const serverData = await serverRes.json();
      if (serverData.data?.status !== 1) {
        const max = serverData.data?.players?.max ?? 0;
        const body = JSON.stringify({ max, players: [] });
        cache = { t: Date.now(), body };
        return new Response(body, { headers: HEADERS });
      }

      const fileRes = await fetch(
        `https://api.exaroton.com/v1/servers/${env.EXAROTON_SERVER}/files/data/plugins/squaremap/web/tiles/players.json/`,
        { headers: exarotonHeaders }
      );

      if (!fileRes.ok) {
        return new Response(JSON.stringify({ max: 0, players: [] }), {
          status: 502,
          headers: HEADERS,
        });
      }

      const fileData = await fileRes.json();
      const onlineNames = new Set(serverData.data?.players?.list || []);
      const filtered = (fileData.players || []).filter((p) => onlineNames.has(p.name));
      const max = fileData.max ?? serverData.data?.players?.max ?? 0;
      const body = JSON.stringify({ max, players: filtered });
      cache = { t: Date.now(), body };
      return new Response(body, { headers: HEADERS });
    } catch {
      return new Response(JSON.stringify({ max: 0, players: [] }), {
        status: 502,
        headers: HEADERS,
      });
    }
  },
};
