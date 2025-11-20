<script lang="ts">
	import Input from './components/Input.svelte';
	import Button from './components/Button.svelte';
	import LoadingSpinner from './components/LoadingSpinner.svelte';
	import { useConvexClient } from 'convex-svelte';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { api } from '../convex/_generated/api';
	import type { Id } from '../convex/_generated/dataModel';
	import { CONVEX_URL } from './convex';

	let todoText: string = $state('');

	// Get Convex client for queries and mutations
	const convex = useConvexClient();
	const queryClient = useQueryClient();

	// Use TanStack Query for caching and state management
	// Wrap in function for Svelte reactivity (per TanStack Query docs)
	const todosQuery = createQuery(() => ({
		queryKey: ['todos'],
		queryFn: async () => {
			return await convex.query(api.todos.get, {});
		},
		enabled: !!CONVEX_URL, // Only run query if Convex is configured
	}));

	async function addTodo() {
		if (todoText.trim()) {
			await convex.mutation(api.todos.add, { text: todoText.trim() });
			todoText = '';
			// Invalidate and refetch todos after mutation
			queryClient.invalidateQueries({ queryKey: ['todos'] });
		}
	}

	async function toggleTodo(id: Id<'todos'>) {
		await convex.mutation(api.todos.toggle, { id });
		// Invalidate and refetch todos after mutation
		queryClient.invalidateQueries({ queryKey: ['todos'] });
	}

	async function deleteTodo(id: Id<'todos'>) {
		await convex.mutation(api.todos.remove, { id });
		// Invalidate and refetch todos after mutation
		queryClient.invalidateQueries({ queryKey: ['todos'] });
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			addTodo();
		}
	}
</script>

{#if !CONVEX_URL}
	<div class="container">
		<h1 class="title">Todo App</h1>
		<div class="todos-list">
			<p class="empty-state" style="color: var(--figma-color-text-danger, red);">
				⚠️ Convex not configured. Please run <code
					style="background: var(--figma-color-bg-secondary); padding: 2px 4px; border-radius: 2px;"
					>npx convex dev</code
				> and rebuild.
			</p>
		</div>
	</div>
{:else if todosQuery.isPending}
	<div class="loading-container">
		<LoadingSpinner />
	</div>
{:else}
	<div class="container">
		<h1 class="title">Todo App</h1>

		<div class="todos-list">
			{#if todosQuery.isError}
				<p class="empty-state">Error loading todos: {todosQuery.error.message}</p>
			{:else if !todosQuery.data || todosQuery.data.length === 0}
				<p class="empty-state">No todos yet. Add one below!</p>
			{:else}
				{#each todosQuery.data as todo (todo._id)}
					<div class="todo-item">
						<label class="todo-checkbox-label">
							<input
								type="checkbox"
								class="todo-checkbox"
								checked={todo.completed}
								onchange={() => toggleTodo(todo._id)}
							/>
							<span class="todo-text" class:completed={todo.completed}>{todo.text}</span>
						</label>
						<button
							class="delete-button"
							onclick={() => deleteTodo(todo._id)}
							type="button"
							aria-label="Delete todo"
						>
							×
						</button>
					</div>
				{/each}
			{/if}
		</div>

		<div class="input-section">
			<Input type="text" bind:value={todoText} onkeydown={handleKeyDown} placeholder="Enter a todo..." />
			<Button onclick={addTodo}>Submit</Button>
		</div>
	</div>
{/if}

<style>
	.loading-container {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		width: 100%;
	}

	.container {
		display: flex;
		flex-direction: column;
		padding: var(--spacer-3);
		height: 100%;
		width: 100%;
		gap: var(--spacer-3);
	}

	.title {
		font-size: 16px;
		font-weight: 600;
		margin: 0;
		padding-bottom: var(--spacer-2);
		border-bottom: 1px solid var(--figma-color-border);
	}

	.input-section {
		display: flex;
		gap: var(--spacer-2);
		align-items: center;
		flex-shrink: 0;
	}

	.input-section :global(.Input) {
		flex: 1;
	}

	.todos-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacer-2);
		flex: 1;
		overflow-y: auto;
	}

	.todo-item {
		padding: var(--spacer-2);
		min-height: 32px;
		display: flex;
		align-items: center;
		gap: var(--spacer-2);
	}

	.todo-checkbox-label {
		display: flex;
		align-items: center;
		gap: var(--spacer-2);
		cursor: pointer;
		flex: 1;
	}

	.todo-checkbox {
		cursor: pointer;
		margin: 0;
	}

	.todo-text {
		font-size: 11px;
		color: var(--figma-color-text);
		flex: 1;
	}

	.todo-text.completed {
		text-decoration: line-through;
		opacity: 0.6;
	}

	.delete-button {
		background: transparent;
		border: none;
		color: var(--figma-color-text-secondary);
		cursor: pointer;
		font-size: 20px;
		line-height: 1;
		padding: 0;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-small);
		flex-shrink: 0;
		opacity: 0.6;
		transition: opacity 0.2s;
	}

	.delete-button:hover {
		opacity: 1;
		color: var(--figma-color-text-danger, var(--figma-color-text));
		background-color: var(--figma-color-bg-hover, var(--figma-color-bg-secondary));
	}

	.delete-button:active {
		opacity: 0.8;
	}

	.empty-state {
		text-align: center;
		color: var(--figma-color-text-secondary);
		font-size: 11px;
		padding: var(--spacer-4);
		margin: 0;
	}
</style>
