import { useContext, useState } from "react";
import type { SurveyResponse, SurveyType, VoteBucket } from "shared";
import { AuthError, createSurvey } from "../api";
import { AuthContext } from "./AdminLayout";

interface Props {
	onClose: () => void;
	onCreate: (survey: SurveyResponse) => void;
}

export default function CreateSurveyModal({ onClose, onCreate }: Props) {
	const { markUnauthorized } = useContext(AuthContext);
	const [name, setName] = useState("");
	const [type, setType] = useState<SurveyType>("vote");
	const [buckets, setBuckets] = useState<string[]>(["", ""]);
	const [pinLifetime, setPinLifetime] = useState(300);
	const [rescanCooldown, setRescanCooldown] = useState(300);
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
							buckets: buckets.map<VoteBucket>((label, i) => ({
								label,
								scannerIds: [String(i + 1)],
							})),
						}
					: { pinLifetimeSeconds: pinLifetime, rescanCooldownSeconds: rescanCooldown };
			const survey = await createSurvey({ name, type, config, status: "active" });
			onCreate(survey);
		} catch (err) {
			if (err instanceof AuthError) markUnauthorized();
			else setError("Failed to create survey.");
		} finally {
			setSubmitting(false);
		}
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
							<div className="flex items-center justify-between mb-2">
								<span className="text-sm font-medium text-gray-700">Buckets</span>
								<button
									type="button"
									onClick={() => setBuckets((prev) => [...prev, ""])}
									className="text-xs text-blue-600 hover:underline"
								>
									+ Add bucket
								</button>
							</div>
							<div className="flex flex-col gap-2">
								{buckets.map((label, i) => (
									<div key={i} className="flex items-center gap-2">
										<span className="text-xs text-gray-400 w-5 shrink-0 text-right">
											{i + 1}
										</span>
										<input
											type="text"
											placeholder={`Bucket ${i + 1} label`}
											value={label}
											onChange={(e) =>
												setBuckets((prev) =>
													prev.map((b, idx) => (idx === i ? e.target.value : b)),
												)
											}
											className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
										{buckets.length > 1 && (
											<button
												type="button"
												onClick={() =>
													setBuckets((prev) => prev.filter((_, idx) => idx !== i))
												}
												className="text-gray-400 hover:text-red-500 text-sm leading-none"
											>
												✕
											</button>
										)}
									</div>
								))}
							</div>
							<p className="text-xs text-gray-400 mt-2">
								Scanner {buckets.map((_, i) => i + 1).join(", ")} assigned by position
							</p>
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
