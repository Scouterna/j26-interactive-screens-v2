import { useContext, useEffect, useState } from "react";
import { AuthError, assignDeviceSurvey, fetchSurveys, type DeviceItem } from "../api";
import { AuthContext } from "./AdminLayout";

interface Props {
	surveyId: string;
	devices: DeviceItem[];
	onClose: () => void;
	onApplied: (updatedDevices: DeviceItem[]) => void;
}

export default function DeviceAssignModal({ surveyId, devices, onClose, onApplied }: Props) {
	const { markUnauthorized } = useContext(AuthContext);
	const [surveyNames, setSurveyNames] = useState<Record<string, string>>({});
	const [checked, setChecked] = useState<Set<string>>(
		new Set(devices.filter((d) => d.surveyId === surveyId).map((d) => d.id)),
	);
	const [applying, setApplying] = useState(false);

	useEffect(() => {
		fetchSurveys()
			.then((surveys) => {
				const map: Record<string, string> = {};
				for (const s of surveys) map[s.id] = s.name;
				setSurveyNames(map);
			})
			.catch((err: unknown) => {
				if (err instanceof AuthError) markUnauthorized();
			});
	}, [markUnauthorized]);

	function toggle(deviceId: string) {
		setChecked((prev) => {
			const next = new Set(prev);
			if (next.has(deviceId)) next.delete(deviceId);
			else next.add(deviceId);
			return next;
		});
	}

	const takeovers = devices.filter(
		(d) => checked.has(d.id) && d.surveyId !== null && d.surveyId !== surveyId,
	);

	async function handleApply() {
		setApplying(true);
		try {
			const updates: Promise<DeviceItem>[] = [];
			for (const device of devices) {
				const shouldBeAssigned = checked.has(device.id);
				const isAssigned = device.surveyId === surveyId;
				if (shouldBeAssigned && !isAssigned) {
					updates.push(assignDeviceSurvey(device.id, surveyId));
				} else if (!shouldBeAssigned && isAssigned) {
					updates.push(assignDeviceSurvey(device.id, null));
				}
			}
			const results = await Promise.all(updates);
			const resultMap = new Map(results.map((d) => [d.id, d]));
			const updatedDevices = devices.map((d) => resultMap.get(d.id) ?? d);
			onApplied(updatedDevices);
		} catch (err) {
			if (err instanceof AuthError) markUnauthorized();
		} finally {
			setApplying(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/40" onClick={onClose} />
			<div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 flex flex-col max-h-[80vh]">
				<div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
					<h2 className="text-sm font-semibold text-gray-900">Manage devices</h2>
					<button
						type="button"
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 text-lg leading-none"
					>
						✕
					</button>
				</div>

				<div className="overflow-y-auto flex-1">
					{devices.length === 0 ? (
						<p className="px-5 py-8 text-sm text-gray-400 text-center">
							No devices registered.
						</p>
					) : (
						<ul className="divide-y divide-gray-100">
							{devices.map((device) => {
								const isChecked = checked.has(device.id);
								const isThisSurvey = device.surveyId === surveyId;
								const assignedName = device.surveyId
									? (surveyNames[device.surveyId] ?? "…")
									: null;
								return (
									<li
										key={device.id}
										className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 select-none"
										onClick={() => toggle(device.id)}
									>
										<input
											type="checkbox"
											checked={isChecked}
											onChange={() => toggle(device.id)}
											className="accent-blue-600 w-4 h-4 shrink-0"
											onClick={(e) => e.stopPropagation()}
										/>
										<span className="flex-1 text-sm text-gray-900">{device.name}</span>
										<span className="text-xs text-gray-400">
											{isThisSurvey
												? "this survey"
												: assignedName
													? assignedName
													: "—"}
										</span>
									</li>
								);
							})}
						</ul>
					)}
				</div>

				{takeovers.length > 0 && (
					<div className="px-5 py-3 bg-amber-50 border-t border-amber-200">
						<p className="text-xs font-medium text-amber-800 mb-1">
							Will be moved from another survey:
						</p>
						<ul className="text-xs text-amber-700 flex flex-col gap-0.5">
							{takeovers.map((d) => (
								<li key={d.id}>
									• {d.name} — currently on &ldquo;
									{d.surveyId ? (surveyNames[d.surveyId] ?? "…") : ""}&rdquo;
								</li>
							))}
						</ul>
					</div>
				)}

				<div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => void handleApply()}
						disabled={applying}
						className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
					>
						{applying ? "Applying…" : "Apply"}
					</button>
				</div>
			</div>
		</div>
	);
}
