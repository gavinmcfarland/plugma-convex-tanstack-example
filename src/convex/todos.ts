import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query to get all todos
export const get = query({
  args: {},
  handler: async (ctx) => {
    // Query all todos - they will be in insertion order (oldest first, newest last)
    const todos = await ctx.db.query("todos").collect();
    return todos;
  },
});

// Mutation to add a new todo
export const add = mutation({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const todoId = await ctx.db.insert("todos", {
      text: args.text,
      completed: false,
    });
    return todoId;
  },
});

// Mutation to toggle todo completion
export const toggle = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new Error("Todo not found");
    }
    await ctx.db.patch(args.id, {
      completed: !todo.completed,
    });
  },
});

// Mutation to delete a todo
export const remove = mutation({
  args: {
    id: v.id("todos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

