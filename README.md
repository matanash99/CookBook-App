# 🍳 CookBook App

A full-stack, responsive web application for users to upload, manage, and discover recipes. Built with a lightweight Python backend and a vanilla HTML/CSS/JS frontend, designed with a modern coastal color palette and Progressive Web App (PWA) capabilities.

## ✨ Features

* **Modern UI/UX**: Designed using the 60-30-10 rule with a clean White, Charcoal, Mint/Teal, and Coral color palette.
* **Mobile-First Design**: Fully responsive layout featuring swipeable horizontal recipe cards and dynamically scaling typography.
* **Smart Categorization (Controlled Vocabulary)**: Users select from a predefined, alphabetically sorted Hebrew category list. Includes an "אחר" (Other) catch-all.
* **Admin Review Queue**: Secure backend logic allowing administrators to safely re-categorize "אחר" recipes without altering the original author's ownership.
* **Secure Authentication**: JWT-based login and registration system with secure `bcrypt` password hashing.
* **PWA Ready**: Includes a web manifest and service workers for native-like mobile installation.
* **OCR Integration**: Built-in support for scanning and processing recipe images via a custom OCR service.

## 🛠️ Tech Stack

**Frontend:**
* HTML5, CSS3, Vanilla JavaScript
* Fetch API for backend communication
* CSS Flexbox & Grid for responsive layouts

**Backend:**
* Python 3.x
* FastAPI / Uvicorn (Asynchronous ASGI server)
* SQLite (Lightweight local database)
* `passlib` & `bcrypt` (Password hashing)
* `PyJWT` (Token authentication)

## 📁 Project Structure

```text
CookBook-App/
├── backend/
│   ├── auth.py             # JWT and password hashing logic
│   ├── database.py         # SQLite connection and queries
│   ├── main.py             # Main FastAPI/Uvicorn routing application
│   ├── ocr_service.py      # Image text extraction service
│   ├── recipes.db          # SQLite Database
│   └── requirements.txt    # Python dependencies
└── frontend/
    ├── assets/             # Images, icons, and backgrounds
    ├── views/              # HTML templates (index, login, upload, etc.)
    ├── app.js              # Frontend logic and API calls
    ├── style.css           # Global styles and media queries
    ├── manifest.json       # PWA configuration
    └── sw.js               # Service Worker for offline caching
