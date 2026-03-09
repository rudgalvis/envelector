<script lang="ts">
	import { selectedFile } from '$lib/stores/selected-file.svelte';
	import EnvEditor from '$lib/components/EnvEditor.svelte';
	import { Loader2, FileText, FolderSearch } from '@lucide/svelte';
</script>

{#if selectedFile.loading}
	<div class="flex h-full items-center justify-center gap-3 text-muted-foreground">
		<Loader2 class="size-5 animate-spin" />
		<span class="text-sm">Loading…</span>
	</div>
{:else if selectedFile.error}
	<div class="flex h-full items-center justify-center">
		<div class="max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
			<p class="mb-1 text-sm font-medium text-destructive">Failed to load file</p>
			<p class="text-xs text-muted-foreground">{selectedFile.error}</p>
		</div>
	</div>
{:else if selectedFile.envData}
	<EnvEditor data={selectedFile.envData} />
{:else if selectedFile.contents !== null}
	<div class="h-full">
		<div class="mb-4 flex items-center gap-2">
			<FileText class="size-4 text-muted-foreground" />
			<h1 class="font-mono text-sm font-medium">
				{selectedFile.path?.split('/').pop()}
			</h1>
		</div>
		<div class="overflow-auto rounded-lg border bg-muted/30">
			<pre class="p-4 text-xs leading-relaxed"><code>{selectedFile.contents}</code></pre>
		</div>
	</div>
{:else}
	<div class="flex h-full items-center justify-center">
		<div class="text-center">
			<FolderSearch class="mx-auto mb-4 size-12 text-muted-foreground/40" />
			<h2 class="mb-1 text-base font-medium">No file selected</h2>
			<p class="text-sm text-muted-foreground">
				Select <code class="font-mono text-xs">.env</code> in the sidebar to open the value selector,
				or any other env file to view its raw contents.
			</p>
		</div>
	</div>
{/if}
