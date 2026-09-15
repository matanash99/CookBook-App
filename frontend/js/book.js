import { API_BASE } from './config.js';

let binders = {}; // { "CategoryName": [recipe1, recipe2] }
let currentBinderCategory = null;
let currentRecipes = [];
let currentPageIndex = 0; // 0 = TOC, 1 = recipe[0], 2 = recipe[1]...

// Elegant cover colors for the binders
const COVER_COLORS = [
    '#2c3e50', // Navy
    '#8B0000', // Crimson
    '#2E8B57', // Sea Green
    '#B8860B', // Dark Goldenrod
    '#4B0082', // Indigo
    '#2F4F4F', // Dark Slate Gray
    '#8B4513'  // Saddle Brown
];

function getColorForCategory(category) {
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COVER_COLORS[Math.abs(hash) % COVER_COLORS.length];
}

export async function initLibrary() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/users/me/saved-recipes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/views/login.html';
                return;
            }
            throw new Error("Failed to fetch recipes");
        }
        const recipes = await response.json();
        
        // Group by category
        binders = {};
        recipes.forEach(recipe => {
            const cat = recipe.category || 'כללי';
            if (!binders[cat]) binders[cat] = [];
            binders[cat].push(recipe);
        });

        renderLibrary();
        setupEventListeners();
    } catch (err) {
        console.error("Error loading library", err);
        document.getElementById('binder-shelf').innerHTML = '<p>שגיאה בטעינת הקלסרים.</p>';
    }
}

function renderLibrary() {
    const shelf = document.getElementById('binder-shelf');
    shelf.innerHTML = '';
    
    const categories = Object.keys(binders);
    if (categories.length === 0) {
        shelf.innerHTML = '<p>עדיין לא שמרת מתכונים. התחל לחקור ולהוסיף לקלסרים שלך!</p>';
        return;
    }

    categories.forEach(cat => {
        const color = getColorForCategory(cat);
        const count = binders[cat].length;
        
        const bookWrapper = document.createElement('div');
        bookWrapper.className = 'book-wrapper';
        
        const bookInner = document.createElement('div');
        bookInner.className = 'book-inner';
        bookInner.style.backgroundColor = color;
        
        // The Spine
        const bookSpine = document.createElement('div');
        bookSpine.className = 'book-spine';
        
        const spineText = document.createElement('span');
        spineText.className = 'spine-text';
        spineText.innerText = cat;
        bookSpine.appendChild(spineText);
        
        // The Cover
        const bookCover = document.createElement('div');
        bookCover.className = 'book-cover';
        
        const label = document.createElement('div');
        label.className = 'binder-label';
        label.innerText = cat;
        
        const countLabel = document.createElement('div');
        countLabel.className = 'binder-count';
        countLabel.innerText = `${count} מתכונים`;
        
        bookCover.appendChild(label);
        bookCover.appendChild(countLabel);
        
        bookInner.appendChild(bookSpine);
        bookInner.appendChild(bookCover);
        
        bookWrapper.appendChild(bookInner);
        
        bookWrapper.addEventListener('click', () => openBinder(cat));
        shelf.appendChild(bookWrapper);
    });
}

function setupEventListeners() {
    // Check if buttons exist before adding listeners to avoid null errors on other pages
    const closeBtn = document.getElementById('close-book-btn');
    if (!closeBtn) return;

    closeBtn.addEventListener('click', closeBinder);
    
    document.getElementById('book-search').addEventListener('input', (e) => {
        if (!currentBinderCategory) return;
        const query = e.target.value.toLowerCase();
        
        if (query.trim() === '') {
            currentRecipes = binders[currentBinderCategory];
        } else {
            currentRecipes = binders[currentBinderCategory].filter(r => 
                r.title.toLowerCase().includes(query)
            );
        }
        
        // Go back to TOC when searching
        currentPageIndex = 0;
        renderPage();
    });

    document.getElementById('page-dog-ear').addEventListener('click', () => {
        if (currentPageIndex < currentRecipes.length) {
            turnPage(currentPageIndex + 1);
        }
    });
}

function openBinder(category) {
    currentBinderCategory = category;
    currentRecipes = binders[category];
    currentPageIndex = 0;
    
    document.getElementById('open-book-title').textContent = category;
    document.getElementById('book-search').value = '';
    
    document.getElementById('library-view').style.display = 'none';
    document.getElementById('open-book-view').style.display = 'block';
    
    renderPage();
}

function closeBinder() {
    currentBinderCategory = null;
    document.getElementById('open-book-view').style.display = 'none';
    document.getElementById('library-view').style.display = 'block';
}

function turnPage(newIndex) {
    const pageContent = document.getElementById('binder-page-content');
    pageContent.classList.add('turning');
    
    setTimeout(() => {
        currentPageIndex = newIndex;
        renderPage();
        pageContent.classList.remove('turning');
    }, 200); // Wait for CSS animation
}

async function renderPage() {
    const pageContent = document.getElementById('binder-page-content');
    const dogEar = document.getElementById('page-dog-ear');
    
    // Hide dog ear if on last page
    dogEar.style.display = (currentPageIndex >= currentRecipes.length) ? 'none' : 'block';

    if (currentPageIndex === 0) {
        // Table of Contents
        let html = '<h2 style="font-family: var(--font-serif); border-bottom: 2px solid var(--color-dark); padding-bottom: 10px;">תוכן עניינים</h2>';
        
        if (currentRecipes.length === 0) {
            html += '<p>לא נמצאו מתכונים בחיפוש זה.</p>';
        } else {
            currentRecipes.forEach((recipe, idx) => {
                html += `
                    <div class="toc-item" data-index="${idx + 1}">
                        <span class="recipe-title">${recipe.title}</span>
                        <span class="page-num">עמוד ${idx + 1}</span>
                    </div>
                `;
            });
        }
        pageContent.innerHTML = html;
        
        // Add click events to TOC items
        pageContent.querySelectorAll('.toc-item').forEach(item => {
            item.addEventListener('click', () => {
                turnPage(parseInt(item.getAttribute('data-index')));
            });
        });
    } else {
        // Recipe Page
        const recipeSummary = currentRecipes[currentPageIndex - 1];
        pageContent.innerHTML = '<p>טוען מתכון...</p>';
        
        try {
            // Fetch full recipe details
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/recipes/${recipeSummary.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Recipe not found');
            const fullRecipe = await response.json();
            
            let html = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px;">
                    <div>
                        <h1 style="font-family: var(--font-serif); font-size: 2.5rem; margin: 0;">${fullRecipe.title}</h1>
                        <span style="color: #666; font-size: 0.9rem;">עמוד ${currentPageIndex} מתוך ${currentRecipes.length}</span>
                    </div>
                </div>
            `;
            
            if (fullRecipe.image_url) {
                html += `<img src="${fullRecipe.image_url}" style="width: 100%; height: 250px; object-fit: cover; border-radius: 2px; margin-bottom: 30px;">`;
            }
            
            html += `
                <div style="display: flex; gap: 40px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 250px;">
                        <h3 style="font-family: var(--font-serif); border-bottom: 1px solid #ddd; padding-bottom: 5px;">מצרכים:</h3>
                        <ul class="checklist" style="padding-right: 0; margin-top: 15px;">
                            ${fullRecipe.ingredients.map(i => `
                                <li>
                                    <label style="display: flex; align-items: center; gap: 12px; line-height: 1.4;">
                                        <input type="checkbox" style="width: 20px !important; height: 20px !important; margin: 0 !important; padding: 0 !important;">
                                        <span>${i.amount} ${i.item}</span>
                                    </label>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <div style="flex: 2; min-width: 300px;">
                        <h3 style="font-family: var(--font-serif); border-bottom: 1px solid #ddd; padding-bottom: 5px;">הוראות הכנה:</h3>
                        <ol style="padding-right: 20px; margin-top: 15px;">
                            ${fullRecipe.instructions.map(step => `<li style="margin-bottom: 15px; line-height: 1.6;">${step}</li>`).join('')}
                        </ol>
                    </div>
                </div>
                
                <div style="margin-top: 40px; text-align: center;">
                    <button class="remove-btn" onclick="turnPage(0)" style="width: auto;">חזור לתוכן העניינים</button>
                </div>
            `;
            
            pageContent.innerHTML = html;
        } catch (err) {
            pageContent.innerHTML = '<p>שגיאה בטעינת המתכון.</p><button onclick="turnPage(0)">חזור</button>';
        }
    }
}

// Expose turnPage globally for inline onclick handlers
window.turnPage = turnPage;
