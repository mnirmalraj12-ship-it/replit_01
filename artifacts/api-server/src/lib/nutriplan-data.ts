import type { Ingredient, Nutrition, Recipe } from "@workspace/api-zod";

const entries: Array<[string, string, number, number, string]> = [
  ["Idli", "South Indian", 28, 25, "rice"],
  ["Plain Dosa", "South Indian", 35, 30, "rice"],
  ["Masala Dosa", "South Indian", 58, 35, "potato"],
  ["Vegetable Upma", "South Indian", 32, 25, "semolina"],
  ["Poha", "Indian", 30, 20, "flattened rice"],
  ["Vegetable Pulao", "Indian", 48, 35, "rice"],
  ["Dal Rice", "Indian", 42, 30, "dal"],
  ["Sambar Rice", "South Indian", 45, 35, "rice"],
  ["Curd Rice", "South Indian", 32, 15, "curd"],
  ["Lemon Rice", "South Indian", 30, 20, "rice"],
  ["Tomato Rice", "South Indian", 35, 25, "rice"],
  ["Vegetable Khichdi", "Indian", 38, 30, "rice"],
  ["Chapati & Mixed Dal", "North Indian", 48, 35, "wheat flour"],
  ["Roti & Vegetable Curry", "North Indian", 52, 35, "wheat flour"],
  ["Paneer Curry & Rice", "North Indian", 88, 40, "paneer"],
  ["Palak Paneer", "North Indian", 92, 40, "paneer"],
  ["Rajma Chawal", "North Indian", 55, 45, "kidney beans"],
  ["Chole & Roti", "North Indian", 55, 40, "chickpeas"],
  ["Sprouts Chaat", "Indian", 36, 15, "sprouts"],
  ["Masala Oats", "Indian", 38, 15, "oats"],
  ["Vegetable Curry & Rice", "Indian", 48, 35, "rice"],
  ["Besan Chilla", "North Indian", 35, 20, "gram flour"],
  ["Aloo Paratha", "North Indian", 42, 35, "potato"],
  ["Vegetable Biryani", "Indian", 62, 50, "rice"],
  ["Moong Dal Cheela", "Indian", 40, 25, "moong dal"],
  ["Chickpea Salad", "Mediterranean", 72, 20, "chickpeas"],
  ["Peanut Noodles", "Asian", 70, 25, "noodles"],
  ["Tofu Stir-Fry", "Asian", 92, 25, "tofu"],
  ["Lentil Soup", "Mediterranean", 62, 35, "lentils"],
  ["Vegetable Fried Rice", "Asian", 65, 25, "rice"],
  ["Overnight Oats", "Western", 58, 5, "oats"],
  ["Greek Yogurt Parfait", "Western", 78, 10, "yogurt"],
  ["Peanut Butter Banana Toast", "Western", 55, 10, "peanut butter"],
  ["Spinach Mushroom Omelette", "Western", 72, 15, "egg"],
  ["Avocado Chickpea Toast", "Western", 98, 15, "chickpeas"],
  ["Chicken Curry & Rice", "Indian", 115, 50, "chicken"],
  ["Chicken Tikka Bowl", "Indian", 125, 40, "chicken"],
  ["Egg Curry & Roti", "Indian", 68, 35, "egg"],
  ["Masala Egg Bhurji", "Indian", 54, 20, "egg"],
  ["Fish Curry & Rice", "South Indian", 132, 45, "fish"],
  ["Grilled Fish & Vegetables", "Mediterranean", 148, 30, "fish"],
  ["Turkey Bean Chili", "Western", 138, 45, "turkey"],
  ["Chicken Hummus Wrap", "Mediterranean", 108, 25, "chicken"],
  ["Mushroom Risotto", "Western", 112, 45, "mushroom"],
  ["Quinoa Power Bowl", "Western", 125, 30, "quinoa"],
  ["Coconut Lentil Curry", "Asian", 78, 35, "lentils"],
  ["Roasted Vegetable Couscous", "Mediterranean", 92, 30, "couscous"],
  ["Black Bean Tacos", "International", 85, 25, "black beans"],
  ["Pesto Pasta", "Mediterranean", 105, 25, "pasta"],
  ["Baked Falafel Bowl", "Mediterranean", 88, 40, "chickpeas"],
];

const categoryFor = (name: string): string => {
  if (/rice|oats|wheat|semolina|noodles|pasta|quinoa|couscous|bread/i.test(name)) return "Grains";
  if (/curd|yogurt|paneer|cheese|milk|butter/i.test(name)) return "Dairy";
  if (/chicken|egg|fish|turkey|tofu|dal|lentil|beans|chickpea|peanut|sprout/i.test(name)) return "Protein";
  if (/tomato|onion|potato|spinach|vegetable|mushroom|avocado|banana|lemon/i.test(name)) return "Vegetables";
  return "Spices";
};

const slug = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function ingredientsFor(name: string, protein: string): Ingredient[] {
  const items: Ingredient[] = [
    { name: protein, quantity: 120, unit: "g", category: categoryFor(protein) },
  ];
  const lowerName = name.toLowerCase();
  const add = (ingredient: Ingredient) => {
    if (!items.some((item) => item.name.toLowerCase() === ingredient.name.toLowerCase())) {
      items.push(ingredient);
    }
  };
  const sweet = /oats|parfait|toast/i.test(name);
  if (!sweet && /curry|dal|chole|rajma|masala|biryani|pulao|khichdi|rice|chili|tikka|bhurji/i.test(name)
    && !/lemon rice|curd rice|fried rice/i.test(lowerName)) {
    add({ name: "Onion", quantity: 50, unit: "g", category: "Vegetables" });
  }
  if (!sweet && /tomato|curry|dal|chole|rajma|biryani|pulao|khichdi|chili/i.test(name)
    && !/lemon rice|curd rice|fried rice/i.test(lowerName)) {
    add({ name: "Tomato", quantity: 80, unit: "g", category: "Vegetables" });
  }
  if (!sweet) {
    add({ name: "Cooking oil", quantity: 5, unit: "ml", category: "Spices" });
    add({ name: "Cumin & spices", quantity: 4, unit: "g", category: "Spices" });
  }
  if (/rice|chawal|bowl|pulao|biryani|khichdi/i.test(name)) {
    add({ name: "Rice", quantity: 75, unit: "g", category: "Grains" });
  } else if (/oats/i.test(name)) {
    add({ name: "Oats", quantity: 50, unit: "g", category: "Grains" });
    add({ name: "Milk", quantity: 120, unit: "ml", category: "Dairy" });
    add({ name: "Banana", quantity: 60, unit: "g", category: "Produce" });
  } else if (/parfait/i.test(name)) {
    add({ name: "Granola", quantity: 35, unit: "g", category: "Grains" });
    add({ name: "Berries", quantity: 70, unit: "g", category: "Produce" });
  } else if (/salad|chaat/i.test(name)) {
    add({ name: "Cucumber", quantity: 60, unit: "g", category: "Produce" });
    add({ name: "Lemon", quantity: 10, unit: "g", category: "Produce" });
  } else if (/roti|chapati|paratha|wrap|toast|taco|chilla|cheela|dosa|idli|pasta|noodle|couscous/i.test(name)) {
    const grain = /pasta/i.test(name) ? "Pasta" : /noodle/i.test(name) ? "Noodles" : /toast/i.test(name) ? "Bread" : /taco/i.test(name) ? "Corn tortillas" : "Wheat flour";
    add({ name: grain, quantity: 75, unit: "g", category: "Grains" });
  } else {
    add({ name: "Mixed vegetables", quantity: 100, unit: "g", category: "Vegetables" });
  }
  if (/paneer|curd|yogurt|parfait|risotto|pesto/i.test(name)) add({ name: "Curd", quantity: 60, unit: "g", category: "Dairy" });
  if (/peanut/i.test(name)) add({ name: "Peanuts", quantity: 15, unit: "g", category: "Protein" });
  return items;
}

function instructionsFor(name: string): string[] {
  if (/idli|dosa/i.test(name)) return [
    "Prepare the fermented batter and season it lightly.",
    /idli/i.test(name) ? "Steam the batter in greased idli moulds until set." : "Spread the batter thinly on a hot pan and cook until crisp at the edges.",
    "Cook the potato or filling separately if the recipe calls for one.",
    "Serve hot with chutney or sambar.",
  ];
  if (/rice|chawal|pulao|biryani|khichdi/i.test(name)) return [
    "Rinse the rice and soak briefly while you prepare the vegetables and spices.",
    "Cook the onion and spices in oil until fragrant; add the vegetables and main ingredient.",
    "Stir in the rice and water, cover and cook until the grains are tender.",
    "Rest for five minutes, fluff gently and serve.",
  ];
  if (/curry|dal|chole|rajma|sambar|chili/i.test(name)) return [
    "Rinse and prepare the main ingredient; chop the vegetables and aromatics.",
    "Cook the onion, spices and vegetables until softened and fragrant.",
    "Add the main ingredient with water or stock, then simmer until tender and the sauce thickens.",
    "Taste, adjust the seasoning and serve with the listed grain or bread.",
  ];
  if (/salad|chaat|toast|parfait|oats/i.test(name)) return [
    "Wash and prepare the fresh ingredients; measure the grains, dairy or spread.",
    "Cook or toast the grain if needed, then allow it to cool slightly.",
    "Layer or toss the ingredients with the listed seasoning and dressing.",
    "Finish with the fresh toppings and serve.",
  ];
  if (/grilled|roasted|tikka|falafel/i.test(name)) return [
    "Preheat the oven or pan and prepare the vegetables and protein.",
    "Coat the main ingredients with oil and the listed spices.",
    "Roast, grill or pan-cook until browned and cooked through.",
    "Serve with the grain or vegetables and adjust seasoning to taste.",
  ];
  return [
    "Prepare and measure the ingredients listed for this recipe.",
    "Cook the main ingredient with the vegetables and seasoning until tender and fragrant.",
    "Add the grain, sauce or dairy ingredient and cook until everything is heated through.",
    "Taste, adjust the seasoning and serve warm.",
  ];
}

export const recipeCatalog: Recipe[] = entries.map(([name, cuisine, cost, cookingTime, proteinSource], index) => {
  const isAnimal = /chicken|egg|fish|turkey/i.test(name);
  const isDairy = /paneer|curd|yogurt|parfait|risotto|pesto/i.test(name);
  const isPeanut = /peanut/i.test(name);
  const isEgg = /egg|omelette/i.test(name);
  const allergens = [
    ...(isDairy ? ["Milk"] : []),
    ...(isEgg && !isAnimal ? ["Egg"] : []),
    ...(isPeanut ? ["Peanuts"] : []),
    ...(/wheat|roti|chapati|paratha|toast|wrap|pasta|couscous|noodle|dosa|idli|semolina|upma|pesto/i.test(name) ? ["Wheat", "Gluten"] : []),
    ...(/fish/i.test(name) ? ["Fish"] : []),
    ...(/tofu/i.test(name) ? ["Soy"] : []),
  ];
  const diet = isAnimal ? ["Non-Vegetarian"] : isDairy || isEgg ? ["Vegetarian"] : ["Vegan", "Vegetarian"];
  const baseProtein = isAnimal ? 28 : /paneer|tofu|chickpea|beans|lentil|dal|sprout|egg|quinoa/i.test(name) ? 19 : 10;
  const nutrition: Nutrition = {
    calories: 300 + (index % 5) * 65 + Math.round(cost / 4),
    protein: baseProtein + (index % 4) * 3,
    carbs: 34 + (index % 5) * 8,
    fat: 8 + (index % 5) * 3,
    fiber: 4 + (index % 4) * 2,
  };
  const firstIngredient = ingredientsFor(name, proteinSource);
  return {
    id: slug(name),
    name,
    description: `${cuisine} ${name.toLowerCase()} with a balanced mix of pantry staples and fresh ingredients. Nutrition and cost are estimates.`,
    cuisine,
    diet,
    allergens: [...new Set(allergens)],
    ingredients: firstIngredient,
    nutrition,
    cost,
    cookingTime,
    servings: 1,
    instructions: instructionsFor(name),
    image: "",
  };
});

export const pantryDefaults = [
  { id: "pantry-rice", name: "Rice", quantity: 2, unit: "kg", category: "Grains", expiryDate: null },
  { id: "pantry-dal", name: "Dal", quantity: 1, unit: "kg", category: "Protein", expiryDate: null },
  { id: "pantry-oats", name: "Oats", quantity: 500, unit: "g", category: "Grains", expiryDate: null },
  { id: "pantry-tomato", name: "Tomato", quantity: 500, unit: "g", category: "Vegetables", expiryDate: null },
  { id: "pantry-onion", name: "Onion", quantity: 500, unit: "g", category: "Vegetables", expiryDate: null },
  { id: "pantry-potato", name: "Potato", quantity: 1, unit: "kg", category: "Vegetables", expiryDate: null },
  { id: "pantry-paneer", name: "Paneer", quantity: 200, unit: "g", category: "Dairy", expiryDate: null },
  { id: "pantry-curd", name: "Curd", quantity: 400, unit: "g", category: "Dairy", expiryDate: null },
];
