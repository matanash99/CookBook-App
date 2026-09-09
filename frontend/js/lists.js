import { API_BASE } from './config.js';
import { createRecipeCard, goToRecipe } from './utils.js';

function renderFilteredRecipes(recipesToDisplay, categoryName, container, titleElement) {
    const currentUserId = parseInt(localStorage.getItem('user_id'));

    if (titleElement) titleElement.innerText = categoryName;
    container.innerHTML = recipesToDisplay.length === 0 ? '<p>אין מתכונים.</p>' : '';
    
    recipesToDisplay.forEach(recipe => {
        container.appendChild(createRecipeCard(recipe, currentUserId));
    });
}

export async function loadMyRecipesPage() {
    const buttonsContainer = document.getElementById('my-category-buttons');
    const listContainer = document.getElementById('my-recipes-list');
    const titleElement = document.getElementById('my-selected-category-title');
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE}/users/me/saved-recipes`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) { if (response.status === 401) { localStorage.clear(); window.location.href = '/views/login.html'; } return; }
        const savedRecipes = await response.json();
        if (savedRecipes.length === 0) { buttonsContainer.innerHTML = ''; listContainer.innerHTML = '<p>אין מתכונים שמורים.</p>'; return; }
        const uniqueCategories = [...new Set(savedRecipes.map(r => r.category))];
        buttonsContainer.innerHTML = '';
        const allBtn = document.createElement('button');
        allBtn.innerText = 'הכל';
        allBtn.style.width = 'auto';
        allBtn.onclick = () => renderFilteredRecipes(savedRecipes, 'הכל', listContainer, titleElement);
        buttonsContainer.appendChild(allBtn);
        uniqueCategories.forEach(category => {
            const btn = document.createElement('button');
            btn.innerText = category;
            btn.style.width = 'auto';
            btn.onclick = () => renderFilteredRecipes(savedRecipes.filter(r => r.category === category), category, listContainer, titleElement);
            buttonsContainer.appendChild(btn);
        });
        renderFilteredRecipes(savedRecipes, 'הכל', listContainer, titleElement);
    } catch (e) { console.error(e); }
}

export async function loadCategoriesPage() {
    const buttonsContainer = document.getElementById('category-buttons');
    const listContainer = document.getElementById('filtered-recipes-list');
    const titleElement = document.getElementById('selected-category-title');
    try {
        const response = await fetch(`${API_BASE}/recipes`);
        const recipes = await response.json();
        buttonsContainer.innerHTML = '';
        
        const setActive = (clickedBtn) => {
            Array.from(buttonsContainer.children).forEach(btn => btn.classList.remove('active'));
            clickedBtn.classList.add('active');
        };

        const uniqueCategories = [...new Set(recipes.map(r => r.category))];
        
        const allBtn = document.createElement('button');
        allBtn.innerText = 'הכל';
        allBtn.style.width = 'auto';
        allBtn.classList.add('active');
        allBtn.onclick = () => { setActive(allBtn); renderFilteredRecipes(recipes, 'הכל', listContainer, titleElement); };
        buttonsContainer.appendChild(allBtn);

        const top10Btn = document.createElement('button');
        top10Btn.innerHTML = '🔥 המובילים';
        top10Btn.style.width = 'auto';
        top10Btn.style.borderColor = 'var(--color-accent)';
        top10Btn.onclick = async () => { 
            setActive(top10Btn); 
            titleElement.innerText = 'המובילים';
            listContainer.innerHTML = '<p>טוען...</p>';
            try {
                const topRes = await fetch(`${API_BASE}/recipes/top10`);
                const topRecipes = await topRes.json();
                renderFilteredRecipes(topRecipes, 'המובילים', listContainer, titleElement);
            } catch(e) { console.error(e); }
        };
        buttonsContainer.appendChild(top10Btn);

        uniqueCategories.forEach(category => {
            const btn = document.createElement('button');
            btn.innerText = category;
            btn.style.width = 'auto';
            btn.onclick = () => { setActive(btn); renderFilteredRecipes(recipes.filter(r => r.category === category), category, listContainer, titleElement); };
            buttonsContainer.appendChild(btn);
        });
        
        renderFilteredRecipes(recipes, 'הכל', listContainer, titleElement);
    } catch (e) { console.error(e); }
}

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
