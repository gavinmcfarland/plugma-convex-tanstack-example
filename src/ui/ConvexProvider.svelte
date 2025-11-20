<script lang="ts">
	import { setupConvex } from 'convex-svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { persistQueryClient } from '@tanstack/query-persist-client-core';
	import { createFigmaStoragePersistor } from './utils/figmaStoragePersistor';
	import { CONVEX_URL } from './convex';
	import App from './App.svelte';

	// Set up Convex client during component initialization
	if (CONVEX_URL) {
		setupConvex(CONVEX_URL);
	} else {
		console.warn('CONVEX_URL not set. Please run "npx convex dev" to set up Convex.');
	}

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

	// Set up cache persistence with Figma's clientStorage
	persistQueryClient({
		queryClient,
		persister: createFigmaStoragePersistor(),
		maxAge: 1000 * 60 * 60 * 24, // Persist for 24 hours
	});
</script>

<QueryClientProvider client={queryClient}>
	<App />
</QueryClientProvider>
