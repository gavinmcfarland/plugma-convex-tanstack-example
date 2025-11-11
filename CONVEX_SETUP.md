# Convex Setup Instructions

This Figma plugin now uses Convex for persistent todo storage. Follow these steps to set it up:

## 1. Initialize Convex

Run the following command to set up Convex:

```bash
npx convex dev
```

This will:

- Prompt you to log in with GitHub (if not already logged in)
- Create a new Convex project or connect to an existing one
- Generate the `src/convex/_generated` folder with API types
- Create a `.env.local` file with your `VITE_CONVEX_URL`
- Start watching for changes to your Convex functions

## 2. Verify Network Access

The `manifest.json` has been updated to allow network access to Convex domains:

- `https://*.convex.cloud`
- `https://*.convex.site`

## 3. Start Development

After running `npx convex dev`, in a separate terminal, start the Figma plugin dev server:

```bash
pnpm dev
```

## 4. Test the Integration

1. Open Figma and load your plugin
2. The todos should now be loaded from Convex
3. Add, complete, and delete todos - they will be persisted in Convex
4. Refresh the plugin - your todos should still be there!

## Files Created

- `convex.json` - Convex configuration
- `src/convex/schema.ts` - Database schema for todos
- `src/convex/todos.ts` - Convex functions (queries and mutations)
- `src/ui/convex.ts` - Convex URL configuration
- Updated `src/ui/ui.ts` - Sets up Convex client
- Updated `src/ui/App.svelte` - Uses Convex queries and mutations
- Updated `manifest.json` - Allows network access to Convex

## Convex Functions

- `api.todos.get` - Query to get all todos
- `api.todos.add` - Mutation to add a new todo
- `api.todos.toggle` - Mutation to toggle todo completion
- `api.todos.remove` - Mutation to delete a todo

## Troubleshooting

If you see "CONVEX_URL not set" in the console:

1. Make sure you've run `npx convex dev`
2. Check that `.env.local` exists and contains `VITE_CONVEX_URL`
3. Restart your dev server after running `npx convex dev`

If you see TypeScript errors about missing `_generated` files:

1. Make sure you've run `npx convex dev` at least once
2. The `src/convex/_generated` folder should be created automatically
