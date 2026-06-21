import type { VoteDisplayState } from "shared";

export default function VoteDisplay({ state, daylight }: { state: VoteDisplayState; daylight: boolean }) {
	return (
		<div className="flex flex-col justify-center gap-6 w-full max-w-3xl mx-auto px-12">
			{state.buckets.map((bucket) => {
				const pct =
					state.totalVotes > 0
						? Math.round((bucket.count / state.totalVotes) * 100)
						: 0;
				return (
					<div key={bucket.label}>
						<div className="flex justify-between items-baseline mb-2">
							<span className={`text-2xl font-semibold ${daylight ? "text-gray-900" : "text-white"}`}>
								{bucket.label}
							</span>
							<span className={`text-xl ${daylight ? "text-gray-500" : "text-gray-400"}`}>{pct}%</span>
						</div>
						<div className={`h-8 rounded-full overflow-hidden ${daylight ? "bg-gray-200" : "bg-gray-800"}`}>
							<div
								className="h-8 rounded-full transition-all duration-700 ease-out"
								style={{ width: `${pct}%`, backgroundColor: "#003660" }}
							/>
						</div>
					</div>
				);
			})}
			<p className={`text-center text-sm mt-2 ${daylight ? "text-gray-500" : "text-gray-500"}`}>
				{state.totalVotes} röst{state.totalVotes !== 1 ? "er" : ""}
			</p>
		</div>
	);
}
