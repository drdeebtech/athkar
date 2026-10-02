import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
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

// The whole run, end to end, against a fake Cloudflare API.

const ACCOUNT = "fc8c8db485888cc39d246ac7d81f9f5f"; // account_id in wrangler.jsonc
const OTHER_ACCOUNT = "0123456789abcdef0123456789abcdef";
const WORKER_TAG = "5f3c0d9e2b1a";
// Stand-in credential: the run must send it to the API but never print it.
const FAKE_CREDENTIAL = "fixture-credential-0001";
const NEWEST = "9c1f5e2a-7b3d-4e8f-a1b2-c3d4e5f6a7b8";
const OLDER = "3aed095a-6ff4-4745-b99d-fa2872ddf446";
const MAIN_LATEST = "5b6c7d8e-9f01-4234-8567-89abcdef0123";
const SCRIPT_PATH = fileURLToPath(new URL("./cf-build-logs.ts", import.meta.url));
const RULE = "-".repeat(60);

interface BuildFixture {
  readonly build_uuid: string;
  readonly created_on?: string;
  readonly created_at?: string;
  readonly status?: string;
  readonly build_outcome?: string;
  readonly branch?: string;
  readonly build_trigger_metadata?: {
    readonly branch?: string;
    readonly commit_hash?: string;
    readonly commit_message?: string;
  };
}

interface BuildsPage {
  readonly builds: readonly BuildFixture[];
  readonly totalPages: number;
}

interface LogsPage {
  readonly lines?: readonly unknown[];
  readonly cursor?: string;
  readonly truncated?: boolean;
}

interface CloudflareFixture {
  readonly scripts?: readonly { readonly id: string; readonly tag: string }[];
  readonly builds?: (page: number) => BuildsPage;
  readonly logs?: (cursor: string | null) => LogsPage;
}

interface FakeCall {
  readonly url: URL;
  readonly init?: RequestInit;
}

interface FakeApi {
  readonly fetch: (url: string, init?: RequestInit) => Promise<Response>;
  readonly calls: readonly FakeCall[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function ok(result: unknown, resultInfo?: { readonly page: number; readonly total_pages: number }): Response {
  return json({ success: true, errors: [], messages: [], result, ...(resultInfo && { result_info: resultInfo }) });
}

/** Records every request and answers it with `respond`; a throw becomes a rejected fetch. */
function fakeApi(respond: (url: URL) => Response): FakeApi {
  const calls: FakeCall[] = [];
  return {
    calls,
    fetch: async (url, init) => {
      const parsed = new URL(url);
      calls.push({ url: parsed, init });
      return respond(parsed);
    },
  };
}

/** Serves the three endpoints the run reads, under any account id. */
function cloudflare({ scripts, builds, logs }: CloudflareFixture = {}): FakeApi {
  return fakeApi((url) => {
    const path = url.pathname.replace(/^\/client\/v4\/accounts\/[^/]+/, "");
    if (path === "/workers/scripts") {
      return ok(scripts ?? [{ id: "other-worker", tag: "0000" }, { id: "athkar", tag: WORKER_TAG }]);
    }
    if (path === `/builds/workers/${WORKER_TAG}/builds` && builds) {
      const page = Number(url.searchParams.get("page"));
      const { builds: result, totalPages } = builds(page);
      return ok(result, { page, total_pages: totalPages });
    }
    if (/^\/builds\/builds\/[^/]+\/logs$/.test(path) && logs) {
      return ok(logs(url.searchParams.get("cursor")));
    }
    return json({ success: false, errors: [{ code: 7003, message: "No route for that URI" }] }, 404);
  });
}

/** Pages of builds from fixed lists, reporting the real page count like Cloudflare does. */
function pages(...lists: readonly (readonly BuildFixture[])[]): (page: number) => BuildsPage {
  return (page) => ({ builds: lists[page - 1] ?? [], totalPages: lists.length });
}

function requested(api: FakeApi): string[] {
  return api.calls.map(({ url }) => `${url.pathname}${url.search}`);
}

interface CliCase {
  readonly argv?: readonly string[];
  readonly env?: { readonly CLOUDFLARE_ACCOUNT_ID?: string };
  readonly credential?: string;
  readonly api?: FakeApi;
}

interface CliResult {
  readonly code: number;
  readonly out: readonly string[];
  readonly err: readonly string[];
}

/** Waits until `snapshot` stops changing across a timer turn: main() is fire-and-forget. */
async function settle(snapshot: () => string): Promise<void> {
  let previous: string | undefined;
  let current = snapshot();
  while (current !== previous) {
    previous = current;
    await new Promise((resolve) => setTimeout(resolve, 10));
    current = snapshot();
  }
}

/**
 * Runs the script as `node scripts/cf-build-logs.ts ...argv` would: a fresh copy of the
 * module sees itself as the entrypoint, with fetch, env, console and process.exit faked.
 */
async function runCli({
  argv = [],
  env = {},
  credential = FAKE_CREDENTIAL,
  api = cloudflare(),
}: CliCase = {}): Promise<CliResult> {
  const out: string[] = [];
  const err: string[] = [];
  let code = 0;
  vi.stubGlobal("fetch", api.fetch);
  vi.stubEnv("CLOUDFLARE_BUILDS_API_TOKEN", credential);
  vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", env.CLOUDFLARE_ACCOUNT_ID);
  vi.spyOn(console, "log").mockImplementation((line: unknown) => {
    out.push(String(line));
  });
  vi.spyOn(console, "error").mockImplementation((line: unknown) => {
    err.push(String(line));
  });
  vi.spyOn(process, "exit").mockImplementation((exitCode) => {
    code = Number(exitCode);
    return undefined as never;
  });
  const savedArgv = process.argv;
  process.argv = [process.execPath, SCRIPT_PATH, ...argv];
  try {
    vi.resetModules();
    await import("./cf-build-logs");
  } finally {
    process.argv = savedArgv;
  }
  await settle(() => JSON.stringify([out.length, err.length, api.calls.length, code]));
  return { code, out, err };
}

describe("the whole run", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  // Only created_at and a top-level branch: the fallbacks for timestamp and branch.
  const newest: BuildFixture = {
    build_uuid: NEWEST,
    created_at: "2026-10-02T10:00:00Z",
    status: "stopped",
    build_outcome: "success",
    branch: "feat/x",
    build_trigger_metadata: { commit_hash: "0a1b2c3d4e5f", commit_message: "feat: add counters" },
  };
  const older: BuildFixture = {
    build_uuid: OLDER,
    created_on: "2026-10-01T10:00:00Z",
    status: "stopped",
    build_outcome: "failure",
    build_trigger_metadata: { branch: "main", commit_hash: "ffffffffffff", commit_message: "chore: old" },
  };
  const newestHeader = [`Build ${NEWEST}  stopped success`, "Branch feat/x  commit 0a1b2c3  feat: add counters", RULE];

  it("prints the newest build's header, then its log lines", async () => {
    const api = cloudflare({
      builds: pages([older, newest]),
      logs: () => ({
        lines: [["2026-10-02T10:00:01Z", "Cloning repository..."], "Build finished"],
        cursor: "ignored-when-not-truncated",
        truncated: false,
      }),
    });
    expect(await runCli({ api })).toEqual({
      code: 0,
      out: [...newestHeader, "Cloning repository...", "Build finished"],
      err: [],
    });
    expect(requested(api)).toEqual([
      `/client/v4/accounts/${ACCOUNT}/workers/scripts`,
      `/client/v4/accounts/${ACCOUNT}/builds/workers/${WORKER_TAG}/builds?page=1&per_page=50`,
      `/client/v4/accounts/${ACCOUNT}/builds/builds/${NEWEST}/logs`,
    ]);
  });

  it("sends the token only as a bearer header, with a request timeout", async () => {
    const api = cloudflare({ builds: pages([newest]), logs: () => ({}) });
    await runCli({ api });
    expect(api.calls).toHaveLength(3);
    for (const { url, init } of api.calls) {
      expect(new Headers(init?.headers).get("Authorization")).toBe(`Bearer ${FAKE_CREDENTIAL}`);
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(url.href).not.toContain(FAKE_CREDENTIAL);
    }
  });

  it("prints placeholders when a build has no status or trigger metadata", async () => {
    const bare: BuildFixture = { build_uuid: NEWEST, created_on: "2026-10-02T10:00:00Z" };
    const api = cloudflare({ builds: pages([bare]), logs: () => ({}) });
    expect(await runCli({ api })).toEqual({ code: 0, out: [`Build ${NEWEST}`, "Branch ?  commit ?  ", RULE], err: [] });
  });

  it("with a build UUID, prints only that build's logs without looking up builds", async () => {
    const api = cloudflare({ logs: () => ({ lines: ["only these"] }) });
    expect(await runCli({ argv: [OLDER], api })).toEqual({ code: 0, out: ["only these"], err: [] });
    expect(requested(api)).toEqual([`/client/v4/accounts/${ACCOUNT}/builds/builds/${OLDER}/logs`]);
  });

  it("--branch picks that branch's latest build across two pages of builds", async () => {
    const mainLatest: BuildFixture = {
      build_uuid: MAIN_LATEST,
      created_on: "2026-10-01T12:00:00Z",
      status: "stopped",
      build_outcome: "success",
      build_trigger_metadata: { branch: "main", commit_hash: "1234567890ab", commit_message: "fix: main" },
    };
    const api = cloudflare({ builds: pages([newest, older], [mainLatest]), logs: () => ({ lines: ["main log"] }) });
    expect(await runCli({ argv: ["--branch", "main"], api })).toEqual({
      code: 0,
      out: [`Build ${MAIN_LATEST}  stopped success`, "Branch main  commit 1234567  fix: main", RULE, "main log"],
      err: [],
    });
    expect(requested(api)).toEqual([
      `/client/v4/accounts/${ACCOUNT}/workers/scripts`,
      `/client/v4/accounts/${ACCOUNT}/builds/workers/${WORKER_TAG}/builds?page=1&per_page=50`,
      `/client/v4/accounts/${ACCOUNT}/builds/workers/${WORKER_TAG}/builds?page=2&per_page=50`,
      `/client/v4/accounts/${ACCOUNT}/builds/builds/${MAIN_LATEST}/logs`,
    ]);
  });

  it("stops paging through builds after 20 pages", async () => {
    const buildOnPage = (page: number): BuildFixture => ({
      build_uuid: `00000000-0000-4000-8000-${String(page).padStart(12, "0")}`,
      created_on: new Date(Date.UTC(2026, 8, page)).toISOString(),
    });
    const api = cloudflare({ builds: (page) => ({ builds: [buildOnPage(page)], totalPages: 99 }), logs: () => ({}) });
    const result = await runCli({ api });
    expect(requested(api).filter((path) => path.includes("/builds?"))).toHaveLength(20);
    expect(result.out[0]).toBe(`Build ${buildOnPage(20).build_uuid}`);
  });

  it.each<[string, CloudflareFixture, readonly string[], string]>([
    ["the worker is missing", { scripts: [{ id: "other-worker", tag: "0000" }] }, [], `Worker "athkar" not found in account ${ACCOUNT}.`],
    ["there are no builds", { builds: pages([]) }, [], "No builds yet."],
    ["no build is on the --branch", { builds: pages([newest, older]) }, ["--branch", "nope"], 'No builds for branch "nope".'],
  ])("exits 1 with a clear error when %s", async (_, fixture, argv, message) => {
    expect(await runCli({ argv, api: cloudflare(fixture) })).toEqual({
      code: 1,
      out: [],
      err: [`cf-build-logs: ${message}`],
    });
  });

  it("stops when a log cursor comes back again", async () => {
    const byCursor: Record<string, LogsPage> = {
      start: { lines: ["first"], cursor: "a/1+", truncated: true },
      "a/1+": { lines: ["second"], cursor: "b", truncated: true },
      b: { lines: ["third"], cursor: "a/1+", truncated: true },
    };
    const api = cloudflare({ logs: (cursor) => byCursor[cursor ?? "start"] });
    expect(await runCli({ argv: [NEWEST], api })).toEqual({ code: 0, out: ["first", "second", "third"], err: [] });
    expect(requested(api)).toEqual([
      `/client/v4/accounts/${ACCOUNT}/builds/builds/${NEWEST}/logs`,
      `/client/v4/accounts/${ACCOUNT}/builds/builds/${NEWEST}/logs?cursor=a%2F1%2B`,
      `/client/v4/accounts/${ACCOUNT}/builds/builds/${NEWEST}/logs?cursor=b`,
    ]);
  });

  it("stops after 200 log pages and says so", async () => {
    const api = cloudflare({
      logs: (cursor) => {
        const n = cursor === null ? 0 : Number(cursor.slice(1));
        return { lines: [`page ${n}`], cursor: `c${n + 1}`, truncated: true };
      },
    });
    const result = await runCli({ argv: [NEWEST], api });
    expect(api.calls).toHaveLength(200);
    expect(result.code).toBe(0);
    expect(result.out).toHaveLength(200);
    expect(result.out.at(-1)).toBe("page 199");
    expect(result.err).toEqual(["cf-build-logs: stopped after 200 log pages"]);
  });

  it.each<[readonly string[], string]>([
    [["--branch"], "--branch needs a value"],
    [["--branch", "--other"], "--branch needs a value"],
    [["../../user/tokens/verify"], '"../../user/tokens/verify" is not a build UUID'],
  ])("rejects %j before reading credentials or calling the API", async (argv, message) => {
    const api = cloudflare();
    // Reading this credential would fail first, so a clean argument error proves the order.
    expect(await runCli({ argv, api, credential: "not usable" })).toEqual({
      code: 1,
      out: [],
      err: [`cf-build-logs: ${message}`],
    });
    expect(api.calls).toEqual([]);
  });

  it.each<[string, string | undefined, string]>([
    ["a set env var wins", OTHER_ACCOUNT, OTHER_ACCOUNT],
    ["the env var is trimmed", ` ${OTHER_ACCOUNT} `, OTHER_ACCOUNT],
    ["an empty env var falls back to wrangler.jsonc", "", ACCOUNT],
    ["an unset env var falls back to wrangler.jsonc", undefined, ACCOUNT],
  ])("account id: %s", async (_, fromEnv, expected) => {
    const api = cloudflare({ logs: () => ({}) });
    await runCli({ argv: [NEWEST], env: { CLOUDFLARE_ACCOUNT_ID: fromEnv }, api });
    expect(requested(api)).toEqual([`/client/v4/accounts/${expected}/builds/builds/${NEWEST}/logs`]);
  });

  it("rejects a malformed account id before reading credentials or calling the API", async () => {
    const api = cloudflare();
    expect(await runCli({ env: { CLOUDFLARE_ACCOUNT_ID: "../x" }, api, credential: "not usable" })).toEqual({
      code: 1,
      out: [],
      err: ["cf-build-logs: Account id must be 32 hex characters."],
    });
    expect(api.calls).toEqual([]);
  });

  it("strips terminal control characters from the header and log lines", async () => {
    const hostile: BuildFixture = {
      build_uuid: NEWEST,
      created_on: "2026-10-02T10:00:00Z",
      status: "stopped\u001b[0m",
      build_outcome: "success",
      build_trigger_metadata: {
        branch: "main\u0007",
        commit_hash: "0a1b2c3d4e5f",
        commit_message: "fix: \u001b[2Jclear\u009b screen",
      },
    };
    const api = cloudflare({
      builds: pages([hostile]),
      logs: () => ({ lines: [["2026-10-02T10:00:01Z", "ok\u001b[2Jcleared\u0007\tdone"], "أذكار\u0000"] }),
    });
    expect(await runCli({ api })).toEqual({
      code: 0,
      out: [
        `Build ${NEWEST}  stopped[0m success`,
        "Branch main  commit 0a1b2c3  fix: [2Jclear screen",
        RULE,
        "ok[2Jcleared\tdone",
        "أذكار",
      ],
      err: [],
    });
  });

  it("strips terminal control characters from API error text", async () => {
    const api = fakeApi(() =>
      json({ success: false, errors: [{ code: 10000, message: "Authentication error\u001b]0;owned\u0007" }] }, 403),
    );
    expect(await runCli({ api })).toEqual({
      code: 1,
      out: [],
      err: [`cf-build-logs: /accounts/${ACCOUNT}/workers/scripts: 10000 Authentication error]0;owned`],
    });
  });

  it("strips terminal control characters from argument errors", async () => {
    expect(await runCli({ argv: ["\u001b[31mbad\u0007"] })).toEqual({
      code: 1,
      out: [],
      err: ['cf-build-logs: "[31mbad" is not a build UUID'],
    });
  });

  it("never prints the token, even when fetch's own error quotes it", async () => {
    const api = cloudflare({
      builds: pages([newest]),
      logs: () => {
        throw new Error(`fetch failed: Authorization: Bearer ${FAKE_CREDENTIAL}`);
      },
    });
    const result = await runCli({ api });
    expect(result).toEqual({
      code: 1,
      out: newestHeader,
      err: [`cf-build-logs: /accounts/${ACCOUNT}/builds/builds/${NEWEST}/logs: network error`],
    });
    expect(new Headers(api.calls.at(-1)?.init?.headers).get("Authorization")).toBe(`Bearer ${FAKE_CREDENTIAL}`);
    expect([...result.out, ...result.err].join("\n")).not.toContain(FAKE_CREDENTIAL);
  });

  it("reports a timed-out request without fetch's own message", async () => {
    const api = fakeApi(() => {
      throw new DOMException(`aborted while sending Bearer ${FAKE_CREDENTIAL}`, "TimeoutError");
    });
    expect(await runCli({ api })).toEqual({
      code: 1,
      out: [],
      err: [`cf-build-logs: /accounts/${ACCOUNT}/workers/scripts: timed out after 30s`],
    });
  });

  it.each<[string, () => Response, string]>([
    [
      "Cloudflare's error list",
      () =>
        json(
          {
            success: false,
            errors: [
              { code: 9109, message: "Invalid access token" },
              { code: 10000, message: "Authentication error" },
            ],
          },
          403,
        ),
      "9109 Invalid access token; 10000 Authentication error",
    ],
    ["a gateway HTML page", () => new Response("<html>502 Bad Gateway</html>", { status: 502 }), "HTTP 502"],
    ["an empty body", () => new Response(""), "HTTP 200"],
    ["a JSON body that is not an object", () => new Response("null"), "HTTP 200"],
    ["an unsuccessful body without errors", () => json({ success: false, errors: [] }), "HTTP 200"],
    ["an error status with a successful body", () => json({ success: true, result: [] }, 500), "HTTP 500"],
  ])("maps %s to an error line", async (_, respond, why) => {
    expect(await runCli({ api: fakeApi(respond) })).toEqual({
      code: 1,
      out: [],
      err: [`cf-build-logs: /accounts/${ACCOUNT}/workers/scripts: ${why}`],
    });
  });
});
