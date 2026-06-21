import { parse } from "csv-parse/sync";
import { count, countDistinct, ilike, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { adminAuth } from "../auth-admin.js";
import { db } from "../db/index.js";
import { tagMappings } from "../db/schema.js";
import type { StateManager } from "../state/manager.js";

const PAGE_SIZE = 50;

export function tagsRoutes(stateManager: StateManager) {
	const app = new Hono();

	app.get("/stats", adminAuth("tags:read"), async (c) => {
		const [row] = await db
			.select({
				tags: count(tagMappings.id),
				groups: countDistinct(tagMappings.displayName),
			})
			.from(tagMappings);
		return c.json({
			tags: Number(row?.tags ?? 0),
			groups: Number(row?.groups ?? 0),
		});
	});

	app.get("/", adminAuth("tags:read"), async (c) => {
		const search = c.req.query("search")?.trim() ?? "";
		const offset = Number(c.req.query("offset") ?? 0);
		const where = search
			? or(
					ilike(tagMappings.tagId, `%${search}%`),
					ilike(tagMappings.displayName, `%${search}%`),
				)
			: undefined;

		const [rows, [totRow]] = await Promise.all([
			db
				.select()
				.from(tagMappings)
				.where(where)
				.limit(PAGE_SIZE)
				.offset(offset),
			db
				.select({ total: count(tagMappings.id) })
				.from(tagMappings)
				.where(where),
		]);

		return c.json({
			rows,
			total: Number(totRow?.total ?? 0),
			pageSize: PAGE_SIZE,
		});
	});

	app.delete("/:tagId", adminAuth("tags:write"), async (c) => {
		const { eq } = await import("drizzle-orm");
		await db
			.delete(tagMappings)
			.where(eq(tagMappings.tagId, c.req.param("tagId")));
		await stateManager.refreshTagMappings();
		return c.json({ ok: true });
	});

	app.post("/", adminAuth("tags:write"), async (c) => {
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
