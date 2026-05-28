import { Hono } from "hono";
import type { ScanIngestionRequest } from "shared";
import { deviceAuth } from "../auth-device.js";
import type { StateManager } from "../state/manager.js";

export function scansRoutes(stateManager: StateManager) {
	const app = new Hono();

	app.post("/", deviceAuth, async (c) => {
		const body = await c.req.json<ScanIngestionRequest>();
		await Promise.all(body.map((scan) => stateManager.processScan(scan)));
		return c.json({ ok: true });
	});

	return app;
}
