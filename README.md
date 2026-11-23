# KitchenOps ERP Pro — ISKCON Kitchen & Center Management System 🍲

An enterprise-grade, multi-tenant Kitchen Management ERP designed for **ISKCON Centers & Temples**, featuring **Strict Center Isolation**, **Role-Based Access Control (sadmin / admin / user)**, **Maker-Checker Dual Approval Menus**, **Weighted Average Stock Recalibration**, and an **ISKCON Vaishnava Calendar Smriti Engine** that automatically guards Ekadashi and festival fasting days.

Built with **React, TypeScript, Tailwind CSS (Day/Night Dark Mode)** and architected for **100% Free Hosting with Firebase**.

---

## 🏛️ Multi-Tenant Architecture & Roles

### 1. Two Primary Entities: `Center` and `User`
- **Center Isolation**: All inventory stock, recipes, patterns, menus, and requisitions are strictly isolated by `centerId`. Admins and users cannot view or manipulate data from any other center.
- **Super Admin (`sadmin`)**: Has an exclusive, centralized **SAdmin HQ Console** allowing supervision, cross-center switching, center approvals, and global administrator assignments.

### 2. User Roles & Hierarchy
| Role | Capabilities |
|---|---|
| **`sadmin`** (Super Admin) | Approves/rejects center creation requests, manages all centers, promotes/demotes admins globally. |
| **`admin`** (Center Admin) | Manages recipes & patterns, approves user menus, assigns/removes admin role for existing users in their center, raises requests for new centers. |
| **`user`** (Standard Devotee) | Default role on sign-up. Creates and edits 15-day menu drafts, generates day-wise shopping requisitions. |

### 3. Center Addition & Approval Workflow
```
[Center Admin]  ───(Raises Request with Name, Code, City)───► [Center Requests Queue]
                                                                      │
                                                        [Super Admin (sadmin) Review]
                                                                ┌─────┴─────┐
                                                            [Approved]  [Rejected]
                                                                │
                                                  [New Isolated Center Activated]
                                                  [Open for User Registration]
```

### 4. Admin Promotion Rule
- Admins can **only** assign the `admin` role to existing users belonging to their own center.

---

## 🍲 Core Domain Modules & Features

### 1. Recipe Entity
- **Properties**:
  - `Name` (e.g. Sabudana Khichdi, Jeera Rice)
  - `Occasion`: `Normal`, `Ekadashi`, `Fasting`
  - `Meal Type`: `Breakfast`, `Lunch`, `Dinner`
  - `Type`: `Beverage`, `Snack`, `Sweet`, `Curry`, `Rice`, `Bread`, `Dal`, `Other`
  - `Measurable Index`: `per person`, `kg`, `litre`
  - `List of Ingredients`: Item, quantity, unit, wastage percentage

### 2. Menu Patterns (Admin Only)
- Patterns bundle recipes into repeatable, standard culinary combinations (e.g., `Pattern 1 - Classic Raj Bhog Feast: Jeera Rice, Yellow Dal Tadka, Saffron Sweet Rice`).
- Admins can create, customize, and edit patterns per meal slot.

### 3. Stock Inventory & Moving Weighted Average Pricing
- **4 Strict Categories**:
  - 🌾 `Grocery` (Grains, Pulses, Millets, Spices, Sendha Namak)
  - 🥬 `Vegetables` (Potatoes, Peas, Tomatoes, Veggies)
  - 🍎 `Fruits` (Bananas, Apples, Seasonal Fruits)
  - 🥛 `Dairy` (Pure Cow Ghee, Milk, Fresh Paneer)
- **Properties**: `Name`, `Brand`, `Measure Index (kg, litre, piece)`, `Price`.
- **Moving Weighted Average Unit Price Recalibration**:
  When a stock purchase is received, the price adjusts automatically:
  $$\text{New Unit Price} = \frac{(\text{Current Stock} \times \text{Current Price}) + (\text{Purchased Qty} \times \text{Purchased Unit Rate})}{\text{Current Stock} + \text{Purchased Qty}}$$

### 4. 15-Day Menu Planning & Maker-Checker Dual Approvals
- Fixed schedules for **Breakfast, Lunch, and Dinner** with individual headcounts.
- **Non-Repetition Constraint**: Validates that recipes do not repeat across the 15-day cycle or consecutively between Day 15 and Day 1 of the next cycle.
- **Maker-Checker Policy**:
  - If a `user` creates a menu $\to$ any `admin` of that center can approve.
  - If an `admin` creates a menu $\to$ the creator admin **cannot** approve their own menu. Approval must be granted by **another admin** in the center!

### 5. ISKCON Vaishnava Calendar Smriti Sync
- Automatically recognizes all **Ekadashi vrata dates** (Utpanna, Mokshada, Saphala, Putrada, Bhaimi, etc.) and major fasting festivals (Janmashtami, Gaura Purnima, Rama Navami).
- **Dietary Guard**: On Ekadashi, the menu engine strictly blocks grains and pulses, allowing only Ekadashi-approved ingredients (Sama rice, Sabudana, Potato, Fruits, Dairy, Sendha Namak).

### 6. Day-Wise Requirement & Consolidated Shopping List
- Dynamically derives exact day-by-day ingredient consumption and daily costs.
- Aggregates the 15-day period demand, **subtracts on-hand inventory stock**, and generates the net items to purchase.
- One-click CSV export for storekeepers and procurement devotees.

---

## 🎨 UI/UX Design System

- **Day / Night Theme Engine**: Instant toggle between crisp light mode and deep cosmic slate dark mode with localStorage persistence.
- **Visual Language**: Subtle frosted glass effects (`backdrop-blur`), smooth amber/orange gradients, and clear badge indicators.
- **Role Switcher in Header**: Built-in test toolbar allowing immediate switching between `SAdmin`, `Admin 1 (Krishna - Creator)`, `Admin 2 (Govinda - Approver)`, and `User (Radhika)` to test the Maker-Checker workflow.

---

## 💻 Local Setup & Execution

```powershell
# 1. Open the project directory
cd C:\Users\Hp\Documents\software\kitchen-management

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Zero-Cost Firebase Deployment

1. Initialize Firebase:
   ```bash
   firebase login
   firebase init
   ```
   *(Select Firestore and Hosting)*
2. Deploy Firestore Security Rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
3. Deploy frontend to free Firebase CDN:
   ```bash
   npm run firebase:deploy
   ```
