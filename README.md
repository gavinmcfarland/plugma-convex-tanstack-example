# Figma Plugin Template (Svelte + TanStack Query + Convex)

A modern, production-ready Figma plugin template with **instant loading** and persistent caching.

## ✨ Key Features

- ⚡ **Instant Loading** - Data appears immediately on subsequent plugin opens (no loading spinners!)
- 💾 **Persistent Caching** - Uses Figma's `clientStorage` for automatic cache persistence
- 🔄 **Background Refresh** - Fresh data loads silently while showing cached data
- 🎨 **Modern Stack** - Svelte 5 + TanStack Query + Convex
- 🔌 **Backend Flexible** - Easily swap Convex for Supabase, Firebase, or any backend
- 📦 **Type-safe** - Full TypeScript support
- 🎯 **Production Ready** - Battle-tested patterns and error handling

## 🚀 Quick Start

### Requirements

- [Node.js](https://nodejs.org/en)
- [Figma desktop app](https://www.figma.com/downloads/)

### Setup

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Set Up Backend** (Convex example)
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
│   ├── QueryProvider.svelte         # 🔌 Backend-agnostic caching
│   ├── ConvexProvider.svelte        # Convex-specific setup
│   ├── App.svelte                   # Your app
│   ├── components/
│   └── utils/
│       └── figmaStoragePersistor.ts # Cache persistence
└── convex/                          # Backend functions (Convex)
    ├── schema.ts
    └── todos.ts
```

### Key Components

#### `QueryProvider.svelte` - The Magic ✨
**Backend-agnostic** TanStack Query setup with:
- Automatic cache restoration (~10-50ms)
- Persistent storage via Figma's `clientStorage`
- Zero-config caching for any data source

#### `ConvexProvider.svelte` - Backend Wrapper
Convex-specific setup that uses `QueryProvider`. **Easily swap** for your own provider!

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

## 🔄 Using Different Backends

The template is designed to work with **any** backend. The caching layer (`QueryProvider`) is completely independent.

### Current: Convex
```svelte
<script>
  import { setupConvex } from 'convex-svelte';
  setupConvex(CONVEX_URL);
</script>

<QueryProvider>
  <App />
</QueryProvider>
```

### Switch to Supabase
```svelte
<script>
  import { createClient } from '@supabase/supabase-js';
  const supabase = createClient(...);
  setContext('supabase', supabase);
</script>

<QueryProvider>
  <App />
</QueryProvider>
```

### Switch to REST API
```svelte
<QueryProvider>
  <App />
</QueryProvider>
<!-- Just use fetch() in your queries! -->
```

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
