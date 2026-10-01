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
import { readFileSync } from "node:fs";

const API = "https://api.cloudflare.com/client/v4";
const KEYCHAIN_SERVICE = "athkar-cloudflare-builds";

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

export function parseArgs(argv: readonly string[]): { buildId?: string; branch?: string } {
  const i = argv.indexOf("--branch");
  const branch = i !== -1 ? argv[i + 1] : undefined;
  const buildId = argv.find((a, idx) => !a.startsWith("--") && argv[idx - 1] !== "--branch");
  return { buildId, branch };
}

function readToken(): string {
  const fromEnv = process.env.CLOUDFLARE_BUILDS_API_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  if (process.platform === "darwin") {
    try {
      return execFileSync("security", ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {
      // fall through to the error below
    }
  }
  throw new Error(
    `No token. Set CLOUDFLARE_BUILDS_API_TOKEN or add the macOS Keychain item "${KEYCHAIN_SERVICE}" (see README).`,
  );
}

async function api<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = (await res.json()) as { success: boolean; result: T; errors?: { code: number; message: string }[] };
  if (!res.ok || !body.success) {
    const why = body.errors?.map((e) => `${e.code} ${e.message}`).join("; ") || `HTTP ${res.status}`;
    throw new Error(`${path}: ${why}`);
  }
  return body.result;
}

async function main() {
  const config = JSON.parse(stripJsonComments(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"))) as {
    name: string;
    account_id?: string;
  };
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? config.account_id;
  if (!accountId) throw new Error("Set account_id in wrangler.jsonc or CLOUDFLARE_ACCOUNT_ID.");
  const token = readToken();
  const { buildId, branch } = parseArgs(process.argv.slice(2));

  let uuid = buildId;
  if (!uuid) {
    const scripts = await api<{ id: string; tag: string }[]>(token, `/accounts/${accountId}/workers/scripts`);
    const tag = scripts.find((s) => s.id === config.name)?.tag;
    if (!tag) throw new Error(`Worker "${config.name}" not found in account ${accountId}.`);
    const builds = await api<BuildSummary[]>(token, `/accounts/${accountId}/builds/workers/${tag}/builds`);
    const latest = pickLatest(builds, branch);
    if (!latest) throw new Error(branch ? `No builds for branch "${branch}".` : "No builds yet.");
    uuid = latest.build_uuid;
    const meta = latest.build_trigger_metadata;
    console.log(`Build ${uuid}  ${latest.status ?? ""} ${latest.build_outcome ?? ""}`.trim());
    console.log(`Branch ${branchOf(latest) ?? "?"}  commit ${meta?.commit_hash?.slice(0, 7) ?? "?"}  ${meta?.commit_message ?? ""}`);
    console.log("-".repeat(60));
  }

  let cursor: string | undefined;
  do {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const page = await api<{ lines?: unknown[]; cursor?: string; truncated?: boolean }>(
      token,
      `/accounts/${accountId}/builds/builds/${uuid}/logs${query}`,
    );
    formatLogLines(page.lines ?? []).forEach((l) => console.log(l));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err: unknown) => {
    console.error(`cf-build-logs: ${(err as Error).message}`);
    process.exit(1);
  });
}
