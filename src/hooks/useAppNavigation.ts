import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { NavTab } from '../components/layout/Navbar';
import { useToast } from '../context/ToastContext';
import { consumePendingModalCleanupPop, getTopOpenModalToken } from './useModalClose';

export const HOME_TAB: NavTab = 'menu_planner';

export const TAB_ROUTES: Record<NavTab, string> = {
  menu_planner: '/menu-planner',
  daywise_shopping: '/shopping-list',
  stock: '/stock',
  recipes_patterns: '/recipes',
  vaishnava_calendar: '/calendar',
  admin_users: '/center-admin',
  sadmin_dashboard: '/sadmin-hq',
};

export const ROUTE_TO_TAB: Record<string, NavTab> = {
  '/': 'menu_planner',
  '/menu-planner': 'menu_planner',
  '/shopping-list': 'daywise_shopping',
  '/stock': 'stock',
  '/recipes': 'recipes_patterns',
  '/calendar': 'vaishnava_calendar',
  '/center-admin': 'admin_users',
  '/sadmin-hq': 'sadmin_dashboard',
};

interface NavHistoryState {
  tab?: NavTab;
  auth?: 'login' | 'signup' | 'select-center';
  isHomeBase?: boolean;
  isHomeActive?: boolean;
  isSecondaryTab?: boolean;
  __modalToken?: string;
}

function isMobileOrStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
  return standalone || window.innerWidth < 768;
}

export function useAppNavigation(isAuthenticated = false, needsCenterSelection = false) {
  const { showToast } = useToast();

  const getInitialTabFromLocation = (): NavTab => {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
    return ROUTE_TO_TAB[path] || HOME_TAB;
  };

  const getInitialAuthMode = (): 'login' | 'signup' => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/signup') return 'signup';
    return 'login';
  };

  const [activeTab, setActiveTabState] = useState<NavTab>(getInitialTabFromLocation);
  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    tab: 'login' | 'signup';
  }>(() => {
    const mode = getInitialAuthMode();
    return {
      isOpen: !isAuthenticated || window.location.pathname === '/login' || window.location.pathname === '/signup',
      tab: mode,
    };
  });

  const activeTabRef = useRef<NavTab>(activeTab);
  activeTabRef.current = activeTab;
  const isReadyForTabsRef = useRef<boolean>(false);
  isReadyForTabsRef.current = isAuthenticated && !needsCenterSelection;

  const homeGuardArmedRef = useRef<boolean>(false);
  const suppressNextPopRef = useRef<boolean>(false);
  const exitRearmTimerRef = useRef<number | null>(null);

  const clearExitRearmTimer = useCallback(() => {
    if (exitRearmTimerRef.current !== null) {
      window.clearTimeout(exitRearmTimerRef.current);
      exitRearmTimerRef.current = null;
    }
  }, []);

  /**
   * Industry-standard Home-First shallow stack for tabbed PWAs:
   * - Navigating between secondary tabs uses replaceState (never piles up history).
   * - Visiting a secondary tab from Home pushes at most 1 history entry.
   * - Returning to Home from a secondary tab pops that single entry cleanly.
   */
  const navigateToTab = useCallback(
    (tab: NavTab) => {
      clearExitRearmTimer();
      const currentState = (window.history.state || {}) as NavHistoryState;
      const targetUrl = TAB_ROUTES[tab] || '/menu-planner';

      startTransition(() => {
        setActiveTabState(tab);
        setAuthModalState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
      });

      // If a modal/overlay (e.g. GuidedTourModal) is currently open on top of history,
      // update the URL/tab metadata in-place without disturbing the modal's history token.
      const topModal = getTopOpenModalToken();
      if (topModal && currentState.__modalToken === topModal) {
        window.history.replaceState(
          { ...currentState, tab } satisfies NavHistoryState,
          '',
          targetUrl
        );
        return;
      }

      if (tab === HOME_TAB) {
        if (currentState.isSecondaryTab) {
          suppressNextPopRef.current = true;
          window.history.back();
        } else if (window.location.pathname !== targetUrl) {
          window.history.replaceState(
            { tab: HOME_TAB, isHomeActive: currentState.isHomeActive ?? !currentState.isHomeBase },
            '',
            targetUrl
          );
        }
        return;
      }

      if (currentState.isSecondaryTab) {
        window.history.replaceState(
          { tab, isSecondaryTab: true } satisfies NavHistoryState,
          '',
          targetUrl
        );
      } else {
        window.history.pushState(
          { tab, isSecondaryTab: true } satisfies NavHistoryState,
          '',
          targetUrl
        );
      }
    },
    [clearExitRearmTimer]
  );

  // Open auth modal with specific tab and update URL
  const openAuth = useCallback((tab: 'login' | 'signup' = 'login') => {
    setAuthModalState({ isOpen: true, tab });
    const authUrl = tab === 'signup' ? '/signup' : '/login';
    if (window.location.pathname !== authUrl) {
      window.history.pushState({ auth: tab }, '', authUrl);
    }
  }, []);

  // Switch auth tab (between login and signup) and update URL
  const switchAuthTab = useCallback((tab: 'login' | 'signup') => {
    setAuthModalState({ isOpen: true, tab });
    const authUrl = tab === 'signup' ? '/signup' : '/login';
    if (window.location.pathname !== authUrl) {
      window.history.replaceState({ auth: tab }, '', authUrl);
    }
  }, []);

  // Close auth modal and restore active tab URI
  const closeAuth = useCallback(() => {
    setAuthModalState((prev) => ({ ...prev, isOpen: false }));
    const tabUrl = TAB_ROUTES[activeTabRef.current] || '/menu-planner';
    window.history.replaceState({ tab: activeTabRef.current }, '', tabUrl);
  }, []);

  // Synchronize on browser / hardware Back & Forward gestures
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // 1. Ignore synthetic history.back() calls from closing a modal via UI/Escape
      if (consumePendingModalCleanupPop()) {
        return;
      }

      // 2. If a modal/drawer is open on top, let useModalClose dismiss it first
      const topModal = getTopOpenModalToken();
      const state = (e.state || {}) as NavHistoryState;
      if (topModal && state.__modalToken !== topModal) {
        return;
      }

      // 3. Ignore synthetic history.back() triggered by tapping the Home tab directly
      if (suppressNextPopRef.current) {
        suppressNextPopRef.current = false;
        return;
      }

      const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
      if (path === '/login') {
        setAuthModalState({ isOpen: true, tab: 'login' });
        return;
      }
      if (path === '/signup') {
        setAuthModalState({ isOpen: true, tab: 'signup' });
        return;
      }

      // 4. Mobile / PWA double-back-to-exit guard when already on the Home tab
      if (isReadyForTabsRef.current && state.isHomeBase && isMobileOrStandalonePWA()) {
        setActiveTabState(HOME_TAB);
        setAuthModalState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
        showToast('Press back again to exit', 'info', 2500);

        clearExitRearmTimer();
        exitRearmTimerRef.current = window.setTimeout(() => {
          const cur = (window.history.state || {}) as NavHistoryState;
          if (
            isReadyForTabsRef.current &&
            activeTabRef.current === HOME_TAB &&
            cur.isHomeBase &&
            !getTopOpenModalToken()
          ) {
            window.history.pushState(
              { tab: HOME_TAB, isHomeActive: true } satisfies NavHistoryState,
              '',
              TAB_ROUTES[HOME_TAB]
            );
          }
          exitRearmTimerRef.current = null;
        }, 2500);
        return;
      }

      const tab = state.tab || ROUTE_TO_TAB[path];
      if (tab) {
        clearExitRearmTimer();
        setActiveTabState(tab);
        setAuthModalState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearExitRearmTimer();
    };
  }, [clearExitRearmTimer, showToast]);

  // Route synchronization & initial shallow Home-First guard setup
  useEffect(() => {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
    if (!isAuthenticated) {
      homeGuardArmedRef.current = false;
      clearExitRearmTimer();
      if (path !== '/signup' && path !== '/login') {
        window.history.replaceState({ auth: 'login' }, '', '/login');
      }
      return;
    }

    if (needsCenterSelection) {
      homeGuardArmedRef.current = false;
      clearExitRearmTimer();
      if (path !== '/select-center') {
        window.history.replaceState({ auth: 'select-center' }, '', '/select-center');
      }
      return;
    }

    setAuthModalState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));

    // Arm the shallow [isHomeBase -> isHomeActive] stack once on mobile/PWA
    if (!homeGuardArmedRef.current) {
      homeGuardArmedRef.current = true;
      const targetUrl = TAB_ROUTES[activeTab] || '/menu-planner';

      if (isMobileOrStandalonePWA()) {
        window.history.replaceState(
          { tab: HOME_TAB, isHomeBase: true } satisfies NavHistoryState,
          '',
          TAB_ROUTES[HOME_TAB]
        );
        if (activeTab === HOME_TAB) {
          window.history.pushState(
            { tab: HOME_TAB, isHomeActive: true } satisfies NavHistoryState,
            '',
            TAB_ROUTES[HOME_TAB]
          );
        } else {
          window.history.pushState(
            { tab: HOME_TAB, isHomeActive: true } satisfies NavHistoryState,
            '',
            TAB_ROUTES[HOME_TAB]
          );
          window.history.pushState(
            { tab: activeTab, isSecondaryTab: true } satisfies NavHistoryState,
            '',
            targetUrl
          );
        }
        return;
      }

      if (
        path === '/' ||
        path === '' ||
        path === '/login' ||
        path === '/signup' ||
        path === '/select-center' ||
        !ROUTE_TO_TAB[path]
      ) {
        if (activeTab === HOME_TAB) {
          window.history.replaceState(
            { tab: HOME_TAB, isHomeActive: true } satisfies NavHistoryState,
            '',
            targetUrl
          );
        } else {
          window.history.replaceState(
            { tab: HOME_TAB, isHomeActive: true } satisfies NavHistoryState,
            '',
            TAB_ROUTES[HOME_TAB]
          );
          window.history.pushState(
            { tab: activeTab, isSecondaryTab: true } satisfies NavHistoryState,
            '',
            targetUrl
          );
        }
      } else if (activeTab !== HOME_TAB) {
        window.history.replaceState(
          { tab: HOME_TAB, isHomeActive: true } satisfies NavHistoryState,
          '',
          TAB_ROUTES[HOME_TAB]
        );
        window.history.pushState(
          { tab: activeTab, isSecondaryTab: true } satisfies NavHistoryState,
          '',
          targetUrl
        );
      }
    }
  }, [isAuthenticated, needsCenterSelection, activeTab, clearExitRearmTimer]);

  return {
    activeTab,
    navigateToTab,
    authModalOpen: authModalState.isOpen,
    authModalTab: authModalState.tab,
    openAuth,
    switchAuthTab,
    closeAuth,
  };
}
