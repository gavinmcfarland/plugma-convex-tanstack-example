import { onMount } from 'svelte';

/**
 * Hook for caching data in Figma's clientStorage
 *
 * @param cacheKey - The key to store data under in clientStorage
 * @param getLiveData - Getter function that returns the fresh data from your data source
 * @param getIsLoading - Getter function that returns whether the live data is currently loading
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
 *   // Pass getter functions to preserve reactivity
 *   const cache = useClientCache(
 *     'todos_cache',
 *     () => todosQuery.data,
 *     () => todosQuery.isLoading
 *   );
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
export function useClientCache<T>(
	cacheKey: string,
	getLiveData: () => T | null | undefined,
	getIsLoading: () => boolean
) {
	const state = $state({
		cachedData: null as T | null,
		cacheChecked: false,
	});

	// Listen for storage responses from the plugin
	onMount(() => {
		const handleMessage = (event: MessageEvent) => {
			const msg = event.data.pluginMessage;
			if (msg?.type === 'storage-data' && msg.key === cacheKey) {
				// Handle both null and undefined as no cache
				state.cachedData = msg.value ?? null;
				state.cacheChecked = true;
				console.log(`[useClientCache] Received cache for "${cacheKey}":`, msg.value);
			}
		};

		window.addEventListener('message', handleMessage);

		// Request cached data from plugin
		parent.postMessage({ pluginMessage: { type: 'get-storage', key: cacheKey } }, '*');
		console.log(`[useClientCache] Requested cache for "${cacheKey}"`);

		// Fallback: if we don't get a response within 500ms, render anyway
		const timeout = setTimeout(() => {
			if (!state.cacheChecked) {
				console.log(`[useClientCache] Timeout reached for "${cacheKey}", rendering without cache`);
				state.cacheChecked = true;
			}
		}, 500);

		return () => {
			window.removeEventListener('message', handleMessage);
			clearTimeout(timeout);
		};
	});

	// Save to cache when live data changes
	$effect(() => {
		const liveData = getLiveData();
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
	const displayData = $derived(getLiveData() ?? state.cachedData);
	const shouldRender = $derived(state.cacheChecked);
	const shouldShowLoading = $derived(state.cacheChecked && !displayData && getIsLoading());

	// Debug logging for derived values
	$effect(() => {
		console.log(`[useClientCache "${cacheKey}"] Derived state:`, {
			liveData: getLiveData(),
			cachedData: state.cachedData,
			displayData,
			cacheChecked: state.cacheChecked,
			isLoading: getIsLoading(),
			shouldRender,
			shouldShowLoading,
		});
	});

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
