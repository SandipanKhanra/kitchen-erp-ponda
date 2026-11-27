import { auth } from '../config/firebase';
import { FifteenDayMenuPlan } from '../types/menu';
import { UserProfile } from '../types/user';
import { formatUserRole } from '../utils/formatters';
import {
  buildMenuApprovalEmailHtml,
  emailNotificationService,
} from './emailNotificationService';

const WORKER_URL = (import.meta.env.VITE_NOTIFY_WORKER_URL || '').replace(/\/+$/, '');

export interface WorkerNotifyResult {
  configured: boolean;
  emailConfigured: boolean;
  fcmConfigured: boolean;
  sentEmailCount: number;
  sentPushCount: number;
}

export class WorkerNotificationService {
  isConfigured(): boolean {
    return Boolean(WORKER_URL);
  }

  /**
   * Calls the Cloudflare Worker with the signed-in user's Firebase ID token
   * to send Resend emails and FCM closed-app push notifications.
   */
  async notifyAdminsForMenuApproval(params: {
    allUsers: UserProfile[];
    centerId: string;
    centerName: string;
    submitter: UserProfile;
    plan: FifteenDayMenuPlan;
  }): Promise<WorkerNotifyResult> {
    if (!this.isConfigured() || !auth?.currentUser) {
      return {
        configured: false,
        emailConfigured: false,
        fcmConfigured: false,
        sentEmailCount: 0,
        sentPushCount: 0,
      };
    }

    const recipients = emailNotificationService.getTargetAdminRecipients(
      params.allUsers,
      params.centerId,
      params.submitter.uid
    );

    if (recipients.length === 0) {
      return {
        configured: true,
        emailConfigured: false,
        fcmConfigured: false,
        sentEmailCount: 0,
        sentPushCount: 0,
      };
    }

    const appUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/menu-planner`
        : 'https://iskcon-ponda-kitchen-erp.web.app/menu-planner';

    const idToken = await auth.currentUser.getIdToken();
    const htmlBody = buildMenuApprovalEmailHtml({
      recipientName: 'Center Admin',
      centerName: params.centerName,
      submitterName: params.submitter.name,
      submitterRole: params.submitter.role,
      planTitle: params.plan.title,
      startDate: params.plan.startDate,
      endDate: params.plan.endDate,
      appUrl,
    });

    const res = await fetch(`${WORKER_URL}/notify/menu-approval`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        recipients: recipients.map((r) => ({
          uid: r.uid,
          email: r.email,
          name: r.name,
          fcmTokens: r.fcmTokens || [],
        })),
        centerName: params.centerName,
        submitterName: params.submitter.name,
        planTitle: params.plan.title,
        subject: `[Action Required] ${params.centerName}: 15-Day Menu Approval`,
        htmlBody,
        pushTitle: '15-Day Menu Awaiting Approval',
        pushBody: `${params.submitter.name} (${formatUserRole(params.submitter.role)}) updated "${params.plan.title}". Tap to review.`,
        appUrl,
      }),
    });

    if (!res.ok) {
      throw new Error(`Notify worker responded with ${res.status}`);
    }

    const data = (await res.json()) as {
      email?: { configured?: boolean; sentCount?: number };
      fcm?: { configured?: boolean; sentCount?: number };
    };

    return {
      configured: true,
      emailConfigured: Boolean(data.email?.configured),
      fcmConfigured: Boolean(data.fcm?.configured),
      sentEmailCount: data.email?.sentCount || 0,
      sentPushCount: data.fcm?.sentCount || 0,
    };
  }
}

export const workerNotificationService = new WorkerNotificationService();
