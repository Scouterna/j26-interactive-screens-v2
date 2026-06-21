import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useContext, useEffect, useState } from "react";
import type { MapSurveyConfig, VoteSurveyConfig } from "shared";
import { AuthError, fetchSurvey, updateSurvey } from "../api";
import { AuthContext } from "./AdminLayout";

const SCANNER_IDS = ["1", "2", "3", "4"];

function toLocalDatetimeInput(utc: string): string {
	const d = new Date(utc);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface EditBucket {
	label: string;
	scannerIds: string[];
}

interface FormState {
	name: string;
	buckets: EditBucket[];
	pinLifetime: number;
	rescanCooldown: number;
	endsAt: string;
}

export default function SurveyEdit() {
	const { markUnauthorized } = useContext(AuthContext);
	const { id } = useParams({ strict: false }) as { id: string };
	const navigate = useNavigate();

	const [form, setForm] = useState<FormState | null>(null);
	const [surveyType, setSurveyType] = useState<"vote" | "map">("vote");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		fetchSurvey(id)
			.then((s) => {
				setSurveyType(s.type);
				const voteConfig = s.type === "vote" ? (s.config as VoteSurveyConfig) : null;
				const mapConfig = s.type === "map" ? (s.config as MapSurveyConfig) : null;
				setForm({
					name: s.name,
					buckets: voteConfig?.buckets.map((b) => ({ label: b.label, scannerIds: b.scannerIds })) ?? [],
					pinLifetime: mapConfig?.pinLifetimeSeconds ?? 300,
					rescanCooldown: mapConfig?.rescanCooldownSeconds ?? 300,
					endsAt: s.endsAt ? toLocalDatetimeInput(s.endsAt) : "",
				});
			})
			.catch((err: unknown) => {
				if (err instanceof AuthError) markUnauthorized();
			});
	}, [id, markUnauthorized]);

	async function handleSave() {
		if (!form) return;
		setSaving(true);
		try {
			const config =
				surveyType === "vote"
					? { buckets: form.buckets.map((b) => ({ label: b.label, scannerIds: b.scannerIds })) }
					: { pinLifetimeSeconds: form.pinLifetime, rescanCooldownSeconds: form.rescanCooldown };
			await updateSurvey(id, {
				name: form.name,
				config,
				endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
			});
			void navigate({ to: "/admin/surveys/$id", params: { id } });
		} catch (err) {
			if (err instanceof AuthError) markUnauthorized();
		} finally {
			setSaving(false);
		}
	}

	if (!form) {
		return <div className="text-gray-400 py-8 text-sm">Loading…</div>;
	}

	return (
		<div>
			<div className="mb-6">
				<Link
					to="/admin/surveys/$id"
					params={{ id }}
					className="text-sm text-gray-500 hover:text-gray-700"
				>
					← Back
				</Link>
			</div>

			<h1 className="text-xl font-semibold text-gray-900 mb-6">Edit survey</h1>

			<div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
					<input
						type="text"
						value={form.name}
						onChange={(e) => setForm({ ...form, name: e.target.value })}
						className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Ends at (optional)
					</label>
					<div className="flex gap-2">
						<input
							type="datetime-local"
							value={form.endsAt}
							onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
							className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						{form.endsAt && (
							<button
								type="button"
								onClick={() => setForm({ ...form, endsAt: "" })}
								className="px-3 py-2 text-sm text-gray-400 hover:text-red-500"
							>
								✕
							</button>
						)}
					</div>
				</div>

				{surveyType === "vote" && (
					<div>
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm font-medium text-gray-700">Buckets</span>
							<button
								type="button"
								onClick={() =>
									setForm({ ...form, buckets: [...form.buckets, { label: "", scannerIds: [] }] })
								}
								className="text-xs text-blue-600 hover:underline"
							>
								+ Add bucket
							</button>
						</div>
						<div className="flex flex-col gap-3">
							{form.buckets.map((bucket, i) => (
								<div key={i} className="flex items-center gap-2">
									<input
										type="text"
										value={bucket.label}
										onChange={(e) =>
											setForm({
												...form,
												buckets: form.buckets.map((b, idx) =>
													idx === i ? { ...b, label: e.target.value } : b,
												),
											})
										}
										className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
									<div className="flex items-center gap-1">
										{SCANNER_IDS.map((sid) => {
											const checked = bucket.scannerIds.includes(sid);
											return (
												<label
													key={sid}
													className="flex items-center gap-0.5 cursor-pointer select-none"
												>
													<input
														type="checkbox"
														checked={checked}
														onChange={(e) => {
															setForm({
																...form,
																buckets: form.buckets.map((b, idx) => {
																	if (e.target.checked) {
																		if (idx === i) return { ...b, scannerIds: [...b.scannerIds, sid] };
																		return { ...b, scannerIds: b.scannerIds.filter((s) => s !== sid) };
																	}
																	if (idx === i) return { ...b, scannerIds: b.scannerIds.filter((s) => s !== sid) };
																	return b;
																}),
															});
														}}
														className="accent-blue-600"
													/>
													<span className="text-xs text-gray-500">{sid}</span>
												</label>
											);
										})}
									</div>
									<button
										type="button"
										onClick={() =>
											setForm({
												...form,
												buckets: form.buckets.filter((_, idx) => idx !== i),
											})
										}
										className={`text-gray-400 hover:text-red-500 text-sm leading-none ${form.buckets.length === 1 ? "invisible" : ""}`}
									>
										✕
									</button>
								</div>
							))}
						</div>
					</div>
				)}

				{surveyType === "map" && (
					<div className="flex gap-4">
						<div className="flex-1">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Pin lifetime (s)
							</label>
							<input
								type="number"
								min={1}
								value={form.pinLifetime}
								onChange={(e) => setForm({ ...form, pinLifetime: Number(e.target.value) })}
								className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div className="flex-1">
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Rescan cooldown (s)
							</label>
							<input
								type="number"
								min={0}
								value={form.rescanCooldown}
								onChange={(e) => setForm({ ...form, rescanCooldown: Number(e.target.value) })}
								className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
					</div>
				)}

				<div className="flex gap-2 pt-1">
					<button
						type="button"
						onClick={() => void handleSave()}
						disabled={saving}
						className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
					>
						{saving ? "Saving…" : "Save"}
					</button>
					<Link
						to="/admin/surveys/$id"
						params={{ id }}
						className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
					>
						Cancel
					</Link>
				</div>
			</div>
		</div>
	);
}
