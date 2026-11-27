import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { KitchenProvider, useKitchen } from './context/KitchenContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/layout/Navbar';
import { FifteenDayMenuPlanner } from './components/menu/FifteenDayMenuPlanner';
import { DaywiseAndShoppingView } from './components/requisition/DaywiseAndShoppingView';
import { StockManagement } from './components/stock/StockManagement';
import { RecipeAndPatternManagement } from './components/recipes/RecipeAndPatternManagement';
import { AdminUserManagement } from './components/admin/AdminUserManagement';
import { SAdminDashboard } from './components/sadmin/SAdminDashboard';
import { VaishnavaCalendarView } from './components/calendar/VaishnavaCalendarView';
import { AuthView } from './components/auth/AuthView';
import { CenterSelectionView } from './components/auth/CenterSelectionView';
import { AuditHistoryModal } from './components/audit/AuditHistoryModal';
import { LoadingScreen, LoadingSpinner } from './components/common/LoadingSpinner';
import { useAppNavigation } from './hooks/useAppNavigation';
import { ChefHat } from 'lucide-react';

function AppContent() {
  const { firebaseUser, currentUser, isSAdmin, isAdmin, isAuthLoading } = useAuth();
  const isAuthenticated = Boolean(firebaseUser);
  const needsCenterSelection = Boolean(firebaseUser && currentUser.needsCenterSelection && !isSAdmin);
  const { isAuditModalOpen, auditModalCategory, closeAuditModal, isSyncing } = useKitchen();
  const {
    activeTab,
    navigateToTab,
    authModalOpen,
    authModalTab,
    openAuth,
    switchAuthTab,
    closeAuth,
  } = useAppNavigation(isAuthenticated, needsCenterSelection);

  // Redirect away from role-restricted tabs if role doesn't match
  useEffect(() => {
    if (!isAuthenticated || isAuthLoading || needsCenterSelection || !currentUser.uid) return;
    if (activeTab === 'admin_users' && (isSAdmin || !isAdmin)) {
      navigateToTab(isSAdmin ? 'sadmin_dashboard' : 'menu_planner');
    } else if (activeTab === 'sadmin_dashboard' && !isSAdmin) {
      navigateToTab('menu_planner');
    }
  }, [isAuthenticated, isAuthLoading, needsCenterSelection, currentUser.uid, activeTab, isSAdmin, isAdmin, navigateToTab]);

  // Loading Splash Screen while Firebase Auth initializes
  if (isAuthLoading) {
    return (
      <LoadingScreen
        title="Ponda Kitchen ERP"
        subtitle="Connecting to Firebase & Vaishnava Centers..."
      />
    );
  }

  // If not signed in: Show Auth View directly as clean centered page
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex items-center justify-center p-3 sm:p-4 transition-colors duration-200">
        <AuthView
          initialTab={authModalTab}
          onTabChange={switchAuthTab}
        />
      </div>
    );
  }

  // If newly registered via Google and hasn't chosen a center yet: Redirect to Center Selection page
  if (needsCenterSelection) {
    return (
      <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex items-center justify-center p-3 sm:p-4 transition-colors duration-200">
        <CenterSelectionView />
      </div>
    );
  }

  // Authenticated or Demo Mode App Shell
  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
        onOpenAuth={(tab) => openAuth(tab || 'login')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        {isSyncing && (
          <div className="mb-4 px-4 py-2.5 rounded-2xl bg-orange-50/90 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/60 border-l-4 border-l-orange-500 flex items-center space-x-2.5 text-xs font-bold text-orange-700 dark:text-orange-300 shadow-sm">
            <LoadingSpinner size="xs" className="text-orange-500" />
            <span>Syncing center inventory, recipes &amp; menus with Firestore...</span>
          </div>
        )}
        {activeTab === 'menu_planner' && <FifteenDayMenuPlanner />}
        {activeTab === 'daywise_shopping' && <DaywiseAndShoppingView />}
        {activeTab === 'stock' && <StockManagement />}
        {activeTab === 'recipes_patterns' && <RecipeAndPatternManagement />}
        {activeTab === 'admin_users' && isAdmin && !isSAdmin && <AdminUserManagement />}
        {activeTab === 'sadmin_dashboard' && isSAdmin && <SAdminDashboard />}
        {activeTab === 'vaishnava_calendar' && <VaishnavaCalendarView />}
      </main>

      {/* Auth Modal (if opened while in Demo Mode or from deep-link) */}
      {authModalOpen && (
        <AuthView
          isModal
          initialTab={authModalTab}
          onTabChange={switchAuthTab}
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

      <footer className="bg-white/75 dark:bg-slate-900/75 backdrop-blur-md border-t-2 border-t-orange-500/25 dark:border-t-orange-500/20 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Ponda Kitchen ERP
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <KitchenProvider>
          <AppContent />
        </KitchenProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
