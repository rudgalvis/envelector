<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Sidebar,
		SidebarContent,
		SidebarHeader,
		SidebarFooter,
		SidebarGroup,
		SidebarGroupLabel,
		SidebarGroupContent,
		SidebarSeparator
	} from '$lib/components/ui/sidebar/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import FileTree from '$lib/components/FileTree.svelte';
	import type { FileNode } from '$lib/types';
	import { FolderSearch, Loader2 } from '@lucide/svelte';
	import { initTreeState } from '$lib/stores/tree-state.svelte';

	type Props = {
		selectedPath: string | null;
		onSelect: (path: string) => void;
	};

	let { selectedPath, onSelect }: Props = $props();

	const STORAGE_KEY = 'envelector_root_path';

	let rootPath = $state('');
	let tree = $state<FileNode | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	const scan = async () => {
		const trimmed = rootPath.trim();
		if (!trimmed) return;

		localStorage.setItem(STORAGE_KEY, trimmed);
		loading = true;
		error = null;
		tree = null;

		try {
			const res = await fetch('/api/scan', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ path: trimmed })
			});

			if (!res.ok) {
				const msg = await res.text();
				error = msg || 'Failed to scan directory';
				return;
			}

			const data = await res.json();
			tree = data.tree;

			if (!tree) {
				error = 'No .env files found in that directory';
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			loading = false;
		}
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') scan();
	};

	onMount(() => {
		initTreeState();
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			rootPath = stored;
			scan();
		}
	});
</script>

<Sidebar>
	<SidebarHeader class="px-3 pb-2 pt-3">
		<div class="flex items-center gap-2 pb-1">
			<FolderSearch class="size-4 text-primary" />
			<span class="text-sm font-semibold">Envelector</span>
		</div>
		<p class="mb-2 text-xs text-muted-foreground">Enter a directory path to discover .env files</p>
		<Input
			bind:value={rootPath}
			onkeydown={handleKeydown}
			placeholder="/path/to/your/project"
			class="h-8 text-xs font-mono"
		/>
		<Button onclick={scan} disabled={loading || !rootPath.trim()} size="sm" class="mt-1.5 w-full">
			{#if loading}
				<Loader2 class="mr-1.5 size-3.5 animate-spin" />
				Scanning…
			{:else}
				Scan
			{/if}
		</Button>
	</SidebarHeader>

	<SidebarSeparator />

	<SidebarContent>
		<SidebarGroup>
			<SidebarGroupLabel class="text-xs">Files</SidebarGroupLabel>
			<SidebarGroupContent>
				{#if loading}
					<div class="flex items-center gap-2 px-2 py-4 text-xs text-muted-foreground">
						<Loader2 class="size-3.5 animate-spin" />
						Scanning directory…
					</div>
				{:else if error}
					<p class="px-2 py-4 text-xs text-destructive">{error}</p>
				{:else if tree}
					<ScrollArea class="h-[calc(100vh-200px)]">
						<div class="py-1">
							<FileTree node={tree} {selectedPath} {onSelect} />
						</div>
					</ScrollArea>
				{:else}
					<p class="px-2 py-4 text-xs text-muted-foreground">
						Enter a path above and click Scan.
					</p>
				{/if}
			</SidebarGroupContent>
		</SidebarGroup>
	</SidebarContent>

	<SidebarFooter class="px-3 py-2">
		<p class="text-[10px] text-muted-foreground">
			Path stored in localStorage
		</p>
	</SidebarFooter>
</Sidebar>
