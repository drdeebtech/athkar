/**
 * Prints Cloudflare Workers Builds logs for this project.
 *
 *   npm run logs:build                 latest build
 *   npm run logs:build -- --branch main
 *   npm run logs:build -- <build_uuid>
 *
 * Auth: a least-privilege API token (Account > Workers Builds Configuration: Read,
 * Account > Workers Scripts: Read). Read from CLOUDFLARE_BUILDS_API_TOKEN, or on
 * macOS from the Keychain item "athkar-cloudflare-builds". Never commit it.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const API = "https://api.cloudflare.com/client/v4";
const KEYCHAIN_SERVICE = "athkar-cloudflare-builds";
const PER_PAGE = 50;
const MAX_PAGES = 20;
const MAX_LOG_PAGES = 200;
const REQUEST_TIMEOUT_MS = 30_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACCOUNT_ID = /^[0-9a-f]{32}$/;
const TOKEN = /^[\x21-\x7e]+$/;
// C0/C1 control characters except tab and newline (blocks terminal escape injection).
const CONTROL_CHARS = /[\x00-\x08\x0b-\x1f\x7f-\x9f]/g;

/** Everything a run needs from outside this module, so tests can replace each piece. */
export interface RunDeps {
  /** CLI arguments after the script path. */
  readonly argv: readonly string[];
  /** Only CLOUDFLARE_ACCOUNT_ID is read here; the token comes from `getToken`. */
  readonly env: Readonly<Record<string, string | undefined>>;
  /** Returns the text of wrangler.jsonc. */
  readonly readConfig: () => string;
  /** Called at most once, and only after the arguments and account id are valid. */
  readonly getToken: () => string;
  readonly fetch: (url: string, init: RequestInit) => Promise<Response>;
  /** Receives each stdout line, already stripped of control characters. */
  readonly out: (line: string) => void;
  /** Receives each stderr line, already stripped of control characters. */
  readonly err: (line: string) => void;
}

type Sink = (line: string) => void;

interface WranglerConfig {
  readonly name: string;
  readonly account_id?: string;
}

interface ResultInfo {
  readonly page?: number;
  readonly total_pages?: number;
}

interface ApiBody<T> {
  readonly success: boolean;
  readonly result: T;
  readonly result_info?: ResultInfo;
  readonly errors?: { code: number; message: string }[];
}

interface WorkerScript {
  readonly id: string;
  readonly tag: string;
}

interface BuildSummary {
  readonly build_uuid: string;
  readonly status?: string;
  readonly build_outcome?: string | null;
  readonly created_on?: string;
  readonly created_at?: string;
  readonly build_trigger_metadata?: { branch?: string; commit_hash?: string; commit_message?: string };
  readonly branch?: string;
}

interface LogPage {
  readonly lines?: unknown[];
  readonly cursor?: string;
  readonly truncated?: boolean;
}

/** One Cloudflare account, read with one token. */
interface Account {
  readonly id: string;
  readonly token: string;
  readonly fetch: RunDeps["fetch"];
}

/**
 * Prints the logs of one Workers build: the build named on the command line, or
 * else the latest build (optionally on one branch) under a short header.
 *
 * Every line reaches `out` or `err` through one sink that strips control
 * characters, and a failure becomes a single `cf-build-logs: ...` line on `err`
 * and exit code 1 rather than a rejection.
 *
 * @returns the exit code: 1 after an error, otherwise 0 (also when the log page cap is hit).
 */
export async function run(deps: RunDeps): Promise<number> {
  const out = cleaned(deps.out);
  const err = cleaned(deps.err);
  try {
    const config = parseConfig(deps.readConfig());
    // Validate input before touching credentials, so bad arguments get a clear error.
    const { buildId, branch } = parseArgs(deps.argv);
    const id = resolveAccountId(deps.env.CLOUDFLARE_ACCOUNT_ID, config.account_id);
    const account: Account = { id, token: deps.getToken(), fetch: deps.fetch };
    // `||`, not `??`: an empty argument has always meant "no build id".
    const uuid = buildId || (await announceLatestBuild(account, config.name, branch, out));
    await printLogs(account, uuid, out, err);
    return 0;
  } catch (error) {
    err(`cf-build-logs: ${errorMessage(error)}`);
    return 1;
  }
}

/** Wraps a sink so remote text (logs, commit messages, errors) cannot drive the terminal. */
function cleaned(sink: Sink): Sink {
  return (line) => sink(line.replace(CONTROL_CHARS, ""));
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "unknown error";
}

/** Strips // and /* *\/ comments from JSONC without touching string contents. */
export function stripJsonComments(text: string): string {
  let out = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inString) {
      out += ch;
      if (ch === "\\") out += text[++i] ?? "";
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (ch === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i++;
    } else {
      out += ch;
    }
  }
  return out;
}

/** Parses wrangler.jsonc; the run only reads `name` and `account_id`. */
function parseConfig(text: string): WranglerConfig {
  return JSON.parse(stripJsonComments(text)) as WranglerConfig;
}

function parseArgs(argv: readonly string[]): { buildId?: string; branch?: string } {
  const i = argv.indexOf("--branch");
  let branch: string | undefined;
  if (i !== -1) {
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error("--branch needs a value");
    branch = value;
  }
  const buildId = argv.find((a, idx) => !a.startsWith("--") && !(i !== -1 && idx === i + 1));
  if (buildId && !UUID.test(buildId)) throw new Error(`"${buildId}" is not a build UUID`);
  return { buildId, branch };
}

/** Env var wins when non-empty; otherwise wrangler.jsonc. Must be a 32-char hex id. */
function resolveAccountId(fromEnv: string | undefined, fromConfig: string | undefined): string {
  const id = fromEnv?.trim() || fromConfig;
  if (!id) throw new Error("Set account_id in wrangler.jsonc or CLOUDFLARE_ACCOUNT_ID.");
  if (!ACCOUNT_ID.test(id)) throw new Error("Account id must be 32 hex characters.");
  return id;
}

/** Finds the newest build (on `branch`, when given), prints its header and returns its UUID. */
async function announceLatestBuild(
  account: Account,
  workerName: string,
  branch: string | undefined,
  out: Sink,
): Promise<string> {
  const latest = await findLatestBuild(account, workerName, branch);
  const meta = latest.build_trigger_metadata;
  out(`Build ${latest.build_uuid}  ${latest.status ?? ""} ${latest.build_outcome ?? ""}`.trim());
  out(`Branch ${branchOf(latest) ?? "?"}  commit ${meta?.commit_hash?.slice(0, 7) ?? "?"}  ${meta?.commit_message ?? ""}`);
  out("-".repeat(60));
  return latest.build_uuid;
}

async function findLatestBuild(account: Account, workerName: string, branch: string | undefined): Promise<BuildSummary> {
  const scripts = await getResult<WorkerScript[]>(account, `/accounts/${account.id}/workers/scripts`);
  const tag = scripts.find((s) => s.id === workerName)?.tag;
  if (!tag) throw new Error(`Worker "${workerName}" not found in account ${account.id}.`);
  // Every page first: the newest build on a branch can sit on any page.
  const builds = await listAll<BuildSummary>(account, `/accounts/${account.id}/builds/workers/${tag}/builds`);
  const latest = pickLatest(builds, branch);
  if (!latest) throw new Error(branch ? `No builds for branch "${branch}".` : "No builds yet.");
  return latest;
}

function branchOf(build: BuildSummary): string | undefined {
  return build.build_trigger_metadata?.branch ?? build.branch;
}

/** Newest build, optionally restricted to one branch. */
function pickLatest(builds: readonly BuildSummary[], branch?: string): BuildSummary | undefined {
  const time = (b: BuildSummary) => Date.parse(b.created_on ?? b.created_at ?? "") || 0;
  return [...builds].filter((b) => !branch || branchOf(b) === branch).sort((a, b) => time(b) - time(a))[0];
}

/**
 * Prints every log page of one build by following its cursor. Stops on a cursor
 * it has already seen and after MAX_LOG_PAGES pages, so a misbehaving API cannot
 * keep the loop going forever.
 */
async function printLogs(account: Account, uuid: string, out: Sink, err: Sink): Promise<void> {
  const path = `/accounts/${account.id}/builds/builds/${encodeURIComponent(uuid)}/logs`;
  let cursor: string | undefined;
  let seen: ReadonlySet<string> = new Set();
  for (let n = 0; n < MAX_LOG_PAGES; n++) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const page = await getResult<LogPage>(account, `${path}${query}`);
    for (const line of page.lines ?? []) out(logText(line));
    cursor = page.truncated ? page.cursor : undefined;
    if (!cursor || seen.has(cursor)) return;
    seen = new Set([...seen, cursor]);
  }
  err(`cf-build-logs: stopped after ${MAX_LOG_PAGES} log pages`);
}

/** Log lines come back as [timestamp, text] pairs or plain strings. */
function logText(line: unknown): string {
  return Array.isArray(line) ? String(line[line.length - 1]) : String(line);
}

/** Reads every page of a paginated list endpoint (bounded by MAX_PAGES). */
async function listAll<T>(account: Account, path: string): Promise<readonly T[]> {
  let all: readonly T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await request<T[]>(account, `${path}?page=${page}&per_page=${PER_PAGE}`);
    all = [...all, ...body.result];
    if (!hasMorePages(body.result_info, body.result.length, PER_PAGE)) break;
  }
  return all;
}

/** True while Cloudflare reports more pages, or (without totals) the page came back full. */
export function hasMorePages(info: ResultInfo | undefined, received: number, perPage: number): boolean {
  if (received === 0) return false;
  if (info?.page !== undefined && info.total_pages !== undefined) return info.page < info.total_pages;
  return received >= perPage;
}

async function getResult<T>(account: Account, path: string): Promise<T> {
  return (await request<T>(account, path)).result;
}

/** GETs one API path; an HTTP error or unusable body becomes an error naming the path. */
async function request<T>(account: Account, path: string): Promise<ApiBody<T>> {
  const res = await send(account, path);
  const body = parseApiBody<T>(await res.text());
  if (!res.ok || !body.success) {
    const errors = "errors" in body ? body.errors : undefined;
    const why = errors?.map((e) => `${e.code} ${e.message}`).join("; ") || `HTTP ${res.status}`;
    throw new Error(`${path}: ${why}`);
  }
  return body;
}

async function send(account: Account, path: string): Promise<Response> {
  try {
    return await account.fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${account.token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    // Never surface fetch's own message: it can quote request headers (the token).
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    throw new Error(`${path}: ${timedOut ? `timed out after ${REQUEST_TIMEOUT_MS / 1000}s` : "network error"}`);
  }
}

/** Parses an API response body; non-JSON (e.g. a gateway HTML page) becomes an unsuccessful body. */
function parseApiBody<T>(text: string): ApiBody<T> | { readonly success: false } {
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as ApiBody<T>) : { success: false };
  } catch {
    return { success: false };
  }
}

/** Rejects tokens that are not printable ASCII; never includes the token in the error. */
export function validateToken(token: string): string {
  if (!TOKEN.test(token)) {
    throw new Error("Token has invalid characters (whitespace or control characters). Re-create it and try again.");
  }
  return token;
}

function readToken(): string {
  const fromEnv = process.env.CLOUDFLARE_BUILDS_API_TOKEN?.trim();
  if (fromEnv) return validateToken(fromEnv);
  if (process.platform === "darwin") {
    try {
      return validateToken(
        execFileSync("security", ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim(),
      );
    } catch {
      // fall through to the error below
    }
  }
  throw new Error(
    `No token. Set CLOUDFLARE_BUILDS_API_TOKEN or add the macOS Keychain item "${KEYCHAIN_SERVICE}" (see README).`,
  );
}

/**
 * Compares real filesystem paths so spaces, Arabic letters, Windows paths and
 * symlinked entrypoints all match.
 */
export function isEntrypoint(moduleUrl: string, argv1: string | undefined): boolean {
  if (!argv1) return false;
  const real = (p: string) => {
    try {
      return realpathSync(p);
    } catch {
      return p;
    }
  };
  try {
    return real(fileURLToPath(moduleUrl)) === real(argv1);
  } catch {
    return false;
  }
}

if (isEntrypoint(import.meta.url, process.argv[1])) {
  process.exitCode = await run({
    argv: process.argv.slice(2),
    env: process.env,
    readConfig: () => readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    getToken: readToken,
    // Wrapped so fetch is always called as a plain function, never as a method of `account`.
    fetch: (url, init) => fetch(url, init),
    out: (line) => console.log(line),
    err: (line) => console.error(line),
  });
}
