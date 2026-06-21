import { createHash, randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { adminAuth } from "../auth-admin.js";
import { db } from "../db/index.js";
import { devices } from "../db/schema.js";

export function devicesRoutes() {
	const app = new Hono();

	app.get("/", adminAuth("devices:read"), async (c) => {
		const all = await db
			.select({
				id: devices.id,
				name: devices.name,
				surveyId: devices.surveyId,
				createdAt: devices.createdAt,
			})
			.from(devices);
		return c.json(all);
	});

	app.post("/", adminAuth("devices:write"), async (c) => {
		const { name } = await c.req.json<{ name: string }>();
		const rawKey = randomBytes(32).toString("hex");
		const keyHash = createHash("sha256").update(rawKey).digest("hex");
		const [d] = await db
			.insert(devices)
			.values({ name, keyHash })
			.returning({ id: devices.id, name: devices.name, surveyId: devices.surveyId });
		return c.json({ ...d, key: rawKey }, 201);
	});

	app.patch("/:id", adminAuth("devices:write"), async (c) => {
		const { name } = await c.req.json<{ name: string }>();
		const [d] = await db
			.update(devices)
			.set({ name })
			.where(eq(devices.id, c.req.param("id")))
			.returning({
				id: devices.id,
				name: devices.name,
				surveyId: devices.surveyId,
				createdAt: devices.createdAt,
			});
		if (!d) return c.json({ error: "Not found" }, 404);
		return c.json(d);
	});

	app.patch("/:id/survey", adminAuth("surveys:write"), async (c) => {
		const { surveyId } = await c.req.json<{ surveyId: string | null }>();
		const [d] = await db
			.update(devices)
			.set({ surveyId })
			.where(eq(devices.id, c.req.param("id")))
			.returning({
				id: devices.id,
				name: devices.name,
				surveyId: devices.surveyId,
				createdAt: devices.createdAt,
			});
		if (!d) return c.json({ error: "Not found" }, 404);
		return c.json(d);
	});

	app.delete("/:id", adminAuth("devices:write"), async (c) => {
		await db.delete(devices).where(eq(devices.id, c.req.param("id")));
		return c.json({ ok: true });
	});

	return app;
}
