import { Hono } from "hono";
import type { UpgradeWebSocket } from "hono/ws";
import type { ClientWsMessage } from "shared";
import type { StateManager } from "../state/manager.js";
import type { WsManager } from "../ws/manager.js";

export function wsRoutes(
	upgradeWebSocket: UpgradeWebSocket,
	wsManager: WsManager,
	stateManager: StateManager,
) {
	const app = new Hono();

	app.get(
		"/",
		upgradeWebSocket(() => ({
			onMessage(event, ws) {
				try {
					const msg = JSON.parse(String(event.data)) as ClientWsMessage;
					if (msg.type !== "subscribe") return;
					wsManager.subscribe(ws, msg.surveyId);
					const state = stateManager.getDisplayState(msg.surveyId);
					if (state)
						ws.send(
							JSON.stringify({
								type: "state",
								surveyId: msg.surveyId,
								data: state,
							}),
						);
				} catch {
					/* ignore malformed messages */
				}
			},
			onClose(_event, ws) {
				wsManager.disconnect(ws);
			},
			onError(_event, ws) {
				wsManager.disconnect(ws);
			},
		})),
	);

	return app;
}
