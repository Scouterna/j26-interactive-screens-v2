export type SurveyType = "vote" | "map";
export type SurveyStatus = "active" | "ended" | "draft";

export interface VoteBucket {
	label: string;
	scannerIds: string[];
}
export interface VoteSurveyConfig {
	buckets: VoteBucket[];
}
export interface MapSurveyConfig {
	pinLifetimeSeconds: number;
	rescanCooldownSeconds: number;
}
export type SurveyConfig = VoteSurveyConfig | MapSurveyConfig;

export interface VoteDisplayState {
	type: "vote";
	buckets: { label: string; count: number }[];
	totalVotes: number;
}
export interface Pin {
	tagId: string;
	displayName: string;
	lat: number;
	lng: number;
	scannedAt: string;
	expiresAt: string;
}
export interface MapDisplayState {
	type: "map";
	pins: Pin[];
}
export type DisplayState = VoteDisplayState | MapDisplayState;

export type ClientWsMessage = { type: "subscribe"; surveyId: string };
export type ServerWsMessage =
	| { type: "state"; surveyId: string; data: DisplayState }
	| { type: "update"; surveyId: string; data: DisplayState }
	| { type: "survey_ended"; surveyId: string; data: null };

export interface SurveyResponse {
	id: string;
	name: string;
	type: SurveyType;
	config: SurveyConfig;
	status: SurveyStatus;
	createdAt: string;
	endsAt: string | null;
	displayState: DisplayState | null;
}
export interface CreateDeviceResponse {
	id: string;
	name: string;
	key: string;
}
export interface DeviceResponse {
	id: string;
	name: string;
	surveyId: string | null;
	createdAt: string;
}
export type ScanIngestionRequest = {
	scannerId: string;
	tagId: string;
}[];
