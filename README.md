# Plugma + Convex + Tanstack

An example Todo Figma plugin using Plugma for plugin developement, Convex for database and Tanstack for persistent storage.

## 🚀 Quick Start

### Requirements

- [Node.js](https://nodejs.org/en)
- [Figma desktop app](https://www.figma.com/downloads/)

### Setup

1. **Install Dependencies**

    ```bash
    pnpm install
    ```

2. **Set Up Backend**

    ```bash
    npx convex dev
    ```

    See [CONVEX_SETUP.md](./CONVEX_SETUP.md) for details.

3. **Run Development**

    ```bash
    pnpm dev
    ```

    Changes rebuild automatically to `dist/` on save.

4. **Import in Figma**
    - Open Figma desktop app
    - Press `Cmd/Ctrl + K` → Search "Import plugin from manifest…"
    - Select `dist/manifest.json`

    Keep dev server running for instant reloads!

### Build for Production

```bash
pnpm build
```

The optimized build in `dist/` is ready to publish.

## 📚 Documentation

### Core Setup

- **[TanStack Query + Convex Setup](./TANSTACK_QUERY_SETUP.md)** - Complete guide for this template
- **[Generic Query Provider Setup](./QUERY_PROVIDER_SETUP.md)** - Use with ANY backend (Supabase, Firebase, REST, etc.)
- **[Convex Setup](./CONVEX_SETUP.md)** - Convex-specific configuration

### Integration Examples

See [QUERY_PROVIDER_SETUP.md](./QUERY_PROVIDER_SETUP.md) for examples with:

- ✅ Convex (included in template)
- ✅ Supabase
- ✅ Firebase
- ✅ REST APIs
- ✅ GraphQL
- ✅ Any custom backend

## 🏗️ Architecture

```
src/
├── main/
│   ├── main.ts                      # Plugin entry point
│   └── setupClientStorage.ts        # Storage handler for cache
├── ui/
│   ├── ui.ts                        # Entry point - imports backend setup
│   ├── QueryProvider.svelte         # 🔌 Backend-agnostic caching
│   ├── convexSetup.ts               # Convex initialization
│   ├── App.svelte                   # Your app
│   ├── components/
│   └── utils/
│       └── figmaStoragePersistor.ts # Cache persistence
└── convex/                          # Backend functions (Convex)
    ├── schema.ts
    └── todos.ts
```

### Key Components

#### `ui.ts` - Entry Point

Imports your app and backend setup, then mounts `QueryProvider`:

```typescript
import App from './App.svelte';
import { setupConvex } from './convexSetup'; // ← Swap this to change backends!
mount(QueryProvider, {
	target: document.getElementById('app')!,
	props: {
		setup: setupConvex, // ← Backend initialization
		app: App, // ← Your app component
	},
});
```

#### `QueryProvider.svelte` - The Magic ✨

**Completely generic** TanStack Query provider with:

- Automatic cache restoration (~10-50ms)
- Persistent storage via Figma's `clientStorage`
- Zero-config caching for any data source
- Accepts optional `setup` prop for backend initialization
- Accepts `app` prop to render your app
- No coupling to specific backends or apps!

#### `*Setup.ts` - Backend Initialization

Simple files that export setup functions. **Just swap which function you pass** to change backends!

## 💡 How It Works

### First Load (No Cache)

```
Plugin opens → Fetch from backend → Show data → Save to cache
```

### Subsequent Loads (With Cache)

```
Plugin opens → Restore cache (~10-50ms) → Show data instantly!
              ↳ Background: Fetch fresh data → Update if changed
```

**Result**: After first use, plugin feels instant! 🚀

## 🔄 Switching Backends (Super Easy!)

The template is designed to work with **any** backend. Just change which setup function you pass!

In `src/ui/ui.ts`, swap the backend setup function:

```typescript
import App from './App.svelte';

// Current: Convex
import { setupConvex } from './convexSetup';
mount(QueryProvider, {
	target: document.getElementById('app')!,
	props: {
		setup: setupConvex,
		app: App,
	},
});

// Switch to Supabase
import { setupSupabase } from './supabaseSetup';
mount(QueryProvider, {
	props: {
		setup: setupSupabase, // ← Just change this!
		app: App,
	},
});

// Switch to Firebase
import { setupFirebase } from './firebaseSetup';
mount(QueryProvider, {
	props: {
		setup: setupFirebase, // ← Or this!
		app: App,
	},
});

// REST API? No setup needed - just omit the setup prop!
mount(QueryProvider, {
	target: document.getElementById('app')!,
	props: {
		app: App,
	},
});
```

### Backend Setup Files

Each backend has its own simple setup file that exports a function:

**`convexSetup.ts`** (included)

```typescript
export function setupConvex() {
	setupConvexClient(CONVEX_URL);
}
```

**`supabaseSetup.ts`** (see example file)

```typescript
export function setupSupabase() {
  const supabase = createClient(...);
  (window as any).supabase = supabase;
}
```

**`firebaseSetup.ts`** (see example file)

```typescript
export function setupFirebase() {
	const app = initializeApp(config);
	(window as any).firebase = { app, db };
}
```

Example setup files are included! See `*.example` files in `src/ui/`.

**That's it!** The caching layer (`QueryProvider`) works identically with all backends.

See [QUERY_PROVIDER_SETUP.md](./QUERY_PROVIDER_SETUP.md) for complete examples.

## 📦 What's Included

- ✅ Svelte 5 with runes
- ✅ TanStack Query for data management
- ✅ Persistent caching with Figma's `clientStorage`
- ✅ Convex backend (easily replaceable)
- ✅ TypeScript throughout
- ✅ Example todo app
- ✅ Figma UI components
- ✅ Hot module replacement
- ✅ Production build optimization

## 🎯 Scripts

```bash
pnpm install         # Install dependencies
pnpm dev             # Development with HMR
pnpm build           # Production build
npx convex dev       # Run Convex backend
```

## 🌟 Why This Template?

Most Figma plugin templates don't handle caching well, leading to:

- ❌ Slow loading on every plugin open
- ❌ Flickering loading states
- ❌ Poor user experience

This template provides:

- ✅ **Instant loading** after first use
- ✅ **No loading spinner flash** on cached loads
- ✅ **Always fresh data** via background refresh
- ✅ **Production-ready patterns** used by major apps

## 🔌 Extending This Template

Created with [Plugma](https://github.com/gavinmcfarland/plugma). Add more integrations:

```bash
npm create plugma@latest add
```

## 📖 Learn More

- [Plugma Docs](https://plugma.dev/docs)
- [Svelte 5 Docs](https://svelte.dev/docs/svelte/overview)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Convex Docs](https://docs.convex.dev/)
- [Figma Plugin API](https://www.figma.com/plugin-docs/)

## 🤝 Contributing

Issues and PRs welcome! This template showcases best practices for Figma plugin development.

---

**Made with ❤️ for the Figma plugin community**
