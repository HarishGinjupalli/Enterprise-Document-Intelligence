# How to Run This Project (Beginner Guide)

This guide explains **every step** to run the **Enterprise Document Intelligence** app on your Windows PC using:

- **VS Code** (code editor)
- **XAMPP** (MySQL database)
- **Node.js** (runs the backend and frontend)

No prior experience needed. Follow the steps in order.

---

## What You Are Running

This project has **3 parts** that must all be running:

| Part | What it does | Port |
|------|--------------|------|
| **MySQL** (XAMPP) | Stores users, documents, chat history | 3306 |
| **Backend** (Node.js) | API server — talks to MySQL | 3001 |
| **Frontend** (React) | Website you open in browser | 5173 |

You will open the app at: **http://localhost:5173**

---

## Step 0 — Install Required Software

Install these **once** on your computer:

### 1. Node.js (version 18 or higher)

1. Go to: https://nodejs.org/
2. Download the **LTS** version (recommended).
3. Run the installer → click **Next** through all steps (defaults are fine).
4. Restart VS Code after installing.

**Check it worked** — open VS Code terminal (`Ctrl + ~`) and run:

```powershell
node --version
npm --version
```

You should see version numbers (e.g. `v22.x.x` and `10.x.x`). If you get "not recognized", restart VS Code or your PC.

### 2. XAMPP

1. Go to: https://www.apachefriends.org/
2. Download and install XAMPP for Windows.
3. Open **XAMPP Control Panel**.
4. Click **Start** next to **MySQL** (Apache is optional for this project — you only need MySQL).

When MySQL is running, the **MySQL** row should show a green **Running** status.

### 3. VS Code

1. Go to: https://code.visualstudio.com/
2. Download and install VS Code.

---

## Step 1 — Open the Project in VS Code

1. Open **VS Code**.
2. Click **File** → **Open Folder**.
3. Select this folder:

   ```
   C:\Users\dell\OneDrive\Desktop\aiprojects\enterprise-document-intelligence
   ```

4. Click **Select Folder**.

You should see folders like `backend`, `frontend`, `database` in the left sidebar (Explorer).

---

## Step 2 — Start MySQL in XAMPP

1. Open **XAMPP Control Panel** (search "XAMPP" in Windows Start menu).
2. Click **Start** on the **MySQL** line.
3. Wait until it shows **Running** (green).

> **Important:** Keep XAMPP open while you use the app. If you stop MySQL, the backend will fail to connect.

**Default XAMPP MySQL login:**
- Username: `root`
- Password: *(empty — leave blank)*

If you set a password for MySQL in XAMPP, remember it — you will need it in Step 4.

---

## Step 3 — Open the Terminal in VS Code

1. In VS Code, press **`Ctrl + ~`** (or menu: **Terminal** → **New Terminal**).
2. A panel opens at the bottom — this is where you type commands.
3. Make sure you are in the project folder. The path should end with `enterprise-document-intelligence`.

If not, run:

```powershell
cd C:\Users\dell\OneDrive\Desktop\aiprojects\enterprise-document-intelligence
```

---

## Step 4 — Create the `.env` File

The app needs a settings file called `.env` in the **project root** (same level as `backend` and `frontend` folders).

### Option A — Copy from example (recommended)

In the VS Code terminal, run:

```powershell
Copy-Item .env.example .env
```

### Option B — Create manually in VS Code

1. In Explorer, right-click the project root folder → **New File**.
2. Name it exactly: `.env`
3. Copy all content from `.env.example` into `.env` and save.

### XAMPP database settings

Open `.env` and make sure these lines look like this (for default XAMPP):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=enterprise_doc_intelligence
```

- If your XAMPP MySQL **has a password**, put it after `DB_PASSWORD=`, for example: `DB_PASSWORD=mypassword`
- If **no password**, leave `DB_PASSWORD=` empty (nothing after the `=`)

Save the file (`Ctrl + S`).

---

## Step 5 — Install Dependencies

Dependencies are the libraries the project needs. Install them **once** (or again after pulling new code).

In the VS Code terminal, run:

```powershell
npm run install:all
```

This may take **2–5 minutes**. Wait until it finishes without errors.

You should see folders:
- `backend\node_modules`
- `frontend\node_modules`

---

## Step 6 — Create Database Tables (Migration)

This creates the database and tables in MySQL.

In the same terminal, run:

```powershell
npm run migrate
```

**Success looks like:**

```
Running migration: 001_initial_schema.sql
  ✓ 001_initial_schema.sql completed

All migrations completed successfully.
```

You only need to run this **once** (or again if the database schema changes).

---

## Step 7 — Start the Backend (Terminal 1)

You need **two terminals** — one for backend, one for frontend.

### Open first terminal

1. **Terminal** → **New Terminal** (or split terminal).
2. Run:

```powershell
cd C:\Users\dell\OneDrive\Desktop\aiprojects\enterprise-document-intelligence
npm run dev:backend
```

**Success looks like:**

```
Database connection pool initialized
Server running on port 3001
```

**Leave this terminal running.** Do not close it or press `Ctrl+C` while using the app.

---

## Step 8 — Start the Frontend (Terminal 2)

1. Click the **`+`** button in the terminal panel to open a **second** terminal.
2. Run:

```powershell
cd C:\Users\dell\OneDrive\Desktop\aiprojects\enterprise-document-intelligence
npm run dev:frontend
```

**Success looks like:**

```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
```

**Leave this terminal running too.**

---

## Step 9 — Open the App in Your Browser

1. Open **Chrome**, **Edge**, or **Firefox**.
2. Go to: **http://localhost:5173**
3. You should see the login / register page.

### First time use

1. Click **Register** and create an account (email + password).
2. Log in with that account.
3. You can upload PDF documents and use the chat feature.

> **Note:** Without an OpenAI API key in `.env`, the app uses **mock AI** for development — good for testing the UI and flow.

---

## Quick Checklist (Every Time You Run the App)

Use this order every day:

- [ ] 1. Start **MySQL** in XAMPP Control Panel
- [ ] 2. Open project folder in **VS Code**
- [ ] 3. Terminal 1: `npm run dev:backend` → wait for "Server running on port 3001"
- [ ] 4. Terminal 2: `npm run dev:frontend` → wait for "http://localhost:5173"
- [ ] 5. Browser: open **http://localhost:5173**

You do **not** need to run `npm run install:all` or `npm run migrate` every time — only once (or after updates).

---

## Common Problems and Fixes

### "Access denied for user 'root'@'localhost'"

**Cause:** Wrong MySQL username or password in `.env`.

**Fix:**
1. Open `.env`.
2. Set `DB_USER=root`.
3. Set `DB_PASSWORD=` to your XAMPP MySQL password (empty if you never set one).
4. Save and restart the backend (`Ctrl+C` in terminal 1, then `npm run dev:backend` again).

---

### "Access denied for user 'edi_user'"

**Cause:** Missing `.env` file — app uses wrong default credentials.

**Fix:** Complete **Step 4** (create `.env` from `.env.example`).

---

### "EADDRINUSE: address already in use :::3001"

**Cause:** Backend is already running (or another app uses port 3001).

**Fix:**
- Check if Terminal 1 already shows "Server running on port 3001" — if yes, you don't need to start it again.
- Or stop the old process: in the backend terminal press **`Ctrl+C`**, then run `npm run dev:backend` again.

To find what is using port 3001:

```powershell
netstat -ano | findstr ":3001"
```

---

### "Failed to connect to database" / "ECONNREFUSED"

**Cause:** MySQL is not running.

**Fix:**
1. Open XAMPP Control Panel.
2. Click **Start** on **MySQL**.
3. Restart backend: `npm run dev:backend`.

---

### Frontend opens but login/register fails / network error

**Cause:** Backend is not running.

**Fix:**
1. Make sure Terminal 1 shows `Server running on port 3001`.
2. Test backend in browser: http://localhost:3001/api/v1/health/health  
   You should see a JSON health response.

---

### "npm is not recognized" or "node is not recognized"

**Cause:** Node.js not installed or terminal not restarted after install.

**Fix:**
1. Install Node.js from https://nodejs.org/
2. Close and reopen VS Code.
3. Try `node --version` again.

---

### Migration failed

**Fix:**
1. Confirm MySQL is running in XAMPP.
2. Confirm `.env` has correct `DB_USER` and `DB_PASSWORD`.
3. Run `npm run migrate` again.

---

## How to Stop the App

1. In **Terminal 1** (backend): press **`Ctrl+C`**
2. In **Terminal 2** (frontend): press **`Ctrl+C`**
3. In **XAMPP**: click **Stop** on MySQL (optional)

---

## Optional — Add Real OpenAI AI

By default, the app works without OpenAI (mock responses). For real AI answers:

1. Get an API key from https://platform.openai.com/
2. In `.env`, set:

   ```env
   OPENAI_API_KEY=sk-your-key-here
   ```

3. Restart the backend.

---

## Project Folder Structure (Simple View)

```
enterprise-document-intelligence/
├── .env                 ← Your settings (create this — Step 4)
├── .env.example         ← Template for .env
├── HOW_TO_RUN.md        ← This guide
├── backend/             ← API server (port 3001)
├── frontend/            ← Website (port 5173)
├── database/            ← SQL files for migrations
└── package.json         ← Root scripts (npm run ...)
```

---

## Need Help?

When asking for help, share:

1. The **exact error message** from the terminal (copy/paste).
2. Which **step** you were on.
3. Whether **MySQL** shows Running in XAMPP.
4. Whether you created the **`.env`** file.

---

**You are ready.** Follow Steps 0–9 in order, use the checklist each time, and refer to **Common Problems** if something breaks.
