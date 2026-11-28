import { useEffect, useRef } from 'react';

let modalSeq = 0;
const openModalStack: string[] = [];
let pendingCleanupPopCount = 0;

/**
 * Returns the token of the topmost currently open modal/drawer, or null if none are open.
 */
export function getTopOpenModalToken(): string | null {
  return openModalStack.length > 0 ? openModalStack[openModalStack.length - 1] : null;
}

/**
 * Consumes a synthetic history.back() popstate triggered when a modal closes via UI/Escape.
 */
export function consumePendingModalCleanupPop(): boolean {
  if (pendingCleanupPopCount > 0) {
    pendingCleanupPopCount--;
    return true;
  }
  return false;
}

/**
 * Closes an open modal/drawer cleanly on Escape key OR mobile/browser Back button (popstate).
 * Pushes a transient history entry when opened so hardware Back dismisses the overlay instead
 * of navigating away from the current screen.
 */
export function useModalClose(isOpen: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const token = `modal_${++modalSeq}`;
    let closedByPopState = false;
    openModalStack.push(token);

    const hasHistory = typeof window !== 'undefined' && typeof window.history !== 'undefined';
    if (hasHistory) {
      const currentState =
        window.history.state && typeof window.history.state === 'object'
          ? window.history.state
          : {};
      window.history.pushState(
        { ...currentState, __modalToken: token },
        '',
        window.location.href
      );
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && getTopOpenModalToken() === token) {
        onCloseRef.current();
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (getTopOpenModalToken() !== token) return;
      const activeStateToken =
        e.state && typeof e.state === 'object' ? (e.state as { __modalToken?: string }).__modalToken : undefined;
      if (activeStateToken !== token) {
        closedByPopState = true;
        const idx = openModalStack.lastIndexOf(token);
        if (idx >= 0) openModalStack.splice(idx, 1);
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);

      const idx = openModalStack.lastIndexOf(token);
      if (idx >= 0) openModalStack.splice(idx, 1);

      if (
        hasHistory &&
        !closedByPopState &&
        window.history.state &&
        typeof window.history.state === 'object' &&
        (window.history.state as { __modalToken?: string }).__modalToken === token
      ) {
        pendingCleanupPopCount++;
        window.history.back();
      }
    };
  }, [isOpen]);
}
