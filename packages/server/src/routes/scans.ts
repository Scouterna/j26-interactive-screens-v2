import { Hono } from "hono";
import type { ScanIngestionRequest } from "shared";
import { type DeviceVariables, deviceAuth } from "../auth-device.js";
import type { StateManager } from "../state/manager.js";

export function scansRoutes(stateManager: StateManager) {
	const app = new Hono<{ Variables: DeviceVariables }>();

	app.post("/", deviceAuth, async (c) => {
		const deviceId = c.get("deviceId");
		const body = await c.req.json<ScanIngestionRequest>();
		await Promise.all(
			body.map((scan) => stateManager.processScan({ ...scan, deviceId })),
		);
		return c.json({ ok: true });
	});

	return app;
}
