// src/server.js - Working Multi-Chain System
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Papa = require('papaparse');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// In-memory data storage
let dealData = [];
let recipeData = [];

// Load CSV data from all supermarket chains and recipe sources
async function loadData() {
  try {
    console.log('Loading CSV files...');
    
    // Load supermarket deals from all chains
    const supermarketFiles = [
      { name: 'Coop', file: 'public/data/TilbudCoop.csv' },
      { name: 'Lidl', file: 'public/data/TilbudLidl.csv' },
      { name: 'Netto', file: 'public/data/TilbudNetto.csv' },
      { name: 'REMA 1000', file: 'public/data/TilbudRema.csv' },
      { name: 'Føtex', file: 'public/data/TilbudFoetex.csv' },
      { name: 'Discount365', file: 'public/data/365.csv' }
    ];

    dealData = [];

    for (const supermarket of supermarketFiles) {
      try {
        const csvData = fs.readFileSync(path.join(__dirname, `../${supermarket.file}`), 'utf8');
        const parsedDeals = Papa.parse(csvData, { header: true, skipEmptyLines: true }).data;
        
        // Clean and add store identifier to each deal
        const dealsWithStore = parsedDeals
          .filter(deal => deal['Deal Name'] && deal['Deal Name'].trim())
          .map(deal => ({
            'Deal Name': deal['Deal Name'].trim(),
            'Amount': (deal.Amount || '').trim(),
            'Price': (deal.Price || 'Se pris').trim(),
            'Category': (deal.Category || 'Other').trim(),
            'Store': supermarket.name
          }));
        
        dealData = [...dealData, ...dealsWithStore];
        console.log(`Loaded ${dealsWithStore.length} deals from ${supermarket.name}`);
        
      } catch (error) {
        console.log(`Warning: ${supermarket.name} CSV file not found - skipping`);
      }
    }

    // Load recipes
    const recipeFiles = [
      { name: 'Arla', file: 'public/data/arla_recipes.csv' },
      { name: 'Valdemarsro', file: 'public/data/valdemarsro_recipes.csv' }
    ];

    recipeData = [];

    for (const recipeSource of recipeFiles) {
      try {
        const csvData = fs.readFileSync(path.join(__dirname, `../${recipeSource.file}`), 'utf8');
        const parsedRecipes = Papa.parse(csvData, { header: true, skipEmptyLines: true }).data;
        
        const recipesWithSource = parsedRecipes
          .filter(recipe => recipe.title && recipe.ingredients)
          .map(recipe => ({
            ...recipe,
            source: recipeSource.name
          }));
        
        recipeData = [...recipeData, ...recipesWithSource];
        console.log(`Loaded ${recipesWithSource.length} recipes from ${recipeSource.name}`);
        
      } catch (error) {
        console.log(`Warning: ${recipeSource.name} CSV file not found`);
      }
    }

    // Fallback to sample data if nothing loaded
    if (dealData.length === 0) {
      dealData = getSampleDeals();
    }
    if (recipeData.length === 0) {
      recipeData = getSampleRecipes();
    }

    console.log(`Server ready: ${dealData.length} deals from ${getUniqueStores().length} stores, ${recipeData.length} recipes`);

  } catch (error) {
    console.error('Error loading data:', error);
    dealData = getSampleDeals();
    recipeData = getSampleRecipes();
  }
}

// Helper functions
function getUniqueStores() {
  return [...new Set(dealData.map(deal => deal.Store))].filter(store => store);
}

function getSampleDeals() {
  return [
    { Category: 'Meat & Poultry', 'Deal Name': 'Hakket oksekød 4-7%', Amount: '500g', Price: '49.00 kr.', Store: 'Coop' },
    { Category: 'Dairy & Eggs', 'Deal Name': 'Galbani mozzarella', Amount: '125g', Price: '16.00 kr.', Store: 'Coop' },
    { Category: 'Organic', 'Deal Name': 'Økologiske gulerødder', Amount: '1kg', Price: '10.-', Store: 'REMA 1000' },
    { Category: 'Meat & Poultry', 'Deal Name': 'Dansk kyllingebryst', Amount: '400g', Price: '29.00 kr.', Store: 'Netto' },
    { Category: 'Dairy & Eggs', 'Deal Name': 'Luftig skyr', Amount: '150g', Price: '8.00 kr.', Store: 'Lidl' }
  ];
}

function getSampleRecipes() {
  return [
    { title: 'Lasagne', persons: 4, ingredients: 'Hakket oksekød, mozzarella, lasagneplader, tomatpuré', source: 'Arla' },
    { title: 'Boller i karry', persons: 4, ingredients: 'Hakket kød, løg, karry, mælk, ris', source: 'Arla' },
    { title: 'Kyllingebryst med salat', persons: 4, ingredients: 'Kyllingebryst, salat, yoghurt, urter', source: 'Valdemarsro' }
  ];
}

// Utility function to extract price from Danish format
function extractPrice(priceStr) {
  if (!priceStr || typeof priceStr !== 'string') return 0;
  
  const cleanStr = priceStr.replace(/\r/g, '').replace(/\n/g, '').trim();
  if (!cleanStr || cleanStr.toLowerCase() === 'se pris') return 0;
  
  const match = cleanStr.match(/(\d+(?:[.,]\d+)?)/);
  return match ? parseFloat(match[1].replace(',', '.')) : 0;
}

// Debug function to see category distribution
function debugIngredientMatching(ingredientList, availableDeals) {
  console.log('\n=== INGREDIENT MATCHING DEBUG ===');
  
  // Show category distribution
  const categoryCount = {};
  availableDeals.forEach(deal => {
    const cat = deal.Category || 'Unknown';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  
  console.log('Deal distribution by category:');
  Object.entries(categoryCount).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count} deals`);
  });
  
  // Look specifically for meat deals
  console.log('\nMeat & Poultry deals:');
  const meatDeals = availableDeals.filter(deal => deal.Category === 'Meat & Poultry');
  meatDeals.slice(0, 3).forEach(deal => {
    console.log(`  - "${deal['Deal Name']}" at ${deal.Store}`);
  });
  
  // Look specifically for pantry deals  
  console.log('\nPantry Items deals:');
  const pantryDeals = availableDeals.filter(deal => deal.Category === 'Pantry Items');
  pantryDeals.slice(0, 3).forEach(deal => {
    console.log(`  - "${deal['Deal Name']}" at ${deal.Store}`);
  });
  
  // Look specifically for dairy deals
  console.log('\nDairy & Eggs deals:');
  const dairyDeals = availableDeals.filter(deal => deal.Category === 'Dairy & Eggs');
  dairyDeals.slice(0, 3).forEach(deal => {
    console.log(`  - "${deal['Deal Name']}" at ${deal.Store}`);
  });
  
  console.log('\nSample ingredients from recipes:');
  ingredientList.slice(0, 5).forEach(ing => {
    console.log(`  - "${ing.item}"`);
  });
  
  console.log('================================\n');
}

// Filter deals for food categories - RELAXED VERSION
function getFoodDeals(preferences = {}) {
  const foodCategories = [
    'Meat & Poultry', 'Dairy & Eggs', 'Dairy & Cheese', 
    'Fruits & Vegetables', 'Fresh Produce (Fruits & Vegetables)', 
    'Pantry', 'Pantry Items', 'Organic', 'Fish & Seafood',
    'Bakery & Bread', 'Beverages', 'Frozen Foods'
  ];

  console.log('\n=== FILTERING DEALS ===');
  console.log('Total deals loaded:', dealData.length);
  
  // Get all categories to see what we have
  const allCategories = [...new Set(dealData.map(deal => deal.Category))].filter(cat => cat);
  console.log('Available categories:', allCategories);
  
  // RELAXED: Filter by food categories only - don't filter by price
  let deals = dealData.filter(deal => {
    const category = deal.Category || '';
    return foodCategories.includes(category);
  });
  
  console.log('Food deals found:', deals.length);
  
  // Apply preferences
  if (preferences.organic) {
    deals = deals.filter(deal => 
      deal.Category === 'Organic' || 
      (deal['Deal Name'] || '').toLowerCase().includes('økologisk')
    );
  }

  if (preferences.lessMeat) {
    deals = deals.filter(deal => deal.Category !== 'Meat & Poultry');
  }

  console.log('Final deals after preferences:', deals.length);
  console.log('=======================\n');

  return deals;
}

// Parse ingredients from CSV format
function parseIngredientsFromCSV(ingredientString) {
  const ingredients = ingredientString.split(/[;,]/).map(ing => ing.trim()).filter(ing => ing.length > 0);
  
  return ingredients.map(ingredient => {
    const match = ingredient.match(/(\d+(?:[.,]\d+)?)\s*([a-zA-ZæøåÆØÅ\s]+)|([a-zA-ZæøåÆØÅ\s]+)/);
    
    if (match) {
      const amount = match[1] || '';
      const item = (match[2] || match[3] || ingredient).trim();
      return { originalText: ingredient, item: item, amount: amount };
    }
    
    return { originalText: ingredient, item: ingredient, amount: '' };
  });
}

// Enhanced ingredient matching - FIXED with proper Danish characters
function checkIngredientMatch(ingredient, dealName) {
  const ingredientLower = ingredient.toLowerCase();
  const dealNameLower = dealName.toLowerCase();
  
  // Direct substring match first
  if (dealNameLower.includes(ingredientLower) || ingredientLower.includes(dealNameLower)) {
    return true;
  }
  
  // Enhanced matching dictionary with proper Danish characters
  const matches = {
    'lasagneplader': ['lasagne', 'pasta', 'lasagneplader'],
    'pasta': ['pasta', 'spaghetti', 'macaroni', 'penne', 'fusilli', 'lasagne'],
    'spaghetti': ['spaghetti', 'pasta'],
    'oksekød': ['hakket oksekød', 'okse', 'hakket', 'oksekød', 'hakket kød', 'kødfars'],
    'kylling': ['kylling', 'kyllingebryst', 'kyllingeinderfilet', 'kyllingefilet', 'filet'],
    'svinekød': ['svin', 'svinekød', 'hakket svin'],
    'mælk': ['mælk', 'sødmælk', 'minimælk', 'letmælk'],
    'ost': ['ost', 'mozzarella', 'parmesan', 'cheddar', 'gouda', 'danablu'],
    'æg': ['æg'],
    'løg': ['løg', 'gule løg', 'rødløg', 'skalotteløg'],
    'tomat': ['tomat', 'tomater', 'flåede tomater', 'tomatpuré', 'tomatpasta'],
    'kartofler': ['kartofler', 'kartof', 'nye kartofler', 'bagte kartofler'],
    'gulerødder': ['gulerødder', 'gulerod', 'gullerød'],
    'selleri': ['selleri', 'blegselleri'],
    'ris': ['ris', 'jasminris', 'basmatris', 'langkornede'],
    'mel': ['mel', 'hvedemel', 'bagmel'],
    'smør': ['smør', 'lurpak', 'margarine'],
    'fløde': ['fløde', 'piskefløde', 'madlavningsfløde'],
    'yoghurt': ['yoghurt', 'græsk yoghurt', 'skyr', 'naturel yoghurt'],
    'bacon': ['bacon', 'røget bacon'],
    'laks': ['laks', 'røget laks', 'laksfilet'],
    'torsk': ['torsk', 'torskefilet', 'hvid fisk'],
    'bouillon': ['bouillon', 'hønsebouillon', 'grøntsagsbouillon'],
    'olie': ['olie', 'olivenolie', 'rapsolie'],
    'persille': ['persille', 'frisk persille']
  };

  // Check if ingredient matches any deal patterns
  for (const [key, values] of Object.entries(matches)) {
    if (ingredientLower.includes(key)) {
      for (const value of values) {
        if (dealNameLower.includes(value)) {
          return true;
        }
      }
    }
  }
  
  // Reverse check
  for (const [key, values] of Object.entries(matches)) {
    for (const value of values) {
      if (dealNameLower.includes(value) && ingredientLower.includes(key)) {
        return true;
      }
    }
  }
  
  return false;
}

// Price estimation for items not on sale
function estimateIngredientPrice(ingredient) {
  const priceGuides = {
    'pasta': 15, 'spaghetti': 15, 'lasagneplader': 20, 'ris': 15,
    'mel': 8, 'hvedemel': 8, 'salt': 5, 'peber': 10,
    'olie': 12, 'smør': 25, 'margarine': 20,
    'fløde': 18, 'madlavningsfløde': 18, 'piskefløde': 22,
    'mælk': 15, 'yoghurt': 18, 'skyr': 12,
    'bouillon': 8, 'hønsebouillon': 8, 'karry': 12, 'rasp': 10,
    'brød': 20, 'hamburgerboller': 25,
    'kokosmælk': 20, 'æble': 8, 'hvidløg': 5, 'citron': 8,
    'persille': 10, 'dild': 10, 'basilikum': 12,
    'flåede tomater': 12, 'tomatpuré': 8,
    'ærter': 10, 'spinat': 15
  };

  const ingredientLower = ingredient.toLowerCase();
  
  for (const [key, price] of Object.entries(priceGuides)) {
    if (ingredientLower.includes(key)) {
      return price;
    }
  }
  
  return 15; // Default estimate
}

// Enhanced ingredient matching with deals
function matchIngredientsWithDeals(ingredientList, availableDeals) {
  // Add debug call
  debugIngredientMatching(ingredientList, availableDeals);
  
  const storeUsage = new Map();
  const storeNames = getUniqueStores();
  
  // Initialize store usage tracking
  storeNames.forEach(store => storeUsage.set(store, 0));

  return ingredientList.map(ingredient => {
    const matchedDeals = availableDeals.filter(deal => {
      const dealName = (deal['Deal Name'] || '').toLowerCase();
      const itemName = ingredient.item.toLowerCase();
      
      return (
        dealName.includes(itemName) ||
        itemName.includes(dealName.split(' ')[0]) ||
        checkIngredientMatch(itemName, dealName)
      );
    });

    // Only log for first few ingredients to avoid spam
    if (ingredientList.indexOf(ingredient) < 3) {
      console.log(`Ingredient "${ingredient.item}" matched ${matchedDeals.length} deals`);
      if (matchedDeals.length > 0) {
        console.log(`  -> Best match: "${matchedDeals[0]['Deal Name']}" at ${matchedDeals[0].Store}`);
      }
    }

    if (matchedDeals.length > 0) {
      // Smart store selection
      const bestMatch = matchedDeals.sort((a, b) => {
        const storeUsageA = storeUsage.get(a.Store) || 0;
        const storeUsageB = storeUsage.get(b.Store) || 0;
        const priceA = extractPrice(a.Price);
        const priceB = extractPrice(b.Price);
        
        const distributionScoreA = 1 / (storeUsageA + 1);
        const distributionScoreB = 1 / (storeUsageB + 1);
        
        const priceScoreA = priceA > 0 ? 1 / priceA : 0.5;
        const priceScoreB = priceB > 0 ? 1 / priceB : 0.5;
        
        const scoreA = (distributionScoreA * 0.6) + (priceScoreA * 0.4);
        const scoreB = (distributionScoreB * 0.6) + (priceScoreB * 0.4);
        
        return scoreB - scoreA;
      })[0];

      const currentUsage = storeUsage.get(bestMatch.Store) || 0;
      storeUsage.set(bestMatch.Store, currentUsage + 1);

      const dealPrice = extractPrice(bestMatch.Price);
      const finalPrice = dealPrice > 0 ? dealPrice : estimateIngredientPrice(ingredient.item);

      return {
        item: ingredient.item,
        price: finalPrice,
        onSale: dealPrice > 0,
        store: bestMatch.Store,
        originalText: ingredient.originalText,
        dealInfo: dealPrice > 0 ? {
          originalPrice: bestMatch.Price,
          dealName: bestMatch['Deal Name'],
          category: bestMatch.Category
        } : null
      };
    } else {
      const estimatedPrice = estimateIngredientPrice(ingredient.item);
      const leastUsedStore = Array.from(storeUsage.entries())
        .sort((a, b) => a[1] - b[1])[0];
      
      const assignToRealStore = Math.random() < 0.7 && leastUsedStore;
      const targetStore = assignToRealStore ? leastUsedStore[0] : "Almindelig";
      
      if (assignToRealStore) {
        storeUsage.set(targetStore, (storeUsage.get(targetStore) || 0) + 1);
      }

      return {
        item: ingredient.item,
        price: estimatedPrice,
        onSale: false,
        store: targetStore,
        originalText: ingredient.originalText
      };
    }
  });
}

// Generate shopping list with store distribution
function generateShoppingList(mealPlan) {
  const shoppingList = { 
    coop: [], rema: [], lidl: [], netto: [], foetex: [], discount365: [], almindelig: [] 
  };
  
  mealPlan.forEach(meal => {
    meal.ingredients.forEach(ing => {
      const pantryItems = ['salt', 'peber', 'olie', 'eddike'];
      const isPantryItem = pantryItems.some(pantry => 
        ing.item.toLowerCase().includes(pantry)
      );
      
      if (!isPantryItem) {
        let targetList;
        
        switch(ing.store?.toLowerCase()) {
          case 'coop': targetList = shoppingList.coop; break;
          case 'rema 1000':
          case 'rema': targetList = shoppingList.rema; break;
          case 'lidl': targetList = shoppingList.lidl; break;
          case 'netto': targetList = shoppingList.netto; break;
          case 'føtex':
          case 'foetex': targetList = shoppingList.foetex; break;
          case 'discount365': targetList = shoppingList.discount365; break;
          default: targetList = shoppingList.almindelig;
        }
        
        const existing = targetList.find(item => item.item === ing.item);
        if (!existing) {
          targetList.push({
            item: ing.item,
            price: ing.price,
            onSale: ing.onSale,
            dealInfo: ing.dealInfo || null
          });
        }
      }
    });
  });

  // Remove empty sections
  Object.keys(shoppingList).forEach(key => {
    if (shoppingList[key].length === 0) {
      delete shoppingList[key];
    }
  });

  return shoppingList;
}

// API Endpoints

// Generate meal plan
app.post('/api/generate-meal-plan', async (req, res) => {
  try {
    const { familySize, budget, days, preferences = {} } = req.body;

    if (!familySize || !budget || !days) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: familySize, budget, days' 
      });
    }

    const availableDeals = getFoodDeals(preferences);
    
    console.log(`Generating ${days}-day meal plan for ${familySize} people, budget: ${budget} kr`);
    console.log(`Using ${recipeData.length} recipes and ${availableDeals.length} deals`);

    // Stealth upgrade templates
    const stealthUpgrades = {
      'lasagne': 'Skjult protein-boost: Bland 200g røde linser (kogt bløde) ind i kødsaucen. De bliver usynlige og øger protein med 30%.',
      'boller i karry': 'Skjulte grøntsager: Fintrev gulerødderne og bland direkte i kødfasen. Giver saftighed og vitaminer.',
      'frikadeller': 'Protein-power: Erstat 30% af kødet med kogte røde linser - usynlige og sundere.',
      'kylling': 'Grøntsags-boost: Tilsæt finthakket selleri og gulerødder til sovsen.',
      'carbonara': 'Fiber-upgrade: Brug fuldkornspasta og tilsæt finhakket broccoli til cremesovsen.',
      'pasta': 'Linse-trick: Bland kogte røde linser i kødsovsen - dobler proteinet uden smagesforskel.',
      'sandwich': 'Grønt boost: Tilsæt finhakket avocado eller spinat - øger vitaminer og fiber.',
      'suppe': 'Protein-power: Tilsæt røde linser til suppen - de koger op og bliver usynlige.',
      'fisk': 'Omega boost: Server med dampede broccoli-stilke for ekstra fiber og vitaminer.',
      'kød': 'Saftighedsboost: Bland fintrevne gulerødder i kødet for vitaminer og naturlig sødme.'
    };

    // Process recipes
    const processedRecipes = recipeData
      .filter(recipe => recipe.title && recipe.ingredients)
      .map(recipe => {
        const ingredientList = parseIngredientsFromCSV(recipe.ingredients);
        const enhancedIngredients = matchIngredientsWithDeals(ingredientList, availableDeals);
        const estimatedCost = enhancedIngredients.reduce((total, ing) => total + (ing.price || 15), 0);
        
        // Find appropriate stealth upgrade
        const recipeKey = Object.keys(stealthUpgrades).find(key => 
          recipe.title.toLowerCase().includes(key)
        );
        const stealthUpgrade = stealthUpgrades[recipeKey] || 'Naturlig opgradering: Brug økologiske ingredienser når muligt for bedre smag og sundhed.';

        return {
          recipe: recipe.title,
          originalRecipe: recipe,
          ingredients: enhancedIngredients,
          cost: estimatedCost,
          stealthUpgrade: stealthUpgrade,
          servings: recipe.persons || recipe.servings || 4,
          dealRatio: enhancedIngredients.filter(ing => ing.onSale).length / enhancedIngredients.length,
          source: recipe.source || 'Unknown',
          storesUsed: [...new Set(enhancedIngredients.map(ing => ing.store))]
        };
      })
      .filter(recipe => recipe.cost <= 200)
      .sort((a, b) => {
        if (b.dealRatio !== a.dealRatio) return b.dealRatio - a.dealRatio;
        if (b.storesUsed.length !== a.storesUsed.length) return b.storesUsed.length - a.storesUsed.length;
        return a.cost - b.cost;
      });

    // Select recipes with variety
    const selectedRecipes = [];
    const usedRecipeIds = new Set();
    const shuffledRecipes = processedRecipes.sort(() => Math.random() - 0.5);

    for (const recipe of shuffledRecipes) {
      if (selectedRecipes.length >= days) break;
      
      const recipeId = recipe.originalRecipe.id || recipe.recipe;
      
      if (!usedRecipeIds.has(recipeId)) {
        selectedRecipes.push(recipe);
        usedRecipeIds.add(recipeId);
      }
    }

    // Fallback for insufficient recipes
    while (selectedRecipes.length < days && processedRecipes.length > 0) {
      selectedRecipes.push(processedRecipes[selectedRecipes.length % processedRecipes.length]);
    }

    // Generate meal plan
    const mealPlan = [];
    let totalCost = 0;
    let totalDealMatches = 0;
    let totalIngredients = 0;
    const allStoresUsed = new Set();

    for (let i = 0; i < days; i++) {
      const recipeData = selectedRecipes[i] || selectedRecipes[0];
      const dealMatches = recipeData.ingredients.filter(ing => ing.onSale).length;
      
      recipeData.storesUsed.forEach(store => allStoresUsed.add(store));
      
      mealPlan.push({
        day: i + 1,
        recipe: recipeData.recipe,
        servings: familySize,
        ingredients: recipeData.ingredients,
        cost: recipeData.cost,
        dealMatches: dealMatches,
        stealthUpgrade: recipeData.stealthUpgrade,
        storesUsed: recipeData.storesUsed
      });

      totalCost += recipeData.cost;
      totalDealMatches += dealMatches;
      totalIngredients += recipeData.ingredients.length;
    }

    const shoppingList = generateShoppingList(mealPlan);
    const savings = budget - totalCost;
    const dealPercentage = Math.round((totalDealMatches / totalIngredients) * 100);

    const response = {
      success: true,
      mealPlan: mealPlan,
      totalCost: totalCost,
      totalDealMatches: totalDealMatches,
      totalIngredients: totalIngredients,
      shoppingList: shoppingList,
      savings: savings,
      storesUsed: Array.from(allStoresUsed),
      summary: `Smart ${days}-dages madplan med ${dealPercentage}% tilbuds-match fra ${Array.from(allStoresUsed).length} butikskæder`,
      generatedAt: new Date().toISOString(),
      dealCount: availableDeals.length
    };

    console.log(`Generated ${days}-day meal plan: ${totalCost} kr, ${totalDealMatches}/${totalIngredients} deals matched`);

    res.json(response);

  } catch (error) {
    console.error('Meal plan generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get deals - FIXED for frontend
app.get('/api/deals', (req, res) => {
  const { category, store } = req.query;
  let deals = dealData;
  
  if (category && category !== 'all') {
    deals = deals.filter(deal => deal.Category === category);
  }
  
  if (store && store !== 'all') {
    deals = deals.filter(deal => deal.Store === store);
  }
  
  // Map to frontend format
  const mappedDeals = deals.map(deal => ({
    title: deal['Deal Name'] || "Ukendt produkt",
    price: deal.Price || "Se pris",
    amount: deal.Amount || "",
    category: deal.Category || "",
    store: deal.Store || "",
    originalDeal: deal
  }));
  
  res.json({
    success: true,
    deals: mappedDeals,
    total: mappedDeals.length,
    stores: getUniqueStores()
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    deals: dealData.length,
    recipes: recipeData.length,
    stores: getUniqueStores().length,
    storeNames: getUniqueStores(),
    timestamp: new Date().toISOString()
  });
});

// Serve static pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/planner.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/planner.html'));
});

app.get('/deals.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/deals.html'));
});

// Initialize server
loadData().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Ready with ${dealData.length} deals from ${getUniqueStores().length} stores and ${recipeData.length} recipes`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});