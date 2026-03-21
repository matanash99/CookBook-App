// FIXED: Dynamic IP detection so phone and PC both work
const API_BASE = '/api';

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

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    const path = window.location.pathname;
    const isLoginPage = path.includes('login.html');

    if (!token && !isLoginPage) {
        window.location.href = 'login.html';
        return; 
    }

    // 1. Find the elements that ALREADY exist in your HTML
    const greetingElement = document.querySelector('.user-greeting');
    const logoutBtn = document.querySelector('.logout-btn');

    // 2. Just update the text, don't destroy the layout!
    if (token) {
        const adminBadge = isAdmin ? ' ⭐' : '';
        if (greetingElement) {
            greetingElement.innerText = `שלום, ${username}${adminBadge}`;
        }
        
        if (logoutBtn) {
            logoutBtn.id = 'logout-btn'; // Add the ID so the click event works
            logoutBtn.innerText = 'התנתק';
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.clear();
                window.location.href = 'login.html';
            });
        }
    } else {
        // If not logged in, change the greeting and button
        if (greetingElement) greetingElement.style.display = 'none';
        if (logoutBtn) {
            logoutBtn.innerText = 'התחברות';
            logoutBtn.href = 'login.html';
        }
    }

    if (path.includes('index.html') || path === '/' || path.endsWith('/')) loadHomeRecipes();
    if (document.getElementById('recipe-detail')) loadSingleRecipe();
    if (document.getElementById('category-buttons')) loadCategoriesPage();
    if (document.getElementById('edit-recipe-page')) loadEditRecipePage();
    if (document.getElementById('my-recipes-list')) loadMyRecipesPage();
    if (document.getElementById('top-10-page-list')) loadTop10Page();
    if (document.getElementById('recent-page-list')) loadRecentPage();

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
            } catch (error) { 
                console.error('Error:', error); 
                alert('שגיאת חיבור: ' + error.message);
            }
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
            } catch (error) { 
                console.error('Error:', error); 
                alert('שגיאת חיבור: ' + error.message); // FIXED: Prevents silent failure
            }
        });
    }
});

if (scanBtn) {
    scanBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) return alert('אנא בחר תמונה קודם');
        
        loadingMsg.style.display = 'block';
        loadingMsg.innerText = 'מכווץ תמונה...'; 
        scanBtn.disabled = true;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = async function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; 
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;

                // ADD THIS LINE HERE:
                alert("כיווץ הצליח! שולח תמונה קטנה לשרת..."); 

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                canvas.toBlob(async (blob) => {
                    const formData = new FormData();
                    formData.append('file', blob, 'recipe.jpg');
                    
                    loadingMsg.innerText = 'סורק בעזרת AI...'; 
                    
                    try {
                        const response = await fetch(`${API_BASE}/upload-scan`, { method: 'POST', body: formData });
                        
                        if (!response.ok) {
                            // This grabs the "detail" message we wrote in Python
                            const errorData = await response.json();
                            throw new Error(errorData.detail || "שגיאה לא ידועה בסריקה");
                        }
                        
                        const data = await response.json();
                        populateReviewSection(data);
                        uploadSection.style.display = 'none';
                        reviewSection.style.display = 'block';

                    } catch (error) { 
                        // This will now show your Hebrew "Daily Limit Reached" message!
                        alert('שים לב: ' + error.message); 
                    } finally { 
                        loadingMsg.style.display = 'none'; 
                        scanBtn.disabled = false; 
                    }
                }, 'image/jpeg', 0.5); 
            }
        };
    });
}

// ==========================================
// MANUAL ENTRY BUTTON LOGIC
// ==========================================
const manualEntryBtn = document.getElementById('manual-entry-btn');

if (manualEntryBtn) {
    manualEntryBtn.addEventListener('click', () => {
        // 1. Hide the upload area
        uploadSection.style.display = 'none';
        
        // 2. Clear out any old data just to be safe
        document.getElementById('recipe-title').value = '';
        document.getElementById('recipe-category').value = '';
        ingredientsContainer.innerHTML = '';
        instructionsContainer.innerHTML = '';

        // 3. Add one empty ingredient row to start
        addIngredientRow('', '');
        
        // 4. Add one empty instruction row to start
        const instRow = document.createElement('div');
        instRow.className = 'instruction-row';
        instRow.innerHTML = `
            <textarea class="inst-text" required placeholder="תאר את שלב ההכנה..."></textarea>
            <button type="button" class="remove-btn" onclick="this.parentElement.remove()">מחק שלב</button>
        `;
        instructionsContainer.appendChild(instRow);

        // 5. Show the manual input form!
        reviewSection.style.display = 'block';
    });
}


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

        // Check if the user uploaded a photo of the dish
        const dishImageInput = document.getElementById('dish-image-upload');
        let dishImageData = null;

        // Helper function to actually send the data to the server
        const sendToServer = async (base64Image) => {
            const payload = { 
                title, 
                category, 
                ingredients, 
                instructions 
            };
            
            // Add the image to the payload if it exists
            if (base64Image) {
                payload.image_url = base64Image;
            }

            try {
                // Change button text so the user knows it's working
                saveBtn.innerText = 'שומר...';
                saveBtn.disabled = true;

                const response = await fetch(`${API_BASE}/recipes`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });
                
                if (response.ok) {
                    window.location.href = 'index.html';
                } else {
                    alert('שגיאה בשמירת המתכון.');
                    saveBtn.innerText = 'שמור מתכון';
                    saveBtn.disabled = false;
                }
            } catch (error) { 
                alert('שגיאת תקשורת.'); 
                saveBtn.innerText = 'שמור מתכון';
                saveBtn.disabled = false;
            }
        };

        // If there's a file, read it first, then send. Otherwise, send immediately.
        if (dishImageInput && dishImageInput.files.length > 0) {
            const file = dishImageInput.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function(event) {
                sendToServer(event.target.result);
            };
        } else {
            sendToServer(null);
        }
    });
}

async function loadHomeRecipes() {
    const listContainer = document.getElementById('new-recipes-list');
    const topList = document.getElementById('top-recipes-list');
    const topSection = document.getElementById('top-10-section');
    
    if (!listContainer) return; // Exit if we are not on the homepage
    
    try {
        // Check if we are on the new homepage layout with the Top 10 section
        if (topList && topSection) {
            // Fetch both lists from the backend at the exact same time
            const [topRes, recentRes] = await Promise.all([
                fetch(`${API_BASE}/recipes/top10`),
                fetch(`${API_BASE}/recipes/recent`)
            ]);

            const topRecipes = await topRes.json();
            const recentRecipes = await recentRes.json();

            // 1. Render the Top 10 List (Horizontal)
            topList.innerHTML = '';
            if (topRecipes.length > 0) {
                topSection.style.display = 'block'; // Unhide the Top 10 section
                topRecipes.forEach((recipe, index) => {
                    const card = document.createElement('div');
                    card.className = 'recipe-card';
                    // Add the Golden Ranking Badge to each card based on its index
                    card.innerHTML = `
                        <div class="ranking-badge">#${index + 1}</div>
                        <h3>${recipe.title}</h3>
                        <p>קטגוריה: ${recipe.category}</p>
                        <button onclick="goToRecipe(${recipe.id})">צפה במתכון המלא</button>
                    `;
                    topList.appendChild(card);
                });
            }

            // 2. Render the Recent Recipes List (Vertical)
            listContainer.innerHTML = '';
            if (recentRecipes.length > 0) {
                recentRecipes.forEach(recipe => {
                    const card = document.createElement('div');
                    card.className = 'recipe-card';
                    card.innerHTML = `<h3>${recipe.title}</h3><p>קטגוריה: ${recipe.category}</p><button onclick="goToRecipe(${recipe.id})">צפה במתכון המלא</button>`;
                    listContainer.appendChild(card);
                });
            } else {
                listContainer.innerHTML = '<p>אין עדיין מתכונים. הוסף מתכון ראשון!</p>';
            }
        } else {
            // Fallback just in case the HTML hasn't been updated yet
            const response = await fetch(`${API_BASE}/recipes`);
            const recipes = await response.json();
            listContainer.innerHTML = '';
            recipes.forEach(recipe => {
                const card = document.createElement('div');
                card.className = 'recipe-card';
                card.innerHTML = `<h3>${recipe.title}</h3><p>קטגוריה: ${recipe.category}</p><button onclick="goToRecipe(${recipe.id})">צפה במתכון המלא</button>`;
                listContainer.appendChild(card);
            });
        }
    } catch (e) { 
        console.error("Error loading homepage recipes:", e); 
    }
}

function goToRecipe(id) { window.location.href = `view-recipe.html?id=${id}`; }

async function loadSingleRecipe() {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');
    const token = localStorage.getItem('token');
    if (!recipeId) return;

    // It silently sends a POST request to the server to add +1 to the view count.
    fetch(`${API_BASE}/recipes/${recipeId}/view`, { method: 'POST' }).catch(e => console.error(e));

    try {
        const response = await fetch(`${API_BASE}/recipes/${recipeId}`);
        const recipe = await response.json();

        document.getElementById('view-title').innerText = recipe.title;
        document.getElementById('view-category').innerText = recipe.category;

        // --- IMAGE LOGIC ---
        const recipeImage = document.getElementById('view-recipe-image');
        if (recipe.image_url) {
            recipeImage.src = recipe.image_url;
            recipeImage.style.display = 'block'; // Unhide the image!
        } else {
            recipeImage.style.display = 'none'; // Keep it hidden if no photo exists
        }

        const ingList = document.getElementById('view-ingredients');
        ingList.innerHTML = recipe.ingredients.map(i => `<li>${i.amount} ${i.item}</li>`).join('');
        const instList = document.getElementById('view-instructions');
        instList.innerHTML = recipe.instructions.map(s => `<li>${s}</li>`).join('');
        const actionButtons = document.getElementById('action-buttons');
        actionButtons.innerHTML = ''; 
        if (!token) return;
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
                if (confirm('מחק לצמיתות?')) {
                    const res = await fetch(`${API_BASE}/recipes/${recipeId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
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
        const response = await fetch(`${API_BASE}/users/me/saved-recipes`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!response.ok) { if (response.status === 401) { localStorage.clear(); window.location.href = 'login.html'; } return; }
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
        const updateBtn = document.getElementById('update-recipe-btn');
        const title = document.getElementById('edit-recipe-title').value;
        const category = document.getElementById('edit-recipe-category').value;
        
        const ingredients = Array.from(document.querySelectorAll('#edit-ingredients-container .ingredient-row')).map(row => ({ 
            item: row.querySelector('.ing-item').value, 
            weight_or_quantity: row.querySelector('.ing-amount').value 
        }));
        const instructions = Array.from(document.querySelectorAll('#edit-instructions-container .instruction-row')).map(row => row.querySelector('.inst-text').value);

        // Check if the user selected a NEW photo
        const editImageInput = document.getElementById('edit-dish-image-upload');

        const sendUpdate = async (base64Image) => {
            const payload = { title, category, ingredients, instructions };
            
            // Only include the image_url in the payload if they actually uploaded a new one
            if (base64Image) {
                payload.image_url = base64Image;
            }

            try {
                updateBtn.innerText = 'מעדכן...';
                updateBtn.disabled = true;

                const res = await fetch(`${API_BASE}/recipes/${recipeId}`, { 
                    method: 'PUT', 
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
                    body: JSON.stringify(payload) 
                });
                
                if (res.ok) {
                    window.location.href = `view-recipe.html?id=${recipeId}`;
                } else {
                    alert('שגיאה בעדכון המתכון.');
                    updateBtn.innerText = 'עדכן מתכון';
                    updateBtn.disabled = false;
                }
            } catch (error) {
                alert('שגיאת תקשורת.');
                updateBtn.innerText = 'עדכן מתכון';
                updateBtn.disabled = false;
            }
        };

        // If they chose a new file, read it and send. If not, send the update without an image!
        if (editImageInput && editImageInput.files.length > 0) {
            const file = editImageInput.files[0];
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function(event) {
                sendUpdate(event.target.result);
            };
        } else {
            sendUpdate(null);
        }
    };
}

// ==========================================
// LIVE SEARCH FUNCTIONALITY
// ==========================================
const searchInput = document.getElementById('recipe-search');

if (searchInput) {
    searchInput.addEventListener('input', function(e) {
        // Get the text the user typed
        const searchTerm = e.target.value.trim();
        
        // Find all recipe cards currently on the page
        const recipeCards = document.querySelectorAll('.recipe-card');

        recipeCards.forEach(card => {
            // We check the entire text of the card, so it searches titles AND ingredients!
            const cardText = card.textContent;
            
            // If the card contains the search term, show it. Otherwise, hide it.
            if (cardText.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// Function for the dedicated Top 10 Page
async function loadTop10Page() {
    const container = document.getElementById('top-10-page-list');
    try {
        const response = await fetch(`${API_BASE}/recipes/top10`);
        const recipes = await response.json();
        
        container.innerHTML = '';
        if (recipes.length === 0) return container.innerHTML = '<p>No recipes found.</p>';

        recipes.forEach((recipe, index) => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            // Keeping the ranking badges here as well, plus showing the view count!
            card.innerHTML = `
                <div class="ranking-badge">#${index + 1}</div>
                <h3>${recipe.title}</h3>
                <p>קטגוריה: ${recipe.category}</p>
                <p style="font-size: 0.9em; color: gray;">👀 ${recipe.views || 0} צפיות</p>
                <button onclick="goToRecipe(${recipe.id})">צפה במתכון המלא</button>
            `;
            container.appendChild(card);
        });
    } catch (e) { console.error(e); }
}

// Function for the dedicated Recent Recipes Page
async function loadRecentPage() {
    const container = document.getElementById('recent-page-list');
    try {
        // Fetch up to 100 recent recipes for the dedicated page
        const response = await fetch(`${API_BASE}/recipes/recent?limit=100`);
        const recipes = await response.json();
        
        container.innerHTML = '';
        if (recipes.length === 0) return container.innerHTML = '<p>No recipes found.</p>';

        recipes.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `
                <h3>${recipe.title}</h3>
                <p>קטגוריה: ${recipe.category}</p>
                <button onclick="goToRecipe(${recipe.id})">צפה במתכון המלא</button>
            `;
            container.appendChild(card);
        });
    } catch (e) { console.error(e); }
}