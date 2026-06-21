import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { db } from "./db/index.js";
import { devices } from "./db/schema.js";

export type DeviceVariables = { deviceId: string };

export const deviceAuth = createMiddleware<{ Variables: DeviceVariables }>(
	async (c, next) => {
		const auth = c.req.header("Authorization");
		if (!auth?.startsWith("Bearer "))
			return c.json({ error: "Unauthorized" }, 401);

		const keyHash = createHash("sha256").update(auth.slice(7)).digest("hex");
		const [device] = await db
			.select({ id: devices.id })
			.from(devices)
			.where(eq(devices.keyHash, keyHash));
		if (!device) return c.json({ error: "Unauthorized" }, 401);

		c.set("deviceId", device.id);
		await next();
	},
);
