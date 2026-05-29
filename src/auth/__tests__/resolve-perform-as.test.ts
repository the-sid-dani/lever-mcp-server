import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { LeverClient } from "../../lever/client.js";
import { PerformAsResolver, PerformAsUnresolvedError } from "../perform-as-resolver.js";
import { runWithRequestContext } from "../request-context.js";
import { resolvePerformAs, __resetSharedResolver } from "../resolve-perform-as.js";
import * as constants from "../constants.js";

// isOAuthEnabled() reads OAUTH_CONFIG, which snapshots process.env at module
// import time. Setting the env var at test runtime cannot flip it, so we spy on
// isOAuthEnabled directly to toggle the OAUTH-on/off policy branches.
function makeResolver() {
  const getUsers = vi.fn(async () => ({
    data: [{ id: "u1", email: "sid@samba.tv" }],
    hasNext: false,
  }));
  const client = { getUsers } as unknown as LeverClient;
  return { resolver: new PerformAsResolver(client), getUsers };
}

function enableOAuth() {
  vi.spyOn(constants, "isOAuthEnabled").mockReturnValue(true);
}

function disableOAuth() {
  vi.spyOn(constants, "isOAuthEnabled").mockReturnValue(false);
}

describe("resolvePerformAs auth policy", () => {
  beforeEach(() => {
    __resetSharedResolver();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.LEVER_DEFAULT_USER_ID;
    __resetSharedResolver();
  });

  it("OAUTH enabled + matching email in context -> resolves to the Lever user ID", async () => {
    enableOAuth();
    const { resolver } = makeResolver();
    const id = await runWithRequestContext({ email: "sid@samba.tv" }, () =>
      resolvePerformAs(resolver),
    );
    expect(id).toBe("u1");
  });

  it("OAUTH enabled + unprovisioned email -> rejects with PerformAsUnresolvedError", async () => {
    enableOAuth();
    const { resolver } = makeResolver();
    await expect(
      runWithRequestContext({ email: "ghost@samba.tv" }, () =>
        resolvePerformAs(resolver),
      ),
    ).rejects.toBeInstanceOf(PerformAsUnresolvedError);
  });

  it("OAUTH enabled + NO context email -> rejects (fail loud, never fall back)", async () => {
    enableOAuth();
    const { resolver } = makeResolver();
    await expect(resolvePerformAs(resolver)).rejects.toThrow(/no email claim/i);
  });

  it("OAUTH disabled + LEVER_DEFAULT_USER_ID set -> resolves to the default (getUsers not called)", async () => {
    disableOAuth();
    process.env.LEVER_DEFAULT_USER_ID = "def";
    const { resolver, getUsers } = makeResolver();
    const id = await resolvePerformAs(resolver);
    expect(id).toBe("def");
    expect(getUsers).not.toHaveBeenCalled();
  });

  it("OAUTH disabled + explicitOverride -> override beats LEVER_DEFAULT_USER_ID", async () => {
    disableOAuth();
    process.env.LEVER_DEFAULT_USER_ID = "def";
    const { resolver } = makeResolver();
    const id = await resolvePerformAs(resolver, "x");
    expect(id).toBe("x");
  });

  it("OAUTH disabled + neither override nor default -> rejects (fail loud)", async () => {
    disableOAuth();
    const { resolver } = makeResolver();
    await expect(resolvePerformAs(resolver)).rejects.toThrow(
      /LEVER_DEFAULT_USER_ID/,
    );
  });
});
