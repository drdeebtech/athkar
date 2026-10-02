import { describe, expect, it } from "vitest";
import {
  errorMessage,
  formatLogLines,
  parseArgs,
  pickLatest,
  resolveAccountId,
  sanitizeTerminal,
  stripJsonComments,
  validateToken,
} from "./cf-build-logs";

describe("stripJsonComments", () => {
  it("removes line and block comments but keeps // inside strings", () => {
    const text = '{\n  // note\n  "url": "https://x.dev/a", /* block */ "n": 1\n}';
    expect(JSON.parse(stripJsonComments(text))).toEqual({ url: "https://x.dev/a", n: 1 });
  });

  it("keeps escaped quotes inside strings", () => {
    expect(JSON.parse(stripJsonComments('{"a":"say \\"hi\\" // not a comment"}'))).toEqual({
      a: 'say "hi" // not a comment',
    });
  });
});

describe("pickLatest", () => {
  const builds = [
    { build_uuid: "old", created_on: "2026-10-01T10:00:00Z", build_trigger_metadata: { branch: "main" } },
    { build_uuid: "new", created_on: "2026-10-02T10:00:00Z", build_trigger_metadata: { branch: "feat/x" } },
  ];

  it("returns the newest build", () => {
    expect(pickLatest(builds)?.build_uuid).toBe("new");
  });

  it("filters by branch", () => {
    expect(pickLatest(builds, "main")?.build_uuid).toBe("old");
    expect(pickLatest(builds, "nope")).toBeUndefined();
  });
});

describe("formatLogLines", () => {
  it("accepts [timestamp, text] pairs and plain strings", () => {
    expect(formatLogLines([["t1", "a"], "b"])).toEqual(["a", "b"]);
  });
});

describe("parseArgs", () => {
  it("reads an optional build id and --branch", () => {
    expect(parseArgs([])).toEqual({ buildId: undefined, branch: undefined });
    const uuid = "3aed095a-6ff4-4745-b99d-fa2872ddf446";
    expect(parseArgs([uuid])).toEqual({ buildId: uuid, branch: undefined });
    expect(parseArgs(["--branch", "main"])).toEqual({ buildId: undefined, branch: "main" });
  });
});

describe("hasMorePages", () => {
  it("continues while the current page is below total_pages", async () => {
    const { hasMorePages } = await import("./cf-build-logs");
    expect(hasMorePages({ page: 1, total_pages: 3 }, 25, 25)).toBe(true);
    expect(hasMorePages({ page: 3, total_pages: 3 }, 25, 25)).toBe(false);
  });

  it("falls back to page fullness when total_pages is missing", async () => {
    const { hasMorePages } = await import("./cf-build-logs");
    expect(hasMorePages(undefined, 25, 25)).toBe(true);
    expect(hasMorePages(undefined, 7, 25)).toBe(false);
    expect(hasMorePages({ page: 1 }, 0, 25)).toBe(false);
  });
});

describe("isEntrypoint", () => {
  it("matches paths with spaces and Arabic letters", async () => {
    const { isEntrypoint } = await import("./cf-build-logs");
    const { pathToFileURL } = await import("node:url");
    const path = "/tmp/مشروع أذكار/scripts/cf-build-logs.ts";
    expect(isEntrypoint(pathToFileURL(path).href, path)).toBe(true);
    expect(isEntrypoint(pathToFileURL(path).href, "/tmp/other.ts")).toBe(false);
    expect(isEntrypoint(pathToFileURL(path).href, undefined)).toBe(false);
  });
});

describe("isEntrypoint with symlinks", () => {
  it("matches when argv[1] is a symlink to the module", async () => {
    const { isEntrypoint } = await import("./cf-build-logs");
    const { mkdtempSync, writeFileSync, symlinkSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { pathToFileURL } = await import("node:url");
    const dir = mkdtempSync(join(tmpdir(), "athkar-entry-"));
    const real = join(dir, "real.ts");
    const link = join(dir, "link.ts");
    writeFileSync(real, "");
    symlinkSync(real, link);
    try {
      expect(isEntrypoint(pathToFileURL(real).href, link)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("parseApiBody", () => {
  it("parses JSON bodies", async () => {
    const { parseApiBody } = await import("./cf-build-logs");
    expect(parseApiBody('{"success":true,"result":[1]}')).toEqual({ success: true, result: [1] });
  });

  it("returns an unsuccessful body for HTML or empty responses", async () => {
    const { parseApiBody } = await import("./cf-build-logs");
    expect(parseApiBody("<html>502 Bad Gateway</html>")).toEqual({ success: false });
    expect(parseApiBody("")).toEqual({ success: false });
  });
});

describe("parseArgs validation", () => {
  const uuid = "3aed095a-6ff4-4745-b99d-fa2872ddf446";

  it("accepts a UUID build id and a branch", () => {
    expect(parseArgs([uuid])).toEqual({ buildId: uuid, branch: undefined });
    expect(parseArgs(["--branch", "main"])).toEqual({ buildId: undefined, branch: "main" });
  });

  it("rejects --branch without a value", () => {
    expect(() => parseArgs(["--branch"])).toThrow(/--branch needs a value/);
    expect(() => parseArgs(["--branch", "--other"])).toThrow(/--branch needs a value/);
  });

  it("rejects build ids that are not UUIDs (no path segments reach the URL)", () => {
    expect(() => parseArgs(["../../user/tokens/verify"])).toThrow(/not a build UUID/);
  });
});

describe("validateToken", () => {
  it("accepts printable ASCII tokens", () => {
    expect(validateToken("abc_DEF-123")).toBe("abc_DEF-123");
  });

  it("rejects tokens with whitespace or control characters without echoing them", () => {
    const malformed = ["MARKER", "abc", "\n", "DEF"].join("");
    let message = "";
    try {
      validateToken(malformed);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/invalid characters/);
    expect(message).not.toContain("MARKER");
  });
});

describe("resolveAccountId", () => {
  const id = "fc8c8db485888cc39d246ac7d81f9f5f";

  it("prefers a non-empty env var and falls back to config when it is empty", () => {
    expect(resolveAccountId("0123456789abcdef0123456789abcdef", id)).toBe("0123456789abcdef0123456789abcdef");
    expect(resolveAccountId("", id)).toBe(id);
    expect(resolveAccountId(undefined, id)).toBe(id);
  });

  it("rejects missing or malformed account ids", () => {
    expect(() => resolveAccountId(undefined, undefined)).toThrow(/account_id/);
    expect(() => resolveAccountId("../x", undefined)).toThrow(/32 hex/);
  });
});

describe("sanitizeTerminal", () => {
  it("strips ANSI escapes and control characters but keeps tabs and text", () => {
    expect(sanitizeTerminal("ok\u001b[2Jcleared\u0007\tdone")).toBe("ok[2Jcleared\tdone");
    expect(sanitizeTerminal("أذكار")).toBe("أذكار");
  });
});

describe("errorMessage", () => {
  it("handles Error instances and non-Error throws", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain")).toBe("plain");
    expect(errorMessage(undefined)).toBe("unknown error");
  });
});
