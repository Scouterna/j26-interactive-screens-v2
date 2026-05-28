import { eq } from "drizzle-orm";
import type { SurveyConfig } from "shared";
import { db } from "../db/index.js";
import { scanEvents, surveys, tagMappings } from "../db/schema.js";
import { getHandler } from "../surveys/registry.js";
import type { DbSurvey } from "../surveys/types.js";
import type { WsManager } from "../ws/manager.js";

interface ActiveSurvey {
	survey: DbSurvey;
	state: unknown;
}

export class StateManager {
	private active = new Map<string, ActiveSurvey>();
	private cleanupTimers = new Map<string, ReturnType<typeof setInterval>>();
	private endTimers = new Map<string, ReturnType<typeof setTimeout>>();

	constructor(private ws: WsManager) {}

	async initialize() {
		const activeList = await db
			.select()
			.from(surveys)
			.where(eq(surveys.status, "active"));
		const allMappings = await db.select().from(tagMappings);
		for (const survey of activeList) {
			const events = await db
				.select()
				.from(scanEvents)
				.where(eq(scanEvents.surveyId, survey.id));
			const state = getHandler(survey.type).buildState(
				survey,
				events,
				allMappings,
			);
			this.active.set(survey.id, { survey, state });
			this.scheduleTimers(survey);
		}
	}

	private scheduleTimers(survey: DbSurvey) {
		if (survey.type === "map") {
			this.cleanupTimers.set(
				survey.id,
				setInterval(() => {
					const entry = this.active.get(survey.id);
					if (!entry) return;
					const { changed, newState } = getHandler(survey.type).cleanupExpired(
						entry.state,
						survey.config as SurveyConfig,
					);
					if (changed) entry.state = newState;
				}, 60_000),
			);
		}

		if (survey.endsAt) {
			const delay = new Date(survey.endsAt).getTime() - Date.now();
			if (delay > 0)
				this.endTimers.set(
					survey.id,
					setTimeout(() => this.endSurvey(survey.id), delay),
				);
		}
	}

	async activateSurvey(survey: DbSurvey) {
		const allMappings = await db.select().from(tagMappings);
		const state = getHandler(survey.type).buildState(survey, [], allMappings);
		this.active.set(survey.id, { survey, state });
		this.scheduleTimers(survey);
	}

	async endSurvey(surveyId: string) {
		await db
			.update(surveys)
			.set({ status: "ended" })
			.where(eq(surveys.id, surveyId));
		this.ws.broadcast(surveyId, { type: "survey_ended", surveyId, data: null });
		clearInterval(this.cleanupTimers.get(surveyId));
		clearTimeout(this.endTimers.get(surveyId));
		this.cleanupTimers.delete(surveyId);
		this.endTimers.delete(surveyId);
		this.active.delete(surveyId);
	}

	async processScan({
		surveyId,
		scannerId,
		tagId,
	}: {
		surveyId: string;
		scannerId: string;
		tagId: string;
	}) {
		const entry = this.active.get(surveyId);
		if (!entry) return { error: "not_found" as const };

		const handler = getHandler(entry.survey.type);
		const config = entry.survey.config as SurveyConfig;
		const result = handler.handleScan(
			entry.state,
			{ scannerId, tagId },
			config,
		);
		entry.state = result.newState;

		await db.insert(scanEvents).values({
			surveyId,
			scannerId,
			tagId,
			accepted: result.accepted,
			rejectionReason: result.rejectionReason ?? null,
		});

		if (result.accepted)
			this.ws.broadcast(surveyId, {
				type: "update",
				surveyId,
				data: handler.toDisplayState(entry.state, config),
			});

		return {
			accepted: result.accepted,
			rejectionReason: result.rejectionReason,
		};
	}

	async refreshTagMappings() {
		const allMappings = await db.select().from(tagMappings);
		const mappingsMap = new Map(allMappings.map((m) => [m.tagId, m]));
		for (const entry of this.active.values()) {
			if (entry.survey.type === "map")
				(entry.state as { tagMappings: typeof mappingsMap }).tagMappings =
					mappingsMap;
		}
	}

	getDisplayState(surveyId: string) {
		const entry = this.active.get(surveyId);
		if (!entry) return null;
		return getHandler(entry.survey.type).toDisplayState(
			entry.state,
			entry.survey.config as SurveyConfig,
		);
	}
}
