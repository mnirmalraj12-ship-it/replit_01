import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  AddFavoriteBody,
  AddFavoriteResponse,
  AddPantryItemBody,
  AddPantryItemResponse,
  AddShoppingItemBody,
  AddShoppingItemResponse,
  DeletePantryItemParams,
  DeleteShoppingItemParams,
  GenerateMealPlanBody,
  GenerateMealPlanResponse,
  GetDashboardResponse,
  GetMealPlanParams,
  GetMealPlanResponse,
  GetNutritionResponse,
  GetPreferencesResponse,
  GetRecipeParams,
  GetRecipeResponse,
  GetShoppingListParams,
  GetShoppingListResponse,
  ListFavoritesResponse,
  ListMealPlansResponse,
  ListPantryResponse,
  ListRecipesQueryParams,
  ListRecipesResponse,
  RemoveFavoriteParams,
  RemoveFavoriteResponse,
  ReplacePlanMealBody,
  ReplacePlanMealParams,
  ReplacePlanMealResponse,
  SavePreferencesBody,
  SavePreferencesResponse,
  SearchAppQueryParams,
  SearchAppResponse,
  UpdatePantryItemBody,
  UpdatePantryItemParams,
  UpdatePantryItemResponse,
  UpdateShoppingItemBody,
  UpdateShoppingItemParams,
  UpdateShoppingItemResponse,
} from "@workspace/api-zod";
import { createMealPlan, createNutritionOverview, recipeIsAllowed } from "../lib/meal-planner";
import {
  addRecipeFavorite,
  createPantryItem,
  createShoppingItem,
  editPantryItem,
  editShoppingItem,
  ensureDemoData,
  findRecipes,
  latestPlan,
  readFavorites,
  readOrCreateShoppingList,
  readPantry,
  readPlan,
  readPreferences,
  readRecipe,
  readRecipes,
  readPlans,
  removePantryItem,
  removeRecipeFavorite,
  removeShoppingItem,
  replacePlan,
  savePlan,
  writePreferences,
} from "../lib/nutriplan-store";
import type { MealPlan, Nutrition, PlannedMeal } from "@workspace/api-zod";

const router: IRouter = Router();

async function ensureInitialPlan(): Promise<MealPlan | undefined> {
  const existing = await latestPlan();
  if (existing) return existing;
  const prefs = await readPreferences();
  const recipes = await readRecipes();
  const pantry = await readPantry();
  return savePlan(createMealPlan(
    recipes,
    prefs,
    new Set(pantry.map((item) => item.name.toLowerCase())),
    7,
    true,
  ));
}

function aggregateMeals(meals: PlannedMeal[]): Nutrition {
  return meals.reduce<Nutrition>((sum, meal) => {
    sum.calories += meal.recipe.nutrition.calories * meal.servings;
    sum.protein += meal.recipe.nutrition.protein * meal.servings;
    sum.carbs += meal.recipe.nutrition.carbs * meal.servings;
    sum.fat += meal.recipe.nutrition.fat * meal.servings;
    sum.fiber += meal.recipe.nutrition.fiber * meal.servings;
    return sum;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  await ensureDemoData();
  const [preferences, pantry, favorites, currentPlan] = await Promise.all([
    readPreferences(),
    readPantry(),
    readFavorites(),
    ensureInitialPlan(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = currentPlan?.days.find((day) => {
    const dayDate = day.date instanceof Date ? day.date.toISOString() : String(day.date);
    return dayDate.slice(0, 10) === today;
  })?.meals ?? [];
  const expiringItems = pantry.filter((item) => {
    if (!item.expiryDate) return false;
    const expiry = item.expiryDate instanceof Date
      ? item.expiryDate
      : new Date(String(item.expiryDate));
    const days = (expiry.getTime() - Date.now()) / 86_400_000;
    return days >= 0 && days <= 5;
  });
  const response = GetDashboardResponse.parse({
    preferences,
    pantryCount: pantry.length,
    favoriteCount: favorites.length,
    currentPlan: currentPlan ?? {
      id: "empty",
      createdAt: new Date(),
      days: [],
      estimatedCost: 0,
      budget: preferences.budget,
      nutrition: aggregateMeals([]),
      duration: 0,
    },
    todayMeals,
    expiringItems,
    weeklyNutrition: createNutritionOverview(currentPlan, preferences),
  });
  res.json(response);
});

router.get("/preferences", async (_req, res): Promise<void> => {
  res.json(GetPreferencesResponse.parse(await readPreferences()));
});

router.put("/preferences", async (req, res): Promise<void> => {
  const parsed = SavePreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please check the preference values and try again." });
    return;
  }
  const response = SavePreferencesResponse.parse(await writePreferences(parsed.data));
  res.json(response);
});

router.get("/recipes", async (req, res): Promise<void> => {
  const query = ListRecipesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid recipe filters." });
    return;
  }
  let recipes = await readRecipes();
  const search = query.data.search?.trim().toLowerCase();
  if (search) {
    recipes = recipes.filter((recipe) =>
      recipe.name.toLowerCase().includes(search)
      || recipe.cuisine.toLowerCase().includes(search)
      || recipe.ingredients.some((item) => item.name.toLowerCase().includes(search)));
  }
  const diet = query.data.diet?.toLowerCase();
  if (diet) recipes = recipes.filter((recipe) => recipe.diet.some((tag) => tag.toLowerCase().includes(diet)));
  const category = query.data.category?.toLowerCase();
  if (category) {
    if (category === "high protein") recipes = recipes.filter((recipe) => recipe.nutrition.protein >= 20);
    else if (category === "budget") recipes = recipes.filter((recipe) => recipe.cost <= 60);
    else if (category === "quick") recipes = recipes.filter((recipe) => recipe.cookingTime <= 30);
    else if (category === "international") recipes = recipes.filter((recipe) => !recipe.cuisine.toLowerCase().includes("indian"));
    else recipes = recipes.filter((recipe) => recipe.cuisine.toLowerCase().includes(category));
  }
  res.json(ListRecipesResponse.parse(recipes));
});

router.get("/recipes/:recipeId", async (req, res): Promise<void> => {
  const params = GetRecipeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid recipe." });
    return;
  }
  const recipe = await readRecipe(params.data.recipeId);
  if (!recipe) {
    res.status(404).json({ error: "Recipe not found." });
    return;
  }
  res.json(GetRecipeResponse.parse(recipe));
});

router.get("/pantry", async (_req, res): Promise<void> => {
  res.json(ListPantryResponse.parse(await readPantry()));
});

router.post("/pantry", async (req, res): Promise<void> => {
  const parsed = AddPantryItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please enter an ingredient name, quantity, and unit." });
    return;
  }
  res.status(201).json(AddPantryItemResponse.parse(await createPantryItem(parsed.data)));
});

router.put("/pantry/:itemId", async (req, res): Promise<void> => {
  const params = UpdatePantryItemParams.safeParse(req.params);
  const body = UpdatePantryItemBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Please check the pantry item and try again." });
    return;
  }
  const item = await editPantryItem(params.data.itemId, body.data);
  if (!item) {
    res.status(404).json({ error: "Pantry item not found." });
    return;
  }
  res.json(UpdatePantryItemResponse.parse(item));
});

router.delete("/pantry/:itemId", async (req, res): Promise<void> => {
  const params = DeletePantryItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid pantry item." });
    return;
  }
  if (!(await removePantryItem(params.data.itemId))) {
    res.status(404).json({ error: "Pantry item not found." });
    return;
  }
  res.sendStatus(204);
});

router.get("/meal-plans", async (_req, res): Promise<void> => {
  await ensureDemoData();
  await ensureInitialPlan();
  res.json(ListMealPlansResponse.parse(await readPlans()));
});

router.post("/meal-plans/generate", async (req, res): Promise<void> => {
  const parsed = GenerateMealPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a valid plan duration." });
    return;
  }
  try {
    const [prefs, recipes, pantry] = await Promise.all([readPreferences(), readRecipes(), readPantry()]);
    const plan = createMealPlan(
      recipes,
      prefs,
      new Set(pantry.map((item) => item.name.toLowerCase())),
      parsed.data.duration,
      parsed.data.optimizeBudget ?? true,
    );
    res.status(201).json(GenerateMealPlanResponse.parse(await savePlan(plan)));
  } catch (error) {
    res.status(422).json({
      error: error instanceof Error
        ? error.message
        : "We could not create a plan with those requirements.",
    });
  }
});

router.get("/meal-plans/:planId", async (req, res): Promise<void> => {
  const params = GetMealPlanParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid plan." });
    return;
  }
  const plan = await readPlan(params.data.planId);
  if (!plan) {
    res.status(404).json({ error: "Meal plan not found." });
    return;
  }
  res.json(GetMealPlanResponse.parse(plan));
});

router.post("/meal-plans/:planId/replace-meal", async (req, res): Promise<void> => {
  const params = ReplacePlanMealParams.safeParse(req.params);
  const body = ReplacePlanMealBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Choose a meal to replace." });
    return;
  }
  const plan = await readPlan(params.data.planId);
  if (!plan) {
    res.status(404).json({ error: "Meal plan not found." });
    return;
  }
  const prefs = await readPreferences();
  const recipes = await readRecipes();
  const safeRecipes = recipes.filter((recipe) => recipeIsAllowed(recipe, prefs));
  let replaced = false;
  const days = plan.days.map((day) => ({
    ...day,
    meals: day.meals.map((meal) => {
      if (meal.id !== body.data.mealId) return meal;
      const replacement = safeRecipes
        .filter((recipe) => recipe.id !== meal.recipe.id)
        .sort((left, right) =>
          (left.cost - right.cost)
          || left.name.localeCompare(right.name))[0];
      if (!replacement) return meal;
      replaced = true;
      return { ...meal, id: `meal-${randomUUID()}`, recipe: replacement };
    }),
  }));
  if (!replaced) {
    res.status(404).json({ error: "That meal could not be replaced." });
    return;
  }
  const meals = days.flatMap((day) => day.meals);
  const estimatedCost = meals.reduce((sum, meal) => sum + meal.recipe.cost * meal.servings, 0);
  const dailyNutrition = aggregateMeals(meals);
  const updated: MealPlan = {
    ...plan,
    days,
    estimatedCost: Math.round(estimatedCost * 100) / 100,
    nutrition: dailyNutrition,
  };
  if (updated.estimatedCost > updated.budget) {
    res.status(422).json({ error: "That replacement would exceed your plan budget." });
    return;
  }
  res.json(ReplacePlanMealResponse.parse(await replacePlan(updated)));
});

router.get("/shopping-list/:planId", async (req, res): Promise<void> => {
  const params = GetShoppingListParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid plan." });
    return;
  }
  const list = await readOrCreateShoppingList(params.data.planId);
  if (!list) {
    res.status(404).json({ error: "Meal plan not found." });
    return;
  }
  res.json(GetShoppingListResponse.parse(list));
});

router.post("/shopping-items", async (req, res): Promise<void> => {
  const parsed = AddShoppingItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please check the shopping item details." });
    return;
  }
  const item = await createShoppingItem(parsed.data);
  if (!item) {
    res.status(404).json({ error: "Meal plan not found." });
    return;
  }
  res.status(201).json(AddShoppingItemResponse.parse(item));
});

router.put("/shopping-items/:itemId", async (req, res): Promise<void> => {
  const params = UpdateShoppingItemParams.safeParse(req.params);
  const body = UpdateShoppingItemBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Please check the shopping item details." });
    return;
  }
  const item = await editShoppingItem(params.data.itemId, body.data);
  if (!item) {
    res.status(404).json({ error: "Shopping item not found." });
    return;
  }
  res.json(UpdateShoppingItemResponse.parse(item));
});

router.delete("/shopping-items/:itemId", async (req, res): Promise<void> => {
  const params = DeleteShoppingItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid shopping item." });
    return;
  }
  if (!(await removeShoppingItem(params.data.itemId))) {
    res.status(404).json({ error: "Shopping item not found." });
    return;
  }
  res.sendStatus(204);
});

router.get("/favorites", async (_req, res): Promise<void> => {
  res.json(ListFavoritesResponse.parse(await readFavorites()));
});

router.post("/favorites", async (req, res): Promise<void> => {
  const parsed = AddFavoriteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a recipe to save." });
    return;
  }
  if (!(await addRecipeFavorite(parsed.data.recipeId))) {
    res.status(404).json({ error: "Recipe not found." });
    return;
  }
  const recipe = await readRecipe(parsed.data.recipeId);
  res.status(201).json(AddFavoriteResponse.parse(recipe));
});

router.delete("/favorites/:recipeId", async (req, res): Promise<void> => {
  const params = RemoveFavoriteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid recipe." });
    return;
  }
  if (!(await removeRecipeFavorite(params.data.recipeId))) {
    res.status(404).json({ error: "Favorite not found." });
    return;
  }
  res.sendStatus(204);
});

router.get("/nutrition", async (_req, res): Promise<void> => {
  const [prefs, currentPlan] = await Promise.all([readPreferences(), ensureInitialPlan()]);
  res.json(GetNutritionResponse.parse(createNutritionOverview(currentPlan, prefs)));
});

router.get("/search", async (req, res): Promise<void> => {
  const query = SearchAppQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Enter a search term." });
    return;
  }
  res.json(SearchAppResponse.parse(await findRecipes(query.data.q)));
});

export default router;
