'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');

function runGit(args) {
  const result = spawnSync('git', args, { encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) {
    process.stderr.write(result.stderr || String(result.error || 'git failed') + '\n');
    process.exit(1);
  }
  return result.stdout;
}

function isClean(status) {
  return status.trim().length === 0;
}

if (process.argv.includes('--self-test')) {
  assert.equal(isClean(''), true);
  assert.equal(isClean(' M AGENTS.md\n'), false);
  assert.equal(isClean('?? untracked-test-file\n'), false);
}

const names = ['AGENTS.md', 'agents.md'];
const attrs = runGit(['check-attr', 'eol', '--', ...names]).trim().split(/\r?\n/);
for (const name of names) {
  if (!attrs.includes(name + ': eol: lf')) {
    process.stderr.write('Missing LF Git attribute for ' + name + '\n');
    process.exit(1);
  }
  const bytes = fs.readFileSync(name);
  if (bytes.includes(13)) {
    process.stderr.write('Unexpected CR byte in checked-out ' + name + '\n');
    process.exit(1);
  }
}

// Linux can distinguish the two tracked spellings; Windows and default macOS cannot.
// Enforce the same canonical bytes before Git checks the case-insensitive checkout.
assert.deepEqual(fs.readFileSync('AGENTS.md'), fs.readFileSync('agents.md'),
  'uppercase compatibility mirror must match lowercase canonical policy');

const status = runGit(['status', '--porcelain=v1', '--untracked-files=all']);
if (!isClean(status)) {
  process.stderr.write('CLI validation modified tracked or untracked source:\n');
  process.stderr.write(status);
  process.exit(1);
}
process.stdout.write('Verified LF agent policy and unchanged working tree.\n');
