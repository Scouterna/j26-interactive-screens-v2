import { useContext, useState } from "react";
import type { SurveyResponse, SurveyType, VoteBucket } from "shared";
import { AuthError, createSurvey } from "../api";
import { AuthContext } from "./AdminLayout";

const SCANNER_IDS = ["1", "2", "3", "4"];

function toLocalDatetimeInput(utc: string): string {
	const d = new Date(utc);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface CreateBucket {
	label: string;
	scannerIds: string[];
}

interface Props {
	onClose: () => void;
	onCreate: (survey: SurveyResponse) => void;
}

export default function CreateSurveyModal({ onClose, onCreate }: Props) {
	const { markUnauthorized } = useContext(AuthContext);
	const [name, setName] = useState("");
	const [type, setType] = useState<SurveyType>("vote");
	const [buckets, setBuckets] = useState<CreateBucket[]>([{ label: "", scannerIds: ["1"] }]);
	const [pinLifetime, setPinLifetime] = useState(300);
	const [rescanCooldown, setRescanCooldown] = useState(300);
	const [endsAt, setEndsAt] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			const config =
				type === "vote"
					? {
							buckets: buckets.map<VoteBucket>((b) => ({
								label: b.label,
								scannerIds: b.scannerIds,
							})),
						}
					: { pinLifetimeSeconds: pinLifetime, rescanCooldownSeconds: rescanCooldown };
			const survey = await createSurvey({
					name,
					type,
					config,
					status: "draft",
					endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
				});
			onCreate(survey);
		} catch (err) {
			if (err instanceof AuthError) markUnauthorized();
			else setError("Failed to create survey.");
		} finally {
			setSubmitting(false);
		}
	}

	function toggleScanner(bucketIdx: number, sid: string, checked: boolean) {
		setBuckets((prev) =>
			prev.map((b, idx) => {
				if (checked) {
					if (idx === bucketIdx) return { ...b, scannerIds: [...b.scannerIds, sid] };
					return { ...b, scannerIds: b.scannerIds.filter((s) => s !== sid) };
				}
				if (idx === bucketIdx) return { ...b, scannerIds: b.scannerIds.filter((s) => s !== sid) };
				return b;
			}),
		);
	}

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
			onClick={onClose}
		>
			<div
				className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
				onClick={(e) => e.stopPropagation()}
			>
				<h2 className="text-lg font-semibold text-gray-900 mb-4">Create survey</h2>

				<form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
					<Field label="Name">
						<input
							type="text"
							required
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</Field>

					<Field label="Ends at (optional)">
						<input
							type="datetime-local"
							value={endsAt}
							onChange={(e) => setEndsAt(e.target.value)}
							className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</Field>

					<Field label="Type">
						<div className="flex gap-4">
							{(["vote", "map"] as SurveyType[]).map((t) => (
								<label key={t} className="flex items-center gap-2 cursor-pointer text-sm">
									<input
										type="radio"
										name="type"
										value={t}
										checked={type === t}
										onChange={() => setType(t)}
									/>
									<span className="capitalize">{t}</span>
								</label>
							))}
						</div>
					</Field>

					{type === "vote" && (
						<div>
							<span className="block text-sm font-medium text-gray-700 mb-2">Buckets</span>
							<div className="flex flex-col gap-3">
								{buckets.map((bucket, i) => (
									<div key={i} className="flex items-center gap-2">
										<input
											type="text"
											placeholder={`Bucket ${i + 1} label`}
											value={bucket.label}
											onChange={(e) =>
												setBuckets((prev) =>
													prev.map((b, idx) =>
														idx === i ? { ...b, label: e.target.value } : b,
													),
												)
											}
											className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
										<div className="flex items-center gap-1">
											{SCANNER_IDS.map((sid) => (
												<label key={sid} className="flex items-center gap-0.5 cursor-pointer select-none">
													<input
														type="checkbox"
														checked={bucket.scannerIds.includes(sid)}
														onChange={(e) => toggleScanner(i, sid, e.target.checked)}
														className="accent-blue-600"
													/>
													<span className="text-xs text-gray-500">{sid}</span>
												</label>
											))}
										</div>
										<button
										type="button"
										onClick={() =>
											setBuckets((prev) => prev.filter((_, idx) => idx !== i))
										}
										className={`text-gray-400 hover:text-red-500 text-sm leading-none ${buckets.length === 1 ? "invisible" : ""}`}
									>
										✕
									</button>
									</div>
								))}
								{Array.from({ length: 4 - buckets.length }).map((_, i) => (
									<button
										key={i}
										type="button"
										onClick={() => {
											const usedIds = new Set(buckets.flatMap((b) => b.scannerIds));
											const nextFree = SCANNER_IDS.find((s) => !usedIds.has(s)) ?? null;
											setBuckets((prev) => [
												...prev,
												{ label: "", scannerIds: nextFree ? [nextFree] : [] },
											]);
										}}
										className="flex items-center justify-center w-full rounded border border-dashed border-gray-300 py-1.5 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
									>
										+ Add bucket
									</button>
								))}
							</div>
						</div>
					)}

					{type === "map" && (
						<>
							<Field label="Pin lifetime (seconds)">
								<input
									type="number"
									min={1}
									value={pinLifetime}
									onChange={(e) => setPinLifetime(Number(e.target.value))}
									className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</Field>
							<Field label="Rescan cooldown (seconds)">
								<input
									type="number"
									min={0}
									value={rescanCooldown}
									onChange={(e) => setRescanCooldown(Number(e.target.value))}
									className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</Field>
						</>
					)}

					{error && <p className="text-sm text-red-600">{error}</p>}

					<div className="flex justify-end gap-2 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={submitting}
							className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
						>
							{submitting ? "Creating…" : "Create"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div>
			<label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
			{children}
		</div>
	);
}
