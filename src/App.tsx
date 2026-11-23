import React, { useState } from 'react';
import { KitchenProvider } from './context/KitchenContext';
import { Navbar, TabType } from './components/layout/Navbar';
import { IngredientManagement } from './components/ingredients/IngredientManagement';
import { RecipeManagement } from './components/recipes/RecipeManagement';
import { MenuCycleView } from './components/menu/MenuCycleView';
import { CombinedRequisitionView } from './components/requisition/CombinedRequisitionView';
import { CalendarSyncView } from './components/calendar/CalendarSyncView';

export function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('menu_cycle');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'ingredients' && <IngredientManagement />}
        {activeTab === 'recipes' && <RecipeManagement />}
        {activeTab === 'menu_cycle' && <MenuCycleView />}
        {activeTab === 'requisitions' && <CombinedRequisitionView />}
        {activeTab === 'calendar' && <CalendarSyncView />}
      </main>
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        KitchenOps ERP &bull; 15-Day Rotation Engine &bull; Firebase Powered &bull; 100% Free Tier Deployable
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <KitchenProvider>
      <AppContent />
    </KitchenProvider>
  );
}
