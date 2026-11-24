import React, { useState } from 'react';
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
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenAuth }) => {
  const {
    currentUser,
    firebaseUser,
    currentCenter,
    availableCenters,
    isSAdmin,
    isAdmin,
    isDemoMode,
    switchDemoUser,
    switchCenter,
    centerRequests,
    logout,
  } = useAuth();
  const { theme, toggleTheme } = useKitchen();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pendingRequestsCount = centerRequests.filter((r) => r.status === 'pending_approval').length;

  const navItems = [
    { id: 'menu_planner', label: '15-Day Menu Planner', icon: Flame, visible: true },
    { id: 'daywise_shopping', label: 'Day-wise & Shopping List', icon: ShoppingBag, visible: true },
    { id: 'stock', label: 'Stock & Price Adjuster', icon: Package, visible: true },
    { id: 'recipes_patterns', label: 'Recipes & Patterns', icon: Layers, visible: true },
    { id: 'vaishnava_calendar', label: 'Vaishnava Calendar', icon: Calendar, visible: true },
    { id: 'admin_users', label: 'Center User Admin', icon: UserCheck, visible: isAdmin || isSAdmin },
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
    <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 shadow-sm transition-colors duration-200">
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
              <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 pl-2 pr-1.5 py-1 rounded-2xl border border-slate-200/80 dark:border-slate-700">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-xs flex items-center justify-center shadow-sm">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'D'}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[120px]">
                    {currentUser.name}
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md ${
                      currentUser.role === 'sadmin'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400'
                        : currentUser.role === 'admin'
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : isDemoMode ? (
              /* Demo Role Switcher */
              <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                <span className="px-2 py-1 text-slate-400 text-[10px] font-bold uppercase hidden lg:inline">
                  Test Role:
                </span>
                <button
                  onClick={() => switchDemoUser('sadmin')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    currentUser.role === 'sadmin'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Super Admin"
                >
                  SAdmin
                </button>
                <button
                  onClick={() => switchDemoUser('admin1')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    currentUser.uid === 'admin_ponda_1'
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Admin 1"
                >
                  Admin 1
                </button>
                <button
                  onClick={() => switchDemoUser('admin2')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    currentUser.uid === 'admin_ponda_2'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Admin 2"
                >
                  Admin 2
                </button>
                <button
                  onClick={() => switchDemoUser('user')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    currentUser.role === 'user'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="User"
                >
                  User
                </button>
                {onOpenAuth && (
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="ml-1 px-2.5 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-bold text-xs shadow-sm hover:from-orange-600 hover:to-amber-600 transition flex items-center space-x-1"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
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

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Toggle Day/Night Theme"
              aria-label="Toggle Day/Night Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>

          {/* Mobile Actions: Dark/Light Mode & Hamburger Menu Button */}
          <div className="flex items-center space-x-1.5 md:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Toggle Day/Night Theme"
              aria-label="Toggle Day/Night Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
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
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-sm flex items-center justify-center">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'D'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {currentUser.email} &bull; <span className="uppercase font-bold text-orange-600">{currentUser.role}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 py-1.5 px-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : isDemoMode ? (
              <div className="space-y-2 bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                    Maker-Checker Test Role:
                  </span>
                  {onOpenAuth && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenAuth('login');
                      }}
                      className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline"
                    >
                      Real Sign In &rarr;
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => switchDemoUser('sadmin')}
                    className={`py-1.5 rounded-lg font-bold text-center transition-all ${
                      currentUser.role === 'sadmin'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    SAdmin
                  </button>
                  <button
                    onClick={() => switchDemoUser('admin1')}
                    className={`py-1.5 rounded-lg font-bold text-center transition-all ${
                      currentUser.uid === 'admin_ponda_1'
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Admin 1
                  </button>
                  <button
                    onClick={() => switchDemoUser('admin2')}
                    className={`py-1.5 rounded-lg font-bold text-center transition-all ${
                      currentUser.uid === 'admin_ponda_2'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Admin 2
                  </button>
                  <button
                    onClick={() => switchDemoUser('user')}
                    className={`py-1.5 rounded-lg font-bold text-center transition-all ${
                      currentUser.role === 'user'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    User
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

        {/* Navigation Tabs (Smooth Responsive Horizontal Scroll) */}
        <nav className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-100 dark:border-slate-800/80 no-scrollbar touch-pan-x">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id as NavTab)}
                  className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 relative ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
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
    </header>
  );
};
