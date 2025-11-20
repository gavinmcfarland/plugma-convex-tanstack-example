import { mount } from 'svelte';
import './styles.css';
import QueryProvider from './QueryProvider.svelte';
import App from './App.svelte';
import { setupConvex } from './convexSetup'; // Or import setupSupabase, setupFirebase, etc.

const app = mount(QueryProvider, {
	target: document.getElementById('app')!,
	props: {
		setup: setupConvex, // Pass setup function as prop
		component: App, // Pass your app component
	},
});

export default app;
