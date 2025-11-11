import { mount } from 'svelte';
import './styles.css';
import ConvexProvider from './ConvexProvider.svelte';

const app = mount(ConvexProvider, {
	target: document.getElementById('app')!,
});

export default app;
