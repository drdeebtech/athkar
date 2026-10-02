import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HEADERS = readFileSync(join(__dirname, "../../../public/_headers"), "utf8");

/** Directives of the CSP set on the "/*" rule. */
function csp(): Record<string, string[]> {
  const line = HEADERS.split("\n").find((l) => l.trim().startsWith("Content-Security-Policy:"));
  if (!line) throw new Error("no Content-Security-Policy in public/_headers");
  const value = line.split(":").slice(1).join(":").trim();
  return Object.fromEntries(
    value
      .split(";")
      .map((d) => d.trim().split(/\s+/))
      .filter((parts) => parts[0])
      .map(([name, ...sources]) => [name, sources]),
  );
}

describe("security headers", () => {
  it("sets every hardening header on all paths", () => {
    for (const h of [
      "Content-Security-Policy",
      "Strict-Transport-Security",
      "X-Content-Type-Options: nosniff",
      "Referrer-Policy",
      "Permissions-Policy",
      "X-Frame-Options: DENY",
    ]) {
      expect(HEADERS).toContain(h);
    }
  });

  it("allows Cloudflare Web Analytics, which Cloudflare injects into pages", () => {
    // The beacon loads from a versioned path (/beacon.min.js/v…), so allow the host.
    expect(csp()["script-src"]).toContain("https://static.cloudflareinsights.com");
    // Automatic injection reports to the same origin (/cdn-cgi/rum).
    expect(csp()["connect-src"]).toContain("'self'");
  });

  it("keeps everything else first-party", () => {
    const d = csp();
    expect(d["default-src"]).toEqual(["'self'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["frame-ancestors"]).toEqual(["'none'"]);
    const thirdParty = Object.entries(d)
      .flatMap(([name, sources]) => sources.map((s) => `${name} ${s}`))
      .filter((s) => /https?:\/\//.test(s));
    expect(thirdParty).toEqual(["script-src https://static.cloudflareinsights.com"]);
  });
});

describe("text files with Arabic content", () => {
  it("declares UTF-8 for /llms.txt so browsers do not show garbled Arabic", () => {
    const block = HEADERS.split(/\n\s*\n/).find((b) => b.split("\n").some((l) => l.trim() === "/llms.txt"));
    expect(block).toBeDefined();
    expect(block).toMatch(/^\s+Content-Type:\s*text\/plain;\s*charset=utf-8\s*$/im);
  });
});

describe("search indexing of non-page files", () => {
  const blocks = HEADERS.split(/\n\s*\n/);
  const indexOfPath = (path: string) => blocks.findIndex((b) => b.split("\n").some((l) => l.trim() === path));
  const block = (path: string) => blocks[indexOfPath(path)] ?? "";

  it("keeps Next.js RSC payloads (.txt) out of search results", () => {
    expect(block("/*.txt")).toMatch(/^\s+X-Robots-Tag:\s*noindex\s*$/m);
  });

  it("detaches noindex from llms.txt and robots.txt, after the .txt rule", () => {
    for (const path of ["/llms.txt", "/robots.txt"]) {
      expect(block(path)).toMatch(/^\s+! X-Robots-Tag\s*$/m);
      expect(indexOfPath(path)).toBeGreaterThan(indexOfPath("/*.txt"));
    }
  });

  it("never sets X-Robots-Tag on pages", () => {
    const setting = blocks.filter((b) => /^\s+X-Robots-Tag:/m.test(b)).map((b) => b.split("\n").find((l) => l.startsWith("/")));
    expect(setting).toEqual(["/*.txt"]);
  });
});
