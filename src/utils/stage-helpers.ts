import type { LeverClient } from "../lever/client.js";
import type { LeverStage } from "../types/lever.js";

/**
 * Resolves stage identifiers (names or IDs) to stage IDs
 * Supports:
 * - Stage IDs (UUIDs) - returned as-is
 * - Stage names - resolved to IDs (case-insensitive, partial matching)
 * - Arrays of mixed identifiers
 *
 * @param client - The Lever API client
 * @param identifier - Single stage identifier or array of identifiers
 * @returns Array of resolved stage IDs
 * @throws Error if a stage cannot be resolved
 */
export async function resolveStageIdentifier(
	client: LeverClient,
	identifier: string | string[],
): Promise<string[]> {
	// Fetch all stages from the API
	const stages = await client.getStages();

	// Create a map of lowercase stage names to IDs for efficient lookup
	const stageMap = new Map<string, string>(
		stages.data.map((s: LeverStage) => [(s.text ?? "").toLowerCase(), s.id]),
	);

	// Ensure we're working with an array
	const identifiers = Array.isArray(identifier) ? identifier : [identifier];

	// Resolve each identifier
	return identifiers.map((id: string): string => {
		// If it's already a UUID (36 chars with hyphens), return it as-is
		if (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
			return id;
		}

		// Convert to lowercase for case-insensitive matching
		const lower = id.toLowerCase();

		// Try exact match first
		if (stageMap.has(lower)) {
			return stageMap.get(lower)!;
		}

		// Try partial match - find stages that contain the search term
		for (const [name, stageId] of stageMap) {
			if (name.includes(lower) || lower.includes(name)) {
				return stageId;
			}
		}

		// If no match found, throw an error
		throw new Error(`Stage "${id}" not found`);
	});
}

/**
 * Helper to resolve a single stage identifier to an ID
 *
 * @param client - The Lever API client
 * @param identifier - Stage name or ID
 * @returns Resolved stage ID
 * @throws Error if the stage cannot be resolved
 */
export async function resolveSingleStageIdentifier(
	client: LeverClient,
	identifier: string,
): Promise<string> {
	const results = await resolveStageIdentifier(client, identifier);
	return results[0]!;
}
