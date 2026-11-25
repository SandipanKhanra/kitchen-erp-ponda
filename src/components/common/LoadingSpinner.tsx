import React from 'react';
import { ChefHat, Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'sm',
  className = '',
}) => {
  return <Loader2 className={`animate-spin ${SIZE_CLASSES[size]} ${className}`} />;
};

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = 'Ponda Kitchen ERP',
  subtitle = 'Loading Vaishnava Kitchen Workspace...',
}) => {
  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6">
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer glowing ring */}
        <div className="absolute w-24 h-24 rounded-full border-4 border-orange-500/20 border-t-orange-500 animate-spin" />
        {/* Inner counter-rotating ring */}
        <div
          className="absolute w-20 h-20 rounded-full border-2 border-amber-400/20 border-b-amber-500 animate-spin"
          style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
        />
        {/* Center emblem */}
        <div className="p-4 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-xl shadow-orange-500/30">
          <ChefHat className="w-8 h-8" />
        </div>
      </div>

      <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
        {title}
      </h2>
      <div className="flex items-center space-x-2 mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <LoadingSpinner size="xs" className="text-orange-500" />
        <span>{subtitle}</span>
      </div>
    </div>
  );
};
