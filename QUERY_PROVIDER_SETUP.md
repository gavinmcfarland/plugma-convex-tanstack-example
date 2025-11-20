# Query Provider Setup (Framework Agnostic)

The `QueryProvider` component provides TanStack Query with persistent caching for Figma plugins, **independent of your backend choice**. Use it with Convex, Supabase, Firebase, REST APIs, or any other data source!

## Features

- ✅ **Backend Agnostic** - Works with any data source
- ✅ **Persistent Caching** - Uses Figma's `clientStorage`
- ✅ **Instant Loading** - Shows cached data immediately on plugin reopens
- ✅ **Zero Configuration** - Set up once, use everywhere
- ✅ **Framework Flexible** - Easy to adapt for React, Vue, etc.

## Quick Start

### 1. Install Dependencies

```bash
pnpm add @tanstack/svelte-query @tanstack/query-persist-client-core
```

### 2. Set Up Plugin Storage Handler

In your plugin main file (`src/main/main.ts`):

```typescript
import { setupClientStorage } from './setupClientStorage';

export default function () {
	figma.showUI(__html__, { width: 300, height: 400 });

	// Required: Handle storage messages for cache persistence
	setupClientStorage();
}
```

### 3. Create the Storage Persistor

Copy `src/ui/utils/figmaStoragePersistor.ts` to your project (see [full code](#storage-persistor-code)).

### 4. Create QueryProvider Component

Copy `src/ui/QueryProvider.svelte` to your project (see [full code](#queryprovider-code)).

### 5. Set Up Entry Point

In `src/ui/ui.ts`:

```typescript
import { mount } from 'svelte';
import './styles.css';
import QueryProvider from './QueryProvider.svelte';
import App from './App.svelte'; // Your app component

// Import your backend setup function (swap this line to change backends!)
import { setupConvex } from './convexSetup'; // For Convex
// import { setupSupabase } from './supabaseSetup';  // For Supabase
// import { setupFirebase } from './firebaseSetup';  // For Firebase
// Pass undefined for REST APIs - no setup needed!

const app = mount(QueryProvider, {
	target: document.getElementById('app')!,
	props: {
		setup: setupConvex, // Pass setup function as prop (or undefined for REST APIs)
		component: App, // Pass your app component
	},
});

export default app;
```

That's it! Now you can use TanStack Query with any backend.

**To swap backends**: Just change which setup function you pass!  
**To use a different app**: Just change which component you pass!

## Usage Examples

### With Convex

Create `src/ui/convexSetup.ts`:

```typescript
import { setupConvex as setupConvexClient } from 'convex-svelte';
import { CONVEX_URL } from './convex';

export function setupConvex() {
	if (CONVEX_URL) {
		setupConvexClient(CONVEX_URL);
		console.log('[Convex] Initialized');
	}
}
```

Then in `src/ui/ui.ts`:

```typescript
import { setupConvex } from './convexSetup';
import App from './App.svelte';

mount(QueryProvider, {
	target: document.getElementById('app')!,
	props: {
		setup: setupConvex,
		component: App,
	},
});
```

In your app:

```svelte
<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { useConvexClient } from 'convex-svelte';
  import { api } from '../convex/_generated/api';

  const convex = useConvexClient();
  const queryClient = useQueryClient();

  const todosQuery = createQuery(() => ({
    queryKey: ['todos'],
    queryFn: () => convex.query(api.todos.get, {}),
  }));

  async function addTodo(text: string) {
    await convex.mutation(api.todos.add, { text });
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  }
</script>

{#if todosQuery.isPending}
  <p>Loading...</p>
{:else}
  {#each todosQuery.data as todo}
    <div>{todo.text}</div>
  {/each}
{/if}
```

### With Supabase

Create `src/ui/supabaseSetup.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

export function setupSupabase() {
	const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
	const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

	if (SUPABASE_URL && SUPABASE_KEY) {
		const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

		// Make available globally (or use Svelte context)
		(window as any).supabase = supabase;

		console.log('[Supabase] Initialized');
	}
}
```

Then in `src/ui/ui.ts`:

```typescript
import { setupSupabase } from './supabaseSetup';
import App from './App.svelte';

mount(QueryProvider, {
	target: document.getElementById('app')!,
	props: {
		setup: setupSupabase,
		component: App,
	},
});
```

In your app:

```svelte
<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { getContext } from 'svelte';

  const supabase = getContext('supabase');
  const queryClient = useQueryClient();

  const todosQuery = createQuery(() => ({
    queryKey: ['todos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('todos').select('*');
      if (error) throw error;
      return data;
    },
  }));

  async function addTodo(text: string) {
    await supabase.from('todos').insert({ text });
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  }
</script>
```

### With REST API

```svelte
<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';

  const queryClient = useQueryClient();

  const todosQuery = createQuery(() => ({
    queryKey: ['todos'],
    queryFn: async () => {
      const response = await fetch('https://api.example.com/todos');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  }));

  async function addTodo(text: string) {
    await fetch('https://api.example.com/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  }
</script>
```

### With Firebase

Create `src/ui/firebaseSetup.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export function setupFirebase() {
	const firebaseConfig = {
		apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
		projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
		// ... other config
	};

	if (firebaseConfig.apiKey && firebaseConfig.projectId) {
		const app = initializeApp(firebaseConfig);
		const db = getFirestore(app);

		(window as any).firebase = { app, db };
		console.log('[Firebase] Initialized');
	}
}
```

Then in `src/ui/ui.ts`:

```typescript
import { setupFirebase } from './firebaseSetup';
import App from './App.svelte';

mount(QueryProvider, {
	target: document.getElementById('app')!,
	props: {
		setup: setupFirebase,
		component: App,
	},
});
```

In your app:

```svelte
<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { collection, getDocs, addDoc } from 'firebase/firestore';

  const { db } = (window as any).firebase;
  const queryClient = useQueryClient();

  const todosQuery = createQuery(() => ({
    queryKey: ['todos'],
    queryFn: async () => {
      const snapshot = await getDocs(collection(db, 'todos'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
  }));

  async function addTodo(text: string) {
    await addDoc(collection(db, 'todos'), { text });
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  }
</script>
```

### With GraphQL

```svelte
<script lang="ts">
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { request, gql } from 'graphql-request';

  const endpoint = 'https://api.example.com/graphql';
  const queryClient = useQueryClient();

  const todosQuery = createQuery(() => ({
    queryKey: ['todos'],
    queryFn: () => request(endpoint, gql`
      query {
        todos {
          id
          text
          completed
        }
      }
    `),
  }));

  async function addTodo(text: string) {
    await request(endpoint, gql`
      mutation AddTodo($text: String!) {
        addTodo(text: $text) {
          id
          text
        }
      }
    `, { text });
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  }
</script>
```

## Configuration Options

### Customize Cache Behavior

Modify `QueryProvider.svelte` to adjust caching:

```typescript
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // How long data is "fresh"
			gcTime: 1000 * 60 * 60 * 24, // How long to keep in cache
			refetchOnWindowFocus: false, // Refetch on window focus
			refetchOnReconnect: true, // Refetch on network reconnect
			retry: 1, // Retry failed requests
		},
	},
});
```

### Per-Query Configuration

Override defaults per query:

```typescript
const todosQuery = createQuery(() => ({
	queryKey: ['todos'],
	queryFn: fetchTodos,
	staleTime: 1000 * 60 * 10, // Fresh for 10 minutes
	refetchInterval: 30000, // Poll every 30 seconds
	retry: 3, // Retry 3 times on error
}));
```

## Code References

### Storage Persistor Code

`src/ui/utils/figmaStoragePersistor.ts`:

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

### QueryProvider Code

`src/ui/QueryProvider.svelte`:

```svelte
<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import { persistQueryClient } from '@tanstack/query-persist-client-core';
  import { createFigmaStoragePersistor } from './utils/figmaStoragePersistor';
  import { onMount } from 'svelte';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

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
      console.log(`[QueryProvider] Restored ${queries.length} queries from cache`);
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
    {@render children?.()}
  </QueryClientProvider>
{/if}
```

## Benefits

| Feature               | Without QueryProvider   | With QueryProvider |
| --------------------- | ----------------------- | ------------------ |
| Caching               | Manual implementation   | ✅ Automatic       |
| Persistence           | Manual storage handling | ✅ Auto-persists   |
| Loading states        | Manual state management | ✅ Built-in        |
| Refetching            | Manual triggers         | ✅ Automatic       |
| Error handling        | Manual try/catch        | ✅ Built-in        |
| Request deduplication | No                      | ✅ Yes             |
| Optimistic updates    | Complex                 | ✅ Simple          |

## Migration from Other Solutions

### From Custom Cache Helper

**Before:**

```svelte
const cache = useClientCache('key', () => data, () => loading);
```

**After:**

```svelte
const query = createQuery(() => ({
  queryKey: ['key'],
  queryFn: fetchData,
}));
```

### From Raw Fetch Calls

**Before:**

```svelte
let data = $state(null);
let loading = $state(true);

onMount(async () => {
  data = await fetchData();
  loading = false;
});
```

**After:**

```svelte
const query = createQuery(() => ({
  queryKey: ['data'],
  queryFn: fetchData,
}));

// Use: query.data, query.isPending
```

## Adapting for Other Frameworks

### React/Preact

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/query-persist-client-core';
import { createFigmaStoragePersistor } from './figmaStoragePersistor';
import { useState, useEffect } from 'react';

export function QueryProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [queryClient] = useState(() => new QueryClient({...}));
  const persister = createFigmaStoragePersistor();

  useEffect(() => {
    (async () => {
      const restoredState = await persister.restoreClient();
      // ... hydrate cache ...
      persistQueryClient({ queryClient, persister, maxAge: ... });
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### Vue

```vue
<script setup>
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import { persistQueryClient } from '@tanstack/query-persist-client-core';
import { createFigmaStoragePersistor } from './figmaStoragePersistor';
import { ref, onMounted } from 'vue';

const ready = ref(false);
const queryClient = new QueryClient({...});
const persister = createFigmaStoragePersistor();

onMounted(async () => {
  const restoredState = await persister.restoreClient();
  // ... hydrate cache ...
  persistQueryClient({ queryClient, persister, maxAge: ... });
  ready.value = true;
});
</script>

<template>
	<div v-if="ready">
		<VueQueryPlugin :client="queryClient">
			<slot />
		</VueQueryPlugin>
	</div>
</template>
```

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Query Persistence](https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient)
- [Figma Plugin API](https://www.figma.com/plugin-docs/api/api-reference/)

## Switching Backends

To switch from one backend to another, just change the setup function in `ui.ts`:

```typescript
import App from './App.svelte';

// From Convex
import { setupConvex } from './convexSetup';
mount(QueryProvider, {
	props: {
		setup: setupConvex,
		component: App,
	},
});

// To Supabase
import { setupSupabase } from './supabaseSetup';
mount(QueryProvider, {
	props: {
		setup: setupSupabase,
		component: App,
	},
});

// To Firebase
import { setupFirebase } from './firebaseSetup';
mount(QueryProvider, {
	props: {
		setup: setupFirebase,
		component: App,
	},
});

// To REST API (no setup needed)
mount(QueryProvider, {
	props: {
		component: App,
	},
});
```

That's it! The caching layer stays the same, only the data source changes.

### Quick Migration Guide

| From   | To       | Steps                                                                                                                                                                             |
| ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Convex | Supabase | 1. Create `supabaseSetup.ts` with `setupSupabase` function<br>2. Change import in `ui.ts`<br>3. Pass `setupSupabase` to QueryProvider<br>4. Update queries to use Supabase client |
| Convex | Firebase | 1. Create `firebaseSetup.ts` with `setupFirebase` function<br>2. Change import in `ui.ts`<br>3. Pass `setupFirebase` to QueryProvider<br>4. Update queries to use Firebase SDK    |
| Convex | REST API | 1. Remove setup function from QueryProvider props<br>2. Update queries to use `fetch()`                                                                                           |
| Any    | Any      | Just swap which setup function you pass to QueryProvider!                                                                                                                         |

---

**Ready to use with any backend!** 🚀
