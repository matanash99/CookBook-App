// --- 1. GLOBAL CONSTANTS & SELECTIONS ---
const API_BASE = 'http://127.0.0.1:8000/api';

const scanBtn = document.getElementById('scan-btn');
const saveBtn = document.getElementById('save-recipe-btn');
const fileInput = document.getElementById('recipe-image');
const uploadSection = document.getElementById('upload-section');
const reviewSection = document.getElementById('review-section');
const loadingMsg = document.getElementById('loading-msg');
const ingredientsContainer = document.getElementById('ingredients-container');
const instructionsContainer = document.getElementById('instructions-container');
const addIngredientBtn = document.getElementById('add-ingredient-btn');
const addInstructionBtn = document.getElementById('add-instruction-btn');

// --- 2. INITIALIZATION, ROUTING & AUTH GUARD ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    const path = window.location.pathname;
    const isLoginPage = path.includes('login.html');

    // 1. The Gatekeeper
    if (!token && !isLoginPage) {
        window.location.href = 'login.html';
        return; 
    }

    // 2. Dynamic Navigation Sync
    const nav = document.querySelector('nav');
    if (nav) {
        if (token) {
            const adminBadge = isAdmin ? ' ⭐' : '';
            nav.innerHTML = `
                <a href="index.html">ראשי</a>
                <a href="categories.html">קטגוריות</a>
                <a href="my-recipes.html">המתכונים שלי</a>
                <a href="upload.html">העלאת מתכון</a>
                <div style="margin-right: auto; display: flex; gap: 15px; align-items: center;">
                    <span style="color: var(--accent-color); font-weight: bold;">שלום, ${username}${adminBadge}</span>
                    <a href="#" id="logout-btn" style="color: #e74c3c; text-decoration: none; font-weight: bold;">התנתק</a>
                </div>
            `;

            document.getElementById('logout-btn').addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.clear();
                window.location.href = 'login.html';
            });
        } else {
            nav.innerHTML = `<a href="login.html" style="color: var(--accent-color);">התחברות</a>`;
        }
    }

    // --- PAGE ROUTING ---
    if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        loadHomeRecipes();
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
    if (document.getElementById('my-recipes-list')) {
        loadMyRecipesPage();
    }

    // --- AUTHENTICATION FORMS LOGIC ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            const usernameInput = document.getElementById('register-username').value;
            const passwordInput = document.getElementById('register-password').value;
            try {
                const response = await fetch(`${API_BASE}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: usernameInput, password: passwordInput })
                });
                if (response.ok) {
                    alert('החשבון נוצר בהצלחה!');
                    registerForm.reset();
                } else {
                    const data = await response.json();
                    alert(data.detail || 'שגיאה ביצירת החשבון');
                }
            } catch (error) { console.error('Error:', error); }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('login-username').value;
            const passwordInput = document.getElementById('login-password').value;
            try {
                const response = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: usernameInput, password: passwordInput })
                });
                if (response.ok) {
                    const data = await response.json();
                    localStorage.setItem('token', data.access_token);
                    localStorage.setItem('is_admin', data.is_admin);
                    localStorage.setItem('user_id', data.user_id);
                    localStorage.setItem('username', usernameInput);
                    window.location.href = 'index.html';
                } else {
                    alert('שם משתמש או סיסמה שגויים.');
                }
            } catch (error) { console.error('Error:', error); }
        });
    }
});

// --- 3. UPLOAD & SCAN PAGE LOGIC ---
if (scanBtn) {
    scanBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) return alert('אנא בחר תמונה קודם');
        loadingMsg.style.display = 'block';
        scanBtn.disabled = true;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch(`${API_BASE}/upload-scan`, { method: 'POST', body: formData });
            const data = await response.json();
            populateReviewSection(data);
            uploadSection.style.display = 'none';
            reviewSection.style.display = 'block';
        } catch (error) { alert('שגיאה בסריקה.'); }
        finally { loadingMsg.style.display = 'none'; scanBtn.disabled = false; }
    });
}

// Row management
function addIngredientRow(item = '', amount = '') {
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.innerHTML = `
        <input type="text" value="${item}" class="ing-item" required placeholder="מצרך">
        <input type="text" value="${amount}" class="ing-amount" required placeholder="כמות">
        <button type="button" class="remove-btn" onclick="this.parentElement.remove()">X</button>
    `;
    ingredientsContainer.appendChild(row);
}

if (addIngredientBtn) addIngredientBtn.addEventListener('click', () => addIngredientRow());

if (addInstructionBtn) {
    addInstructionBtn.addEventListener('click', () => {
        const row = document.createElement('div');
        row.className = 'instruction-row';
        row.innerHTML = `
            <textarea class="inst-text" required placeholder="תאר את שלב ההכנה..."></textarea>
            <button type="button" class="remove-btn" onclick="this.parentElement.remove()">מחק שלב</button>
        `;
        instructionsContainer.appendChild(row);
    });
}

function populateReviewSection(data) {
    ingredientsContainer.innerHTML = '';
    data.ingredients.forEach(ing => addIngredientRow(ing.item, ing.weight_or_quantity));
    instructionsContainer.innerHTML = '';
    data.instructions.forEach(inst => {
        const row = document.createElement('div');
        row.className = 'instruction-row';
        row.innerHTML = `
            <textarea class="inst-text" required>${inst}</textarea>
            <button type="button" class="remove-btn" onclick="this.parentElement.remove()">מחק שלב</button>
        `;
        instructionsContainer.appendChild(row);
    });
}

if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
        const title = document.getElementById('recipe-title').value;
        const category = document.getElementById('recipe-category').value;
        const token = localStorage.getItem('token');
        if (!title || !category) return alert('נא למלא שם וקטגוריה');

        const ingredients = Array.from(document.querySelectorAll('.ingredient-row')).map(row => ({
            item: row.querySelector('.ing-item').value,
            weight_or_quantity: row.querySelector('.ing-amount').value
        }));
        const instructions = Array.from(document.querySelectorAll('.instruction-row')).map(row => row.querySelector('.inst-text').value);

        try {
            const response = await fetch(`${API_BASE}/recipes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, category, ingredients, instructions })
            });
            if (response.ok) window.location.href = 'index.html';
        } catch (error) { alert('שגיאה בשמירה.'); }
    });
}

// --- 4. DATA FETCHING FUNCTIONS ---
async function loadHomeRecipes() {
    const listContainer = document.getElementById('new-recipes-list');
    if (!listContainer) return;
    try {
        const response = await fetch(`${API_BASE}/recipes`);
        const recipes = await response.json();
        listContainer.innerHTML = '';
        recipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `<h3>${recipe.title}</h3><p>קטגוריה: ${recipe.category}</p><button onclick="goToRecipe(${recipe.id})">צפה במתכון המלא</button>`;
            listContainer.appendChild(card);
        });
    } catch (e) { console.error(e); }
}

function goToRecipe(id) { window.location.href = `view-recipe.html?id=${id}`; }

async function loadSingleRecipe() {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');
    const token = localStorage.getItem('token');
    if (!recipeId) return;

    try {
        const response = await fetch(`${API_BASE}/recipes/${recipeId}`);
        const recipe = await response.json();

        document.getElementById('view-title').innerText = recipe.title;
        document.getElementById('view-category').innerText = recipe.category;

        const ingList = document.getElementById('view-ingredients');
        ingList.innerHTML = recipe.ingredients.map(i => `<li>${i.amount} ${i.item}</li>`).join('');
        const instList = document.getElementById('view-instructions');
        instList.innerHTML = recipe.instructions.map(s => `<li>${s}</li>`).join('');

        const actionButtons = document.getElementById('action-buttons');
        actionButtons.innerHTML = ''; 

        if (!token) return;

        // Check if saved
        let isAlreadySaved = false;
        const savedRes = await fetch(`${API_BASE}/users/me/saved-recipes`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (savedRes.ok) {
            const savedData = await savedRes.json();
            isAlreadySaved = savedData.some(r => r.id === parseInt(recipeId));
        }

        const saveBtn = document.createElement('button');
        saveBtn.style.width = 'auto';
        saveBtn.style.background = isAlreadySaved ? '#95a5a6' : '#3498db';
        saveBtn.innerText = isAlreadySaved ? 'הסר מהמתכונים שלי' : 'שמור למתכונים שלי';
        saveBtn.onclick = async () => {
            const method = isAlreadySaved ? 'DELETE' : 'POST';
            const res = await fetch(`${API_BASE}/recipes/${recipeId}/save`, { method, headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) loadSingleRecipe();
        };
        actionButtons.appendChild(saveBtn);

        const currentUserId = parseInt(localStorage.getItem('user_id'));
        const isAdmin = localStorage.getItem('is_admin') === 'true';

        // --- THE OWNER/ADMIN ACTIONS ---
        if (recipe.owner_id === currentUserId || isAdmin) {
            const editBtn = document.createElement('button');
            editBtn.innerText = 'ערוך מתכון';
            editBtn.style.cssText = "background: #f1c40f; color: black; width: auto; margin-right: 10px;";
            editBtn.onclick = () => window.location.href = `edit-recipe.html?id=${recipeId}`;
            actionButtons.appendChild(editBtn);

            const delBtn = document.createElement('button');
            delBtn.innerText = 'מחק מתכון';
            delBtn.style.cssText = "background: #e74c3c; width: auto; margin-right: 10px;";
            delBtn.onclick = async () => {
                if (confirm('האם אתה בטוח שברצונך למחוק מתכון זה לצמיתות?')) {
                    const res = await fetch(`${API_BASE}/recipes/${recipeId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) window.location.href = 'index.html';
                }
            };
            actionButtons.appendChild(delBtn);
        }
    } catch (e) { console.error(e); }
}

async function loadMyRecipesPage() {
    const buttonsContainer = document.getElementById('my-category-buttons');
    const listContainer = document.getElementById('my-recipes-list');
    const titleElement = document.getElementById('my-selected-category-title');
    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_BASE}/users/me/saved-recipes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.clear();
                window.location.href = 'login.html';
            }
            return;
        }

        const savedRecipes = await response.json();
        if (savedRecipes.length === 0) {
            buttonsContainer.innerHTML = '';
            listContainer.innerHTML = '<p>עדיין לא שמרת אף מתכון.</p>';
            return;
        }

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
            btn.onclick = () => {
                const filtered = savedRecipes.filter(r => r.category === category);
                renderFilteredRecipes(filtered, category, listContainer, titleElement);
            };
            buttonsContainer.appendChild(btn);
        });

        renderFilteredRecipes(savedRecipes, 'הכל', listContainer, titleElement);
    } catch (e) { console.error(e); }
}

async function loadCategoriesPage() {
    const buttonsContainer = document.getElementById('category-buttons');
    const listContainer = document.getElementById('filtered-recipes-list');
    const titleElement = document.getElementById('selected-category-title');
    try {
        const response = await fetch(`${API_BASE}/recipes`);
        const recipes = await response.json();
        buttonsContainer.innerHTML = '';
        const uniqueCategories = [...new Set(recipes.map(r => r.category))];

        const allBtn = document.createElement('button');
        allBtn.innerText = 'הכל';
        allBtn.style.width = 'auto';
        allBtn.onclick = () => renderFilteredRecipes(recipes, 'כל המתכונים', listContainer, titleElement);
        buttonsContainer.appendChild(allBtn);

        uniqueCategories.forEach(category => {
            const btn = document.createElement('button');
            btn.innerText = category;
            btn.style.width = 'auto';
            btn.onclick = () => renderFilteredRecipes(recipes.filter(r => r.category === category), category, listContainer, titleElement);
            buttonsContainer.appendChild(btn);
        });
        renderFilteredRecipes(recipes, 'כל המתכונים', listContainer, titleElement);
    } catch (e) { console.error(e); }
}

function renderFilteredRecipes(recipesToDisplay, categoryName, container, titleElement) {
    titleElement.innerText = categoryName;
    container.innerHTML = recipesToDisplay.length === 0 ? '<p>אין מתכונים.</p>' : '';
    recipesToDisplay.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.innerHTML = `<h3>${recipe.title}</h3><p>קטגוריה: ${recipe.category}</p><button onclick="goToRecipe(${recipe.id})">צפה במתכון המלא</button>`;
        container.appendChild(card);
    });
}

async function loadEditRecipePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');
    const token = localStorage.getItem('token');
    if (!recipeId) return window.location.href = 'index.html';

    const ingContainer = document.getElementById('edit-ingredients-container');
    const instContainer = document.getElementById('edit-instructions-container');

    try {
        const response = await fetch(`${API_BASE}/recipes/${recipeId}`);
        const recipe = await response.json();
        document.getElementById('edit-recipe-title').value = recipe.title;
        document.getElementById('edit-recipe-category').value = recipe.category;

        recipe.ingredients.forEach(ing => {
            const row = document.createElement('div');
            row.className = 'ingredient-row';
            row.innerHTML = `<input type="text" value="${ing.item}" class="ing-item" required><input type="text" value="${ing.amount}" class="ing-amount" required><button type="button" class="remove-btn" onclick="this.parentElement.remove()">X</button>`;
            ingContainer.appendChild(row);
        });

        recipe.instructions.forEach(step => {
            const row = document.createElement('div');
            row.className = 'instruction-row';
            row.innerHTML = `<textarea class="inst-text" required>${step}</textarea><button type="button" class="remove-btn" onclick="this.parentElement.remove()">מחק שלב</button>`;
            instContainer.appendChild(row);
        });
    } catch (e) { console.error(e); }

    document.getElementById('edit-add-ingredient-btn').onclick = () => {
        const row = document.createElement('div');
        row.className = 'ingredient-row';
        row.innerHTML = `<input type="text" class="ing-item" required placeholder="מצרך"><input type="text" class="ing-amount" required placeholder="כמות"><button type="button" class="remove-btn" onclick="this.parentElement.remove()">X</button>`;
        ingContainer.appendChild(row);
    };

    document.getElementById('edit-add-instruction-btn').onclick = () => {
        const row = document.createElement('div');
        row.className = 'instruction-row';
        row.innerHTML = `<textarea class="inst-text" required placeholder="שלב..."></textarea><button type="button" class="remove-btn" onclick="this.parentElement.remove()">מחק</button>`;
        instContainer.appendChild(row);
    };

    document.getElementById('update-recipe-btn').onclick = async () => {
        const ingredients = Array.from(document.querySelectorAll('#edit-ingredients-container .ingredient-row')).map(row => ({
            item: row.querySelector('.ing-item').value,
            weight_or_quantity: row.querySelector('.ing-amount').value
        }));
        const instructions = Array.from(document.querySelectorAll('#edit-instructions-container .instruction-row')).map(row => row.querySelector('.inst-text').value);

        const res = await fetch(`${API_BASE}/recipes/${recipeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                title: document.getElementById('edit-recipe-title').value,
                category: document.getElementById('edit-recipe-category').value,
                ingredients,
                instructions
            })
        });
        if (res.ok) window.location.href = `view-recipe.html?id=${recipeId}`;
    };
}