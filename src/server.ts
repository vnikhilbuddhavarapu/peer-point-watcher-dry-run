import { getAgentByName, routeAgentRequest } from "agents";

import { WatcherAgent } from "./agent/agent.js";
import { json } from "./shared/http.js";

export { WatcherAgent };

export default {
  async fetch(request, env): Promise<Response> {
    const response = await routeAgentRequest(request, env);
    if (response) return response;
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, service: "watcher", environment: env.ENVIRONMENT });
    }
    if (request.method === "POST" && url.pathname === "/api/check") {
      const agent = await getAgentByName(env.WATCHER_AGENT, "watcher");
      return json({ ok: true, result: await agent.checkNow() });
    }
    return json({ ok: false, error: { code: "NOT_FOUND" } }, 404);
  },
} satisfies ExportedHandler<Env>;
