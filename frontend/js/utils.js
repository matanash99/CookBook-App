export function goToRecipe(id) {
    window.location.href = `/views/view-recipe.html?id=${id}`;
}

export function createRecipeCard(recipe, currentUserId) {
    const isMine = recipe.owner_id === currentUserId;
    const myBadgeHTML = isMine ? `<div class="my-recipe-badge"><span class="material-symbols-outlined" style="font-size: 14px;">person</span>שלי</div>` : '';

    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.onclick = () => goToRecipe(recipe.id); 
    card.style.cursor = 'pointer'; 
    card.innerHTML = `
        ${myBadgeHTML}
        <div style="padding-right: 5px;">
            <h3 style="margin: 0 0 6px 0; font-size: 1.2rem;">${recipe.title}</h3>
            <p style="margin: 0; font-size: 0.9rem; opacity: 0.8;">קטגוריה: ${recipe.category}</p>
        </div>
    `;
    return card;
}
