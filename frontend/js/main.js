import { setupAuth } from './auth.js';
import { setupUpload } from './upload.js';
import { loadHomeRecipes } from './home.js';
import { loadSingleRecipe, loadEditRecipePage } from './recipe.js';
import { loadCategoriesPage, loadMyRecipesPage, loadTop10Page, loadRecentPage } from './lists.js';
import { setupSearch } from './search.js';
import { initLibrary } from './book.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Authentication Check & Top Nav Setup
    setupAuth();

    // 2. Setup any feature that relies on checking DOM elements
    setupUpload();
    setupSearch();

    // 3. Routing logic based on page elements
    const path = window.location.pathname;

    if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        loadCategoriesPage();
    }
    
    if (document.getElementById('recipe-detail')) {
        loadSingleRecipe();
    }
    
    if (document.getElementById('category-buttons')) {
        loadCategoriesPage();
    }
    
    if (document.getElementById('edit-recipe-page')) {
        loadEditRecipePage();
    }
    
    if (document.getElementById('my-recipes-main')) {
        initLibrary();
    }
    
    if (document.getElementById('top-10-page-list')) {
        loadTop10Page();
    }
    
    if (document.getElementById('recent-page-list')) {
        loadRecentPage();
    }
});
