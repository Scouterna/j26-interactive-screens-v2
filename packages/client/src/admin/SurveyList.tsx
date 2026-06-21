import { Link } from "@tanstack/react-router";
import { useContext, useEffect, useState } from "react";
import type { SurveyResponse, SurveyStatus } from "shared";
import { AuthError, deleteSurvey, fetchSurveys } from "../api";
import { AuthContext } from "./AdminLayout";
import CreateSurveyModal from "./CreateSurveyModal";

const STATUS_CLASSES: Record<SurveyStatus, string> = {
	active: "bg-green-100 text-green-700",
	draft: "bg-amber-100 text-amber-700",
	ended: "bg-red-100 text-red-700",
	archived: "bg-purple-100 text-purple-700",
};

export default function SurveyList() {
	const { markUnauthorized } = useContext(AuthContext);
	const [surveys, setSurveys] = useState<SurveyResponse[] | null>(null);
	const [showCreate, setShowCreate] = useState(false);

	useEffect(() => {
		fetchSurveys()
			.then(setSurveys)
			.catch((err: unknown) => {
				if (err instanceof AuthError) markUnauthorized();
				else setSurveys([]);
			});
	}, [markUnauthorized]);

	async function handleDelete(id: string, name: string) {
		if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
		try {
			await deleteSurvey(id);
			setSurveys((prev) => prev.filter((s) => s.id !== id));
		} catch (err) {
			if (err instanceof AuthError) markUnauthorized();
		}
	}

	const draftSurveys = (surveys ?? []).filter((s) => s.status === "draft");
	const activeSurveys = (surveys ?? []).filter((s) => s.status === "active");
	const endedSurveys = (surveys ?? []).filter((s) => s.status === "ended");
	const archivedSurveys = (surveys ?? []).filter((s) => s.status === "archived");

	function renderTable(rows: SurveyResponse[], emptyText: string) {
		return (
			<div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-gray-200 bg-gray-50">
							<th className="px-4 py-3 text-left font-medium text-gray-500">
								Name
							</th>
							<th className="px-4 py-3 text-left font-medium text-gray-500">
								Type
							</th>
							<th className="px-4 py-3 text-left font-medium text-gray-500">
								Status
							</th>
							<th className="px-4 py-3 text-left font-medium text-gray-500">
								Created
							</th>
							<th className="px-4 py-3" />
						</tr>
					</thead>
					<tbody>
						{surveys === null ? (
							<tr>
								<td colSpan={5} className="px-4 py-10 text-center text-gray-400">
									Loading…
								</td>
							</tr>
						) : rows.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-4 py-10 text-center text-gray-400">
									{emptyText}
								</td>
							</tr>
						) : rows.map((survey) => (
							<tr
								key={survey.id}
								className="border-b border-gray-100 last:border-0"
							>
								<td className="px-4 py-3">
									<Link
										to="/admin/surveys/$id"
										params={{ id: survey.id }}
										className="font-medium text-blue-600 hover:underline"
									>
										{survey.name}
									</Link>
								</td>
								<td className="px-4 py-3 text-gray-600 capitalize">
									{survey.type}
								</td>
								<td className="px-4 py-3">
									<span
										className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[survey.status]}`}
									>
										{survey.status}
									</span>
								</td>
								<td className="px-4 py-3 text-gray-600">
									{new Date(survey.createdAt).toLocaleDateString()}
								</td>
								<td className="px-4 py-3 text-right">
									<button
										type="button"
										onClick={() => void handleDelete(survey.id, survey.name)}
										className="text-red-500 hover:text-red-700"
									>
										Delete
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}

	return (
		<div>
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-xl font-semibold text-gray-900">Surveys</h1>
				<button
					type="button"
					onClick={() => setShowCreate(true)}
					className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
				>
					New survey
				</button>
			</div>

			{draftSurveys.length > 0 && (
				<div className="mb-8">
					<h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
						Drafts
					</h2>
					{renderTable(draftSurveys, "")}
				</div>
			)}

			<h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
				Active
			</h2>
			{renderTable(activeSurveys, "No active surveys")}

			{endedSurveys.length > 0 && (
				<div className="mt-8">
					<h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
						Voting closed
					</h2>
					{renderTable(endedSurveys, "")}
				</div>
			)}

			{archivedSurveys.length > 0 && (
				<div className="mt-8">
					<h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
						Archived
					</h2>
					{renderTable(archivedSurveys, "")}
				</div>
			)}

			{showCreate && (
				<CreateSurveyModal
					onClose={() => setShowCreate(false)}
					onCreate={(survey) => {
						setSurveys((prev) => [...prev, survey]);
						setShowCreate(false);
					}}
				/>
			)}
		</div>
	);
}
