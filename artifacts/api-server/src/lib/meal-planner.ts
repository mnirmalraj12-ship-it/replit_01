import { randomUUID } from "node:crypto";
import type {
  MealPlan,
  Nutrition,
  PlannedMeal,
  Preferences,
  Recipe,
} from "@workspace/api-zod";

const allergyAliases: Record<string, string[]> = {
  peanut: ["peanut", "groundnut", "peanut butter"],
  peanuts: ["peanut", "groundnut", "peanut butter"],
  milk: ["milk", "curd", "yogurt", "paneer", "cheese", "butter"],
  egg: ["egg", "omelette"],
  soy: ["soy", "tofu", "soya"],
  wheat: ["wheat", "atta", "bread", "roti", "chapati"],
  gluten: ["wheat", "gluten", "bread", "roti", "chapati", "pasta"],
  fish: ["fish"],
  shellfish: ["shellfish", "prawn", "shrimp"],
  "tree nuts": ["almond", "cashew", "walnut", "pistachio"],
  sesame: ["sesame", "tahini"],
};

const normalized = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

export function recipeIsAllowed(recipe: Recipe, prefs: Preferences): boolean {
  const diet = prefs.diet.toLowerCase();
  if (diet === "vegan" && !recipe.diet.includes("Vegan")) return false;
  if (diet === "vegetarian" && !recipe.diet.includes("Vegetarian") && !recipe.diet.includes("Vegan")) return false;
  if (diet === "eggetarian"
    && !recipe.diet.includes("Vegan")
    && !recipe.diet.includes("Vegetarian")
    && !/egg|omelette/i.test(recipe.name)) return false;
  if ((diet === "pescatarian" || diet === "pescetarian")
    && recipe.diet.includes("Non-Vegetarian")
    && !/fish|prawn|shrimp/i.test(recipe.name)) return false;

  const forbidden = [...prefs.allergies, ...prefs.excludedIngredients];
  const content = [
    recipe.name,
    ...recipe.allergens,
    ...recipe.ingredients.map((ingredient) => ingredient.name),
  ].map(normalized);
  for (const blocked of forbidden) {
    const aliases = allergyAliases[blocked.toLowerCase()] ?? [blocked];
    if (aliases.some((alias) => content.some((part) => part.includes(normalized(alias))))) {
      return false;
    }
  }
  return recipe.cookingTime <= prefs.cookingTime;
}

export function planBudget(prefs: Preferences, duration: number): number {
  const daily = prefs.budgetPeriod === "daily"
    ? prefs.budget
    : prefs.budgetPeriod === "monthly"
      ? prefs.budget / 30
      : prefs.budget / 7;
  return Math.round(daily * duration * 100) / 100;
}

const mealTypes = (count: number): string[] => {
  if (count <= 2) return ["Breakfast", "Dinner"];
  if (count === 3) return ["Breakfast", "Lunch", "Dinner"];
  if (count === 4) return ["Breakfast", "Lunch", "Snack", "Dinner"];
  return ["Breakfast", "Snack", "Lunch", "Snack", "Dinner"].slice(0, count);
};

const emptyNutrition = (): Nutrition => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
});

function pantryScore(recipe: Recipe, pantryNames: Set<string>): number {
  if (!recipe.ingredients.length) return 0;
  const matches = recipe.ingredients.filter((item) => pantryNames.has(normalized(item.name))).length;
  return matches / recipe.ingredients.length;
}

function scoreRecipe(
  recipe: Recipe,
  prefs: Preferences,
  pantryNames: Set<string>,
  dailyBudget: number,
  used: Set<string>,
  optimizeBudget: boolean,
): number {
  const targetCalories = prefs.calories / prefs.mealsPerDay;
  const targetProtein = prefs.protein / prefs.mealsPerDay;
  const calorieMatch = Math.max(0, 1 - Math.abs(recipe.nutrition.calories - targetCalories) / Math.max(targetCalories, 1));
  const proteinMatch = Math.min(1, recipe.nutrition.protein / Math.max(targetProtein, 1));
  const nutrition = (calorieMatch * 0.45) + (proteinMatch * 0.55);
  const mealBudget = dailyBudget / prefs.mealsPerDay / prefs.servings;
  const budget = Math.max(0, 1 - recipe.cost / Math.max(mealBudget, 1));
  const pantry = pantryScore(recipe, pantryNames);
  const cuisine = prefs.cuisine.toLowerCase() === "mixed" || prefs.cuisine.toLowerCase() === "indian"
    ? (recipe.cuisine.toLowerCase().includes("indian") || recipe.cuisine.toLowerCase().includes(prefs.cuisine.toLowerCase()) ? 1 : 0.35)
    : (recipe.cuisine.toLowerCase().includes(prefs.cuisine.toLowerCase()) ? 1 : 0.2);
  const time = Math.max(0, 1 - recipe.cookingTime / Math.max(prefs.cookingTime, 1));
  const variety = used.has(recipe.id) ? 0 : 1;
  const ingredientReuse = recipe.ingredients.reduce((score, item) => score + (pantryNames.has(normalized(item.name)) ? 1 : 0), 0) / Math.max(recipe.ingredients.length, 1);
  const weights = optimizeBudget
    ? { nutrition: 0.25, budget: 0.35, pantry: 0.2, cuisine: 0.08, time: 0.07, variety: 0.03, reuse: 0.02 }
    : { nutrition: 0.3, budget: 0.25, pantry: 0.2, cuisine: 0.1, time: 0.1, variety: 0.03, reuse: 0.02 };
  return nutrition * weights.nutrition
    + budget * weights.budget
    + pantry * weights.pantry
    + cuisine * weights.cuisine
    + time * weights.time
    + variety * weights.variety
    + ingredientReuse * weights.reuse;
}

export function createMealPlan(
  recipes: Recipe[],
  prefs: Preferences,
  pantryNames: Set<string>,
  duration: number,
  optimizeBudget = true,
): MealPlan {
  const safe = recipes.filter((recipe) => recipeIsAllowed(recipe, prefs));
  if (!safe.length) {
    throw new Error("No recipes match your diet, allergy, ingredient, and cooking-time requirements.");
  }
  const dailyBudget = planBudget(prefs, 1);
  const slots = mealTypes(prefs.mealsPerDay);
  const days = Array.from({ length: duration }, (_, dayIndex) => {
    const date = new Date();
    date.setDate(date.getDate() + dayIndex);
    const planDate = new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`);
    const dayKey = planDate.toISOString().slice(0, 10);
    const usedToday = new Set<string>();
    let remainingDailyBudget = dailyBudget;
    const meals: PlannedMeal[] = slots.map((mealType, mealIndex) => {
      const remainingSlots = slots.length - mealIndex - 1;
      const cheapestRemainder = Math.min(
        ...safe.map((item) => item.cost * prefs.servings),
      ) * remainingSlots;
      const candidates = safe
        .filter((recipe) => !usedToday.has(recipe.id))
        .filter((recipe) =>
          recipe.cost * prefs.servings + cheapestRemainder <= remainingDailyBudget)
        .sort((left, right) =>
          scoreRecipe(right, prefs, pantryNames, dailyBudget, usedToday, optimizeBudget)
          - scoreRecipe(left, prefs, pantryNames, dailyBudget, usedToday, optimizeBudget)
          || left.id.localeCompare(right.id));
      const fallback = safe
        .filter((recipe) => !usedToday.has(recipe.id))
        .sort((left, right) => left.cost - right.cost || left.id.localeCompare(right.id))[0]
        ?? safe[(dayIndex + mealIndex) % safe.length];
      const recipe = candidates[0] ?? fallback;
      remainingDailyBudget -= recipe.cost * prefs.servings;
      usedToday.add(recipe.id);
      return {
        id: `meal-${dayIndex + 1}-${mealIndex + 1}-${recipe.id}`,
        day: dayKey,
        mealType,
        recipe,
        servings: prefs.servings,
      };
    });
    return { date: planDate, meals };
  });
  const nutrition = emptyNutrition();
  let estimatedCost = 0;
  for (const day of days) {
    for (const meal of day.meals) {
      estimatedCost += meal.recipe.cost * meal.servings;
      for (const key of Object.keys(nutrition) as Array<keyof Nutrition>) {
        nutrition[key] += meal.recipe.nutrition[key] * meal.servings;
      }
    }
  }
  const budget = planBudget(prefs, duration);
  if (estimatedCost > budget) {
    throw new Error(`Your current requirements cannot be satisfied within ${prefs.currency}${Math.round(budget)}. Try relaxing the budget, calories, cooking time, or ingredient restrictions.`);
  }
  return {
    id: `plan-${randomUUID()}`,
    createdAt: new Date(),
    days,
    estimatedCost: Math.round(estimatedCost * 100) / 100,
    budget,
    nutrition: {
      calories: Math.round(nutrition.calories),
      protein: Math.round(nutrition.protein),
      carbs: Math.round(nutrition.carbs),
      fat: Math.round(nutrition.fat),
      fiber: Math.round(nutrition.fiber),
    },
    duration,
  };
}

export function createNutritionOverview(
  plan: MealPlan | undefined,
  prefs: Preferences,
): {
  target: Nutrition;
  consumed: Nutrition;
  weekly: Array<{ day: string; nutrition: Nutrition; cost: number }>;
  insights: string[];
} {
  const target = {
    calories: prefs.calories,
    protein: prefs.protein,
    carbs: prefs.carbs,
    fat: prefs.fat,
    fiber: prefs.fiber,
  };
  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = plan?.days.find((day) => {
    const dateValue = day.date instanceof Date ? day.date.toISOString() : String(day.date);
    return dateValue.slice(0, 10) === today;
  })?.meals ?? [];
  const consumed = todayMeals.reduce((sum, meal) => {
    for (const key of Object.keys(sum) as Array<keyof Nutrition>) {
      sum[key] += meal.recipe.nutrition[key] * meal.servings;
    }
    return sum;
  }, emptyNutrition());
  const weekly = (plan?.days ?? []).slice(0, 7).map((day) => ({
    day: new Date(`${day.date instanceof Date ? day.date.toISOString().slice(0, 10) : String(day.date).slice(0, 10)}T12:00:00`).toLocaleDateString("en", { weekday: "short" }),
    nutrition: day.meals.reduce((sum, meal) => {
      for (const key of Object.keys(sum) as Array<keyof Nutrition>) {
        sum[key] += meal.recipe.nutrition[key] * meal.servings;
      }
      return sum;
    }, emptyNutrition()),
    cost: day.meals.reduce((sum, meal) => sum + meal.recipe.cost * meal.servings, 0),
  }));
  const avgCalories = weekly.length
    ? weekly.reduce((sum, day) => sum + day.nutrition.calories, 0) / weekly.length
    : 0;
  const avgProtein = weekly.length
    ? weekly.reduce((sum, day) => sum + day.nutrition.protein, 0) / weekly.length
    : 0;
  const insights = [
    avgProtein && avgProtein < prefs.protein ? "Protein intake is below your daily target on average." : "Your planned meals are on track for your protein goal.",
    avgCalories && Math.abs(avgCalories - prefs.calories) / prefs.calories < 0.15 ? "Your average daily calories are close to your goal." : "Your plan leaves room to adjust daily calories toward your goal.",
    plan && plan.estimatedCost <= plan.budget ? `Your current plan is ${Math.round((1 - plan.estimatedCost / Math.max(plan.budget, 1)) * 100)}% under its budget.` : "Generate a plan to see your weekly budget insight.",
  ];
  return { target, consumed, weekly, insights };
}
