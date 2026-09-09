import { API_BASE } from './config.js';
import { createRecipeCard, goToRecipe } from './utils.js';

export async function loadHomeRecipes() {
    const listContainer = document.getElementById('new-recipes-list');
    const topList = document.getElementById('top-recipes-list');
    const topSection = document.getElementById('top-10-section');
    
    const currentUserId = parseInt(localStorage.getItem('user_id'));
    
    if (!listContainer) return; 
    
    try {
        if (topList && topSection) {
            const [topRes, recentRes] = await Promise.all([
                fetch(`${API_BASE}/recipes/top10`),
                fetch(`${API_BASE}/recipes/recent`)
            ]);

            const topRecipes = await topRes.json();
            const recentRecipes = await recentRes.json();

            topList.innerHTML = '';
            if (topRecipes.length > 0) {
                const heroRecipe = topRecipes[0];
                const heroSection = document.getElementById('hero-section');
                
                if (heroSection) {
                    heroSection.style.display = 'block';
                    document.getElementById('hero-title').innerText = heroRecipe.title;
                    document.getElementById('hero-category').innerText = heroRecipe.category;
                    
                    const heroImg = document.getElementById('hero-image');
                    if (heroRecipe.image_url) {
                        heroImg.src = heroRecipe.image_url;
                    } else {
                        // Fallback image or hide image
                        heroImg.style.display = 'none';
                        heroSection.style.background = 'var(--color-dark)';
                    }
                    
                    heroSection.onclick = () => goToRecipe(heroRecipe.id);
                }

                if (topRecipes.length > 1) {
                    topSection.style.display = 'block'; 
                    // Render the rest in the horizontal scroll
                    topRecipes.slice(1).forEach(recipe => {
                        topList.appendChild(createRecipeCard(recipe, currentUserId));
                    });
                }
            }

            listContainer.innerHTML = '';
            if (recentRecipes.length > 0) {
                recentRecipes.forEach(recipe => {
                    listContainer.appendChild(createRecipeCard(recipe, currentUserId));
                });
            } else {
                listContainer.innerHTML = '<p>אין עדיין מתכונים. הוסף מתכון ראשון!</p>';
            }
        } else {
            const response = await fetch(`${API_BASE}/recipes`);
            const recipes = await response.json();
            listContainer.innerHTML = '';
            recipes.forEach(recipe => {
                listContainer.appendChild(createRecipeCard(recipe, currentUserId));
            });
        }
    } catch (e) { 
        console.error("Error loading homepage recipes:", e); 
    }
}
