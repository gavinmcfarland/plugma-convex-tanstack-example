import { onMount } from 'svelte';

/**
 * Hook for caching data in Figma's clientStorage
 *
 * @param cacheKey - The key to store data under in clientStorage
 * @param liveData - The fresh data from your data source (can be null/undefined while loading)
 * @param isLoading - Whether the live data is currently loading
 *
 * @returns An object with:
 *   - displayData: The data to display (live data if available, otherwise cached)
 *   - shouldRender: Whether the component should render (false until cache is checked)
 *   - shouldShowLoading: Whether to show a loading state
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useClientCache } from './utils/useClientCache.svelte';
 *
 *   const todosQuery = useQuery(api.todos.get, {});
 *   // Don't destructure - access properties directly to preserve reactivity
 *   const cache = useClientCache('todos_cache', todosQuery.data, todosQuery.isLoading);
 * </script>
 *
 * {#if cache.shouldRender}
 *   {#if cache.shouldShowLoading}
 *     <LoadingSpinner />
 *   {:else}
 *     <!-- Use cache.displayData here -->
 *     {#each cache.displayData as item}
 *       <div>{item.name}</div>
 *     {/each}
 *   {/if}
 * {/if}
 * ```
 */
export function useClientCache<T>(cacheKey: string, liveData: T | null | undefined, isLoading: boolean) {
	const state = $state({
		cachedData: null as T | null,
		cacheChecked: false,
	});

	// Listen for storage responses from the plugin
	onMount(() => {
		const handleMessage = (event: MessageEvent) => {
			const msg = event.data.pluginMessage;
			if (msg?.type === 'storage-data' && msg.key === cacheKey) {
				state.cachedData = msg.value;
				state.cacheChecked = true;
			}
		};

		window.addEventListener('message', handleMessage);

		// Request cached data from plugin
		parent.postMessage({ pluginMessage: { type: 'get-storage', key: cacheKey } }, '*');

		// Fallback: if we don't get a response within 200ms, render anyway
		const timeout = setTimeout(() => {
			if (!state.cacheChecked) {
				state.cacheChecked = true;
			}
		}, 200);

		return () => {
			window.removeEventListener('message', handleMessage);
			clearTimeout(timeout);
		};
	});

	// Save to cache when live data changes
	$effect(() => {
		if (liveData !== null && liveData !== undefined) {
			state.cachedData = liveData;
			parent.postMessage(
				{
					pluginMessage: {
						type: 'set-storage',
						key: cacheKey,
						value: liveData,
					},
				},
				'*',
			);
		}
	});

	// Create derived values
	const displayData = $derived(liveData ?? state.cachedData);
	const shouldRender = $derived(state.cacheChecked);
	const shouldShowLoading = $derived(state.cacheChecked && !displayData && isLoading);

	// Return reactive values
	return {
		get displayData() {
			return displayData;
		},
		get shouldRender() {
			return shouldRender;
		},
		get shouldShowLoading() {
			return shouldShowLoading;
		},
	};
}
