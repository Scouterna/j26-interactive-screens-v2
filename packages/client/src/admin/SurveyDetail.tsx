import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useContext, useEffect, useState } from "react";
import type { MapSurveyConfig, SurveyResponse, SurveyStatus, VoteSurveyConfig } from "shared";
import { AuthError, deleteSurvey, fetchDevices, fetchSurvey, updateSurvey, type DeviceItem } from "../api";
import { BASE_PATH } from "../config";
import { AuthContext } from "./AdminLayout";
import DeviceAssignModal from "./DeviceAssignModal";

function formatEndsAt(utc: string): string {
	const d = new Date(utc);
	const diffMs = d.getTime() - Date.now();
	const date = d.toLocaleDateString("sv-SE", { day: "numeric", month: "long" });
	const time = d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
	const label = `${date} ${time}`;

	if (diffMs <= 0) return `Ended (${label})`;
	const diffMin = Math.round(diffMs / 60_000);
	if (diffMin < 60) return `Ends in ${diffMin} min (${label})`;
	const diffHours = Math.round(diffMs / 3_600_000);
	if (diffHours < 24) return `Ends in ${diffHours}h (${label})`;
	const diffDays = Math.round(diffMs / 86_400_000);
	return `Ends in ${diffDays}d (${label})`;
}

export default function SurveyDetail() {
	const { markUnauthorized } = useContext(AuthContext);
	const { id } = useParams({ strict: false }) as { id: string };
	const navigate = useNavigate();
	const [survey, setSurvey] = useState<SurveyResponse | null>(null);
	const [devices, setDevices] = useState<DeviceItem[]>([]);
	const [copied, setCopied] = useState(false);
	const [showDeviceModal, setShowDeviceModal] = useState(false);

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
		fetchDevices()
			.then(setDevices)
			.catch((err: unknown) => {
				if (err instanceof AuthError) markUnauthorized();
			});
	}, [id, markUnauthorized]);

	async function handleStatusChange(status: SurveyStatus) {
		try {
			const updated = await updateSurvey(id, { status });
			setSurvey(updated);
		} catch (err) {
			if (err instanceof AuthError) markUnauthorized();
		}
	}

	async function handleDelete() {
		if (!window.confirm(`Delete "${survey?.name}"? This cannot be undone.`)) return;
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
					<Link
						to="/admin/surveys/$id/edit"
						params={{ id }}
						className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50"
					>
						Edit
					</Link>
					<StatusPicker
						current={survey.status}
						onChange={(s) => void handleStatusChange(s)}
					/>
					<button
						type="button"
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
					{survey.endsAt && (
						<p className="text-sm text-gray-500 mt-2">
							{formatEndsAt(survey.endsAt)}
						</p>
					)}
				</>
			</div>

			<div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-sm font-medium text-gray-700">Devices</h2>
					<button
						type="button"
						onClick={() => setShowDeviceModal(true)}
						className="text-xs text-blue-600 hover:text-blue-800"
					>
						Manage
					</button>
				</div>
				{devices.filter((d) => d.surveyId === id).length === 0 ? (
					<p className="text-sm text-gray-400">No devices assigned.</p>
				) : (
					<ul className="flex flex-col gap-1">
						{devices
							.filter((d) => d.surveyId === id)
							.map((d) => (
								<li key={d.id} className="text-sm text-gray-900">
									{d.name}
								</li>
							))}
					</ul>
				)}
			</div>

			{showDeviceModal && (
				<DeviceAssignModal
					surveyId={id}
					devices={devices}
					onClose={() => setShowDeviceModal(false)}
					onApplied={(updated) => {
						setDevices(updated);
						setShowDeviceModal(false);
					}}
				/>
			)}

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


const STATUSES: SurveyStatus[] = ["draft", "active", "ended", "archived"];

const STATUS_ACTIVE: Record<SurveyStatus, string> = {
	draft: "bg-amber-100 text-amber-700 font-medium",
	active: "bg-green-100 text-green-700 font-medium",
	ended: "bg-red-100 text-red-700 font-medium",
	archived: "bg-purple-100 text-purple-700 font-medium",
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
					type="button"
					onClick={() => {
						if (s === current) return;
						if (!window.confirm(`Change status to "${s}"?`)) return;
						onChange(s);
					}}
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
