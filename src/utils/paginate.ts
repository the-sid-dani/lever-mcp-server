// Cursor-safe paginator. Walks a cursor-based API to completion, accumulating
// data across pages, but is hardened against the two failure modes that turn a
// `while(true)` loop into an infinite one that hammers the API at full rate
// until the container dies:
//   1. A NON-ADVANCING cursor: the API reports hasNext:true but hands back the
//      same `next` token it gave on the prior call.
//   2. An EMPTY page while hasNext is still true: data:[] + hasNext:true.
// Both are treated as DEFENSIVE terminals — pagination stops and `complete` is
// set to false, an honest signal that the sweep may be partial.
//
// Semantics:
// - `complete` is TRUE only when pagination stopped because the API itself
//   reported no more pages (!hasNext || !next). Any defensive stop sets it
//   false. A non-advancing or empty-while-hasNext page can never loop forever.
// - `maxPages` is a hard safety bound. Exceeding it THROWS (loud) rather than
//   silently capping, preserving the "no silent truncation" intent. The throw
//   only fires when there is MORE to fetch, so a dataset that ends exactly at
//   `maxPages` pages does NOT throw. Default maxPages = 1000 (=100k records at
//   100/page).

export interface Page<T> {
	data?: T[];
	hasNext?: boolean;
	next?: string;
}

export interface CollectResult<T> {
	items: T[];
	pages: number;
	complete: boolean;
}

export async function collectAllPages<T>(
	fetchPage: (offset: string | undefined) => Promise<Page<T>>,
	opts?: { maxPages?: number },
): Promise<CollectResult<T>> {
	const items: T[] = [];
	let offset: string | undefined = undefined;
	let pages = 0;
	const maxPages = opts?.maxPages ?? 1000;

	while (true) {
		const page = await fetchPage(offset);
		const data = page.data ?? [];
		items.push(...data);
		pages += 1;

		// Normal terminal: the API reports no more pages.
		if (!page.hasNext || !page.next) {
			return { items, pages, complete: true };
		}

		// Defensive terminal: cursor did not advance -> would loop forever.
		if (page.next === offset) {
			return { items, pages, complete: false };
		}

		// Defensive terminal: empty page while hasNext is still true -> anomaly.
		if (data.length === 0) {
			return { items, pages, complete: false };
		}

		// We are about to fetch another page. Advance the cursor, then enforce
		// the hard safety bound. Checking AFTER the terminal returns means a
		// dataset that ends exactly at maxPages pages does not throw.
		offset = page.next;
		if (pages >= maxPages) {
			throw new Error(
				`collectAllPages exceeded maxPages=${maxPages} (possible non-terminating cursor)`,
			);
		}
	}
}
