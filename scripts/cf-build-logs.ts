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

interface ResultInfo {
  readonly page?: number;
  readonly total_pages?: number;
}

export interface BuildSummary {
  readonly build_uuid: string;
  readonly status?: string;
  readonly build_outcome?: string | null;
  readonly created_on?: string;
  readonly created_at?: string;
  readonly build_trigger_metadata?: { branch?: string; commit_hash?: string; commit_message?: string };
  readonly branch?: string;
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

export function branchOf(build: BuildSummary): string | undefined {
  return build.build_trigger_metadata?.branch ?? build.branch;
}

/** Newest build, optionally restricted to one branch. */
export function pickLatest(builds: readonly BuildSummary[], branch?: string): BuildSummary | undefined {
  const time = (b: BuildSummary) => Date.parse(b.created_on ?? b.created_at ?? "") || 0;
  return [...builds].filter((b) => !branch || branchOf(b) === branch).sort((a, b) => time(b) - time(a))[0];
}

/** Log lines come back as [timestamp, text] pairs or plain strings. */
export function formatLogLines(lines: readonly unknown[]): string[] {
  return lines.map((l) => (Array.isArray(l) ? String(l[l.length - 1]) : String(l)));
}

export interface ApiBody<T> {
  readonly success: boolean;
  readonly result: T;
  readonly result_info?: ResultInfo;
  readonly errors?: { code: number; message: string }[];
}

/** True while Cloudflare reports more pages, or (without totals) the page came back full. */
export function hasMorePages(info: ResultInfo | undefined, received: number, perPage: number): boolean {
  if (received === 0) return false;
  if (info?.page !== undefined && info.total_pages !== undefined) return info.page < info.total_pages;
  return received >= perPage;
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

/** Parses an API response body; non-JSON (e.g. a gateway HTML page) becomes an unsuccessful body. */
export function parseApiBody<T>(text: string): ApiBody<T> | { readonly success: false } {
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? (parsed as ApiBody<T>) : { success: false };
  } catch {
    return { success: false };
  }
}

/** Removes control characters so remote text cannot drive the terminal. */
export function sanitizeTerminal(text: string): string {
  return text.replace(CONTROL_CHARS, "");
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "unknown error";
}

/** Rejects tokens that are not printable ASCII; never includes the token in the error. */
export function validateToken(token: string): string {
  if (!TOKEN.test(token)) {
    throw new Error("Token has invalid characters (whitespace or control characters). Re-create it and try again.");
  }
  return token;
}

/** Env var wins when non-empty; otherwise wrangler.jsonc. Must be a 32-char hex id. */
export function resolveAccountId(fromEnv: string | undefined, fromConfig: string | undefined): string {
  const id = fromEnv?.trim() || fromConfig;
  if (!id) throw new Error("Set account_id in wrangler.jsonc or CLOUDFLARE_ACCOUNT_ID.");
  if (!ACCOUNT_ID.test(id)) throw new Error("Account id must be 32 hex characters.");
  return id;
}

export function parseArgs(argv: readonly string[]): { buildId?: string; branch?: string } {
  const i = argv.indexOf("--branch");
  let branch: string | undefined;
  if (i !== -1) {
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error("--branch needs a value");
    branch = value;
  }
  const buildId = argv.find((a, idx) => !a.startsWith("--") && !(i !== -1 && idx === i + 1));
  if (buildId && !UUID.test(buildId)) throw new Error(`"${sanitizeTerminal(buildId)}" is not a build UUID`);
  return { buildId, branch };
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

async function request<T>(token: string, path: string): Promise<ApiBody<T>> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    // Never surface fetch's own message: it can quote request headers (the token).
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    throw new Error(`${path}: ${timedOut ? `timed out after ${REQUEST_TIMEOUT_MS / 1000}s` : "network error"}`);
  }
  const body = parseApiBody<T>(await res.text());
  if (!res.ok || !body.success) {
    const errors = "errors" in body ? body.errors : undefined;
    const why = errors?.map((e) => `${e.code} ${e.message}`).join("; ") || `HTTP ${res.status}`;
    throw new Error(`${path}: ${why}`);
  }
  return body;
}

async function api<T>(token: string, path: string): Promise<T> {
  return (await request<T>(token, path)).result;
}

/** Reads every page of a paginated list endpoint (bounded by MAX_PAGES). */
async function listAll<T>(token: string, path: string): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const body = await request<T[]>(token, `${path}${sep}page=${page}&per_page=${PER_PAGE}`);
    all.push(...body.result);
    if (!hasMorePages(body.result_info, body.result.length, PER_PAGE)) break;
  }
  return all;
}

async function main() {
  const config = JSON.parse(stripJsonComments(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"))) as {
    name: string;
    account_id?: string;
  };
  // Validate input before touching credentials, so bad arguments get a clear error.
  const { buildId, branch } = parseArgs(process.argv.slice(2));
  const accountId = resolveAccountId(process.env.CLOUDFLARE_ACCOUNT_ID, config.account_id);
  const token = readToken();

  let uuid = buildId;
  if (!uuid) {
    const scripts = await api<{ id: string; tag: string }[]>(token, `/accounts/${accountId}/workers/scripts`);
    const tag = scripts.find((s) => s.id === config.name)?.tag;
    if (!tag) throw new Error(`Worker "${config.name}" not found in account ${accountId}.`);
    const builds = await listAll<BuildSummary>(token, `/accounts/${accountId}/builds/workers/${tag}/builds`);
    const latest = pickLatest(builds, branch);
    if (!latest) throw new Error(branch ? `No builds for branch "${branch}".` : "No builds yet.");
    uuid = latest.build_uuid;
    const meta = latest.build_trigger_metadata;
    console.log(sanitizeTerminal(`Build ${uuid}  ${latest.status ?? ""} ${latest.build_outcome ?? ""}`.trim()));
    console.log(
      sanitizeTerminal(
        `Branch ${branchOf(latest) ?? "?"}  commit ${meta?.commit_hash?.slice(0, 7) ?? "?"}  ${meta?.commit_message ?? ""}`,
      ),
    );
    console.log("-".repeat(60));
  }

  let cursor: string | undefined;
  const seen = new Set<string>();
  for (let n = 0; n < MAX_LOG_PAGES; n++) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const page = await api<{ lines?: unknown[]; cursor?: string; truncated?: boolean }>(
      token,
      `/accounts/${accountId}/builds/builds/${encodeURIComponent(uuid)}/logs${query}`,
    );
    formatLogLines(page.lines ?? []).forEach((l) => console.log(sanitizeTerminal(l)));
    cursor = page.truncated ? page.cursor : undefined;
    if (!cursor || seen.has(cursor)) return;
    seen.add(cursor);
  }
  console.error(`cf-build-logs: stopped after ${MAX_LOG_PAGES} log pages`);
}

if (isEntrypoint(import.meta.url, process.argv[1])) {
  main().catch((err: unknown) => {
    console.error(`cf-build-logs: ${sanitizeTerminal(errorMessage(err))}`);
    process.exit(1);
  });
}
