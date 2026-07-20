<script lang="ts">
	import { refreshEnvData } from '$lib/stores/selected-file.svelte';
	import { searchStore } from '$lib/stores/search.svelte';
	import type { EnvData, EnvSource, KeyGroup } from '$lib/types';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import {
		Loader2,
		Copy,
		Check,
		ChevronsRight,
		ChevronsLeft,
		ChevronRight,
		ChevronDown,
		HelpCircle
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	type Props = {
		data: EnvData;
	};

	let { data }: Props = $props();

	let applyingKeys = $state(new Set<string>());
	let copiedKeys = $state(new Set<string>());
	let extrasExpanded = $state(false);

	const CANONICAL = new Set(['.env.dev', '.env.staging', '.env.production']);
	const canonicalSources = $derived(data.sources.filter((s) => CANONICAL.has(s.name)));
	const extraSources = $derived(data.sources.filter((s) => !CANONICAL.has(s.name)));
	const visibleSources = $derived(extrasExpanded ? data.sources : canonicalSources);
	const filteredKeys = $derived.by(() => {
		const keys = searchStore.query.trim()
			? data.allKeys.filter((k) => k.toLowerCase().includes(searchStore.query.toLowerCase().trim()))
			: [...data.allKeys];
		return keys.sort((a, b) => a.localeCompare(b));
	});
	const hasExtras = $derived(extraSources.length > 0);
	const gridCols = $derived(
		`1fr ${visibleSources.map(() => '100px').join(' ')}${hasExtras ? ' 36px' : ''}`
	);

	// Groups come from .env.example parsed on the server; collapsed state is local only.
	// Default: all collapsed. expandedGroupIds tracks which have been manually opened.
	let expandedGroupIds = $state(new Set<string>());

	const groups = $derived(
		data.groups.map((g) => ({ ...g, collapsed: !expandedGroupIds.has(g.id) }))
	);

	const keyToGroupId = $derived.by(() => {
		const map = new Map<string, string>();
		for (const group of groups) {
			for (const key of group.keys) {
				map.set(key, group.id);
			}
		}
		return map;
	});

	type DisplayItem =
		| { type: 'group-header'; group: KeyGroup & { collapsed: boolean }; visibleKeys: string[] }
		| { type: 'key'; key: string; groupId: string | null };

	const displayItems = $derived.by((): DisplayItem[] => {
		const items: DisplayItem[] = [];
		const seenGroups = new Set<string>();
		const filteredSet = new Set(filteredKeys);

		for (const key of filteredKeys) {
			const groupId = keyToGroupId.get(key);
			if (!groupId) {
				items.push({ type: 'key', key, groupId: null });
			} else {
				// Skip keys that were already bulk-emitted when their group header was first seen
				if (seenGroups.has(groupId)) continue;

				const group = groups.find((g) => g.id === groupId);
				if (!group) {
					items.push({ type: 'key', key, groupId: null });
					continue;
				}

				seenGroups.add(groupId);
				// Sorted alphabetically within the group
				const visibleKeys = group.keys
					.filter((k) => filteredSet.has(k))
					.sort((a, b) => a.localeCompare(b));
				items.push({ type: 'group-header', group, visibleKeys });

				// Emit all group keys immediately so the block stays contiguous
				if (!group.collapsed) {
					for (const gk of visibleKeys) {
						items.push({ type: 'key', key: gk, groupId });
					}
				}
			}
		}
		return items;
	});

	const isActiveSource = (key: string, source: EnvSource): boolean => {
		const targetVal = data.target[key];
		return targetVal !== undefined && source.values[key] === targetVal;
	};

	const isGroupSourceActive = (group: KeyGroup, source: EnvSource): boolean => {
		const keysWithValue = group.keys.filter((k) => source.values[k] !== undefined);
		return keysWithValue.length > 0 && keysWithValue.every((k) => isActiveSource(k, source));
	};

	const apply = async (key: string, source: EnvSource) => {
		const value = source.values[key];
		if (value === undefined) return;
		applyingKeys = new Set([...applyingKeys, key]);
		try {
			await fetch('/api/env/apply', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ targetPath: data.targetPath, key, value })
			});
			await refreshEnvData();
		} catch {
			// silent
		} finally {
			applyingKeys.delete(key);
			applyingKeys = new Set(applyingKeys);
		}
	};

	const applyToGroup = async (group: KeyGroup, source: EnvSource) => {
		const keysWithValue = group.keys.filter((k) => source.values[k] !== undefined);
		if (keysWithValue.length === 0) return;
		applyingKeys = new Set([...applyingKeys, ...keysWithValue]);
		try {
			for (const key of keysWithValue) {
				await fetch('/api/env/apply', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ targetPath: data.targetPath, key, value: source.values[key] })
				});
			}
			await refreshEnvData();
		} catch {
			// silent
		} finally {
			for (const k of keysWithValue) applyingKeys.delete(k);
			applyingKeys = new Set(applyingKeys);
		}
	};

	const shortName = (name: string): string => name.replace(/^\.env\.?/, '') || 'base';

	type SourceStyle = { active: string; inactive: string; label: string; border: string };
	const SOURCE_STYLES: Record<string, SourceStyle> = {
		'.env.dev': {
			active: 'border-cyan-800 bg-cyan-800 text-white dark:bg-cyan-700 dark:border-cyan-700',
			inactive:
				'border-border bg-background hover:border-cyan-700 hover:text-cyan-800 dark:hover:text-cyan-400 dark:hover:border-cyan-600',
			label: 'text-cyan-800 dark:text-cyan-500',
			border: 'border-l-sky-700 dark:border-l-sky-700'
		},
		'.env.staging': {
			active: 'border-stone-500 bg-stone-500 text-white dark:bg-stone-600 dark:border-stone-600',
			inactive:
				'border-border bg-background hover:border-stone-400 hover:text-stone-600 dark:hover:text-stone-400 dark:hover:border-stone-500',
			label: 'text-stone-500 dark:text-stone-400',
			border: 'border-l-yellow-700 dark:border-l-yellow-700'
		},
		'.env.production': {
			active: 'border-red-900 bg-red-900 text-white dark:bg-red-800 dark:border-red-800',
			inactive:
				'border-border bg-background hover:border-red-800 hover:text-red-900 dark:hover:text-red-400 dark:hover:border-red-700',
			label: 'text-red-900 dark:text-red-500',
			border: 'border-l-red-600 dark:border-l-red-600'
		}
	};
	const DEFAULT_STYLE: SourceStyle = {
		active: 'border-primary bg-primary text-primary-foreground',
		inactive: 'border-border bg-background hover:bg-accent hover:text-accent-foreground',
		label: 'text-muted-foreground',
		border: 'border-l-zinc-600 dark:border-l-zinc-600'
	};
	const sourceStyle = (source: EnvSource): SourceStyle =>
		SOURCE_STYLES[source.name] ?? DEFAULT_STYLE;

	const groupBorderClass = (group: KeyGroup): string => {
		const active = visibleSources.find((s) => isGroupSourceActive(group, s));
		return active ? sourceStyle(active).border : 'border-l-border/40';
	};

	const currentValue = (key: string): string | undefined => data.target[key];

	const truncate = (str: string, max = 48) => (str.length > max ? str.slice(0, max) + '…' : str);

	const copyValue = async (key: string, value: string) => {
		try {
			await navigator.clipboard.writeText(value);
			copiedKeys = new Set([...copiedKeys, key]);
			setTimeout(() => {
				copiedKeys.delete(key);
				copiedKeys = new Set(copiedKeys);
			}, 2000);
			toast('Copied to clipboard', {
				description: value ? truncate(value) : '(empty)',
				icon: '⎘'
			});
		} catch {
			toast.error('Failed to copy');
		}
	};

	const toggleGroupCollapse = (groupId: string) => {
		const next = new Set(expandedGroupIds);
		if (next.has(groupId)) next.delete(groupId);
		else next.add(groupId);
		expandedGroupIds = next;
	};
</script>

<Tooltip.Provider delayDuration={200}>
	<div class="flex h-full flex-col">
		<!-- Header row -->
		<div
			class="sticky top-0 z-10 grid border-b bg-background py-1.5 pr-3 text-xs font-semibold text-muted-foreground"
			style="grid-template-columns: {gridCols}"
		>
			<div class="flex items-center gap-1.5 pl-4">
				<span>KEY</span>
				<Dialog.Root>
					<Dialog.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								class="flex size-4 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:text-muted-foreground"
								aria-label="Grouping help"
							>
								<HelpCircle class="size-3.5" />
							</button>
						{/snippet}
					</Dialog.Trigger>
					<Dialog.Content class="max-w-lg">
						<Dialog.Header>
							<Dialog.Title>Key grouping</Dialog.Title>
							<Dialog.Description>
								Groups are defined in <code class="font-mono text-xs">.env.example</code> and loaded
								automatically — no manual setup needed in the editor.
							</Dialog.Description>
						</Dialog.Header>
						<div class="space-y-4 text-sm">
							<p class="text-muted-foreground">
								Add a <code class="rounded bg-muted px-1 py-0.5 font-mono text-xs"
									># GROUP: &lt;name&gt;</code
								> comment before any set of keys. All
								<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs">KEY=</code> lines that
								follow (until the next marker) are placed under that group.
							</p>
							<pre
								class="overflow-x-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground"
							>{`# ─────────────────────────────
# GROUP: DATABASE
# ─────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_PASSWORD=secret

# ─────────────────────────────
# GROUP: AUTH
# ─────────────────────────────
JWT_SECRET=your-secret
SESSION_TTL=86400`}</pre
							>
							<ul class="space-y-1.5 text-xs text-muted-foreground">
								<li>
									<span class="font-medium text-foreground">Names</span> — letters, numbers, hyphens,
									and spaces.
								</li>
								<li>
									<span class="font-medium text-foreground">Commented keys</span>
									(<code class="font-mono"># KEY=...</code>) are ignored; only active keys count.
								</li>
								<li>
									<span class="font-medium text-foreground">Ungrouped keys</span> — any key not under
									a GROUP marker appears at the top without a header.
								</li>
								<li>
									<span class="font-medium text-foreground">Read-only</span> — Envelector never
									writes to <code class="font-mono">.env.example</code>; edit it manually to change
									groups.
								</li>
							</ul>
						</div>
					</Dialog.Content>
				</Dialog.Root>
			</div>
		{#each visibleSources as source (source.path)}
			<div
				class="truncate px-2 text-center {sourceStyle(source).label}"
				title={source.name}
			>
				{source.name}
			</div>
		{/each}
			{#if hasExtras}
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								onclick={() => (extrasExpanded = !extrasExpanded)}
								class="flex items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
							>
								{#if extrasExpanded}
									<ChevronsRight class="size-3.5" />
								{:else}
									<ChevronsLeft class="size-3.5" />
								{/if}
							</button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p class="text-xs">
							{extrasExpanded
								? 'Collapse extra sources'
								: `Show ${extraSources.length} more: ${extraSources.map((s) => s.name).join(', ')}`}
						</p>
					</Tooltip.Content>
				</Tooltip.Root>
			{/if}
		</div>

		<!-- Rows -->
		<ScrollArea class="flex-1">
			<div class="divide-y">
				{#if displayItems.length === 0}
					<div class="flex items-center justify-center py-16 text-sm text-muted-foreground">
						{#if searchStore.query}
							No keys match <code
								class="mx-1.5 rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
								>{searchStore.query}</code
							>
						{:else}
							No keys
						{/if}
					</div>
				{/if}

				{#each displayItems as item (item.type === 'key' ? `key:${item.key}` : `group:${item.group.id}`)}
				{#if item.type === 'group-header'}
					{@const group = item.group}
					{@const isCollapsed = group.collapsed}
					{@const isApplyingGroup = group.keys.some((k) => applyingKeys.has(k))}

					<!-- Group header row -->
					<div
						class="grid cursor-pointer items-center border-l-4 bg-muted/15 py-1.5 pr-3 transition-colors hover:bg-muted/30 {groupBorderClass(group)}"
						style="grid-template-columns: {gridCols}"
						onclick={() => toggleGroupCollapse(group.id)}
						role="button"
						tabindex="0"
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleGroupCollapse(group.id); } }}
					>
						<div class="flex min-w-0 items-center gap-1 pl-2">
						<button
							onclick={(e) => { e.stopPropagation(); toggleGroupCollapse(group.id); }}
							class="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
								{#if isCollapsed}
									<ChevronRight class="size-3.5" />
								{:else}
									<ChevronDown class="size-3.5" />
								{/if}
							</button>
							<span class="min-w-0 flex-1 truncate text-xs font-semibold select-none">{group.name}</span>
							<span class="shrink-0 select-none text-[10px] text-muted-foreground/60">
								{item.visibleKeys.length}/{group.keys.length}
							</span>
						</div>

						<!-- Source buttons for the whole group -->
						{#each visibleSources as source (source.path)}
							{@const isActive = isGroupSourceActive(group, source)}
							{@const hasAnyValue = group.keys.some((k) => source.values[k] !== undefined)}
							{@const style = sourceStyle(source)}
							<div class="px-1" onclick={(e) => e.stopPropagation()} role="none">
								{#if hasAnyValue}
									<button
										onclick={() => applyToGroup(group, source)}
										disabled={isApplyingGroup}
										class="w-full rounded border px-2 py-1 text-xs font-medium transition-colors
											{isActive ? style.active : style.inactive}
											{isApplyingGroup ? 'cursor-not-allowed opacity-60' : ''}"
									>
										{#if isApplyingGroup}
											<Loader2 class="mx-auto size-3 animate-spin" />
										{:else}
											{shortName(source.name)}
										{/if}
									</button>
								{:else}
									<div
										class="w-full rounded border border-dashed border-border px-2 py-1 text-xs font-medium opacity-30"
									>
										{shortName(source.name)}
									</div>
								{/if}
							</div>
						{/each}

							{#if hasExtras}
								<div></div>
							{/if}
						</div>
				{:else}
					{@const key = item.key}
					{@const isApplying = applyingKeys.has(key)}
					{@const isGrouped = item.groupId !== null}

					<!-- Key row -->
					<div
						class="grid cursor-default items-center py-1.5 pr-3 transition-colors hover:bg-muted/30
							{isGrouped ? 'border-l-2 border-l-primary/20' : ''}"
						style="grid-template-columns: {gridCols}"
						role="row"
					>
							<!-- Key name + current .env value -->
							<div class="flex items-center gap-2 {isGrouped ? 'pl-8' : 'pl-4'}">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<code class="truncate text-xs font-medium">{key}</code>
										{#if isApplying}
											<Loader2 class="size-3 shrink-0 animate-spin text-muted-foreground" />
										{/if}
									</div>
									{#if currentValue(key) !== undefined}
										{@const isCopied = copiedKeys.has(key)}
										<Tooltip.Root>
											<Tooltip.Trigger>
												{#snippet child({ props })}
													<button
														{...props}
														onclick={(e) => {
															e.stopPropagation();
															copyValue(key, currentValue(key) ?? '');
														}}
														class="group mt-0.5 flex max-w-[220px] items-center gap-1 text-left"
													>
														<span
															class="truncate font-mono text-[10px] text-muted-foreground transition-colors group-hover:text-foreground"
														>
															{currentValue(key) || '(empty)'}
														</span>
														{#if isCopied}
															<Check
																class="size-2.5 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground"
															/>
														{:else}
															<Copy
																class="size-2.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-muted-foreground"
															/>
														{/if}
													</button>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content class="max-w-xs">
												<p class="text-[10px] text-muted-foreground/70">click to copy</p>
												<p class="break-all font-mono text-xs">{currentValue(key) || '(empty)'}</p>
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
						{#each visibleSources as source (source.path)}
							{@const value = source.values[key]}
							{@const hasValue = value !== undefined}
							{@const isActive = isActiveSource(key, source)}
							{@const style = sourceStyle(source)}

							<div class="px-1">
								{#if hasValue}
									<Tooltip.Root>
										<Tooltip.Trigger>
											{#snippet child({ props })}
												<button
													{...props}
													onclick={(e) => {
														e.stopPropagation();
														apply(key, source);
													}}
													disabled={isApplying}
													class="w-full rounded border px-2 py-1 text-xs font-medium transition-colors
														{isActive ? style.active : style.inactive}
														{isApplying ? 'cursor-not-allowed opacity-60' : ''}"
												>
													{shortName(source.name)}
												</button>
											{/snippet}
										</Tooltip.Trigger>
										<Tooltip.Content class="max-w-xs">
											<p class="break-all font-mono text-xs">{value || '(empty)'}</p>
										</Tooltip.Content>
									</Tooltip.Root>
								{:else}
									<Tooltip.Root>
										<Tooltip.Trigger>
											{#snippet child({ props })}
												<div
													{...props}
													class="w-full rounded border border-dashed border-border px-2 py-1 text-xs font-medium opacity-30"
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

							<!-- Spacer cell to keep grid aligned with the toggle column -->
							{#if hasExtras}
								<div></div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		</ScrollArea>
	</div>
</Tooltip.Provider>
