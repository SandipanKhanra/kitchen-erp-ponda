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

export function useAppNavigation(isAuthenticated = false, needsCenterSelection = false) {
  const getInitialTabFromLocation = (): NavTab => {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
    return ROUTE_TO_TAB[path] || 'menu_planner';
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

  // Route synchronization based on authentication state & center onboarding
  useEffect(() => {
    const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
    if (!isAuthenticated) {
      // If unauthenticated, ensure URL matches auth view (/login or /signup)
      if (path !== '/signup' && path !== '/login') {
        window.history.replaceState({ auth: 'login' }, '', '/login');
      }
    } else if (needsCenterSelection) {
      // New Google user needs to pick their center
      if (path !== '/select-center') {
        window.history.replaceState({ auth: 'select-center' }, '', '/select-center');
      }
    } else {
      // If authenticated and on login/signup/select-center/root, navigate to active tab route
      if (path === '/' || path === '' || path === '/login' || path === '/signup' || path === '/select-center') {
        const targetUrl = TAB_ROUTES[activeTab] || '/menu-planner';
        if (window.location.pathname !== targetUrl) {
          window.history.replaceState({ tab: activeTab }, '', targetUrl);
        }
      }
    }
  }, [isAuthenticated, needsCenterSelection, activeTab]);

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
