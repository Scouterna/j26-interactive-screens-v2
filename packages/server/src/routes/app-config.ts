import { Hono } from "hono";
import { adminAuth } from "../auth-admin.js";

export function appConfigRoutes() {
	const app = new Hono();

	app.get("/", adminAuth("read"), async (c) => {
		return c.json({
			navigation: [
				{
					type: "page",
					id: "page_screens",
					label: "screens.screens.label",
					icon: "device-screen",
					path: "..",
				},
			],
		});
	});

	return app;
}
