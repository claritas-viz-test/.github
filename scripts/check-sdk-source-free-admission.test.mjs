import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validateMetadata, validatePublicWorkflow, validateLaneReadiness, requirePrivateIntegration } from './check-sdk-source-free-admission.mjs';

const original = readFileSync('ci/sdk-source-free-admission.json', 'utf8');
const workflow = readFileSync('.github/workflows/polyglot-sdk-consumer-matrix.yml', 'utf8');
const readiness = readFileSync('ci/sdk-lane-readiness.json', 'utf8');
function altered(change) {
  const candidate = JSON.parse(original);
  change(candidate);
  return JSON.stringify(candidate, null, 2) + '\n';
}

test('audited source-free manifest and caller are valid, but not execution approval', () => {
  const summary = validateMetadata(original);
  assert.equal(summary.lane_count, 18);
  validatePublicWorkflow(workflow);
  assert.throws(requirePrivateIntegration, /PRIVATE_SDK_SOURCE_NOT_AUTHORIZED/);
});
test('modified or moving source commit is denied', () => {
  for (const newPin of ['main', 'f'.repeat(40), '']) {
    assert.throws(() => validateMetadata(altered(x => { x.source_commit = newPin; })));
  }
});
test('changed source identity, dependency, carrier or image authorization is denied', () => {
  for (const change of [
    x => { x.source_repo_id = 0; },
    x => { x.source_repo = 'attacker/private'; },
    x => { x.dependencies = []; },
    x => { x.source_root_manifest_blob = 'f'.repeat(40); },
    x => { x.source_sdk_matrix_blob = 'f'.repeat(40); },
    x => { x.source_sdk_matrix_targets.pop(); },
    x => { x.source_sdk_matrix_targets.reverse(); },
    x => { x.source_sdk_matrix_targets[3] = 'typescript-bun'; },
    x => { x.source_zed_targets.pop(); },
    x => { x.source_zed_targets.reverse(); },
    x => { x.carrier_authorized = true; },
    x => { x.container_digests_verified = true; },
    x => { x.source_execution = 'approved'; },
    x => { x.reusable_workflow_commit = 'main'; },
    x => { x.extra_secret = 'not allowed'; },
  ]) assert.throws(() => validateMetadata(altered(change)));
});
test('missing, duplicate or shuffled language lanes are denied', () => {
  for (const change of [
    x => { x.expected_language_lanes.pop(); },
    x => { x.expected_language_lanes.push(x.expected_language_lanes[0]); },
    x => { x.expected_language_lanes.reverse(); },
    x => { x.expected_language_lanes[0] = 'not-a-language'; },
  ]) assert.throws(() => validateMetadata(altered(change)));
});
test('noncanonical or duplicate JSON keys are denied', () => {
  assert.throws(() => validateMetadata(original.trimEnd()));
  const duplicate = original.replace('"source_repo":', '"source_repo": "malicious/private",\n  "source_repo":');
  assert.throws(() => validateMetadata(duplicate));
});
test('private checkout tokens and remote reusable actions are denied', () => {
  for (const bad of [
    '    secrets:\n      read_token: ${{ secrets.TEST_ORG_READ_TOKEN }}',
    '    uses: zed-pkg-test/.github/.github/workflows/sdk-client-language-matrix.yml@deadbeef',
    '    repository: claritas-viz/claritas-clients',
    '  pull_request_target:',
    '    run: git clone https://github.com/private',
  ]) assert.throws(() => validatePublicWorkflow(workflow + '\n' + bad));
});
test('public-workflow execution cannot be authorized by any checked-in metadata', () => {
  assert.throws(() => validateMetadata(altered(x => { x.carrier_authorized = true; })));
  assert.throws(requirePrivateIntegration, /PRIVATE_SDK_SOURCE_NOT_AUTHORIZED/);
});

function alteredReadiness(change) {
  const candidate = JSON.parse(readiness);
  change(candidate);
  return JSON.stringify(candidate, null, 2) + '\n';
}

test('all 18 lane readiness records remain explicitly blocked', () => {
  const summary = validateLaneReadiness(readiness);
  assert.equal(summary.lane_count, 18);
  assert.deepEqual(summary.unverified, [
    'typescript-deno', 'typescript-bun', 'typescript-edge',
  ]);
});

test('no lane can claim an OCI digest, native pass or private carrier approval', () => {
  for (const change of [
    x => { x.lanes[0].native_test_status = 'success'; },
    x => { x.lanes[3].oci_image_digest = 'ubuntu@sha256:' + 'f'.repeat(64); },
    x => { x.source_tree_verified = true; },
    x => { x.private_carrier_approved = true; },
    x => { x.provenance = 'tests executed'; },
  ]) assert.throws(() => validateLaneReadiness(alteredReadiness(change)));
});

test('missing/duplicate/extra/reordered lanes and falsified manifests are denied', () => {
  for (const change of [
    x => { x.lanes.pop(); },
    x => { x.lanes[1] = x.lanes[0]; },
    x => { x.lanes.reverse(); },
    x => { x.lanes[8].manifest_observed = false; },
    x => { x.lanes[0].zed_target = 'wrong-target'; },
    x => { x.lanes[0].invented = true; },
    x => { x.source_commit = 'main'; },
  ]) assert.throws(() => validateLaneReadiness(alteredReadiness(change)));
});

test('noncanonical and duplicate-key readiness files are denied', () => {
  assert.throws(() => validateLaneReadiness(readiness.trimEnd()));
  assert.throws(() => validateLaneReadiness(readiness.replace(
    '"source_commit":', '"source_commit": "moving-main",\n  "source_commit":'
  )));
});

test('exact pinned Ruby and shared TypeScript manifest observations cannot be forged', () => {
  for (const change of [
    x => { x.manifest_spot_checks.ruby.path = 'clients/ruby/unknown.gemspec'; },
    x => { x.manifest_spot_checks.ruby.blob_sha = '0'.repeat(40); },
    x => { x.manifest_spot_checks.typescript_node.blob_sha = 'f'.repeat(40); },
    x => { x.manifest_spot_checks.typescript_runtime_adapters.deno = 'verified'; },
    x => { x.manifest_spot_checks.typescript_runtime_adapters.bun = 'native_pass'; },
    x => { x.manifest_spot_checks.typescript_runtime_adapters.edge = 'supported'; },
    x => { delete x.manifest_spot_checks.ruby; },
  ]) assert.throws(() => validateLaneReadiness(alteredReadiness(change)));
});

test('authoritative source matrix has 17 targets, not 18 native passing test lanes', () => {
  const metadata = JSON.parse(original);
  assert.equal(metadata.source_sdk_matrix_targets.length, 17);
  assert.equal(metadata.expected_language_lanes.length, 18);
  assert.ok(metadata.source_sdk_matrix_targets.includes('c'));
  assert.ok(metadata.source_sdk_matrix_targets.includes('rust-wasm'));
  assert.ok(metadata.source_sdk_matrix_targets.includes('typescript'));
  for (const runtime of ['typescript-deno', 'typescript-bun', 'typescript-edge']) {
    assert.ok(!metadata.source_sdk_matrix_targets.includes(runtime));
  }
  validateMetadata(original);
});
