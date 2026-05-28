import type { DisplayState } from "shared";
import type { scanEvents, surveys, tagMappings } from "../db/schema.js";

export type DbSurvey = typeof surveys.$inferSelect;
export type DbScanEvent = typeof scanEvents.$inferSelect;
export type DbTagMapping = typeof tagMappings.$inferSelect;

export type ScanResult<TState> = {
	accepted: boolean;
	rejectionReason?: string;
	newState: TState;
};

export interface SurveyHandler<TConfig, TState> {
	buildState(
		survey: DbSurvey,
		events: DbScanEvent[],
		tagMappings: DbTagMapping[],
	): TState;
	handleScan(
		state: TState,
		scan: { scannerId: string; tagId: string },
		config: TConfig,
	): ScanResult<TState>;
	toDisplayState(state: TState, config: TConfig): DisplayState;
	cleanupExpired(
		state: TState,
		config: TConfig,
	): { changed: boolean; newState: TState };
}
