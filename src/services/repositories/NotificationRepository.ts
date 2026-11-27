import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  query,
  where,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../config/firebase';
import { AppNotification } from '../../types/notification';
import { SafeStorage } from '../../utils/safeStorage';

export class NotificationRepository {
  private getLocalKey(centerId: string): string {
    return `kitchen_notifications_${centerId}`;
  }

  subscribeToCenterNotifications(
    centerId: string,
    onData: (items: AppNotification[]) => void
  ): () => void {
    if (!centerId) {
      onData([]);
      return () => {};
    }

    const cached = SafeStorage.getItem<AppNotification[]>(this.getLocalKey(centerId), []);
    if (cached.length > 0) {
      onData(cached);
    }

    if (!isFirebaseConfigured || !db) {
      return () => {};
    }

    const q = query(collection(db, 'notifications'), where('centerId', '==', centerId));
    return onSnapshot(
      q,
      (snap) => {
        const list: AppNotification[] = [];
        snap.forEach((d) => {
          list.push(d.data() as AppNotification);
        });
        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const trimmed = list.slice(0, 30);
        SafeStorage.setItem(this.getLocalKey(centerId), trimmed);
        onData(trimmed);
      },
      (err) => {
        console.warn('[NotificationRepository] Listener notice:', err);
      }
    );
  }

  async createNotification(
    centerId: string,
    input: Omit<AppNotification, 'id' | 'createdAt'>
  ): Promise<AppNotification> {
    const item: AppNotification = {
      ...input,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    const existing = SafeStorage.getItem<AppNotification[]>(this.getLocalKey(centerId), []);
    SafeStorage.setItem(this.getLocalKey(centerId), [item, ...existing].slice(0, 30));

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'notifications', item.id), item);
      } catch (err) {
        console.warn('[NotificationRepository] Failed to save notification:', err);
      }
    }

    return item;
  }

  /**
   * Deletes all notifications for a center that were created before the current calendar month.
   * Called once on login / center switch so old notifications never pile up.
   */
  async deleteOldNotifications(centerId: string): Promise<void> {
    if (!centerId) return;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Purge from local cache
    const cached = SafeStorage.getItem<AppNotification[]>(this.getLocalKey(centerId), []);
    const kept = cached.filter((n) => n.createdAt >= thisMonthStart);
    SafeStorage.setItem(this.getLocalKey(centerId), kept);

    if (!isFirebaseConfigured || !db) return;

    try {
      const q = query(collection(db, 'notifications'), where('centerId', '==', centerId));
      const snap = await getDocs(q);
      const deletes: Promise<void>[] = [];
      snap.forEach((d) => {
        const n = d.data() as AppNotification;
        if (n.createdAt < thisMonthStart) {
          deletes.push(deleteDoc(doc(db!, 'notifications', d.id)));
        }
      });
      await Promise.allSettled(deletes);
    } catch (err) {
      console.warn('[NotificationRepository] Failed to delete old notifications:', err);
    }
  }

  async markAsRead(centerId: string, notificationId: string, uid: string): Promise<void> {
    const existing = SafeStorage.getItem<AppNotification[]>(this.getLocalKey(centerId), []);
    const updated = existing.map((n) =>
      n.id === notificationId && !n.readBy.includes(uid)
        ? { ...n, readBy: [...n.readBy, uid] }
        : n
    );
    SafeStorage.setItem(this.getLocalKey(centerId), updated);

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'notifications', notificationId), {
          readBy: arrayUnion(uid),
        });
      } catch (err) {
        console.warn('[NotificationRepository] Failed to mark read:', err);
      }
    }
  }
}

export const notificationRepository = new NotificationRepository();
