import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger, currentLevel, setLevelFromEnv } from "../logger.js";

// The logger reads LOG_LEVEL / DEBUG from the environment. Tests mutate
// process.env then call setLevelFromEnv() to re-evaluate. Spies on the
// console methods let us assert what actually got emitted.
describe("logger level gating", () => {
	let errorSpy: ReturnType<typeof vi.spyOn>;
	let warnSpy: ReturnType<typeof vi.spyOn>;
	let infoSpy: ReturnType<typeof vi.spyOn>;
	let debugSpy: ReturnType<typeof vi.spyOn>;
	const savedLogLevel = process.env.LOG_LEVEL;
	const savedDebug = process.env.DEBUG;

	beforeEach(() => {
		errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
		debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
	});

	afterEach(() => {
		errorSpy.mockRestore();
		warnSpy.mockRestore();
		infoSpy.mockRestore();
		debugSpy.mockRestore();
		// Restore env + re-evaluate so other test files are unaffected.
		if (savedLogLevel === undefined) delete process.env.LOG_LEVEL;
		else process.env.LOG_LEVEL = savedLogLevel;
		if (savedDebug === undefined) delete process.env.DEBUG;
		else process.env.DEBUG = savedDebug;
		setLevelFromEnv();
	});

	it("defaults to info: debug is suppressed (no PII), info emits", () => {
		delete process.env.LOG_LEVEL;
		delete process.env.DEBUG;
		setLevelFromEnv();
		expect(currentLevel()).toBe("info");

		logger.debug("secret-pii-candidate-name");
		expect(debugSpy).not.toHaveBeenCalled();

		logger.info("audit-line-no-pii");
		expect(infoSpy).toHaveBeenCalledWith("audit-line-no-pii");
	});

	it("LOG_LEVEL=debug re-enables debug output", () => {
		process.env.LOG_LEVEL = "debug";
		delete process.env.DEBUG;
		setLevelFromEnv();
		expect(currentLevel()).toBe("debug");

		logger.debug("now-visible");
		expect(debugSpy).toHaveBeenCalledWith("now-visible");
	});

	it("DEBUG=1 forces debug level regardless of LOG_LEVEL", () => {
		delete process.env.LOG_LEVEL;
		process.env.DEBUG = "1";
		setLevelFromEnv();
		expect(currentLevel()).toBe("debug");

		logger.debug("forced-by-DEBUG-flag");
		expect(debugSpy).toHaveBeenCalledWith("forced-by-DEBUG-flag");
	});
});
