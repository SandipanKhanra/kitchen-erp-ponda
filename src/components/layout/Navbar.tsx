import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useKitchen } from '../../context/KitchenContext';
import {
  ChefHat,
  Calendar,
  ShoppingBag,
  UtensilsCrossed,
  ShieldCheck,
  Building2,
  Moon,
  Sun,
  Flame,
  UserCheck,
  Package,
  Layers,
  Sparkles,
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
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const {
    currentUser,
    currentCenter,
    availableCenters,
    isSAdmin,
    isAdmin,
    switchDemoUser,
    switchCenter,
    centerRequests,
  } = useAuth();
  const { theme, toggleTheme } = useKitchen();

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

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-40 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Tier: Brand, Center info, Theme, User Switcher */}
        <div className="flex justify-between items-center h-16 gap-3">
          {/* Logo & Center info */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('menu_planner')}>
            <div className="bg-gradient-to-tr from-amber-500 to-orange-500 text-white p-2.5 rounded-2xl shadow-lg shadow-orange-500/25">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                  KitchenOps
                </span>
                <span className="text-[10px] bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 font-extrabold px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-900">
                  ISKCON ERP
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Building2 className="w-3.5 h-3.5 text-orange-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {currentCenter.name}
                </span>
                <span className="text-[10px] text-slate-400">({currentCenter.code})</span>
              </div>
            </div>
          </div>

          {/* SAdmin Center Switcher (if SAdmin) */}
          {isSAdmin && (
            <div className="hidden md:flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-semibold">Center:</span>
              <select
                value={currentCenter.id}
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

          {/* Right Controls: Demo Role Switcher & Dark/Light Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live Role Switcher (Crucial for testing Maker-Checker) */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <span className="px-2 py-1 text-slate-400 text-[10px] font-bold uppercase hidden sm:inline">
                Test Role:
              </span>
              <button
                onClick={() => switchDemoUser('sadmin')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currentUser.role === 'sadmin'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Super Admin (All Centers)"
              >
                SAdmin
              </button>
              <button
                onClick={() => switchDemoUser('admin1')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currentUser.uid === 'admin_ponda_1'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Admin 1 (Krishna Dasa - Creator)"
              >
                Admin 1
              </button>
              <button
                onClick={() => switchDemoUser('admin2')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currentUser.uid === 'admin_ponda_2'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Admin 2 (Govinda Dasa - Approver)"
              >
                Admin 2
              </button>
              <button
                onClick={() => switchDemoUser('user')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  currentUser.role === 'user'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Standard User (Radhika Devi)"
              >
                User
              </button>
            </div>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Toggle Day/Night Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-2 border-t border-slate-100 dark:border-slate-800/80 no-scrollbar">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as NavTab)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap relative ${
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
