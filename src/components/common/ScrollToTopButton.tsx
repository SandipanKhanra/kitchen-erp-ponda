import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopButtonProps {
  thresholdPx?: number;
  hidden?: boolean;
}

/**
 * Floating Scroll-to-Top button that fades in after scrolling down and clears
 * the mobile bottom navigation bar cleanly.
 */
export const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({
  thresholdPx = 280,
  hidden = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > thresholdPx);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [thresholdPx]);

  if (hidden) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top"
      title="Scroll to top"
      className={`fixed bottom-20 right-3.5 md:bottom-6 md:right-6 z-30 w-10 h-10 rounded-full flex items-center justify-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-orange-300/80 dark:border-orange-700/70 text-orange-600 dark:text-orange-400 shadow-lg shadow-slate-900/10 dark:shadow-black/40 hover:bg-gradient-to-tr hover:from-orange-500 hover:to-amber-500 hover:text-white hover:border-orange-500 active:scale-95 transition-all duration-200 cursor-pointer ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-3 scale-90 pointer-events-none'
      }`}
    >
      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
    </button>
  );
};
