import { text, error } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const filePath = url.searchParams.get('path');

	if (!filePath) {
		error(400, 'Missing "path" query parameter');
	}

	const resolved = path.resolve(filePath);

	if (!fs.existsSync(resolved)) {
		error(404, 'File not found');
	}

	const stat = fs.statSync(resolved);
	if (!stat.isFile()) {
		error(400, 'Path is not a file');
	}

	const contents = fs.readFileSync(resolved, 'utf-8');

	return text(contents);
};
