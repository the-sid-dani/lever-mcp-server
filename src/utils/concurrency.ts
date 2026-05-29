// Bounded-concurrency helper. Runs an async mapper over a list with at most
// `limit` in-flight calls at a time. Used to replace unbounded Promise.all over
// per-candidate Lever API calls, which would blow past Lever's ~10 req/sec
// rate limit and trigger 429 storms.
//
// Semantics:
// - At most `limit` concurrent in-flight calls (limit is clamped to >= 1).
// - Results are returned in INPUT ORDER: results[i] corresponds to items[i].
// - On the first rejection, the returned promise rejects with that error.
// - Empty input resolves to [].

export async function mapLimit<T, R>(
	items: readonly T[],
	limit: number,
	fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	if (items.length === 0) {
		return results;
	}

	// Clamp to at least one worker so we never deadlock on limit <= 0.
	const workers = Math.max(1, Math.min(Math.floor(limit), items.length));

	// Shared cursor across workers. Each worker pulls the next index, runs the
	// mapper, stores the result by index, then loops. A sliding window forms
	// naturally: at most `workers` calls are ever in flight.
	let next = 0;

	async function worker(): Promise<void> {
		while (next < items.length) {
			const index = next;
			next += 1;
			results[index] = await fn(items[index] as T, index);
		}
	}

	// Promise.all surfaces the first rejection (and does not swallow it). The
	// remaining workers' in-flight calls settle but their results are ignored.
	await Promise.all(Array.from({ length: workers }, () => worker()));

	return results;
}
