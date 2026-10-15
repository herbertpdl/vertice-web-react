#!/usr/bin/env node
/**
 * Regenerates `src/lib/api/schema.ts` from vertice-bff's published OpenAPI document
 * (`docs/openapi.json`) at the commit pinned in `src/lib/api/.bff-ref` (XREPO-005, XREPO-013).
 * Same pattern as vertice-bff's own `npm run sync:protos` against vertice-api.
 *
 *   npm run api:types                  # fetch the pinned commit from GitHub and rewrite schema.ts
 *   npm run api:types -- --check       # same fetch, write nothing, exit 1 if schema.ts differs
 *   npm run api:types -- --local       # read the pinned commit from the sibling ../vertice-bff clone
 *   npm run api:types -- --local=PATH  # ...or from another clone (the pinned commit must exist there)
 *
 * Bumping the pin: merge the BFF change (which regenerates its `docs/openapi.json`), put the
 * merge commit's full SHA in `src/lib/api/.bff-ref`, run `npm run api:types`, commit both plus
 * whatever the new types made this app fix. CI runs `--check`.
 * vertice-bff is public, so the remote mode needs no token (GITHUB_TOKEN lifts rate limits).
 *
 * The output is deterministic: same pinned spec + same pinned openapi-typescript = same file,
 * which is what makes `--check` a usable CI gate.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const REPO = "herbertpdl/vertice-bff";
const SPEC_PATH = "docs/openapi.json";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const refFile = path.join(root, "src", "lib", "api", ".bff-ref");
const outFile = path.join(root, "src", "lib", "api", "schema.ts");

function fail(message) {
  process.stderr.write(`api:types: ${message}\n`);
  process.exit(2);
}

/** The pinned SHA: the first non-blank, non-`#` line of `.bff-ref`, which must be 40 hex chars. */
export function parsePin(content) {
  const line = content
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l !== "" && !l.startsWith("#"));
  if (!line || !/^[0-9a-f]{40}$/.test(line)) {
    throw new Error("src/lib/api/.bff-ref must hold a full 40-character lowercase commit SHA of vertice-bff");
  }
  return line;
}

/** The spec as text, from a local clone (`git show`) or from GitHub at the pinned commit. */
async function readSpec(sha, local) {
  if (local !== null) {
    try {
      return execFileSync("git", ["-C", local, "show", `${sha}:${SPEC_PATH}`], {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch {
      fail(`commit ${sha} (or ${SPEC_PATH}) not found in ${local}; run "git -C ${local} fetch" first`);
    }
  }
  const headers = { "User-Agent": "vertice-web-react-sync-api-types" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  // A raw URL pinned to a commit SHA is immutable, so this needs no cache busting.
  const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${sha}/${SPEC_PATH}`, { headers });
  if (!res.ok) fail(`could not fetch ${REPO}@${sha}:${SPEC_PATH}: HTTP ${res.status}`);
  return await res.text();
}

/** The generated module: a provenance banner plus openapi-typescript's output. */
function render(spec, sha, generatorVersion, types) {
  return (
    "/**\n" +
    " * Generated from vertice-bff's OpenAPI document. Do not edit by hand.\n" +
    ` * Source:    ${REPO}@${sha}:${SPEC_PATH}\n` +
    ` * Spec:      ${spec.info.title} ${spec.info.version} (OpenAPI ${spec.openapi})\n` +
    ` * Generator: openapi-typescript@${generatorVersion}\n` +
    " *\n" +
    " * Regenerate with `npm run api:types` after bumping src/lib/api/.bff-ref.\n" +
    " * The app's own aliases over these types live in src/lib/api/types.ts.\n" +
    " */\n\n" +
    types
  );
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const localArg = args.find((a) => a === "--local" || a.startsWith("--local="));
  const unknown = args.filter((a) => a !== "--check" && a !== localArg);
  if (unknown.length > 0) {
    fail(`unknown argument(s): ${unknown.join(" ")}\nUsage: sync-api-types [--check] [--local[=PATH]]`);
  }
  const local = localArg === undefined ? null : path.resolve(root, localArg.split("=")[1] ?? "../vertice-bff");

  let sha;
  try {
    sha = parsePin(readFileSync(refFile, "utf8"));
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  const spec = JSON.parse(await readSpec(sha, local));
  // `defaultNonNullable: false`: a request field with a schema default (`description`,
  // `restSecondsBetweenSets`, ...) is optional on the wire, and the BFF applies the default.
  // Leaving the option on its default (true) would make those fields required in request types.
  const ast = await openapiTS(spec, { defaultNonNullable: false });
  const generatorVersion = createRequire(import.meta.url)("openapi-typescript/package.json").version;
  const next = render(spec, sha, generatorVersion, astToString(ast));

  const current = (() => {
    try {
      return readFileSync(outFile, "utf8");
    } catch {
      return null;
    }
  })();

  if (check) {
    if (current === next) {
      process.stdout.write(
        `src/lib/api/schema.ts matches ${REPO}@${sha.slice(0, 10)} (openapi-typescript@${generatorVersion})\n`,
      );
      return;
    }
    process.stderr.write(
      `src/lib/api/schema.ts is stale: it does not match ${REPO}@${sha}:${SPEC_PATH}\n` +
        'Run "npm run api:types" and commit the result (or fix src/lib/api/.bff-ref if the pin is wrong).\n',
    );
    process.exit(1);
  }

  if (current === next) {
    process.stdout.write(`src/lib/api/schema.ts already matches ${REPO}@${sha.slice(0, 10)}\n`);
    return;
  }
  writeFileSync(outFile, next);
  process.stdout.write(
    `Wrote src/lib/api/schema.ts from ${REPO}@${sha.slice(0, 10)} (openapi-typescript@${generatorVersion})\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
