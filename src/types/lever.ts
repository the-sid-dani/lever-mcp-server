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

// Interview-related interfaces based on Lever API documentation

/**
 * Interface representing an interviewer in a Lever interview
 */
export interface LeverInterviewer {
	/** Unique identifier for the interviewer */
	id: string;
	/** Full name of the interviewer */
	name: string;
	/** Email address of the interviewer */
	email: string;
	/** Optional feedback template specific to this interviewer */
	feedbackTemplate?: string;
}

/**
 * Interface representing a Lever interview panel
 * Panels are containers that group related interviews together
 */
export interface LeverPanel {
	/** Unique identifier for the panel */
	id: string;
	/** Array of Application UIDs that the panel is associated with */
	applications: string[];
	/** Datetime when panel was canceled. Value is null if panel was never canceled */
	canceledAt?: number | null;
	/** Datetime when panel was created */
	createdAt: number;
	/** Datetime when the first interview in the panel starts */
	start: number;
	/** Datetime when the last interview in the panel ends */
	end: number;
	/** Name of timezone in which panel was scheduled to occur */
	timezone: string;
	/** Frequency of feedback reminders (once, daily, frequently, none) */
	feedbackReminder: string;
	/** The user who created the panel */
	user: string;
	/** The stage in which the candidate resided when this panel was scheduled */
	stage: string;
	/** Optional panel note */
	note?: string;
	/** Whether this panel is created via API or integration */
	externallyManaged: boolean;
	/** URL linking to an external entity associated with this interview */
	externalUrl?: string;
	/** Array of interview objects within this panel */
	interviews: LeverInterview[];
}

/**
 * Interface representing a Lever interview
 * Interviews must be created within panels
 */
export interface LeverInterview {
	/** Unique identifier for the interview */
	id: string;
	/** Interview Panel UID */
	panel: string;
	/** Interview subject or title */
	subject?: string;
	/** Interview note with schedule details */
	note?: string;
	/** Array of interviewers with their details */
	interviewers: LeverInterviewer[];
	/** Name of timezone in which interview was scheduled */
	timezone: string;
	/** Datetime when interview was created */
	createdAt: number;
	/** Datetime when interview is scheduled to occur */
	date: number;
	/** Interview duration in minutes */
	duration: number;
	/** Interview location (e.g., conference room, phone number) */
	location?: string;
	/** ID of the feedback template for this interview */
	feedbackTemplate?: string;
	/** Array of feedback form IDs submitted for this interview */
	feedbackForms: string[];
	/** Frequency of feedback reminders (once, daily, frequently, none) */
	feedbackReminder: string;
	/** User who created the interview */
	user: string;
	/** Stage ID where the interview belongs */
	stage: string;
	/** Datetime when interview was canceled. Value is null if never canceled */
	canceledAt?: number | null;
	/** Array of posting IDs associated with this interview */
	postings: string[];
}
