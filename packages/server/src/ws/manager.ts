import type { WSContext } from "hono/ws";
import type { ServerWsMessage } from "shared";

export class WsManager {
	private connToSurveys = new Map<WSContext, Set<string>>();
	private surveyToConns = new Map<string, Set<WSContext>>();

	subscribe(ws: WSContext, surveyId: string) {
		if (!this.connToSurveys.has(ws)) this.connToSurveys.set(ws, new Set());
		this.connToSurveys.get(ws)!.add(surveyId);
		if (!this.surveyToConns.has(surveyId))
			this.surveyToConns.set(surveyId, new Set());
		this.surveyToConns.get(surveyId)!.add(ws);
	}

	disconnect(ws: WSContext) {
		for (const surveyId of this.connToSurveys.get(ws) ?? []) {
			this.surveyToConns.get(surveyId)?.delete(ws);
		}
		this.connToSurveys.delete(ws);
	}

	broadcast(surveyId: string, msg: ServerWsMessage) {
		const payload = JSON.stringify(msg);
		for (const ws of this.surveyToConns.get(surveyId) ?? []) {
			try {
				ws.send(payload);
			} catch {
				this.disconnect(ws);
			}
		}
	}
}
