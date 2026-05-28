import type { MapDisplayState, MapSurveyConfig, Pin } from "shared";
import type { DbTagMapping, ScanResult, SurveyHandler } from "./types.js";

export interface MapMemState {
	activePins: Map<string, Pin>;
	lastScanTime: Map<string, Date>;
	tagMappings: Map<string, DbTagMapping>;
}

export const mapHandler: SurveyHandler<MapSurveyConfig, MapMemState> = {
	buildState(survey, events, tagMappingsList) {
		const config = survey.config as MapSurveyConfig;
		const tagMappings = new Map(tagMappingsList.map((m) => [m.tagId, m]));
		const activePins = new Map<string, Pin>();
		const lastScanTime = new Map<string, Date>();

		const sorted = [...events].sort(
			(a, b) =>
				new Date(a.scannedAt).getTime() - new Date(b.scannedAt).getTime(),
		);

		for (const event of sorted) {
			if (!event.accepted) continue;
			const mapping = tagMappings.get(event.tagId);
			if (!mapping) continue;
			const scannedAt = new Date(event.scannedAt);
			lastScanTime.set(event.tagId, scannedAt);
			activePins.set(event.tagId, {
				tagId: event.tagId,
				displayName: mapping.displayName,
				lat: Number(mapping.lat),
				lng: Number(mapping.lng),
				scannedAt: scannedAt.toISOString(),
				expiresAt: new Date(
					scannedAt.getTime() + config.pinLifetimeSeconds * 1000,
				).toISOString(),
			});
		}

		return { activePins, lastScanTime, tagMappings };
	},

	handleScan(state, scan, config): ScanResult<MapMemState> {
		const lastScan = state.lastScanTime.get(scan.tagId);
		if (
			lastScan &&
			Date.now() - lastScan.getTime() < config.rescanCooldownSeconds * 1000
		)
			return { accepted: false, rejectionReason: "cooldown", newState: state };

		const mapping = state.tagMappings.get(scan.tagId);
		if (!mapping)
			return {
				accepted: false,
				rejectionReason: "unknown_tag",
				newState: state,
			};

		const now = new Date();
		const pin: Pin = {
			tagId: scan.tagId,
			displayName: mapping.displayName,
			lat: Number(mapping.lat),
			lng: Number(mapping.lng),
			scannedAt: now.toISOString(),
			expiresAt: new Date(
				now.getTime() + config.pinLifetimeSeconds * 1000,
			).toISOString(),
		};

		return {
			accepted: true,
			newState: {
				...state,
				activePins: new Map(state.activePins).set(scan.tagId, pin),
				lastScanTime: new Map(state.lastScanTime).set(scan.tagId, now),
			},
		};
	},

	toDisplayState(state): MapDisplayState {
		const now = Date.now();
		return {
			type: "map",
			pins: Array.from(state.activePins.values()).filter(
				(p) => new Date(p.expiresAt).getTime() > now,
			),
		};
	},

	cleanupExpired(state) {
		const now = Date.now();
		let changed = false;
		const activePins = new Map<string, Pin>();
		const lastScanTime = new Map<string, Date>();

		for (const [tagId, pin] of state.activePins) {
			if (new Date(pin.expiresAt).getTime() > now) {
				activePins.set(tagId, pin);
				lastScanTime.set(tagId, state.lastScanTime.get(tagId)!);
			} else {
				changed = true;
			}
		}

		return { changed, newState: { ...state, activePins, lastScanTime } };
	},
};
