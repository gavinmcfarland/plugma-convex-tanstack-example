# Client Cache Helpers

Reusable utilities for caching data in Figma plugins using `clientStorage`. These helpers provide instant loading by showing cached data immediately while fresh data loads in the background.

## Features

- ✨ **Instant Loading**: Show cached data immediately on plugin open
- 🔄 **Auto-Refresh**: Fresh data loads silently in the background
- 🎯 **Smart Loading States**: Loading spinner only shows when truly needed
- 🔌 **Framework Agnostic Plugin Side**: Works with any UI framework
- 🎨 **Svelte 5 Optimized UI Hook**: Uses runes for reactive state

## Files

Copy these files to your project:

- **UI Side (Svelte)**: `src/ui/utils/useClientCache.svelte.ts`
- **Plugin Side**: `src/main/setupClientStorage.ts`

> **Note**: The UI helper uses the `.svelte.ts` extension so Svelte can properly compile the runes (`$state`, `$effect`, etc.)

## Installation

### 1. Plugin Side Setup

In your main plugin file (e.g., `main.ts`):

```typescript
import { setupClientStorage } from './setupClientStorage';

export default function () {
  figma.showUI(__html__, { width: 300, height: 400 });
  
  // Set up clientStorage handlers
  setupClientStorage();
}
```

**With existing message handlers:**

```typescript
import { setupClientStorage } from './setupClientStorage';

export default function () {
  figma.showUI(__html__, { width: 300, height: 400 });
  
  const storageHandler = setupClientStorage();
  
  figma.ui.onmessage = async (msg) => {
    // Handle storage messages first
    const handled = await storageHandler(msg);
    if (handled) return;
    
    // Handle your other messages
    if (msg.type === 'my-custom-message') {
      // ...
    }
  };
}
```

### 2. UI Side Setup (Svelte 5)

In your Svelte component:

```svelte
<script lang="ts">
  import { useClientCache } from './utils/useClientCache.svelte';
  import LoadingSpinner from './components/LoadingSpinner.svelte';
  
  // Your data fetching logic (this example uses Convex)
  const dataQuery = useQuery(api.myData.get, {});
  
  // Use the cache hook (pass getter functions to preserve reactivity)
  const cache = useClientCache(
    'my_data_cache',           // Cache key - unique identifier
    () => dataQuery.data,      // Getter for live data
    () => dataQuery.isLoading  // Getter for loading state
  );
</script>

{#if cache.shouldRender}
  {#if cache.shouldShowLoading}
    <LoadingSpinner />
  {:else if dataQuery.error}
    <p>Error: {dataQuery.error}</p>
  {:else if cache.displayData}
    <!-- Render your data -->
    {#each cache.displayData as item}
      <div>{item.name}</div>
    {/each}
  {:else}
    <p>No data yet</p>
  {/if}
{/if}
```

## API Reference

### `useClientCache<T>(cacheKey, getLiveData, getIsLoading)`

A Svelte hook for caching data in Figma's clientStorage.

**Parameters:**
- `cacheKey` (string): Unique key for storing data in clientStorage
- `getLiveData` (() => T | null | undefined): Getter function that returns fresh data from your data source
- `getIsLoading` (() => boolean): Getter function that returns whether the live data is currently loading

**Returns:**
An object with reactive properties:
- `displayData`: The data to display (live data if available, otherwise cached)
- `shouldRender`: Whether to render content (false until cache is checked)
- `shouldShowLoading`: Whether to show a loading spinner

**⚠️ Important:** Don't destructure the return value! Access properties directly (e.g., `cache.displayData`) to preserve reactivity.

### `setupClientStorage()`

Sets up message handlers for clientStorage operations.

**Returns:**
- A handler function that can be chained with other message handlers

## How It Works

1. **Plugin Opens** → Hook requests cached data from clientStorage
2. **Cache Retrieved** → Displays cached data instantly (if exists)
3. **Fresh Data Loads** → Updates display and saves to cache
4. **Next Open** → Cached data appears immediately!

### Loading States

- **First Launch (no cache)**: Brief loading spinner → data appears
- **Subsequent Launches**: Cached data appears instantly → updates silently with fresh data
- **Cache Check Time**: ~10-50ms (imperceptible to users)

## Examples

### Example 1: Todo List (Convex)

```svelte
<script lang="ts">
  import { useQuery, useConvexClient } from 'convex-svelte';
  import { api } from '../convex/_generated/api';
  import { useClientCache } from './utils/useClientCache.svelte';
  
  const todosQuery = useQuery(api.todos.get, {});
  const cache = useClientCache(
    'todos_cache',
    () => todosQuery.data,
    () => todosQuery.isLoading
  );
</script>

{#if cache.shouldRender}
  {#if cache.shouldShowLoading}
    <LoadingSpinner />
  {:else if cache.displayData}
    {#each cache.displayData as todo}
      <div>{todo.text}</div>
    {/each}
  {/if}
{/if}
```

### Example 2: User Profile

```svelte
<script lang="ts">
  import { useClientCache } from './utils/useClientCache.svelte';
  
  let profile = $state(null);
  let isLoading = $state(true);
  
  // Fetch profile data
  onMount(async () => {
    const response = await fetch('/api/profile');
    profile = await response.json();
    isLoading = false;
  });
  
  const cache = useClientCache(
    'user_profile_cache',
    () => profile,
    () => isLoading
  );
</script>

{#if cache.shouldRender}
  {#if cache.shouldShowLoading}
    <LoadingSpinner />
  {:else if cache.displayData}
    <h1>{cache.displayData.name}</h1>
    <p>{cache.displayData.email}</p>
  {/if}
{/if}
```

### Example 3: Multiple Cached Datasets

```svelte
<script lang="ts">
  import { useClientCache } from './utils/useClientCache.svelte';
  
  const usersQuery = useQuery(api.users.list, {});
  const projectsQuery = useQuery(api.projects.list, {});
  
  const usersCache = useClientCache(
    'users_cache',
    () => usersQuery.data,
    () => usersQuery.isLoading
  );
  const projectsCache = useClientCache(
    'projects_cache',
    () => projectsQuery.data,
    () => projectsQuery.isLoading
  );
</script>

{#if usersCache.shouldRender && projectsCache.shouldRender}
  <div>
    <h2>Users</h2>
    {#if usersCache.shouldShowLoading}
      <LoadingSpinner />
    {:else if usersCache.displayData}
      <!-- Render users -->
    {/if}
    
    <h2>Projects</h2>
    {#if projectsCache.shouldShowLoading}
      <LoadingSpinner />
    {:else if projectsCache.displayData}
      <!-- Render projects -->
    {/if}
  </div>
{/if}
```

## Customization

### Custom Cache Invalidation

You can clear the cache programmatically:

```svelte
<script lang="ts">
  function clearCache() {
    parent.postMessage(
      { pluginMessage: { type: 'set-storage', key: 'my_cache_key', value: null } },
      '*'
    );
  }
</script>

<button onclick={clearCache}>Clear Cache</button>
```

### Conditional Caching

Only cache certain data:

```svelte
<script lang="ts">
  // Only cache if data is valid
  const shouldCache = $derived(dataQuery.data && dataQuery.data.length > 0);
  
  const cache = useClientCache(
    'conditional_cache',
    shouldCache ? dataQuery.data : null,
    dataQuery.isLoading
  );
</script>
```

## Adapting for Other Frameworks

### React/Preact

Convert the Svelte hook to a React hook:

```typescript
import { useEffect, useState } from 'react';

export function useClientCache<T>(
  cacheKey: string,
  liveData: T | null | undefined,
  isLoading: boolean
) {
  const [cachedData, setCachedData] = useState<T | null>(null);
  const [cacheChecked, setCacheChecked] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (msg?.type === 'storage-data' && msg.key === cacheKey) {
        setCachedData(msg.value);
        setCacheChecked(true);
      }
    };

    window.addEventListener('message', handleMessage);
    parent.postMessage({ pluginMessage: { type: 'get-storage', key: cacheKey } }, '*');

    return () => window.removeEventListener('message', handleMessage);
  }, [cacheKey]);

  useEffect(() => {
    if (liveData) {
      setCachedData(liveData);
      parent.postMessage(
        { pluginMessage: { type: 'set-storage', key: cacheKey, value: liveData } },
        '*'
      );
    }
  }, [liveData, cacheKey]);

  const displayData = liveData ?? cachedData;
  const shouldShowLoading = cacheChecked && !displayData && isLoading;
  const shouldRender = cacheChecked;

  return { displayData, shouldRender, shouldShowLoading };
}
```

### Vue

```typescript
import { ref, onMounted, watch, computed } from 'vue';

export function useClientCache<T>(
  cacheKey: string,
  liveData: Ref<T | null | undefined>,
  isLoading: Ref<boolean>
) {
  const cachedData = ref<T | null>(null);
  const cacheChecked = ref(false);

  onMounted(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage;
      if (msg?.type === 'storage-data' && msg.key === cacheKey) {
        cachedData.value = msg.value;
        cacheChecked.value = true;
      }
    };

    window.addEventListener('message', handleMessage);
    parent.postMessage({ pluginMessage: { type: 'get-storage', key: cacheKey } }, '*');

    return () => window.removeEventListener('message', handleMessage);
  });

  watch(liveData, (newData) => {
    if (newData) {
      cachedData.value = newData;
      parent.postMessage(
        { pluginMessage: { type: 'set-storage', key: cacheKey, value: newData } },
        '*'
      );
    }
  });

  const displayData = computed(() => liveData.value ?? cachedData.value);
  const shouldShowLoading = computed(() => 
    cacheChecked.value && !displayData.value && isLoading.value
  );
  const shouldRender = computed(() => cacheChecked.value);

  return { displayData, shouldRender, shouldShowLoading };
}
```

## Troubleshooting

### Cache not loading
- Ensure `setupClientStorage()` is called in your plugin's main file
- Check browser console for errors
- Verify the cache key matches between saves and loads

### Data not updating
- The hook automatically updates when `liveData` changes
- Check that your data source is properly reactive

### Loading spinner still appears briefly
- This is normal on first launch when no cache exists
- On subsequent launches, cache should appear instantly

## License

MIT - Feel free to use in your projects!

