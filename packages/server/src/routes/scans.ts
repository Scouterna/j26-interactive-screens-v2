import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { ScanIngestionRequest } from "shared";
import { type DeviceVariables, deviceAuth } from "../auth-device.js";
import { db } from "../db/index.js";
import { devices } from "../db/schema.js";
import type { StateManager } from "../state/manager.js";

export function scansRoutes(stateManager: StateManager) {
	const app = new Hono<{ Variables: DeviceVariables }>();

	app.post("/", deviceAuth, async (c) => {
		const deviceId = c.get("deviceId");
		const body = await c.req.json<ScanIngestionRequest>();

		let deviceSurveyId: string | null = null;
		if (body.some((s) => !s.surveyId)) {
			const [device] = await db
				.select({ surveyId: devices.surveyId })
				.from(devices)
				.where(eq(devices.id, deviceId));
			deviceSurveyId = device?.surveyId ?? null;
		}

		await Promise.all(
			body.map((scan) => {
				const surveyId = scan.surveyId ?? deviceSurveyId ?? "";
				return stateManager.processScan({ ...scan, surveyId, deviceId });
			}),
		);
		return c.json({ ok: true });
	});

	return app;
}
