import { goto } from '$app/navigation';
import { page } from '$app/state';
import { expandParentsOf } from '$lib/stores/tree-state.svelte';
import type { EnvData } from '$lib/types';

export const selectedFile = $state<{
	path: string | null;
	contents: string | null;
	envData: EnvData | null;
	loading: boolean;
	error: string | null;
}>({
	path: null,
	contents: null,
	envData: null,
	loading: false,
	error: null
});

const isBaseEnvFile = (filePath: string): boolean => {
	return filePath.endsWith('/.env') || filePath === '.env';
};

export const selectFile = async (filePath: string, updateUrl = true) => {
	selectedFile.path = filePath;
	selectedFile.contents = null;
	selectedFile.envData = null;
	selectedFile.loading = true;
	selectedFile.error = null;

	expandParentsOf(filePath);

	if (updateUrl) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('file', filePath);
		goto(`?${params.toString()}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	try {
		if (isBaseEnvFile(filePath)) {
			const res = await fetch('/api/env-data', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path: filePath })
			});
			if (!res.ok) {
				selectedFile.error = await res.text();
				return;
			}
			selectedFile.envData = await res.json();
		} else {
			const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
			if (!res.ok) {
				selectedFile.error = await res.text();
				return;
			}
			selectedFile.contents = await res.text();
		}
	} catch (e) {
		selectedFile.error = e instanceof Error ? e.message : 'Failed to load file';
	} finally {
		selectedFile.loading = false;
	}
};

export const refreshEnvData = async () => {
	if (!selectedFile.path || !isBaseEnvFile(selectedFile.path)) return;

	try {
		const res = await fetch('/api/env-data', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ path: selectedFile.path })
		});
		if (res.ok) {
			selectedFile.envData = await res.json();
		}
	} catch {
		// silent refresh failure — keep existing data
	}
};
