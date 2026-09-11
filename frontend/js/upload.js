import { API_BASE } from './config.js';
import { RECIPE_CATEGORIES } from './categories.js';

export function setupUpload() {
    const categorySelect = document.getElementById('recipe-category');
    if (categorySelect) {
        RECIPE_CATEGORIES.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.innerText = cat;
            categorySelect.appendChild(opt);
        });
    }
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
    const fileNameDisplay = document.getElementById('file-name-display');
    const manualEntryBtn = document.getElementById('manual-entry-btn');

    if (fileInput && fileNameDisplay) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                const fileName = fileInput.files[0].name;
                fileNameDisplay.innerText = `✅ התמונה נבחרה: ${fileName}`;
                fileNameDisplay.style.color = '#27ae60'; 
            }
        });
    }

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
                                let errorData;
                                try {
                                    errorData = await response.json();
                                } catch (e) {
                                    const text = await response.text();
                                    throw new Error(text || "שגיאת שרת פנימית (500)");
                                }
                                throw new Error(errorData?.detail || "שגיאה לא ידועה בסריקה");
                            }
                            
                            const data = await response.json();
                            populateReviewSection(data);
                            uploadSection.style.display = 'none';
                            reviewSection.style.display = 'block';

                        } catch (error) { 
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

    if (manualEntryBtn) {
        manualEntryBtn.addEventListener('click', () => {
            uploadSection.style.display = 'none';
            
            document.getElementById('recipe-title').value = '';
            document.getElementById('recipe-category').value = '';
            ingredientsContainer.innerHTML = '';
            instructionsContainer.innerHTML = '';

            addIngredientRow('', '');
            
            const instRow = document.createElement('div');
            instRow.className = 'instruction-row';
            instRow.innerHTML = `
                <textarea class="inst-text" required placeholder="תאר את שלב ההכנה..."></textarea>
                <button type="button" class="remove-btn" onclick="this.parentElement.remove()">מחק שלב</button>
            `;
            instructionsContainer.appendChild(instRow);

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

    const appendScanBtn = document.getElementById('append-scan-btn');
    const appendScanUpload = document.getElementById('append-scan-upload');
    const appendLoadingMsg = document.getElementById('append-loading-msg');

    if (appendScanBtn && appendScanUpload) {
        appendScanBtn.addEventListener('click', () => {
            appendScanUpload.click();
        });

        appendScanUpload.addEventListener('change', async () => {
            if (appendScanUpload.files.length === 0) return;
            const file = appendScanUpload.files[0];
            
            appendLoadingMsg.style.display = 'block';
            appendScanBtn.disabled = true;

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

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    
                    canvas.toBlob(async (blob) => {
                        const formData = new FormData();
                        formData.append('file', blob, 'append_recipe.jpg');
                        
                        try {
                            const response = await fetch(`${API_BASE}/upload-scan`, { method: 'POST', body: formData });
                            if (!response.ok) {
                                let errorData;
                                try {
                                    errorData = await response.json();
                                } catch (e) {
                                    const text = await response.text();
                                    throw new Error(text || "שגיאת שרת פנימית (500)");
                                }
                                throw new Error(errorData?.detail || "שגיאה בסריקת ההמשך");
                            }
                            const data = await response.json();
                            
                            // Append ingredients without clearing
                            data.ingredients.forEach(ing => addIngredientRow(ing.item, ing.weight_or_quantity));
                            
                            // Append instructions without clearing
                            data.instructions.forEach(inst => {
                                const row = document.createElement('div');
                                row.className = 'instruction-row';
                                row.innerHTML = `
                                    <textarea class="inst-text" required>${inst}</textarea>
                                    <button type="button" class="remove-btn" onclick="this.parentElement.remove()">מחק שלב</button>
                                `;
                                instructionsContainer.appendChild(row);
                            });

                        } catch (error) {
                            alert('שים לב: ' + error.message);
                        } finally {
                            appendLoadingMsg.style.display = 'none';
                            appendScanBtn.disabled = false;
                            appendScanUpload.value = '';
                        }
                    }, 'image/jpeg', 0.5);
                };
            };
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

            const dishImageInput = document.getElementById('dish-image-upload');

            const sendToServer = async (base64Image) => {
                const payload = { title, category, ingredients, instructions };
                
                if (base64Image) {
                    payload.image_url = base64Image;
                }

                try {
                    saveBtn.innerText = 'שומר...';
                    saveBtn.disabled = true;

                    const response = await fetch(`${API_BASE}/recipes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(payload)
                    });
                    
                    if (response.ok) {
                        const newRecipe = await response.json();
                        window.location.href = `/views/view-recipe.html?id=${newRecipe.recipe_id}`;
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
}
