import type { VoteDisplayState, VoteSurveyConfig } from "shared";
import type { ScanResult, SurveyHandler } from "./types.js";

export interface VoteMemState {
	votedTags: Set<string>;
	bucketCounts: Map<string, number>;
}

export const voteHandler: SurveyHandler<VoteSurveyConfig, VoteMemState> = {
	buildState(survey, events) {
		const config = survey.config as VoteSurveyConfig;
		const votedTags = new Set<string>();
		const bucketCounts = new Map<string, number>(
			config.buckets.map((b) => [b.label, 0]),
		);

		for (const event of events) {
			if (!event.accepted) continue;
			votedTags.add(event.tagId);
			const bucket = config.buckets.find((b) =>
				b.scannerIds.includes(event.scannerId),
			);
			if (bucket)
				bucketCounts.set(
					bucket.label,
					(bucketCounts.get(bucket.label) ?? 0) + 1,
				);
		}

		return { votedTags, bucketCounts };
	},

	handleScan(state, scan, config): ScanResult<VoteMemState> {
		if (state.votedTags.has(scan.tagId))
			return {
				accepted: false,
				rejectionReason: "already_voted",
				newState: state,
			};

		const bucket = config.buckets.find((b) =>
			b.scannerIds.includes(scan.scannerId),
		);
		if (!bucket)
			return {
				accepted: false,
				rejectionReason: "scanner_not_in_bucket",
				newState: state,
			};

		const newVotedTags = new Set(state.votedTags);
		newVotedTags.add(scan.tagId);
		const newBucketCounts = new Map(state.bucketCounts);
		newBucketCounts.set(
			bucket.label,
			(newBucketCounts.get(bucket.label) ?? 0) + 1,
		);

		return {
			accepted: true,
			newState: { votedTags: newVotedTags, bucketCounts: newBucketCounts },
		};
	},

	toDisplayState(state, config): VoteDisplayState {
		const buckets = config.buckets.map((b) => ({
			label: b.label,
			count: state.bucketCounts.get(b.label) ?? 0,
		}));
		return {
			type: "vote",
			buckets,
			totalVotes: buckets.reduce((s, b) => s + b.count, 0),
		};
	},

	cleanupExpired(state) {
		return { changed: false, newState: state };
	},
};
