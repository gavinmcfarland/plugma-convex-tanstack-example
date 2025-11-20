/**
 * Convex Backend Setup
 *
 * Export a setup function that initializes the Convex client.
 * To use a different backend, swap this import in ui.ts:
 *
 * - Convex: import { setupConvex } from './convexSetup'
 * - Supabase: import { setupSupabase } from './supabaseSetup'
 * - Firebase: import { setupFirebase } from './firebaseSetup'
 * - REST API: No setup needed, pass undefined to QueryProvider
 */

import { setupConvex as setupConvexClient } from 'convex-svelte';
import { CONVEX_URL } from './convex';

/**
 * Initialize Convex client
 * Called during QueryProvider component initialization
 */
export function setupConvex() {
	if (CONVEX_URL) {
		setupConvexClient(CONVEX_URL);
		console.log('[Convex] Initialized');
	} else {
		console.warn('CONVEX_URL not set. Please run "npx convex dev" to set up Convex.');
	}
}
