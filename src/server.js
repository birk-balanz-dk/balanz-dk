// src/server.js - Complete Multi-Chain Hybrid System with Improved Distribution
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Papa = require('papaparse');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Resend and JWT secret

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// In-memory data storage
let dealData = [];
let recipeData = [];

// Load CSV data from all supermarket chains and recipe sources
async function loadData() {
  try {
    console.log('🔍 Looking for CSV files...');
    
    let totalDeals = 0;
    let totalRecipes = 0;
    
    // Load supermarket deals from all chains
    const supermarketFiles = [
  { name: 'Coop', file: 'public/data/TilbudCoop.csv' },
  { name: 'Lidl', file: 'public/data/TilbudLidl.csv' },
  { name: 'Netto', file: 'public/data/TilbudNetto.csv' },
  { name: 'REMA 1000', file: 'public/data/TilbudRema.csv' },
  { name: 'Føtex', file: 'public/data/TilbudFoetex.csv' },
  { name: 'Discount365', file: 'public/data/365.csv' }
];

    dealData = []; // Reset deals array

    for (const supermarket of supermarketFiles) {
      try {
        const csvData = fs.readFileSync(path.join(__dirname, `../${supermarket.file}`), 'utf8');
        const parsedDeals = Papa.parse(csvData, { header: true, skipEmptyLines: true }).data;
        
        // Add store identifier to each deal
        const dealsWithStore = parsedDeals.map(deal => ({
          ...deal,
          Store: supermarket.name
        }));
        
        dealData = [...dealData, ...dealsWithStore];
        console.log(`📊 Loaded ${parsedDeals.length} deals from ${supermarket.name}`);
        totalDeals += parsedDeals.length;
        
      } catch (error) {
        console.log(`⚠️ ${supermarket.name} CSV file not found - skipping`);
      }
    }

    // Load recipes from all sources
    const recipeFiles = [
  { name: 'Arla', file: 'public/data/arla_recipes.csv' },
  { name: 'Valdemarsro', file: 'public/data/valdemarsro_recipes.csv' }
];

    recipeData = []; // Reset recipes array

    for (const recipeSource of recipeFiles) {
      try {
        const csvData = fs.readFileSync(path.join(__dirname, `../${recipeSource.file}`), 'utf8');
        const parsedRecipes = Papa.parse(csvData, { header: true, skipEmptyLines: true }).data;
        
        // Add source identifier to each recipe
        const recipesWithSource = parsedRecipes.map(recipe => ({
          ...recipe,
          source: recipeSource.name
        }));
        
        recipeData = [...recipeData, ...recipesWithSource];
        console.log(`📚 Loaded ${parsedRecipes.length} recipes from ${recipeSource.name}`);
        totalRecipes += parsedRecipes.length;
        
      } catch (error) {
        console.log(`⚠️ ${recipeSource.name} CSV file not found - using sample data`);
        if (recipeData.length === 0) {
          recipeData = getSampleRecipes();
        }
      }
    }

    // Fallback to sample data if nothing loaded
    if (dealData.length === 0) {
      console.log('⚠️ No supermarket CSV files found - using sample data');
      dealData = getSampleDeals();
      totalDeals = dealData.length;
    }

    console.log(`✅ Server ready with ${totalDeals} deals from ${getUniqueStores().length} stores and ${totalRecipes} recipes`);
    console.log(`🏪 Available stores: ${getUniqueStores().join(', ')}`);

  } catch (error) {
    console.error('Error loading data:', error);
    // Use sample data as fallback
    dealData = getSampleDeals();
    recipeData = getSampleRecipes();
    console.log('🔄 Using sample data for demo');
  }
}

// Helper function to get unique store names
function getUniqueStores() {
  const stores = [...new Set(dealData.map(deal => deal.Store || 'Unknown'))];
  return stores.filter(store => store !== 'Unknown');
}

// Sample data for testing without CSV files
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
  const match = priceStr.match(/(\d+(?:[.,]\d+)?)/);
  return match ? parseFloat(match[1].replace(',', '.')) : 0;
}

// Filter deals for food categories with multi-chain support
function getFoodDeals(preferences = {}) {
  const foodCategories = [
    'Meat & Poultry', 'Dairy & Eggs', 'Dairy & Cheese', 
    'Fruits & Vegetables', 'Fresh Produce (Fruits & Vegetables)', 
    'Pantry', 'Pantry Items', 'Organic', 'Fish & Seafood',
    'Bakery & Bread', 'Beverages', 'Frozen Foods'
  ];

  let deals = dealData.filter(deal => {
    const category = deal.Category || '';
    const price = extractPrice(deal.Price);
    return foodCategories.includes(category) && price > 0 && price <= 200;
  });

  if (preferences.organic) {
    deals = deals.filter(deal => 
      deal.Category === 'Organic' || 
      (deal["Deal Name"] || '').toLowerCase().includes('økologisk')
    );
  }

  if (preferences.lessMeat) {
    deals = deals.filter(deal => deal.Category !== 'Meat & Poultry');
  }

  return deals;
}

// Function to parse ingredients from CSV format
function parseIngredientsFromCSV(ingredientString) {
  const ingredients = ingredientString.split(/[;,]/).map(ing => ing.trim()).filter(ing => ing.length > 0);
  
  return ingredients.map(ingredient => {
    const match = ingredient.match(/(\d+(?:[.,]\d+)?)\s*([a-zA-ZæøåÆØÅ\s]+)|([a-zA-ZæøåÆØÅ\s]+)/);
    
    if (match) {
      const amount = match[1] || '';
      const item = (match[2] || match[3] || ingredient).trim();
      return {
        originalText: ingredient,
        item: item,
        amount: amount
      };
    }
    
    return {
      originalText: ingredient,
      item: ingredient,
      amount: ''
    };
  });
}

// Enhanced ingredient matching with multi-chain support
function checkIngredientMatch(ingredient, dealName) {
  const matches = {
    'oksekød': ['hakket', 'okse', 'oksekød'],
    'kylling': ['kylling', 'filet', 'kyllingebryst', 'kyllingeinderfilet'],
    'svinekød': ['svin', 'hakket', 'svinekød'],
    'mælk': ['mælk', 'sødmælk', 'minimælk'],
    'ost': ['ost', 'mozzarella', 'parmesan', 'cheddar', 'gouda'],
    'æg': ['æg'],
    'løg': ['løg', 'gule løg', 'rødløg'],
    'tomat': ['tomat', 'flåede tomater', 'tomatpuré'],
    'kartof': ['kartof', 'nye kartofler'],
    'gulerod': ['gulerod', 'gulerødder'],
    'selleri': ['selleri'],
    'pasta': ['pasta', 'spaghetti', 'macaroni'],
    'ris': ['ris', 'jasminris', 'basmatris'],
    'mel': ['mel', 'hvedemel'],
    'smør': ['smør', 'lurpak'],
    'fløde': ['fløde', 'piskefløde', 'madlavningsfløde'],
    'yoghurt': ['yoghurt', 'græsk yoghurt', 'skyr'],
    'bacon': ['bacon'],
    'laks': ['laks', 'røget laks'],
    'torsk': ['torsk', 'torskefilet']
  };

  for (const [key, values] of Object.entries(matches)) {
    if (ingredient.includes(key) && values.some(val => dealName.includes(val))) {
      return true;
    }
  }
  
  return false;
}

// Enhanced price estimation
function estimateIngredientPrice(ingredient) {
  const priceGuides = {
    // Pasta & Grains
    'pasta': 15, 'spaghetti': 15, 'lasagneplader': 20, 'ris': 15,
    
    // Flour & Basics
    'mel': 8, 'hvedemel': 8, 'salt': 5, 'peber': 10,
    
    // Oils & Fats
    'olie': 12, 'smør': 25, 'margarine': 20,
    
    // Dairy
    'fløde': 18, 'madlavningsfløde': 18, 'piskefløde': 22,
    'mælk': 15, 'yoghurt': 18, 'skyr': 12,
    
    // Seasonings & Stocks
    'bouillon': 8, 'hønsebouillon': 8, 'karry': 12, 'rasp': 10,
    
    // Bread & Bakery
    'brød': 20, 'hamburgerboller': 25,
    
    // Specialty items
    'kokosmælk': 20, 'æble': 8, 'hvidløg': 5, 'citron': 8,
    'persille': 10, 'dild': 10, 'basilikum': 12,
    
    // Canned goods
    'flåede tomater': 12, 'tomatpuré': 8,
    
    // Frozen
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

// IMPROVED: Enhanced ingredient matching with smart store distribution
function matchIngredientsWithDeals(ingredientList, availableDeals) {
  const storeUsage = new Map();
  const storeNames = getUniqueStores();
  
  // Initialize store usage tracking
  storeNames.forEach(store => storeUsage.set(store, 0));

  return ingredientList.map(ingredient => {
    const matchedDeals = availableDeals.filter(deal => {
      const dealName = (deal["Deal Name"] || '').toLowerCase();
      const itemName = ingredient.item.toLowerCase();
      
      return (
        dealName.includes(itemName) ||
        itemName.includes(dealName.split(' ')[0]) ||
        checkIngredientMatch(itemName, dealName)
      );
    });

    if (matchedDeals.length > 0) {
      // IMPROVED: Smart store selection considering distribution and price
      const bestMatch = matchedDeals.sort((a, b) => {
        const storeUsageA = storeUsage.get(a.Store) || 0;
        const storeUsageB = storeUsage.get(b.Store) || 0;
        const priceA = extractPrice(a.Price);
        const priceB = extractPrice(b.Price);
        
        // Calculate distribution score (prefer less-used stores)
        const distributionScoreA = 1 / (storeUsageA + 1);
        const distributionScoreB = 1 / (storeUsageB + 1);
        
        // Calculate price score (prefer better deals)
        const priceScoreA = priceA > 0 ? 1 / priceA : 0;
        const priceScoreB = priceB > 0 ? 1 / priceB : 0;
        
        // Combined score: 60% distribution, 40% price
        const scoreA = (distributionScoreA * 0.6) + (priceScoreA * 0.4);
        const scoreB = (distributionScoreB * 0.6) + (priceScoreB * 0.4);
        
        return scoreB - scoreA; // Higher score wins
      })[0];

      // Update store usage
      const currentUsage = storeUsage.get(bestMatch.Store) || 0;
      storeUsage.set(bestMatch.Store, currentUsage + 1);

      return {
        item: ingredient.item,
        price: extractPrice(bestMatch.Price),
        onSale: true,
        store: bestMatch.Store,
        originalText: ingredient.originalText,
        dealInfo: {
          originalPrice: bestMatch.Price,
          dealName: bestMatch["Deal Name"],
          category: bestMatch.Category
        }
      };
    } else {
      // No deal found - assign to least used store or "Almindelig"
      const estimatedPrice = estimateIngredientPrice(ingredient.item);
      const leastUsedStore = Array.from(storeUsage.entries())
        .sort((a, b) => a[1] - b[1])[0];
      
      // 70% chance to assign to least used real store, 30% to "Almindelig"
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

// Enhanced instruction generation
function generateBasicInstructions(recipeName) {
  const name = recipeName.toLowerCase();
  
  if (name.includes('lasagne')) {
    return [
      "Steg kød og løg gyldne",
      "Tilsæt tomatprodukter og simrer", 
      "Lag lasagne med kød, bechamel og ost",
      "Bag ved 180°C i 45 min"
    ];
  } else if (name.includes('karry')) {
    return [
      "Steg kød/kylling og løg",
      "Tilsæt karry og grøntsager",
      "Hæld væske i og simrer",
      "Server med ris"
    ];
  } else if (name.includes('frikadeller') || name.includes('boller')) {
    return [
      "Bland alle ingredienser til en smidig masse",
      "Form til frikadeller/kødboller",
      "Steg gyldne på panden",
      "Server med kartofler og sovs"
    ];
  } else if (name.includes('carbonara')) {
    return [
      "Kog pasta al dente",
      "Steg bacon sprødt",
      "Bland æg, ost og fløde",
      "Vend det hele sammen og server"
    ];
  } else if (name.includes('sandwich') || name.includes('smørrebrød')) {
    return [
      "Forbered alle ingredienser",
      "Smør brødet",
      "Læg pålæg pænt på",
      "Pynt og server"
    ];
  } else if (name.includes('suppe')) {
    return [
      "Sautér løg og grøntsager",
      "Tilsæt væske og bouillon",
      "Simrer til grøntsagerne er mørre",
      "Smag til og server"
    ];
  } else {
    return [
      "Forbered alle ingredienser",
      "Følg traditionel tilberedningsmetode",
      "Justér krydderier efter smag",
      "Server varmt"
    ];
  }
}

// IMPROVED: Multi-chain shopping list generation with minimum store enforcement
function generateShoppingList(mealPlan) {
  const shoppingList = { 
    coop: [], 
    rema: [], 
    lidl: [], 
    netto: [], 
    foetex: [],
    discount365: [],	
    almindelig: [] 
  };
  
  mealPlan.forEach(meal => {
    meal.ingredients.forEach(ing => {
      const pantryItems = ['salt', 'peber', 'olie', 'eddike'];
      const isPantryItem = pantryItems.some(pantry => 
        ing.item.toLowerCase().includes(pantry)
      );
      
      if (!isPantryItem) {
        let targetList;
        
        // Map store names to shopping list sections
        switch(ing.store?.toLowerCase()) {
          case 'coop':
            targetList = shoppingList.coop;
            break;
          case 'rema 1000':
          case 'rema':
            targetList = shoppingList.rema;
            break;
          case 'lidl':
            targetList = shoppingList.lidl;
            break;
          case 'netto':
            targetList = shoppingList.netto;
            break;
          case 'føtex':
          case 'foetex':
            targetList = shoppingList.foetex;
            break;
			case 'discount365':
  targetList = shoppingList.discount365;
  break;
          default:
            targetList = shoppingList.almindelig;
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

  // IMPROVED: Ensure minimum store distribution
  const nonEmptyStores = Object.keys(shoppingList).filter(key => shoppingList[key].length > 0);
  const minStores = Math.min(4, Math.ceil(mealPlan.length / 2)); // Aim for 3-4 stores minimum

  if (nonEmptyStores.length < minStores) {
    console.log(`⚠️ Only ${nonEmptyStores.length} stores used, redistributing to meet minimum of ${minStores}`);
    
    // Redistribute some "almindelig" items to real stores if possible
    const almindeligItems = shoppingList.almindelig || [];
    const realStores = ['coop', 'rema', 'lidl', 'netto', 'foetex', 'discount365'];
    
    almindeligItems.forEach((item, index) => {
      if (nonEmptyStores.length < minStores && index < 2) {
        // Move first 2 items to ensure better distribution
        const targetStore = realStores[index % realStores.length];
        shoppingList[targetStore] = shoppingList[targetStore] || [];
        shoppingList[targetStore].push({
          ...item,
          store: targetStore,
          redistributed: true
        });
        
        // Remove from almindelig
        shoppingList.almindelig = shoppingList.almindelig.filter(i => i !== item);
        
        if (!nonEmptyStores.includes(targetStore)) {
          nonEmptyStores.push(targetStore);
        }
      }
    });
  }

  // Remove empty sections
  Object.keys(shoppingList).forEach(key => {
    if (shoppingList[key].length === 0) {
      delete shoppingList[key];
    }
  });

  console.log(`📊 Shopping list distributed across ${Object.keys(shoppingList).length} stores:`, 
    Object.keys(shoppingList).join(', '));

  return shoppingList;
}

// Enhanced Multi-Chain Hybrid Meal Plan Generation
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
    
    console.log(`🤖 Generating ${days}-day meal plan for ${familySize} people, budget: ${budget} kr`);
    console.log(`📚 Using ${recipeData.length} real recipes from CSV files`);
    console.log(`🏪 Using deals from ${getUniqueStores().length} stores: ${getUniqueStores().join(', ')}`);

    // Enhanced stealth upgrade templates
    const stealthUpgrades = {
      'lasagne': 'Skjult protein-boost: Bland 200g røde linser (kogt bløde) ind i kødsaucen. De bliver usynlige og øger protein med 30%.',
      'boller i karry': 'Skjulte grøntsager: Fintrev gulerødderne og bland direkte i kødfasen. Giver saftighed og vitaminer.',
      'frikadeller': 'Protein-power: Erstat 30% af kødet med kogte røde linser - usynlige og sundere.',
      'kylling i karry': 'Grøntsags-boost: Tilsæt finthakket selleri og gulerødder til karrysovsen.',
      'carbonara': 'Fiber-upgrade: Brug fuldkornspasta og tilsæt finhakket broccoli til cremesovsen.',
      'pasta': 'Linse-trick: Bland kogte røde linser i kødsovsen - dobler proteinet uden smagesforskel.',
      'kyllingebryst': 'Yoghurt-protein: Lav marinade med græsk yoghurt for ekstra protein og mørhed.',
      'sandwich': 'Grønt boost: Tilsæt finhakket avocado eller spinat - øger vitaminer og fiber.',
      'suppe': 'Protein-power: Tilsæt røde linser til suppen - de koger op og bliver usynlige.',
      'fisk': 'Omega boost: Server med dampede broccoli-stilke for ekstra fiber og vitaminer.',
      'kød': 'Saftighedsboost: Bland fintrevne gulerødder i kødet for vitaminer og naturlig sødme.'
    };

    // Process real CSV recipes with enhanced matching
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
        
        const instructions = generateBasicInstructions(recipe.title);

        return {
          recipe: recipe.title,
          originalRecipe: recipe,
          ingredients: enhancedIngredients,
          cost: estimatedCost,
          stealthUpgrade: stealthUpgrade,
          instructions: instructions,
          servings: recipe.persons || recipe.servings || 4,
          dealRatio: enhancedIngredients.filter(ing => ing.onSale).length / enhancedIngredients.length,
          source: recipe.source || 'Unknown',
          storesUsed: [...new Set(enhancedIngredients.map(ing => ing.store))]
        };
      })
      .filter(recipe => recipe.cost <= 200) // Reasonable cost limit for multi-chain
      .sort((a, b) => {
        // Enhanced sorting: deal ratio, then store diversity, then cost
        if (b.dealRatio !== a.dealRatio) return b.dealRatio - a.dealRatio;
        if (b.storesUsed.length !== a.storesUsed.length) return b.storesUsed.length - a.storesUsed.length;
        return a.cost - b.cost;
      });

    // Force recipe variety with randomization
const selectedRecipes = [];
const usedRecipeIds = new Set();

// Shuffle available recipes first for variety
const shuffledRecipes = processedRecipes.sort(() => Math.random() - 0.5);

for (const recipe of shuffledRecipes) {
  if (selectedRecipes.length >= days) break;
  
  const recipeId = recipe.originalRecipe.id || recipe.recipe;
  
  // Ensure no exact duplicates
  if (!usedRecipeIds.has(recipeId)) {
    selectedRecipes.push(recipe);
    usedRecipeIds.add(recipeId);
  }
}

// Fallback: if we don't have enough unique recipes, allow some repeats
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
      const recipeData = selectedRecipes[i] || selectedRecipes[0]; // Fallback to first recipe
      const dealMatches = recipeData.ingredients.filter(ing => ing.onSale).length;
      
      // Track stores used
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
      dealCount: availableDeals.length,
      storesCount: getUniqueStores().length
    };

    console.log(`✅ Generated ${days}-day meal plan using real CSV recipes: ${totalCost} kr, ${totalDealMatches}/${totalIngredients} deals matched across ${Array.from(allStoresUsed).length} stores`);
    console.log(`🏪 Stores used in plan: ${Array.from(allStoresUsed).join(', ')}`);

    res.json(response);

  } catch (error) {
    console.error('Meal plan generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get available deals with store information
app.get('/api/deals', (req, res) => {
  const { category, store } = req.query;
  let deals = getFoodDeals();
  
  if (category && category !== 'all') {
    deals = deals.filter(deal => deal.Category === category);
  }
  
  if (store && store !== 'all') {
    deals = deals.filter(deal => deal.Store === store);
  }
  
  res.json({
    success: true,
    deals: deals,
    total: deals.length,
    stores: getUniqueStores()
  });
});

// Get store statistics
app.get('/api/stores', (req, res) => {
  const stores = getUniqueStores().map(store => {
    const storeDeals = dealData.filter(deal => deal.Store === store);
    return {
      name: store,
      dealCount: storeDeals.length,
      categories: [...new Set(storeDeals.map(deal => deal.Category))].length
    };
  });
  
  res.json({
    success: true,
    stores: stores,
    totalStores: stores.length
  });
});

// NEW: Meal plan generation endpoint (for onboarding flow)
// REPLACE the broken /api/meal-plan endpoint with this:

app.post('/api/meal-plan', async (req, res) => {
  try {
    const { familySize, budget } = req.body;
    
    const mealPlanRequest = {
      familySize: parseInt(familySize) || 2,
      budget: parseInt(budget) || 750,
      days: 5,
      preferences: {}
    };

    console.log(`🤖 Generating 5-day meal plan for ${mealPlanRequest.familySize} people, budget: ${mealPlanRequest.budget} kr`);

    const availableDeals = getFoodDeals(mealPlanRequest.preferences);
    
    // Enhanced stealth upgrade templates
    const stealthUpgrades = {
      'lasagne': 'Skjult protein-boost: Bland 200g røde linser (kogt bløde) ind i kødsaucen. De bliver usynlige og øger protein med 30%.',
      'boller i karry': 'Skjulte grøntsager: Fintrev gulerødderne og bland direkte i kødfasen. Giver saftighed og vitaminer.',
      'frikadeller': 'Protein-power: Erstat 30% af kødet med kogte røde linser - usynlige og sundere.',
      'kylling i karry': 'Grøntsags-boost: Tilsæt finthakket selleri og gulerødder til karrysovsen.',
      'carbonara': 'Fiber-upgrade: Brug fuldkornspasta og tilsæt finhakket broccoli til cremesovsen.',
      'pasta': 'Linse-trick: Bland kogte røde linser i kødsovsen - dobler proteinet uden smagesforskel.',
      'kyllingebryst': 'Yoghurt-protein: Lav marinade med græsk yoghurt for ekstra protein og mørhed.',
      'sandwich': 'Grønt boost: Tilsæt finhakket avocado eller spinat - øger vitaminer og fiber.',
      'suppe': 'Protein-power: Tilsæt røde linser til suppen - de koger op og bliver usynlige.',
      'fisk': 'Omega boost: Server med dampede broccoli-stilke for ekstra fiber og vitaminer.',
      'kød': 'Saftighedsboost: Bland fintrevne gulerødder i kødet for vitaminer og naturlig sødme.'
    };

    // Process real CSV recipes with enhanced matching
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
        
        const instructions = generateBasicInstructions(recipe.title);

        return {
          recipe: recipe.title,
          originalRecipe: recipe,
          ingredients: enhancedIngredients,
          cost: estimatedCost,
          stealthUpgrade: stealthUpgrade,
          instructions: instructions,
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

    // Force recipe variety with randomization
    const selectedRecipes = [];
    const usedRecipeIds = new Set();

    // Shuffle available recipes first for variety
    const shuffledRecipes = processedRecipes.sort(() => Math.random() - 0.5);

    for (const recipe of shuffledRecipes) {
      if (selectedRecipes.length >= 5) break;
      
      const recipeId = recipe.originalRecipe.id || recipe.recipe;
      
      // Ensure no exact duplicates
      if (!usedRecipeIds.has(recipeId)) {
        selectedRecipes.push(recipe);
        usedRecipeIds.add(recipeId);
      }
    }

    // Fallback: if we don't have enough unique recipes, allow some repeats
    while (selectedRecipes.length < 5 && processedRecipes.length > 0) {
      selectedRecipes.push(processedRecipes[selectedRecipes.length % processedRecipes.length]);
    }

    // Generate meal plan
    const mealPlan = [];
    let totalCost = 0;
    let totalDealMatches = 0;
    let totalIngredients = 0;
    const allStoresUsed = new Set();

    for (let i = 0; i < 5; i++) {
      const recipeData = selectedRecipes[i] || selectedRecipes[0];
      const dealMatches = recipeData.ingredients.filter(ing => ing.onSale).length;
      
      // Track stores used
      recipeData.storesUsed.forEach(store => allStoresUsed.add(store));
      
      mealPlan.push({
        day: i + 1,
        recipe: recipeData.recipe,
        servings: mealPlanRequest.familySize,
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
    const savings = mealPlanRequest.budget - totalCost;
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
      summary: `Smart 5-dages madplan med ${dealPercentage}% tilbuds-match fra ${Array.from(allStoresUsed).length} butikskæder`,
      generatedAt: new Date().toISOString(),
      dealCount: availableDeals.length,
      storesCount: getUniqueStores().length
    };

    console.log(`✅ Generated 5-day meal plan: ${totalCost} kr, ${totalDealMatches}/${totalIngredients} deals matched across ${Array.from(allStoresUsed).length} stores`);

    res.json(response);

  } catch (error) {
    console.error('Meal plan generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get recipe recommendations based on current deals
app.get('/api/recipes/recommendations', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const availableDeals = getFoodDeals();
    
    const recommendations = recipeData
      .filter(recipe => recipe.title && recipe.ingredients)
      .map(recipe => {
        const ingredientList = parseIngredientsFromCSV(recipe.ingredients);
        const enhancedIngredients = matchIngredientsWithDeals(ingredientList, availableDeals);
        
        const totalIngredients = ingredientList.length;
        const matchedIngredients = enhancedIngredients.filter(ing => ing.onSale).length;
        const matchScore = Math.round((matchedIngredients / totalIngredients) * 100);
        
        // Calculate average discount
        const dealsWithDiscount = enhancedIngredients.filter(ing => ing.onSale && ing.dealInfo);
        const averageDiscount = dealsWithDiscount.length > 0 
          ? Math.round(dealsWithDiscount.reduce((sum, ing) => {
              const originalPrice = extractPrice(ing.dealInfo.originalPrice);
              const currentPrice = ing.price;
              const discount = originalPrice > currentPrice ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0;
              return sum + discount;
            }, 0) / dealsWithDiscount.length)
          : 0;

        return {
          recipe: {
            id: recipe.id || recipe.title.toLowerCase().replace(/\s+/g, '_'),
            name: recipe.title,
            description: `Lækker ${recipe.title.toLowerCase()} med skjulte sundhedsopgraderinger`,
            difficulty: 'Let',
            prepTime: 15,
            cookTime: 25,
            serves: recipe.persons || recipe.servings || 4,
            stealthUpgrade: {
              secret: 'Naturlige opgraderinger der øger næringsstofferne uden at ændre smagen',
              benefits: 'Mere protein, fiber og vitaminer end den traditionelle version'
            }
          },
          matchScore,
          matchedIngredients,
          totalIngredients,
          averageDiscount,
          storesUsed: [...new Set(enhancedIngredients.map(ing => ing.store))].filter(store => store !== 'Almindelig').length
        };
      })
      .filter(rec => rec.matchScore >= 40) // Only show recipes with decent matches
      .sort((a, b) => {
        // Sort by match score first, then by store diversity, then by discount
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        if (b.storesUsed !== a.storesUsed) return b.storesUsed - a.storesUsed;
        return b.averageDiscount - a.averageDiscount;
      })
      .slice(0, limit);

    res.json({
      success: true,
      recommendations: recommendations
    });

  } catch (error) {
    console.error('Error generating recipe recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all recipes
app.get('/api/recipes', (req, res) => {
  try {
    const recipes = recipeData.map(recipe => ({
      id: recipe.id || recipe.title.toLowerCase().replace(/\s+/g, '_'),
      name: recipe.title,
      description: `Traditionel ${recipe.title.toLowerCase()} med moderne sundhedstvist`,
      difficulty: 'Let',
      prepTime: 15,
      cookTime: 25,
      serves: recipe.persons || recipe.servings || 4,
      source: recipe.source,
      ingredients: parseIngredientsFromCSV(recipe.ingredients || '')
    }));

    res.json({
      success: true,
      recipes: recipes
    });

  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check with enhanced info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    deals: dealData.length,
    recipes: recipeData.length,
    stores: getUniqueStores().length,
    storeNames: getUniqueStores(),
    timestamp: new Date().toISOString(),
    features: [
      'Multi-store distribution optimization',
      'Smart ingredient matching',
      'Stealth nutrition upgrades',
      'Real CSV data integration'
    ]
  });
});

// Serve main pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/planner.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/planner.html'));
});

app.get('/onboarding.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/onboarding.html'));
});
app.get('/print-shopping-list.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/print-shopping-list.html'));
});
// ... your existing code ...

// Simple demo authentication endpoints
app.post('/api/send-magic-link', async (req, res) => {
  const { email } = req.body;
  console.log('Magic link requested for:', email);
  res.json({ success: true, message: 'Magic link sent (demo mode)' });
});

app.get('/verify', (req, res) => {
  const { token } = req.query;
  console.log('Verification requested with token:', token);
  res.redirect('/planner.html?verified=true');
});

// Initialize server
loadData().then(() => {
 app.listen(PORT, () => {
   console.log(`🚀 Balanz.dk Multi-Chain server running on http://localhost:${PORT}`);
   console.log(`📊 Ready with ${dealData.length} deals from ${getUniqueStores().length} stores and ${recipeData.length} recipes`);
   console.log(`🤖 Enhanced hybrid meal planning enabled:`);
   console.log(`   ✅ Multi-store distribution optimization`);
   console.log(`   ✅ Smart ingredient matching algorithm`);
   console.log(`   ✅ Stealth nutrition upgrades`);
   console.log(`   ✅ Real CSV data integration`);
   console.log(`   ✅ Minimum 3-4 store distribution enforcement`);
 });
}).catch(error => {
 console.error('Failed to start server:', error);
 process.exit(1);
});