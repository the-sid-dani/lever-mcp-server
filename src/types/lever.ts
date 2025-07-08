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
	urls?: { show?: string };
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
