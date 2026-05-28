/**
 * Minimal, dependency-free level-gated logger.
 *
 * Privacy posture: at the default level (`info`), verbose and PII-bearing
 * detail (candidate names, full response bodies, raw user emails) MUST be
 * routed through `logger.debug(...)` so it is suppressed. Audit lines that run
 * at `info` MUST use non-PII identifiers only. Setting `LOG_LEVEL=debug` (or
 * `DEBUG=1` / `DEBUG=true`) re-enables the detail for local debugging.
 *
 * No winston/pino — just a severity threshold over the console methods.
 */

export type LogLevel = "error" | "warn" | "info" | "debug";

// Severity ordering: a method emits only when the current level is at-or-above
// it. error < warn < info < debug, so a higher level enables more output.
const SEVERITY: Record<LogLevel, number> = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3,
};

const DEFAULT_LEVEL: LogLevel = "info";

function resolveLevelFromEnv(): LogLevel {
	const debugFlag = process.env.DEBUG;
	if (debugFlag === "1" || debugFlag === "true") {
		return "debug";
	}
	const raw = process.env.LOG_LEVEL?.toLowerCase();
	if (raw === "error" || raw === "warn" || raw === "info" || raw === "debug") {
		return raw;
	}
	return DEFAULT_LEVEL;
}

let level: LogLevel = resolveLevelFromEnv();

/** Re-read LOG_LEVEL / DEBUG from process.env. Used by tests after mutating env. */
export function setLevelFromEnv(): LogLevel {
	level = resolveLevelFromEnv();
	return level;
}

/** Current effective log level. Exposed for tests. */
export function currentLevel(): LogLevel {
	return level;
}

function enabled(method: LogLevel): boolean {
	return SEVERITY[level] >= SEVERITY[method];
}

export const logger = {
	error(...args: unknown[]): void {
		if (enabled("error")) console.error(...args);
	},
	warn(...args: unknown[]): void {
		if (enabled("warn")) console.warn(...args);
	},
	info(...args: unknown[]): void {
		if (enabled("info")) console.info(...args);
	},
	debug(...args: unknown[]): void {
		if (enabled("debug")) console.debug(...args);
	},
};
