import { Hono } from "hono";
import { adminAuth } from "../auth-admin.js";

export function appConfigRoutes() {
	const app = new Hono();

	app.get("/", adminAuth("any"), async (c) => {
		return c.json({
			navigation: [
				{
					type: "page",
					id: "page_interactive_screens",
					label: "interactive_screens.surveys.label",
					icon: "chart-bar",
					path: "..",
				},
			],
		});
	});

	return app;
}
