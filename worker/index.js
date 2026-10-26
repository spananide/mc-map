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
};
