import { API_BASE } from './config.js';

export function setupAuth() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    const path = window.location.pathname;
    const isLoginPage = path.includes('login.html');

    if (!token && !isLoginPage) {
        window.location.href = '/views/login.html';
        return; 
    }

    const greetingElement = document.querySelector('.user-greeting');
    const logoutBtn = document.querySelector('.logout-btn');

    if (token) {
        const adminBadge = isAdmin ? ' <span class="material-symbols-outlined" style="font-size: 18px; vertical-align: middle; color: #f1c40f;">star</span>' : '';
        if (greetingElement) {
            greetingElement.innerHTML = `שלום, ${username}${adminBadge}`;
        }
        
        if (logoutBtn) {
            logoutBtn.id = 'logout-btn'; 
            logoutBtn.innerText = 'התנתק';
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.clear();
                window.location.href = '/views/login.html';
            });
        }
    } else {
        if (greetingElement) greetingElement.style.display = 'none';
        if (logoutBtn) {
            logoutBtn.innerText = 'התחברות';
            logoutBtn.href = '/views/login.html';
        }
    }

    setupAuthForms();
}

function setupAuthForms() {
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
                    window.location.href = '/views/index.html';
                } else {
                    alert('שם משתמש או סיסמה שגויים.');
                }
            } catch (error) { 
                console.error('Error:', error); 
                alert('שגיאת חיבור: ' + error.message);
            }
        });
    }
}
