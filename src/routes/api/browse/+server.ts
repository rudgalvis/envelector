import { json, error } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { RequestHandler } from './$types';

type DirEntry = {
	name: string;
	path: string;
};

export const GET: RequestHandler = async ({ url }) => {
	const requested = url.searchParams.get('path');
	const showHidden = url.searchParams.get('hidden') === '1';

	const home = os.homedir();
	const target = requested && requested.trim() ? requested.trim() : home;
	const resolved = path.resolve(target.replace(/^~(?=$|\/|\\)/, home));

	if (!fs.existsSync(resolved)) {
		error(404, 'Path does not exist');
	}

	let stat: fs.Stats;
	try {
		stat = fs.statSync(resolved);
	} catch (e) {
		error(500, e instanceof Error ? e.message : 'Failed to stat path');
	}

	if (!stat.isDirectory()) {
		error(400, 'Path is not a directory');
	}

	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(resolved, { withFileTypes: true });
	} catch (e) {
		error(500, e instanceof Error ? e.message : 'Failed to read directory');
	}

	const directories: DirEntry[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
		if (!showHidden && entry.name.startsWith('.')) continue;

		const full = path.join(resolved, entry.name);

		// Resolve symlinks but skip if they don't point to a directory we can read.
		if (entry.isSymbolicLink()) {
			try {
				const linkStat = fs.statSync(full);
				if (!linkStat.isDirectory()) continue;
			} catch {
				continue;
			}
		}

		directories.push({ name: entry.name, path: full });
	}

	directories.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

	const parent = path.dirname(resolved);
	const isRoot = parent === resolved;

	return json({
		path: resolved,
		parent: isRoot ? null : parent,
		home,
		directories
	});
};
