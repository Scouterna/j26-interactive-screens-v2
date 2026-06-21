import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useContext, useEffect, useState } from "react";
import type { MapSurveyConfig, SurveyResponse, SurveyStatus, VoteSurveyConfig } from "shared";
import { AuthError, deleteSurvey, fetchSurvey, updateSurvey } from "../api";
import { BASE_PATH } from "../config";
import { AuthContext } from "./AdminLayout";

const STATUS_CLASSES: Record<SurveyStatus, string> = {
	active: "bg-green-100 text-green-700",
	draft: "bg-gray-100 text-gray-600",
	ended: "bg-red-100 text-red-700",
};

interface EditState {
	name: string;
	buckets: string[];
	pinLifetime: number;
	rescanCooldown: number;
}

export default function SurveyDetail() {
	const { markUnauthorized } = useContext(AuthContext);
	const { id } = useParams({ strict: false }) as { id: string };
	const navigate = useNavigate();
	const [survey, setSurvey] = useState<SurveyResponse | null>(null);
	const [copied, setCopied] = useState(false);
	const [edit, setEdit] = useState<EditState | null>(null);
	const [saving, setSaving] = useState(false);

	const screenPath = `${BASE_PATH}/display/${id}`;
	const screenUrl = `${window.location.origin}${screenPath}`;

	function copyUrl() {
		void navigator.clipboard.writeText(screenUrl).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}

	useEffect(() => {
		fetchSurvey(id)
			.then(setSurvey)
			.catch((err: unknown) => {
				if (err instanceof AuthError) markUnauthorized();
			});
	}, [id, markUnauthorized]);

	function startEdit(s: SurveyResponse) {
		const voteConfig = s.type === "vote" ? (s.config as VoteSurveyConfig) : null;
		const mapConfig = s.type === "map" ? (s.config as MapSurveyConfig) : null;
		setEdit({
			name: s.name,
			buckets: voteConfig?.buckets.map((b) => b.label) ?? [],
			pinLifetime: mapConfig?.pinLifetimeSeconds ?? 300,
			rescanCooldown: mapConfig?.rescanCooldownSeconds ?? 300,
		});
	}

	async function handleSave() {
		if (!edit || !survey) return;
		setSaving(true);
		try {
			const config =
				survey.type === "vote"
					? {
							buckets: edit.buckets.map((label, i) => ({
								label,
								scannerIds: [String(i + 1)],
							})),
						}
					: {
							pinLifetimeSeconds: edit.pinLifetime,
							rescanCooldownSeconds: edit.rescanCooldown,
						};
			const updated = await updateSurvey(id, { name: edit.name, config });
			setSurvey(updated);
			setEdit(null);
		} catch (err) {
			if (err instanceof AuthError) markUnauthorized();
		} finally {
			setSaving(false);
		}
	}

	async function handleStatusChange(status: SurveyStatus) {
		try {
			const updated = await updateSurvey(id, { status });
			setSurvey(updated);
		} catch (err) {
			if (err instanceof AuthError) markUnauthorized();
		}
	}

	async function handleDelete() {
		try {
			await deleteSurvey(id);
			void navigate({ to: "/admin" });
		} catch (err) {
			if (err instanceof AuthError) markUnauthorized();
		}
	}

	if (!survey) {
		return <div className="text-gray-400 py-8 text-sm">Loading…</div>;
	}

	const voteConfig = survey.type === "vote" ? (survey.config as VoteSurveyConfig) : null;
	const mapConfig = survey.type === "map" ? (survey.config as MapSurveyConfig) : null;

	return (
		<div>
			<div className="mb-6">
				<Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
					← Surveys
				</Link>
			</div>

			<div className="flex items-start justify-between mb-6">
				<div>
					<h1 className="text-xl font-semibold text-gray-900">{survey.name}</h1>
					<p className="text-sm text-gray-500 capitalize mt-0.5">{survey.type}</p>
				</div>

				<div className="flex items-center gap-2">
					{!edit && (
						<button
							onClick={() => startEdit(survey)}
							className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50"
						>
							Edit
						</button>
					)}
					<StatusPicker
						current={survey.status}
						onChange={(s) => void handleStatusChange(s)}
					/>
					<button
						onClick={() => void handleDelete()}
						className="px-3 py-1.5 text-sm text-red-600 bg-white border border-red-200 rounded hover:bg-red-50"
					>
						Delete
					</button>
				</div>
			</div>

			<div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-sm font-medium text-gray-700">Configuration</h2>
				</div>

				{edit ? (
					<div className="flex flex-col gap-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
							<input
								type="text"
								value={edit.name}
								onChange={(e) => setEdit({ ...edit, name: e.target.value })}
								className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						{voteConfig && (
							<div>
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium text-gray-700">Buckets</span>
									<button
										type="button"
										onClick={() => setEdit({ ...edit, buckets: [...edit.buckets, ""] })}
										className="text-xs text-blue-600 hover:underline"
									>
										+ Add bucket
									</button>
								</div>
								<div className="flex flex-col gap-2">
									{edit.buckets.map((label, i) => (
										<div key={i} className="flex items-center gap-2">
											<span className="text-xs text-gray-400 w-5 shrink-0 text-right">
												{i + 1}
											</span>
											<input
												type="text"
												value={label}
												onChange={(e) =>
													setEdit({
														...edit,
														buckets: edit.buckets.map((b, idx) =>
															idx === i ? e.target.value : b,
														),
													})
												}
												className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
											{edit.buckets.length > 1 && (
												<button
													type="button"
													onClick={() =>
														setEdit({
															...edit,
															buckets: edit.buckets.filter((_, idx) => idx !== i),
														})
													}
													className="text-gray-400 hover:text-red-500 text-sm leading-none"
												>
													✕
												</button>
											)}
										</div>
									))}
								</div>
							</div>
						)}

						{mapConfig && (
							<div className="flex gap-4">
								<div className="flex-1">
									<label className="block text-sm font-medium text-gray-700 mb-1">
										Pin lifetime (s)
									</label>
									<input
										type="number"
										min={1}
										value={edit.pinLifetime}
										onChange={(e) =>
											setEdit({ ...edit, pinLifetime: Number(e.target.value) })
										}
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
										value={edit.rescanCooldown}
										onChange={(e) =>
											setEdit({ ...edit, rescanCooldown: Number(e.target.value) })
										}
										className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
								</div>
							</div>
						)}

						<div className="flex gap-2 pt-1">
							<button
								onClick={() => void handleSave()}
								disabled={saving}
								className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
							>
								{saving ? "Saving…" : "Save"}
							</button>
							<button
								onClick={() => setEdit(null)}
								className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
							>
								Cancel
							</button>
						</div>
					</div>
				) : (
					<>
						{voteConfig && (
							<div className="flex flex-col gap-1">
								{voteConfig.buckets.map((b, i) => (
									<div key={i} className="flex items-baseline gap-2 text-sm">
										<span className="text-gray-400 text-xs w-4 shrink-0">{i + 1}</span>
										<span className="text-gray-900">{b.label}</span>
									</div>
								))}
							</div>
						)}
						{mapConfig && (
							<div className="flex gap-6 text-sm text-gray-600">
								<span>Pin lifetime: {mapConfig.pinLifetimeSeconds}s</span>
								<span>Rescan cooldown: {mapConfig.rescanCooldownSeconds}s</span>
							</div>
						)}
					</>
				)}
			</div>

			<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
				<div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
					<h2 className="text-sm font-medium text-gray-700">Screen preview</h2>
					<button onClick={copyUrl} className="text-xs text-blue-600 hover:text-blue-800">
						{copied ? "Copied!" : "Copy URL"}
					</button>
				</div>
				<iframe
					src={screenPath}
					title="Screen preview"
					className="w-full aspect-video bg-gray-950"
				/>
			</div>
		</div>
	);
}

const STATUSES: SurveyStatus[] = ["draft", "active", "ended"];

const STATUS_ACTIVE: Record<SurveyStatus, string> = {
	draft: "bg-amber-100 text-amber-700 font-medium",
	active: "bg-green-100 text-green-700 font-medium",
	ended: "bg-red-100 text-red-700 font-medium",
};

const STATUS_IDLE: string = "text-gray-600 hover:bg-gray-50";

function StatusPicker({
	current,
	onChange,
}: {
	current: SurveyStatus;
	onChange: (s: SurveyStatus) => void;
}) {
	return (
		<div className="flex rounded border border-gray-200 overflow-hidden text-sm bg-white">
			{STATUSES.map((s) => (
				<button
					key={s}
					onClick={() => s !== current && onChange(s)}
					className={`px-3 py-1.5 capitalize transition-colors ${
						s === current ? STATUS_ACTIVE[s] : STATUS_IDLE
					}`}
				>
					{s}
				</button>
			))}
		</div>
	);
}
