import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { UserSession } from '../types/session';
import { SafeStorage } from '../utils/safeStorage';

export const MAX_CONCURRENT_DEVICES = 2;
export const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const DEVICE_ID_KEY = 'kitchen_device_id';
const ACTIVE_SESSION_KEY = 'kitchen_active_session';

export class SessionService {
  /**
   * Persistent unique ID for this browser/device so refreshing or re-logging
   * on the same device does not consume a second device slot.
   */
  getDeviceId(): string {
    let deviceId = SafeStorage.getItem<string | null>(DEVICE_ID_KEY, null);
    if (!deviceId) {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      SafeStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  /**
   * Human-readable label for the current browser/OS
   */
  getDeviceLabel(): string {
    if (typeof navigator === 'undefined') return 'Web Browser';
    const ua = navigator.userAgent || '';
    let browser = 'Browser';
    if (ua.includes('Edg/')) browser = 'Edge';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';

    let os = 'Device';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    else if (ua.includes('Mac OS')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';

    return `${browser} on ${os}`;
  }

  getLocalSession(): UserSession | null {
    return SafeStorage.getItem<UserSession | null>(ACTIVE_SESSION_KEY, null);
  }

  setLocalSession(session: UserSession | null): void {
    if (session) {
      SafeStorage.setItem(ACTIVE_SESSION_KEY, session);
    } else {
      SafeStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }

  isSessionExpired(session: UserSession | null): boolean {
    if (!session) return true;
    return Date.now() >= session.expiresAt;
  }

  /**
   * Fetch active (non-expired) sessions for a user by normalized email,
   * cleaning up any expired sessions found in Firestore.
   */
  async getActiveSessions(email: string): Promise<UserSession[]> {
    const emailLower = email.trim().toLowerCase();
    if (!isFirebaseConfigured || !db || !emailLower) {
      const local = this.getLocalSession();
      if (local && local.emailLower === emailLower && !this.isSessionExpired(local)) {
        return [local];
      }
      return [];
    }

    const now = Date.now();
    const active: UserSession[] = [];
    const expiredIds: string[] = [];

    try {
      const q = query(collection(db, 'user_sessions'), where('emailLower', '==', emailLower));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const s = d.data() as UserSession;
        if (s.expiresAt > now) {
          active.push(s);
        } else {
          expiredIds.push(s.sessionId || d.id);
        }
      });

      // Clean up expired sessions asynchronously
      if (expiredIds.length > 0) {
        Promise.all(
          expiredIds.map((id) => deleteDoc(doc(db!, 'user_sessions', id)))
        ).catch(() => {});
      }
    } catch (err) {
      console.warn('[SessionService] Failed to fetch active sessions:', err);
    }

    return active;
  }

  /**
   * Create a 30-minute session for the user on this device.
   * Enforces maximum 2 concurrent devices.
   */
  async createSession(uid: string, email: string): Promise<UserSession> {
    const emailLower = email.trim().toLowerCase();
    const deviceId = this.getDeviceId();
    const deviceLabel = this.getDeviceLabel();
    const now = Date.now();

    if (isFirebaseConfigured && db && emailLower) {
      const activeSessions = await this.getActiveSessions(emailLower);

      // Remove any existing session on this same device (refreshing slot)
      const sameDeviceSessions = activeSessions.filter((s) => s.deviceId === deviceId);
      const otherDeviceSessions = activeSessions.filter((s) => s.deviceId !== deviceId);

      // Deduplicate other devices by deviceId
      const uniqueOtherDevices = new Map<string, UserSession>();
      for (const s of otherDeviceSessions) {
        uniqueOtherDevices.set(s.deviceId, s);
      }

      if (uniqueOtherDevices.size >= MAX_CONCURRENT_DEVICES) {
        const activeNames = Array.from(uniqueOtherDevices.values())
          .map((s) => s.deviceLabel)
          .join(', ');
        throw new Error(
          `Maximum ${MAX_CONCURRENT_DEVICES} devices allowed. You already have active sessions on: ${activeNames}. Please log out from one device or wait for the 30-minute session to expire.`
        );
      }

      // Clean up old session docs for this same device
      if (sameDeviceSessions.length > 0) {
        await Promise.all(
          sameDeviceSessions.map((s) => deleteDoc(doc(db!, 'user_sessions', s.sessionId)))
        ).catch(() => {});
      }
    }

    const sessionId = `sess_${uid}_${deviceId}_${now}`;
    const newSession: UserSession = {
      sessionId,
      uid,
      emailLower,
      deviceId,
      deviceLabel,
      loginAt: now,
      expiresAt: now + SESSION_DURATION_MS,
      lastActiveAt: now,
    };

    this.setLocalSession(newSession);

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'user_sessions', sessionId), newSession);
      } catch (err) {
        console.warn('[SessionService] Failed to persist session to Firestore:', err);
      }
    }

    return newSession;
  }

  /**
   * Create a local 30-minute session for Demo Mode
   */
  createDemoSession(uid: string, email: string): UserSession {
    const now = Date.now();
    const session: UserSession = {
      sessionId: `demo_sess_${now}`,
      uid,
      emailLower: email.trim().toLowerCase(),
      deviceId: this.getDeviceId(),
      deviceLabel: this.getDeviceLabel(),
      loginAt: now,
      expiresAt: now + SESSION_DURATION_MS,
      lastActiveAt: now,
    };
    this.setLocalSession(session);
    return session;
  }

  /**
   * End current session on logout or expiry
   */
  async endCurrentSession(): Promise<void> {
    const current = this.getLocalSession();
    this.setLocalSession(null);

    if (current && isFirebaseConfigured && db && !current.sessionId.startsWith('demo_')) {
      try {
        await deleteDoc(doc(db, 'user_sessions', current.sessionId));
      } catch (err) {
        console.warn('[SessionService] Failed to delete session from Firestore:', err);
      }
    }
  }
}

export const sessionService = new SessionService();
