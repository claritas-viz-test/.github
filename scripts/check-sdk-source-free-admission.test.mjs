import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validateMetadata, validatePublicWorkflow, requirePrivateIntegration } from './check-sdk-source-free-admission.mjs';

const original = readFileSync('ci/sdk-source-free-admission.json', 'utf8');
const workflow = readFileSync('.github/workflows/polyglot-sdk-consumer-matrix.yml', 'utf8');
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
