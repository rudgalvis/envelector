<script lang="ts">
	import { onMount } from 'svelte';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { SidebarProvider, SidebarTrigger } from '$lib/components/ui/sidebar/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import AppSidebar from '$lib/components/AppSidebar.svelte';
	import { selectedFile, selectFile } from '$lib/stores/selected-file.svelte';
	import { expandParentsOf } from '$lib/stores/tree-state.svelte';
	import { searchStore } from '$lib/stores/search.svelte';
	import { Toaster } from 'svelte-sonner';

	let { children } = $props();
	let searchInput = $state<HTMLInputElement | null>(null);

	$effect(() => {
		selectedFile.path;
		searchStore.clear();
	});

	onMount(() => {
		const fileParam = new URLSearchParams(window.location.search).get('file');
		if (fileParam) {
			expandParentsOf(fileParam);
			selectFile(fileParam, false);
		}

		const handleKeydown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === 'f' && selectedFile.path) {
				e.preventDefault();
				searchInput?.focus();
				searchInput?.select();
			}
		};

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
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
				<Input
					type="search"
					placeholder="Search in {selectedFile.path}..."
					bind:value={searchStore.query}
					bind:ref={searchInput}
					class="h-7 flex-1 border-none bg-transparent font-mono text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:truncate placeholder:text-xs"
				/>
			{:else}
				<span class="text-sm text-muted-foreground">Select a file from the sidebar</span>
			{/if}
		</header>

		<main class="flex-1 overflow-auto p-6">
			{@render children()}
		</main>
	</div>
</SidebarProvider>

<Toaster theme="light" position="bottom-right" />
