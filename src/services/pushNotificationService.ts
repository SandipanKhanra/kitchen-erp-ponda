import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported as isFcmSupported } from 'firebase/messaging';
import { app, db, isFirebaseConfigured } from '../config/firebase';
import { SafeStorage } from '../utils/safeStorage';

const PUSH_ENABLED_KEY = 'kitchen_push_enabled';
const FCM_TOKEN_KEY = 'kitchen_fcm_token';
const FIREBASE_VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

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

  /**
   * Registers the dedicated FCM service worker and saves the device's FCM token
   * on the user's Firestore profile so the Cloudflare Worker can send closed-app push.
   */
  async registerFcmToken(uid?: string): Promise<string | null> {
    if (!uid || !isFirebaseConfigured || !app || !db || !FIREBASE_VAPID_KEY) {
      return null;
    }
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const supported = await isFcmSupported();
      if (!supported) return null;

      const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope',
      });
      const messaging = getMessaging(app);
      const token = await getToken(messaging, {
        vapidKey: FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });

      if (token) {
        SafeStorage.setItem(FCM_TOKEN_KEY, token);
        await updateDoc(doc(db, 'users', uid), {
          fcmTokens: arrayUnion(token),
        });
        return token;
      }
    } catch (err) {
      console.warn('[PushNotificationService] FCM token registration notice:', err);
    }
    return null;
  }

  async enablePushNotifications(uid?: string): Promise<{
    granted: boolean;
    fcmRegistered?: boolean;
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
    const fcmToken = await this.registerFcmToken(uid);

    await this.showNotification(
      'Ponda Kitchen ERP',
      'Push notifications are now enabled for menu approvals & kitchen alerts.',
      '/menu-planner'
    );
    return { granted: true, fcmRegistered: Boolean(fcmToken) };
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
