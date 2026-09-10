import { API_BASE } from './config.js';
import { RECIPE_CATEGORIES } from './categories.js';

export async function loadSingleRecipe() {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');
    const token = localStorage.getItem('token');
    if (!recipeId) return;

    fetch(`${API_BASE}/recipes/${recipeId}/view`, { method: 'POST' }).catch(e => console.error(e));

    try {
        const response = await fetch(`${API_BASE}/recipes/${recipeId}`);
        const recipe = await response.json();

        document.getElementById('view-title').innerText = recipe.title;
        document.getElementById('view-category').innerText = recipe.category;

        const recipeImage = document.getElementById('view-recipe-image');
        if (recipe.image_url) {
            recipeImage.src = recipe.image_url;
            recipeImage.style.display = 'block'; 
        } else {
            recipeImage.style.display = 'none'; 
        }

        const ingList = document.getElementById('view-ingredients');
        ingList.className = 'checklist';
        ingList.innerHTML = recipe.ingredients.map(i => `<li><label><input type="checkbox"> <span>${i.amount} ${i.item}</span></label></li>`).join('');
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
            editBtn.onclick = () => window.location.href = `/views/edit-recipe.html?id=${recipeId}`;
            actionButtons.appendChild(editBtn);
            const delBtn = document.createElement('button');
            delBtn.innerText = 'מחק מתכון';
            delBtn.style.cssText = "background: #e74c3c; width: auto; margin-right: 10px;";
            delBtn.onclick = async () => {
                if (confirm('מחק לצמיתות?')) {
                    const res = await fetch(`${API_BASE}/recipes/${recipeId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) window.location.href = '/views/index.html';
                }
            };
            actionButtons.appendChild(delBtn);
        }
    } catch (e) { console.error(e); }
}

export async function loadEditRecipePage() {
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');
    const token = localStorage.getItem('token');
    if (!recipeId) return window.location.href = '/views/index.html';
    const ingContainer = document.getElementById('edit-ingredients-container');
    const instContainer = document.getElementById('edit-instructions-container');
    try {
        const response = await fetch(`${API_BASE}/recipes/${recipeId}`);
        const recipe = await response.json();
        
        const categorySelect = document.getElementById('edit-recipe-category');
        RECIPE_CATEGORIES.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.innerText = cat;
            categorySelect.appendChild(opt);
        });

        document.getElementById('edit-recipe-title').value = recipe.title;
        categorySelect.value = recipe.category;
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

        const editImageInput = document.getElementById('edit-dish-image-upload');

        const sendUpdate = async (base64Image) => {
            const payload = { title, category, ingredients, instructions };
            
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
                    window.location.href = `/views/view-recipe.html?id=${recipeId}`;
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
