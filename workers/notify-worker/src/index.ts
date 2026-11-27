export interface Env {
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS?: string;
  RESEND_FROM_EMAIL?: string;
  // Secrets configured via `wrangler secret put`:
  RESEND_API_KEY?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
}

interface RecipientPayload {
  uid: string;
  email?: string;
  name?: string;
  fcmTokens?: string[];
}

interface MenuApprovalNotifyRequest {
  recipients: RecipientPayload[];
  centerName: string;
  submitterName: string;
  planTitle: string;
  subject: string;
  htmlBody: string;
  pushTitle?: string;
  pushBody?: string;
  appUrl: string;
}

interface GoogleJwk extends JsonWebKey {
  kid: string;
  alg?: string;
}

const FIREBASE_JWK_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let cachedJwks: { keys: GoogleJwk[]; expiresAt: number } | null = null;
let cachedOAuthToken: { token: string; expiresAt: number } | null = null;

function base64UrlToUint8Array(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function stringToBase64Url(str: string): string {
  return uint8ArrayToBase64Url(new TextEncoder().encode(str));
}

function decodeJwtPart<T>(part: string): T {
  const bytes = base64UrlToUint8Array(part);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

async function getFirebaseJwks(): Promise<GoogleJwk[]> {
  const now = Date.now();
  if (cachedJwks && now < cachedJwks.expiresAt) {
    return cachedJwks.keys;
  }

  const res = await fetch(FIREBASE_JWK_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Firebase JWKs (${res.status})`);
  }

  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600 * 1000;

  const data = (await res.json()) as { keys: GoogleJwk[] };
  cachedJwks = {
    keys: data.keys || [],
    expiresAt: now + maxAgeMs,
  };
  return cachedJwks.keys;
}

/**
 * Verifies a Firebase Auth ID token using Google's public JWKs and Web Crypto RS256.
 */
async function verifyFirebaseIdToken(
  token: string,
  projectId: string
): Promise<{ uid: string; email?: string }> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = decodeJwtPart<{ alg?: string; kid?: string }>(headerB64);
  const payload = decodeJwtPart<{
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
  }>(payloadB64);

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported JWT algorithm or missing kid');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= nowSec) {
    throw new Error('Firebase ID token expired');
  }
  if (!payload.iat || payload.iat > nowSec + 300) {
    throw new Error('Firebase ID token iat is in the future');
  }
  if (payload.aud !== projectId) {
    throw new Error('Firebase ID token aud mismatch');
  }
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Firebase ID token iss mismatch');
  }
  if (!payload.sub) {
    throw new Error('Firebase ID token missing sub');
  }

  const keys = await getFirebaseJwks();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    throw new Error('Matching Firebase public key not found');
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlToUint8Array(signatureB64);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signature,
    signedData
  );

  if (!valid) {
    throw new Error('Invalid Firebase ID token signature');
  }

  return { uid: payload.sub, email: payload.email };
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Exchanges a Firebase Service Account JWT for a Google OAuth2 access token (for FCM HTTP v1).
 */
async function getGoogleAccessToken(
  clientEmail: string,
  privateKeyPem: string
): Promise<string> {
  const nowMs = Date.now();
  if (cachedOAuthToken && nowMs < cachedOAuthToken.expiresAt) {
    return cachedOAuthToken.token;
  }

  const nowSec = Math.floor(nowMs / 1000);
  const headerB64 = stringToBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimB64 = stringToBase64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: nowSec,
      exp: nowSec + 3600,
    })
  );

  const signingInput = `${headerB64}.${claimB64}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );
  const assertion = `${signingInput}.${uint8ArrayToBase64Url(new Uint8Array(sigBuffer))}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth token error (${tokenRes.status}): ${errText}`);
  }

  const tokenJson = (await tokenRes.json()) as { access_token: string; expires_in?: number };
  const expiresInSec = tokenJson.expires_in || 3600;
  cachedOAuthToken = {
    token: tokenJson.access_token,
    expiresAt: nowMs + Math.max(60, expiresInSec - 120) * 1000,
  };
  return cachedOAuthToken.token;
}

async function sendResendEmail(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend error (${res.status}): ${errText}`);
  }
}

async function sendFcmPush(params: {
  projectId: string;
  accessToken: string;
  fcmToken: string;
  title: string;
  body: string;
  appUrl: string;
}): Promise<{ ok: boolean; unregistered?: boolean; error?: string }> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${params.projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: params.fcmToken,
          notification: {
            title: params.title,
            body: params.body,
          },
          webpush: {
            notification: {
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
            },
            fcm_options: {
              link: params.appUrl,
            },
          },
          data: {
            url: params.appUrl,
            type: 'menu_approval',
          },
        },
      }),
    }
  );

  if (res.ok) {
    return { ok: true };
  }

  const errText = await res.text();
  const unregistered =
    res.status === 404 || errText.includes('UNREGISTERED') || errText.includes('Requested entity was not found');
  return { ok: false, unregistered, error: `FCM (${res.status}): ${errText}` };
}

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const allowOrigin =
    allowed.includes('*') || (origin && allowed.includes(origin))
      ? origin || '*'
      : allowed[0] || '*';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(
  data: unknown,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return jsonResponse(
        {
          ok: true,
          service: 'kitchen-notify-worker',
          emailConfigured: Boolean(env.RESEND_API_KEY),
          fcmConfigured: Boolean(env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY),
        },
        200,
        corsHeaders
      );
    }

    if (request.method === 'POST' && url.pathname === '/notify/menu-approval') {
      if (!env.FIREBASE_PROJECT_ID) {
        return jsonResponse({ error: 'FIREBASE_PROJECT_ID is not configured on Worker' }, 500, corsHeaders);
      }

      const authHeader = request.headers.get('Authorization') || '';
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (!idToken) {
        return jsonResponse({ error: 'Missing Authorization Bearer token' }, 401, corsHeaders);
      }

      let verifiedUser: { uid: string; email?: string };
      try {
        verifiedUser = await verifyFirebaseIdToken(idToken, env.FIREBASE_PROJECT_ID);
      } catch (err) {
        return jsonResponse(
          { error: err instanceof Error ? err.message : 'Unauthorized' },
          401,
          corsHeaders
        );
      }

      let body: MenuApprovalNotifyRequest;
      try {
        body = (await request.json()) as MenuApprovalNotifyRequest;
      } catch {
        return jsonResponse({ error: 'Invalid JSON request body' }, 400, corsHeaders);
      }

      const recipients = Array.isArray(body.recipients) ? body.recipients : [];
      if (recipients.length === 0) {
        return jsonResponse(
          {
            ok: true,
            verifiedUid: verifiedUser.uid,
            email: { configured: Boolean(env.RESEND_API_KEY), sentCount: 0 },
            fcm: {
              configured: Boolean(env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY),
              sentCount: 0,
              invalidTokens: [],
            },
          },
          200,
          corsHeaders
        );
      }

      // 1. Send Emails via Resend (if configured)
      const emailConfigured = Boolean(env.RESEND_API_KEY);
      let emailSentCount = 0;
      const emailErrors: string[] = [];

      if (emailConfigured && env.RESEND_API_KEY) {
        const from = env.RESEND_FROM_EMAIL || 'Ponda Kitchen ERP <onboarding@resend.dev>';
        const uniqueEmails = Array.from(
          new Set(
            recipients
              .map((r) => (r.email || '').trim().toLowerCase())
              .filter(Boolean)
          )
        );

        const emailResults = await Promise.allSettled(
          uniqueEmails.map((to) =>
            sendResendEmail({
              apiKey: env.RESEND_API_KEY!,
              from,
              to,
              subject: body.subject,
              html: body.htmlBody,
            })
          )
        );

        for (const r of emailResults) {
          if (r.status === 'fulfilled') {
            emailSentCount++;
          } else {
            emailErrors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
          }
        }
      }

      // 2. Send FCM Push Notifications via HTTP v1 API (if configured)
      const fcmConfigured = Boolean(env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
      let fcmSentCount = 0;
      const invalidTokens: string[] = [];
      const fcmErrors: string[] = [];

      const allTokens = Array.from(
        new Set(
          recipients.flatMap((r) => (Array.isArray(r.fcmTokens) ? r.fcmTokens : [])).filter(Boolean)
        )
      );

      if (fcmConfigured && allTokens.length > 0 && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
        try {
          const accessToken = await getGoogleAccessToken(
            env.FIREBASE_CLIENT_EMAIL,
            env.FIREBASE_PRIVATE_KEY
          );

          const pushTitle = body.pushTitle || '15-Day Menu Awaiting Approval';
          const pushBody =
            body.pushBody ||
            `${body.submitterName} updated "${body.planTitle}" for ${body.centerName}. Tap to review.`;

          const pushResults = await Promise.all(
            allTokens.map(async (token) => {
              const res = await sendFcmPush({
                projectId: env.FIREBASE_PROJECT_ID,
                accessToken,
                fcmToken: token,
                title: pushTitle,
                body: pushBody,
                appUrl: body.appUrl,
              });
              return { token, ...res };
            })
          );

          for (const r of pushResults) {
            if (r.ok) {
              fcmSentCount++;
            } else {
              if (r.unregistered) invalidTokens.push(r.token);
              if (r.error) fcmErrors.push(r.error);
            }
          }
        } catch (err) {
          fcmErrors.push(err instanceof Error ? err.message : String(err));
        }
      }

      return jsonResponse(
        {
          ok: true,
          verifiedUid: verifiedUser.uid,
          email: {
            configured: emailConfigured,
            sentCount: emailSentCount,
            errors: emailErrors,
          },
          fcm: {
            configured: fcmConfigured,
            sentCount: fcmSentCount,
            invalidTokens,
            errors: fcmErrors,
          },
        },
        200,
        corsHeaders
      );
    }

    return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);
  },
};
