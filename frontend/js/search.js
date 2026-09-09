export function setupSearch() {
    const searchInput = document.getElementById('recipe-search');

    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.trim();
            const recipeCards = document.querySelectorAll('.recipe-card');

            recipeCards.forEach(card => {
                const cardText = card.textContent;
                
                if (cardText.includes(searchTerm)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
}
