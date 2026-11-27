import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useKitchen } from '../../context/KitchenContext';
import {
  ChefHat,
  Calendar,
  ShoppingBag,
  ShieldCheck,
  Building2,
  Moon,
  Sun,
  Flame,
  UserCheck,
  Package,
  Layers,
  LogOut,
  LogIn,
  UserPlus,
  Menu,
  X,
  ChevronDown,
  HelpCircle,
} from 'lucide-react';

export type NavTab =
  | 'menu_planner'
  | 'daywise_shopping'
  | 'stock'
  | 'recipes_patterns'
  | 'admin_users'
  | 'sadmin_dashboard'
  | 'vaishnava_calendar';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenAuth?: (tab?: 'login' | 'signup') => void;
  onStartTour?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenAuth, onStartTour }) => {
  const {
    currentUser,
    firebaseUser,
    currentCenter,
    availableCenters,
    isSAdmin,
    isAdmin,
    switchCenter,
    centerRequests,
    logout,
    sessionMinutesLeft,
  } = useAuth();
  const { theme, toggleTheme } = useKitchen();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Scroll only the horizontal nav bar (not the page) so the active tab is visible on small screens
  useEffect(() => {
    const nav = navRef.current;
    const btn = activeTabRef.current;
    if (!nav || !btn) return;
    const targetLeft = btn.offsetLeft - nav.clientWidth / 2 + btn.clientWidth / 2;
    nav.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
  }, [activeTab, isAdmin, isSAdmin]);

  const avatarSrc = currentUser?.avatarUrl || firebaseUser?.photoURL || undefined;

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const pendingRequestsCount = centerRequests.filter((r) => r.status === 'pending_approval').length;

  const navItems = [
    { id: 'menu_planner', label: '15-Day Menu Planner', icon: Flame, visible: true },
    { id: 'recipes_patterns', label: 'Recipes & Patterns', icon: Layers, visible: true },
    { id: 'daywise_shopping', label: 'Day-wise & Shopping List', icon: ShoppingBag, visible: true },
    { id: 'stock', label: 'Stock & Price Adjuster', icon: Package, visible: true },
    { id: 'vaishnava_calendar', label: 'Vaishnava Calendar', icon: Calendar, visible: true },
    { id: 'admin_users', label: 'Center User Admin', icon: UserCheck, visible: isAdmin && !isSAdmin },
    {
      id: 'sadmin_dashboard',
      label: 'SAdmin HQ',
      icon: ShieldCheck,
      visible: isSAdmin,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
    },
  ];

  const handleTabClick = (tabId: NavTab) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b-2 border-b-orange-500/30 dark:border-b-orange-500/25 sticky top-0 z-40 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Top Tier: Brand, Center info, Theme, User Profile & Switcher */}
        <div className="flex justify-between items-center h-16 gap-2 sm:gap-3">
          {/* Logo & Center info */}
          <div
            className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer select-none"
            onClick={() => handleTabClick('menu_planner')}
          >
            <div className="bg-gradient-to-tr from-amber-500 to-orange-500 text-white p-2 sm:p-2.5 rounded-2xl shadow-lg shadow-orange-500/25 flex-shrink-0">
              <ChefHat className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white truncate block">
                Ponda Kitchen ERP
              </span>
              <div className="flex items-center space-x-1 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                <Building2 className="w-3 h-3 text-orange-500 flex-shrink-0" />
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px] sm:max-w-none">
                  {currentCenter?.name || 'Ponda Center'}
                </span>
                {currentCenter?.code && (
                  <span className="text-[10px] text-slate-400 hidden sm:inline">({currentCenter.code})</span>
                )}
              </div>
            </div>
          </div>

          {/* Desktop SAdmin Center Switcher */}
          {isSAdmin && (
            <div className="hidden lg:flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Center:</span>
              <select
                value={currentCenter?.id || ''}
                onChange={(e) => switchCenter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
              >
                {availableCenters.map((c) => (
                  <option key={c.id} value={c.id} className="dark:bg-slate-900">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Desktop Right Controls: User Profile / Demo Switcher & Dark/Light Toggle */}
          <div className="hidden md:flex items-center space-x-2 sm:space-x-3">
            {/* If Logged in via Firebase Auth */}
            {firebaseUser ? (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className={`flex items-center space-x-2.5 pl-1.5 pr-2.5 py-1.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    profileDropdownOpen
                      ? 'bg-slate-100 dark:bg-slate-800 border-orange-500/50 shadow-md ring-2 ring-orange-500/20'
                      : 'bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border-slate-200/80 dark:border-slate-700'
                  }`}
                  aria-expanded={profileDropdownOpen}
                  aria-label="User profile menu"
                >
                  <div className="relative w-7 h-7 rounded-xl flex-shrink-0">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={currentUser.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-xl shadow-sm border border-orange-500/30"
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-xs flex items-center justify-center shadow-sm">
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'D'}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                  </div>

                  <div className="text-left hidden lg:block">
                    <div className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[120px] leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md ${
                          currentUser.role === 'sadmin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : currentUser.role === 'admin'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {currentUser.role === 'sadmin' ? 'Super Admin' : currentUser.role === 'admin' ? 'Admin' : 'Devotee'}
                      </span>
                    </div>
                  </div>

                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                      profileDropdownOpen ? 'rotate-180 text-orange-500' : ''
                    }`}
                  />
                </button>

                {/* Modern Elegant Dropdown Popover */}
                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 p-4 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Header: User avatar, name, email & role */}
                    <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="relative w-11 h-11 rounded-2xl flex-shrink-0">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={currentUser.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover rounded-2xl shadow-md border-2 border-orange-500/30"
                          />
                        ) : (
                          <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-base flex items-center justify-center shadow-md">
                            {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'D'}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                          {currentUser.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {currentUser.email || 'devotee@iskcon.org'}
                        </div>
                        <div className="mt-1 flex items-center space-x-1.5">
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              currentUser.role === 'sadmin'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                : currentUser.role === 'admin'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}
                          >
                            {currentUser.role === 'sadmin' ? 'Super Admin' : currentUser.role === 'admin' ? 'Center Admin' : 'Devotee'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Center Details */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider">
                          <Building2 className="w-3.5 h-3.5 text-orange-500" />
                          <span>Assigned Center</span>
                        </span>
                        {currentCenter?.code && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300">
                            {currentCenter.code}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-800 dark:text-white text-xs truncate">
                        {currentCenter?.name || 'Ponda Center'}
                      </div>
                      {sessionMinutesLeft !== null && (
                        <div className="pt-1.5 mt-1.5 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 dark:text-slate-400">Session Timeout:</span>
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {sessionMinutesLeft} min left
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Sign Out Button */}
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition duration-150 border border-rose-200/60 dark:border-rose-900/40"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenAuth?.('login')}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-orange-600 transition flex items-center space-x-1"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => onOpenAuth?.('signup')}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition flex items-center space-x-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            )}

            {/* Guided Tour Button */}
            {onStartTour && (
              <button
                type="button"
                onClick={onStartTour}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Start Guided Tour"
                aria-label="Start Guided Tour"
              >
                <HelpCircle className="w-4 h-4 text-orange-500" />
              </button>
            )}

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Toggle Day/Night Theme"
              aria-label="Toggle Day/Night Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
            </button>
          </div>

          {/* Mobile Actions: Tour, Dark/Light Mode & Hamburger Menu Button */}
          <div className="flex items-center space-x-1.5 md:hidden">
            {onStartTour && (
              <button
                type="button"
                onClick={onStartTour}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title="Start Guided Tour"
                aria-label="Start Guided Tour"
              >
                <HelpCircle className="w-4 h-4 text-orange-500" />
              </button>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Toggle Day/Night Theme"
              aria-label="Toggle Day/Night Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-orange-500" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 px-1 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
            {/* Center Switcher on mobile */}
            {isSAdmin && (
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">Switch Center:</span>
                <select
                  value={currentCenter?.id || ''}
                  onChange={(e) => switchCenter(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
                >
                  {availableCenters.map((c) => (
                    <option key={c.id} value={c.id} className="dark:bg-slate-900">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* User status or Demo Role Switcher */}
            {firebaseUser ? (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/90 dark:to-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="relative w-11 h-11 rounded-2xl flex-shrink-0">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={currentUser.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-2xl shadow border border-orange-500/30"
                      />
                    ) : (
                      <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-sm flex items-center justify-center shadow">
                        {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'D'}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {currentUser.email || 'devotee@iskcon.org'}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md ${
                          currentUser.role === 'sadmin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : currentUser.role === 'admin'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {currentUser.role === 'sadmin' ? 'Super Admin' : currentUser.role === 'admin' ? 'Admin' : 'Devotee'}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                        &bull; {currentCenter?.name}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-bold transition border border-rose-200/50 dark:border-rose-900/40"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth?.('login');
                  }}
                  className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold text-center"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth?.('signup');
                  }}
                  className="py-2.5 px-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl text-xs font-bold text-center"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation Tabs Bar (Distinct Two-Tier Sub-Bar) */}
      </div>
      <div className="bg-slate-100/85 dark:bg-slate-950/75 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <nav
            ref={navRef}
            className="flex space-x-1.5 overflow-x-auto py-2 no-scrollbar touch-pan-x"
          >
            {navItems
              .filter((item) => item.visible)
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    ref={isActive ? activeTabRef : undefined}
                    onClick={() => handleTabClick(item.id as NavTab)}
                    className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex-shrink-0 relative border-t border-b-2 ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500 text-white border-t-white/30 border-b-orange-800/40 shadow-md shadow-orange-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/80 border-t-transparent border-b-transparent hover:border-b-orange-400/50'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-1 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </nav>
        </div>
      </div>
    </header>
  );
};
