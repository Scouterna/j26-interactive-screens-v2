import { useParams } from "@tanstack/react-router";
import { useSurveySocket } from "../hooks/useSurveySocket";
import VoteDisplay from "./VoteDisplay";

export default function DisplayView() {
	const { surveyId } = useParams({ strict: false }) as { surveyId: string };
	const { displayState, ended } = useSurveySocket(surveyId);

	return (
		<div className="min-h-screen bg-gray-950 flex items-center justify-center">
			{ended ? (
				<p className="text-gray-500 text-xl">Survey ended</p>
			) : !displayState ? (
				<p className="text-gray-600 text-xl">Connecting…</p>
			) : displayState.type === "vote" ? (
				<VoteDisplay state={displayState} />
			) : (
				<p className="text-gray-500 text-xl">
					{displayState.pins.length} pin{displayState.pins.length !== 1 ? "s" : ""} active
				</p>
			)}
		</div>
	);
}
