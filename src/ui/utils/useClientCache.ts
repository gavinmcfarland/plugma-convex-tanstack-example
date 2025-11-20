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
 *   import { useClientCache } from './utils/useClientCache';
 *
 *   const todosQuery = useQuery(api.todos.get, {});
 *   const { displayData, shouldRender, shouldShowLoading } = useClientCache(
 *     'todos_cache',
 *     todosQuery.data,
 *     todosQuery.isLoading
 *   );
 * </script>
 *
 * {#if shouldRender}
 *   {#if shouldShowLoading}
 *     <LoadingSpinner />
 *   {:else}
 *     <!-- Use displayData here -->
 *   {/if}
 * {/if}
 * ```
 */
export function useClientCache<T>(cacheKey: string, liveData: T | null | undefined, isLoading: boolean) {
	// Guard: Only run in UI context (not plugin context)
	if (typeof figma !== 'undefined') {
		throw new Error('useClientCache should only be used in the UI context, not in the plugin main code');
	}

	let cachedData: T | null = $state(null);
	let cacheChecked = $state(false);

	// Listen for storage responses from the plugin
	onMount(() => {
		const handleMessage = (event: MessageEvent) => {
			const msg = event.data.pluginMessage;
			if (msg?.type === 'storage-data' && msg.key === cacheKey) {
				cachedData = msg.value;
				cacheChecked = true;
			}
		};

		window.addEventListener('message', handleMessage);

		// Request cached data from plugin
		parent.postMessage({ pluginMessage: { type: 'get-storage', key: cacheKey } }, '*');

		return () => {
			window.removeEventListener('message', handleMessage);
		};
	});

	// Save to cache when live data changes
	$effect(() => {
		if (liveData !== null && liveData !== undefined) {
			cachedData = liveData;
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

	// Determine which data to display
	const displayData = $derived(liveData ?? cachedData);

	// Show loading only after cache is checked and we still have no data
	const shouldShowLoading = $derived(cacheChecked && !displayData && isLoading);

	// Don't render anything until cache is checked
	const shouldRender = $derived(cacheChecked);

	return {
		displayData,
		shouldRender,
		shouldShowLoading,
	};
}
