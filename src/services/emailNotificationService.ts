import { UserProfile } from '../types/user';
import { FifteenDayMenuPlan } from '../types/menu';
import { formatDateDDMMYYYY, formatUserRole } from '../utils/formatters';

export interface MenuApprovalNotificationResult {
  configured: boolean;
  recipientEmails: string[];
  sentCount: number;
}

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

export const isEmailJsConfigured = Boolean(
  EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY
);

/**
 * Generates a responsive, email-client-safe HTML email for Maker-Checker menu approval.
 */
export function buildMenuApprovalEmailHtml(params: {
  recipientName: string;
  centerName: string;
  submitterName: string;
  submitterRole: string;
  planTitle: string;
  startDate: string;
  endDate: string;
  appUrl: string;
}): string {
  const startFormatted = formatDateDDMMYYYY(params.startDate);
  const endFormatted = formatDateDDMMYYYY(params.endDate);
  const roleLabel = formatUserRole(params.submitterRole);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Menu Approval Request - Ponda Kitchen ERP</title>
</head>
<body style="margin:0;padding:0;background-color:#fff7ed;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#fffbf2 0%,#fff1df 45%,#fdf2f8 100%);padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:#ffffff;border-radius:20px;overflow:hidden;border-top:4px solid #f97316;border-bottom:4px solid #6366f1;box-shadow:0 12px 32px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#f97316,#f59e0b);padding:26px 32px;text-align:center;">
              <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#ffedd5;margin-bottom:6px;">
                Maker-Checker Menu Governance
              </div>
              <h1 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">
                Ponda Kitchen ERP
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px;">
              <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#ea580c;">
                Hare Krishna ${params.recipientName || 'Admin'}!
              </p>
              <h2 style="margin:0 0 14px;font-size:19px;font-weight:800;color:#0f172a;">
                15-Day Menu Awaiting Your Approval
              </h2>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#475569;">
                <strong>${params.submitterName}</strong> (${roleLabel}) has submitted an updated 15-day Prasadam menu plan for <strong>${params.centerName}</strong>.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fff7ed;border-left:4px solid #f97316;border-radius:10px;margin-bottom:24px;">
                <tr>
                  <td style="padding:14px 16px;font-size:13px;line-height:1.7;color:#7c2d12;">
                    <div><strong>Menu Plan:</strong> ${params.planTitle}</div>
                    <div><strong>Cycle Dates:</strong> ${startFormatted} to ${endFormatted}</div>
                    <div><strong>Status:</strong> Pending Admin Approval</div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:4px 0 22px;">
                    <a href="${params.appUrl}" style="display:inline-block;background:linear-gradient(90deg,#f97316,#f59e0b);color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 28px;border-radius:12px;">
                      Review &amp; Approve Menu
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#64748b;">
                Under Maker-Checker policy, another Center Admin must review and approve this menu before it is locked.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;">
              Ponda Kitchen ERP &bull; ${params.centerName}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export class EmailNotificationService {
  /**
   * Determines which Center Admins should be notified:
   * - If submitted by a regular user -> notify ALL Center Admins in that center.
   * - If updated by an Admin -> notify all OTHER Center Admins in that center.
   */
  getTargetAdminRecipients(
    allUsers: UserProfile[],
    centerId: string,
    submitterUid: string
  ): UserProfile[] {
    const seenEmails = new Set<string>();
    return allUsers.filter((u) => {
      if (u.centerId !== centerId) return false;
      if (u.role !== 'admin') return false;
      if (u.uid === submitterUid) return false;
      const email = (u.email || '').trim().toLowerCase();
      if (!email || seenEmails.has(email)) return false;
      seenEmails.add(email);
      return true;
    });
  }

  /**
   * Sends the formatted HTML menu approval email to all eligible Center Admins via EmailJS.
   */
  async notifyAdminsForMenuApproval(params: {
    allUsers: UserProfile[];
    centerId: string;
    centerName: string;
    submitter: UserProfile;
    plan: FifteenDayMenuPlan;
  }): Promise<MenuApprovalNotificationResult> {
    const recipients = this.getTargetAdminRecipients(
      params.allUsers,
      params.centerId,
      params.submitter.uid
    );
    const recipientEmails = recipients.map((r) => r.email);

    if (recipients.length === 0 || !isEmailJsConfigured) {
      return {
        configured: isEmailJsConfigured,
        recipientEmails,
        sentCount: 0,
      };
    }

    const appUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/menu-planner`
        : 'https://iskcon-ponda-kitchen-erp.web.app/menu-planner';

    const results = await Promise.allSettled(
      recipients.map(async (admin) => {
        const htmlBody = buildMenuApprovalEmailHtml({
          recipientName: admin.name,
          centerName: params.centerName,
          submitterName: params.submitter.name,
          submitterRole: params.submitter.role,
          planTitle: params.plan.title,
          startDate: params.plan.startDate,
          endDate: params.plan.endDate,
          appUrl,
        });

        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: {
              to_email: admin.email,
              to_name: admin.name,
              subject: `[Action Required] ${params.centerName}: 15-Day Menu Approval`,
              center_name: params.centerName,
              submitter_name: params.submitter.name,
              plan_title: params.plan.title,
              cycle_dates: `${formatDateDDMMYYYY(params.plan.startDate)} to ${formatDateDDMMYYYY(params.plan.endDate)}`,
              app_url: appUrl,
              html_body: htmlBody,
            },
          }),
        });
        if (!res.ok) {
          throw new Error(`EmailJS responded with ${res.status}`);
        }
      })
    );

    const sentCount = results.filter((r) => r.status === 'fulfilled').length;
    return {
      configured: true,
      recipientEmails,
      sentCount,
    };
  }
}

export const emailNotificationService = new EmailNotificationService();
