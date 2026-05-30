import { type JWTPayload, createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Google Workspace OIDC ID-token verifier for the OAuth broker.
 *
 * Validates a Google-issued ID token (returned during the OAuth callback) and
 * restricts access to a single Google Workspace hosted domain (e.g. samba.tv)
 * via the `hd` claim. Returns null for any failure so callers can emit a
 * spec-compliant rejection without exception handling.
 *
 * Ported from the MSCI MCP GoogleWorkspaceVerifier (Python / PyJWT).
 */

const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const ALLOWED_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

// Module-level singleton so the JWKS is fetched once and cached across calls.
// Recreating per call would defeat jose's in-memory key cache.
const JWKS = createRemoteJWKSet(new URL(GOOGLE_JWKS_URI));

/**
 * Validated claims from a Google ID token.
 */
export interface GoogleClaims {
	email: string;
	hd: string;
	sub: string;
	name?: string;
	email_verified?: boolean;
	aud: string;
	iss: string;
	exp: number;
}

export interface GoogleWorkspaceVerifierOptions {
	/** The OAuth Web client ID; the token `aud` claim must equal this. */
	googleClientId: string;
	/** The Google Workspace domain the user must belong to (checked against `hd`). */
	hostedDomain: string;
	/** Override set of acceptable `iss` values; defaults to Google's two issuer strings. */
	allowedIssuers?: string[];
}

export class GoogleWorkspaceVerifier {
	private readonly googleClientId: string;
	private readonly hostedDomain: string;
	private readonly allowedIssuers: string[];

	constructor(options: GoogleWorkspaceVerifierOptions) {
		if (!options.googleClientId) {
			throw new Error("googleClientId (Google OAuth client ID) is required");
		}
		if (!options.hostedDomain) {
			throw new Error("hostedDomain is required");
		}
		this.googleClientId = options.googleClientId;
		this.hostedDomain = options.hostedDomain;
		this.allowedIssuers =
			options.allowedIssuers && options.allowedIssuers.length > 0
				? options.allowedIssuers
				: ALLOWED_ISSUERS;
	}

	/**
	 * Verify a Google ID token.
	 *
	 * Validates signature (RS256 via Google JWKS), issuer, audience, and the
	 * presence of exp/iat/iss/aud, then enforces the hosted-domain (`hd`) claim.
	 *
	 * @param idToken - The raw Google ID token (JWT string).
	 * @returns The validated claims, or null on any failure.
	 */
	async verify(idToken: string): Promise<GoogleClaims | null> {
		let payload: JWTPayload;
		try {
			const result = await jwtVerify(idToken, JWKS, {
				issuer: this.allowedIssuers,
				audience: this.googleClientId,
				algorithms: ["RS256"],
				requiredClaims: ["exp", "iat", "iss", "aud"],
			});
			payload = result.payload;
		} catch (error) {
			// Signature, expiry, iss, aud, or JWKS-fetch failure. Never log the token.
			const reason = error instanceof Error ? error.message : "unknown error";
			console.warn(`Google ID token rejected by jwtVerify: ${reason}`);
			return null;
		}

		const hd = payload.hd;
		if (hd !== this.hostedDomain) {
			console.info(`Google ID token rejected: hd=${String(hd)} != ${this.hostedDomain}`);
			return null;
		}

		// Defense-in-depth on top of the hd gate: require a verified email claim.
		if (payload.email_verified !== true) {
			console.info("Google ID token rejected: email_verified not true");
			return null;
		}

		return {
			email: payload.email as string,
			hd: hd,
			sub: payload.sub as string,
			name: payload.name as string | undefined,
			email_verified: payload.email_verified as boolean | undefined,
			aud: payload.aud as string,
			iss: payload.iss as string,
			exp: payload.exp as number,
		};
	}
}
