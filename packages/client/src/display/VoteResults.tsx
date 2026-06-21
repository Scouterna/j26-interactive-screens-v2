import type { VoteDisplayState } from "shared";

export default function VoteResults({ state, daylight }: { state: VoteDisplayState; daylight: boolean }) {
	const sorted = [...state.buckets]
		.map((b) => ({
			...b,
			pct: state.totalVotes > 0 ? Math.round((b.count / state.totalVotes) * 100) : 0,
		}))
		.sort((a, b) => b.count - a.count);

	return (
		<div className="flex flex-col items-center w-full max-w-2xl mx-auto px-12">
			<p className={`text-2xl font-bold tracking-widest uppercase mb-12 ${daylight ? "text-gray-900" : "text-white"}`}>
				Röstning avslutad
			</p>

			<div className="w-full flex flex-col gap-5">
				{sorted.map((bucket, i) => (
					<div key={bucket.label}>
						<div className="flex items-baseline justify-between mb-2">
							<div className="flex items-baseline gap-3">
								<span className={`text-sm font-medium ${i === 0 ? (daylight ? "text-amber-500" : "text-yellow-400") : (daylight ? "text-gray-400" : "text-gray-600")}`}>
									{i + 1}.
								</span>
								<span className={`font-semibold ${i === 0 ? (daylight ? "text-gray-900 text-3xl" : "text-white text-3xl") : (daylight ? "text-gray-600 text-2xl" : "text-gray-300 text-2xl")}`}>
									{bucket.label}
								</span>
							</div>
							<div className="flex items-baseline gap-3">
								<span className={`font-bold ${i === 0 ? (daylight ? "text-gray-900 text-3xl" : "text-white text-3xl") : (daylight ? "text-gray-500 text-2xl" : "text-gray-400 text-2xl")}`}>
									{bucket.pct}%
								</span>
								<span className={`text-sm ${daylight ? "text-gray-400" : "text-gray-600"}`}>
									{bucket.count} röst{bucket.count !== 1 ? "er" : ""}
								</span>
							</div>
						</div>
						<div className={`h-2 rounded-full overflow-hidden ${daylight ? "bg-gray-200" : "bg-gray-800"}`}>
							<div
								className="h-2 rounded-full"
								style={{ width: `${bucket.pct}%`, backgroundColor: i === 0 ? (daylight ? "#f59e0b" : "#facc15") : "#003660" }}
							/>
						</div>
					</div>
				))}
			</div>

			<p className={`text-sm mt-10 ${daylight ? "text-gray-400" : "text-gray-600"}`}>
				Totalt {state.totalVotes} röst{state.totalVotes !== 1 ? "er" : ""}
			</p>
		</div>
	);
}
