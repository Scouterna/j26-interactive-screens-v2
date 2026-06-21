import { useParams } from "@tanstack/react-router";
import type { VoteDisplayState } from "shared";
import { useSurveySocket } from "../hooks/useSurveySocket";
import VoteDisplay from "./VoteDisplay";
import VoteResults from "./VoteResults";

export default function DisplayView() {
	const { surveyId } = useParams({ strict: false }) as { surveyId: string };
	const { displayState, ended, archived } = useSurveySocket(surveyId);

	if (archived) {
		return <div className="min-h-screen bg-gray-950" />;
	}

	if (ended && displayState?.type === "vote") {
		return (
			<div className="min-h-screen bg-gray-950 flex items-center justify-center">
				<VoteResults state={displayState as VoteDisplayState} />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
			{!displayState ? (
				!ended && <p className="text-gray-700 text-xl">Ansluter…</p>
			) : displayState.type === "vote" ? (
				<VoteDisplay state={displayState} />
			) : (
				<p className="text-gray-500 text-xl">
					{displayState.pins.length} nål{displayState.pins.length !== 1 ? "ar" : ""} aktiv{displayState.pins.length !== 1 ? "a" : ""}
				</p>
			)}
			{ended && (
				<p className="text-gray-600 text-sm uppercase tracking-widest mt-8">
					Röstning avslutad
				</p>
			)}
		</div>
	);
}
