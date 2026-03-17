#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const buildIndex = join(__dirname, '..', 'build', 'index.js');

if (!existsSync(buildIndex)) {
	console.error('\n  envelector: build not found.');
	console.error('  Run `pnpm build` (or `npm run build`) inside the package first.\n');
	process.exit(1);
}

const PORT = process.env.PORT ?? '4747';
const HOST = process.env.HOST ?? 'localhost';

const server = spawn(process.execPath, [buildIndex], {
	env: { ...process.env, PORT, HOST },
	stdio: 'inherit'
});

server.on('error', (err) => {
	console.error('Failed to start server:', err.message);
	process.exit(1);
});

server.on('exit', (code) => process.exit(code ?? 0));

// Open the browser after giving the server a moment to bind
setTimeout(() => {
	const url = `http://${HOST}:${PORT}`;
	console.log(`\n  envelector  →  ${url}\n`);

	const opener =
		process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';

	spawn(opener, [url], { detached: true, stdio: 'ignore' }).unref();
}, 800);

process.on('SIGINT', () => {
	server.kill('SIGINT');
});
process.on('SIGTERM', () => {
	server.kill('SIGTERM');
});
