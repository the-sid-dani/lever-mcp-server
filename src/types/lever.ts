// Lever API Types
export interface LeverOpportunity {
	id: string;
	name: string;
	headline?: string;
	emails?: string[];
	location?: string; // Changed from string | { name: string } to just string
	stage?: string | { text: string; id?: string };
	posting?: { text: string; id?: string };
	tags?: string[];
	organizations?: string[];
	createdAt?: number;
	updatedAt?: number;
	resume?: string;
	resumeId?: string;
	files?: any[];
	applications?: any[];
	origin?: string;
	sources?: string[];
	archived?: boolean | any;
	owner?: { name?: string; id?: string } | any;
	links?: string[];
	phones?: { type?: string; value?: string }[] | string[];
}

export interface LeverPosting {
	id: string;
	text: string;
	state: string;
	// Add owner and people fields from API documentation
	owner?: string | { name?: string; id?: string; email?: string };
	hiringManager?: string | { name?: string; id?: string; email?: string };
	user?: string | { name?: string; id?: string; email?: string }; // Creator
	createdAt?: number;
	updatedAt?: number;
	// Add other useful fields available in the API
	distributionChannels?: string[];
	confidentiality?: string;
	followers?: string[] | any[];
	reqCode?: string;
	requisitionCodes?: string[];
	workplaceType?: string;
	categories?: {
		team?: string;
		department?: string;
		location?: string;
		allLocations?: string[];
		commitment?: string;
		level?: string;
	};
	location?: { name: string }; // Deprecated field, keeping for backward compatibility
	team?: { text: string }; // Deprecated field, keeping for backward compatibility
	urls?: { show?: string; list?: string; apply?: string };
}

export interface LeverApiResponse<T> {
	data: T[];
	hasNext?: boolean;
	next?: string;
}

export interface SearchCriteria {
	companies?: string;
	skills?: string;
	locations?: string;
	stage?: string;
	tags?: string;
	posting_id?: string;
	limit?: number;
}

// Add interface for user objects (used in owner, hiringManager fields)
export interface LeverUser {
	id: string;
	name?: string;
	email?: string;
	username?: string;
	createdAt?: number;
	deactivatedAt?: number;
}

// Add interview-related interfaces for future functionality
export interface LeverInterview {
	id: string;
	subject?: string;
	note?: string;
	interviewers?: LeverUser[];
	timezone?: string;
	createdAt?: number;
	date?: number;
	duration?: number;
	location?: string;
	phone?: string;
	gcalEventUrl?: string;
}
