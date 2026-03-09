export type FileNode = {
	name: string;
	path: string;
	type: 'file' | 'directory';
	missing?: boolean;
	children?: FileNode[];
};

export type EnvSource = {
	name: string;
	path: string;
	values: Record<string, string>;
};

export type EnvData = {
	targetPath: string;
	target: Record<string, string>;
	sources: EnvSource[];
	allKeys: string[];
};
