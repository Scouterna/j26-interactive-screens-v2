import "dotenv/config";

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { initAuth } from "./auth-admin.js";
import { logger } from "./logger.js";
import { appConfigRoutes } from "./routes/app-config.js";
import { devicesRoutes } from "./routes/devices.js";
import { meRoutes } from "./routes/me.js";
import { scansRoutes } from "./routes/scans.js";
import { surveysRoutes } from "./routes/surveys.js";
import { tagsRoutes } from "./routes/tags.js";
import { wsRoutes } from "./routes/ws.js";
import { StateManager } from "./state/manager.js";
import { WsManager } from "./ws/manager.js";

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "../public");

const app = new Hono();

app.use("*", async (c, next) => {
	const start = Date.now();
	await next();
	logger.info({
		method: c.req.method,
		path: c.req.path,
		status: c.res.status,
		ms: Date.now() - start,
	});
});
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

const wsManager = new WsManager();
const stateManager = new StateManager(wsManager);

const sub = app.basePath("/_services/screens");

sub.route("/api/app-config", appConfigRoutes());
sub.route("/api/me", meRoutes());
sub.route("/api/scans", scansRoutes(stateManager));
sub.route("/api/surveys", surveysRoutes(stateManager));
sub.route("/api/devices", devicesRoutes());
sub.route("/api/tags", tagsRoutes(stateManager));
sub.route("/ws", wsRoutes(upgradeWebSocket, wsManager, stateManager));

sub.use(
	"/*",
	serveStatic({
		root: publicDir,
		rewriteRequestPath: (path) => path.slice("/_services/screens".length) || "/",
	}),
);
sub.get("/*", serveStatic({ root: publicDir, path: "index.html" }));

async function main() {
	if (process.env.OIDC_CONFIG_URL) await initAuth();
	await stateManager.initialize();

	const server = serve(
		{ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) },
		(info) => {
			console.log(`Server running on http://localhost:${info.port}`);
		},
	);

	injectWebSocket(server);
}

main().catch(console.error);
