import type { VoteDisplayState } from "shared";

export default function VoteResults({ state }: { state: VoteDisplayState }) {
	const sorted = [...state.buckets]
		.map((b) => ({
			...b,
			pct: state.totalVotes > 0 ? Math.round((b.count / state.totalVotes) * 100) : 0,
		}))
		.sort((a, b) => b.count - a.count);

	return (
		<div className="flex flex-col items-center w-full max-w-2xl mx-auto px-12">
			<p className="text-white text-2xl font-bold tracking-widest uppercase mb-12">
				Röstning avslutad
			</p>

			<div className="w-full flex flex-col gap-5">
				{sorted.map((bucket, i) => (
					<div key={bucket.label}>
						<div className="flex items-baseline justify-between mb-2">
							<div className="flex items-baseline gap-3">
								<span className={`text-sm font-medium ${i === 0 ? "text-yellow-400" : "text-gray-600"}`}>
									{i + 1}.
								</span>
								<span className={`font-semibold ${i === 0 ? "text-white text-3xl" : "text-gray-300 text-2xl"}`}>
									{bucket.label}
								</span>
							</div>
							<div className="flex items-baseline gap-3">
								<span className={`font-bold ${i === 0 ? "text-white text-3xl" : "text-gray-400 text-2xl"}`}>
									{bucket.pct}%
								</span>
								<span className="text-gray-600 text-sm">
									{bucket.count} röst{bucket.count !== 1 ? "er" : ""}
								</span>
							</div>
						</div>
						<div className="h-2 bg-gray-800 rounded-full overflow-hidden">
							<div
								className={`h-2 rounded-full ${i === 0 ? "bg-yellow-400" : "bg-gray-600"}`}
								style={{ width: `${bucket.pct}%` }}
							/>
						</div>
					</div>
				))}
			</div>

			<p className="text-gray-600 text-sm mt-10">
				Totalt {state.totalVotes} röst{state.totalVotes !== 1 ? "er" : ""}
			</p>
		</div>
	);
}
