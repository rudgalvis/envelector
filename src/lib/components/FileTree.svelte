<script lang="ts">
	import FileTree from './FileTree.svelte';
	import type { FileNode } from '$lib/types';
	import { treeState, setExpanded } from '$lib/stores/tree-state.svelte';
	import {
		ChevronRight,
		ChevronDown,
		FileText,
		Folder,
		FolderOpen,
		AlertCircle,
		Code2,
		FlaskConical,
		Rocket,
		FileQuestion
	} from '@lucide/svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	type Props = {
		node: FileNode;
		selectedPath: string | null;
		onSelect: (path: string) => void;
		depth?: number;
	};

	let { node, selectedPath, onSelect, depth = 0 }: Props = $props();

	const open = $derived(
		node.path in treeState.expanded ? !!treeState.expanded[node.path] : depth === 0
	);

	const toggle = () => setExpanded(node.path, !open);

	const isSelected = $derived(selectedPath === node.path);

	const isSelectedFolder = $derived(
		node.type === 'directory' &&
			selectedPath !== null &&
			selectedPath.slice(0, selectedPath.lastIndexOf('/')) === node.path
	);

</script>

{#if node.type === 'directory'}
	<div>
		<button
			onclick={toggle}
			class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground {isSelectedFolder
				? 'bg-sidebar-accent/50 text-sidebar-accent-foreground'
				: ''}"
			style="padding-left: {depth * 16 + 8}px"
		>
			{#if open}
				<ChevronDown class="size-3.5 shrink-0 text-muted-foreground" />
				<FolderOpen class="size-3.5 shrink-0 text-muted-foreground" />
			{:else}
				<ChevronRight class="size-3.5 shrink-0 text-muted-foreground" />
				<Folder class="size-3.5 shrink-0 text-muted-foreground" />
			{/if}
			<span class="truncate font-medium">{node.name}</span>
		</button>

		{#if open && node.children}
			<div>
				{#each node.children as child (child.path)}
					<FileTree node={child} {selectedPath} {onSelect} depth={depth + 1} />
				{/each}
			</div>
		{/if}
	</div>
{:else if node.missing}
	<Tooltip.Provider delayDuration={300}>
		<Tooltip.Root>
			<Tooltip.Trigger>
				{#snippet child({ props })}
					<div
						{...props}
						class="flex w-full cursor-default items-center gap-1.5 rounded px-2 py-1 text-sm text-destructive opacity-50"
						style="padding-left: {depth * 16 + 12}px"
					>
						<AlertCircle class="size-3.5 shrink-0" />
						<span class="truncate">{node.name}</span>
					</div>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content class="max-w-56">
				<p class="font-medium">Missing environment file</p>
				<p class="mt-1 text-xs text-muted-foreground">
					Envelector expects <code class="font-mono">.env.dev</code>,
					<code class="font-mono">.env.staging</code>, and
					<code class="font-mono">.env.production</code> in every project. This file doesn't exist
					yet.
				</p>
				<p class="mt-1.5 text-xs text-muted-foreground/70">You can disable this in Settings.</p>
			</Tooltip.Content>
		</Tooltip.Root>
	</Tooltip.Provider>
{:else}
	<button
		onclick={() => onSelect(node.path)}
		class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground {isSelected
			? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
			: 'text-muted-foreground'}"
		style="padding-left: {depth * 16 + 12}px"
	>
		{#if node.name === '.env.dev'}
			<Code2 class="size-3.5 shrink-0" />
		{:else if node.name === '.env.staging'}
			<FlaskConical class="size-3.5 shrink-0" />
		{:else if node.name === '.env.production'}
			<Rocket class="size-3.5 shrink-0" />
		{:else if node.name === '.env.example'}
			<FileQuestion class="size-3.5 shrink-0" />
		{:else}
			<FileText class="size-3.5 shrink-0" />
		{/if}
		<span class="truncate">{node.name}</span>
	</button>
{/if}
