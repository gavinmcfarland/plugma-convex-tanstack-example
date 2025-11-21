# Plugma + Convex + Tanstack

An example Todo Figma plugin using Plugma for plugin developement, Convex for database storage and Tanstack for persisting to clientStorage for instant loading.

## Quick Start

### Requirements

- [Node.js](https://nodejs.org/en)
- [Figma desktop app](https://www.figma.com/downloads/)

### Setup

1. **Install dependencies**

    ```bash
    pnpm install
    ```

2. **Set up backend**

    ```bash
    npx convex dev
    ```

    See [CONVEX_SETUP.md](./CONVEX_SETUP.md) for details.

3. **Run development**

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

## Documentation

### Core Setup

- **[TanStack Query + Convex Setup](./TANSTACK_QUERY_SETUP.md)** - Complete guide for this template
- **[Generic Query Provider Setup](./QUERY_PROVIDER_SETUP.md)** - Use with ANY backend (Supabase, Firebase, REST, etc.)
- **[Convex Setup](./CONVEX_SETUP.md)** - Convex-specific configuration

## Learn More

- [Plugma Docs](https://plugma.dev/docs)
- [Svelte 5 Docs](https://svelte.dev/docs/svelte/overview)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Convex Docs](https://docs.convex.dev/)
- [Figma Plugin API](https://www.figma.com/plugin-docs/)

---

**Made with ❤️ for the Figma plugin community**
