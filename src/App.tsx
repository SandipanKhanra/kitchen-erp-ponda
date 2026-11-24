import { AuthProvider, useAuth } from './context/AuthContext';
import { KitchenProvider, useKitchen } from './context/KitchenContext';
import { Navbar } from './components/layout/Navbar';
import { FifteenDayMenuPlanner } from './components/menu/FifteenDayMenuPlanner';
import { DaywiseAndShoppingView } from './components/requisition/DaywiseAndShoppingView';
import { StockManagement } from './components/stock/StockManagement';
import { RecipeAndPatternManagement } from './components/recipes/RecipeAndPatternManagement';
import { AdminUserManagement } from './components/admin/AdminUserManagement';
import { SAdminDashboard } from './components/sadmin/SAdminDashboard';
import { VaishnavaCalendarView } from './components/calendar/VaishnavaCalendarView';
import { AuthView } from './components/auth/AuthView';
import { AuditHistoryModal } from './components/audit/AuditHistoryModal';
import { useAppNavigation } from './hooks/useAppNavigation';
import { ChefHat } from 'lucide-react';

function AppContent() {
  const { firebaseUser, isDemoMode, isAuthLoading } = useAuth();
  const { isAuditModalOpen, auditModalCategory, closeAuditModal } = useKitchen();
  const {
    activeTab,
    navigateToTab,
    authModalOpen,
    authModalTab,
    openAuth,
    closeAuth,
  } = useAppNavigation();

  // Loading Splash Screen while Firebase Auth initializes
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="p-4 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-2xl shadow-orange-500/30 animate-bounce mb-4">
          <ChefHat className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white">
          Ponda Kitchen ERP
        </h2>
        <p className="text-xs text-slate-400 mt-1 animate-pulse">
          Connecting to Firebase & Vaishnava Centers...
        </p>
      </div>
    );
  }

  // If not signed in and not in demo mode: Show Auth View directly as clean centered page
  if (!firebaseUser && !isDemoMode) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-3 sm:p-4 transition-colors duration-200">
        <AuthView initialTab={authModalTab} />
      </div>
    );
  }

  // Authenticated or Demo Mode App Shell
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        onOpenAuth={(tab) => openAuth(tab || 'login')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {activeTab === 'menu_planner' && <FifteenDayMenuPlanner />}
        {activeTab === 'daywise_shopping' && <DaywiseAndShoppingView />}
        {activeTab === 'stock' && <StockManagement />}
        {activeTab === 'recipes_patterns' && <RecipeAndPatternManagement />}
        {activeTab === 'admin_users' && <AdminUserManagement />}
        {activeTab === 'sadmin_dashboard' && <SAdminDashboard />}
        {activeTab === 'vaishnava_calendar' && <VaishnavaCalendarView />}
      </main>

      {/* Auth Modal (if opened while in Demo Mode or from deep-link) */}
      {authModalOpen && (
        <AuthView
          isModal
          initialTab={authModalTab}
          onClose={closeAuth}
        />
      )}

      {/* Audit History Modal */}
      {isAuditModalOpen && (
        <AuditHistoryModal
          initialCategory={auditModalCategory}
          onClose={closeAuditModal}
        />
      )}

      <footer className="bg-white/80 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        Ponda Kitchen ERP
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
