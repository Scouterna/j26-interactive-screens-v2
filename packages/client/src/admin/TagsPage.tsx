import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AuthError, deleteTag, fetchTagStats, fetchTags, uploadTags, type TagStats } from "../api";
import type { TagItem, TagsPage } from "shared";
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

	const [search, setSearch] = useState("");
	const [page, setPage] = useState<TagsPage | null>(null);
	const [offset, setOffset] = useState(0);
	const [loading, setLoading] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	function loadStats() {
		fetchTagStats()
			.then(setStats)
			.catch((err: unknown) => {
				if (err instanceof AuthError) markUnauthorized();
			});
	}

	const loadTags = useCallback(
		(s: string, off: number) => {
			setLoading(true);
			fetchTags(s, off)
				.then(setPage)
				.catch((err: unknown) => {
					if (err instanceof AuthError) markUnauthorized();
				})
				.finally(() => setLoading(false));
		},
		[markUnauthorized],
	);

	useEffect(() => {
		loadStats();
		loadTags("", 0);
	}, []);

	function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
		const val = e.target.value;
		setSearch(val);
		setOffset(0);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => loadTags(val, 0), 300);
	}

	function goTo(newOffset: number) {
		setOffset(newOffset);
		loadTags(search, newOffset);
	}

	async function handleDelete(tag: TagItem) {
		if (!window.confirm(`Delete tag "${tag.tagId}" (${tag.displayName})? This cannot be undone.`)) return;
		try {
			await deleteTag(tag.tagId);
			loadStats();
			loadTags(search, offset);
		} catch (err) {
			if (err instanceof AuthError) markUnauthorized();
		}
	}

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
			loadTags(search, offset);
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

	const total = page?.total ?? 0;
	const pageSize = page?.pageSize ?? 50;
	const hasPrev = offset > 0;
	const hasNext = offset + pageSize < total;

	return (
		<div>
			<h1 className="text-xl font-semibold text-gray-900 mb-6">Tag mappings</h1>

			<div className="grid grid-cols-2 gap-4 mb-8">
				<StatCard label="Tags" value={stats?.tags ?? "—"} sub="unique RFID serials" />
				<StatCard label="Groups" value={stats?.groups ?? "—"} sub="unique display names" />
			</div>

			<p className="text-sm text-gray-500 mb-3">
				CSV columns:{" "}
				<code className="bg-gray-100 px-1 rounded text-xs">tag_id, display_name, lat, lng</code>.
				Existing tags are updated on conflict.
			</p>

			<div
				className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer mb-8 ${
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
				<input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onInputChange} />

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
							Drop a CSV file here, or <span className="text-blue-600">click to browse</span>
						</p>
						{upload.status === "error" && (
							<p className="text-sm text-red-600">{upload.message}</p>
						)}
					</>
				)}
			</div>

			<div className="flex items-center gap-3 mb-3">
				<input
					type="search"
					placeholder="Search by tag ID or name…"
					value={search}
					onChange={handleSearchChange}
					className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				{total > 0 && (
					<span className="text-sm text-gray-500 shrink-0">
						{total.toLocaleString()} tag{total !== 1 ? "s" : ""}
					</span>
				)}
			</div>

			<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-gray-200 bg-gray-50">
							<th className="px-4 py-3 text-left font-medium text-gray-500">Tag ID</th>
							<th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
							<th className="px-4 py-3 text-left font-medium text-gray-500">Lat</th>
							<th className="px-4 py-3 text-left font-medium text-gray-500">Lng</th>
							<th className="px-4 py-3" />
						</tr>
					</thead>
					<tbody>
						{loading && !page ? (
							<tr>
								<td colSpan={5} className="px-4 py-10 text-center text-gray-400">
									Loading…
								</td>
							</tr>
						) : page?.rows.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-4 py-10 text-center text-gray-400">
									No tags found
								</td>
							</tr>
						) : (
							page?.rows.map((tag) => (
								<tr key={tag.id} className="border-b border-gray-100 last:border-0">
									<td className="px-4 py-2 font-mono text-xs text-gray-700">{tag.tagId}</td>
									<td className="px-4 py-2 text-gray-900">{tag.displayName}</td>
									<td className="px-4 py-2 text-gray-500">{tag.lat}</td>
									<td className="px-4 py-2 text-gray-500">{tag.lng}</td>
									<td className="px-4 py-2 text-right">
										<button
											type="button"
											onClick={() => void handleDelete(tag)}
											className="text-red-500 hover:text-red-700"
										>
											Delete
										</button>
									</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{total > 0 && (
				<div className="flex items-center justify-between mt-3">
					<button
						type="button"
						disabled={!hasPrev}
						onClick={() => goTo(offset - pageSize)}
						className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
					>
						Previous
					</button>
					<span className="text-sm text-gray-500">
						{offset + 1}–{Math.min(offset + pageSize, total)} of {total.toLocaleString()}
					</span>
					<button
						type="button"
						disabled={!hasNext}
						onClick={() => goTo(offset + pageSize)}
						className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
					>
						Next
					</button>
				</div>
			)}
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
