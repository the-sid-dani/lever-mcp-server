import { describe, it, expect, vi } from "vitest";
import { collectAllPages, type Page } from "../paginate.js";

describe("collectAllPages", () => {
	it("walks three pages then stops when the API reports no more", async () => {
		const fetchPage = vi
			.fn<(offset: string | undefined) => Promise<Page<number>>>()
			.mockResolvedValueOnce({ data: [1], hasNext: true, next: "a" })
			.mockResolvedValueOnce({ data: [2], hasNext: true, next: "b" })
			.mockResolvedValueOnce({ data: [3], hasNext: false });

		const result = await collectAllPages(fetchPage);

		expect(result.items).toEqual([1, 2, 3]);
		expect(result.pages).toBe(3);
		expect(result.complete).toBe(true);
		expect(fetchPage).toHaveBeenCalledTimes(3);
		expect(fetchPage).toHaveBeenNthCalledWith(1, undefined);
		expect(fetchPage).toHaveBeenNthCalledWith(2, "a");
		expect(fetchPage).toHaveBeenNthCalledWith(3, "b");
	});

	it("stops on a non-advancing cursor instead of looping forever", async () => {
		// The bug this guards against: hasNext:true with the SAME next token as
		// the offset we just fetched with. A naive while(true) loop spins here.
		const fetchPage = vi.fn(async (offset: string | undefined) => {
			if (offset === undefined) {
				return { data: [1], hasNext: true, next: "a" } as Page<number>;
			}
			if (offset === "a") {
				// next === offset -> cursor did not advance.
				return { data: [2], hasNext: true, next: "a" } as Page<number>;
			}
			// A third call means the defensive guard failed -> surface regression.
			throw new Error("regression: paginator did not stop on stuck cursor");
		});

		const result = await collectAllPages(fetchPage);

		expect(result.items).toEqual([1, 2]);
		expect(result.pages).toBe(2);
		expect(result.complete).toBe(false);
		expect(fetchPage).toHaveBeenCalledTimes(2);
	});

	it("stops on an empty page while hasNext is still true", async () => {
		const fetchPage = vi.fn(async (offset: string | undefined) => {
			if (offset === undefined) {
				return { data: [1], hasNext: true, next: "a" } as Page<number>;
			}
			if (offset === "a") {
				return { data: [], hasNext: true, next: "b" } as Page<number>;
			}
			throw new Error("regression: paginator did not stop on empty page");
		});

		const result = await collectAllPages(fetchPage);

		expect(result.items).toEqual([1]);
		expect(result.pages).toBe(2);
		expect(result.complete).toBe(false);
		expect(fetchPage).toHaveBeenCalledTimes(2);
	});

	it("throws when an always-advancing cursor exceeds maxPages", async () => {
		let counter = 0;
		const fetchPage = vi.fn(async (_offset: string | undefined) => {
			counter += 1;
			return {
				data: [counter],
				hasNext: true,
				next: String(counter),
			} as Page<number>;
		});

		await expect(collectAllPages(fetchPage, { maxPages: 3 })).rejects.toThrow(
			/maxPages=3/,
		);
	});

	it("does not throw when a dataset ends exactly at maxPages", async () => {
		const fetchPage = vi
			.fn<(offset: string | undefined) => Promise<Page<number>>>()
			.mockResolvedValueOnce({ data: [1], hasNext: true, next: "a" })
			.mockResolvedValueOnce({ data: [2], hasNext: true, next: "b" })
			.mockResolvedValueOnce({ data: [3], hasNext: false });

		const result = await collectAllPages(fetchPage, { maxPages: 3 });

		expect(result.items).toEqual([1, 2, 3]);
		expect(result.pages).toBe(3);
		expect(result.complete).toBe(true);
	});

	it("handles an empty first page that reports no more", async () => {
		const fetchPage = vi
			.fn<(offset: string | undefined) => Promise<Page<number>>>()
			.mockResolvedValueOnce({ data: [], hasNext: false });

		const result = await collectAllPages(fetchPage);

		expect(result.items).toEqual([]);
		expect(result.pages).toBe(1);
		expect(result.complete).toBe(true);
	});
});
