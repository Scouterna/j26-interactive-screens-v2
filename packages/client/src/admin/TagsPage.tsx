import { useContext, useEffect, useRef, useState } from "react";
import { AuthError, fetchTagStats, uploadTags, type TagStats } from "../api";
import { AuthContext } from "./AdminLayout";

type UploadState =
	| { status: "idle" }
	| { status: "uploading" }
	| { status: "done"; count: number }
	| { status: "error"; message: string };

export default function TagsPage() {
	const { markUnauthorized } = useContext(AuthContext);
	const [stats, setStats] = useState<TagStats | null>(null);
	const [upload, setUpload] = useState<UploadState>({ status: "idle" });
	const [dragOver, setDragOver] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	function loadStats() {
		fetchTagStats()
			.then(setStats)
			.catch((err: unknown) => {
				if (err instanceof AuthError) markUnauthorized();
			});
	}

	useEffect(() => {
		loadStats();
	}, []);

	async function handleFile(file: File) {
		if (!file.name.endsWith(".csv")) {
			setUpload({ status: "error", message: "File must be a .csv" });
			return;
		}
		setUpload({ status: "uploading" });
		try {
			const result = await uploadTags(file);
			setUpload({ status: "done", count: result.count });
			loadStats();
		} catch (err) {
			if (err instanceof AuthError) markUnauthorized();
			else setUpload({ status: "error", message: "Upload failed." });
		}
	}

	function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) void handleFile(file);
		e.target.value = "";
	}

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragOver(false);
		const file = e.dataTransfer.files[0];
		if (file) void handleFile(file);
	}

	return (
		<div>
			<h1 className="text-xl font-semibold text-gray-900 mb-6">Tag mappings</h1>

			<div className="grid grid-cols-2 gap-4 mb-8">
				<StatCard
					label="Tags"
					value={stats?.tags ?? "—"}
					sub="unique RFID serials"
				/>
				<StatCard
					label="Groups"
					value={stats?.groups ?? "—"}
					sub="unique display names"
				/>
			</div>

			<p className="text-sm text-gray-500 mb-3">
				CSV columns:{" "}
				<code className="bg-gray-100 px-1 rounded text-xs">
					tag_id, display_name, lat, lng
				</code>
				. Existing tags are updated on conflict.
			</p>

			<div
				className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center gap-3 transition-colors cursor-pointer ${
					dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
				}`}
				onClick={() => inputRef.current?.click()}
				onDragOver={(e) => {
					e.preventDefault();
					setDragOver(true);
				}}
				onDragLeave={() => setDragOver(false)}
				onDrop={onDrop}
			>
				<input
					ref={inputRef}
					type="file"
					accept=".csv"
					className="hidden"
					onChange={onInputChange}
				/>

				{upload.status === "uploading" ? (
					<p className="text-sm text-gray-500">Uploading…</p>
				) : upload.status === "done" ? (
					<>
						<p className="text-sm font-medium text-green-700">
							{upload.count} tag{upload.count !== 1 ? "s" : ""} imported
						</p>
						<p className="text-xs text-gray-400">Drop or click to upload another file</p>
					</>
				) : (
					<>
						<p className="text-sm text-gray-500">
							Drop a CSV file here, or{" "}
							<span className="text-blue-600">click to browse</span>
						</p>
						{upload.status === "error" && (
							<p className="text-sm text-red-600">{upload.message}</p>
						)}
					</>
				)}
			</div>
		</div>
	);
}

function StatCard({
	label,
	value,
	sub,
}: {
	label: string;
	value: number | string;
	sub: string;
}) {
	return (
		<div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
			<p className="text-sm text-gray-500">{label}</p>
			<p className="text-3xl font-semibold text-gray-900 mt-1">{value.toLocaleString()}</p>
			<p className="text-xs text-gray-400 mt-1">{sub}</p>
		</div>
	);
}
