import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type {
  MealPlan,
  PantryItem,
  Preferences,
  Recipe,
  ShoppingItem,
  ShoppingList,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import {
  favoritesTable,
  ingredientsTable,
  mealPlansTable,
  mealsTable,
  pantryItemsTable,
  recipeIngredientsTable,
  recipesTable,
  shoppingItemsTable,
  shoppingListsTable,
  userPreferencesTable,
  usersTable,
  type JsonData,
} from "@workspace/db";
import { pantryDefaults, recipeCatalog } from "./nutriplan-data";

export const DEMO_USER_ID = "demo-user";
const recipeCatalogById = new Map(recipeCatalog.map((recipe) => [recipe.id, recipe]));

export const defaultPreferences: Preferences = {
  goal: "Build Muscle",
  diet: "Vegetarian",
  budget: 1500,
  budgetPeriod: "weekly",
  currency: "INR",
  calories: 2200,
  protein: 120,
  carbs: 250,
  fat: 70,
  fiber: 30,
  allergies: [],
  excludedIngredients: [],
  cuisine: "South Indian",
  cookingTime: 30,
  mealsPerDay: 3,
  servings: 1,
  autoNutrition: true,
};

export async function ensureDemoData(): Promise<void> {
  await db.insert(usersTable).values({
    id: DEMO_USER_ID,
    displayName: "Demo User",
  }).onConflictDoNothing();
  await db.insert(userPreferencesTable).values({
    userId: DEMO_USER_ID,
    data: defaultPreferences as unknown as JsonData,
  }).onConflictDoNothing();

  const existingRecipes = await db.select({ id: recipesTable.id }).from(recipesTable).limit(1);
  if (existingRecipes.length === 0) {
    const ingredients = new Map<string, { id: string; name: string; category: string; aliases: string[] }>();
    for (const recipe of recipeCatalog) {
      for (const ingredient of recipe.ingredients) {
        const id = ingredient.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        ingredients.set(id, { id, name: ingredient.name, category: ingredient.category, aliases: [] });
      }
    }
    const ingredientRows = [...ingredients.values()];
    if (ingredientRows.length) {
      await db.insert(ingredientsTable).values(ingredientRows).onConflictDoNothing();
    }
    await db.insert(recipesTable).values(recipeCatalog.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      cuisine: recipe.cuisine,
      data: recipe as unknown as JsonData,
    }))).onConflictDoNothing();
    const ingredientIds = new Map(ingredientRows.map((item) => [item.name, item.id]));
    const links = recipeCatalog.flatMap((recipe) => recipe.ingredients.flatMap((ingredient) => {
      const ingredientId = ingredientIds.get(ingredient.name);
      return ingredientId
        ? [{ recipeId: recipe.id, ingredientId, quantity: String(ingredient.quantity), unit: ingredient.unit }]
        : [];
    }));
    if (links.length) {
      await db.insert(recipeIngredientsTable).values(links).onConflictDoNothing();
    }
  }

  const pantry = await db.select({ id: pantryItemsTable.id })
    .from(pantryItemsTable)
    .where(eq(pantryItemsTable.userId, DEMO_USER_ID))
    .limit(1);
  if (pantry.length === 0) {
    await db.insert(pantryItemsTable).values(pantryDefaults.map((item) => ({
      ...item,
      userId: DEMO_USER_ID,
      quantity: String(item.quantity),
    }))).onConflictDoNothing();
  }
}

export async function readPreferences(): Promise<Preferences> {
  await ensureDemoData();
  const [row] = await db.select().from(userPreferencesTable)
    .where(eq(userPreferencesTable.userId, DEMO_USER_ID)).limit(1);
  return (row?.data ?? defaultPreferences) as unknown as Preferences;
}

export async function writePreferences(data: Preferences): Promise<Preferences> {
  await ensureDemoData();
  const calories = Math.max(0, Math.round(data.calories));
  const preferences: Preferences = data.autoNutrition
    ? {
      ...data,
      calories,
      protein: Math.round(calories * 0.2 / 4),
      carbs: Math.round(calories * 0.5 / 4),
      fat: Math.round(calories * 0.3 / 9),
      fiber: Math.round(calories / 1000 * 14),
    }
    : data;
  await db.insert(userPreferencesTable).values({
    userId: DEMO_USER_ID,
    data: preferences as unknown as JsonData,
  }).onConflictDoUpdate({
    target: userPreferencesTable.userId,
    set: { data: preferences as unknown as JsonData, updatedAt: new Date() },
  });
  return preferences;
}

export async function readRecipes(): Promise<Recipe[]> {
  await ensureDemoData();
  const rows = await db.select().from(recipesTable).orderBy(recipesTable.name);
  return rows.map((row) => recipeCatalogById.get(row.id) ?? row.data as unknown as Recipe);
}

export async function readRecipe(id: string): Promise<Recipe | undefined> {
  await ensureDemoData();
  const [row] = await db.select().from(recipesTable).where(eq(recipesTable.id, id)).limit(1);
  if (!row) return undefined;
  return recipeCatalogById.get(row.id) ?? row.data as unknown as Recipe;
}

const toPantryItem = (row: typeof pantryItemsTable.$inferSelect): PantryItem => ({
  id: row.id,
  name: row.name,
  quantity: Number(row.quantity),
  unit: row.unit,
  category: row.category,
  expiryDate: row.expiryDate ? new Date(`${row.expiryDate}T00:00:00.000Z`) : null,
});

const toDatabaseDate = (value: Date | null): string | null =>
  value ? value.toISOString().slice(0, 10) : null;

export async function readPantry(): Promise<PantryItem[]> {
  await ensureDemoData();
  const rows = await db.select().from(pantryItemsTable)
    .where(eq(pantryItemsTable.userId, DEMO_USER_ID));
  return rows.map(toPantryItem);
}

export async function createPantryItem(data: Omit<PantryItem, "id">): Promise<PantryItem> {
  await ensureDemoData();
  const item = { id: `pantry-${randomUUID()}`, ...data };
  const [row] = await db.insert(pantryItemsTable).values({
    ...item,
    userId: DEMO_USER_ID,
    quantity: String(item.quantity),
    expiryDate: toDatabaseDate(item.expiryDate),
  }).returning();
  return toPantryItem(row);
}

export async function editPantryItem(id: string, data: Omit<PantryItem, "id">): Promise<PantryItem | undefined> {
  const [row] = await db.update(pantryItemsTable).set({
    name: data.name,
    quantity: String(data.quantity),
    unit: data.unit,
    category: data.category,
    expiryDate: toDatabaseDate(data.expiryDate),
  }).where(and(eq(pantryItemsTable.id, id), eq(pantryItemsTable.userId, DEMO_USER_ID))).returning();
  return row ? toPantryItem(row) : undefined;
}

export async function removePantryItem(id: string): Promise<boolean> {
  const deleted = await db.delete(pantryItemsTable)
    .where(and(eq(pantryItemsTable.id, id), eq(pantryItemsTable.userId, DEMO_USER_ID)))
    .returning({ id: pantryItemsTable.id });
  return deleted.length > 0;
}

export async function readPlans(): Promise<MealPlan[]> {
  await ensureDemoData();
  const rows = await db.select().from(mealPlansTable)
    .where(eq(mealPlansTable.userId, DEMO_USER_ID))
    .orderBy(desc(mealPlansTable.createdAt));
  return rows.map((row) => row.data as unknown as MealPlan);
}

export async function readPlan(id: string): Promise<MealPlan | undefined> {
  const [row] = await db.select().from(mealPlansTable)
    .where(and(eq(mealPlansTable.id, id), eq(mealPlansTable.userId, DEMO_USER_ID))).limit(1);
  return row?.data as unknown as MealPlan | undefined;
}

export async function savePlan(plan: MealPlan): Promise<MealPlan> {
  await db.insert(mealPlansTable).values({
    id: plan.id,
    userId: DEMO_USER_ID,
    data: plan as unknown as JsonData,
    createdAt: new Date(plan.createdAt),
  });
  const allMeals = plan.days.flatMap((day) => day.meals.map((meal) => ({
    id: meal.id,
    planId: plan.id,
    data: meal as unknown as JsonData,
  })));
  if (allMeals.length) await db.insert(mealsTable).values(allMeals);
  return plan;
}

export async function replacePlan(plan: MealPlan): Promise<MealPlan> {
  await db.update(mealPlansTable).set({ data: plan as unknown as JsonData })
    .where(and(eq(mealPlansTable.id, plan.id), eq(mealPlansTable.userId, DEMO_USER_ID)));
  await db.delete(mealsTable).where(eq(mealsTable.planId, plan.id));
  const allMeals = plan.days.flatMap((day) => day.meals.map((meal) => ({
    id: meal.id,
    planId: plan.id,
    data: meal as unknown as JsonData,
  })));
  if (allMeals.length) await db.insert(mealsTable).values(allMeals);
  return plan;
}

const unitGroup = (unit: string): { dimension: string; factor: number; output: string } => {
  switch (unit.toLowerCase()) {
    case "kg": return { dimension: "mass", factor: 1000, output: "g" };
    case "g": return { dimension: "mass", factor: 1, output: "g" };
    case "l": return { dimension: "volume", factor: 1000, output: "ml" };
    case "ml": return { dimension: "volume", factor: 1, output: "ml" };
    default: return { dimension: unit.toLowerCase(), factor: 1, output: unit };
  }
};

function estimatePrice(category: string, quantity: number): number {
  const ratePer100 = category === "Protein" ? 22 : category === "Dairy" ? 15 : category === "Grains" ? 8 : category === "Vegetables" ? 10 : 5;
  return Math.max(1, Math.round(quantity / 100 * ratePer100));
}

export async function readOrCreateShoppingList(planId: string): Promise<ShoppingList | undefined> {
  const plan = await readPlan(planId);
  if (!plan) return undefined;
  let [listRow] = await db.select().from(shoppingListsTable)
    .where(eq(shoppingListsTable.planId, planId)).limit(1);
  if (!listRow) {
    const listId = `list-${planId}`;
    const pantry = await readPantry();
    const pantryMap = new Map(pantry.map((item) => {
      const unit = unitGroup(item.unit);
      return [item.name.toLowerCase(), { quantity: item.quantity * unit.factor, dimension: unit.dimension }];
    }));
    const required = new Map<string, { name: string; quantity: number; dimension: string; unit: string; category: string }>();
    for (const day of plan.days) {
      for (const meal of day.meals) {
        for (const ingredient of meal.recipe.ingredients) {
          const unit = unitGroup(ingredient.unit);
          const key = ingredient.name.toLowerCase();
          const previous = required.get(key);
          required.set(key, {
            name: ingredient.name,
            quantity: (previous?.quantity ?? 0) + ingredient.quantity * unit.factor * meal.servings,
            dimension: unit.dimension,
            unit: unit.output,
            category: ingredient.category,
          });
        }
      }
    }
    let totalRequired = 0;
    let covered = 0;
    const items: ShoppingItem[] = [];
    for (const [key, requirement] of required) {
      totalRequired += requirement.quantity;
      const pantryItem = pantryMap.get(key);
      const pantryQuantity = pantryItem?.dimension === requirement.dimension ? pantryItem.quantity : 0;
      covered += Math.min(requirement.quantity, pantryQuantity);
      const remaining = Math.max(0, requirement.quantity - pantryQuantity);
      if (remaining > 0) {
        const outputQuantity = requirement.dimension === "mass" || requirement.dimension === "volume"
          ? Math.round(remaining)
          : Math.round(remaining * 100) / 100;
        items.push({
          id: `shop-${planId}-${key.replace(/[^a-z0-9]+/g, "-")}`,
          name: requirement.name,
          quantity: outputQuantity,
          unit: requirement.unit,
          category: requirement.category,
          estimatedPrice: estimatePrice(requirement.category, remaining),
          purchased: false,
        });
      }
    }
    await db.insert(shoppingListsTable).values({
      id: listId,
      userId: DEMO_USER_ID,
      planId,
      pantryCoverage: totalRequired ? String(Math.round((covered / totalRequired) * 100)) : "0",
    }).onConflictDoNothing();
    const [created] = await db.select().from(shoppingListsTable)
      .where(eq(shoppingListsTable.planId, planId)).limit(1);
    listRow = created;
    if (items.length) {
      await db.insert(shoppingItemsTable).values(items.map((item) => ({
        ...item,
        listId,
        quantity: String(item.quantity),
        estimatedPrice: String(item.estimatedPrice),
      }))).onConflictDoNothing();
    }
  }
  const rows = await db.select().from(shoppingItemsTable)
    .where(eq(shoppingItemsTable.listId, listRow.id));
  const items: ShoppingItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    quantity: Number(row.quantity),
    unit: row.unit,
    category: row.category,
    estimatedPrice: Number(row.estimatedPrice),
    purchased: row.purchased,
  }));
  return {
    planId,
    items,
    totalCost: items.reduce((sum, item) => sum + item.estimatedPrice, 0),
    pantryCoverage: Number(listRow.pantryCoverage),
  };
}

export async function shoppingListId(planId: string): Promise<string> {
  const list = await readOrCreateShoppingList(planId);
  return `list-${list?.planId ?? planId}`;
}

export async function createShoppingItem(data: {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimatedPrice: number;
  purchased: boolean;
  planId: string;
}): Promise<ShoppingItem | undefined> {
  const list = await readOrCreateShoppingList(data.planId);
  if (!list) return undefined;
  const listId = await shoppingListId(data.planId);
  const [row] = await db.insert(shoppingItemsTable).values({
    id: `shop-${randomUUID()}`,
    listId,
    name: data.name,
    quantity: String(data.quantity),
    unit: data.unit,
    category: data.category,
    estimatedPrice: String(data.estimatedPrice),
    purchased: data.purchased,
  }).returning();
  return {
    id: row.id,
    name: row.name,
    quantity: Number(row.quantity),
    unit: row.unit,
    category: row.category,
    estimatedPrice: Number(row.estimatedPrice),
    purchased: row.purchased,
  };
}

export async function editShoppingItem(
  id: string,
  data: { name: string; quantity: number; unit: string; category: string; estimatedPrice: number; purchased: boolean },
): Promise<ShoppingItem | undefined> {
  const [row] = await db.update(shoppingItemsTable).set({
    name: data.name,
    quantity: String(data.quantity),
    unit: data.unit,
    category: data.category,
    estimatedPrice: String(data.estimatedPrice),
    purchased: data.purchased,
  }).where(eq(shoppingItemsTable.id, id)).returning();
  return row ? {
    id: row.id,
    name: row.name,
    quantity: Number(row.quantity),
    unit: row.unit,
    category: row.category,
    estimatedPrice: Number(row.estimatedPrice),
    purchased: row.purchased,
  } : undefined;
}

export async function removeShoppingItem(id: string): Promise<boolean> {
  const rows = await db.delete(shoppingItemsTable).where(eq(shoppingItemsTable.id, id))
    .returning({ id: shoppingItemsTable.id });
  return rows.length > 0;
}

export async function readFavorites(): Promise<Recipe[]> {
  const rows = await db.select({ id: recipesTable.id, data: recipesTable.data }).from(favoritesTable)
    .innerJoin(recipesTable, eq(favoritesTable.recipeId, recipesTable.id))
    .where(eq(favoritesTable.userId, DEMO_USER_ID))
    .orderBy(desc(favoritesTable.createdAt));
  return rows.map((row) => recipeCatalogById.get(row.id) ?? row.data as unknown as Recipe);
}

export async function addRecipeFavorite(recipeId: string): Promise<boolean> {
  const recipe = await readRecipe(recipeId);
  if (!recipe) return false;
  await db.insert(favoritesTable).values({ userId: DEMO_USER_ID, recipeId }).onConflictDoNothing();
  return true;
}

export async function removeRecipeFavorite(recipeId: string): Promise<boolean> {
  const deleted = await db.delete(favoritesTable)
    .where(and(eq(favoritesTable.userId, DEMO_USER_ID), eq(favoritesTable.recipeId, recipeId)))
    .returning({ recipeId: favoritesTable.recipeId });
  return deleted.length > 0;
}

export async function findRecipes(search: string): Promise<Array<{ id: string; title: string; type: string; description: string }>> {
  const term = search.trim().toLowerCase();
  const [recipes, pantry] = await Promise.all([readRecipes(), readPantry()]);
  const recipeResults = recipes
    .filter((recipe) =>
      recipe.name.toLowerCase().includes(term)
      || recipe.cuisine.toLowerCase().includes(term)
      || recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(term)))
    .slice(0, 12)
    .map((recipe) => ({ id: recipe.id, title: recipe.name, type: "recipe", description: recipe.description }));
  const pantryResults = pantry
    .filter((item) => item.name.toLowerCase().includes(term))
    .map((item) => ({ id: item.id, title: item.name, type: "pantry", description: `${item.quantity} ${item.unit} in pantry` }));
  const pages = [
    { id: "/planner", title: "Meal planner", description: "Generate and edit meal plans" },
    { id: "/pantry", title: "Pantry", description: "Manage ingredients at home" },
    { id: "/shopping-list", title: "Shopping list", description: "Review ingredients to buy" },
    { id: "/nutrition", title: "Nutrition", description: "Track estimated nutrition targets" },
    { id: "/favorites", title: "Saved recipes", description: "Open your personal cookbook" },
    { id: "/history", title: "Plan history", description: "View past meal plans" },
    { id: "/settings", title: "Preferences", description: "Edit goals, allergies and budget" },
  ].filter((page) => page.title.toLowerCase().includes(term))
    .map((page) => ({ ...page, type: "page" }));
  return [...recipeResults, ...pantryResults, ...pages].slice(0, 15);
}

export async function latestPlan(): Promise<MealPlan | undefined> {
  const rows = await readPlans();
  return rows[0];
}
