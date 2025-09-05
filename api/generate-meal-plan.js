// api/generate-meal-plan.js
export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { familySize, budget, days, preferences = {} } = req.body;

    console.log('Generating meal plan:', { familySize, budget, days, preferences });

    // Simulate AI meal plan generation
    const sampleMealPlan = generateSampleMealPlan(familySize, budget, days, preferences);

    const response = {
      success: true,
      mealPlan: sampleMealPlan.meals,
      totalCost: sampleMealPlan.totalCost,
      totalDealMatches: sampleMealPlan.dealMatches,
      totalIngredients: sampleMealPlan.totalIngredients,
      shoppingList: sampleMealPlan.shoppingList,
      savings: budget - sampleMealPlan.totalCost,
      summary: `Smart ${days}-dages madplan med skjulte sundhedsopgraderinger. ${Math.round((sampleMealPlan.dealMatches/sampleMealPlan.totalIngredients)*100)}% af ingredienserne er på tilbud.`,
      generatedAt: new Date().toISOString()
    };

    console.log('Meal plan generated successfully');
    
    return res.status(200).json(response);

  } catch (error) {
    console.error('Meal plan generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Der opstod en fejl ved generering af madplan'
    });
  }
}

// Sample meal plan generator
function generateSampleMealPlan(familySize, budget, days, preferences) {
  const danishRecipes = [
    {
      day: 1,
      recipe: "Bedre Frikadeller",
      servings: familySize,
      cost: Math.round(45 * (familySize / 4)),
      dealMatches: 4,
      stealthUpgrade: "50% kød erstattes med røde linser - usynlige når kogt og øger protein med 30%",
      ingredients: [
        { item: "Hakket oksekød", price: 49, onSale: true, store: "Netto" },
        { item: "Røde linser", price: 19, onSale: true, store: "Coop" },
        { item: "Løg", price: 12, onSale: true, store: "Rema 1000" },
        { item: "Æg", price: 8, onSale: false, store: "Almindelig" }
      ]
    },
    {
      day: 2,
      recipe: "Skjulte Grøntsagsboller",
      servings: familySize,
      cost: Math.round(38 * (familySize / 4)),
      dealMatches: 3,
      stealthUpgrade: "Gulerødder og pastinakker moses ind i dejen - giver vitaminer og naturlig sødme",
      ingredients: [
        { item: "Hvedemel", price: 15, onSale: false, store: "Almindelig" },
        { item: "Gulerødder", price: 13, onSale: true, store: "Lidl" },
        { item: "Mælk", price: 18, onSale: true, store: "Føtex" },
        { item: "Smør", price: 25, onSale: true, store: "Coop" }
      ]
    },
    {
      day: 3,
      recipe: "Kraftig Kartoffelsalat",
      servings: familySize,
      cost: Math.round(32 * (familySize / 4)),
      dealMatches: 3,
      stealthUpgrade: "Hvide bønner blandes ind - ligner kartoffelstykker og dobler proteinet",
      ingredients: [
        { item: "Kartofler", price: 20, onSale: true, store: "Netto" },
        { item: "Hvide bønner", price: 12, onSale: true, store: "Rema 1000" },
        { item: "Mayonnaise", price: 22, onSale: false, store: "Almindelig" },
        { item: "Persille", price: 8, onSale: true, store: "Lidl" }
      ]
    }
  ];

  // Adjust for number of days requested
  const meals = danishRecipes.slice(0, days).map(meal => ({
    ...meal,
    day: meal.day <= days ? meal.day : meal.day % days + 1
  }));

  // Add more days if needed
  while (meals.length < days) {
    const baseMeal = danishRecipes[meals.length % danishRecipes.length];
    meals.push({
      ...baseMeal,
      day: meals.length + 1
    });
  }

  const totalCost = meals.reduce((sum, meal) => sum + meal.cost, 0);
  const dealMatches = meals.reduce((sum, meal) => sum + meal.dealMatches, 0);
  const totalIngredients = meals.reduce((sum, meal) => sum + meal.ingredients.length, 0);

  // Generate shopping list organized by store
  const shoppingList = {
    netto: [],
    coop: [],
    rema: [],
    lidl: [],
    foetex: [],
    almindelig: []
  };

  meals.forEach(meal => {
    meal.ingredients.forEach(ing => {
      const storeKey = ing.store.toLowerCase().replace(/\s+/g, '').replace('1000', '');
      let targetList = shoppingList[storeKey] || shoppingList.almindelig;
      
      const existing = targetList.find(item => item.item === ing.item);
      if (!existing) {
        targetList.push({
          item: ing.item,
          price: ing.price,
          onSale: ing.onSale
        });
      }
    });
  });

  return {
    meals,
    totalCost,
    dealMatches,
    totalIngredients,
    shoppingList
  };
}
