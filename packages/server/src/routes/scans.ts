import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { ScanIngestionRequest } from "shared";
import { type DeviceVariables, deviceAuth } from "../auth-device.js";
import { db } from "../db/index.js";
import { devices } from "../db/schema.js";
import { logger } from "../logger.js";
import type { StateManager } from "../state/manager.js";

export function scansRoutes(stateManager: StateManager) {
	const app = new Hono<{ Variables: DeviceVariables }>();

	app.post("/", deviceAuth, async (c) => {
		const deviceId = c.get("deviceId");
		const body = await c.req.json<ScanIngestionRequest>();

		const [device] = await db
			.select({ surveyId: devices.surveyId })
			.from(devices)
			.where(eq(devices.id, deviceId));

		const surveyId = device?.surveyId;
		if (!surveyId) {
			logger.warn({ deviceId }, "scan: device has no survey assigned");
			return c.json({ ok: true });
		}

		await Promise.all(
			body.map((scan) => stateManager.processScan({ ...scan, surveyId, deviceId })),
		);
		return c.json({ ok: true });
	});

	return app;
}
