<script lang="ts">
	import { setupConvex } from 'convex-svelte';
	import { CONVEX_URL } from './convex';
	import App from './App.svelte';

	// Set up Convex client during component initialization
	if (CONVEX_URL) {
		setupConvex(CONVEX_URL);
	} else {
		console.warn('CONVEX_URL not set. Please run "npx convex dev" to set up Convex.');
	}
</script>

<App />

