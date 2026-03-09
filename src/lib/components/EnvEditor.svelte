<script lang="ts">
	import { refreshEnvData } from '$lib/stores/selected-file.svelte';
	import type { EnvData, EnvSource } from '$lib/types';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { Loader2 } from '@lucide/svelte';

	type Props = {
		data: EnvData;
	};

	let { data }: Props = $props();

	let applying = $state<string | null>(null);

	const getActiveSource = (key: string): EnvSource | null => {
		const targetVal = data.target[key];
		if (targetVal === undefined) return null;
		return data.sources.find((s) => s.values[key] === targetVal) ?? null;
	};

	const apply = async (key: string, source: EnvSource) => {
		const value = source.values[key];
		if (value === undefined) return;

		applying = key;
		try {
			await fetch('/api/env/apply', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ targetPath: data.targetPath, key, value })
			});
			await refreshEnvData();
		} catch {
			// silent — UI will stay as-is
		} finally {
			applying = null;
		}
	};

	const shortName = (name: string): string => name.replace(/^\.env\.?/, '') || 'base';

	const currentValue = (key: string): string | undefined => data.target[key];
</script>

<Tooltip.Provider delayDuration={200}>
	<div class="flex h-full flex-col">
		<!-- Header row -->
		<div
		class="sticky top-0 z-10 grid border-b bg-background py-1.5 pr-3 text-xs font-semibold text-muted-foreground"
		style="grid-template-columns: 1fr {data.sources.map(() => '100px').join(' ')}"
		>
			<div class="pl-4">KEY</div>
			{#each data.sources as source (source.path)}
				<div class="truncate px-2 text-center" title={source.name}>{source.name}</div>
			{/each}
		</div>

		<!-- Rows -->
		<ScrollArea class="flex-1">
			<div class="divide-y">
				{#each data.allKeys as key (key)}
					{@const activeSource = getActiveSource(key)}
					{@const isApplying = applying === key}

					<div
					class="grid items-center py-1.5 pr-3 hover:bg-muted/30"
					style="grid-template-columns: 1fr {data.sources.map(() => '100px').join(' ')}"
					>
					<!-- Key name + current .env value -->
					<div class="flex items-center gap-2 pl-4">
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<code class="truncate text-xs font-medium">{key}</code>
								{#if isApplying}
									<Loader2 class="size-3 shrink-0 animate-spin text-muted-foreground" />
								{/if}
							</div>
							{#if currentValue(key) !== undefined}
								<Tooltip.Root>
									<Tooltip.Trigger>
										{#snippet child({ props })}
											<span
												{...props}
												class="mt-0.5 block cursor-default truncate font-mono text-[10px] text-muted-foreground"
											>
												{currentValue(key) || '(empty)'}
											</span>
										{/snippet}
									</Tooltip.Trigger>
									<Tooltip.Content class="max-w-xs">
										<p class="text-[10px] text-muted-foreground/70">current .env value</p>
										<p class="font-mono text-xs break-all">{currentValue(key) || '(empty)'}</p>
									</Tooltip.Content>
								</Tooltip.Root>
							{:else}
								<span class="mt-0.5 block font-mono text-[10px] italic text-muted-foreground/50"
									>not set</span
								>
							{/if}
						</div>
					</div>

						<!-- Source buttons -->
						{#each data.sources as source (source.path)}
							{@const value = source.values[key]}
							{@const hasValue = value !== undefined}
							{@const isActive = activeSource?.path === source.path}

						<div class="px-1">
							{#if hasValue}
								<Tooltip.Root>
									<Tooltip.Trigger>
										{#snippet child({ props })}
											<button
												{...props}
												onclick={() => apply(key, source)}
												disabled={isApplying}
												class="w-full rounded border px-2 py-1 text-xs font-medium transition-colors
													{isActive
													? 'border-primary bg-primary text-primary-foreground'
													: 'border-border bg-background hover:bg-accent hover:text-accent-foreground'}
													{isApplying ? 'cursor-not-allowed opacity-60' : ''}"
											>
												{shortName(source.name)}
											</button>
										{/snippet}
									</Tooltip.Trigger>
									<Tooltip.Content class="max-w-xs">
										<p class="font-mono text-xs break-all">{value || '(empty)'}</p>
									</Tooltip.Content>
								</Tooltip.Root>
							{:else}
								<Tooltip.Root>
									<Tooltip.Trigger>
										{#snippet child({ props })}
											<div
												{...props}
												class="w-full rounded border border-dashed border-border px-2 py-1 text-xs font-medium opacity-35"
											>
												{shortName(source.name)}
											</div>
										{/snippet}
									</Tooltip.Trigger>
									<Tooltip.Content>
										<p class="text-xs">Key not present in {source.name}</p>
									</Tooltip.Content>
								</Tooltip.Root>
								{/if}
							</div>
						{/each}
					</div>
				{/each}
			</div>
		</ScrollArea>
	</div>
</Tooltip.Provider>
