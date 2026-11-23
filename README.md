# KitchenOps Pro — Modern Kitchen Management ERP 🍲

A complete, production-grade Kitchen Management System with a **15-Day Menu Rotation Engine**, **Dynamic Recipe Pattern Scaling**, **Live Rate & Stock Auditing**, and **Consolidated Period Requisitions**, engineered for **100% Free Hosting** with **Firebase Firestore**.

---

## 🚀 Key Features Breakdown

| # | Feature | Implementation Details |
|---|---|---|
| **1** | **Cost & Ingredient Quantity** | Live recipe costing engine: $\sum (\text{Qty} \times \text{Rate} \times \text{Wastage})$. Calculates both base yield and cost per portion. |
| **2** | **Edit Ingredient Rates** | Inline rate editing in the Master Catalog. Changes instantly update all recipes and menu cycle budgets in real-time. |
| **3** | **Stock Edit & Audits** | Inline inventory editing, reorder level alerts, and low-stock warning indicators. |
| **4** | **Calendar Sync** | Universal iCalendar (`.ics`) feed generation for Google Calendar, Outlook, and Apple Calendar. |
| **5** | **Add New Recipes** | Dynamic recipe builder with itemized ingredient pickers, category assignments, and preparation time tracking. |
| **6** | **Program List Edit** | Day-by-day meal program configurator (Breakfast, Lunch, Dinner, Special) with customizable headcounts. |
| **7** | **Combine List for Entire Period** | Date-range aggregator that rolls up total demand, deducts current stock, calculates net purchase quantities, and exports to CSV. |
| **8** | **Pattern-Based Scaling** | Base recipes automatically scale quantities and costs for any headcount ($10 \to 500+$ pax) based on ratio formulas. |
| **9** | **Ingredient Cost for Entire Menu** | High-level analytics: total 15-day cycle budget, average daily cost, cost per plate, and category breakdown. |
| **10** | **15-Day Menu Rotation** | Modulo-based cycle engine mapping any date to Day 1–15 recurring plans without repetitive yearly scheduling. |

---

## 🛠️ Tech Stack & Zero-Cost Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Database**: Firebase Firestore (50,000 free reads / 20,000 free writes per day)
- **Hosting**: Firebase Hosting (Free SSL, Global CDN, 10 GB storage)
- **State & Architecture**: Domain-driven Hexagonal Design (Core pure functions $\to$ Services $\to$ Context $\to$ UI)

---

## 💻 Local Setup & Development

### 1. Prerequisites
Make sure **Node.js** (v18 or higher) and **npm** are installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Firebase (Optional)
The application works immediately out-of-the-box with **pre-seeded local mock data**.
To connect to your live Firebase project:
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Paste your Firebase project credentials from the **Firebase Console > Project Settings**.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Free Firebase Deployment

1. Install the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in and initialize:
   ```bash
   firebase login
   firebase init
   ```
   *(Select Firestore and Hosting)*
3. Deploy to production for free:
   ```bash
   npm run firebase:deploy
   ```

---

## 📁 Project Architecture

```
kitchen-management/
├── src/
│   ├── config/         # Firebase & global constants
│   ├── types/          # Domain models (Ingredient, Recipe, Menu, Requisition)
│   ├── core/           # Pure calculation engines (Cost, Pattern, Rotation, Requisition)
│   ├── services/       # Firestore repositories & iCal sync
│   ├── context/        # React Context & state management
│   ├── components/     # UI modules (Ingredients, Recipes, Menu, Requisitions, Calendar)
│   ├── App.tsx         # Shell & Tab navigation
│   └── main.tsx        # React entrypoint
├── firebase.json       # Hosting & Firestore config
├── firestore.rules     # Database security rules
└── package.json
```
