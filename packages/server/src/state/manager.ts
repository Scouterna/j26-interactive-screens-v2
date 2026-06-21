import { eq } from "drizzle-orm";
import type { ServerWsMessage, SurveyConfig } from "shared";
import { db } from "../db/index.js";
import { scanEvents, surveys, tagMappings } from "../db/schema.js";
import { logger } from "../logger.js";
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
			logger.info(
				{
					surveyId: survey.id,
					name: survey.name,
					type: survey.type,
					events: events.length,
				},
				"state: rebuilt survey from DB",
			);
		}
		logger.info({ count: activeList.length }, "state: initialized");
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
		const [allMappings, events] = await Promise.all([
			db.select().from(tagMappings),
			db.select().from(scanEvents).where(eq(scanEvents.surveyId, survey.id)),
		]);
		const state = getHandler(survey.type).buildState(survey, events, allMappings);
		this.active.set(survey.id, { survey, state });
		this.scheduleTimers(survey);
		const displayState = getHandler(survey.type).toDisplayState(
			state,
			survey.config as SurveyConfig,
		);
		this.ws.broadcast(survey.id, {
			type: "state",
			surveyId: survey.id,
			data: displayState,
		});
		logger.info(
			{ surveyId: survey.id, name: survey.name, type: survey.type },
			"state: survey activated",
		);
	}

	async endSurvey(surveyId: string) {
		const entry = this.active.get(surveyId);
		const finalState = entry
			? getHandler(entry.survey.type).toDisplayState(
					entry.state,
					entry.survey.config as SurveyConfig,
				)
			: null;
		await db
			.update(surveys)
			.set({ status: "ended" })
			.where(eq(surveys.id, surveyId));
		this.ws.broadcast(surveyId, { type: "survey_ended", surveyId, data: finalState });
		clearInterval(this.cleanupTimers.get(surveyId));
		clearTimeout(this.endTimers.get(surveyId));
		this.cleanupTimers.delete(surveyId);
		this.endTimers.delete(surveyId);
		this.active.delete(surveyId);
		logger.info({ surveyId }, "state: survey ended");
	}

	async archiveSurvey(surveyId: string) {
		if (this.active.has(surveyId)) {
			clearInterval(this.cleanupTimers.get(surveyId));
			clearTimeout(this.endTimers.get(surveyId));
			this.cleanupTimers.delete(surveyId);
			this.endTimers.delete(surveyId);
			this.active.delete(surveyId);
		}
		this.ws.broadcast(surveyId, { type: "survey_archived", surveyId, data: null });
		logger.info({ surveyId }, "state: survey archived");
	}

	async processScan({
		surveyId,
		deviceId,
		scannerId,
		tagId,
	}: {
		surveyId: string;
		deviceId: string;
		scannerId: string;
		tagId: string;
	}) {
		const entry = this.active.get(surveyId);
		if (!entry) {
			logger.warn(
				{ surveyId, scannerId, tagId },
				"scan: survey not found or not active",
			);
			return { error: "not_found" as const };
		}

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
			deviceId,
			scannerId,
			tagId,
			accepted: result.accepted,
			rejectionReason: result.rejectionReason ?? null,
		});

		if (result.accepted) {
			this.ws.broadcast(surveyId, {
				type: "update",
				surveyId,
				data: handler.toDisplayState(entry.state, config),
			});
			logger.debug({ surveyId, scannerId, tagId }, "scan: accepted");
		} else {
			logger.debug(
				{ surveyId, scannerId, tagId, reason: result.rejectionReason },
				"scan: rejected",
			);
		}

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

	async getSubscribeMessage(surveyId: string): Promise<ServerWsMessage | null> {
		const displayState = this.getDisplayState(surveyId);
		if (displayState) {
			return { type: "state", surveyId, data: displayState };
		}
		const [survey] = await db
			.select({ status: surveys.status })
			.from(surveys)
			.where(eq(surveys.id, surveyId));
		if (survey?.status === "ended") {
			return { type: "survey_ended", surveyId, data: null };
		}
		if (survey?.status === "archived") {
			return { type: "survey_archived", surveyId, data: null };
		}
		return null;
	}
}
