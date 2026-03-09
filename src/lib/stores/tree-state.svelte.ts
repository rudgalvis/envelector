const KEY = 'envelector_tree_expanded';

export const treeState = $state<{ expanded: Record<string, true> }>({
	expanded: {}
});

const save = () => {
	try {
		localStorage.setItem(KEY, JSON.stringify(Object.keys(treeState.expanded)));
	} catch {}
};

export const initTreeState = () => {
	try {
		const stored = localStorage.getItem(KEY);
		if (stored) {
			const paths: string[] = JSON.parse(stored);
			for (const p of paths) treeState.expanded[p] = true;
		}
	} catch {}
};

export const setExpanded = (path: string, value: boolean) => {
	if (value) {
		treeState.expanded[path] = true;
	} else {
		delete treeState.expanded[path];
	}
	save();
};

/**
 * Expand all ancestor directories of a file so it is visible in the tree.
 */
export const expandParentsOf = (filePath: string) => {
	const parts = filePath.split('/');
	// Walk from root down to (but not including) the file itself
	for (let i = 1; i < parts.length - 1; i++) {
		const dirPath = parts.slice(0, i + 1).join('/');
		if (dirPath) treeState.expanded[dirPath] = true;
	}
	save();
};
