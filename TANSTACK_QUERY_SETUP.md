# TanStack Query Setup with Convex

This project uses [TanStack Query (Svelte Query)](https://tanstack.com/query/latest/docs/framework/svelte/overview) for data fetching, caching, and state management with Convex as the backend.

## Quick Summary

This setup provides **instant loading** for your Figma plugin:

- 🚀 **First open**: Data loads from Convex with loading spinner
- ⚡ **Subsequent opens**: Data appears instantly from cache (no spinner!)
- 🔄 **Background refresh**: Fresh data loads silently while showing cached data
- 💾 **Auto-persistence**: Cache saves to Figma's `clientStorage` automatically
- ✨ **Zero configuration**: Set it up once, works automatically everywhere

**Result**: After the first load, your plugin feels instant! Users see data immediately while fresh data loads in the background.

## Why TanStack Query?

TanStack Query provides:

- ✅ **Automatic caching** - Data is cached and reused across components
- ✅ **Background refetching** - Keeps data fresh automatically
- ✅ **Request deduplication** - Multiple components requesting the same data only trigger one fetch
- ✅ **Stale-while-revalidate** - Shows cached data instantly while fetching fresh data
- ✅ **Built-in loading/error states** - No need for manual state management
- ✅ **Query invalidation** - Easy cache updates after mutations
- ✅ **Persistent caching** - Cache survives plugin restarts via Figma's clientStorage

## How Cache Persistence Works

### First Load (No Cache)

1. Plugin opens → Cache restoration returns empty
2. App renders → TanStack Query shows "pending" state
3. Loading spinner appears
4. Data fetches from Convex
5. Data displays and is saved to `clientStorage`

### Subsequent Loads (With Cache)

1. Plugin opens → Cache restoration starts (~10-50ms)
2. **App waits** to render until restoration completes
3. Cached queries are hydrated into TanStack Query
4. App renders with data already loaded → **No loading spinner!**
5. Background refresh fetches fresh data from Convex
6. Display updates silently when fresh data arrives
7. Updated cache is persisted automatically

### Key Benefits

- ✅ **Zero flash**: Loading spinner never appears on cached loads
- ✅ **Instant display**: Data appears immediately after imperceptible cache restoration
- ✅ **Always fresh**: Background refetch ensures data is up-to-date
- ✅ **Automatic sync**: Cache updates after every data change

## Setup

### 1. Install Dependencies

```bash
pnpm add @tanstack/svelte-query @tanstack/query-persist-client-core
```

### 2. Configure QueryClientProvider with Persistence

In your root component (`ConvexProvider.svelte`):

```svelte
<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { persistQueryClient } from '@tanstack/query-persist-client-core';
  import { createFigmaStoragePersistor } from './utils/figmaStoragePersistor';
  import { onMount } from 'svelte';
  import App from './App.svelte';

  let ready = $state(false);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,          // Data is fresh for 5 minutes
        gcTime: 1000 * 60 * 60 * 24,       // Keep in cache for 24 hours
        refetchOnWindowFocus: false,        // Don't refetch on focus (plugin context)
        refetchOnReconnect: true,           // Refetch when network reconnects
        retry: 1,                           // Retry failed requests once
      },
    },
  });

  const persister = createFigmaStoragePersistor();

  // Initialize cache persistence
  onMount(async () => {
    // 1. Restore cache from storage first
    const restoredState = await persister.restoreClient();

    if (restoredState && restoredState.clientState) {
      // 2. Hydrate all queries into the QueryClient
      const queries = restoredState.clientState.queries || [];
      queries.forEach((query: any) => {
        if (query.queryKey && query.state) {
          queryClient.setQueryData(query.queryKey, query.state.data);
        }
      });
      console.log(`[Cache] Restored ${queries.length} queries`);
    }

    // 3. Set up automatic persistence for future updates
    persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24,
    });

    // 4. Mark as ready to render
    ready = true;
  });
</script>

{#if ready}
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
{/if}
```

**Key Points:**

- ⚠️ We wait to render the app until cache restoration completes
- This prevents the loading spinner from flashing briefly
- Cache restoration is fast (~10-50ms) and imperceptible
- Once restored, data appears instantly without loading states

### 3. Create Figma Storage Persistor

Create `src/ui/utils/figmaStoragePersistor.ts`:

```typescript
import type { PersistedClient, Persister } from '@tanstack/query-persist-client-core';

const CACHE_KEY = 'tanstack_query_cache';

export function createFigmaStoragePersistor(): Persister {
	return {
		async persistClient(client: PersistedClient) {
			parent.postMessage(
				{
					pluginMessage: {
						type: 'set-storage',
						key: CACHE_KEY,
						value: client,
					},
				},
				'*',
			);
		},

		async restoreClient(): Promise<PersistedClient | undefined> {
			return new Promise((resolve) => {
				const handleMessage = (event: MessageEvent) => {
					const msg = event.data.pluginMessage;
					if (msg?.type === 'storage-data' && msg.key === CACHE_KEY) {
						window.removeEventListener('message', handleMessage);
						resolve(msg.value || undefined);
					}
				};

				window.addEventListener('message', handleMessage);
				parent.postMessage({ pluginMessage: { type: 'get-storage', key: CACHE_KEY } }, '*');

				// Timeout after 500ms
				setTimeout(() => {
					window.removeEventListener('message', handleMessage);
					resolve(undefined);
				}, 500);
			});
		},

		async removeClient() {
			parent.postMessage(
				{
					pluginMessage: {
						type: 'set-storage',
						key: CACHE_KEY,
						value: null,
					},
				},
				'*',
			);
		},
	};
}
```

### 4. Set up Plugin Storage Handler

Ensure your plugin main file handles storage messages (this should already be set up if you followed the earlier setup):

```typescript
// src/main/main.ts
import { setupClientStorage } from './setupClientStorage';

export default function () {
	figma.showUI(__html__, { width: 300, height: 400 });
	setupClientStorage(); // Handles get-storage and set-storage messages
}
```

## Usage

### Queries (Read Data)

Use `createQuery` to fetch data from Convex. According to the [TanStack Query Svelte docs](https://tanstack.com/query/latest/docs/framework/svelte/overview), you must **wrap the query options in a function** to preserve reactivity:

```svelte
<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { useConvexClient } from 'convex-svelte';
  import { api } from '../convex/_generated/api';

  const convex = useConvexClient();

  // ⚠️ Important: Wrap in function for Svelte reactivity!
  const todosQuery = createQuery(() => ({
    queryKey: ['todos'],
    queryFn: async () => {
      return await convex.query(api.todos.get, {});
    },
    enabled: true, // Optional: control when query runs
  }));
</script>

<!-- Access query state directly (no $ prefix needed) -->
{#if todosQuery.isPending}
  <p>Loading...</p>
{:else if todosQuery.isError}
  <p>Error: {todosQuery.error.message}</p>
{:else}
  {#each todosQuery.data as todo}
    <div>{todo.text}</div>
  {/each}
{/if}
```

### Mutations (Write Data)

After mutations, invalidate queries to trigger a refetch and update the cache:

```svelte
<script lang="ts">
  import { useConvexClient } from 'convex-svelte';
  import { useQueryClient } from '@tanstack/svelte-query';
  import { api } from '../convex/_generated/api';

  const convex = useConvexClient();
  const queryClient = useQueryClient();

  async function addTodo(text: string) {
    await convex.mutation(api.todos.add, { text });

    // Invalidate and refetch - cache will auto-persist after update
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  }

  async function deleteTodo(id: string) {
    await convex.mutation(api.todos.remove, { id });
    // This triggers refetch and automatic cache update
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  }
</script>
```

**Important**: Always invalidate queries after mutations to ensure:

- ✅ UI updates with fresh data
- ✅ Cache is updated automatically
- ✅ Next plugin open shows latest data

### Using `createMutation`

For better mutation handling with loading/error states:

```svelte
<script lang="ts">
  import { createMutation, useQueryClient } from '@tanstack/svelte-query';
  import { useConvexClient } from 'convex-svelte';
  import { api } from '../convex/_generated/api';

  const convex = useConvexClient();
  const queryClient = useQueryClient();

  const addTodoMutation = createMutation(() => ({
    mutationFn: async (text: string) => {
      return await convex.mutation(api.todos.add, { text });
    },
    onSuccess: () => {
      // Invalidate queries after successful mutation
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  }));

  function handleAdd(text: string) {
    addTodoMutation.mutate(text);
  }
</script>

<button
  onclick={() => handleAdd('New todo')}
  disabled={addTodoMutation.isPending}
>
  {addTodoMutation.isPending ? 'Adding...' : 'Add Todo'}
</button>

{#if addTodoMutation.isError}
  <p>Error: {addTodoMutation.error.message}</p>
{/if}
```

## Query Keys

Query keys are used to identify and cache queries. Use descriptive arrays:

```typescript
// Simple key
queryKey: ['todos'];

// With parameters
queryKey: ['todos', { userId: '123' }];

// Hierarchical
queryKey: ['projects', projectId, 'tasks'];
```

## Common Patterns

### Dependent Queries

Only run a query when certain data is available:

```svelte
const userQuery = createQuery(() => ({
  queryKey: ['user', userId],
  queryFn: () => convex.query(api.users.get, { id: userId }),
}));

const projectsQuery = createQuery(() => ({
  queryKey: ['projects', userId],
  queryFn: () => convex.query(api.projects.list, { userId }),
  enabled: !!userQuery.data, // Only run when user data is loaded
}));
```

### Optimistic Updates

Update UI immediately, rollback on error:

```typescript
const deleteTodoMutation = createMutation(() => ({
	mutationFn: async (id: string) => {
		return await convex.mutation(api.todos.remove, { id });
	},
	onMutate: async (id) => {
		// Cancel outgoing refetches
		await queryClient.cancelQueries({ queryKey: ['todos'] });

		// Snapshot previous value
		const previousTodos = queryClient.getQueryData(['todos']);

		// Optimistically update
		queryClient.setQueryData(['todos'], (old: any[]) => old.filter((todo) => todo._id !== id));

		return { previousTodos };
	},
	onError: (err, id, context) => {
		// Rollback on error
		queryClient.setQueryData(['todos'], context.previousTodos);
	},
	onSettled: () => {
		// Always refetch after error or success
		queryClient.invalidateQueries({ queryKey: ['todos'] });
	},
}));
```

### Prefetching

Load data before it's needed:

```typescript
async function prefetchProject(projectId: string) {
  await queryClient.prefetchQuery({
    queryKey: ['project', projectId],
    queryFn: () => convex.query(api.projects.get, { id: projectId }),
  });
}

// Prefetch on hover
<button onmouseenter={() => prefetchProject('123')}>
  View Project
</button>
```

## Query State Properties

Access these properties directly on the query object:

- `query.data` - The query data
- `query.error` - Any error that occurred
- `query.isPending` - Initial loading state
- `query.isLoading` - Loading (no cached data)
- `query.isError` - Query failed
- `query.isSuccess` - Query succeeded
- `query.isFetching` - Background refetch in progress
- `query.status` - Current status: 'pending' | 'error' | 'success'

## Cache Configuration

Adjust cache behavior per query or globally:

```typescript
const todosQuery = createQuery(() => ({
	queryKey: ['todos'],
	queryFn: () => convex.query(api.todos.get, {}),

	// Cache configuration
	staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
	gcTime: 1000 * 60 * 30, // Keep unused data for 30 minutes
	refetchOnMount: true, // Refetch on component mount
	refetchOnWindowFocus: false, // Don't refetch on window focus
	refetchOnReconnect: true, // Refetch on network reconnect
	refetchInterval: false, // Or set to ms for polling
	retry: 3, // Retry failed requests 3 times
	retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
}));
```

## DevTools (Optional)

Add TanStack Query DevTools for debugging:

```bash
pnpm add @tanstack/svelte-query-devtools
```

```svelte
<script>
  import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
</script>

<QueryClientProvider client={queryClient}>
  <App />
  <SvelteQueryDevtools />
</QueryClientProvider>
```

## Benefits Over Custom Cache Helper

| Feature                | Custom Helper | TanStack Query |
| ---------------------- | ------------- | -------------- |
| Automatic refetching   | ❌ Manual     | ✅ Automatic   |
| Request deduplication  | ❌ No         | ✅ Yes         |
| Cache invalidation     | ❌ Manual     | ✅ Built-in    |
| Optimistic updates     | ❌ Complex    | ✅ Simple API  |
| Background sync        | ❌ No         | ✅ Yes         |
| DevTools               | ❌ No         | ✅ Yes         |
| Error retry            | ❌ Manual     | ✅ Built-in    |
| Stale-while-revalidate | ✅ Basic      | ✅ Advanced    |

## Troubleshooting

### Loading Spinner Still Flashes

If the loading spinner briefly appears even with cached data:

**Problem**: The app is rendering before cache restoration completes.

**Solution**: Ensure you're using the `ready` state to wait for cache restoration:

```svelte
let ready = $state(false);

onMount(async () => {
  const restoredState = await persister.restoreClient();
  // ... hydrate cache ...
  ready = true; // Only set true after restoration
});

{#if ready}
  <QueryClientProvider>
    <App />
  </QueryClientProvider>
{/if}
```

### Error: "...then is not a function"

**Problem**: Trying to call `.then()` on `persistQueryClient()` which doesn't return a Promise.

**Solution**: Use `await persister.restoreClient()` instead, then call `persistQueryClient()` separately:

```typescript
// ❌ Wrong
const persistor = persistQueryClient({...});
persistor.then(() => ready = true); // Error!

// ✅ Correct
const restoredState = await persister.restoreClient();
// hydrate cache...
persistQueryClient({...}); // Set up auto-persistence
ready = true;
```

### Data Not Persisting

**Problem**: Cache isn't being saved to `clientStorage`.

**Checklist**:

1. ✅ Is `setupClientStorage()` called in your plugin main file?
2. ✅ Is `persistQueryClient()` called after restoration?
3. ✅ Check browser console for storage errors
4. ✅ Verify `gcTime` is long enough (24 hours recommended)

### Cache Invalidation Not Working

**Problem**: Mutations don't update the display.

**Solution**: Call `queryClient.invalidateQueries()` after mutations:

```typescript
async function addTodo(text: string) {
	await convex.mutation(api.todos.add, { text });
	// This triggers a refetch:
	queryClient.invalidateQueries({ queryKey: ['todos'] });
}
```

## Quick Reference

### Common Patterns Cheat Sheet

```typescript
// Query with Convex
const query = createQuery(() => ({
  queryKey: ['todos'],
  queryFn: () => convex.query(api.todos.get, {}),
}));

// Check states
query.isPending   // Initial load
query.isError     // Error occurred
query.isSuccess   // Data loaded
query.isFetching  // Background refresh

// Use data
{#if query.isPending}
  <Loading />
{:else if query.data}
  {#each query.data as item}
    ...
  {/each}
{/if}

// After mutation
await convex.mutation(api.todos.add, { text });
queryClient.invalidateQueries({ queryKey: ['todos'] }); // Refetch!

// Multiple queries
const query1 = createQuery(() => ({ queryKey: ['todos'], ... }));
const query2 = createQuery(() => ({ queryKey: ['users'], ... }));

// Dependent query
const userQuery = createQuery(() => ({ queryKey: ['user'], ... }));
const postsQuery = createQuery(() => ({
  queryKey: ['posts'],
  queryFn: () => convex.query(api.posts.list, {}),
  enabled: !!userQuery.data, // Only run when user loads
}));
```

### Cache Behavior

| Scenario      | What Happens                                                |
| ------------- | ----------------------------------------------------------- |
| First open    | Loading spinner → Fetch data → Save to cache                |
| Second open   | Restore cache instantly → Show data → Refetch in background |
| Mutation      | Update server → Invalidate query → Refetch → Update cache   |
| Network error | Show cached data + error message                            |
| Offline       | Show cached data (up to 24 hours old)                       |

## Resources

- [TanStack Query Svelte Docs](https://tanstack.com/query/latest/docs/framework/svelte/overview)
- [TanStack Query Core Concepts](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Convex with TanStack Query](https://docs.convex.dev/client/react)
- [Query Persistence Guide](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient)

---

**Questions or issues?** Check the Troubleshooting section above or open an issue in the project repository.

## Migration Notes

If migrating from the custom `useClientCache` helper:

### Before (Custom Helper):

```svelte
const cache = useClientCache(
  'todos_cache',
  () => todosQuery.data,
  () => todosQuery.isLoading
);

{#if cache.shouldRender}
  {#if cache.shouldShowLoading}
    <LoadingSpinner />
  {:else}
    {#each cache.displayData as todo}
      ...
    {/each}
  {/if}
{/if}
```

### After (TanStack Query):

```svelte
const todosQuery = createQuery(() => ({
  queryKey: ['todos'],
  queryFn: () => convex.query(api.todos.get, {}),
}));

{#if todosQuery.isPending}
  <LoadingSpinner />
{:else}
  {#each todosQuery.data as todo}
    ...
  {/each}
{/if}
```

Much cleaner and more powerful! 🎉

**Note:** TanStack Query's `createQuery` returns an object with reactive properties. Access them directly without the `$` prefix.

## Complete Working Example

Here's the full implementation from this project:

### 1. Main Plugin File (`src/main/main.ts`)

```typescript
import { setupClientStorage } from './setupClientStorage';

export default function () {
	figma.showUI(__html__, { width: 300, height: 400, themeColors: true });

	// Handle storage for cache persistence
	setupClientStorage();
}
```

### 2. Storage Persistor (`src/ui/utils/figmaStoragePersistor.ts`)

```typescript
import type { PersistedClient, Persister } from '@tanstack/query-persist-client-core';

const CACHE_KEY = 'tanstack_query_cache';

export function createFigmaStoragePersistor(): Persister {
	return {
		async persistClient(client: PersistedClient) {
			parent.postMessage({ pluginMessage: { type: 'set-storage', key: CACHE_KEY, value: client } }, '*');
		},

		async restoreClient(): Promise<PersistedClient | undefined> {
			return new Promise((resolve) => {
				const handleMessage = (event: MessageEvent) => {
					const msg = event.data.pluginMessage;
					if (msg?.type === 'storage-data' && msg.key === CACHE_KEY) {
						window.removeEventListener('message', handleMessage);
						resolve(msg.value || undefined);
					}
				};

				window.addEventListener('message', handleMessage);
				parent.postMessage({ pluginMessage: { type: 'get-storage', key: CACHE_KEY } }, '*');

				setTimeout(() => {
					window.removeEventListener('message', handleMessage);
					resolve(undefined);
				}, 500);
			});
		},

		async removeClient() {
			parent.postMessage({ pluginMessage: { type: 'set-storage', key: CACHE_KEY, value: null } }, '*');
		},
	};
}
```

### 3. Root Component (`src/ui/ConvexProvider.svelte`)

```svelte
<script lang="ts">
  import { setupConvex } from 'convex-svelte';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { persistQueryClient } from '@tanstack/query-persist-client-core';
  import { createFigmaStoragePersistor } from './utils/figmaStoragePersistor';
  import { CONVEX_URL } from './convex';
  import App from './App.svelte';
  import { onMount } from 'svelte';

  if (CONVEX_URL) {
    setupConvex(CONVEX_URL);
  }

  let ready = $state(false);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 60 * 24,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
      },
    },
  });

  const persister = createFigmaStoragePersistor();

  onMount(async () => {
    const restoredState = await persister.restoreClient();

    if (restoredState && restoredState.clientState) {
      const queries = restoredState.clientState.queries || [];
      queries.forEach((query: any) => {
        if (query.queryKey && query.state) {
          queryClient.setQueryData(query.queryKey, query.state.data);
        }
      });
      console.log(`Restored ${queries.length} queries from cache`);
    }

    persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24,
    });

    ready = true;
  });
</script>

{#if ready}
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
{/if}
```

### 4. Using Queries (`src/ui/App.svelte`)

```svelte
<script lang="ts">
  import { useConvexClient } from 'convex-svelte';
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { api } from '../convex/_generated/api';

  const convex = useConvexClient();
  const queryClient = useQueryClient();

  // Create query (note: wrapped in function for reactivity)
  const todosQuery = createQuery(() => ({
    queryKey: ['todos'],
    queryFn: async () => {
      return await convex.query(api.todos.get, {});
    },
  }));

  async function addTodo(text: string) {
    await convex.mutation(api.todos.add, { text });
    // Invalidate to refetch and update cache
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  }
</script>

{#if todosQuery.isPending}
  <LoadingSpinner />
{:else if todosQuery.isError}
  <p>Error: {todosQuery.error.message}</p>
{:else}
  {#each todosQuery.data as todo}
    <div>{todo.text}</div>
  {/each}
{/if}
```

This implementation provides:

- ✅ Instant loading on subsequent opens
- ✅ No loading spinner flash
- ✅ Automatic cache persistence
- ✅ Background data refresh
- ✅ Automatic cache updates after mutations
