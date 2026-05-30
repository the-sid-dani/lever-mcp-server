import type { LeverOpportunity, LeverPosting } from "../types/lever.js";

// Helper to format opportunity data
export function formatOpportunity(opp: LeverOpportunity): Record<string, any> {
	if (!opp || typeof opp !== "object") {
		return {
			id: "",
			name: "Error: Invalid data",
			email: "N/A",
			stage: "Unknown",
			posting: "Unknown",
			location: "Unknown",
			organizations: "",
			created: "Unknown",
		};
	}

	const name = opp.name || "Unknown";
	const emails = opp.emails || [];
	const email = emails[0] || "N/A";

	const stageText =
		typeof opp.stage === "object" && opp.stage
			? opp.stage.text
			: String(opp.stage || "Unknown");

	const postingText =
		opp.posting && typeof opp.posting === "object" ? opp.posting.text : "Unknown";

	// Location is a string in the API, not an object
	const location = opp.location || "Unknown";

	const createdDate = opp.createdAt
		? new Date(opp.createdAt).toISOString().split("T")[0]
		: "Unknown";

	// Extract owner/recruiter information
	let ownerName = "Unassigned";
	let ownerId = "";
	if (typeof opp.owner === "object" && opp.owner) {
		ownerName = opp.owner.name || "Unknown";
		ownerId = opp.owner.id || "";
	} else if (typeof opp.owner === "string") {
		ownerId = opp.owner;
		ownerName = `User ID: ${opp.owner}`;
	}

	return {
		id: opp.id || "",
		name,
		email,
		stage: stageText,
		posting: postingText,
		location,
		organizations: opp.headline || "",
		owner: { id: ownerId, name: ownerName },
		created: createdDate,
	};
}

// Helper to format posting data
export function formatPosting(posting: LeverPosting): Record<string, unknown> {
	const location = posting.categories?.location || "Unknown";
	const team = posting.categories?.team || "Unknown";

	let ownerName = "Unassigned";
	let ownerId = "";
	if (typeof posting.owner === "object" && posting.owner) {
		ownerName = posting.owner.name || "Unknown";
		ownerId = posting.owner.id || "";
	} else if (typeof posting.owner === "string") {
		ownerId = posting.owner;
		ownerName = `User ID: ${posting.owner}`;
	}

	let hiringManagerName = "Unassigned";
	let hiringManagerId = "";
	if (typeof posting.hiringManager === "object" && posting.hiringManager) {
		hiringManagerName = posting.hiringManager.name || "Unknown";
		hiringManagerId = posting.hiringManager.id || "";
	} else if (typeof posting.hiringManager === "string") {
		hiringManagerId = posting.hiringManager;
		hiringManagerName = `User ID: ${posting.hiringManager}`;
	}

	return {
		id: posting.id || "",
		title: posting.text || "Unknown",
		state: posting.state || "Unknown",
		location,
		team,
		posting_owner: { id: ownerId, name: ownerName },
		hiring_manager: { id: hiringManagerId, name: hiringManagerName },
		url: posting.urls?.show || "",
	};
}
