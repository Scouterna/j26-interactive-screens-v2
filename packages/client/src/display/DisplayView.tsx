import { useParams } from "@tanstack/react-router";
import { useSurveySocket } from "../hooks/useSurveySocket";
import VoteDisplay from "./VoteDisplay";

export default function DisplayView() {
	const { surveyId } = useParams({ strict: false }) as { surveyId: string };
	const { displayState, ended, archived } = useSurveySocket(surveyId);

	if (archived) {
		return <div className="min-h-screen bg-gray-950" />;
	}

	return (
		<div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
			{ended && (
				<p className="text-gray-600 text-xs uppercase tracking-widest mb-10">
					Röstning avslutad
				</p>
			)}
			{!displayState ? (
				!ended && <p className="text-gray-700 text-xl">Ansluter…</p>
			) : displayState.type === "vote" ? (
				<VoteDisplay state={displayState} />
			) : (
				<p className="text-gray-500 text-xl">
					{displayState.pins.length} nål{displayState.pins.length !== 1 ? "ar" : ""} aktiv{displayState.pins.length !== 1 ? "a" : ""}
				</p>
			)}
		</div>
	);
}
