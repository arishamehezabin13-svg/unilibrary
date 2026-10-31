# UniLibrary - Modern Library Management System

A high-fidelity, frontend-only Library Management System (LMS) designed for university semester projects. Built with a focus on modern UI/UX, responsiveness, and clean code architecture.

## 🚀 Project Overview
UniLibrary is a comprehensive solution for managing university library operations. It allows librarians to track book inventory, manage student records, and handle the complete lifecycle of book issuing and returns.

## ✨ Features
- **Modern Dashboard**: Real-time statistics and recent activity tracking.
- **Inventory Management**: Full CRUD operations for books with category filtering and search.
- **Student Directory**: Manage student enrollment and contact details.
- **Transaction System**: Streamlined book issuing and return workflow with automatic stock updates.
- **Local Storage Integration**: All data persists in the browser without needing a database.
- **Responsive Design**: Built with Tailwind CSS for all screen sizes.
- **Smooth UX**: Toast notifications, entrance animations, and interactive UI components.

## 📁 Project Structure
- `index.html`: Dashboard / Landing Page
- `books.html`: Book Inventory Management
- `students.html`: Student Directory
- `issue.html`: Book Issuing Interface
- `return.html`: Transaction Management & Returns
- `storage.js`: Reference LocalStorage schema/CRUD helper (not currently loaded by any page — each page manages its own self-contained demo dataset via inline scripts)
- `lumina_library_system/DESIGN.md`: Design system reference (colors, typography, spacing) used to configure Tailwind on every page

Every page is a single self-contained static HTML file: it pulls in Tailwind CSS, Google Fonts, and Material Symbols from a CDN, and keeps its own page logic and demo data (via `localStorage`) inline — there is no build step, bundler, or backend.

## 🛠️ How to Run Locally
Since this is a **frontend-only project**, no server-side setup is required.

1. **Option A: Direct Open**
   - Simply navigate to the project folder and double-click `index.html` to open it in any modern web browser.

2. **Option B: VS Code Live Server (Recommended)**
   - Open the project folder in VS Code.
   - Install the "Live Server" extension.
   - Click "Go Live" in the bottom status bar.

## 🌐 Deploying to GitHub Pages
No build step is needed — this repo can be served as-is.

1. Push this project to a GitHub repository.
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment", set **Source** to "Deploy from a branch".
4. Choose the `main` branch and the `/ (root)` folder, then save.
5. GitHub will publish the site at `https://<your-username>.github.io/<repo-name>/`, with `index.html` (the Dashboard) as the home page.

## 🎓 Academic Context
This project was developed for a Bangladeshi university semester project, showcasing expertise in:
- Responsive Web Design (RWD)
- Frontend State Management
- Modular JavaScript Architecture
- UI/UX Design Principles


## ☁️ Cloud Database Integration (Firebase Realtime Database)
All pages (`index.html`, `books.html`, `students.html`, `issue.html`, `return.html`, and `settings.html`) are connected to `storage.js`, which provides real-time synchronization with **Firebase Realtime Database**.

### How to Connect Your Firebase Database (Takes 60 Seconds):
1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with your Google/Gmail account.
2. Click **Create a project**, name it `unilibrary`, disable Google Analytics, and click **Create project**.
3. On the left menu, click **Build → Realtime Database**, then click **Create Database**.
4. Choose **Start in test mode** and click **Enable**.
5. Copy your database URL at the top (e.g., `https://unilibrary-default-rtdb.firebaseio.com/`).
6. **Connect in 1 Click (Zero Coding):**
   - Open `index.html` or `settings.html` in your browser, click the **Connect Cloud DB** button in the top navigation bar, paste your Firebase URL, and click **Connect & Sync**!
   - **To share across multiple PCs/laptops automatically:** Click **Download Pre-Configured storage.js** inside the popup (or paste your URL inside `const FIREBASE_DATABASE_URL = "";` on Line 12 of `storage.js`) and save it in your project folder. Now any PC or laptop that opens the project will automatically load and update the exact same live cloud database!
