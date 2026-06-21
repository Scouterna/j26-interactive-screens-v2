import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { adminAuth } from "../auth-admin.js";
import { db } from "../db/index.js";
import { surveys } from "../db/schema.js";
import type { StateManager } from "../state/manager.js";

export function surveysRoutes(stateManager: StateManager) {
	const app = new Hono();

	app.get("/", adminAuth("surveys:read"), async (c) => {
		const all = await db.select().from(surveys);
		return c.json(
			all.map((s) => ({
				...s,
				displayState: stateManager.getDisplayState(s.id),
			})),
		);
	});

	app.get("/:id", adminAuth("surveys:read"), async (c) => {
		const [s] = await db
			.select()
			.from(surveys)
			.where(eq(surveys.id, c.req.param("id")));
		if (!s) return c.json({ error: "Not found" }, 404);
		return c.json({ ...s, displayState: stateManager.getDisplayState(s.id) });
	});

	app.post("/", adminAuth("surveys:write"), async (c) => {
		const body = await c.req.json<{
			name: string;
			type: string;
			config: unknown;
			status?: string;
			endsAt?: string;
		}>();
		const [s] = await db
			.insert(surveys)
			.values({
				name: body.name,
				type: body.type,
				config: body.config,
				status: body.status ?? "draft",
				endsAt: body.endsAt ? new Date(body.endsAt) : null,
			})
			.returning();
		if (s.status === "active") await stateManager.activateSurvey(s);
		return c.json(s, 201);
	});

	app.patch("/:id", adminAuth("surveys:write"), async (c) => {
		const body = await c.req.json<Record<string, unknown>>();
		const patch = {
			...body,
			endsAt: body.endsAt !== undefined
				? (body.endsAt ? new Date(body.endsAt as string) : null)
				: undefined,
		};
		const [s] = await db
			.update(surveys)
			.set(patch)
			.where(eq(surveys.id, c.req.param("id")))
			.returning();
		if (!s) return c.json({ error: "Not found" }, 404);
		if (body.status === "active") await stateManager.activateSurvey(s);
		if (body.status === "ended") await stateManager.endSurvey(s.id);
		if (body.status === "archived") await stateManager.archiveSurvey(s.id);
		return c.json(s);
	});

	app.delete("/:id", adminAuth("surveys:write"), async (c) => {
		const id = c.req.param("id");
		await stateManager.endSurvey(id);
		await db.delete(surveys).where(eq(surveys.id, id));
		return c.json({ ok: true });
	});

	return app;
}
