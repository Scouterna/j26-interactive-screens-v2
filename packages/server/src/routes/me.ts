import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { jwtVerify } from "jose";
import { getJWKS } from "../auth-admin.js";
import { logger } from "../logger.js";

export function meRoutes() {
	const app = new Hono();

	app.get("/", async (c) => {
		const cookieName = process.env.AUTH_COOKIE_NAME ?? "j26-auth_access-token";
		const token = getCookie(c, cookieName);
		if (!token) return c.json({ error: "Unauthorized" }, 401);

		try {
			const { payload } = await jwtVerify(token, getJWKS());
			const roles =
				(
					(
						(payload as Record<string, unknown>).resource_access as
							| Record<string, { roles?: string[] }>
							| undefined
					)?.["j26-screens"]
				)?.roles ?? [];
			return c.json({ roles });
		} catch (err) {
			logger.warn(
				{ err: err instanceof Error ? err.message : String(err) },
				"me: invalid token",
			);
			return c.json({ error: "Unauthorized" }, 401);
		}
	});

	return app;
}
