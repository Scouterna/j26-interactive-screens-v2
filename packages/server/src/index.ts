import "dotenv/config";

import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { initAuth } from "./auth-admin.js";
import { devicesRoutes } from "./routes/devices.js";
import { scansRoutes } from "./routes/scans.js";
import { surveysRoutes } from "./routes/surveys.js";
import { tagsRoutes } from "./routes/tags.js";
import { wsRoutes } from "./routes/ws.js";
import { StateManager } from "./state/manager.js";
import { WsManager } from "./ws/manager.js";

const app = new Hono();
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

const wsManager = new WsManager();
const stateManager = new StateManager(wsManager);

app.route("/api/scans", scansRoutes(stateManager));
app.route("/api/surveys", surveysRoutes(stateManager));
app.route("/api/devices", devicesRoutes());
app.route("/api/tags", tagsRoutes(stateManager));
app.route("/ws", wsRoutes(upgradeWebSocket, wsManager, stateManager));

async function main() {
	if (process.env.OIDC_CONFIG_URL) await initAuth();

	const server = serve(
		{ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) },
		(info) => {
			console.log(`Server running on http://localhost:${info.port}`);
		},
	);

	injectWebSocket(server);
}

main().catch(console.error);
