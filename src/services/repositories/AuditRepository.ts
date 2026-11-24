import { collection, doc, getDocs, setDoc, query, orderBy, limit } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../config/firebase';
import { AuditLogEntry } from '../../types/audit';
import { IAuditRepository } from '../../types/repositories';
import { SafeStorage } from '../../utils/safeStorage';

export class AuditRepository implements IAuditRepository {
  private getLocalKey(centerId: string): string {
    return `kitchen_audit_logs_${centerId}`;
  }

  async fetchCenterAuditLogs(centerId: string, maxItems = 50): Promise<AuditLogEntry[]> {
    if (isFirebaseConfigured && db) {
      try {
        const auditCol = collection(db, 'audit_logs');
        const q = query(auditCol, orderBy('timestamp', 'desc'), limit(maxItems));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const logs: AuditLogEntry[] = [];
          snap.forEach((d) => {
            const data = d.data() as AuditLogEntry;
            if (!data.centerId || data.centerId === centerId || data.centerId === 'all') {
              logs.push(data);
            }
          });
          SafeStorage.setItem(this.getLocalKey(centerId), logs);
          return logs;
        }
      } catch (err) {
        console.warn('[AuditRepository] Failed to fetch audit logs from Firestore:', err);
      }
    }

    return SafeStorage.getItem<AuditLogEntry[]>(this.getLocalKey(centerId), []);
  }

  async logAuditAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    const currentLogs = SafeStorage.getItem<AuditLogEntry[]>(this.getLocalKey(entry.centerId), []);
    const updatedLogs = [fullEntry, ...currentLogs].slice(0, 100);
    SafeStorage.setItem(this.getLocalKey(entry.centerId), updatedLogs);

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'audit_logs', fullEntry.id), fullEntry);
      } catch (err) {
        console.warn('[AuditRepository] Failed to persist audit log in Firestore:', err);
      }
    }

    return fullEntry;
  }
}
