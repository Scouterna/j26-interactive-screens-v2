import { parse } from "csv-parse/sync";
import { countDistinct, count, sql } from "drizzle-orm";
import { Hono } from "hono";
import { adminAuth } from "../auth-admin.js";
import { db } from "../db/index.js";
import { tagMappings } from "../db/schema.js";
import type { StateManager } from "../state/manager.js";

export function tagsRoutes(stateManager: StateManager) {
	const app = new Hono();

	app.get("/stats", adminAuth("read"), async (c) => {
		const [row] = await db
			.select({
				tags: count(tagMappings.id),
				groups: countDistinct(tagMappings.displayName),
			})
			.from(tagMappings);
		return c.json({ tags: Number(row?.tags ?? 0), groups: Number(row?.groups ?? 0) });
	});

	app.post("/", adminAuth("write"), async (c) => {
		const form = await c.req.formData();
		const file = form.get("file") as File;
		const records = parse(await file.text(), {
			columns: true,
			skip_empty_lines: true,
		}) as Array<{
			tag_id: string;
			display_name: string;
			lat: string;
			lng: string;
		}>;

		await db
			.insert(tagMappings)
			.values(
				records.map((r) => ({
					tagId: r.tag_id,
					displayName: r.display_name,
					lat: r.lat,
					lng: r.lng,
				})),
			)
			.onConflictDoUpdate({
				target: tagMappings.tagId,
				set: {
					displayName: sql`excluded.display_name`,
					lat: sql`excluded.lat`,
					lng: sql`excluded.lng`,
				},
			});

		await stateManager.refreshTagMappings();
		return c.json({ ok: true, count: records.length });
	});

	return app;
}
