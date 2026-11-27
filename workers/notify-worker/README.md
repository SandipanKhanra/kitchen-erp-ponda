# Kitchen Notify Cloudflare Worker (Free Tier)

A lightweight Cloudflare Worker that verifies Firebase Auth ID tokens and dispatches:
1. **HTML Emails** via [Resend](https://resend.com) (free tier: 3,000 emails/month)
2. **Closed-App Push Notifications** via **Firebase Cloud Messaging (FCM) HTTP v1 API** (free forever, no Firebase Blaze plan required)

---

## 1. Install & Log In to Cloudflare

```bash
cd workers/notify-worker
npm install
npx wrangler login
```

## 2. Configure Secrets (Never Committed to Git)

### A. Email via Resend (Free)
1. Create a free API key at https://resend.com/api-keys
2. Store it as a Worker secret:
   ```bash
   npx wrangler secret put RESEND_API_KEY
   ```

### B. Closed-App Push via FCM HTTP v1 (Free)
1. In **Firebase Console** -> **Project Settings** -> **Service accounts**, click **Generate new private key** to download the JSON file.
2. Set the two secrets from that JSON file:
   ```bash
   npx wrangler secret put FIREBASE_CLIENT_EMAIL
   # paste "client_email" value

   npx wrangler secret put FIREBASE_PRIVATE_KEY
   # paste full "private_key" value (including -----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----)
   ```

## 3. Deploy the Worker

```bash
npm run deploy
```

Wrangler will print your live URL, e.g.:
`https://kitchen-notify-worker.<your-subdomain>.workers.dev`

## 4. Link to the Frontend (`.env`)

Add these to your root `.env` (and re-run `npm run build` / `firebase deploy --only hosting`):

```env
VITE_NOTIFY_WORKER_URL=https://kitchen-notify-worker.<your-subdomain>.workers.dev
# From Firebase Console -> Project Settings -> Cloud Messaging -> Web Push certificates -> Generate key pair
VITE_FIREBASE_VAPID_KEY=your_web_push_vapid_key
```
