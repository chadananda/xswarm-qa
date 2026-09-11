#!/usr/bin/env node
// bin entry point. Keeps the shebang isolated so cli.js stays importable by tests.
import { run } from './cli.js';
run(process.argv.slice(2));
