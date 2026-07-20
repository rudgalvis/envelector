<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription
	} from '$lib/components/ui/dialog/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import {
		ArrowUp,
		ChevronRight,
		Folder,
		Home,
		Loader2,
		Search,
		Eye,
		EyeOff
	} from '@lucide/svelte';

	type DirEntry = { name: string; path: string };
	type BrowseResponse = {
		path: string;
		parent: string | null;
		home: string;
		directories: DirEntry[];
	};

	type Props = {
		open: boolean;
		initialPath?: string | null;
		onSelect: (path: string) => void;
	};

	let { open = $bindable(), initialPath = null, onSelect }: Props = $props();

	let currentPath = $state<string | null>(null);
	let parentPath = $state<string | null>(null);
	let homePath = $state<string | null>(null);
	let directories = $state<DirEntry[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let filter = $state('');
	let showHidden = $state(false);
	let highlighted = $state(0);
	let listEl = $state<HTMLDivElement | null>(null);

	const filteredDirectories = $derived(
		filter.trim()
			? directories.filter((d) => d.name.toLowerCase().includes(filter.trim().toLowerCase()))
			: directories
	);

	const browse = async (target: string | null) => {
		loading = true;
		error = null;
		try {
			const params = new URLSearchParams();
			if (target) params.set('path', target);
			if (showHidden) params.set('hidden', '1');
			const res = await fetch(`/api/browse?${params.toString()}`);
			if (!res.ok) {
				error = (await res.text()) || 'Failed to browse directory';
				return;
			}
			const data: BrowseResponse = await res.json();
			currentPath = data.path;
			parentPath = data.parent;
			homePath = data.home;
			directories = data.directories;
			filter = '';
			highlighted = 0;
			listEl?.scrollTo({ top: 0 });
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			loading = false;
		}
	};

	const enterFolder = (entry: DirEntry) => {
		browse(entry.path);
	};

	const goUp = () => {
		if (parentPath) browse(parentPath);
	};

	const goHome = () => {
		browse(null);
	};

	const confirm = () => {
		if (currentPath) {
			onSelect(currentPath);
			open = false;
		}
	};

	const toggleHidden = () => {
		showHidden = !showHidden;
		if (currentPath) browse(currentPath);
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (loading) return;
		const list = filteredDirectories;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			highlighted = Math.min(highlighted + 1, Math.max(list.length - 1, 0));
			scrollHighlightedIntoView();
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			highlighted = Math.max(highlighted - 1, 0);
			scrollHighlightedIntoView();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (e.metaKey || e.ctrlKey) {
				confirm();
				return;
			}
			const target = list[highlighted];
			if (target) enterFolder(target);
		} else if (e.key === 'Backspace' && filter === '') {
			e.preventDefault();
			goUp();
		}
	};

	const scrollHighlightedIntoView = () => {
		if (!listEl) return;
		const el = listEl.querySelector<HTMLElement>(`[data-idx="${highlighted}"]`);
		el?.scrollIntoView({ block: 'nearest' });
	};

	const breadcrumbs = $derived.by(() => {
		if (!currentPath) return [] as Array<{ name: string; path: string }>;
		const parts = currentPath.split('/').filter(Boolean);
		const segments: Array<{ name: string; path: string }> = [{ name: '/', path: '/' }];
		let acc = '';
		for (const part of parts) {
			acc += '/' + part;
			segments.push({ name: part, path: acc });
		}
		return segments;
	});

	$effect(() => {
		if (open) {
			browse(initialPath ?? null);
		}
	});

	$effect(() => {
		if (filter !== undefined) highlighted = 0;
	});
</script>

<Dialog bind:open>
	<DialogContent
		class="block gap-0 overflow-hidden p-0 sm:max-w-2xl"
		showCloseButton={false}
	>
		<DialogHeader class="gap-1 border-b px-4 pb-3 pt-4">
			<DialogTitle class="text-sm">Select a folder</DialogTitle>
			<DialogDescription class="text-xs">
				Browse your file system and pick a directory to scan for <code
					class="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">.env</code
				> files.
			</DialogDescription>
		</DialogHeader>

		<div class="flex items-center gap-2 border-b px-3 py-2">
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={goHome}
				title="Home directory"
				disabled={loading}
			>
				<Home class="size-4" />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={goUp}
				disabled={!parentPath || loading}
				title="Up one level"
			>
				<ArrowUp class="size-4" />
			</Button>

			<div
				class="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs"
			>
				{#each breadcrumbs as crumb, i (crumb.path)}
					{#if i > 0 && crumb.name !== '/'}
						<ChevronRight class="size-3 shrink-0 text-muted-foreground/60" />
					{/if}
					<button
						type="button"
						class="shrink-0 rounded px-1 py-0.5 hover:bg-accent hover:text-accent-foreground"
						onclick={() => browse(crumb.path)}
						disabled={loading}
					>
						{crumb.name === '/' ? '/' : crumb.name}
					</button>
				{/each}
			</div>

			<Button
				variant="ghost"
				size="icon-sm"
				onclick={toggleHidden}
				title={showHidden ? 'Hide hidden folders' : 'Show hidden folders'}
				disabled={loading}
			>
				{#if showHidden}
					<EyeOff class="size-4" />
				{:else}
					<Eye class="size-4" />
				{/if}
			</Button>
		</div>

		<div class="flex items-center gap-2 border-b px-3 py-2">
			<Search class="size-4 shrink-0 text-muted-foreground" />
			<Input
				bind:value={filter}
				onkeydown={handleKeydown}
				placeholder="Filter folders…"
				class="h-7 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
				autofocus
			/>
		</div>

		<div class="h-[320px]">
			{#if loading}
				<div class="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground">
					<Loader2 class="size-4 animate-spin" />
					Loading…
				</div>
			{:else if error}
				<div class="flex h-full items-center justify-center px-6 text-center">
					<p class="text-xs text-destructive">{error}</p>
				</div>
			{:else if filteredDirectories.length === 0}
				<div class="flex h-full items-center justify-center text-xs text-muted-foreground">
					{filter ? 'No folders match your filter.' : 'No subfolders here.'}
				</div>
			{:else}
				<ScrollArea class="h-full">
					<div bind:this={listEl} class="flex flex-col py-1">
						{#each filteredDirectories as entry, i (entry.path)}
							<button
								type="button"
								data-idx={i}
								class="flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground {highlighted ===
								i
									? 'bg-accent text-accent-foreground'
									: ''}"
								onclick={() => enterFolder(entry)}
								onmouseenter={() => (highlighted = i)}
							>
								<Folder class="size-4 shrink-0 text-primary/70" />
								<span class="truncate font-mono">{entry.name}</span>
							</button>
						{/each}
					</div>
				</ScrollArea>
			{/if}
		</div>

		<div
			class="flex items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3"
		>
			<p
				class="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground"
				title={currentPath ?? ''}
			>
				{currentPath ?? ''}
			</p>
			<div class="flex shrink-0 items-center gap-2">
				<Button variant="ghost" size="sm" onclick={() => (open = false)}>Cancel</Button>
				<Button size="sm" onclick={confirm} disabled={!currentPath || loading}>
					Select this folder
				</Button>
			</div>
		</div>
	</DialogContent>
</Dialog>
