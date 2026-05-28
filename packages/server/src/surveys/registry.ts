import type { SurveyConfig } from "shared";
import { mapHandler } from "./map.js";
import type { SurveyHandler } from "./types.js";
import { voteHandler } from "./vote.js";

export function getHandler(type: string): SurveyHandler<SurveyConfig, unknown> {
	if (type === "vote")
		return voteHandler as SurveyHandler<SurveyConfig, unknown>;
	if (type === "map") return mapHandler as SurveyHandler<SurveyConfig, unknown>;
	throw new Error(`Unknown survey type: ${type}`);
}
