# TanStack Query Setup with Convex

This project uses [TanStack Query (Svelte Query)](https://tanstack.com/query/latest/docs/framework/svelte/overview) for data fetching, caching, and state management with Convex as the backend.

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

1. **Initial Load**: Data is fetched from Convex and stored in TanStack Query's cache
2. **Auto-Save**: Cache is automatically persisted to Figma's `clientStorage` 
3. **Plugin Reopens**: Cache is restored from `clientStorage` instantly
4. **Background Refresh**: Fresh data is fetched from Convex while showing cached data
5. **Cache Update**: New data replaces cache and is persisted again

This provides instant loading on subsequent plugin opens while still keeping data fresh!

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
  import App from './App.svelte';

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
```

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
        '*'
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
        parent.postMessage(
          { pluginMessage: { type: 'get-storage', key: CACHE_KEY } },
          '*'
        );

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
        '*'
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

After mutations, invalidate queries to trigger a refetch:

```svelte
<script lang="ts">
  import { useConvexClient } from 'convex-svelte';
  import { useQueryClient } from '@tanstack/svelte-query';
  import { api } from '../convex/_generated/api';

  const convex = useConvexClient();
  const queryClient = useQueryClient();

  async function addTodo(text: string) {
    await convex.mutation(api.todos.add, { text });
    
    // Invalidate and refetch the todos query
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  }

  async function deleteTodo(id: string) {
    await convex.mutation(api.todos.remove, { id });
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  }
</script>
```

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
queryKey: ['todos']

// With parameters
queryKey: ['todos', { userId: '123' }]

// Hierarchical
queryKey: ['projects', projectId, 'tasks']
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
    queryClient.setQueryData(['todos'], (old: any[]) => 
      old.filter(todo => todo._id !== id)
    );
    
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
  staleTime: 1000 * 60 * 5,      // Consider data fresh for 5 minutes
  gcTime: 1000 * 60 * 30,        // Keep unused data for 30 minutes
  refetchOnMount: true,          // Refetch on component mount
  refetchOnWindowFocus: false,   // Don't refetch on window focus
  refetchOnReconnect: true,      // Refetch on network reconnect
  refetchInterval: false,        // Or set to ms for polling
  retry: 3,                      // Retry failed requests 3 times
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
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

| Feature | Custom Helper | TanStack Query |
|---------|--------------|----------------|
| Automatic refetching | ❌ Manual | ✅ Automatic |
| Request deduplication | ❌ No | ✅ Yes |
| Cache invalidation | ❌ Manual | ✅ Built-in |
| Optimistic updates | ❌ Complex | ✅ Simple API |
| Background sync | ❌ No | ✅ Yes |
| DevTools | ❌ No | ✅ Yes |
| Error retry | ❌ Manual | ✅ Built-in |
| Stale-while-revalidate | ✅ Basic | ✅ Advanced |

## Resources

- [TanStack Query Svelte Docs](https://tanstack.com/query/latest/docs/framework/svelte/overview)
- [TanStack Query Core Concepts](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Convex with TanStack Query](https://docs.convex.dev/client/react)

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

