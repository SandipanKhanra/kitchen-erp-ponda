import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { KitchenProvider } from './context/KitchenContext';
import { Navbar, NavTab } from './components/layout/Navbar';
import { FifteenDayMenuPlanner } from './components/menu/FifteenDayMenuPlanner';
import { DaywiseAndShoppingView } from './components/requisition/DaywiseAndShoppingView';
import { StockManagement } from './components/stock/StockManagement';
import { RecipeAndPatternManagement } from './components/recipes/RecipeAndPatternManagement';
import { AdminUserManagement } from './components/admin/AdminUserManagement';
import { SAdminDashboard } from './components/sadmin/SAdminDashboard';
import { VaishnavaCalendarView } from './components/calendar/VaishnavaCalendarView';

function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('menu_planner');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'menu_planner' && <FifteenDayMenuPlanner />}
        {activeTab === 'daywise_shopping' && <DaywiseAndShoppingView />}
        {activeTab === 'stock' && <StockManagement />}
        {activeTab === 'recipes_patterns' && <RecipeAndPatternManagement />}
        {activeTab === 'admin_users' && <AdminUserManagement />}
        {activeTab === 'sadmin_dashboard' && <SAdminDashboard />}
        {activeTab === 'vaishnava_calendar' && <VaishnavaCalendarView />}
      </main>
      <footer className="bg-white/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        KitchenOps ERP Pro &bull; ISKCON Vaishnava Multi-Tenant Edition &bull; Maker-Checker Architecture &bull; 100% Free Hosting
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <KitchenProvider>
        <AppContent />
      </KitchenProvider>
    </AuthProvider>
  );
}
