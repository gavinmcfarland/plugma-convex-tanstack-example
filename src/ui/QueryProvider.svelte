<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { persistQueryClient } from '@tanstack/query-persist-client-core';
	import { createFigmaStoragePersistor } from './utils/figmaStoragePersistor';
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';

	interface Props {
		/**
		 * Optional setup function for backend initialization (e.g., Convex, Supabase)
		 * Called during component initialization, so it can use Svelte context APIs
		 */
		setup?: () => void;
		/**
		 * Your app component to render once the cache is restored
		 */
		app: Component;
	}

	let { setup, app: AppComponent }: Props = $props();

	// Run backend setup if provided (must be during component init for Svelte context)
	setup?.();

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
			console.log(`[QueryProvider] Restored ${queries.length} queries from cache`);
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
		<AppComponent />
	</QueryClientProvider>
{/if}
