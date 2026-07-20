/**
 * Parse an .env file string into a key-value record.
 * Handles:
 *   KEY=value
 *   KEY="double quoted"
 *   KEY='single quoted'
 *   # comments
 *   blank lines
 *   export KEY=value
 */
export const parseEnv = (content: string): Record<string, string> => {
	const result: Record<string, string> = {};

	for (const rawLine of content.split('\n')) {
		const line = rawLine.trim();

		// Skip blank lines and comments
		if (!line || line.startsWith('#')) continue;

		// Strip leading "export "
		const stripped = line.startsWith('export ') ? line.slice(7) : line;

		const eqIndex = stripped.indexOf('=');
		if (eqIndex === -1) continue;

		const key = stripped.slice(0, eqIndex).trim();
		if (!key) continue;

		let value = stripped.slice(eqIndex + 1);

		// Strip inline comments (only when value is not quoted)
		const firstChar = value[0];
		if (firstChar === '"' || firstChar === "'") {
			const closing = value.indexOf(firstChar, 1);
			value = closing !== -1 ? value.slice(1, closing) : value.slice(1);
		} else {
			// Remove inline comment
			const commentIdx = value.indexOf(' #');
			if (commentIdx !== -1) {
				value = value.slice(0, commentIdx);
			}
			value = value.trim();
		}

		result[key] = value;
	}

	return result;
};

/**
 * Parse a .env.example file for group definitions.
 * Groups are delimited by `# GROUP: <name>` comment lines.
 * Every KEY= line following a GROUP marker (until the next marker) belongs to that group.
 */
export const parseEnvGroups = (
	content: string
): Array<{ id: string; name: string; keys: string[]; collapsed: false }> => {
	const groups: Array<{ id: string; name: string; keys: string[]; collapsed: false }> = [];
	let current: { name: string; keys: string[] } | null = null;

	const flush = () => {
		if (current && current.keys.length > 0) {
			groups.push({
				id: current.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
				name: current.name,
				keys: current.keys,
				collapsed: false
			});
		}
	};

	for (const rawLine of content.split('\n')) {
		const line = rawLine.trim();
		const groupMatch = line.match(/^#\s*GROUP:\s*(.+)$/);
		if (groupMatch) {
			flush();
			current = { name: groupMatch[1].trim(), keys: [] };
			continue;
		}
		if (!line || line.startsWith('#') || !current) continue;
		const stripped = line.startsWith('export ') ? line.slice(7) : line;
		const eqIndex = stripped.indexOf('=');
		if (eqIndex === -1) continue;
		const key = stripped.slice(0, eqIndex).trim();
		if (key) current.keys.push(key);
	}

	flush();
	return groups;
};

/**
 * Serialize a key-value record back into .env file format,
 * preserving existing lines (comments, blank lines, ordering).
 * Handles updating an existing key or appending a new one.
 */
export const applyKeyToContent = (content: string, key: string, value: string): string => {
	const lines = content.split('\n');
	let found = false;

	const updatedLines = lines.map((line) => {
		const trimmed = line.trim();
		if (trimmed.startsWith('#') || !trimmed) return line;

		const stripped = trimmed.startsWith('export ') ? trimmed.slice(7) : trimmed;
		const eqIndex = stripped.indexOf('=');
		if (eqIndex === -1) return line;

		const lineKey = stripped.slice(0, eqIndex).trim();
		if (lineKey !== key) return line;

		found = true;
		// Preserve "export " prefix if present
		const prefix = trimmed.startsWith('export ') ? 'export ' : '';
		const needsQuoting = value.includes(' ') || value.includes('#') || value === '';
		const serialized = needsQuoting ? `"${value}"` : value;
		return `${prefix}${key}=${serialized}`;
	});

	if (!found) {
		// Append to end, skip trailing empty lines to keep a clean EOF
		const needsQuoting = value.includes(' ') || value.includes('#') || value === '';
		const serialized = needsQuoting ? `"${value}"` : value;
		const trimmedEnd = updatedLines.join('\n').trimEnd();
		return `${trimmedEnd}\n${key}=${serialized}\n`;
	}

	return updatedLines.join('\n');
};
