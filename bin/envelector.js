#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { exec } from 'node:child_process';
import { platform } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildDir = join(__dirname, '..', 'build');

process.env.PORT ??= '4747';
process.env.HOST ??= 'localhost';

const port = process.env.PORT;
const host = process.env.HOST;
const url = `http://${host}:${port}`;

await import(join(buildDir, 'index.js'));

const openCmd = platform() === 'darwin' ? 'open' : platform() === 'win32' ? 'start' : 'xdg-open';

setTimeout(() => {
	exec(`${openCmd} ${url}`, (err) => {
		if (err) console.error('Could not open browser automatically. Visit:', url);
	});
}, 500);
