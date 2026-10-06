import {
  boolean,
  date,
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export type JsonData = Record<string, unknown>;

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userPreferencesTable = pgTable("user_preferences", {
  userId: text("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<JsonData>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ingredientsTable = pgTable("ingredients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
});

export const recipesTable = pgTable("recipes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  cuisine: text("cuisine").notNull(),
  data: jsonb("data").$type<JsonData>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("recipes_name_idx").on(table.name)]);

export const recipeIngredientsTable = pgTable("recipe_ingredients", {
  recipeId: text("recipe_id").notNull().references(() => recipesTable.id, { onDelete: "cascade" }),
  ingredientId: text("ingredient_id").notNull().references(() => ingredientsTable.id, { onDelete: "cascade" }),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull(),
}, (table) => [primaryKey({ columns: [table.recipeId, table.ingredientId] })]);

export const pantryItemsTable = pgTable("pantry_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull(),
  category: text("category").notNull(),
  expiryDate: date("expiry_date", { mode: "string" }),
}, (table) => [index("pantry_user_idx").on(table.userId)]);

export const mealPlansTable = pgTable("meal_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<JsonData>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("meal_plans_user_idx").on(table.userId)]);

export const mealsTable = pgTable("meals", {
  id: text("id").primaryKey(),
  planId: text("plan_id").notNull().references(() => mealPlansTable.id, { onDelete: "cascade" }),
  data: jsonb("data").$type<JsonData>().notNull(),
});

export const shoppingListsTable = pgTable("shopping_lists", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => mealPlansTable.id, { onDelete: "cascade" }),
  pantryCoverage: numeric("pantry_coverage").notNull().default("0"),
}, (table) => [index("shopping_lists_plan_idx").on(table.planId)]);

export const shoppingItemsTable = pgTable("shopping_items", {
  id: text("id").primaryKey(),
  listId: text("list_id").notNull().references(() => shoppingListsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: numeric("quantity").notNull(),
  unit: text("unit").notNull(),
  category: text("category").notNull(),
  estimatedPrice: numeric("estimated_price").notNull(),
  purchased: boolean("purchased").notNull().default(false),
});

export const favoritesTable = pgTable("favorites", {
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  recipeId: text("recipe_id").notNull().references(() => recipesTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.recipeId] })]);

export const nutritionLogsTable = pgTable("nutrition_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  loggedOn: date("logged_on", { mode: "string" }).notNull(),
  data: jsonb("data").$type<JsonData>().notNull(),
}, (table) => [index("nutrition_logs_user_date_idx").on(table.userId, table.loggedOn)]);
