<script lang="ts">
	import { setupConvex } from 'convex-svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { persistQueryClient } from '@tanstack/query-persist-client-core';
	import { createFigmaStoragePersistor } from './utils/figmaStoragePersistor';
	import { CONVEX_URL } from './convex';
	import App from './App.svelte';
	import { onMount } from 'svelte';

	// Set up Convex client during component initialization
	if (CONVEX_URL) {
		setupConvex(CONVEX_URL);
	} else {
		console.warn('CONVEX_URL not set. Please run "npx convex dev" to set up Convex.');
	}

	// Track cache restoration state
	let ready = $state(false);

	// Set up TanStack Query client with caching configuration
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
				gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours for persistence
				refetchOnWindowFocus: false, // Don't refetch when window regains focus (in Figma plugin context)
				refetchOnReconnect: true, // Refetch when network reconnects
				retry: 1, // Retry failed requests once
			},
		},
	});

	// Create persistor
	const persister = createFigmaStoragePersistor();

	// Initialize cache persistence
	onMount(async () => {
		// Restore cache from storage
		const restoredState = await persister.restoreClient();

		if (restoredState && restoredState.clientState) {
			// Hydrate all queries from restored state
			const queries = restoredState.clientState.queries || [];
			queries.forEach((query: any) => {
				if (query.queryKey && query.state) {
					queryClient.setQueryData(query.queryKey, query.state.data);
				}
			});
			console.log(`[ConvexProvider] Restored ${queries.length} queries from cache`);
		}

		// Set up automatic persistence for future updates
		persistQueryClient({
			queryClient,
			persister,
			maxAge: 1000 * 60 * 60 * 24,
		});

		// Mark as ready
		ready = true;
	});
</script>

{#if ready}
	<QueryClientProvider client={queryClient}>
		<App />
	</QueryClientProvider>
{/if}
