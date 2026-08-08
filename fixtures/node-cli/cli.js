#!/usr/bin/env node
'use strict';

const HELP = 'claritas-portable-node-cli 1.0.0\n\nUsage: claritas-portable-node-cli [--help]\n';

function run(argv) {
  if (argv.length === 0 || ['--help', '-h'].includes(argv[0])) {
    return { code: 0, output: HELP };
  }
  return { code: 2, output: 'unsupported argument; use --help\n' };
}

if (require.main === module) {
  const result = run(process.argv.slice(2));
  (result.code === 0 ? process.stdout : process.stderr).write(result.output);
  process.exitCode = result.code;
}

module.exports = { HELP, run };
