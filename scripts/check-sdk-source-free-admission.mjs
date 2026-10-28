import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PIN = 'ef8dc3e71eabae9c23058ed08162f7af10c38c00';
const SHA = /^[a-f0-9]{40}$/;
const EXPECTED_LANES = [
  'gleamlang', 'erlang', 'elixir', 'dart', 'rust', 'java',
  'golang', 'python3', 'ruby', 'php', 'typescript-nodejs',
  'typescript-deno', 'typescript-bun', 'typescript-edge',
  'kotlin', 'swift', 'zig', 'cpp',
];

const EXPECTED = {
  schema: 'claritas-sdk-source-free-admission-v1',
  source_repo: 'claritas-viz/claritas-clients',
  source_repo_id: 1346385887,
  source_commit: PIN,
  source_visibility: 'private',
  test_org: 'claritas-viz-test',
  reusable_workflow_repo: 'zed-pkg-test/.github',
  reusable_workflow_commit: 'df3eed96202810b7e7d6667fabc3041b19e6a22f',
  reusable_workflow_blob: '6c6f29c754df3842850d9fc873df0347ac3a4fc5',
  expected_language_lanes: EXPECTED_LANES,
  dependencies: ['claritas-viz/claritas-interfaces'],
  carrier_authorized: false,
  container_digests_verified: false,
  source_execution: 'denied',
  notes: 'Metadata only. Never place source content, secrets, or reviewed admission receipts in this public repo.',
  source_root_manifest_blob: '169f3cb02ffe1eb8d9a2d1606abf681231360885',
  source_zed_targets: ['rust', 'c', 'cpp', 'zig', 'nodejs', 'python', 'golang', 'ruby', 'php', 'rust-wasm', 'dart', 'gleam', 'erlang', 'elixir', 'java', 'kotlin', 'swift'],
};

// This manifest is an audited *metadata snapshot*, not private-source admission.
// The public test-org workflow must never accept an editable repository field,
// dispatcher input, commit message or workflow variable as authorization.
export function validateMetadata(raw) {
  assert.equal(typeof raw, 'string');
  assert.ok(raw.length > 0 && raw.length < 16_384, 'bounded policy input');
  const actual = JSON.parse(raw);
  assert.deepEqual(actual, EXPECTED, 'unexpected SDK source metadata, pins, lanes, or denied state');
  assert.equal(raw, JSON.stringify(actual, null, 2) + '\n', 'policy must be canonical JSON with no duplicate keys');
  for (const id of [actual.source_commit, actual.reusable_workflow_commit, actual.reusable_workflow_blob, actual.source_root_manifest_blob]) {
    assert.match(id, SHA, 'only immutable Git SHAs allowed');
  }
  assert.equal(new Set(actual.expected_language_lanes).size, 18, 'exactly eighteen distinct lanes');
  assert.equal(new Set(actual.source_zed_targets).size, 17, 'exactly seventeen pinned Zed target labels; 18 CI matrix lanes are not equivalent to 17 package targets');
  return { source_commit: actual.source_commit, lane_count: actual.expected_language_lanes.length };
}

export function validatePublicWorkflow(text) {
  assert.equal(typeof text, 'string');
  assert.ok(text.length > 0 && text.length < 16_384, 'bounded workflow text');
  assert.match(text, /name: Claritas SDK source-free admission/);
  assert.match(text, /source-free-contract:/);
  assert.match(text, /private-integration-denied:/);
  assert.match(text, /scripts\/check-sdk-source-free-admission\.mjs --require-private/);
  assert.match(text, /permissions:\s*\n\s+contents: read/);
  for (const forbidden of [
    /secrets\./, /read_token:/, /token:\s*\$\{\{/,
    /uses:\s*zed-pkg-test\//, /repository:\s*claritas-viz\/claritas-clients/,
    /docker\s+run/, /git\s+clone/, /pull_request_target:/,
    /\bworkflow_run:/, /\bissue_comment:/,
  ]) {
    assert.doesNotMatch(text, forbidden, 'public caller must remain source-free and token-free');
  }
}

const FIXED_LANE_READINESS = [
  ['gleamlang', 'gleam', true],
  ['erlang', 'erlang', true],
  ['elixir', 'elixir', true],
  ['dart', 'dart', true],
  ['rust', 'rust', true],
  ['java', 'java', true],
  ['golang', 'golang', true],
  ['python3', 'python', true],
  ['ruby', 'ruby', false],
  ['php', 'php', true],
  ['typescript-nodejs', 'nodejs', true],
  ['typescript-deno', 'nodejs', false],
  ['typescript-bun', 'nodejs', false],
  ['typescript-edge', 'nodejs', false],
  ['kotlin', 'kotlin', true],
  ['swift', 'swift', true],
  ['zig', 'zig', true],
  ['cpp', 'cpp', true],
];

// A manifest observed via metadata is not native integration evidence.
// Pin the exact ordered set, target correspondence and *denied* status.
// Container image digests are deliberately absent until independently verified.
export function validateLaneReadiness(raw) {
  assert.equal(typeof raw, 'string');
  assert.ok(raw.length > 0 && raw.length < 32_768, 'bounded readiness metadata');
  const actual = JSON.parse(raw);
  const expected = {
    schema: 'claritas-sdk-lane-readiness-v1',
    source_commit: PIN,
    source_tree_verified: false,
    private_carrier_approved: false,
    provenance: 'source-free, metadata-only spot checks; no native tests executed',
    lanes: FIXED_LANE_READINESS.map(([id, zed_target, manifest_observed]) => ({
      id, zed_target, manifest_observed, oci_image_digest: null,
      native_test_status: 'blocked',
    })),
  };
  assert.deepEqual(actual, expected, 'source-free readiness must not claim native execution or image approval');
  assert.equal(raw, JSON.stringify(actual, null, 2) + '\n', 'canonical readiness JSON required');
  assert.deepEqual(actual.lanes.map(x => x.id), EXPECTED_LANES, 'exact matrix lane identity/order');
  return { lane_count: actual.lanes.length, unverified: actual.lanes.filter(x => !x.manifest_observed).map(x => x.id) };
}

// Independent private carrier/source-owner approval must be verified outside
// this public repository. This public CI entry point is intentionally incapable
// of authorizing itself, even if users edit a checked-in policy file.
export function requirePrivateIntegration() {
  throw new Error('PRIVATE_SDK_SOURCE_NOT_AUTHORIZED: execute on an independently approved private exact-tree carrier, never this public repository');
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    const manifest = readFileSync(resolve(ROOT, 'ci/sdk-source-free-admission.json'), 'utf8');
    const workflow = readFileSync(resolve(ROOT, '.github/workflows/polyglot-sdk-consumer-matrix.yml'), 'utf8');
    const readiness = readFileSync(resolve(ROOT, 'ci/sdk-lane-readiness.json'), 'utf8');
    const summary = validateMetadata(manifest);
    const laneSummary = validateLaneReadiness(readiness);
    assert.equal(laneSummary.lane_count, summary.lane_count);
    validatePublicWorkflow(workflow);
    console.log('SOURCE_FREE_SDK_METADATA_PASS commit=' + summary.source_commit + ' lanes=' + summary.lane_count);
    if (process.argv.includes('--require-private')) requirePrivateIntegration();
    if (!process.argv.includes('--check') && !process.argv.includes('--require-private')) {
      throw new Error('unsupported mode');
    }
  } catch (error) {
    console.error('SOURCE_FREE_SDK_ADMISSION_DENIED: ' + error.message);
    process.exitCode = 1;
  }
}
