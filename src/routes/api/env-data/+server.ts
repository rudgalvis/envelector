import { json, error } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { parseEnv, parseEnvGroups } from '$lib/server/env-parser';
import type { EnvData, EnvSource } from '$lib/types';
import type { RequestHandler } from './$types';

const ENV_PATTERN = /^\.env/;

// Canonical source order — these come first, then extras alphabetically
const SOURCE_ORDER = ['.env.dev', '.env.staging', '.env.production'];

export const POST: RequestHandler = async ({ request }) => {
	let body: { path?: string };

	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const filePath = body.path?.trim();
	if (!filePath) error(400, 'Missing "path" field');

	const resolved = path.resolve(filePath);

	if (!fs.existsSync(resolved)) error(404, 'File not found');

	// Read the .env target file
	const targetContent = fs.readFileSync(resolved, 'utf-8');
	const target = parseEnv(targetContent);

	// Find all sibling .env.* files (not the base .env itself)
	const dir = path.dirname(resolved);
	let siblingNames: string[];
	try {
		siblingNames = fs.readdirSync(dir).filter((name) => {
			return (
				ENV_PATTERN.test(name) &&
				name !== '.env' &&
				name !== '.env.local' &&
				name !== path.basename(resolved)
			);
		});
	} catch {
		siblingNames = [];
	}

	// Sort: canonical order first, then extras alphabetically
	const canonical = SOURCE_ORDER.filter((n) => siblingNames.includes(n));
	const extras = siblingNames
		.filter((n) => !SOURCE_ORDER.includes(n))
		.sort((a, b) => a.localeCompare(b));

	const orderedSiblings = [...canonical, ...extras];

	const sources: EnvSource[] = orderedSiblings.map((name) => {
		const sibPath = path.join(dir, name);
		let values: Record<string, string> = {};
		try {
			values = parseEnv(fs.readFileSync(sibPath, 'utf-8'));
		} catch {
			// unreadable sibling — treat as empty
		}
		return { name, path: sibPath, values };
	});

	// Union of all keys: target first (preserve order), then from sources
	const keySet = new Set<string>([...Object.keys(target)]);
	for (const src of sources) {
		for (const k of Object.keys(src.values)) keySet.add(k);
	}

	// Parse groups from .env.example in the same directory
	const examplePath = path.join(dir, '.env.example');
	let groups: EnvData['groups'] = [];
	if (fs.existsSync(examplePath)) {
		try {
			groups = parseEnvGroups(fs.readFileSync(examplePath, 'utf-8'));
		} catch {
			// unreadable example — no groups
		}
	}

	const envData: EnvData = {
		targetPath: resolved,
		target,
		sources,
		allKeys: [...keySet],
		groups
	};

	return json(envData);
};
