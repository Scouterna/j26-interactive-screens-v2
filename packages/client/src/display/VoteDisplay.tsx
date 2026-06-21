import type { VoteDisplayState } from "shared";

export default function VoteDisplay({ state }: { state: VoteDisplayState }) {
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
							<span className="text-2xl font-semibold text-white">{bucket.label}</span>
							<span className="text-xl text-gray-400">{pct}%</span>
						</div>
						<div className="h-8 bg-gray-800 rounded-full overflow-hidden">
							<div
								className="h-8 bg-blue-500 rounded-full transition-all duration-700 ease-out"
								style={{ width: `${pct}%` }}
							/>
						</div>
					</div>
				);
			})}
			<p className="text-center text-gray-500 text-sm mt-2">
				{state.totalVotes} röst{state.totalVotes !== 1 ? "er" : ""}
			</p>
		</div>
	);
}
