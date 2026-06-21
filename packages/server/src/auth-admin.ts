import "dotenv/config";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { logger } from "./logger.js";

let JWKS: ReturnType<typeof createRemoteJWKSet>;
let authorizationEndpoint: string;

export async function initAuth() {
	const res = await fetch(process.env.OIDC_CONFIG_URL!);
	const config = (await res.json()) as {
		jwks_uri: string;
		authorization_endpoint: string;
	};
	JWKS = createRemoteJWKSet(new URL(config.jwks_uri));
	authorizationEndpoint = config.authorization_endpoint;
}

export const getAuthorizationEndpoint = () => authorizationEndpoint;

export function adminAuth(required: "read" | "write") {
	return createMiddleware(async (c, next) => {
		const cookieName = process.env.AUTH_COOKIE_NAME ?? "j26-auth_access-token";
		const token = getCookie(c, cookieName);
		if (!token) {
			logger.warn({ path: c.req.path, cookieName }, "auth: missing token");
			return c.json({ error: "Unauthorized" }, 401);
		}

		try {
			const { payload } = await jwtVerify(token, JWKS);
			const roles =
				(
					(
						(payload as Record<string, unknown>).resource_access as
							| Record<string, { roles?: string[] }>
							| undefined
					)?.["j26-screens"]
				)?.roles ?? [];
			const ok =
				required === "read"
					? roles.includes("read") || roles.includes("write")
					: roles.includes("write");
			if (!ok) {
				logger.warn(
					{ path: c.req.path, required, roles },
					"auth: insufficient roles",
				);
				return c.json({ error: "Forbidden" }, 403);
			}
		} catch (err) {
			logger.warn(
				{ path: c.req.path, err: err instanceof Error ? err.message : String(err) },
				"auth: invalid token",
			);
			return c.json({ error: "Unauthorized" }, 401);
		}

		await next();
	});
}
