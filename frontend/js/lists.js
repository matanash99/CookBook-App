import { API_BASE } from './config.js';
import { createRecipeCard, goToRecipe } from './utils.js';
import { RECIPE_CATEGORIES } from './categories.js';

let allRecipes = [];

function renderFilteredRecipes(recipesToDisplay, container) {
    const currentUserId = parseInt(localStorage.getItem('user_id'));
    container.innerHTML = recipesToDisplay.length === 0 ? '<p>אין מתכונים.</p>' : '';
    recipesToDisplay.forEach(recipe => {
        container.appendChild(createRecipeCard(recipe, currentUserId));
    });
}

function handleGlobalSearch() {
    const query = document.getElementById('global-search').value.toLowerCase();
    const magazineGrid = document.getElementById('magazine-grid');
    
    if (query.trim() === '') {
        magazineGrid.innerHTML = '';
        renderMagazineGrid();
        return;
    }
    
    const results = allRecipes.filter(r => r.title.toLowerCase().includes(query) || r.category.toLowerCase().includes(query));
    magazineGrid.innerHTML = '';
    renderFilteredRecipes(results, magazineGrid);
}

function renderMagazineGrid() {
    const magazineGrid = document.getElementById('magazine-grid');
    magazineGrid.innerHTML = '';
    
    RECIPE_CATEGORIES.forEach(category => {
        const card = document.createElement('div');
        card.style.height = '200px';
        card.style.borderRadius = '4px';
        card.style.position = 'relative';
        card.style.cursor = 'pointer';
        card.style.overflow = 'hidden';
        card.style.border = '1px solid rgba(0,0,0,0.1)';
        card.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        card.style.transition = 'box-shadow 0.3s ease';
        
        const safeCatName = category.replace(/ /g, '-');
        
        // Bottom layer (Image)
        const imageLayer = document.createElement('div');
        imageLayer.style.position = 'absolute';
        imageLayer.style.top = '0';
        imageLayer.style.left = '0';
        imageLayer.style.right = '0';
        imageLayer.style.bottom = '0';
        imageLayer.style.backgroundImage = `url('../assets/categories/${safeCatName}.jpeg')`;
        imageLayer.style.backgroundSize = 'cover';
        imageLayer.style.backgroundPosition = 'center';
        imageLayer.style.zIndex = '1';
        card.appendChild(imageLayer);

        // Top layer (Cover)
        const coverLayer = document.createElement('div');
        coverLayer.style.position = 'absolute';
        coverLayer.style.top = '0';
        coverLayer.style.left = '0';
        coverLayer.style.right = '0';
        coverLayer.style.bottom = '0';
        coverLayer.style.backgroundImage = `url('../assets/categories/${safeCatName}.svg')`;
        coverLayer.style.backgroundSize = 'cover';
        coverLayer.style.backgroundPosition = 'center';
        coverLayer.style.zIndex = '2';
        coverLayer.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)'; 
        coverLayer.style.opacity = '0.9'; // slight transparency so the image gently peaks through even when closed
        
        card.onmouseenter = () => {
            coverLayer.style.transform = 'translateY(-66%)';
            card.style.boxShadow = '0 8px 15px rgba(0,0,0,0.15)';
        };
        card.onmouseleave = () => {
            coverLayer.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        };
        
        // Inner white lined box
        const innerBox = document.createElement('div');
        innerBox.style.position = 'absolute';
        innerBox.style.top = '12px';
        innerBox.style.bottom = '12px';
        innerBox.style.left = '12px';
        innerBox.style.right = '12px';
        innerBox.style.border = '2px solid rgba(255, 255, 255, 0.8)';
        innerBox.style.borderRadius = '2px';
        innerBox.style.pointerEvents = 'none'; // allows clicks to pass through
        coverLayer.appendChild(innerBox);

        // Category Card Title in handwritten DanaYad font
        const title = document.createElement('h3');
        title.className = 'category-card-title';
        title.innerText = category;
        title.setAttribute('data-title', category);
        coverLayer.appendChild(title);
        
        card.appendChild(coverLayer);
        
        card.onclick = () => openCategoryView(category);
        
        magazineGrid.appendChild(card);
    });
}

function openCategoryView(category) {
    document.getElementById('magazine-home-view').style.display = 'none';
    document.getElementById('category-view').style.display = 'block';
    window.scrollTo(0, 0);
    
    const safeCatName = category.replace(/ /g, '-');
    document.getElementById('category-banner').style.backgroundImage = `url('../assets/categories/${safeCatName}.svg')`;
    document.getElementById('selected-category-title').innerText = category;
    
    const categoryRecipes = allRecipes.filter(r => r.category === category);
    const listContainer = document.getElementById('filtered-recipes-list');
    renderFilteredRecipes(categoryRecipes, listContainer);
    
    const scopedSearch = document.getElementById('scoped-search');
    scopedSearch.value = '';
    scopedSearch.oninput = (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = categoryRecipes.filter(r => r.title.toLowerCase().includes(query));
        renderFilteredRecipes(filtered, listContainer);
    };
}

export async function loadCategoriesPage() {
    try {
        const response = await fetch(`${API_BASE}/recipes`);
        allRecipes = await response.json();
        
        const magazineGrid = document.getElementById('magazine-grid');
        if (!magazineGrid) return;
        
        renderMagazineGrid();
        
        document.getElementById('global-search').oninput = handleGlobalSearch;
        
        document.getElementById('back-to-magazine').onclick = () => {
            document.getElementById('category-view').style.display = 'none';
            document.getElementById('magazine-home-view').style.display = 'block';
            document.getElementById('global-search').value = '';
            renderMagazineGrid();
            window.scrollTo(0, 0);
        };

    } catch (e) {
        console.error(e);
        const magazineGrid = document.getElementById('magazine-grid');
        if (magazineGrid) magazineGrid.innerHTML = '<p>שגיאה בטעינת הנתונים.</p>';
    }
}

export async function loadMyRecipesPage() {
    const listContainer = document.getElementById('my-recipes-list');
    const token = localStorage.getItem('token');
    if (!listContainer) return;
    try {
        const response = await fetch(`${API_BASE}/users/me/saved-recipes`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) { if (response.status === 401) { localStorage.clear(); window.location.href = '/views/login.html'; } return; }
        const savedRecipes = await response.json();
        if (savedRecipes.length === 0) { listContainer.innerHTML = '<p>אין מתכונים שמורים.</p>'; return; }
    } catch (e) { console.error(e); }
}

export async function loadHeroSection() {}

export async function loadTop10Page() {
    const container = document.getElementById('top-10-page-list');
    const currentUserId = parseInt(localStorage.getItem('user_id')); 
    
    try {
        const response = await fetch(`${API_BASE}/recipes/top10`);
        const recipes = await response.json();
        
        container.innerHTML = '';
        if (recipes.length === 0) return container.innerHTML = '<p>No recipes found.</p>';

        recipes.forEach((recipe, index) => {
            const isMine = recipe.owner_id == currentUserId;
            const myBadgeHTML = isMine ? `<div class="my-recipe-badge"><span class="material-symbols-outlined" style="font-size: 14px;">person</span>שלי</div>` : '';

            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.onclick = () => goToRecipe(recipe.id);
            card.style.cursor = 'pointer'; 
            card.innerHTML = `
                ${myBadgeHTML}
                <div class="ranking-badge">#${index + 1}</div>
                <h3>${recipe.title}</h3>
                <p>קטגוריה: ${recipe.category}</p>
                <p style="font-size: 0.9em; color: gray; display: flex; align-items: center; gap: 4px;">
                    <span class="material-symbols-outlined" style="font-size: 16px;">visibility</span> 
                    ${recipe.views || 0} צפיות
                </p>
            `;
            container.appendChild(card);
        });
    } catch (e) { console.error(e); }
}

export async function loadRecentPage() {
    const container = document.getElementById('recent-page-list');
    const currentUserId = parseInt(localStorage.getItem('user_id')); 
    
    try {
        const response = await fetch(`${API_BASE}/recipes/recent?limit=100`);
        const recipes = await response.json();
        
        container.innerHTML = '';
        if (recipes.length === 0) return container.innerHTML = '<p>No recipes found.</p>';

        recipes.forEach(recipe => {
            container.appendChild(createRecipeCard(recipe, currentUserId));
        });
    } catch (e) { console.error(e); }
}
