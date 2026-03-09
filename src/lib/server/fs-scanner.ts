import fs from 'fs';
import path from 'path';
import type { FileNode } from '$lib/types';

const ENV_PATTERN = /^\.env/;

const EXPECTED_ENV_FILES = ['.env', '.env.dev', '.env.staging', '.env.production'];

const scanDirectory = (dirPath: string): FileNode | null => {
	let entries: fs.Dirent[];

	try {
		entries = fs.readdirSync(dirPath, { withFileTypes: true });
	} catch {
		return null;
	}

	const children: FileNode[] = [];
	const envFiles: FileNode[] = [];

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);

		if (entry.isDirectory()) {
			// Skip hidden dirs and common noise dirs
			if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.git') {
				continue;
			}
			const subtree = scanDirectory(fullPath);
			if (subtree) {
				children.push(subtree);
			}
		} else if (entry.isFile() && ENV_PATTERN.test(entry.name)) {
			envFiles.push({
				name: entry.name,
				path: fullPath,
				type: 'file'
			});
		}
	}

	// If this directory has any real .env* files, also emit the four canonical
	// files — marking those that don't exist on disk as missing.
	if (envFiles.length > 0) {
		for (const name of EXPECTED_ENV_FILES) {
			const existing = envFiles.find((f) => f.name === name);
			if (existing) {
				children.push(existing);
			} else {
				children.push({
					name,
					path: path.join(dirPath, name),
					type: 'file',
					missing: true
				});
			}
		}

		// Also include any real .env* files that are not in the canonical list
		// (excluding .env.local which is intentionally ignored).
		for (const envFile of envFiles) {
			if (!EXPECTED_ENV_FILES.includes(envFile.name) && envFile.name !== '.env.local') {
				children.push(envFile);
			}
		}
	}

	if (children.length === 0) {
		return null;
	}

	return {
		name: path.basename(dirPath),
		path: dirPath,
		type: 'directory',
		children
	};
};

export const scanForEnvFiles = (rootPath: string): FileNode | null => {
	const resolved = path.resolve(rootPath);

	if (!fs.existsSync(resolved)) {
		return null;
	}

	const stat = fs.statSync(resolved);
	if (!stat.isDirectory()) {
		return null;
	}

	return scanDirectory(resolved);
};
