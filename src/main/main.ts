// Read the docs https://plugma.dev/docs
import { setupClientStorage } from './setupClientStorage';

export default function () {
	figma.showUI(__html__, { width: 300, height: 400, themeColors: true });

	// Set up clientStorage handlers for caching
	setupClientStorage();
}
