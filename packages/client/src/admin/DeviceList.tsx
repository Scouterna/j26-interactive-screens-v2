import { useContext, useEffect, useRef, useState } from "react";
import type { CreateDeviceResponse } from "shared";
import {
	AuthError,
	createDevice,
	deleteDevice,
	fetchDevices,
	renameDevice,
	type DeviceItem,
} from "../api";
import { AuthContext } from "./AdminLayout";

export default function DeviceList() {
	const { markUnauthorized } = useContext(AuthContext);
	const [devices, setDevices] = useState<DeviceItem[]>([]);
	const [newName, setNewName] = useState("");
	const [newKey, setNewKey] = useState<CreateDeviceResponse | null>(null);
	const [creating, setCreating] = useState(false);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState("");
	const renameInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		fetchDevices()
			.then(setDevices)
			.catch((err: unknown) => {
				if (err instanceof AuthError) markUnauthorized();
			});
	}, [markUnauthorized]);

	function startRename(device: DeviceItem) {
		setRenamingId(device.id);
		setRenameValue(device.name);
		setTimeout(() => renameInputRef.current?.focus(), 0);
	}

	async function commitRename(id: string) {
		const name = renameValue.trim();
		if (!name) return;
		try {
			const updated = await renameDevice(id, name);
			setDevices((prev) => prev.map((d) => (d.id === id ? updated : d)));
		} catch (err) {
			if (err instanceof AuthError) markUnauthorized();
		} finally {
			setRenamingId(null);
		}
	}

	async function handleCreate(e: React.FormEvent) {
		e.preventDefault();
		if (!newName.trim()) return;
		setCreating(true);
		try {
			const device = await createDevice(newName.trim());
			setDevices((prev) => [
				...prev,
				{ id: device.id, name: device.name, createdAt: new Date().toISOString() },
			]);
			setNewKey(device);
			setNewName("");
		} catch (err) {
			if (err instanceof AuthError) markUnauthorized();
		} finally {
			setCreating(false);
		}
	}

	async function handleDelete(id: string) {
		try {
			await deleteDevice(id);
			setDevices((prev) => prev.filter((d) => d.id !== id));
		} catch (err) {
			if (err instanceof AuthError) markUnauthorized();
		}
	}

	return (
		<div>
			<h1 className="text-xl font-semibold text-gray-900 mb-6">Devices</h1>

			{newKey && (
				<div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
					<p className="text-sm font-medium text-green-800 mb-2">
						Device &ldquo;{newKey.name}&rdquo; created. Save this key — it won&rsquo;t be
						shown again.
					</p>
					<code className="block text-xs break-all bg-white border border-green-200 rounded px-3 py-2 text-green-900 font-mono">
						{newKey.key}
					</code>
					<button
						onClick={() => setNewKey(null)}
						className="mt-2 text-xs text-green-700 hover:underline"
					>
						Dismiss
					</button>
				</div>
			)}

			<form onSubmit={(e) => void handleCreate(e)} className="flex gap-2 mb-6">
				<input
					type="text"
					placeholder="Device name"
					value={newName}
					onChange={(e) => setNewName(e.target.value)}
					className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<button
					type="submit"
					disabled={creating || !newName.trim()}
					className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
				>
					{creating ? "Adding…" : "Add device"}
				</button>
			</form>

			<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-gray-200 bg-gray-50">
							<th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
							<th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
							<th className="px-4 py-3" />
						</tr>
					</thead>
					<tbody>
						{devices.map((device) => (
							<tr key={device.id} className="border-b border-gray-100 last:border-0">
								<td className="px-4 py-2">
									{renamingId === device.id ? (
										<input
											ref={renameInputRef}
											value={renameValue}
											onChange={(e) => setRenameValue(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") void commitRename(device.id);
												if (e.key === "Escape") setRenamingId(null);
											}}
											className="border border-blue-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-xs"
										/>
									) : (
										<span className="text-gray-900">{device.name}</span>
									)}
								</td>
								<td className="px-4 py-3 text-gray-600">
									{new Date(device.createdAt).toLocaleDateString()}
								</td>
								<td className="px-4 py-2 text-right">
									{renamingId === device.id ? (
										<div className="flex justify-end gap-3">
											<button
												onClick={() => void commitRename(device.id)}
												className="text-blue-600 hover:text-blue-800"
											>
												Save
											</button>
											<button
												onClick={() => setRenamingId(null)}
												className="text-gray-400 hover:text-gray-600"
											>
												Cancel
											</button>
										</div>
									) : (
										<div className="flex justify-end gap-3">
											<button
												onClick={() => startRename(device)}
												className="text-gray-500 hover:text-gray-700"
											>
												Rename
											</button>
											<button
												onClick={() => void handleDelete(device.id)}
												className="text-red-500 hover:text-red-700"
											>
												Delete
											</button>
										</div>
									)}
								</td>
							</tr>
						))}
						{devices.length === 0 && (
							<tr>
								<td colSpan={3} className="px-4 py-10 text-center text-gray-400">
									No devices yet
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
