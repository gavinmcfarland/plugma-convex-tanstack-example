/**
 * Sets up handlers for clientStorage operations between the plugin and UI
 * 
 * This function configures message handlers to manage get/set operations
 * for Figma's clientStorage API, enabling persistent caching across plugin sessions.
 * 
 * @example
 * ```ts
 * import { setupClientStorage } from './setupClientStorage';
 * 
 * export default function () {
 *   figma.showUI(__html__, { width: 300, height: 400 });
 *   setupClientStorage();
 * }
 * ```
 * 
 * @example
 * ```ts
 * // If you have existing message handlers, chain them:
 * export default function () {
 *   figma.showUI(__html__, { width: 300, height: 400 });
 *   
 *   const storageHandler = setupClientStorage();
 *   
 *   figma.ui.onmessage = async (msg) => {
 *     // Handle storage messages
 *     const handled = await storageHandler(msg);
 *     if (handled) return;
 *     
 *     // Handle other messages
 *     if (msg.type === 'my-custom-message') {
 *       // ...
 *     }
 *   };
 * }
 * ```
 */
export function setupClientStorage(): (msg: any) => Promise<boolean> {
	const handler = async (msg: any): Promise<boolean> => {
		if (msg.type === 'get-storage') {
			try {
				const value = await figma.clientStorage.getAsync(msg.key);
				figma.ui.postMessage({
					type: 'storage-data',
					key: msg.key,
					value: value,
				});
			} catch (error) {
				console.error('Error getting storage:', error);
				figma.ui.postMessage({
					type: 'storage-data',
					key: msg.key,
					value: null,
				});
			}
			return true;
		} else if (msg.type === 'set-storage') {
			try {
				await figma.clientStorage.setAsync(msg.key, msg.value);
			} catch (error) {
				console.error('Error setting storage:', error);
			}
			return true;
		}
		return false;
	};

	// Set up the message handler
	figma.ui.onmessage = handler;

	// Return the handler for custom chaining
	return handler;
}

