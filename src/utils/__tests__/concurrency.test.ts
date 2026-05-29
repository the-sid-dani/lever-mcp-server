import { describe, it, expect } from "vitest";
import { mapLimit } from "../concurrency.js";

// Small async delay used to keep multiple calls in flight long enough to
// observe concurrency. Real timers, tiny durations, deterministic.
function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("mapLimit", () => {
	it("maps all items preserving input order", async () => {
		const items = [1, 2, 3, 4, 5];
		const out = await mapLimit(items, 2, async (x) => x * 2);
		expect(out).toEqual([2, 4, 6, 8, 10]);
	});

	it("never exceeds the concurrency limit", async () => {
		const items = [1, 2, 3, 4, 5, 6, 7, 8];
		const limit = 3;
		let inFlight = 0;
		let observedMax = 0;

		const out = await mapLimit(items, limit, async (x) => {
			inFlight += 1;
			observedMax = Math.max(observedMax, inFlight);
			await delay(10);
			inFlight -= 1;
			return x;
		});

		expect(out).toEqual(items);
		expect(observedMax).toBeLessThanOrEqual(limit);
		// Sanity: with 8 items and limit 3 we should actually saturate.
		expect(observedMax).toBe(limit);
	});

	it("rejects if one fn rejects (first rejection surfaces, not swallowed)", async () => {
		const items = [1, 2, 3, 4];
		await expect(
			mapLimit(items, 2, async (x) => {
				if (x === 3) {
					throw new Error("boom on 3");
				}
				return x;
			}),
		).rejects.toThrow("boom on 3");
	});

	it("returns [] for empty input", async () => {
		const out = await mapLimit([], 4, async (x) => x);
		expect(out).toEqual([]);
	});

	it("works when limit is larger than the item count", async () => {
		const items = [10, 20, 30];
		const out = await mapLimit(items, 100, async (x, i) => x + i);
		expect(out).toEqual([10, 21, 32]);
	});

	it("clamps limit < 1 to a single worker and still completes", async () => {
		const items = [1, 2, 3];
		const out = await mapLimit(items, 0, async (x) => x * 10);
		expect(out).toEqual([10, 20, 30]);
	});
});
