<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { SidebarProvider, SidebarTrigger } from '$lib/components/ui/sidebar/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import AppSidebar from '$lib/components/AppSidebar.svelte';
	import { selectedFile, selectFile } from '$lib/stores/selected-file.svelte';
	import { expandParentsOf } from '$lib/stores/tree-state.svelte';

	let { children } = $props();

	onMount(() => {
		const fileParam = new URLSearchParams(window.location.search).get('file');
		if (fileParam) {
			expandParentsOf(fileParam);
			selectFile(fileParam, false);
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<SidebarProvider>
	<AppSidebar selectedPath={selectedFile.path} onSelect={selectFile} />

	<div class="flex min-h-screen flex-1 flex-col">
		<header class="flex h-12 shrink-0 items-center gap-2 border-b px-4">
			<SidebarTrigger class="-ml-1" />
			<Separator orientation="vertical" class="mr-2 h-4" />
			{#if selectedFile.path}
				<span class="font-mono text-sm text-muted-foreground truncate">{selectedFile.path}</span>
			{:else}
				<span class="text-sm text-muted-foreground">Select a file from the sidebar</span>
			{/if}
		</header>

		<main class="flex-1 overflow-auto p-6">
			{@render children()}
		</main>
	</div>
</SidebarProvider>
