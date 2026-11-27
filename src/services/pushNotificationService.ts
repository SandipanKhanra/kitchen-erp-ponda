import { SafeStorage } from '../utils/safeStorage';

const PUSH_ENABLED_KEY = 'kitchen_push_enabled';

export class PushNotificationService {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  getPermissionState(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  isUserEnabled(): boolean {
    if (!this.isSupported()) return false;
    if (Notification.permission !== 'granted') return false;
    return SafeStorage.getItem<boolean>(PUSH_ENABLED_KEY, true);
  }

  async enablePushNotifications(): Promise<{
    granted: boolean;
    reason?: string;
  }> {
    if (!this.isSupported()) {
      return {
        granted: false,
        reason: 'Push notifications are not supported in this browser.',
      };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      SafeStorage.setItem(PUSH_ENABLED_KEY, false);
      return {
        granted: false,
        reason:
          permission === 'denied'
            ? 'Notification permission was blocked in browser settings.'
            : 'Notification permission was dismissed.',
      };
    }

    SafeStorage.setItem(PUSH_ENABLED_KEY, true);
    await this.showNotification(
      'Ponda Kitchen ERP',
      'Push notifications are now enabled for menu approvals & kitchen alerts.',
      '/menu-planner'
    );
    return { granted: true };
  }

  disablePushNotifications(): void {
    SafeStorage.setItem(PUSH_ENABLED_KEY, false);
  }

  async showNotification(title: string, body: string, url = '/menu-planner'): Promise<void> {
    if (!this.isUserEnabled()) return;

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: `kitchen-erp-${Date.now()}`,
            data: { url },
          });
          return;
        }
      }

      const notif = new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
      });
      notif.onclick = () => {
        window.focus();
      };
    } catch (err) {
      console.warn('[PushNotificationService] Could not show notification:', err);
    }
  }
}

export const pushNotificationService = new PushNotificationService();
