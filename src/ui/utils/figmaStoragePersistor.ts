import type { PersistedClient, Persister } from '@tanstack/query-persist-client-core';

const CACHE_KEY = 'tanstack_query_cache';

/**
 * Creates a TanStack Query persistor that uses Figma's clientStorage API
 * 
 * This allows the query cache to persist across plugin sessions, providing
 * instant data on subsequent opens.
 */
export function createFigmaStoragePersistor(): Persister {
	return {
		async persistClient(client: PersistedClient) {
			try {
				// Send cache to plugin main thread for storage
				parent.postMessage(
					{
						pluginMessage: {
							type: 'set-storage',
							key: CACHE_KEY,
							value: client,
						},
					},
					'*'
				);
			} catch (error) {
				console.error('[figmaStoragePersistor] Error persisting cache:', error);
			}
		},

		async restoreClient(): Promise<PersistedClient | undefined> {
			try {
				// Request cache from plugin main thread
				return new Promise((resolve) => {
					const handleMessage = (event: MessageEvent) => {
						const msg = event.data.pluginMessage;
						if (msg?.type === 'storage-data' && msg.key === CACHE_KEY) {
							window.removeEventListener('message', handleMessage);
							resolve(msg.value || undefined);
						}
					};

					window.addEventListener('message', handleMessage);
					
					parent.postMessage(
						{ pluginMessage: { type: 'get-storage', key: CACHE_KEY } },
						'*'
					);

					// Timeout after 500ms if no response
					setTimeout(() => {
						window.removeEventListener('message', handleMessage);
						resolve(undefined);
					}, 500);
				});
			} catch (error) {
				console.error('[figmaStoragePersistor] Error restoring cache:', error);
				return undefined;
			}
		},

		async removeClient() {
			try {
				// Clear cache from storage
				parent.postMessage(
					{
						pluginMessage: {
							type: 'set-storage',
							key: CACHE_KEY,
							value: null,
						},
					},
					'*'
				);
			} catch (error) {
				console.error('[figmaStoragePersistor] Error removing cache:', error);
			}
		},
	};
}

