import { useParams } from "@tanstack/react-router";
import type { MapDisplayState, VoteDisplayState } from "shared";
import { useDaylight } from "../hooks/useDaylight";
import { useSurveySocket } from "../hooks/useSurveySocket";
import MapDisplay from "./MapDisplay";
import VoteDisplay from "./VoteDisplay";
import VoteResults from "./VoteResults";

export default function DisplayView() {
	const { surveyId } = useParams({ strict: false }) as { surveyId: string };
	const { displayState, ended, archived } = useSurveySocket(surveyId);
	const daylight = useDaylight();

	const bg = daylight ? "bg-white" : "bg-gray-950";

	if (archived) {
		return <div className={`min-h-screen ${bg}`} />;
	}

	if (ended && displayState?.type === "vote") {
		return (
			<div className={`min-h-screen ${bg} flex items-center justify-center`}>
				<VoteResults
					state={displayState as VoteDisplayState}
					daylight={daylight}
				/>
			</div>
		);
	}

	if (displayState?.type === "map") {
		return (
			<MapDisplay state={displayState as MapDisplayState} daylight={daylight} />
		);
	}

	return (
		<div
			className={`min-h-screen ${bg} flex flex-col items-center justify-center`}
		>
			{!displayState ? (
				!ended && (
					<p
						className={`text-xl ${daylight ? "text-gray-400" : "text-gray-700"}`}
					>
						Ansluter…
					</p>
				)
			) : (
				<VoteDisplay state={displayState} daylight={daylight} />
			)}
			{ended && (
				<p
					className={`text-sm uppercase tracking-widest mt-8 ${daylight ? "text-gray-400" : "text-gray-600"}`}
				>
					Röstning avslutad
				</p>
			)}
		</div>
	);
}
