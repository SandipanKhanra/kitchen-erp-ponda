import { useState, useEffect, useCallback } from 'react';
import { NavTab } from '../components/layout/Navbar';

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

export function useAppNavigation() {
  const getInitialTabFromLocation = (): NavTab => {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
    return ROUTE_TO_TAB[path] || 'menu_planner';
  };

  const getInitialAuthMode = (): 'login' | 'signup' | null => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/login') return 'login';
    if (path === '/signup') return 'signup';
    return null;
  };

  const [activeTab, setActiveTabState] = useState<NavTab>(getInitialTabFromLocation);
  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    tab: 'login' | 'signup';
  }>(() => {
    const mode = getInitialAuthMode();
    return {
      isOpen: Boolean(mode),
      tab: mode || 'login',
    };
  });

  // Navigate to tab and push to browser history
  const navigateToTab = useCallback((tab: NavTab) => {
    setActiveTabState(tab);
    setAuthModalState((prev) => ({ ...prev, isOpen: false }));
    const targetUrl = TAB_ROUTES[tab] || '/menu-planner';
    if (window.location.pathname !== targetUrl) {
      window.history.pushState({ tab }, '', targetUrl);
    }
  }, []);

  // Open auth modal with specific tab and update URL
  const openAuth = useCallback((tab: 'login' | 'signup' = 'login') => {
    setAuthModalState({ isOpen: true, tab });
    const authUrl = tab === 'signup' ? '/signup' : '/login';
    if (window.location.pathname !== authUrl) {
      window.history.pushState({ auth: tab }, '', authUrl);
    }
  }, []);

  // Close auth modal and restore active tab URI
  const closeAuth = useCallback(() => {
    setAuthModalState((prev) => ({ ...prev, isOpen: false }));
    const tabUrl = TAB_ROUTES[activeTab] || '/menu-planner';
    window.history.pushState({ tab: activeTab }, '', tabUrl);
  }, [activeTab]);

  // Synchronize on browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
      if (path === '/login') {
        setAuthModalState({ isOpen: true, tab: 'login' });
      } else if (path === '/signup') {
        setAuthModalState({ isOpen: true, tab: 'signup' });
      } else {
        const tab = ROUTE_TO_TAB[path];
        if (tab) {
          setActiveTabState(tab);
          setAuthModalState((prev) => ({ ...prev, isOpen: false }));
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Ensure current location has an explicit route on first load if on root '/'
  useEffect(() => {
    if (window.location.pathname === '/' || window.location.pathname === '') {
      window.history.replaceState({ tab: 'menu_planner' }, '', '/menu-planner');
    }
  }, []);

  return {
    activeTab,
    navigateToTab,
    authModalOpen: authModalState.isOpen,
    authModalTab: authModalState.tab,
    openAuth,
    closeAuth,
  };
}
