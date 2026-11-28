import { useEffect, useState, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { KitchenProvider, useKitchen } from './context/KitchenContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar, NavTab } from './components/layout/Navbar';
import { AuthView } from './components/auth/AuthView';
import { LoadingScreen, LoadingSpinner } from './components/common/LoadingSpinner';
import { useAppNavigation } from './hooks/useAppNavigation';
import { SafeStorage } from './utils/safeStorage';

const FifteenDayMenuPlanner = lazy(() =>
  import('./components/menu/FifteenDayMenuPlanner').then((m) => ({
    default: m.FifteenDayMenuPlanner,
  }))
);
const DaywiseAndShoppingView = lazy(() =>
  import('./components/requisition/DaywiseAndShoppingView').then((m) => ({
    default: m.DaywiseAndShoppingView,
  }))
);
const StockManagement = lazy(() =>
  import('./components/stock/StockManagement').then((m) => ({
    default: m.StockManagement,
  }))
);
const RecipeAndPatternManagement = lazy(() =>
  import('./components/recipes/RecipeAndPatternManagement').then((m) => ({
    default: m.RecipeAndPatternManagement,
  }))
);
const AdminUserManagement = lazy(() =>
  import('./components/admin/AdminUserManagement').then((m) => ({
    default: m.AdminUserManagement,
  }))
);
const SAdminDashboard = lazy(() =>
  import('./components/sadmin/SAdminDashboard').then((m) => ({
    default: m.SAdminDashboard,
  }))
);
const VaishnavaCalendarView = lazy(() =>
  import('./components/calendar/VaishnavaCalendarView').then((m) => ({
    default: m.VaishnavaCalendarView,
  }))
);
const EmailActionView = lazy(() =>
  import('./components/auth/EmailActionView').then((m) => ({
    default: m.EmailActionView,
  }))
);
const CenterSelectionView = lazy(() =>
  import('./components/auth/CenterSelectionView').then((m) => ({
    default: m.CenterSelectionView,
  }))
);
const AuditHistoryModal = lazy(() =>
  import('./components/audit/AuditHistoryModal').then((m) => ({
    default: m.AuditHistoryModal,
  }))
);
const SessionExpiryModal = lazy(() =>
  import('./components/auth/SessionExpiryModal').then((m) => ({
    default: m.SessionExpiryModal,
  }))
);
const GuidedTourModal = lazy(() =>
  import('./components/common/GuidedTourModal').then((m) => ({
    default: m.GuidedTourModal,
  }))
);
import { ChefHat } from 'lucide-react';

function AppContent() {
  const { firebaseUser, currentUser, isSAdmin, isAdmin, isAuthLoading, markTourSeen } = useAuth();
  const isAuthenticated = Boolean(firebaseUser);
  const needsCenterSelection = Boolean(firebaseUser && currentUser.needsCenterSelection && !isSAdmin);
  const { isAuditModalOpen, auditModalCategory, closeAuditModal, isSyncing } = useKitchen();
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourTab, setTourTab] = useState<NavTab | null>(null);
  const {
    activeTab,
    navigateToTab,
    authModalOpen,
    authModalTab,
    openAuth,
    switchAuthTab,
    closeAuth,
  } = useAppNavigation(isAuthenticated, needsCenterSelection);

  // Auto-launch Guided Tour ONLY once on the very first login after registration
  useEffect(() => {
    if (!isAuthenticated || isAuthLoading || needsCenterSelection || !currentUser.uid) return;
    if (currentUser.hasSeenTour !== false) return;

    const tourKey = `kitchen_tour_seen_${currentUser.uid}`;
    const alreadySeenLocally = SafeStorage.getItem<boolean>(tourKey, false);

    // Mark as seen immediately in both localStorage and Firestore so subsequent logins never re-trigger it
    SafeStorage.setItem(tourKey, true);
    markTourSeen();

    if (!alreadySeenLocally) {
      setIsTourOpen(true);
    }
  }, [isAuthenticated, isAuthLoading, needsCenterSelection, currentUser.uid, currentUser.hasSeenTour]);

  const handleCloseTour = () => {
    setIsTourOpen(false);
    setTourTab(null);
    if (currentUser.uid) {
      SafeStorage.setItem(`kitchen_tour_seen_${currentUser.uid}`, true);
      if (currentUser.hasSeenTour === false) {
        markTourSeen();
      }
    }
  };

  // Redirect away from role-restricted tabs if role doesn't match
  useEffect(() => {
    if (!isAuthenticated || isAuthLoading || needsCenterSelection || !currentUser.uid) return;
    if (activeTab === 'admin_users' && (isSAdmin || !isAdmin)) {
      navigateToTab(isSAdmin ? 'sadmin_dashboard' : 'menu_planner');
    } else if (activeTab === 'sadmin_dashboard' && !isSAdmin) {
      navigateToTab('menu_planner');
    }
  }, [isAuthenticated, isAuthLoading, needsCenterSelection, currentUser.uid, activeTab, isSAdmin, isAdmin, navigateToTab]);

  // Custom Firebase Email Action Handler (?mode=verifyEmail|resetPassword&oobCode=...)
  const actionParams = new URLSearchParams(window.location.search);
  const isEmailAction =
    window.location.pathname === '/auth/action' ||
    (Boolean(actionParams.get('mode')) && Boolean(actionParams.get('oobCode')));

  if (isEmailAction) {
    return (
      <Suspense fallback={<LoadingScreen title="Ponda Kitchen ERP" subtitle="Loading..." />}>
        <EmailActionView
          onDone={() => {
            window.location.href = '/login';
          }}
        />
      </Suspense>
    );
  }

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
        <Suspense fallback={<LoadingScreen title="Ponda Kitchen ERP" subtitle="Loading centers..." />}>
          <CenterSelectionView />
        </Suspense>
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
        onStartTour={() => {
          setTourTab('menu_planner');
          setIsTourOpen(true);
        }}
        tourHighlightedTab={tourTab}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-2 sm:py-8">
        {isSyncing && (
          <div className="mb-4 px-4 py-2.5 rounded-2xl bg-orange-50/90 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-900/60 border-l-4 border-l-orange-500 flex items-center space-x-2.5 text-xs font-bold text-orange-700 dark:text-orange-300 shadow-sm">
            <LoadingSpinner size="xs" className="text-orange-500" />
            <span>Syncing center inventory, recipes &amp; menus with Firestore...</span>
          </div>
        )}
        <Suspense
          fallback={
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <LoadingSpinner size="md" className="text-orange-500" />
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Loading module...
              </span>
            </div>
          }
        >
          {activeTab === 'menu_planner' && <FifteenDayMenuPlanner />}
          {activeTab === 'daywise_shopping' && <DaywiseAndShoppingView />}
          {activeTab === 'stock' && <StockManagement />}
          {activeTab === 'recipes_patterns' && <RecipeAndPatternManagement />}
          {activeTab === 'admin_users' && isAdmin && !isSAdmin && <AdminUserManagement />}
          {activeTab === 'sadmin_dashboard' && isSAdmin && <SAdminDashboard />}
          {activeTab === 'vaishnava_calendar' && <VaishnavaCalendarView />}
        </Suspense>
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
        <Suspense fallback={null}>
          <AuditHistoryModal
            initialCategory={auditModalCategory}
            onClose={closeAuditModal}
          />
        </Suspense>
      )}

      {/* Session Expiry 5-Minute Warning Popup */}
      <Suspense fallback={null}>
        <SessionExpiryModal />
      </Suspense>

      {/* First-Time User Guided Tour */}
      {isTourOpen && (
        <Suspense fallback={null}>
          <GuidedTourModal
            isOpen={isTourOpen}
            onClose={handleCloseTour}
            onNavigateTab={navigateToTab}
            onTourTabChange={setTourTab}
          />
        </Suspense>
      )}

      <footer className="bg-transparent md:bg-white/75 dark:bg-transparent md:dark:bg-slate-900/75 md:backdrop-blur-md border-t border-slate-200/40 dark:border-slate-800/40 md:border-t-2 md:border-t-orange-500/25 md:dark:border-t-orange-500/20 pt-2 pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:py-5 md:pb-5 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-0.5 sm:gap-2 text-[10px] md:text-xs text-slate-400/80 dark:text-slate-500/80 md:text-slate-500 md:dark:text-slate-400">
          <div className="font-medium md:font-semibold text-slate-400/90 dark:text-slate-500/90 md:text-slate-700 md:dark:text-slate-300">
            &copy; {new Date().getFullYear()} Ponda Kitchen. All rights reserved.
          </div>
          <div className="hidden sm:block text-[11px] text-slate-400 dark:text-slate-500">
            ISKCON Kitchen Management ERP
          </div>
        </div>
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
