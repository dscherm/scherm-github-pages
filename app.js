// API Configuration
const API_BASE = 'https://www.thecocktaildb.com/api/json/v1/1';

// State Management
let currentSearchType = 'name';
let savedCocktails = JSON.parse(localStorage.getItem('savedCocktails')) || [];

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsSection = document.getElementById('results-section');
const cocktailModal = document.getElementById('cocktail-modal');
const ingredientModal = document.getElementById('ingredient-modal');
const liquorSelection = document.getElementById('liquor-selection');

// Tab Navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;

        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load saved cocktails if switching to create tab
        if (tabName === 'create') {
            displaySavedCocktails();
        }
    });
});

// Search Type Selection
document.querySelectorAll('.search-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentSearchType = btn.dataset.type;

        // Update active button
        document.querySelectorAll('.search-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update UI based on search type
        if (currentSearchType === 'liquor') {
            searchInput.style.display = 'none';
            searchBtn.style.display = 'none';
            liquorSelection.style.display = 'grid';
        } else if (currentSearchType === 'random') {
            searchInput.style.display = 'none';
            searchBtn.style.display = 'none';
            liquorSelection.style.display = 'none';
            getRandomCocktail();
        } else {
            searchInput.style.display = 'block';
            searchBtn.style.display = 'block';
            liquorSelection.style.display = 'none';

            // Update placeholder
            if (currentSearchType === 'name') {
                searchInput.placeholder = 'Search for a cocktail by name...';
            } else if (currentSearchType === 'ingredient') {
                searchInput.placeholder = 'Search by ingredient (e.g., vodka, lime)...';
            }
        }
    });
});

// Liquor Selection
document.querySelectorAll('.liquor-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const liquor = btn.dataset.liquor;
        searchByLiquor(liquor);
    });
});

// Search Button
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// Perform Search
async function performSearch() {
    const query = searchInput.value.trim();

    if (!query && currentSearchType !== 'random') {
        alert('Please enter a search term');
        return;
    }

    showLoading();

    try {
        let url;
        if (currentSearchType === 'name') {
            url = `${API_BASE}/search.php?s=${encodeURIComponent(query)}`;
        } else if (currentSearchType === 'ingredient') {
            url = `${API_BASE}/filter.php?i=${encodeURIComponent(query)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.drinks) {
            // If we got simplified results (from filter), fetch full details
            if (currentSearchType === 'ingredient') {
                const detailedDrinks = await Promise.all(
                    data.drinks.slice(0, 12).map(drink => fetchCocktailById(drink.idDrink))
                );
                displayCocktails(detailedDrinks.filter(d => d !== null));
            } else {
                displayCocktails(data.drinks);
            }
        } else {
            resultsSection.innerHTML = '<div class="empty-state">No cocktails found. Try a different search!</div>';
        }
    } catch (error) {
        console.error('Error fetching cocktails:', error);
        resultsSection.innerHTML = '<div class="empty-state">Error loading cocktails. Please try again.</div>';
    }
}

// Search by Liquor
async function searchByLiquor(liquor) {
    showLoading();

    try {
        const response = await fetch(`${API_BASE}/filter.php?i=${encodeURIComponent(liquor)}`);
        const data = await response.json();

        if (data.drinks) {
            const detailedDrinks = await Promise.all(
                data.drinks.slice(0, 12).map(drink => fetchCocktailById(drink.idDrink))
            );
            displayCocktails(detailedDrinks.filter(d => d !== null));
        } else {
            resultsSection.innerHTML = '<div class="empty-state">No cocktails found with this liquor.</div>';
        }
    } catch (error) {
        console.error('Error fetching cocktails:', error);
        resultsSection.innerHTML = '<div class="empty-state">Error loading cocktails. Please try again.</div>';
    }
}

// Get Random Cocktail
async function getRandomCocktail() {
    showLoading();

    try {
        const response = await fetch(`${API_BASE}/random.php`);
        const data = await response.json();

        if (data.drinks) {
            displayCocktails(data.drinks);
        }
    } catch (error) {
        console.error('Error fetching random cocktail:', error);
        resultsSection.innerHTML = '<div class="empty-state">Error loading cocktail. Please try again.</div>';
    }
}

// Fetch Cocktail by ID
async function fetchCocktailById(id) {
    try {
        const response = await fetch(`${API_BASE}/lookup.php?i=${id}`);
        const data = await response.json();
        return data.drinks ? data.drinks[0] : null;
    } catch (error) {
        console.error('Error fetching cocktail details:', error);
        return null;
    }
}

// Display Cocktails
function displayCocktails(cocktails) {
    resultsSection.innerHTML = '';

    cocktails.forEach(cocktail => {
        const card = createCocktailCard(cocktail);
        resultsSection.appendChild(card);
    });
}

// Create Cocktail Card
function createCocktailCard(cocktail) {
    const card = document.createElement('div');
    card.className = 'cocktail-card';

    card.innerHTML = `
        <img src="${cocktail.strDrinkThumb}" alt="${cocktail.strDrink}">
        <div class="cocktail-card-content">
            <h3>${cocktail.strDrink}</h3>
            ${cocktail.strCategory ? `<span class="category">${cocktail.strCategory}</span>` : ''}
            ${cocktail.strGlass ? `<p class="glass-type">Served in: ${cocktail.strGlass}</p>` : ''}
        </div>
    `;

    card.addEventListener('click', () => showCocktailDetail(cocktail));

    return card;
}

// Show Cocktail Detail
function showCocktailDetail(cocktail) {
    const ingredients = [];

    // Extract ingredients and measurements
    for (let i = 1; i <= 15; i++) {
        const ingredient = cocktail[`strIngredient${i}`];
        const measure = cocktail[`strMeasure${i}`];

        if (ingredient) {
            ingredients.push({
                name: ingredient,
                measure: measure || 'To taste'
            });
        }
    }

    const detailContent = `
        <div class="cocktail-detail-header">
            <img src="${cocktail.strDrinkThumb}" alt="${cocktail.strDrink}">
            <h2>${cocktail.strDrink}</h2>
        </div>
        <div class="cocktail-detail-body">
            <div class="cocktail-tags">
                ${cocktail.strCategory ? `<span class="tag">${cocktail.strCategory}</span>` : ''}
                ${cocktail.strAlcoholic ? `<span class="tag">${cocktail.strAlcoholic}</span>` : ''}
                ${cocktail.strGlass ? `<span class="tag">${cocktail.strGlass}</span>` : ''}
            </div>

            <div class="ingredients-section">
                <h3>Ingredients</h3>
                ${ingredients.map(ing => `
                    <div class="ingredient-item" data-ingredient="${ing.name}">
                        <span class="ingredient-name">${ing.name}</span>
                        <span class="ingredient-measure">${ing.measure}</span>
                    </div>
                `).join('')}
            </div>

            <div class="instructions-section">
                <h3>Instructions</h3>
                <p>${cocktail.strInstructions || 'No instructions available.'}</p>
            </div>
        </div>
    `;

    document.getElementById('cocktail-detail').innerHTML = detailContent;

    // Add click handlers to ingredients
    document.querySelectorAll('.ingredient-item').forEach(item => {
        item.addEventListener('click', () => {
            const ingredientName = item.dataset.ingredient;
            showIngredientDetail(ingredientName);
        });
    });

    cocktailModal.style.display = 'block';
}

// Show Ingredient Detail
async function showIngredientDetail(ingredientName) {
    const detailContent = `
        <div class="ingredient-detail-content">
            <h2>${ingredientName}</h2>

            <div class="ingredient-options">
                <button class="ingredient-option-btn active" data-option="brands">Popular Brands</button>
                <button class="ingredient-option-btn" data-option="alternatives">Alternatives</button>
            </div>

            <div class="brands-list active">
                ${getBrandsForIngredient(ingredientName)}
            </div>

            <div class="alternatives-list">
                ${getAlternativesForIngredient(ingredientName)}
            </div>
        </div>
    `;

    document.getElementById('ingredient-detail').innerHTML = detailContent;

    // Add option button handlers
    document.querySelectorAll('.ingredient-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.ingredient-option-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const option = btn.dataset.option;
            document.querySelector('.brands-list').classList.toggle('active', option === 'brands');
            document.querySelector('.alternatives-list').classList.toggle('active', option === 'alternatives');
        });
    });

    ingredientModal.style.display = 'block';
}

// Get Brands for Ingredient (Mock data - you can expand this)
function getBrandsForIngredient(ingredient) {
    const brands = {
        'Vodka': ['Absolut', 'Grey Goose', 'Smirnoff', 'Belvedere', 'Tito\'s'],
        'Rum': ['Bacardi', 'Captain Morgan', 'Malibu', 'Havana Club', 'Appleton Estate'],
        'Gin': ['Tanqueray', 'Bombay Sapphire', 'Hendrick\'s', 'Beefeater', 'Gordon\'s'],
        'Tequila': ['Patrón', 'Don Julio', 'Jose Cuervo', 'Herradura', 'Casamigos'],
        'Whiskey': ['Jack Daniel\'s', 'Jim Beam', 'Johnnie Walker', 'Maker\'s Mark', 'Crown Royal'],
        'Bourbon': ['Maker\'s Mark', 'Woodford Reserve', 'Buffalo Trace', 'Wild Turkey', 'Four Roses'],
        'Triple sec': ['Cointreau', 'Grand Marnier', 'DeKuyper', 'Combier'],
        'Vermouth': ['Martini & Rossi', 'Dolin', 'Carpano', 'Noilly Prat'],
        'Lime juice': ['Fresh squeezed', 'Nellie & Joe\'s', 'Rose\'s', 'ReaLime'],
        'Lemon juice': ['Fresh squeezed', 'Santa Cruz Organic', 'ReaLemon'],
        'Orange juice': ['Fresh squeezed', 'Tropicana', 'Simply Orange', 'Minute Maid'],
        'Cranberry juice': ['Ocean Spray', 'Northland', 'Lakewood Organic'],
        'Pineapple juice': ['Dole', 'Del Monte', 'Lakewood Organic'],
        'Tomato juice': ['Campbell\'s', 'Sacramento', 'Clamato'],
        'Ginger beer': ['Fever-Tree', 'Gosling\'s', 'Bundaberg', 'Cock\'n Bull'],
        'Tonic water': ['Fever-Tree', 'Q Mixers', 'Schweppes', 'Canada Dry'],
        'Club soda': ['Schweppes', 'Canada Dry', 'Perrier', 'San Pellegrino'],
        'Cola': ['Coca-Cola', 'Pepsi', 'Mexican Coke', 'Fentimans']
    };

    const ingredientBrands = brands[ingredient] || ['Generic/Store Brand', 'Premium Options Available'];

    return ingredientBrands.map(brand => `
        <div class="brand-item">
            <strong>${brand}</strong>
        </div>
    `).join('');
}

// Get Alternatives for Ingredient
function getAlternativesForIngredient(ingredient) {
    const alternatives = {
        'Vodka': ['White rum (lighter cocktails)', 'Gin (for more botanical flavor)', 'Sake (for Asian-inspired drinks)'],
        'Rum': ['Vodka (cleaner taste)', 'Cachaca (Brazilian alternative)', 'Bourbon (richer flavor)'],
        'Gin': ['Vodka (neutral base)', 'White rum (sweeter)', 'Aquavit (Scandinavian alternative)'],
        'Tequila': ['Mezcal (smokier)', 'White rum (sweeter)', 'Vodka (neutral)'],
        'Whiskey': ['Bourbon (sweeter)', 'Scotch (smokier)', 'Brandy (fruitier)', 'Dark rum (richer)'],
        'Bourbon': ['Rye whiskey (spicier)', 'Tennessee whiskey', 'Scotch (smokier)'],
        'Triple sec': ['Cointreau (premium)', 'Curaçao', 'Orange liqueur'],
        'Vermouth': ['Dry white wine + herbs', 'Lillet Blanc', 'Sake (for dry vermouth)'],
        'Lime juice': ['Lemon juice (less tart)', 'Yuzu juice (Asian citrus)', 'Fresh lime only!'],
        'Lemon juice': ['Lime juice (more tart)', 'Meyer lemon (sweeter)', 'Fresh lemon only!'],
        'Orange juice': ['Grapefruit juice (more tart)', 'Tangerine juice (sweeter)', 'Blood orange juice'],
        'Cranberry juice': ['Pomegranate juice', 'Cherry juice', 'Raspberry juice'],
        'Pineapple juice': ['Mango juice', 'Passion fruit juice', 'Guava juice'],
        'Sugar syrup': ['Honey syrup', 'Agave nectar', 'Maple syrup', 'Simple syrup'],
        'Grenadine': ['Pomegranate syrup', 'Cherry syrup', 'Raspberry syrup'],
        'Bitters': ['Angostura (classic)', 'Peychaud\'s (anise notes)', 'Orange bitters'],
        'Mint': ['Basil (herbal)', 'Cilantro (savory)', 'Rosemary (piney)'],
        'Club soda': ['Sparkling water', 'Tonic water (adds quinine)', 'Ginger ale (adds sweetness)']
    };

    const ingredientAlts = alternatives[ingredient] || ['Use as specified', 'Consult a mixologist for substitutions'];

    return ingredientAlts.map(alt => `
        <div class="alternative-item">
            ${alt}
        </div>
    `).join('');
}

// Modal Close Handlers
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        cocktailModal.style.display = 'none';
        ingredientModal.style.display = 'none';
    });
});

window.addEventListener('click', (e) => {
    if (e.target === cocktailModal) {
        cocktailModal.style.display = 'none';
    }
    if (e.target === ingredientModal) {
        ingredientModal.style.display = 'none';
    }
});

// Create Your Own Cocktail
const addIngredientBtn = document.getElementById('add-ingredient-btn');
const ingredientsList = document.getElementById('ingredients-list');
const saveCocktailBtn = document.getElementById('save-cocktail-btn');

addIngredientBtn.addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'ingredient-input-row';
    row.innerHTML = `
        <input type="text" placeholder="Ingredient" class="ingredient-name">
        <input type="text" placeholder="Measurement" class="ingredient-measure">
        <button class="remove-ingredient-btn">×</button>
    `;

    ingredientsList.appendChild(row);

    // Add remove handler
    row.querySelector('.remove-ingredient-btn').addEventListener('click', () => {
        row.remove();
    });
});

saveCocktailBtn.addEventListener('click', () => {
    const name = document.getElementById('cocktail-name').value.trim();
    const glass = document.getElementById('cocktail-glass').value;
    const instructions = document.getElementById('cocktail-instructions').value.trim();
    const imageUrl = document.getElementById('cocktail-image').value.trim();

    if (!name) {
        alert('Please enter a cocktail name');
        return;
    }

    // Collect ingredients
    const ingredients = [];
    document.querySelectorAll('.ingredient-input-row').forEach(row => {
        const ingredientName = row.querySelector('.ingredient-name').value.trim();
        const measure = row.querySelector('.ingredient-measure').value.trim();

        if (ingredientName) {
            ingredients.push({ name: ingredientName, measure: measure || 'To taste' });
        }
    });

    if (ingredients.length === 0) {
        alert('Please add at least one ingredient');
        return;
    }

    // Create cocktail object
    const newCocktail = {
        id: Date.now(),
        strDrink: name,
        strGlass: glass,
        strInstructions: instructions || 'Mix ingredients as desired.',
        strDrinkThumb: imageUrl || 'https://www.thecocktaildb.com/images/media/drink/default.jpg',
        strCategory: 'Custom',
        strAlcoholic: 'Unknown',
        ingredients: ingredients,
        custom: true
    };

    // Save to local storage
    savedCocktails.push(newCocktail);
    localStorage.setItem('savedCocktails', JSON.stringify(savedCocktails));

    // Show success message
    alert(`🍹 ${name} has been saved to your collection!`);

    // Reset form
    document.getElementById('cocktail-name').value = '';
    document.getElementById('cocktail-instructions').value = '';
    document.getElementById('cocktail-image').value = '';
    ingredientsList.innerHTML = `
        <div class="ingredient-input-row">
            <input type="text" placeholder="Ingredient" class="ingredient-name">
            <input type="text" placeholder="Measurement" class="ingredient-measure">
            <button class="remove-ingredient-btn" style="display: none;">×</button>
        </div>
    `;

    // Refresh saved cocktails display
    displaySavedCocktails();
});

// Display Saved Cocktails
function displaySavedCocktails() {
    const grid = document.getElementById('saved-cocktails-grid');

    if (savedCocktails.length === 0) {
        grid.innerHTML = '<div class="empty-state">No saved cocktails yet. Create your first one above!</div>';
        return;
    }

    grid.innerHTML = '';

    savedCocktails.forEach(cocktail => {
        const card = document.createElement('div');
        card.className = 'cocktail-card';

        card.innerHTML = `
            <img src="${cocktail.strDrinkThumb}" alt="${cocktail.strDrink}">
            <div class="cocktail-card-content">
                <h3>${cocktail.strDrink}</h3>
                <span class="category">Custom Creation</span>
                <p class="glass-type">Served in: ${cocktail.strGlass}</p>
            </div>
        `;

        card.addEventListener('click', () => showCustomCocktailDetail(cocktail));

        grid.appendChild(card);
    });
}

// Show Custom Cocktail Detail
function showCustomCocktailDetail(cocktail) {
    const detailContent = `
        <div class="cocktail-detail-header">
            <img src="${cocktail.strDrinkThumb}" alt="${cocktail.strDrink}">
            <h2>${cocktail.strDrink}</h2>
        </div>
        <div class="cocktail-detail-body">
            <div class="cocktail-tags">
                <span class="tag">${cocktail.strCategory}</span>
                <span class="tag">${cocktail.strGlass}</span>
                <span class="tag">Your Creation</span>
            </div>

            <div class="ingredients-section">
                <h3>Ingredients</h3>
                ${cocktail.ingredients.map(ing => `
                    <div class="ingredient-item" data-ingredient="${ing.name}">
                        <span class="ingredient-name">${ing.name}</span>
                        <span class="ingredient-measure">${ing.measure}</span>
                    </div>
                `).join('')}
            </div>

            <div class="instructions-section">
                <h3>Instructions</h3>
                <p>${cocktail.strInstructions}</p>
            </div>

            <button onclick="deleteCocktail(${cocktail.id})" style="margin-top: 20px; padding: 12px 30px; background: #dc3545; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1em;">
                Delete This Cocktail
            </button>
        </div>
    `;

    document.getElementById('cocktail-detail').innerHTML = detailContent;

    // Add click handlers to ingredients
    document.querySelectorAll('.ingredient-item').forEach(item => {
        item.addEventListener('click', () => {
            const ingredientName = item.dataset.ingredient;
            showIngredientDetail(ingredientName);
        });
    });

    cocktailModal.style.display = 'block';
}

// Delete Cocktail
function deleteCocktail(id) {
    if (confirm('Are you sure you want to delete this cocktail?')) {
        savedCocktails = savedCocktails.filter(c => c.id !== id);
        localStorage.setItem('savedCocktails', JSON.stringify(savedCocktails));
        cocktailModal.style.display = 'none';
        displaySavedCocktails();
    }
}

// Show Loading
function showLoading() {
    resultsSection.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Mixing up some cocktails...</p>
        </div>
    `;
}

// Initialize with a random cocktail on load
window.addEventListener('load', () => {
    getRandomCocktail();
});
