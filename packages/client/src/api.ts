import type { CreateDeviceResponse, SurveyConfig, SurveyResponse, SurveyStatus, SurveyType } from "shared";
import { BASE_PATH } from "./config";

export class AuthError extends Error {
	constructor() {
		super("Unauthorized");
	}
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
	const headers: Record<string, string> = {};
	if (init?.body && typeof init.body === "string") headers["Content-Type"] = "application/json";
	const res = await fetch(`${BASE_PATH}/api${path}`, {
		...init,
		headers: { ...headers, ...init?.headers },
	});
	if (res.status === 401) throw new AuthError();
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res;
}

export async function fetchSurveys(): Promise<SurveyResponse[]> {
	return apiFetch("/surveys").then((r) => r.json() as Promise<SurveyResponse[]>);
}

export async function fetchSurvey(id: string): Promise<SurveyResponse> {
	return apiFetch(`/surveys/${id}`).then((r) => r.json() as Promise<SurveyResponse>);
}

export interface CreateSurveyBody {
	name: string;
	type: SurveyType;
	config: SurveyConfig;
	status?: SurveyStatus;
	endsAt?: string;
}

export async function createSurvey(body: CreateSurveyBody): Promise<SurveyResponse> {
	return apiFetch("/surveys", {
		method: "POST",
		body: JSON.stringify(body),
	}).then((r) => r.json() as Promise<SurveyResponse>);
}

export async function updateSurvey(
	id: string,
	patch: Partial<CreateSurveyBody>,
): Promise<SurveyResponse> {
	return apiFetch(`/surveys/${id}`, {
		method: "PATCH",
		body: JSON.stringify(patch),
	}).then((r) => r.json() as Promise<SurveyResponse>);
}

export async function deleteSurvey(id: string): Promise<void> {
	await apiFetch(`/surveys/${id}`, { method: "DELETE" });
}

export interface DeviceItem {
	id: string;
	name: string;
	createdAt: string;
}

export async function fetchDevices(): Promise<DeviceItem[]> {
	return apiFetch("/devices").then((r) => r.json() as Promise<DeviceItem[]>);
}

export async function createDevice(name: string): Promise<CreateDeviceResponse> {
	return apiFetch("/devices", {
		method: "POST",
		body: JSON.stringify({ name }),
	}).then((r) => r.json() as Promise<CreateDeviceResponse>);
}

export async function renameDevice(id: string, name: string): Promise<DeviceItem> {
	return apiFetch(`/devices/${id}`, {
		method: "PATCH",
		body: JSON.stringify({ name }),
	}).then((r) => r.json() as Promise<DeviceItem>);
}

export interface TagStats {
	tags: number;
	groups: number;
}

export async function fetchTagStats(): Promise<TagStats> {
	return apiFetch("/tags/stats").then((r) => r.json() as Promise<TagStats>);
}

export async function uploadTags(file: File): Promise<{ count: number }> {
	const form = new FormData();
	form.append("file", file);
	return apiFetch("/tags", { method: "POST", body: form }).then(
		(r) => r.json() as Promise<{ ok: boolean; count: number }>,
	);
}

export async function deleteDevice(id: string): Promise<void> {
	await apiFetch(`/devices/${id}`, { method: "DELETE" });
}
