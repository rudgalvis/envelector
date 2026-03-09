import { json, error } from '@sveltejs/kit';
import { scanForEnvFiles } from '$lib/server/fs-scanner';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	let body: { path?: string };

	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const rootPath = body.path?.trim();

	if (!rootPath) {
		error(400, 'Missing "path" field');
	}

	const tree = scanForEnvFiles(rootPath);

	return json({ tree });
};
