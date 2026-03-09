import { json, error } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import { applyKeyToContent } from '$lib/server/env-parser';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let body: { targetPath?: string; key?: string; value?: string };

	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const { targetPath, key, value } = body;

	if (!targetPath?.trim()) error(400, 'Missing "targetPath"');
	if (!key?.trim()) error(400, 'Missing "key"');
	if (value === undefined || value === null) error(400, 'Missing "value"');

	const resolved = path.resolve(targetPath);

	if (!fs.existsSync(resolved)) error(404, 'Target file not found');

	const stat = fs.statSync(resolved);
	if (!stat.isFile()) error(400, 'Target path is not a file');

	const current = fs.readFileSync(resolved, 'utf-8');
	const updated = applyKeyToContent(current, key, value);

	fs.writeFileSync(resolved, updated, 'utf-8');

	return json({ ok: true });
};
